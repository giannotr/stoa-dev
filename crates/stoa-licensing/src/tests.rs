use super::{
    certificate::{CertificateVerifier, LicensePayload},
    client::LicenseResponse,
    crypto::{generate_device_key, public_key_spki},
    error::LicenseError,
    service::LicenseEngine,
    storage::{LicenseStore, StoredLicense},
    LicenseStatus,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ed25519_dalek::{Signer, SigningKey};
use std::cell::{Cell, RefCell};

const NOW: i64 = 1_800_000_000;
struct Store {
    license: RefCell<Option<StoredLicense>>,
    key: SigningKey,
    replacement_keys: RefCell<std::collections::BTreeMap<String, SigningKey>>,
    revoked_licenses: RefCell<std::collections::BTreeSet<String>>,
    revoked_devices: RefCell<std::collections::BTreeSet<String>>,
    revoked: Cell<bool>,
    read_fails: Cell<bool>,
    write_fails: Cell<bool>,
    marker_read_fails: Cell<bool>,
    marker_write_fails: Cell<bool>,
    key_fails: Cell<bool>,
}
impl Store {
    fn new() -> Self {
        Self {
            license: RefCell::new(None),
            key: generate_device_key(),
            replacement_keys: RefCell::new(Default::default()),
            revoked_licenses: RefCell::new(Default::default()),
            revoked_devices: RefCell::new(Default::default()),
            revoked: Cell::new(false),
            read_fails: Cell::new(false),
            write_fails: Cell::new(false),
            marker_read_fails: Cell::new(false),
            marker_write_fails: Cell::new(false),
            key_fails: Cell::new(false),
        }
    }
}
impl LicenseStore for Store {
    fn read(&self) -> Result<Option<StoredLicense>, String> {
        if self.read_fails.get() {
            return Err("simulated read failure".into());
        }
        Ok(self.license.borrow().clone())
    }
    fn write(&self, license: &StoredLicense) -> Result<(), String> {
        if self.write_fails.get() {
            return Err("simulated write failure".into());
        }
        *self.license.borrow_mut() = Some(license.clone());
        Ok(())
    }
    fn device_key(&self) -> Result<Option<SigningKey>, String> {
        if self.key_fails.get() {
            return Err("simulated keychain failure".into());
        }
        let slot = self
            .license
            .borrow()
            .as_ref()
            .and_then(|stored| stored.key_slot.clone());
        match slot {
            Some(slot) => Ok(self.replacement_keys.borrow().get(&slot).cloned()),
            None => Ok(Some(self.key.clone())),
        }
    }
    fn get_or_create_key(&self) -> Result<SigningKey, String> {
        Ok(self.key.clone())
    }
    fn replacement_key(&self, code: &str) -> Result<(String, SigningKey), String> {
        let slot = format!(
            "license-switch-v1:{}",
            super::crypto::hash_activation_code(code)
        );
        let key = self
            .replacement_keys
            .borrow_mut()
            .entry(slot.clone())
            .or_insert_with(generate_device_key)
            .clone();
        Ok((slot, key))
    }
    fn is_license_revoked(&self, id: &str) -> Result<bool, String> {
        if self.marker_read_fails.get() {
            return Err("simulated marker read failure".into());
        }
        Ok(self.revoked_licenses.borrow().contains(id))
    }
    fn mark_license_revoked(&self, id: &str) -> Result<(), String> {
        if self.marker_write_fails.get() {
            return Err("simulated marker write failure".into());
        }
        self.revoked_licenses.borrow_mut().insert(id.into());
        Ok(())
    }
    fn is_revoked(&self, id: &str) -> Result<bool, String> {
        if self.marker_read_fails.get() {
            return Err("simulated marker read failure".into());
        }
        Ok((id == "device-1" && self.revoked.get()) || self.revoked_devices.borrow().contains(id))
    }
    fn mark_revoked(&self, id: &str) -> Result<(), String> {
        if self.marker_write_fails.get() {
            return Err("simulated marker write failure".into());
        }
        if id == "device-1" {
            self.revoked.set(true);
        }
        self.revoked_devices.borrow_mut().insert(id.into());
        Ok(())
    }
}
struct Fixture {
    signer: SigningKey,
    verifier: CertificateVerifier,
    store: Store,
}
impl Fixture {
    fn new() -> Self {
        let signer = generate_device_key();
        let verifier = CertificateVerifier::for_test(signer.verifying_key());
        Self {
            signer,
            verifier,
            store: Store::new(),
        }
    }
    fn payload(&self) -> LicensePayload {
        LicensePayload {
            version: 2,
            issuer: "stoa-license-server".into(),
            app_id: Some(super::certificate::app_id().into()),
            major_version: Some(super::certificate::app_major_version()),
            all_versions: false,
            license_id: "license-1".into(),
            user_id: "user-1".into(),
            device_id: "device-1".into(),
            device_public_key: public_key_spki(&self.store.key),
            plan: "test".into(),
            features: vec!["core".into()],
            revision: 1,
            issued_at: NOW,
            expires_at: NOW + 30 * 86400,
        }
    }
    fn response(&self, payload: &LicensePayload) -> LicenseResponse {
        let header = URL_SAFE_NO_PAD.encode(
            serde_json::to_vec(&serde_json::json!({
                "alg": "EdDSA", "typ": "stoa-license", "kid": "test-key"
            }))
            .unwrap(),
        );
        let body = URL_SAFE_NO_PAD.encode(serde_json::to_vec(payload).unwrap());
        let message = format!("{header}.{body}");
        let signature = self.signer.sign(message.as_bytes());
        LicenseResponse {
            device_id: payload.device_id.clone(),
            license: format!("{message}.{}", URL_SAFE_NO_PAD.encode(signature.to_bytes())),
        }
    }
    fn activate(&self, engine: &mut LicenseEngine) {
        assert!(engine
            .commit(
                &self.store,
                &self.verifier,
                None,
                self.response(&self.payload()),
                NOW
            )
            .unwrap()
            .is_writable());
    }
}

#[test]
fn activation_persists_and_restores_without_real_server_or_keychain() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    assert_eq!(
        engine.status(&f.store, &f.verifier, NOW).unwrap().status,
        LicenseStatus::Unactivated
    );
    f.activate(&mut engine);
    assert_eq!(f.store.read().unwrap().unwrap().refresh_after, NOW + 86400);
    assert_eq!(
        LicenseEngine::default()
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .status,
        LicenseStatus::Active
    );
    assert!(engine
        .commit(&f.store, &f.verifier, None, f.response(&f.payload()), NOW)
        .is_err());
}

