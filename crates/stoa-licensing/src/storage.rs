use ed25519_dalek::SigningKey;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

use super::crypto::generate_device_key;

fn service() -> &'static str {
    super::config::config().storage_service
}

fn legacy_revocation_service() -> &'static str {
    let config = super::config::config();
    config
        .legacy_revocation_service
        .unwrap_or(config.storage_service)
}
const ACCOUNT: &str = "license-device-ed25519-v1";
const LEGACY_REVOCATION_ACCOUNT: &str = "revoked-device";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredLicense {
    pub device_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_slot: Option<String>,
    pub token: String,
    pub last_observed_at: i64,
    #[serde(default)]
    pub refresh_after: i64,
    #[serde(default)]
    pub activation_required: bool,
}

fn license_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    Ok(dir.join("license.json"))
}

pub fn read_license(app: &AppHandle) -> Result<Option<StoredLicense>, String> {
    let path = license_path(app)?;

    let content = match fs::read(path) {
        Ok(content) => content,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.to_string()),
    };

    let license = serde_json::from_slice(&content).map_err(|e| e.to_string())?;

    Ok(Some(license))
}

pub fn write_license(app: &AppHandle, license: &StoredLicense) -> Result<(), String> {
    let path = license_path(app)?;
    atomic_write(
        &path,
        &serde_json::to_vec_pretty(license).map_err(|e| e.to_string())?,
    )
}

fn atomic_write(path: &std::path::Path, content: &[u8]) -> Result<(), String> {
    use std::io::Write;
    let parent = path.parent().ok_or("Missing storage directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = parent.join(format!(".license-{}.tmp", uuid::Uuid::new_v4()));
    let result = (|| {
        let mut options = fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&temporary).map_err(|e| e.to_string())?;
        file.write_all(content).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        drop(file);
        fs::rename(&temporary, path).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        fs::File::open(parent)
            .and_then(|directory| directory.sync_all())
            .map_err(|e| e.to_string())?;
        Ok(())
    })();
    let _ = fs::remove_file(&temporary);
    result
}

fn key_entry_for(slot: &str) -> Result<Entry, String> {
    Entry::new(service(), slot).map_err(|e| e.to_string())
}
fn key_entry() -> Result<Entry, String> {
    key_entry_for(ACCOUNT)
}

pub fn load_device_key() -> Result<Option<SigningKey>, String> {
    load_key(ACCOUNT)
}

fn load_key(slot: &str) -> Result<Option<SigningKey>, String> {
    let entry = key_entry_for(slot)?;
    match entry.get_secret() {
        Ok(secret) => {
            let bytes: [u8; 32] = secret
                .as_slice()
                .try_into()
                .map_err(|_| "Invalid stored key length")?;

            Ok(Some(SigningKey::from_bytes(&bytes)))
        }

        Err(keyring::Error::NoEntry) => Ok(None),

        Err(error) => Err(error.to_string()),
    }
}

pub fn get_or_create_device_key() -> Result<SigningKey, String> {
    if let Some(key) = load_device_key()? {
        return Ok(key);
    }

    let key = generate_device_key();

    key_entry()?
        .set_secret(&key.to_bytes())
        .map_err(|e| e.to_string())?;

    Ok(key)
}

/// Storage adapter boundary used by the engine and its in-memory tests.
pub trait LicenseStore {
    fn read(&self) -> Result<Option<StoredLicense>, String>;
    fn write(&self, license: &StoredLicense) -> Result<(), String>;
    fn device_key(&self) -> Result<Option<SigningKey>, String>;
    fn get_or_create_key(&self) -> Result<SigningKey, String>;
    fn replacement_key(&self, code: &str) -> Result<(String, SigningKey), String>;
    fn is_license_revoked(&self, license_id: &str) -> Result<bool, String>;
    fn mark_license_revoked(&self, license_id: &str) -> Result<(), String>;
    fn is_revoked(&self, device_id: &str) -> Result<bool, String>;
    fn mark_revoked(&self, device_id: &str) -> Result<(), String>;
}

