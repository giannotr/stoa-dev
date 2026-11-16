use ed25519_dalek::SigningKey;
use reqwest::{Client, Response, StatusCode};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::time::Duration;

use super::{
    certificate::{app_id, app_major_version},
    crypto::{hash_activation_code, public_key_spki, sign_device_proof},
    error::LicenseError,
};

#[derive(Deserialize)]
struct ApiErrorResponse {
    code: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Challenge {
    challenge_id: String,
    nonce: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseResponse {
    pub device_id: String,
    pub license: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ChallengeRequest<'a> {
    app_id: &'a str,
    major_version: u32,
    action: &'a str,
    device_public_key: &'a str,
}

pub struct LicenseClient {
    http: Client,
    base_url: String,
}

fn api_error(status: StatusCode, bytes: &[u8], revocation_allowed: bool) -> LicenseError {
    let Ok(body) = serde_json::from_slice::<ApiErrorResponse>(bytes) else {
        return LicenseError::Protocol;
    };
    if body.code.len() > 64
        || body.code.is_empty()
        || !body
            .code
            .bytes()
            .all(|b| b.is_ascii_uppercase() || b == b'_')
    {
        return LicenseError::Protocol;
    }
    if revocation_allowed && status == StatusCode::FORBIDDEN && body.code == "DEVICE_REVOKED" {
        LicenseError::Revoked
    } else if revocation_allowed
        && status == StatusCode::FORBIDDEN
        && body.code == "LICENSE_REVOKED"
    {
        LicenseError::LicenseRevoked
    } else if revocation_allowed
        && status == StatusCode::FORBIDDEN
        && matches!(
            body.code.as_str(),
            "DEVICE_NOT_FOUND"
                | "LICENSE_NOT_FOUND"
                | "DEVICE_NOT_ACTIVE"
                | "LICENSE_SCOPE_MISMATCH"
        )
    {
        // A missing/mismatched server binding requires activation, not a permanent revocation.
        LicenseError::ActivationRequired
    } else {
        LicenseError::Api {
            status: status.as_u16(),
            code: body.code,
        }
    }
}

async fn decode<T: DeserializeOwned>(
    mut response: Response,
    revocation_allowed: bool,
) -> Result<T, LicenseError> {
    let status = response.status();
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| LicenseError::Network)? {
        if bytes.len() + chunk.len() > 32_768 {
            return Err(LicenseError::Protocol);
        }
        bytes.extend_from_slice(&chunk);
    }
    if !status.is_success() {
        return Err(api_error(status, &bytes, revocation_allowed));
    }
    serde_json::from_slice(&bytes).map_err(|_| LicenseError::Protocol)
}

impl LicenseClient {
    pub fn new(base_url: &str) -> Result<Self, LicenseError> {
        let url = reqwest::Url::parse(base_url).map_err(|_| LicenseError::Protocol)?;
        // Cleartext is restricted to the development loopback endpoint.
        if url.scheme() != "https"
            && !(cfg!(debug_assertions)
                && url.scheme() == "http"
                && url.host_str() == Some("127.0.0.1"))
        {
            return Err(LicenseError::Protocol);
        }
        let http = Client::builder()
            .timeout(Duration::from_secs(15))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|_| LicenseError::Network)?;
        Ok(Self {
            http,
            base_url: base_url.trim_end_matches('/').into(),
        })
    }

    async fn challenge(&self, action: &str, public_key: &str) -> Result<Challenge, LicenseError> {
        let response = self
            .http
            .post(format!("{}/v1/activation/challenge", self.base_url))
            .json(&ChallengeRequest {
                app_id: app_id(),
                major_version: app_major_version(),
                action,
                device_public_key: public_key,
            })
            .send()
            .await
            .map_err(|_| LicenseError::Network)?;
        decode(response, false).await
    }

    pub async fn activate(
        &self,
        key: &SigningKey,
        code: &str,
        device_name: &str,
    ) -> Result<LicenseResponse, LicenseError> {
        let public_key = public_key_spki(key);
        let challenge = self.challenge("activate", &public_key).await?;
        let signature = sign_device_proof(
            key,
            "activate",
            &challenge.challenge_id,
            &challenge.nonce,
            &hash_activation_code(code),
        );
        let body = serde_json::json!({ "appId": app_id(), "majorVersion": app_major_version(), "challengeId": challenge.challenge_id, "devicePublicKey": public_key,
            "signature": signature, "code": code, "deviceName": device_name });
        let response = self
            .http
            .post(format!("{}/v1/activation/activate", self.base_url))
            .json(&body)
            .send()
            .await
            .map_err(|_| LicenseError::Network)?;
        decode(response, false).await
    }

