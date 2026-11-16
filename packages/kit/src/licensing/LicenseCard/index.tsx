import { ChevronRight, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import type { LicenseStatus } from '../api'
import { useLicense } from '../LicenseProvider'

const statusStyles: Record<LicenseStatus, string> = {
	active:
		'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
	offline_grace:
		'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300',
	expired:
		'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
	revoked: 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300',
	license_revoked:
		'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300',
	unactivated: 'border-border bg-muted/30 text-muted-foreground',
	activation_required:
		'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
	invalid: 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300',
}

export function LicenseCard() {
	const { license, loading, refreshing, refresh, error } = useLicense()
	const { t, i18n } = useTranslation(STOA_NS)
	const [synchronized, setSynchronized] = useState(false)
	const status = license?.status ?? 'invalid'
	const locallyValid = status === 'active' || status === 'offline_grace'
	const StatusIcon = locallyValid ? ShieldCheck : ShieldAlert

	function formatDate(timestamp: number | null | undefined) {
		if (timestamp == null || !Number.isFinite(timestamp))
			return t('licenseProfile.unknown')
		const date = new Date(timestamp * 1000)
		if (!Number.isFinite(date.getTime())) return t('licenseProfile.unknown')
		return new Intl.DateTimeFormat(i18n.resolvedLanguage || 'de', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(date)
	}

	async function synchronize() {
		setSynchronized(false)
		try {
			await refresh()
			setSynchronized(true)
		} catch {
			// The shared provider exposes the error and keeps Rust's current license state.
		}
	}

	const nextSync = license?.nextSyncAt
	const certificateExpiry = license?.certificateExpiresAt ?? license?.expiresAt

	return (
		<Card
			className='mb-4'
			role='region'
			aria-labelledby='profile-license-title'
		>
			<CardHeader>
				<div className='flex flex-wrap items-center justify-between gap-3'>
					<CardTitle id='profile-license-title'>
						{t('licenseProfile.title')}
					</CardTitle>

					<span
						className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[status]}`}
					>
						<StatusIcon className='size-4' aria-hidden='true' />
						{loading
							? t('licenseProfile.checking')
							: t(`licenseProfile.status.${status}.label`)}
					</span>
				</div>
			</CardHeader>

			<CardContent className='grid gap-5'>
				<p className='text-xs text-muted-foreground'>
					{loading
						? t('licenseProfile.checking')
						: t(`licenseProfile.status.${status}.description`)}
				</p>

				<dl className='grid gap-4 sm:grid-cols-2'>
					<div className='min-w-0 space-y-1'>
						<dt className='text-xs text-muted-foreground'>
							{t('licenseProfile.plan')}
						</dt>
						<dd className='wrap-break-word font-medium'>
							{license?.plan
								? t(`licenseProfile.plans.${license.plan}`, {
										defaultValue: license.plan,
									})
								: t('licenseProfile.unknown')}
						</dd>
					</div>

					<div className='min-w-0 space-y-1'>
						<dt className='text-xs text-muted-foreground'>
							{t('licenseProfile.licenseTerm')}
						</dt>
						<dd>{t('licenseProfile.termUnknown')}</dd>
					</div>

					<div className='min-w-0 space-y-1'>
						<dt className='text-xs text-muted-foreground'>
							{t('licenseProfile.certificateExpires')}
						</dt>
						<dd>{formatDate(certificateExpiry)}</dd>
					</div>

					<div className='min-w-0 space-y-1'>
						<dt className='text-xs text-muted-foreground'>
							{t('licenseProfile.nextSync')}
						</dt>

						<dd>
							{nextSync != null
								? nextSync <= Date.now() / 1000
									? t('licenseProfile.syncDue', {
											date: formatDate(nextSync),
										})
									: formatDate(nextSync)
								: t('licenseProfile.noSyncScheduled')}
						</dd>
					</div>

					<div className='space-y-2 sm:col-span-2'>
						<dt className='text-xs text-muted-foreground'>
							{t('licenseProfile.features')}
						</dt>

						<dd>
							{license?.features.length ? (
								<ul className='flex flex-wrap gap-2'>
									{[...new Set(license.features)].map((feature) => (
										<li
											key={feature}
											className='max-w-full break-all rounded-md border px-2 py-1 text-xs'
										>
											{t(`licenseProfile.featureLabels.${feature}`, {
												defaultValue: feature,
											})}
										</li>
									))}
								</ul>
							) : (
								t('licenseProfile.noFeatures')
							)}
						</dd>
					</div>
				</dl>

				<p className='rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground'>
					{t('licenseProfile.validityHint')}
				</p>

				<div className='flex flex-wrap items-center gap-3'>
					<Button
						type='button'
						variant='outline'
						disabled={
							loading || refreshing || !license || status === 'unactivated'
						}
						onClick={() => void synchronize()}
					>
						<RefreshCw
							aria-hidden='true'
							className={
								refreshing
									? 'animate-spin motion-reduce:animate-none'
									: undefined
							}
						/>
						{t(
							refreshing
								? 'licenseProfile.syncing'
								: 'licenseProfile.synchronize',
						)}
					</Button>
					{synchronized && !error && (
						<p role='status' className='text-xs text-muted-foreground'>
							{t('licenseProfile.synchronized')}
						</p>
					)}
				</div>

				{error && (
					<p role='alert' className='wrap-break-word text-sm text-destructive'>
						{error}
					</p>
				)}
				{license?.persistencePending && (
					<p role='alert' className='text-sm text-destructive'>
						{t('licenseProfile.persistencePending')}
					</p>
				)}

				<details className='group mt-1 border-t pt-5'>
					<summary className='flex w-fit cursor-pointer list-none items-center gap-2 rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden'>
						<ChevronRight
							aria-hidden='true'
							className='size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none'
						/>
						{t('licenseProfile.deviceDetails')}
					</summary>

					<div className='mt-3 grid gap-3'>
						<p className='text-xs text-muted-foreground'>
							{t('licenseProfile.deviceId')}
						</p>

						<code className='block select-all break-all rounded-md bg-muted/30 p-3 text-xs'>
							{license?.deviceId ?? t('licenseProfile.noDevice')}
						</code>

						<p className='text-xs text-muted-foreground'>
							{t('licenseProfile.deviceReleaseHint')}
						</p>
					</div>
				</details>
			</CardContent>
		</Card>
	)
}
