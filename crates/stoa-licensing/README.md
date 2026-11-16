# stoa-licensing

Geräte-gebundene, offline-fähige Lizenzaktivierung für STOA-Tauri-Apps
(Ed25519-signierte Zertifikate, Schlüssel im OS-Keychain, 30 Tage Offline-Toleranz).

## Einbindung

```toml
# src-tauri/Cargo.toml
[features]
licensing = ["dep:stoa-licensing"]

[dependencies]
stoa-licensing = { version = "0.1", optional = true }
```

`build.rs` der App bleibt wie bisher: Er setzt `STOA_APP_ID`, `STOA_LICENSE_SERVER_URL`,
`STOA_LICENSE_PUBLIC_KEY`, `STOA_LICENSE_KEY_ID` und `STOA_STORAGE_SERVICE` per `cargo:rustc-env`.

```rust
// src-tauri/src/lib.rs
#[cfg(feature = "licensing")]
use stoa_licensing as licensing;

pub fn run() {
    #[cfg(feature = "licensing")]
    licensing::configure(licensing::config_from_env!());

    let builder = tauri::Builder::default();
    #[cfg(feature = "licensing")]
    let builder = builder.manage(licensing::LicenseService::default());

    builder
        .invoke_handler(tauri::generate_handler![
            license_config,
            #[cfg(feature = "licensing")] licensing::commands::license_status,
            // license_activate, license_refresh, license_change …
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Schreibende Commands schützen weiterhin mit `licensing::require_write_access(&app, &service)`.

## Sind die Werte geheim?

Nein. App-ID, Server-URL und **öffentlicher** Schlüssel landen ohnehin im ausgelieferten Binary.
Die Sicherheit beruht auf dem privaten Signaturschlüssel, der nur auf dem Lizenzserver liegt.
Sie werden zur Compile-Zeit fixiert, damit das Webview Endpunkt oder Vertrauensanker nicht
austauschen kann.
