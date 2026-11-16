pub mod certificate;
pub mod client;
pub mod commands;
pub mod config;
pub mod crypto;
pub mod service;
pub mod storage;

use serde::Serialize;
pub mod error;
mod policy;
pub use config::{configure, LicensingConfig};
pub use service::{require_write_access, LicenseService};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LicenseStatus {
    Unactivated,
    ActivationRequired,
    Active,
    OfflineGrace,
    Expired,
    Revoked,
    LicenseRevoked,
    Invalid,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseState {
    pub status: LicenseStatus,
    pub plan: Option<String>,
    pub features: Vec<String>,
    pub expires_at: Option<i64>,
    /// Expiry of the signed offline certificate, not the purchased license term.
    pub certificate_expires_at: Option<i64>,
    pub next_sync_at: Option<i64>,
    pub device_id: Option<String>,
    pub persistence_pending: bool,
}

impl LicenseState {
    pub fn is_writable(&self) -> bool {
        matches!(
            self.status,
            LicenseStatus::Active | LicenseStatus::OfflineGrace
        )
    }

    pub fn allows_feature(&self, feature: &str) -> bool {
        self.is_writable()
            && self
                .features
                .iter()
                .any(|f| f == "all_features" || f == feature)
    }
}

#[cfg(test)]
mod tests;
