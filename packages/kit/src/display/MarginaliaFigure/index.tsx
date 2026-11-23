import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface MarginaliaFigureProps {
	value: ReactNode
	/** Small reading set above, next to the figure. */
	upper?: ReactNode
	/** Small reading set below it, quieter. */
	lower?: ReactNode
	/** Mono caption above the figure, e.g. "DEAS CNT ×120". */
	label?: ReactNode
	className?: string
}

/** A large figure with two small stacked readings: "329 35/031". */
export function MarginaliaFigure({
	value,
	upper,
	lower,
	label,
	className,
}: MarginaliaFigureProps) {
	return (
		<div
			data-slot='marginalia-figure'
			className={cn('inline-grid gap-1 tabular-nums', className)}
		>
			{label !== undefined && (
				<span className='font-mono text-[0.6875rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase'>
					{label}
				</span>
			)}
			<span className='inline-flex items-center gap-2'>
				<span className='text-5xl leading-none font-medium tracking-tight'>
					{value}
				</span>
				{(upper !== undefined || lower !== undefined) && (
					<span className='grid text-lg leading-tight'>
						<span>{upper}</span>
						<span className='text-muted-foreground'>{lower}</span>
					</span>
				)}
			</span>
		</div>
	)
}
