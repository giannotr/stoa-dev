use std::{
    collections::BTreeSet,
    sync::{Mutex, MutexGuard},
};
use tauri::{AppHandle, Manager};

use super::{
    certificate::{current_timestamp, refresh_timestamp, CertificateVerifier},
    client::{LicenseClient, LicenseResponse},
    crypto::public_key_spki,
    error::LicenseError,
    policy,
    storage::{AppLicenseStore, LicenseStore, StoredLicense},
    LicenseState, LicenseStatus,
};

// The endpoint comes from the app's build-time config; it is never supplied by the webview.
fn license_server_url() -> &'static str {
    super::config::config().server_url
}

/// All local evaluation, persistence and protected writes share this short lock.
/// The async lock serializes network operations without blocking database readers/writers.
#[derive(Default)]
pub struct LicenseService {
    operation_lock: tokio::sync::Mutex<()>,
    runtime: Mutex<LicenseEngine>,
}

#[derive(Default)]
pub(crate) struct LicenseEngine {
    activation_required: BTreeSet<String>,
    revoked: BTreeSet<String>,
    revoked_licenses: BTreeSet<String>,
    pending_licenses: BTreeSet<String>,
    pending_revocations: BTreeSet<String>,
    high_water: i64,
    persistence_failed: bool,
}

#[must_use = "Keep this guard alive until the protected mutation completes"]
pub struct WriteAccess<'a> {
    _guard: MutexGuard<'a, LicenseEngine>,
}

impl LicenseEngine {
    fn revoked(&mut self, store: &dyn LicenseStore, device_id: &str) -> Result<bool, LicenseError> {
        if self.revoked.contains(device_id) {
            return Ok(true);
        }
        if store.is_revoked(device_id)? {
            self.revoked.insert(device_id.into());
            // Copy legacy/partial markers into both current stores. Expose failed copies in the DTO.
            self.pending_revocations.insert(device_id.into());
            return Ok(true);
        }
        Ok(false)
    }

    fn revoked_state(&mut self, store: &dyn LicenseStore, device_id: &str) -> LicenseState {
        if self.pending_revocations.contains(device_id) && store.mark_revoked(device_id).is_ok() {
            self.pending_revocations.remove(device_id);
        }
        let mut state = policy::state(LicenseStatus::Revoked, Some(device_id.into()));
        state.persistence_pending = self.pending_revocations.contains(device_id);
        state
    }

    fn license_revoked(
        &mut self,
        store: &dyn LicenseStore,
        license_id: &str,
    ) -> Result<bool, LicenseError> {
        if self.revoked_licenses.contains(license_id) {
            return Ok(true);
        }
        if store.is_license_revoked(license_id)? {
            self.revoked_licenses.insert(license_id.into());
            self.pending_licenses.insert(license_id.into());
            return Ok(true);
        }
        Ok(false)
    }

    fn license_revoked_state(
        &mut self,
        store: &dyn LicenseStore,
        license_id: &str,
        device_id: &str,
    ) -> LicenseState {
        if self.pending_licenses.contains(license_id)
            && store.mark_license_revoked(license_id).is_ok()
        {
            self.pending_licenses.remove(license_id);
        }
        if self.pending_revocations.contains(device_id) && store.mark_revoked(device_id).is_ok() {
            self.pending_revocations.remove(device_id);
        }
        let mut state = policy::state(LicenseStatus::LicenseRevoked, Some(device_id.into()));
        state.persistence_pending = self.pending_licenses.contains(license_id)
            || self.pending_revocations.contains(device_id);
        state
    }

    fn revoke_license(
        &mut self,
        store: &dyn LicenseStore,
        license_id: &str,
        device_id: &str,
    ) -> Result<LicenseState, LicenseError> {
        self.revoked_licenses.insert(license_id.into());
        self.pending_licenses.insert(license_id.into());
        store.mark_license_revoked(license_id)?;
        self.pending_licenses.remove(license_id);
        Ok(self.license_revoked_state(store, license_id, device_id))
    }

