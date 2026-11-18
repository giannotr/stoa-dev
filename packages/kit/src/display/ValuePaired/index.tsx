import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface ValuePairedProps {
	left: ReactNode
	right: ReactNode
	className?: string
}

/** Two values joined by a long rule, e.g. weekday —— date. */
export function ValuePaired({ left, right, className }: ValuePairedProps) {
	return (
		<p
			data-slot='value-paired'
			className={cn('flex items-center gap-4 text-sm font-medium', className)}
		>
			{left}
			<span className='sr-only'>, </span>
			<span
				aria-hidden='true'
				data-slot='value-paired-rule'
				className='inline-block h-[1.5px] w-10 shrink-0 rounded-full bg-current'
			/>
			{right}
		</p>
	)
}
