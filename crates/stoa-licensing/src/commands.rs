use super::{error::LicenseError, service::LicenseService, LicenseState};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn license_status(
    app: AppHandle,
    service: State<'_, LicenseService>,
) -> Result<LicenseState, LicenseError> {
    service.status(&app)
}

#[tauri::command]
pub async fn license_activate(
    app: AppHandle,
    service: State<'_, LicenseService>,
    code: String,
    device_name: String,
) -> Result<LicenseState, LicenseError> {
    service.activate(&app, &code, &device_name).await
}

#[tauri::command]
pub async fn license_refresh(
    app: AppHandle,
    service: State<'_, LicenseService>,
) -> Result<LicenseState, LicenseError> {
    service.refresh(&app).await
}

#[tauri::command]
pub async fn license_change(
    app: AppHandle,
    service: State<'_, LicenseService>,
    code: String,
    device_name: String,
) -> Result<LicenseState, LicenseError> {
    service.change_license(&app, &code, &device_name).await
}