#[test]
fn offline_grace_and_expiry_follow_signed_dates_despite_tampered_refresh_metadata() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    f.store.license.borrow_mut().as_mut().unwrap().refresh_after = i64::MAX;
    let grace = engine.status(&f.store, &f.verifier, NOW + 86400).unwrap();
    assert_eq!(grace.status, LicenseStatus::OfflineGrace);
    assert!(grace.is_writable());
    let expired = engine
        .status(&f.store, &f.verifier, NOW + 30 * 86400)
        .unwrap();
    assert_eq!(expired.status, LicenseStatus::Expired);
    assert!(!expired.is_writable());
}

#[test]
fn revocation_survives_restart_and_cannot_be_refreshed_away() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let expected = f.store.read().unwrap().unwrap();
    assert_eq!(
        engine.revoke(&f.store, "device-1").unwrap().status,
        LicenseStatus::Revoked
    );
    let mut restarted = LicenseEngine::default();
    assert_eq!(
        restarted.status(&f.store, &f.verifier, NOW).unwrap().status,
        LicenseStatus::Revoked
    );
    assert_eq!(
        restarted
            .commit(
                &f.store,
                &f.verifier,
                Some(&expected),
                f.response(&f.payload()),
                NOW
            )
            .unwrap()
            .status,
        LicenseStatus::Revoked
    );
    assert_eq!(f.store.read().unwrap().unwrap(), expected);
}

#[test]
fn failed_revocation_persistence_latches_process_and_can_be_retried() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    f.store.marker_write_fails.set(true);
    assert!(engine.revoke(&f.store, "device-1").is_err());
    assert!(
        engine
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .persistence_pending
    );
    assert_eq!(
        engine.status(&f.store, &f.verifier, NOW).unwrap().status,
        LicenseStatus::Revoked
    );
    assert!(engine.authorize(&f.store, &f.verifier, NOW, None).is_err());
    f.store.marker_write_fails.set(false);
    engine.revoke(&f.store, "device-1").unwrap();
    assert_eq!(
        LicenseEngine::default()
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .status,
        LicenseStatus::Revoked
    );
}

#[test]
fn storage_keychain_and_time_anchor_errors_never_grant_access() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    for flag in [
        &f.store.read_fails,
        &f.store.key_fails,
        &f.store.marker_read_fails,
    ] {
        flag.set(true);
        assert!(engine.authorize(&f.store, &f.verifier, NOW, None).is_err());
        flag.set(false);
    }
    f.store.write_fails.set(true);
    assert!(engine
        .authorize(&f.store, &f.verifier, NOW + 10, None)
        .is_err());
    assert!(engine.authorize(&f.store, &f.verifier, NOW, None).is_err());
    f.store.write_fails.set(false);
    assert!(engine
        .authorize(&f.store, &f.verifier, NOW + 10, None)
        .is_ok());
    assert_eq!(f.store.read().unwrap().unwrap().last_observed_at, NOW + 10);
}

#[test]
fn features_and_every_non_writable_state_deny_mutation() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    assert!(engine.authorize(&f.store, &f.verifier, NOW, None).is_err());
    f.activate(&mut engine);
    assert!(engine
        .authorize(&f.store, &f.verifier, NOW, Some("core"))
        .is_ok());
    assert!(matches!(
        engine.authorize(&f.store, &f.verifier, NOW, Some("missing")),
        Err(LicenseError::LicenseFeatureDenied)
    ));
    assert!(engine
        .authorize(&f.store, &f.verifier, NOW - 301, None)
        .is_err());
    assert!(engine
        .authorize(&f.store, &f.verifier, NOW + 30 * 86400, None)
        .is_err());
    f.store.license.borrow_mut().as_mut().unwrap().token = "forged".into();
    assert!(engine.authorize(&f.store, &f.verifier, NOW, None).is_err());
}

#[test]
fn refresh_uses_latest_anchor_and_rejects_stale_or_rollback_responses() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let expected = f.store.read().unwrap().unwrap();
    engine.status(&f.store, &f.verifier, NOW + 20).unwrap();
    let mut payload = f.payload();
    payload.issued_at += 20;
    payload.expires_at += 20;
    payload.revision = 2;
    engine
        .commit(
            &f.store,
            &f.verifier,
            Some(&expected),
            f.response(&payload),
            NOW + 20,
        )
        .unwrap();
    assert_eq!(f.store.read().unwrap().unwrap().last_observed_at, NOW + 20);
    assert!(matches!(
        engine.commit(
            &f.store,
            &f.verifier,
            Some(&expected),
            f.response(&payload),
            NOW + 20
        ),
        Err(LicenseError::StateChanged)
    ));
    let latest = f.store.read().unwrap().unwrap();
    assert!(engine
        .commit(
            &f.store,
            &f.verifier,
            Some(&latest),
            f.response(&f.payload()),
            NOW + 20
        )
        .is_err());
}

#[test]
fn clock_rollback_future_issuance_and_invalid_validity_deny_access() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    assert_eq!(
        engine
            .status(&f.store, &f.verifier, NOW - 301)
            .unwrap()
            .status,
        LicenseStatus::Invalid
    );
    for (issued_at, expires_at) in [
        (NOW + 301, NOW + 1000),
        (NOW, NOW),
        (NOW, NOW + 30 * 86400 + 1),
        (i64::MIN, i64::MAX),
    ] {
        let mut payload = f.payload();
        payload.issued_at = issued_at;
        payload.expires_at = expires_at;
        let store = Store {
            key: f.store.key.clone(),
            ..Store::new()
        };
        assert!(LicenseEngine::default()
            .commit(&store, &f.verifier, None, f.response(&payload), NOW)
            .is_err());
    }
}

#[test]
fn modified_signature_wrong_device_key_and_untrusted_signer_are_rejected() {
    let f = Fixture::new();
    let payload = f.payload();
    let response = f.response(&payload);
    assert!(f
        .verifier
        .verify(&response.license, "wrong-key", "device-1")
        .is_err());
    assert!(f
        .verifier
        .verify(
            &response.license,
            &payload.device_public_key,
            "wrong-device"
        )
        .is_err());
    let other = CertificateVerifier::for_test(generate_device_key().verifying_key());
    assert!(other
        .verify(&response.license, &payload.device_public_key, "device-1")
        .is_err());
    let mut parts: Vec<_> = response.license.split('.').map(str::to_owned).collect();
    let mut changed = payload.clone();
    changed.features.push("forged".into());
    parts[1] = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&changed).unwrap());
    assert!(f
        .verifier
        .verify(&parts.join("."), &payload.device_public_key, "device-1")
        .is_err());
}