pub struct AppLicenseStore<'a>(pub &'a AppHandle);

fn read_keyring_marker(service: &str, account: &str) -> Result<Option<String>, String> {
    match Entry::new(service, account)
        .map_err(|e| e.to_string())?
        .get_password()
    {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

fn validate_marker(id: Option<String>, expected: &str) -> Result<bool, String> {
    match id {
        None => Ok(false),
        Some(id) if id == expected => Ok(true),
        Some(_) => Err("Revocation marker identity mismatch".into()),
    }
}
fn read_marker_file(path: &std::path::Path, expected: &str) -> Result<bool, String> {
    match fs::read(path) {
        Ok(bytes) => validate_marker(
            Some(serde_json::from_slice::<String>(&bytes).map_err(|e| e.to_string())?),
            expected,
        ),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error.to_string()),
    }
}

fn resolve_markers(
    file: Result<bool, String>,
    current: Result<bool, String>,
    legacy: Result<bool, String>,
) -> Result<bool, String> {
    // A confirmed revocation dominates other read errors; absence never hides errors.
    if file == Ok(true) || current == Ok(true) || legacy == Ok(true) {
        return Ok(true);
    }
    file?;
    current?;
    legacy?;
    Ok(false)
}

impl AppLicenseStore<'_> {
    fn license_revocation_path(&self, license_id: &str) -> Result<PathBuf, String> {
        use sha2::{Digest, Sha256};
        Ok(self
            .0
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("revoked-licenses")
            .join(format!("{:x}.json", Sha256::digest(license_id.as_bytes()))))
    }
    fn revocation_path(&self, device_id: &str) -> Result<PathBuf, String> {
        use sha2::{Digest, Sha256};
        let name = format!("{:x}.json", Sha256::digest(device_id.as_bytes()));
        Ok(self
            .0
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("license-revocations")
            .join(name))
    }
}