    pub async fn refresh(
        &self,
        key: &SigningKey,
        device_id: &str,
    ) -> Result<LicenseResponse, LicenseError> {
        let public_key = public_key_spki(key);
        let challenge = self.challenge("refresh", &public_key).await?;
        let signature = sign_device_proof(
            key,
            "refresh",
            &challenge.challenge_id,
            &challenge.nonce,
            device_id,
        );
        let response = self.http.post(format!("{}/v1/activation/refresh", self.base_url))
            .json(&serde_json::json!({ "appId": app_id(), "majorVersion": app_major_version(), "challengeId": challenge.challenge_id, "devicePublicKey": public_key,
                "signature": signature, "deviceId": device_id }))
            .send().await.map_err(|_| LicenseError::Network)?;
        decode(response, true).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn license_revocation_requires_forbidden_on_the_authenticated_refresh_endpoint() {
        for allowed in [false, true] {
            for status in [
                StatusCode::FORBIDDEN,
                StatusCode::UNAUTHORIZED,
                StatusCode::INTERNAL_SERVER_ERROR,
            ] {
                let error = api_error(status, br#"{"code":"LICENSE_REVOKED"}"#, allowed);
                assert_eq!(
                    matches!(error, LicenseError::LicenseRevoked),
                    allowed && status == StatusCode::FORBIDDEN
                );
            }
        }
        assert!(!matches!(
            api_error(
                StatusCode::FORBIDDEN,
                br#"{"code":"LICENSE_NOT_ACTIVE"}"#,
                true
            ),
            LicenseError::LicenseRevoked
        ));
    }

    #[test]
    fn only_explicit_authenticated_refresh_revocation_is_permanent() {
        assert!(matches!(
            api_error(StatusCode::FORBIDDEN, br#"{"code":"DEVICE_REVOKED"}"#, true),
            LicenseError::Revoked
        ));
        for status in [StatusCode::UNAUTHORIZED, StatusCode::INTERNAL_SERVER_ERROR] {
            assert!(!matches!(
                api_error(status, br#"{"code":"DEVICE_REVOKED"}"#, true),
                LicenseError::Revoked
            ));
        }
        assert!(!matches!(
            api_error(
                StatusCode::FORBIDDEN,
                br#"{"code":"DEVICE_REVOKED"}"#,
                false
            ),
            LicenseError::Revoked
        ));
        for body in [
            br#"{"code":"DEVICE_NOT_ACTIVE"}"#.as_slice(),
            br#"{"error":"DEVICE_REVOKED"}"#,
            b"unavailable",
        ] {
            assert!(!matches!(
                api_error(StatusCode::FORBIDDEN, body, true),
                LicenseError::Revoked
            ));
        }
    }
    #[test]
    fn missing_binding_requires_activation_only_on_a_forbidden_refresh_response() {
        for code in [
            "DEVICE_NOT_FOUND",
            "LICENSE_NOT_FOUND",
            "DEVICE_NOT_ACTIVE",
            "LICENSE_SCOPE_MISMATCH",
        ] {
            let body = serde_json::json!({"code":code}).to_string();
            for allowed in [false, true] {
                for status in [
                    StatusCode::FORBIDDEN,
                    StatusCode::UNAUTHORIZED,
                    StatusCode::NOT_FOUND,
                    StatusCode::INTERNAL_SERVER_ERROR,
                ] {
                    assert_eq!(
                        matches!(
                            api_error(status, body.as_bytes(), allowed),
                            LicenseError::ActivationRequired
                        ),
                        allowed && status == StatusCode::FORBIDDEN
                    );
                }
            }
        }
        for code in ["LICENSE_NOT_ACTIVE", "USER_NOT_ACTIVE", "UNKNOWN_ERROR"] {
            let body = serde_json::json!({"code":code}).to_string();
            assert!(matches!(
                api_error(StatusCode::FORBIDDEN, body.as_bytes(), true),
                LicenseError::Api { .. }
            ));
        }
    }
}
