import { invoke, isTauri } from '@tauri-apps/api/core'
import i18next from 'i18next'
import { STOA_NS } from '../i18n/namespace'

export type LicenseStatus =
	| 'unactivated'
	| 'activation_required'
	| 'active'
	| 'offline_grace'
	| 'expired'
	| 'revoked'
	| 'license_revoked'
	| 'invalid'

export interface LicenseState {
	status: LicenseStatus
	plan: string | null
	features: string[]
	expiresAt: number | null
	/** Signed offline certificate expiry; does not indicate the purchased license term. */
	certificateExpiresAt: number | null
	nextSyncAt: number | null
	deviceId: string | null
	persistencePending: boolean
}

/** UI hint only; Rust verifies the signed license before protected operations. */
export function allowsLicenseFeature(
	license: LicenseState | null,
	feature: string,
): boolean {
	return (
		(license?.status === 'active' || license?.status === 'offline_grace') &&
		(license.features.includes('all_features') ||
			license.features.includes(feature))
	)
}

export function getLicenseStatus() {
	return invoke<LicenseState>('license_status')
}

export function activateLicense(code: string, deviceName: string) {
	return invoke<LicenseState>('license_activate', {
		code,
		deviceName,
	})
}

export function changeLicense(code: string, deviceName: string) {
	return invoke<LicenseState>('license_change', { code, deviceName })
}

export function refreshLicense() {
	return invoke<LicenseState>('license_refresh')
}

export interface LicenseError {
	code: string
	detail?: unknown
}

export function licenseErrorKey(error: unknown): string {
	const code =
		typeof error === 'object' && error !== null && 'code' in error
			? error.code
			: typeof error === 'string'
				? error
				: null
	const keys: Record<string, string> = {
		ACTIVATION_REQUIRED: 'activationRequired',
		NETWORK: 'network',
		REVOKED: 'deviceRevoked',
		LICENSE_REVOKED: 'licenseRevoked',
		STORAGE: 'storage',
		CERTIFICATE: 'certificate',
		ALREADY_ACTIVATED: 'alreadyActivated',
		API: 'api',
		PROTOCOL: 'protocol',
		UNACTIVATED: 'unactivated',
		STATE_CHANGED: 'stateChanged',
		SYNCHRONIZATION: 'synchronization',
		LICENSE_READ_ONLY: 'readOnly',
		LICENSE_FEATURE_DENIED: 'featureDenied',
	}
	return `licensing.errors.${typeof code === 'string' && Object.getOwnPropertyDescriptor(keys, code) !== undefined ? keys[code] : 'unknown'}`
}

export function licenseErrorMessage(
	error: unknown,
	translate: (key: string) => string = (key) => i18next.t(key, { ns: STOA_NS }),
): string {
	return translate(licenseErrorKey(error))
}

export async function getLicenseConfig(): Promise<{ enabled: boolean }> {
	return isTauri() ? invoke('license_config') : { enabled: false }
}
