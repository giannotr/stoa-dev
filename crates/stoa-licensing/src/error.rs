use serde::Serialize;
use thiserror::Error;

/// Stable IPC codes; never include tokens, activation codes or private keys.
#[derive(Debug, Clone, Error, Serialize)]
#[serde(tag = "code", content = "detail", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LicenseError {
    #[error("LICENSE_READ_ONLY")]
    LicenseReadOnly,
    #[error("LICENSE_FEATURE_DENIED")]
    LicenseFeatureDenied,
    #[error("License storage unavailable: {0}")]
    Storage(String),
    #[error("Invalid license certificate: {0}")]
    Certificate(String),
    #[error("License network request failed")]
    Network,
    #[error("Invalid license server response")]
    Protocol,
    #[error("License server rejected request ({status}, {code})")]
    Api { status: u16, code: String },
    #[error("Device revoked")]
    Revoked,
    #[error("License revoked")]
    LicenseRevoked,
    #[error("Installation already has a license record")]
    AlreadyActivated,
    #[error("No activated device")]
    Unactivated,
    #[error("Device activation must be renewed")]
    ActivationRequired,
    #[error("License state changed during request")]
    StateChanged,
    #[error("License synchronization unavailable")]
    Synchronization,
}

impl From<String> for LicenseError {
    fn from(error: String) -> Self {
        Self::Storage(error)
    }
}