impl LicenseStore for AppLicenseStore<'_> {
    fn read(&self) -> Result<Option<StoredLicense>, String> {
        read_license(self.0)
    }
    fn write(&self, license: &StoredLicense) -> Result<(), String> {
        write_license(self.0, license)
    }
    fn device_key(&self) -> Result<Option<SigningKey>, String> {
        let stored = self.read()?;
        let slot = stored
            .as_ref()
            .and_then(|stored| stored.key_slot.as_deref())
            .unwrap_or(ACCOUNT);
        if slot != ACCOUNT
            && !slot
                .strip_prefix("license-switch-v1:")
                .is_some_and(|suffix| {
                    suffix.len() == 64 && suffix.bytes().all(|byte| byte.is_ascii_hexdigit())
                })
        {
            return Err("Invalid device key slot".into());
        }
        load_key(slot)
    }
    fn get_or_create_key(&self) -> Result<SigningKey, String> {
        get_or_create_device_key()
    }

    fn replacement_key(&self, code: &str) -> Result<(String, SigningKey), String> {
        // A retry after a lost activation response must prove possession of the same key.
        // Only a one-way code hash is used in the account name; the code is never persisted.
        let slot = format!(
            "license-switch-v1:{}",
            super::crypto::hash_activation_code(code)
        );
        if let Some(key) = load_key(&slot)? {
            return Ok((slot, key));
        }
        let key = generate_device_key();
        key_entry_for(&slot)?
            .set_secret(&key.to_bytes())
            .map_err(|e| e.to_string())?;
        Ok((slot, key))
    }

    fn is_license_revoked(&self, license_id: &str) -> Result<bool, String> {
        let file = read_marker_file(&self.license_revocation_path(license_id)?, license_id);
        let keyring = read_keyring_marker(
            service(),
            &format!("license-revoked-license-v1:{license_id}"),
        )
        .and_then(|id| validate_marker(id, license_id));
        resolve_markers(file, keyring, Ok(false))
    }

    fn mark_license_revoked(&self, license_id: &str) -> Result<(), String> {
        let file = self.license_revocation_path(license_id).and_then(|path| {
            atomic_write(
                &path,
                &serde_json::to_vec(license_id).map_err(|e| e.to_string())?,
            )
        });
        let keyring = Entry::new(
            service(),
            &format!("license-revoked-license-v1:{license_id}"),
        )
        .and_then(|entry| entry.set_password(license_id))
        .map_err(|e| e.to_string());
        file?;
        keyring?;
        Ok(())
    }

    fn is_revoked(&self, device_id: &str) -> Result<bool, String> {
        let file = read_marker_file(&self.revocation_path(device_id)?, device_id);
        let account = format!("license-revoked-v1:{device_id}");
        let current =
            read_keyring_marker(service(), &account).and_then(|id| validate_marker(id, device_id));
        // Preserve already confirmed revocations from the previous implementation.
        let legacy = read_keyring_marker(legacy_revocation_service(), LEGACY_REVOCATION_ACCOUNT)
            .map(|id| id.as_deref() == Some(device_id));
        resolve_markers(file, current, legacy)
    }

    fn mark_revoked(&self, device_id: &str) -> Result<(), String> {
        // Attempt both stores, even if one fails. Neither marker is ever cleared by refresh.
        let file = self.revocation_path(device_id).and_then(|path| {
            atomic_write(
                &path,
                &serde_json::to_vec(device_id).map_err(|e| e.to_string())?,
            )
        });
        let keyring = Entry::new(service(), &format!("license-revoked-v1:{device_id}"))
            .and_then(|entry| entry.set_password(device_id))
            .map_err(|e| e.to_string());
        file?;
        keyring?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_license_files_keep_the_original_key_slot() {
        let record: StoredLicense = serde_json::from_str(
            r#"{"deviceId":"test-device","token":"synthetic","lastObservedAt":1,"refreshAfter":2}"#,
        )
        .unwrap();
        assert_eq!(record.key_slot, None);
    }

    #[test]
    fn marker_files_are_scoped_to_the_expected_identity_and_corruption_is_an_error() {
        let directory = std::env::temp_dir().join(format!("stoa-marker-{}", uuid::Uuid::new_v4()));
        let path = directory.join("revoked-licenses/test.json");
        assert_eq!(read_marker_file(&path, "license-1"), Ok(false));
        atomic_write(&path, br#""license-1""#).unwrap();
        assert_eq!(read_marker_file(&path, "license-1"), Ok(true));
        assert!(read_marker_file(&path, "license-2").is_err());
        atomic_write(&path, b"invalid").unwrap();
        assert!(read_marker_file(&path, "license-1").is_err());
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn confirmed_marker_dominates_errors_but_unknown_state_fails_closed() {
        assert_eq!(
            resolve_markers(Ok(true), Err("keychain locked".into()), Ok(false)),
            Ok(true)
        );
        assert_eq!(
            resolve_markers(Err("file unreadable".into()), Ok(false), Ok(true)),
            Ok(true)
        );
        assert!(resolve_markers(Ok(false), Err("keychain locked".into()), Ok(false)).is_err());
        assert_eq!(resolve_markers(Ok(false), Ok(false), Ok(false)), Ok(false));
    }

    #[test]
    fn atomic_replacement_preserves_complete_record_and_leaves_no_temp_files() {
        let directory = std::env::temp_dir().join(format!("stoa-storage-{}", uuid::Uuid::new_v4()));
        let path = directory.join("license.json");
        atomic_write(&path, b"first").unwrap();
        atomic_write(&path, b"second").unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"second");
        assert_eq!(fs::read_dir(&directory).unwrap().count(), 1);
        fs::remove_dir_all(directory).unwrap();
    }
}
