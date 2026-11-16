use super::config::config;
use base64::{
    engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD},
    Engine,
};
use chrono::Utc;
use ed25519_dalek::{Signature, VerifyingKey};
use serde::{Deserialize, Serialize};

pub fn app_id() -> &'static str {
    config().app_id
}

pub fn app_major_version() -> u32 {
    config().app_major_version
}
const MAX_OFFLINE_SECONDS: i64 = 30 * 24 * 60 * 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicensePayload {
    pub version: u8,
    pub issuer: String,
    #[serde(default)]
    pub app_id: Option<String>,
    #[serde(default)]
    pub major_version: Option<u32>,
    #[serde(default)]
    pub all_versions: bool,
    pub license_id: String,
    pub user_id: String,
    pub device_id: String,
    pub device_public_key: String,
    pub plan: String,
    pub features: Vec<String>,
    pub revision: u64,
    pub issued_at: i64,
    pub expires_at: i64,
}

#[derive(Deserialize)]
struct TokenHeader {
    alg: String,
    typ: String,
    kid: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum CertificateError {
    #[error("Invalid certificate")]
    Invalid,
}

pub struct CertificateVerifier {
    key: VerifyingKey,
    kid: String,
}

impl CertificateVerifier {
    pub fn production() -> Result<Self, CertificateError> {
        let bytes = STANDARD
            .decode(config().public_key_base64)
            .map_err(|_| CertificateError::Invalid)?;
        let bytes: [u8; 32] = bytes.try_into().map_err(|_| CertificateError::Invalid)?;
        Ok(Self {
            key: VerifyingKey::from_bytes(&bytes).map_err(|_| CertificateError::Invalid)?,
            kid: config().key_id.into(),
        })
    }

    #[cfg(test)]
    pub(crate) fn for_test(key: VerifyingKey) -> Self {
        Self {
            key,
            kid: "test-key".into(),
        }
    }

    /// Verify authenticity, binding and signed validity bounds. Time policy is separate.
    pub fn verify(
        &self,
        token: &str,
        expected_device_public_key: &str,
        expected_device_id: &str,
    ) -> Result<LicensePayload, CertificateError> {
        self.verify_inner(token, expected_device_public_key, expected_device_id)
            .map_err(|_| CertificateError::Invalid)
    }

    fn verify_inner(
        &self,
        token: &str,
        expected_device_public_key: &str,
        expected_device_id: &str,
    ) -> Result<LicensePayload, String> {
        if token.len() > 16_384 {
            return Err("License token too large".into());
        }

        let parts: Vec<&str> = token.split('.').collect();

        if parts.len() != 3 {
            return Err("Malformed license token".into());
        }

        let decode = |part: &str| {
            let bytes = URL_SAFE_NO_PAD.decode(part).map_err(|e| e.to_string())?;

            if URL_SAFE_NO_PAD.encode(&bytes) != part {
                return Err("Noncanonical Base64url".to_string());
            }

            Ok::<Vec<u8>, String>(bytes)
        };

        let header: TokenHeader =
            serde_json::from_slice(&decode(parts[0])?).map_err(|e| e.to_string())?;

        if header.alg != "EdDSA" || header.typ != "stoa-license" || header.kid != self.kid {
            return Err("Invalid license header".into());
        }

        let signature_bytes = decode(parts[2])?;

        let signature = Signature::from_slice(&signature_bytes).map_err(|e| e.to_string())?;

        let signed_message = format!("{}.{}", parts[0], parts[1]);

        self.key
            .verify_strict(signed_message.as_bytes(), &signature)
            .map_err(|_| "Invalid license signature")?;

        let payload: LicensePayload =
            serde_json::from_slice(&decode(parts[1])?).map_err(|e| e.to_string())?;

        let scoped = payload.version == 2
            && payload.issuer == "stoa-license-server"
            && header.typ == "stoa-license"
            && payload.app_id.as_deref() == Some(app_id())
            && ((payload.all_versions && payload.major_version.is_none())
                || (!payload.all_versions && payload.major_version == Some(app_major_version())));
        if !scoped {
            return Err("Unsupported license payload".into());
        }

        if payload.device_public_key != expected_device_public_key {
            return Err("License belongs to another key".into());
        }

        if payload.device_id != expected_device_id {
            return Err("License belongs to another device".into());
        }

        if payload.expires_at <= payload.issued_at
            || payload
                .expires_at
                .checked_sub(payload.issued_at)
                .is_none_or(|duration| duration > MAX_OFFLINE_SECONDS)
        {
            return Err("Invalid certificate validity".into());
        }

        Ok(payload)
    }
}

pub fn current_timestamp() -> i64 {
    Utc::now().timestamp()
}

pub fn refresh_timestamp(payload: &LicensePayload) -> i64 {
    payload.issued_at.saturating_add(24 * 60 * 60)
}
