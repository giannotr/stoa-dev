import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface ValueFramedProps {
	value: ReactNode
	className?: string
}

/** A short code or index in a thin frame, e.g. a page number like "013". */
export function ValueFramed({ value, className }: ValueFramedProps) {
	return (
		<span
			data-slot='value-framed'
			className={cn(
				'inline-flex items-center border-[1.5px] border-current px-2 py-1 font-mono text-xs leading-none tabular-nums',
				className,
			)}
		>
			{value}
		</span>
	)
}
