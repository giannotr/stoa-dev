import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface MarginaliaStackProps {
	/** Short identifier before the value, e.g. "LF". */
	label?: ReactNode
	value: ReactNode
	/** Small readings below, one per line, e.g. ["STL 275", "153° / 32"]. */
	lines?: readonly ReactNode[]
	/** Left for the left margin, right for the right one. */
	align?: 'start' | 'end'
	className?: string
}

/** A corner reading: identifier and value large, small readings below. */
export function MarginaliaStack({
	label,
	value,
	lines = [],
	align = 'start',
	className,
}: MarginaliaStackProps) {
	return (
		<div
			data-slot='marginalia-stack'
			data-align={align}
			className={cn(
				'inline-grid gap-0.5 tabular-nums',
				align === 'end'
					? 'justify-items-end text-right'
					: 'justify-items-start',
				className,
			)}
		>
			<span className='text-2xl leading-tight font-medium'>
				{label !== undefined && <>{label} </>}
				{value}
			</span>
			{lines.map((line, index) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: static readings
					key={index}
					className='text-sm text-muted-foreground'
				>
					{line}
				</span>
			))}
		</div>
	)
}
