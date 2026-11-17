import type { LicenseState } from '@stoa-dev/kit/licensing'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'

const DAY = 24 * 60 * 60

/** Builds a plausible license state; timestamps are seconds, like the Rust backend. */
export function licenseState(
	status: LicenseState['status'],
	overrides: Partial<LicenseState> = {},
): LicenseState {
	const now = Math.floor(Date.now() / 1000)
	return {
		status,
		plan: status === 'unactivated' ? null : 'annual',
		features: ['all_features'],
		expiresAt: now + 200 * DAY,
		certificateExpiresAt: now + 14 * DAY,
		nextSyncAt: now + DAY,
		deviceId: status === 'unactivated' ? null : 'storybook-device',
		persistencePending: false,
		...overrides,
	}
}

export type TauriMock = {
	/** `false` behaves like an app built without the licensing feature. */
	enabled?: boolean
	license?: LicenseState
	/** Error code thrown by activate/change, e.g. `NETWORK` or `API`. */
	activationError?: string
}

declare global {
	interface Window {
		isTauri?: boolean
	}
}

/** Fakes the licensing commands of the Rust backend for one story. */
export function installTauriMock({
	enabled = true,
	license = licenseState('active'),
	activationError,
}: TauriMock = {}) {
	let current = license
	window.isTauri = true
	mockIPC((cmd) => {
		switch (cmd) {
			case 'license_config':
				return { enabled }
			case 'license_status':
			case 'license_refresh':
				return current
			case 'license_activate':
			case 'license_change':
				if (activationError) throw { code: activationError }
				current = licenseState('active')
				return current
			default:
				throw new Error(`Storybook: unmocked Tauri command "${cmd}"`)
		}
	})
	return () => {
		clearMocks()
		delete window.isTauri
	}
}