#[test]
fn write_guard_prevents_mutation_for_revoked_devices() {
    let f = Fixture::new();
    f.activate(&mut LicenseEngine::default());
    let service = super::service::LicenseService::default();
    let writes = Cell::new(0);
    let mutate = || -> Result<(), LicenseError> {
        let _access = service.access(&f.store, &f.verifier, NOW, None)?;
        writes.set(writes.get() + 1);
        Ok(())
    };
    mutate().unwrap();
    f.store.revoked.set(true);
    assert!(mutate().is_err());
    assert_eq!(writes.get(), 1);
}

#[test]
fn network_and_other_server_errors_neither_revoke_nor_extend_certificates() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let before = f.store.read().unwrap().unwrap();
    for error in [
        LicenseError::Network,
        LicenseError::Protocol,
        LicenseError::Api {
            status: 403,
            code: "DEVICE_NOT_ACTIVE".into(),
        },
    ] {
        assert!(engine
            .complete_refresh(&f.store, &f.verifier, &before, Err(error), NOW)
            .is_err());
        assert_eq!(f.store.read().unwrap().unwrap(), before);
        assert!(!f.store.revoked.get());
        assert!(engine
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .is_writable());
    }
}

/// A real HTTP roundtrip against a disposable loopback server, never the user's server.
fn mock_server(replies: Vec<(&'static str, u16, String)>) -> (String, std::thread::JoinHandle<()>) {
    use std::io::{Read, Write};
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let thread = std::thread::spawn(move || {
        for (path, status, body) in replies {
            let deadline = std::time::Instant::now() + std::time::Duration::from_secs(10);
            let mut stream = loop {
                match listener.accept() {
                    Ok((stream, _)) => break stream,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        assert!(
                            std::time::Instant::now() < deadline,
                            "HTTP test client did not connect"
                        );
                        std::thread::sleep(std::time::Duration::from_millis(5));
                    }
                    Err(error) => panic!("HTTP fixture failed: {error}"),
                }
            };
            stream.set_nonblocking(false).unwrap();
            stream
                .set_read_timeout(Some(std::time::Duration::from_secs(5)))
                .unwrap();
            let mut bytes = Vec::new();
            let header_end = loop {
                let mut chunk = [0; 1024];
                let count = stream.read(&mut chunk).unwrap();
                assert!(count > 0);
                bytes.extend_from_slice(&chunk[..count]);
                if let Some(index) = bytes.windows(4).position(|window| window == b"\r\n\r\n") {
                    break index + 4;
                }
            };
            let headers = String::from_utf8(bytes[..header_end].to_vec()).unwrap();
            assert!(headers.starts_with(&format!("POST {path} HTTP/1.1")));
            let length = headers
                .lines()
                .find_map(|line| {
                    line.to_ascii_lowercase()
                        .strip_prefix("content-length:")
                        .map(|v| v.trim().parse::<usize>().unwrap())
                })
                .unwrap();
            while bytes.len() < header_end + length {
                let mut chunk = [0; 1024];
                let count = stream.read(&mut chunk).unwrap();
                assert!(count > 0);
                bytes.extend_from_slice(&chunk[..count]);
            }
            let request: serde_json::Value =
                serde_json::from_slice(&bytes[header_end..header_end + length]).unwrap();
            assert!(request["devicePublicKey"].is_string());
            if request["deviceName"] == "License change test" {
                assert!(request.get("differentFromLicenseId").is_none());
            }
            if path.ends_with("/refresh") || path.ends_with("/activate") {
                assert_eq!(request["signature"].as_str().unwrap().len(), 86);
            }
            write!(stream, "HTTP/1.1 {status} Test\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).unwrap();
        }
    });
    (url, thread)
}

#[test]
#[cfg(debug_assertions)]
fn http_refresh_revocation_reaches_policy_and_survives_restart() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let expected = f.store.read().unwrap().unwrap();
    let (url, thread) = mock_server(vec![
        (
            "/v1/activation/challenge",
            201,
            r#"{"challengeId":"test-challenge","nonce":"test-nonce"}"#.into(),
        ),
        (
            "/v1/activation/refresh",
            403,
            r#"{"code":"DEVICE_REVOKED"}"#.into(),
        ),
    ]);
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let result = runtime.block_on(
        super::client::LicenseClient::new(&url)
            .unwrap()
            .refresh(&f.store.key, "device-1"),
    );
    thread.join().unwrap();
    let state = engine
        .complete_refresh(&f.store, &f.verifier, &expected, result, NOW)
        .unwrap();
    assert_eq!(state.status, LicenseStatus::Revoked);
    assert!(engine.authorize(&f.store, &f.verifier, NOW, None).is_err());
    assert_eq!(
        LicenseEngine::default()
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .status,
        LicenseStatus::Revoked
    );
}

#[test]
#[cfg(debug_assertions)]
fn http_activation_and_refresh_accept_only_verified_certificates() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    let response = f.response(&f.payload());
    let reply = serde_json::json!({ "deviceId": response.device_id, "license": response.license })
        .to_string();
    let (url, thread) = mock_server(vec![
        (
            "/v1/activation/challenge",
            201,
            r#"{"challengeId":"test-challenge","nonce":"test-nonce"}"#.into(),
        ),
        ("/v1/activation/activate", 200, reply.clone()),
        (
            "/v1/activation/challenge",
            201,
            r#"{"challengeId":"test-challenge","nonce":"test-nonce"}"#.into(),
        ),
        ("/v1/activation/refresh", 200, reply),
    ]);
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let client = super::client::LicenseClient::new(&url).unwrap();
    let activated = runtime
        .block_on(client.activate(&f.store.key, "TEST-NOT-A-REAL-CODE", "Test device"))
        .unwrap();
    engine
        .commit(&f.store, &f.verifier, None, activated, NOW)
        .unwrap();
    let expected = f.store.read().unwrap().unwrap();
    let refreshed = runtime.block_on(client.refresh(&f.store.key, "device-1"));
    thread.join().unwrap();
    assert!(engine
        .complete_refresh(&f.store, &f.verifier, &expected, refreshed, NOW)
        .unwrap()
        .is_writable());
}

