//! Build-time configuration supplied by the host app.
//!
//! The values are *not* secrets: the server public key only verifies signatures, the private
//! signing key never leaves the license server. They are pinned at compile time in the app so the
//! webview can never swap the trust anchor or the endpoint.

use std::sync::OnceLock;

/// Certificates from a pre-STOA license server that an app keeps accepting.
///
/// A legacy certificate is a version-1 payload without app id or major-version scope,
/// signed with the configured key, whose header `typ` and payload `issuer` match.
#[derive(Debug, Clone)]
pub struct LegacyCertificate {
    /// Header `typ`, e.g. `"invoicer-license"`.
    pub typ: &'static str,
    /// Payload `issuer`, e.g. `"invoicer-license-server"`.
    pub issuer: &'static str,
    /// Accepted only while the app's major version is at most this value.
    pub max_app_major: u32,
}

#[derive(Debug, Clone)]
pub struct LicensingConfig {
    /// Product identifier registered on the license server, e.g. `"servicerecordr"`.
    pub app_id: &'static str,
    /// Major version a certificate must match unless it grants `all_versions`.
    pub app_major_version: u32,
    /// License server base URL, e.g. `"https://license.stoa.berlin"`.
    pub server_url: &'static str,
    /// Base64 Ed25519 public key of the license server.
    pub public_key_base64: &'static str,
    /// Key id (`kid`) the server signs with.
    pub key_id: &'static str,
    /// OS keychain service name; use the Tauri bundle identifier.
    pub storage_service: &'static str,
    /// Optional pre-STOA certificate format to keep accepting. `None` for new apps.
    pub legacy_certificate: Option<LegacyCertificate>,
    /// Keychain service of a legacy device-revocation marker; defaults to `storage_service`.
    pub legacy_revocation_service: Option<&'static str>,
}

static CONFIG: OnceLock<LicensingConfig> = OnceLock::new();

/// Install the configuration once, before the first license command runs.
/// Returns `false` if a configuration was already installed.
pub fn configure(config: LicensingConfig) -> bool {
    CONFIG.set(config).is_ok()
}

pub(crate) fn config() -> &'static LicensingConfig {
    #[cfg(test)]
    {
        CONFIG.get_or_init(|| LicensingConfig {
            app_id: "stoa-test",
            app_major_version: 1,
            server_url: "http://127.0.0.1:9",
            public_key_base64: "",
            key_id: "test-key",
            storage_service: "stoa-licensing-tests",
            legacy_certificate: None,
            legacy_revocation_service: None,
        })
    }
    #[cfg(not(test))]
    {
        CONFIG
            .get()
            .expect("stoa_licensing::configure() must be called during app setup")
    }
}

/// Parses `CARGO_PKG_VERSION_MAJOR` in a const context.
#[doc(hidden)]
pub const fn parse_major(value: &str) -> u32 {
    let bytes = value.as_bytes();
    let mut index = 0;
    let mut result = 0u32;
    while index < bytes.len() {
        assert!(bytes[index].is_ascii_digit(), "invalid major version");
        result = result * 10 + (bytes[index] - b'0') as u32;
        index += 1;
    }
    result
}

/// Builds a [`LicensingConfig`] from the host app's compile-time environment
/// (`STOA_APP_ID`, `STOA_LICENSE_SERVER_URL`, `STOA_LICENSE_PUBLIC_KEY`,
/// `STOA_LICENSE_KEY_ID`, `STOA_STORAGE_SERVICE` and the app's own `CARGO_PKG_VERSION_MAJOR`).
/// Expands inside the app crate, so the app's `build.rs` stays the single source of truth.
#[macro_export]
macro_rules! config_from_env {
    () => {
        $crate::LicensingConfig {
            app_id: env!("STOA_APP_ID"),
            app_major_version: $crate::config::parse_major(env!("CARGO_PKG_VERSION_MAJOR")),
            server_url: env!("STOA_LICENSE_SERVER_URL"),
            public_key_base64: env!("STOA_LICENSE_PUBLIC_KEY"),
            key_id: env!("STOA_LICENSE_KEY_ID"),
            storage_service: env!("STOA_STORAGE_SERVICE"),
            legacy_certificate: None,
            legacy_revocation_service: None,
        }
    };
}
