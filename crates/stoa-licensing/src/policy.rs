use super::{certificate::LicensePayload, LicenseState, LicenseStatus};

pub fn state(status: LicenseStatus, device_id: Option<String>) -> LicenseState {
    LicenseState {
        status,
        plan: None,
        features: vec![],
        expires_at: None,
        certificate_expires_at: None,
        next_sync_at: None,
        device_id,
        persistence_pending: false,
    }
}

/// Display metadata from a verified certificate never grants access by itself.
pub fn with_details(mut state: LicenseState, payload: &LicensePayload) -> LicenseState {
    state.plan = Some(payload.plan.clone());
    state.features = payload.features.clone();
    // Keep expiresAt for older clients; both expiry fields refer only to the certificate.
    state.expires_at = Some(payload.expires_at);
    state.certificate_expires_at = Some(payload.expires_at);
    state.next_sync_at = matches!(
        state.status,
        LicenseStatus::Active | LicenseStatus::OfflineGrace | LicenseStatus::Expired
    )
    .then(|| super::certificate::refresh_timestamp(payload).min(payload.expires_at));
    state
}

/// Pure policy: all dates affecting access come from a verified certificate or the time anchor.
pub fn evaluate(payload: &LicensePayload, now: i64, last_observed_at: i64) -> LicenseState {
    let effective_now = now.max(last_observed_at);
    if now.saturating_add(300) < last_observed_at
        || payload.issued_at > effective_now.saturating_add(300)
    {
        return with_details(
            state(LicenseStatus::Invalid, Some(payload.device_id.clone())),
            payload,
        );
    }
    if payload.expires_at <= effective_now {
        return with_details(
            state(LicenseStatus::Expired, Some(payload.device_id.clone())),
            payload,
        );
    }
    LicenseState {
        status: if effective_now >= super::certificate::refresh_timestamp(payload) {
            LicenseStatus::OfflineGrace
        } else {
            LicenseStatus::Active
        },
        plan: Some(payload.plan.clone()),
        features: payload.features.clone(),
        expires_at: Some(payload.expires_at),
        certificate_expires_at: Some(payload.expires_at),
        next_sync_at: Some(super::certificate::refresh_timestamp(payload).min(payload.expires_at)),
        device_id: Some(payload.device_id.clone()),
        persistence_pending: false,
    }
}