#[test]
fn revocation_and_database_mutations_have_a_single_serial_order() {
    use std::{
        sync::{mpsc, Arc},
        time::Duration,
    };
    let f = Fixture::new();
    f.activate(&mut LicenseEngine::default());
    let service = Arc::new(super::service::LicenseService::default());
    let permit = service.access(&f.store, &f.verifier, NOW, None).unwrap();
    let expected = f.store.read().unwrap().unwrap();
    let other_store = Store {
        license: RefCell::new(Some(expected.clone())),
        key: f.store.key.clone(),
        ..Store::new()
    };
    let verifier = CertificateVerifier::for_test(f.signer.verifying_key());
    let worker_service = service.clone();
    let (started_tx, started_rx) = mpsc::channel();
    let (done_tx, done_rx) = mpsc::channel();
    let worker = std::thread::spawn(move || {
        started_tx.send(()).unwrap();
        let result = worker_service
            .finish_refresh(
                &other_store,
                &verifier,
                &expected,
                Err(LicenseError::Revoked),
                NOW,
            )
            .unwrap();
        done_tx.send(result.status).unwrap();
    });
    started_rx.recv_timeout(Duration::from_secs(5)).unwrap();
    assert!(done_rx.recv_timeout(Duration::from_millis(50)).is_err());
    // A mutation holding the permit completes before the revocation is committed.
    drop(permit);
    assert_eq!(
        done_rx.recv_timeout(Duration::from_secs(5)).unwrap(),
        LicenseStatus::Revoked
    );
    worker.join().unwrap();
    // Even a store snapshot without the marker cannot reopen the process latch.
    assert!(service.access(&f.store, &f.verifier, NOW, None).is_err());
}

#[test]
fn license_revocation_is_permanent_and_has_priority_over_device_revocation() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let expected = f.store.read().unwrap().unwrap();
    engine.revoke(&f.store, "device-1").unwrap();
    let state = engine
        .complete_refresh(
            &f.store,
            &f.verifier,
            &expected,
            Err(LicenseError::LicenseRevoked),
            NOW,
        )
        .unwrap();
    assert_eq!(state.status, LicenseStatus::LicenseRevoked);
    assert!(f.store.revoked_licenses.borrow().contains("license-1"));
    let mut restarted = LicenseEngine::default();
    assert_eq!(
        restarted.status(&f.store, &f.verifier, NOW).unwrap().status,
        LicenseStatus::LicenseRevoked
    );
    assert!(restarted
        .authorize(&f.store, &f.verifier, NOW, None)
        .is_err());
    assert_eq!(
        restarted
            .complete_refresh(
                &f.store,
                &f.verifier,
                &expected,
                Ok(f.response(&f.payload())),
                NOW
            )
            .unwrap()
            .status,
        LicenseStatus::LicenseRevoked
    );
    assert_eq!(f.store.read().unwrap().unwrap(), expected);
}

#[test]
fn failed_license_revocation_storage_latches_access_and_reports_pending_until_recovered() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let expected = f.store.read().unwrap().unwrap();
    f.store.marker_write_fails.set(true);
    assert!(engine
        .complete_refresh(
            &f.store,
            &f.verifier,
            &expected,
            Err(LicenseError::LicenseRevoked),
            NOW
        )
        .is_err());
    let state = engine.status(&f.store, &f.verifier, NOW).unwrap();
    assert_eq!(state.status, LicenseStatus::LicenseRevoked);
    assert!(state.persistence_pending);
    assert!(engine.authorize(&f.store, &f.verifier, NOW, None).is_err());
    f.store.marker_write_fails.set(false);
    assert!(
        !engine
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .persistence_pending
    );
    assert_eq!(
        LicenseEngine::default()
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .status,
        LicenseStatus::LicenseRevoked
    );
}

#[test]
fn switching_licenses_uses_a_new_key_and_preserves_old_revocations_across_restart() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let old = f.store.read().unwrap().unwrap();
    engine
        .complete_refresh(
            &f.store,
            &f.verifier,
            &old,
            Err(LicenseError::LicenseRevoked),
            NOW,
        )
        .unwrap();
    engine.revoke(&f.store, "device-1").unwrap();
    let (slot, key) = f.store.replacement_key("SYNTHETIC-OTHER-CODE").unwrap();
    assert_ne!(public_key_spki(&key), public_key_spki(&f.store.key));
    let (_, retry_key) = f.store.replacement_key("SYNTHETIC-OTHER-CODE").unwrap();
    assert_eq!(public_key_spki(&key), public_key_spki(&retry_key));
    let mut next = f.payload();
    next.license_id = "license-2".into();
    next.device_id = "device-2".into();
    next.device_public_key = public_key_spki(&key);
    assert!(engine
        .replace(
            &f.store,
            &f.verifier,
            &old,
            f.response(&next),
            (&slot, &key),
            NOW
        )
        .unwrap()
        .is_writable());
    let installed = f.store.read().unwrap().unwrap();
    assert_eq!(installed.key_slot.as_deref(), Some(slot.as_str()));
    assert_eq!(
        public_key_spki(&f.store.device_key().unwrap().unwrap()),
        next.device_public_key
    );
    assert!(LicenseEngine::default()
        .status(&f.store, &f.verifier, NOW)
        .unwrap()
        .is_writable());
    assert!(f.store.is_license_revoked("license-1").unwrap());
    assert!(f.store.is_revoked("device-1").unwrap());
    let mut renewed = next.clone();
    renewed.revision += 1;
    renewed.issued_at += 20;
    renewed.expires_at += 20;
    let mut restarted = LicenseEngine::default();
    assert!(restarted
        .complete_refresh(
            &f.store,
            &f.verifier,
            &installed,
            Ok(f.response(&renewed)),
            NOW + 20
        )
        .unwrap()
        .is_writable());
    assert_eq!(
        f.store.read().unwrap().unwrap().key_slot,
        Some(slot.clone())
    );
    // Restoring a previous certificate cannot bypass either permanent marker.
    f.store.write(&old).unwrap();
    assert_eq!(
        LicenseEngine::default()
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .status,
        LicenseStatus::LicenseRevoked
    );
}

