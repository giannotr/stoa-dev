import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface MarginaliaPairProps {
	left: ReactNode
	right: ReactNode
	className?: string
}

/** Margin note of two values joined by a long rule, e.g. weekday —— date. */
export function MarginaliaPair({
	left,
	right,
	className,
}: MarginaliaPairProps) {
	return (
		<p
			data-slot='marginalia-pair'
			className={cn('flex items-center gap-4 text-sm font-medium', className)}
		>
			{left}
			<span className='sr-only'>, </span>
			<span
				aria-hidden='true'
				data-slot='marginalia-pair-rule'
				className='inline-block h-[1.5px] w-10 shrink-0 rounded-full bg-current'
			/>
			{right}
		</p>
	)
}
