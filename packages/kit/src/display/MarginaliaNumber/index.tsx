import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface MarginaliaNumberProps {
	value: ReactNode
	/** Mark in front of the value, shown in the app accent. */
	prefix?: string
	className?: string
}

/** A number with an accent mark, e.g. "#42" for an entry or an issue. */
export function MarginaliaNumber({
	value,
	prefix = '#',
	className,
}: MarginaliaNumberProps) {
	return (
		<span
			data-slot='marginalia-number'
			className={cn(
				'inline-flex items-baseline text-sm font-medium tabular-nums',
				className,
			)}
		>
			<span
				aria-hidden='true'
				data-slot='marginalia-number-prefix'
				className='mr-[0.08em] text-accent'
			>
				{prefix}
			</span>
			{value}
		</span>
	)
}