#[test]
fn invalid_or_previously_revoked_replacement_does_not_replace_the_old_record() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let old = f.store.read().unwrap().unwrap();
    let (slot, key) = f.store.replacement_key("SYNTHETIC-OTHER-CODE").unwrap();
    let mut next = f.payload();
    next.device_id = "device-2".into();
    next.device_public_key = public_key_spki(&key);
    next.license_id = "license-2".into();
    let invalid = LicenseResponse {
        device_id: "device-2".into(),
        license: "invalid".into(),
    };
    assert!(engine
        .replace(&f.store, &f.verifier, &old, invalid, (&slot, &key), NOW)
        .is_err());
    f.store
        .revoked_licenses
        .borrow_mut()
        .insert("license-2".into());
    assert!(matches!(
        engine.replace(
            &f.store,
            &f.verifier,
            &old,
            f.response(&next),
            (&slot, &key),
            NOW
        ),
        Err(LicenseError::LicenseRevoked)
    ));
    assert_eq!(f.store.read().unwrap().unwrap(), old);
    assert!(engine
        .status(&f.store, &f.verifier, NOW)
        .unwrap()
        .is_writable());
}

#[test]
fn failed_replacement_write_can_be_retried_without_losing_current_identity() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let old = f.store.read().unwrap().unwrap();
    let (slot, key) = f.store.replacement_key("SYNTHETIC-OTHER-CODE").unwrap();
    let mut next = f.payload();
    next.license_id = "license-2".into();
    next.device_id = "device-2".into();
    next.device_public_key = public_key_spki(&key);
    f.store.write_fails.set(true);
    assert!(engine
        .replace(
            &f.store,
            &f.verifier,
            &old,
            f.response(&next),
            (&slot, &key),
            NOW
        )
        .is_err());
    assert_eq!(f.store.read().unwrap().unwrap(), old);
    f.store.write_fails.set(false);
    assert!(engine
        .replace(
            &f.store,
            &f.verifier,
            &old,
            f.response(&next),
            (&slot, &key),
            NOW
        )
        .unwrap()
        .is_writable());
    assert!(LicenseEngine::default()
        .status(&f.store, &f.verifier, NOW)
        .unwrap()
        .is_writable());
}

#[test]
fn pending_old_revocation_prevents_switching_and_stale_switch_results_are_rejected() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let old = f.store.read().unwrap().unwrap();
    let (slot, key) = f.store.replacement_key("SYNTHETIC-OTHER-CODE").unwrap();
    let mut next = f.payload();
    next.license_id = "license-2".into();
    next.device_id = "device-2".into();
    next.device_public_key = public_key_spki(&key);
    f.store.marker_write_fails.set(true);
    assert!(engine
        .complete_refresh(
            &f.store,
            &f.verifier,
            &old,
            Err(LicenseError::LicenseRevoked),
            NOW
        )
        .is_err());
    assert!(engine
        .replace(
            &f.store,
            &f.verifier,
            &old,
            f.response(&next),
            (&slot, &key),
            NOW
        )
        .is_err());
    assert_eq!(f.store.read().unwrap().unwrap(), old);
    f.store.marker_write_fails.set(false);
    engine
        .replace(
            &f.store,
            &f.verifier,
            &old,
            f.response(&next),
            (&slot, &key),
            NOW,
        )
        .unwrap();
    let installed = f.store.read().unwrap().unwrap();
    assert!(matches!(
        engine.replace(
            &f.store,
            &f.verifier,
            &old,
            f.response(&next),
            (&slot, &key),
            NOW
        ),
        Err(LicenseError::StateChanged)
    ));
    assert_eq!(f.store.read().unwrap().unwrap(), installed);
}

#[test]
#[cfg(debug_assertions)]
fn http_license_revocation_is_persisted_and_keeps_the_app_read_only() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let expected = f.store.read().unwrap().unwrap();
    let (url, thread) = mock_server(vec![
        (
            "/v1/activation/challenge",
            201,
            r#"{"challengeId":"test-challenge","nonce":"test-nonce"}"#.into(),
        ),
        (
            "/v1/activation/refresh",
            403,
            r#"{"code":"LICENSE_REVOKED"}"#.into(),
        ),
    ]);
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let result = runtime.block_on(
        super::client::LicenseClient::new(&url)
            .unwrap()
            .refresh(&f.store.key, "device-1"),
    );
    thread.join().unwrap();
    assert_eq!(
        engine
            .complete_refresh(&f.store, &f.verifier, &expected, result, NOW)
            .unwrap()
            .status,
        LicenseStatus::LicenseRevoked
    );
    assert!(LicenseEngine::default()
        .authorize(&f.store, &f.verifier, NOW, None)
        .is_err());
}

#[test]
#[cfg(debug_assertions)]
fn http_license_change_keeps_old_state_when_server_rejects_the_code() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let old = f.store.read().unwrap().unwrap();
    let (_, key) = f.store.replacement_key("SYNTHETIC-OTHER-CODE").unwrap();
    let (url, thread) = mock_server(vec![
        (
            "/v1/activation/challenge",
            201,
            r#"{"challengeId":"test-challenge","nonce":"test-nonce"}"#.into(),
        ),
        (
            "/v1/activation/activate",
            403,
            r#"{"code":"ACTIVATION_DENIED"}"#.into(),
        ),
    ]);
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let result = runtime.block_on(super::client::LicenseClient::new(&url).unwrap().activate(
        &key,
        "SYNTHETIC-OTHER-CODE",
        "License change test",
    ));
    thread.join().unwrap();
    assert!(matches!(result, Err(LicenseError::Api { code, .. }) if code == "ACTIVATION_DENIED"));
    assert_eq!(f.store.read().unwrap().unwrap(), old);
    assert!(engine
        .status(&f.store, &f.verifier, NOW)
        .unwrap()
        .is_writable());
}

#[test]
fn fresh_code_can_reactivate_a_revoked_device_on_the_same_active_license() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let old = f.store.read().unwrap().unwrap();
    engine.revoke(&f.store, "device-1").unwrap();
    let (slot, key) = f
        .store
        .replacement_key("SYNTHETIC-REACTIVATION-CODE")
        .unwrap();
    let mut next = f.payload();
    next.device_id = "device-2".into();
    next.device_public_key = public_key_spki(&key);
    next.revision += 1;
    let state = engine
        .replace(
            &f.store,
            &f.verifier,
            &old,
            f.response(&next),
            (&slot, &key),
            NOW,
        )
        .unwrap();
    assert!(state.is_writable());
    assert!(f.store.is_revoked("device-1").unwrap());
    assert!(!f.store.is_revoked("device-2").unwrap());
    let installed = f.store.read().unwrap().unwrap();
    assert_eq!(installed.key_slot.as_deref(), Some(slot.as_str()));
    assert!(LicenseEngine::default()
        .status(&f.store, &f.verifier, NOW)
        .unwrap()
        .is_writable());
    // Replaying the old device certificate is still blocked, even for the same license.
    f.store.write(&old).unwrap();
    assert_eq!(
        LicenseEngine::default()
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .status,
        LicenseStatus::Revoked
    );
}

