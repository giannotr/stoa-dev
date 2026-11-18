import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { getRuntimeLocale } from '../../utils/dates'

export interface ProgressBarProps {
	label: ReactNode
	/** Count shown on the right, e.g. the number of items in this state. */
	value?: number
	/** With `value`: progress becomes `value / total`. */
	total?: number
	/** Share from 0 to 1. Shown as a percentage when no `value` is given. */
	progress?: number
	/** Shortcut for a full bar. */
	completed?: boolean
	className?: string
}

function clamp(value: number) {
	return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

/**
 * A captioned progress line: label left, figure right, thin bar below.
 * The share comes from `completed`, `value / total` or `progress`, in this order.
 */
export function ProgressBar({
	label,
	value,
	total,
	progress,
	completed = false,
	className,
}: ProgressBarProps) {
	const share = clamp(
		completed
			? 1
			: value !== undefined && total
				? value / total
				: (progress ?? 0),
	)
	const percent = new Intl.NumberFormat(getRuntimeLocale(), {
		style: 'percent',
		maximumFractionDigits: 0,
	}).format(share)

	return (
		<div data-slot='progress-bar' className={cn('grid gap-2', className)}>
			<div className='flex items-baseline justify-between gap-4'>
				<span
					data-slot='progress-bar-label'
					className='font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'
				>
					{label}
				</span>
				{value !== undefined ? (
					<span
						data-slot='progress-bar-value'
						className='text-2xl font-light tabular-nums'
					>
						{value}
					</span>
				) : (
					<span
						data-slot='progress-bar-value'
						className='font-mono text-[0.6875rem] font-semibold tracking-[0.12em] text-muted-foreground tabular-nums'
					>
						{percent}
					</span>
				)}
			</div>
			<div
				role='progressbar'
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(share * 100)}
				aria-valuetext={percent}
				data-slot='progress-bar-track'
				className='h-[1.5px] rounded-full bg-border'
			>
				<div
					data-slot='progress-bar-fill'
					className='h-full rounded-full bg-foreground transition-[width] duration-300 motion-reduce:transition-none'
					style={{ width: `${share * 100}%` }}
				/>
			</div>
		</div>
	)
}
