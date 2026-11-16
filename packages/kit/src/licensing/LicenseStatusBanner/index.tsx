import { RefreshCw, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '../../ui/dialog'
import { cn } from '../../utils/cn'
import { LicenseActivation } from '../LicenseActivation'
import { useLicense } from '../LicenseProvider'

export function LicenseStatusBanner({ className }: { className?: string }) {
	const { t } = useTranslation(STOA_NS)
	const { license, canWrite, refresh, refreshing, error } = useLicense()
	const [changeOpen, setChangeOpen] = useState(false)
	if (!license) return null

	const pending = license.persistencePending
	const needsAttention = !canWrite || !!error || pending
	const canRefresh =
		!!error ||
		pending ||
		license.status === 'activation_required' ||
		license.status === 'invalid'
	const canChange = [
		'revoked',
		'license_revoked',
		'expired',
		'activation_required',
		'invalid',
	].includes(license.status)
	if (!needsAttention) return null

	const title =
		license.status === 'activation_required'
			? t('licenseProfile.status.activation_required.label')
			: license.status === 'license_revoked'
				? t('licenseProfile.status.license_revoked.label')
				: license.status === 'revoked'
					? t('licenseProfile.status.revoked.label')
					: license.status === 'expired'
						? t('licenseProfile.status.expired.label')
						: !canWrite
							? t('licensing.banner.readOnlyTitle')
							: t('licensing.banner.refreshFailed')

	const action = canRefresh ? (
		<Button
			type='button'
			variant='outline'
			size='sm'
			disabled={refreshing}
			className='w-full shrink-0 sm:w-auto'
			onClick={() => {
				void refresh().catch(() => {})
			}}
		>
			<RefreshCw
				aria-hidden='true'
				className={refreshing ? 'animate-spin' : undefined}
			/>
			{refreshing
				? t('licensing.checking')
				: pending
					? t('licensing.banner.retryStorage')
					: t('licensing.checkAgain')}
		</Button>
	) : null

	return (
		<div
			className={cn('relative z-10 shrink-0 pb-4', className)}
			style={{ top: '-10px' }}
		>
			<section
				role='status'
				aria-live='polite'
				aria-atomic='true'
				aria-labelledby='license-status-title'
				className='mx-auto flex max-w-6xl flex-col gap-4 rounded-lg border bg-amber-50 p-4 text-black sm:flex-row sm:items-start sm:justify-between dark:bg-amber-500'
			>
				<div className='flex min-w-0 items-start gap-3'>
					<ShieldAlert aria-hidden='true' className='mt-0.5 size-5 shrink-0' />
					<div className='min-w-0 space-y-1 text-sm'>
						<h2 id='license-status-title' className='font-semibold'>
							{title}
						</h2>

						{!canWrite && <p>{t('licensing.banner.readOnlyDescription')}</p>}

						{error && <p className='wrap-break-word'>{error}</p>}

						{pending && <p>{t('licensing.banner.persistencePending')}</p>}
					</div>
				</div>

				<div className='flex shrink-0 flex-col gap-2'>
					{canChange && (
						<Button
							type='button'
							size='sm'
							disabled={refreshing || pending}
							onClick={() => setChangeOpen(true)}
						>
							{t('licensing.activation.renew')}
						</Button>
					)}
					{action}
				</div>
			</section>

			<Dialog
				open={changeOpen}
				onOpenChange={(open) => {
					if (!refreshing) setChangeOpen(open)
				}}
			>
				<DialogContent
					showCloseButton={!refreshing}
					onEscapeKeyDown={(event) => {
						if (refreshing) event.preventDefault()
					}}
					onInteractOutside={(event) => {
						if (refreshing) event.preventDefault()
					}}
				>
					<DialogTitle className='sr-only'>
						{t('licensing.activation.renew')}
					</DialogTitle>

					<DialogDescription className='sr-only'>
						{t('licensing.activation.replacementNotice')}
					</DialogDescription>

					<LicenseActivation
						replacement
						onActivated={() => setChangeOpen(false)}
					/>

					<Button
						type='button'
						variant='ghost'
						disabled={refreshing}
						onClick={() => setChangeOpen(false)}
					>
						{t('actions.cancel')}
					</Button>
				</DialogContent>
			</Dialog>
		</div>
	)
}