#[test]
fn fresh_code_cannot_bypass_a_permanent_revocation_of_the_same_license() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let old = f.store.read().unwrap().unwrap();
    engine
        .complete_refresh(
            &f.store,
            &f.verifier,
            &old,
            Err(LicenseError::LicenseRevoked),
            NOW,
        )
        .unwrap();
    let (slot, key) = f
        .store
        .replacement_key("SYNTHETIC-REACTIVATION-CODE")
        .unwrap();
    let mut next = f.payload();
    next.device_id = "device-2".into();
    next.device_public_key = public_key_spki(&key);
    next.revision += 1;
    assert!(matches!(
        engine.replace(
            &f.store,
            &f.verifier,
            &old,
            f.response(&next),
            (&slot, &key),
            NOW
        ),
        Err(LicenseError::LicenseRevoked)
    ));
    assert_eq!(f.store.read().unwrap().unwrap(), old);
    assert_eq!(
        LicenseEngine::default()
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .status,
        LicenseStatus::LicenseRevoked
    );
}

#[test]
#[cfg(debug_assertions)]
fn http_activation_accepts_a_new_code_for_the_same_license_without_exclusion_metadata() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let old = f.store.read().unwrap().unwrap();
    engine.revoke(&f.store, "device-1").unwrap();
    let (slot, key) = f
        .store
        .replacement_key("SYNTHETIC-REACTIVATION-CODE")
        .unwrap();
    let mut next = f.payload();
    next.device_id = "device-2".into();
    next.device_public_key = public_key_spki(&key);
    next.revision += 1;
    let response = f.response(&next);
    let body =
        serde_json::json!({"deviceId":response.device_id,"license":response.license}).to_string();
    let (url, thread) = mock_server(vec![
        (
            "/v1/activation/challenge",
            201,
            r#"{"challengeId":"test-challenge","nonce":"test-nonce"}"#.into(),
        ),
        ("/v1/activation/activate", 200, body),
    ]);
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let response = runtime
        .block_on(super::client::LicenseClient::new(&url).unwrap().activate(
            &key,
            "SYNTHETIC-REACTIVATION-CODE",
            "License change test",
        ))
        .unwrap();
    thread.join().unwrap();
    assert!(engine
        .replace(&f.store, &f.verifier, &old, response, (&slot, &key), NOW)
        .unwrap()
        .is_writable());
}

#[test]
fn stoa_certificate_is_bound_to_app_and_running_major_version() {
    let fixture = Fixture::new();
    let mut payload = fixture.payload();
    payload.version = 2;
    payload.issuer = "stoa-license-server".into();
    payload.app_id = Some(super::certificate::app_id().into());
    payload.major_version = Some(super::certificate::app_major_version());
    let verify = |payload: &LicensePayload| {
        fixture.verifier.verify(
            &fixture.response(payload).license,
            &payload.device_public_key,
            &payload.device_id,
        )
    };
    assert!(verify(&payload).is_ok());
    payload.app_id = Some("another-app".into());
    assert!(verify(&payload).is_err());
    payload.app_id = Some(super::certificate::app_id().into());
    payload.major_version = Some(super::certificate::app_major_version() + 1);
    assert!(verify(&payload).is_err());
    payload.major_version = None;
    assert!(verify(&payload).is_err());
}

#[test]
fn all_version_certificate_requires_explicit_signed_scope_and_correct_app() {
    let fixture = Fixture::new();
    let mut payload = fixture.payload();
    payload.version = 2;
    payload.issuer = "stoa-license-server".into();
    payload.app_id = Some(super::certificate::app_id().into());
    payload.major_version = None;
    let verify = |payload: &LicensePayload| {
        fixture.verifier.verify(
            &fixture.response(payload).license,
            &payload.device_public_key,
            &payload.device_id,
        )
    };
    assert!(verify(&payload).is_err());
    payload.all_versions = true;
    assert!(verify(&payload).is_ok());
    payload.app_id = Some("another-app".into());
    assert!(verify(&payload).is_err());
    payload.app_id = Some(super::certificate::app_id().into());
    payload.major_version = Some(super::certificate::app_major_version());
    assert!(verify(&payload).is_err());
}

#[test]
#[cfg(debug_assertions)]
fn http_missing_server_activation_blocks_writes_across_restart_but_can_be_restored() {
    for code in [
        "DEVICE_NOT_FOUND",
        "LICENSE_NOT_FOUND",
        "DEVICE_NOT_ACTIVE",
        "LICENSE_SCOPE_MISMATCH",
    ] {
        let f = Fixture::new();
        let mut engine = LicenseEngine::default();
        f.activate(&mut engine);
        let before = f.store.read().unwrap().unwrap();
        let (url, server) = mock_server(vec![
            (
                "/v1/activation/challenge",
                201,
                serde_json::json!({"challengeId":"test-challenge","nonce":"test-nonce"})
                    .to_string(),
            ),
            (
                "/v1/activation/refresh",
                403,
                serde_json::json!({"code":code}).to_string(),
            ),
        ]);
        let result = tauri::async_runtime::block_on(async {
            super::client::LicenseClient::new(&url)
                .unwrap()
                .refresh(&f.store.key, &before.device_id)
                .await
        });
        server.join().unwrap();
        assert!(
            matches!(result, Err(LicenseError::ActivationRequired)),
            "{code}"
        );
        let state = engine
            .complete_refresh(&f.store, &f.verifier, &before, result, NOW)
            .unwrap();
        assert_eq!(state.status, LicenseStatus::ActivationRequired);
        assert!(!state.is_writable());
        assert!(engine.authorize(&f.store, &f.verifier, NOW, None).is_err());
        let stored = f.store.read().unwrap().unwrap();
        assert!(stored.activation_required);
        assert_eq!(stored.token, before.token);
        assert_eq!(stored.key_slot, before.key_slot);
        assert!(!f.store.revoked.get());
        assert!(f.store.revoked_licenses.borrow().is_empty());
        let mut restarted = LicenseEngine::default();
        assert_eq!(
            restarted.status(&f.store, &f.verifier, NOW).unwrap().status,
            LicenseStatus::ActivationRequired
        );
        assert!(restarted
            .authorize(&f.store, &f.verifier, NOW, None)
            .is_err());
        assert!(restarted
            .complete_refresh(
                &f.store,
                &f.verifier,
                &stored,
                Err(LicenseError::Network),
                NOW
            )
            .is_err());
        assert!(!restarted
            .status(&f.store, &f.verifier, NOW)
            .unwrap()
            .is_writable());
        // Restoring the server binding is allowed to clear this recoverable condition.
        let mut renewed = f.payload();
        renewed.issued_at += 1;
        let state = restarted
            .complete_refresh(
                &f.store,
                &f.verifier,
                &stored,
                Ok(f.response(&renewed)),
                NOW + 1,
            )
            .unwrap();
        assert!(state.is_writable());
        assert!(!f.store.read().unwrap().unwrap().activation_required);
        assert!(LicenseEngine::default()
            .status(&f.store, &f.verifier, NOW + 1)
            .unwrap()
            .is_writable());
    }
}

