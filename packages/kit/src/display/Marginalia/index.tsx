import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface MarginaliaProps {
	value: ReactNode
	className?: string
}

/** A single margin note in the same type as MarginaliaPair, e.g. the year. */
export function Marginalia({ value, className }: MarginaliaProps) {
	return (
		<p
			data-slot='marginalia'
			className={cn('text-sm font-medium tabular-nums', className)}
		>
			{value}
		</p>
	)
}