    pub(crate) fn status(
        &mut self,
        store: &dyn LicenseStore,
        verifier: &CertificateVerifier,
        now: i64,
    ) -> Result<LicenseState, LicenseError> {
        let Some(mut stored) = store.read()? else {
            return Ok(policy::state(LicenseStatus::Unactivated, None));
        };
        let Some(key) = store.device_key()? else {
            return Ok(policy::state(
                LicenseStatus::Invalid,
                Some(stored.device_id),
            ));
        };
        let payload =
            match verifier.verify(&stored.token, &public_key_spki(&key), &stored.device_id) {
                Ok(payload) => payload,
                Err(_) => {
                    return Ok(policy::state(
                        LicenseStatus::Invalid,
                        Some(stored.device_id),
                    ))
                }
            };
        if self.license_revoked(store, &payload.license_id)? {
            return Ok(policy::with_details(
                self.license_revoked_state(store, &payload.license_id, &stored.device_id),
                &payload,
            ));
        }
        if self.revoked(store, &stored.device_id)? {
            return Ok(policy::with_details(
                self.revoked_state(store, &stored.device_id),
                &payload,
            ));
        }
        if stored.activation_required || self.activation_required.contains(&stored.device_id) {
            self.activation_required.insert(stored.device_id.clone());
            // Retry a failed write without reopening access in this process.
            if !stored.activation_required {
                stored.activation_required = true;
                self.persist(store, &stored)?;
            }
            return Ok(policy::with_details(
                policy::state(LicenseStatus::ActivationRequired, Some(stored.device_id)),
                &payload,
            ));
        }
        let anchor = stored.last_observed_at.max(self.high_water);
        let state = policy::evaluate(&payload, now, anchor);
        if state.is_writable() {
            self.high_water = now.max(anchor);
            if stored.last_observed_at < self.high_water || self.persistence_failed {
                stored.last_observed_at = self.high_water;
                stored.refresh_after = refresh_timestamp(&payload);
                self.persist(store, &stored)?;
            }
        }
        Ok(state)
    }

    fn persist(
        &mut self,
        store: &dyn LicenseStore,
        stored: &StoredLicense,
    ) -> Result<(), LicenseError> {
        self.persistence_failed = true;
        store.write(stored)?;
        self.persistence_failed = false;
        Ok(())
    }

    pub(crate) fn revoke(
        &mut self,
        store: &dyn LicenseStore,
        device_id: &str,
    ) -> Result<LicenseState, LicenseError> {
        // The latch is set BEFORE I/O. A storage error must never reopen access.
        self.revoked.insert(device_id.into());
        self.pending_revocations.insert(device_id.into());
        store.mark_revoked(device_id)?;
        self.pending_revocations.remove(device_id);
        Ok(policy::state(
            LicenseStatus::Revoked,
            Some(device_id.into()),
        ))
    }

    pub(crate) fn commit(
        &mut self,
        store: &dyn LicenseStore,
        verifier: &CertificateVerifier,
        expected: Option<&StoredLicense>,
        result: LicenseResponse,
        now: i64,
    ) -> Result<LicenseState, LicenseError> {
        let current = store.read()?;
        // Status checks may advance the time anchor while the HTTP request is in flight.
        if current
            .as_ref()
            .map(|s| (&s.device_id, &s.token, &s.key_slot))
            != expected.map(|s| (&s.device_id, &s.token, &s.key_slot))
        {
            return Err(LicenseError::StateChanged);
        }
        if expected.is_some_and(|s| s.device_id != result.device_id) {
            return Err(LicenseError::Protocol);
        }
        let key = store
            .device_key()?
            .ok_or_else(|| LicenseError::Certificate("Device key missing".into()))?;
        let public_key = public_key_spki(&key);
        let payload = verifier
            .verify(&result.license, &public_key, &result.device_id)
            .map_err(|e| LicenseError::Certificate(e.to_string()))?;
        if self.license_revoked(store, &payload.license_id)? {
            return Ok(policy::with_details(
                self.license_revoked_state(store, &payload.license_id, &result.device_id),
                &payload,
            ));
        }
        if self.revoked(store, &result.device_id)? {
            return Ok(policy::with_details(
                self.revoked_state(store, &result.device_id),
                &payload,
            ));
        }
        let anchor = current
            .as_ref()
            .map_or(self.high_water, |s| s.last_observed_at.max(self.high_water));
        if let Some(old) = &current {
            if let Ok(previous) = verifier.verify(&old.token, &public_key, &old.device_id) {
                if payload.license_id != previous.license_id
                    || payload.user_id != previous.user_id
                    || payload.revision < previous.revision
                    || payload.issued_at < previous.issued_at
                {
                    return Err(LicenseError::Certificate(
                        "Certificate rollback or identity change".into(),
                    ));
                }
            }
        }
        let state = policy::evaluate(&payload, now, anchor);
        if !state.is_writable() {
            return Err(LicenseError::Certificate(
                "Certificate is not currently valid".into(),
            ));
        }
        self.high_water = now.max(anchor);
        self.persist(
            store,
            &StoredLicense {
                device_id: result.device_id,
                key_slot: current.as_ref().and_then(|stored| stored.key_slot.clone()),
                token: result.license,
                last_observed_at: self.high_water,
                refresh_after: refresh_timestamp(&payload),
                activation_required: false,
            },
        )?;
        self.activation_required.remove(&payload.device_id);
        Ok(state)
    }