#[test]
fn lost_server_activation_is_latched_before_failed_persistence_and_retried() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let before = f.store.read().unwrap().unwrap();
    f.store.write_fails.set(true);
    assert!(matches!(
        engine.complete_refresh(
            &f.store,
            &f.verifier,
            &before,
            Err(LicenseError::ActivationRequired),
            NOW
        ),
        Err(LicenseError::Storage(_))
    ));
    assert!(engine.authorize(&f.store, &f.verifier, NOW, None).is_err());
    f.store.write_fails.set(false);
    assert_eq!(
        engine.status(&f.store, &f.verifier, NOW).unwrap().status,
        LicenseStatus::ActivationRequired
    );
    assert!(f.store.read().unwrap().unwrap().activation_required);
    assert!(!LicenseEngine::default()
        .status(&f.store, &f.verifier, NOW)
        .unwrap()
        .is_writable());
}

#[test]
fn stale_missing_activation_response_cannot_replace_a_newer_license() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let before = f.store.read().unwrap().unwrap();
    let mut newer = f.payload();
    newer.revision += 1;
    engine
        .commit(
            &f.store,
            &f.verifier,
            Some(&before),
            f.response(&newer),
            NOW,
        )
        .unwrap();
    let latest = f.store.read().unwrap().unwrap();
    assert!(matches!(
        engine.complete_refresh(
            &f.store,
            &f.verifier,
            &before,
            Err(LicenseError::ActivationRequired),
            NOW
        ),
        Err(LicenseError::StateChanged)
    ));
    assert_eq!(f.store.read().unwrap().unwrap(), latest);
    assert!(engine
        .status(&f.store, &f.verifier, NOW)
        .unwrap()
        .is_writable());
}

#[test]
fn a_new_activation_code_can_replace_a_binding_lost_in_a_server_reset() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let before = f.store.read().unwrap().unwrap();
    engine
        .complete_refresh(
            &f.store,
            &f.verifier,
            &before,
            Err(LicenseError::ActivationRequired),
            NOW,
        )
        .unwrap();
    let previous = f.store.read().unwrap().unwrap();
    let (slot, key) = f.store.replacement_key("SYNTHETIC-NEW-CODE").unwrap();
    let mut next = f.payload();
    next.license_id = "new-license".into();
    next.device_id = "new-device".into();
    next.device_public_key = public_key_spki(&key);
    let state = engine
        .replace(
            &f.store,
            &f.verifier,
            &previous,
            f.response(&next),
            (&slot, &key),
            NOW,
        )
        .unwrap();
    assert!(state.is_writable());
    assert!(!f.store.read().unwrap().unwrap().activation_required);
    assert!(LicenseEngine::default()
        .status(&f.store, &f.verifier, NOW)
        .unwrap()
        .is_writable());
}

#[test]
fn existing_license_files_without_reactivation_metadata_remain_compatible() {
    let f = Fixture::new();
    f.activate(&mut LicenseEngine::default());
    let mut value = serde_json::to_value(f.store.read().unwrap().unwrap()).unwrap();
    value.as_object_mut().unwrap().remove("activationRequired");
    let legacy: StoredLicense = serde_json::from_value(value).unwrap();
    assert!(!legacy.activation_required);
}

#[test]
fn profile_metadata_distinguishes_certificate_expiry_from_sync_and_survives_read_only_states() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    f.activate(&mut engine);
    let payload = f.payload();
    let active = engine.status(&f.store, &f.verifier, NOW).unwrap();
    assert_eq!(active.certificate_expires_at, Some(payload.expires_at));
    assert_eq!(active.expires_at, active.certificate_expires_at);
    assert_eq!(active.next_sync_at, Some(NOW + 86400));
    let expired = engine
        .status(&f.store, &f.verifier, payload.expires_at)
        .unwrap();
    assert_eq!(expired.status, LicenseStatus::Expired);
    assert_eq!(expired.plan.as_deref(), Some("test"));
    assert_eq!(expired.features, payload.features);
    assert_eq!(expired.certificate_expires_at, Some(payload.expires_at));
    assert!(!expired.allows_feature("core"));
    assert!(engine
        .authorize(&f.store, &f.verifier, payload.expires_at, Some("core"))
        .is_err());
    let stored = f.store.read().unwrap().unwrap();
    let revoked = engine
        .complete_refresh(
            &f.store,
            &f.verifier,
            &stored,
            Err(LicenseError::Revoked),
            NOW,
        )
        .unwrap();
    assert_eq!(revoked.status, LicenseStatus::Revoked);
    assert_eq!(revoked.plan.as_deref(), Some("test"));
    assert_eq!(revoked.features, payload.features);
    assert_eq!(revoked.certificate_expires_at, Some(payload.expires_at));
    assert_eq!(revoked.next_sync_at, None);
    assert!(!revoked.allows_feature("core"));
}

#[test]
fn profile_metadata_never_comes_from_an_unverified_certificate() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    let empty = engine.status(&f.store, &f.verifier, NOW).unwrap();
    assert_eq!(empty.certificate_expires_at, None);
    assert_eq!(empty.next_sync_at, None);
    f.activate(&mut engine);
    f.store.license.borrow_mut().as_mut().unwrap().token = "forged".into();
    let invalid = engine.status(&f.store, &f.verifier, NOW).unwrap();
    assert_eq!(invalid.status, LicenseStatus::Invalid);
    assert_eq!(invalid.plan, None);
    assert!(invalid.features.is_empty());
    assert_eq!(invalid.certificate_expires_at, None);
    assert_eq!(invalid.next_sync_at, None);
}

