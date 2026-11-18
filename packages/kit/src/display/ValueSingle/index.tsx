import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface ValueSingleProps {
	value: ReactNode
	className?: string
}

/** A single quiet value in the same type as ValuePaired, e.g. the year. */
export function ValueSingle({ value, className }: ValueSingleProps) {
	return (
		<p
			data-slot='value-single'
			className={cn('text-sm font-medium tabular-nums', className)}
		>
			{value}
		</p>
	)
}
