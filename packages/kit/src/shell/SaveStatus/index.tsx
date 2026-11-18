import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'
import { cn } from '../../utils/cn'
import type { VisibleSaveStatus } from '../../utils/saveFeedback'

export interface SaveStatusProps {
	status: VisibleSaveStatus
	/** Replaces the status text, e.g. a validation hint. Shown as an alert. */
	message?: ReactNode
	/** Shows a retry button next to an error. */
	onRetry?: () => void
	/** Floating pill at the bottom centre (default) or inline text. */
	floating?: boolean
	className?: string
}

/** Autosave feedback: "Saving …", "Changes saved" or an error with retry. */
export function SaveStatus({
	status,
	message,
	onRetry,
	floating = true,
	className,
}: SaveStatusProps) {
	const { t } = useTranslation(STOA_NS)
	if (!status && !message) return null
	const alert = Boolean(message) || status === 'error'

	const content = (
		<div
			data-slot='save-status'
			data-status={status ?? undefined}
			className={cn(
				'flex items-center gap-2 text-xs text-muted-foreground',
				!floating && className,
			)}
		>
			<span
				role={alert ? 'alert' : 'status'}
				aria-live='polite'
				className={cn(status === 'error' && !message && 'text-destructive')}
			>
				{message ?? (status ? t(`autosave.${status}`) : null)}
			</span>
			{status === 'error' && onRetry && (
				<Button size='sm' variant='ghost' onClick={onRetry}>
					{t('actions.retry')}
				</Button>
			)}
		</div>
	)

	if (!floating) return content
	return (
		<div
			className={cn(
				'fixed bottom-5 left-1/2 z-50 isolate max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full px-4 py-2',
				className,
			)}
		>
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0 -z-10 rounded-full bg-background/25 shadow-sm backdrop-blur-xs'
			/>
			{content}
		</div>
	)
}