#[test]
fn synchronization_is_due_no_later_than_a_short_lived_certificates_expiry() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    let mut payload = f.payload();
    payload.expires_at = NOW + 3600;
    let state = engine
        .commit(&f.store, &f.verifier, None, f.response(&payload), NOW)
        .unwrap();
    assert_eq!(state.next_sync_at, Some(NOW + 3600));
    assert_eq!(state.certificate_expires_at, Some(NOW + 3600));
}

#[test]
fn signed_all_features_grants_future_features_but_never_bypasses_license_validity() {
    let f = Fixture::new();
    let mut engine = LicenseEngine::default();
    let mut payload = f.payload();
    payload.features = vec!["all_features".into(), "future_feature".into()];
    let state = engine
        .commit(&f.store, &f.verifier, None, f.response(&payload), NOW)
        .unwrap();
    assert!(state.allows_feature("pdf_export"));
    assert!(state.allows_feature("not_yet_invented"));
    assert!(engine
        .authorize(&f.store, &f.verifier, NOW, Some("not_yet_invented"))
        .is_ok());
    for status in [
        LicenseStatus::Expired,
        LicenseStatus::Revoked,
        LicenseStatus::LicenseRevoked,
        LicenseStatus::Invalid,
        LicenseStatus::Unactivated,
        LicenseStatus::ActivationRequired,
    ] {
        let mut blocked = state.clone();
        blocked.status = status;
        assert!(!blocked.allows_feature("not_yet_invented"));
    }
    assert!(engine
        .authorize(
            &f.store,
            &f.verifier,
            NOW + 30 * 86400,
            Some("not_yet_invented")
        )
        .is_err());
    // Removing the wildcard in a newly signed revision restores individual feature checks.
    payload.features = vec!["future_feature".into()];
    payload.revision += 1;
    payload.issued_at += 30 * 86400;
    payload.expires_at += 30 * 86400;
    let expected = f.store.read().unwrap().unwrap();
    engine
        .commit(
            &f.store,
            &f.verifier,
            Some(&expected),
            f.response(&payload),
            payload.issued_at,
        )
        .unwrap();
    assert!(engine
        .authorize(
            &f.store,
            &f.verifier,
            payload.issued_at,
            Some("future_feature")
        )
        .is_ok());
    assert!(matches!(
        engine.authorize(
            &f.store,
            &f.verifier,
            payload.issued_at,
            Some("not_yet_invented")
        ),
        Err(LicenseError::LicenseFeatureDenied)
    ));
}

fn signed_token(fixture: &Fixture, payload: &LicensePayload, typ: &str) -> String {
    let header = URL_SAFE_NO_PAD.encode(
        serde_json::to_vec(&serde_json::json!({ "alg": "EdDSA", "typ": typ, "kid": "test-key" }))
            .unwrap(),
    );
    let body = URL_SAFE_NO_PAD.encode(serde_json::to_vec(payload).unwrap());
    let message = format!("{header}.{body}");
    let signature = fixture.signer.sign(message.as_bytes());
    format!("{message}.{}", URL_SAFE_NO_PAD.encode(signature.to_bytes()))
}

fn legacy_payload(fixture: &Fixture) -> LicensePayload {
    let mut payload = fixture.payload();
    payload.version = 1;
    payload.issuer = "invoicer-license-server".into();
    payload.app_id = None;
    payload.major_version = None;
    payload
}

fn legacy_config(max_app_major: u32) -> super::LegacyCertificate {
    super::LegacyCertificate {
        typ: "invoicer-license",
        issuer: "invoicer-license-server",
        max_app_major,
    }
}

#[test]
fn legacy_certificates_are_rejected_unless_configured() {
    let fixture = Fixture::new();
    let payload = legacy_payload(&fixture);
    let token = signed_token(&fixture, &payload, "invoicer-license");
    assert!(fixture
        .verifier
        .verify(&token, &payload.device_public_key, &payload.device_id)
        .is_err());
}

#[test]
fn configured_legacy_certificates_are_accepted_only_in_their_exact_unscoped_form() {
    let fixture = Fixture::new();
    let major = super::certificate::app_major_version();
    let verifier = CertificateVerifier::for_test(fixture.signer.verifying_key())
        .with_legacy(legacy_config(major));
    let verify = |payload: &LicensePayload, typ: &str| {
        verifier.verify(
            &signed_token(&fixture, payload, typ),
            &payload.device_public_key,
            &payload.device_id,
        )
    };
    let payload = legacy_payload(&fixture);
    assert!(verify(&payload, "invoicer-license").is_ok());

    // Header type and issuer must both match the configured legacy format.
    assert!(verify(&payload, "stoa-license").is_err());
    assert!(verify(&payload, "other-license").is_err());
    let mut other = payload.clone();
    other.issuer = "stoa-license-server".into();
    assert!(verify(&other, "invoicer-license").is_err());

    // Legacy certificates carry no app or version scope.
    let mut scoped = payload.clone();
    scoped.app_id = Some(super::certificate::app_id().into());
    assert!(verify(&scoped, "invoicer-license").is_err());
    let mut versioned = payload.clone();
    versioned.major_version = Some(major);
    assert!(verify(&versioned, "invoicer-license").is_err());
    let mut all_versions = payload.clone();
    all_versions.all_versions = true;
    assert!(verify(&all_versions, "invoicer-license").is_err());
    let mut version_two = payload.clone();
    version_two.version = 2;
    assert!(verify(&version_two, "invoicer-license").is_err());

    // Device binding still applies.
    assert!(verifier
        .verify(
            &signed_token(&fixture, &payload, "invoicer-license"),
            &payload.device_public_key,
            "another-device"
        )
        .is_err());

    // Current STOA certificates keep working alongside the legacy format.
    assert!(verify(&fixture.payload(), "stoa-license").is_ok());
}

#[test]
fn legacy_certificates_expire_with_the_configured_major_version() {
    let fixture = Fixture::new();
    let major = super::certificate::app_major_version();
    let payload = legacy_payload(&fixture);
    let token = signed_token(&fixture, &payload, "invoicer-license");
    let verify = |max_app_major| {
        CertificateVerifier::for_test(fixture.signer.verifying_key())
            .with_legacy(legacy_config(max_app_major))
            .verify(&token, &payload.device_public_key, &payload.device_id)
    };
    assert!(verify(major).is_ok());
    assert!(verify(major + 1).is_ok());
    assert!(verify(major - 1).is_err());
}
