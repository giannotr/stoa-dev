import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface MarginaliaCalloutProps {
	value: ReactNode
	/** Quiet word to the left, e.g. a unit or a source. */
	left?: ReactNode
	/** Quiet word to the right. */
	right?: ReactNode
	className?: string
}

/**
 * A key figure in a frame with a small pointer below, optionally flanked by
 * two quiet words: "APC [342] LDS". The pointer is drawn as lines only, so it
 * sits cleanly on any background.
 */
export function MarginaliaCallout({
	value,
	left,
	right,
	className,
}: MarginaliaCalloutProps) {
	return (
		<div
			data-slot='marginalia-callout'
			className={cn('inline-flex items-center gap-6', className)}
		>
			{left !== undefined && (
				<span className='text-2xl font-normal text-muted-foreground'>
					{left}
				</span>
			)}
			<span className='inline-grid'>
				<span
					data-slot='marginalia-callout-value'
					className='border-[1.5px] border-b-0 border-current px-4 pt-1 text-4xl leading-tight font-medium tabular-nums'
				>
					{value}
				</span>
				<span aria-hidden='true' className='flex items-start'>
					<span className='h-[1.5px] flex-1 bg-current' />
					<svg
						aria-hidden='true'
						viewBox='0 0 16 9'
						className='h-[9px] w-4 shrink-0 overflow-visible'
						fill='none'
						stroke='currentColor'
						strokeWidth='1.5'
					>
						<path d='M0 0.75 L8 8.25 L16 0.75' strokeLinejoin='miter' />
					</svg>
					<span className='h-[1.5px] flex-1 bg-current' />
				</span>
			</span>
			{right !== undefined && (
				<span className='text-2xl font-normal text-muted-foreground'>
					{right}
				</span>
			)}
		</div>
	)
}
