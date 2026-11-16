import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import {
	allowsLicenseFeature,
	changeLicense,
	getLicenseConfig,
	getLicenseStatus,
	type LicenseState,
	licenseErrorMessage,
	refreshLicense,
} from '../api'

type LicenseContextValue = {
	license: LicenseState | null
	enabled: boolean
	loading: boolean
	canWrite: boolean
	hasFeature: (feature: string) => boolean
	refreshing: boolean
	error: string | null
	reload: () => Promise<void>
	refresh: () => Promise<void>
	change: (code: string, deviceName: string) => Promise<LicenseState>
}
const LicenseContext = createContext<LicenseContextValue | null>(null)

export function LicenseProvider({ children }: { children: ReactNode }) {
	const [license, setLicense] = useState<LicenseState | null>(null)
	const [loading, setLoading] = useState(true)
	const [enabled, setEnabled] = useState(true)
	const licensingEnabled = useRef<boolean | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [errorCause, setError] = useState<unknown>(null)
	const { t } = useTranslation(STOA_NS)
	const error = errorCause === null ? null : licenseErrorMessage(errorCause, t)
	const mounted = useRef(false)
	const pending = useRef<Promise<void> | null>(null)
	const forceRefresh = useRef(false)

	// Status checks, focus events and manual refreshes share a single operation.
	const check = useCallback((force: boolean): Promise<void> => {
		forceRefresh.current ||= force
		if (pending.current) return pending.current
		const operation = (async () => {
			const readLocal = async () => {
				try {
					return await getLicenseStatus()
				} catch (error) {
					if (mounted.current)
						setLicense((previous) =>
							previous
								? {
										...previous,
										status: 'invalid',
										features: [],
										nextSyncAt: null,
									}
								: {
										status: 'invalid',
										plan: null,
										features: [],
										expiresAt: null,
										certificateExpiresAt: null,
										nextSyncAt: null,
										deviceId: null,
										persistencePending: false,
									},
						)
					throw error
				}
			}
			try {
				if (licensingEnabled.current === null) {
					licensingEnabled.current = (await getLicenseConfig()).enabled
					if (mounted.current) setEnabled(licensingEnabled.current)
				}
				if (!licensingEnabled.current) {
					if (mounted.current) {
						setLicense(null)
						setError(null)
					}
					return
				}
				const local = await readLocal()
				if (mounted.current) setLicense(local)
				const shouldRefresh =
					forceRefresh.current ||
					local.persistencePending ||
					local.status === 'offline_grace' ||
					local.status === 'expired'
				forceRefresh.current = false
				if (shouldRefresh && local.status !== 'unactivated') {
					if (mounted.current) setRefreshing(true)
					try {
						const updated = await refreshLicense()
						if (mounted.current) setLicense(updated)
					} catch (error) {
						// In particular, retrieve the process-level revocation latch after a storage error.
						const current = await readLocal()
						if (mounted.current) setLicense(current)
						throw error
					}
				}
				if (mounted.current) setError(null)
			} catch (error) {
				if (mounted.current) setError(error)
				// The backend remains authoritative; a refresh failure never extends validity.
				throw error
			} finally {
				pending.current = null
				forceRefresh.current = false
				if (mounted.current) {
					setLoading(false)
					setRefreshing(false)
				}
			}
		})()
		pending.current = operation
		return operation
	}, [])

	const reload = useCallback(() => check(false), [check])
	const refresh = useCallback(() => check(true), [check])
	const change = useCallback(
		async (code: string, deviceName: string): Promise<LicenseState> => {
			// Finish any status/refresh operation before switching; polling then shares this operation.
			if (pending.current) await pending.current.catch(() => {})
			const operation = (async () => {
				if (mounted.current) setRefreshing(true)
				try {
					const updated = await changeLicense(code, deviceName)
					if (mounted.current) {
						setLicense(updated)
						setError(null)
					}
					return updated
				} catch (error) {
					try {
						const current = await getLicenseStatus()
						if (mounted.current) setLicense(current)
					} catch {
						if (mounted.current)
							setLicense((previous) =>
								previous
									? {
											...previous,
											status: 'invalid',
											features: [],
											nextSyncAt: null,
										}
									: null,
							)
					}
					if (mounted.current) setError(error)
					throw error
				} finally {
					pending.current = null
					forceRefresh.current = false
					if (mounted.current) setRefreshing(false)
				}
			})()
			pending.current = operation.then(
				() => {},
				() => {},
			)
			return operation
		},
		[],
	)

	const canWrite =
		!loading &&
		(!enabled ||
			license?.status === 'active' ||
			license?.status === 'offline_grace')
	const hasFeature = (feature: string) =>
		!loading && (!enabled || allowsLicenseFeature(license, feature))
	useEffect(() => {
		mounted.current = true
		const run = () => {
			void check(false).catch(() => {})
		}
		// Check the server on every app start, even while the local certificate is active.
		// loading stays true until this finishes; concurrent checks share pending.current.
		void check(true).catch(() => {})
		const interval = window.setInterval(run, 60_000)
		window.addEventListener('focus', run)
		return () => {
			mounted.current = false
			window.clearInterval(interval)
			window.removeEventListener('focus', run)
		}
	}, [check])

	return (
		<LicenseContext.Provider
			value={{
				license,
				enabled,
				loading,
				canWrite,
				hasFeature,
				refreshing,
				error,
				reload,
				refresh,
				change,
			}}
		>
			{children}
		</LicenseContext.Provider>
	)
}

export function useLicense() {
	const context = useContext(LicenseContext)
	if (!context) throw new Error('LicenseProvider is missing')
	return context
}