    /// The old record/key remain usable until the fully verified new record is atomically committed.
    pub(crate) fn replace(
        &mut self,
        store: &dyn LicenseStore,
        verifier: &CertificateVerifier,
        expected: &StoredLicense,
        result: LicenseResponse,
        replacement: (&str, &ed25519_dalek::SigningKey),
        now: i64,
    ) -> Result<LicenseState, LicenseError> {
        let current = store.read()?.ok_or(LicenseError::Unactivated)?;
        if (&current.device_id, &current.token, &current.key_slot)
            != (&expected.device_id, &expected.token, &expected.key_slot)
        {
            return Err(LicenseError::StateChanged);
        }
        let old_state = self.status(store, verifier, now)?;
        if old_state.persistence_pending {
            return Err(LicenseError::Storage(
                "Persist the existing revocation before changing licenses".into(),
            ));
        }
        let (slot, key) = replacement;
        let payload = verifier
            .verify(&result.license, &public_key_spki(key), &result.device_id)
            .map_err(|e| LicenseError::Certificate(e.to_string()))?;
        if result.device_id == current.device_id {
            return Err(LicenseError::Protocol);
        }
        if self.license_revoked(store, &payload.license_id)? {
            return Err(LicenseError::LicenseRevoked);
        }
        if self.revoked(store, &result.device_id)? {
            return Err(LicenseError::Revoked);
        }
        let anchor = current.last_observed_at.max(self.high_water);
        let state = policy::evaluate(&payload, now, anchor);
        if !state.is_writable() {
            return Err(LicenseError::Certificate(
                "Replacement certificate is not currently valid".into(),
            ));
        }
        self.high_water = now.max(anchor);
        self.persist(
            store,
            &StoredLicense {
                device_id: result.device_id,
                key_slot: Some(slot.into()),
                token: result.license,
                last_observed_at: self.high_water,
                refresh_after: refresh_timestamp(&payload),
                activation_required: false,
            },
        )?;
        self.activation_required.remove(&payload.device_id);
        Ok(state)
    }

    pub(crate) fn complete_refresh(
        &mut self,
        store: &dyn LicenseStore,
        verifier: &CertificateVerifier,
        expected: &StoredLicense,
        result: Result<LicenseResponse, LicenseError>,
        now: i64,
    ) -> Result<LicenseState, LicenseError> {
        match result {
            Ok(response) => self.commit(store, verifier, Some(expected), response, now),
            Err(LicenseError::ActivationRequired) => {
                let mut current = store.read()?.ok_or(LicenseError::StateChanged)?;
                if (&current.device_id, &current.token, &current.key_slot)
                    != (&expected.device_id, &expected.token, &expected.key_slot)
                {
                    return Err(LicenseError::StateChanged);
                }
                // Preserve the certificate/key for explicit replacement or a later successful refresh.
                self.activation_required.insert(current.device_id.clone());
                current.activation_required = true;
                self.persist(store, &current)?;
                self.status(store, verifier, now)
            }
            Err(LicenseError::Revoked) => {
                self.revoke(store, &expected.device_id)?;
                self.status(store, verifier, now)
            }
            Err(LicenseError::LicenseRevoked) => {
                let key = store
                    .device_key()?
                    .ok_or_else(|| LicenseError::Certificate("Device key missing".into()))?;
                let payload = verifier
                    .verify(&expected.token, &public_key_spki(&key), &expected.device_id)
                    .map_err(|e| LicenseError::Certificate(e.to_string()))?;
                self.revoke_license(store, &payload.license_id, &expected.device_id)
                    .map(|state| policy::with_details(state, &payload))
            }
            Err(error) => Err(error),
        }
    }

    pub(crate) fn authorize(
        &mut self,
        store: &dyn LicenseStore,
        verifier: &CertificateVerifier,
        now: i64,
        feature: Option<&str>,
    ) -> Result<(), LicenseError> {
        let state = self.status(store, verifier, now)?;
        if !state.is_writable() {
            return Err(LicenseError::LicenseReadOnly);
        }
        if feature.is_some_and(|feature| !state.allows_feature(feature)) {
            return Err(LicenseError::LicenseFeatureDenied);
        }
        Ok(())
    }
}

