import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'
import { LicenseActivation } from '../LicenseActivation'
import { useLicense } from '../LicenseProvider'

export interface LicenseGateProps {
	children: ReactNode
	/**
	 * Called when the gate needs direct user input (activation / failure screen),
	 * e.g. to dismiss a startup overlay. Pass a stable callback.
	 */
	onInteractionRequired?: () => void
}

export function LicenseGate({
	children,
	onInteractionRequired,
}: LicenseGateProps) {
	const { t } = useTranslation(STOA_NS)
	const { license, enabled, loading, reload, refresh, refreshing, error } =
		useLicense()
	const [readOnlyActivation, setReadOnlyActivation] = useState<string | null>(
		null,
	)
	const activationIdentity = license
		? `${license.status}:${license.deviceId}`
		: ''
	const needsActivation =
		license?.status === 'activation_required' ||
		(license?.status === 'invalid' && license.deviceId !== null)
	const showActivation =
		needsActivation && readOnlyActivation !== activationIdentity

	useEffect(() => {
		// Activation and failure screens need immediate user input, not a loading overlay.
		if (
			!loading &&
			enabled &&
			(!license || license.status === 'unactivated' || showActivation)
		) {
			onInteractionRequired?.()
		}
	}, [loading, enabled, license, showActivation, onInteractionRequired])

	if (loading) {
		return null
	}

	if (!enabled) return <>{children}</>

	if (!license) {
		return (
			<div>
				{t('licensing.gate.failed')}
				<Button onClick={() => void reload().catch(() => {})}>
					{t('licensing.checkAgain')}
				</Button>
			</div>
		)
	}

	if (license.status === 'unactivated') {
		return (
			<LicenseActivation onActivated={() => void reload().catch(() => {})} />
		)
	}

	if (showActivation) {
		return (
			<main className='app-shell flex min-h-screen flex-col items-center justify-center p-6'>
				<p
					role='status'
					className='max-w-md text-center text-sm text-muted-foreground'
				>
					{t('licensing.gate.activationRequired')}
				</p>
				<div className='w-full max-w-md py-8'>
					<LicenseActivation
						replacement
						onActivated={() => {
							setReadOnlyActivation(null)
							void reload().catch(() => {})
						}}
					/>
				</div>
				{error && (
					<p role='alert' className='max-w-md text-center text-sm'>
						{error}
					</p>
				)}
				<Button
					variant='outline'
					disabled={refreshing}
					onClick={() => void refresh().catch(() => {})}
				>
					{t(refreshing ? 'licensing.checking' : 'licensing.checkAgain')}
				</Button>
				<Button
					variant='ghost'
					disabled={refreshing}
					onClick={() => setReadOnlyActivation(activationIdentity)}
				>
					{t('licensing.gate.readOnly')}
				</Button>
			</main>
		)
	}

	return <>{children}</>
}