impl LicenseService {
    fn lock(&self) -> Result<MutexGuard<'_, LicenseEngine>, LicenseError> {
        self.runtime
            .lock()
            .map_err(|_| LicenseError::Synchronization)
    }

    pub fn status(&self, app: &AppHandle) -> Result<LicenseState, LicenseError> {
        self.lock()?.status(
            &AppLicenseStore(app),
            &CertificateVerifier::production()
                .map_err(|e| LicenseError::Certificate(e.to_string()))?,
            current_timestamp(),
        )
    }

    pub(crate) fn access<'a>(
        &'a self,
        store: &dyn LicenseStore,
        verifier: &CertificateVerifier,
        now: i64,
        feature: Option<&str>,
    ) -> Result<WriteAccess<'a>, LicenseError> {
        let mut guard = self.lock()?;
        guard.authorize(store, verifier, now, feature)?;
        Ok(WriteAccess { _guard: guard })
    }

    pub fn write_access<'a>(
        &'a self,
        app: &AppHandle,
        feature: Option<&str>,
    ) -> Result<WriteAccess<'a>, LicenseError> {
        self.access(
            &AppLicenseStore(app),
            &CertificateVerifier::production()
                .map_err(|e| LicenseError::Certificate(e.to_string()))?,
            current_timestamp(),
            feature,
        )
    }

    pub async fn activate(
        &self,
        app: &AppHandle,
        code: &str,
        device_name: &str,
    ) -> Result<LicenseState, LicenseError> {
        let _operation = self.operation_lock.lock().await;
        let store = AppLicenseStore(app);
        let key = {
            let _guard = self.lock()?;
            if store.read()?.is_some() {
                return Err(LicenseError::AlreadyActivated);
            }
            store.get_or_create_key()?
        };
        let result = LicenseClient::new(license_server_url())?
            .activate(&key, code, device_name)
            .await?;
        self.lock()?.commit(
            &store,
            &CertificateVerifier::production()
                .map_err(|e| LicenseError::Certificate(e.to_string()))?,
            None,
            result,
            current_timestamp(),
        )
    }

    pub async fn change_license(
        &self,
        app: &AppHandle,
        code: &str,
        device_name: &str,
    ) -> Result<LicenseState, LicenseError> {
        let _operation = self.operation_lock.lock().await;
        let store = AppLicenseStore(app);
        let verifier = CertificateVerifier::production()
            .map_err(|e| LicenseError::Certificate(e.to_string()))?;
        let (stored, slot, key) = {
            let mut engine = self.lock()?;
            let state = engine.status(&store, &verifier, current_timestamp())?;
            if state.persistence_pending {
                return Err(LicenseError::Storage(
                    "Revocation persistence pending".into(),
                ));
            }
            let stored = store.read()?.ok_or(LicenseError::Unactivated)?;
            let (slot, key) = store.replacement_key(code)?;
            (stored, slot, key)
        };
        let result = LicenseClient::new(license_server_url())?
            .activate(&key, code, device_name)
            .await?;
        self.lock()?.replace(
            &store,
            &verifier,
            &stored,
            result,
            (&slot, &key),
            current_timestamp(),
        )
    }

    pub(crate) fn finish_refresh(
        &self,
        store: &dyn LicenseStore,
        verifier: &CertificateVerifier,
        expected: &StoredLicense,
        result: Result<LicenseResponse, LicenseError>,
        now: i64,
    ) -> Result<LicenseState, LicenseError> {
        self.lock()?
            .complete_refresh(store, verifier, expected, result, now)
    }

    pub async fn refresh(&self, app: &AppHandle) -> Result<LicenseState, LicenseError> {
        let _operation = self.operation_lock.lock().await;
        let store = AppLicenseStore(app);
        let (stored, key) = {
            let mut engine = self.lock()?;
            let verifier = CertificateVerifier::production()
                .map_err(|e| LicenseError::Certificate(e.to_string()))?;
            let state = engine.status(&store, &verifier, current_timestamp())?;
            if state.status == LicenseStatus::LicenseRevoked || state.persistence_pending {
                return Ok(state);
            }
            // A manually refreshed revoked device may learn that its entire license was revoked.
            // Any successful server response still cannot clear its permanent device marker.
            let stored = store.read()?.ok_or(LicenseError::Unactivated)?;
            let key = store
                .device_key()?
                .ok_or_else(|| LicenseError::Certificate("Device key missing".into()))?;
            (stored, key)
        };
        let result = LicenseClient::new(license_server_url())?
            .refresh(&key, &stored.device_id)
            .await;
        self.finish_refresh(
            &store,
            &CertificateVerifier::production()
                .map_err(|e| LicenseError::Certificate(e.to_string()))?,
            &stored,
            result,
            current_timestamp(),
        )
    }
}

pub fn require_write_access<'a>(
    app: &'a AppHandle,
    feature: Option<&str>,
) -> Result<WriteAccess<'a>, String> {
    app.state::<LicenseService>()
        .inner()
        .write_access(app, feature)
        .map_err(|e| e.to_string())
}
