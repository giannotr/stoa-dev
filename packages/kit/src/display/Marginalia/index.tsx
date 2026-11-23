import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface MarginaliaProps {
	value: ReactNode
	/**
	 * Optional unit after the value, smaller and muted: text such as "km" or
	 * "%", or an icon (sized to the unit text).
	 */
	unit?: ReactNode
	/**
	 * Spoken name of the unit for screen readers, e.g. "Grad". Needed for an
	 * icon unit; for a text unit it replaces the visible text.
	 */
	unitLabel?: string
	className?: string
}

/** A single margin note in the same type as MarginaliaPair, e.g. the year. */
export function Marginalia({
	value,
	unit,
	unitLabel,
	className,
}: MarginaliaProps) {
	const hasUnit = unit !== undefined && unit !== null && unit !== false
	return (
		<p
			data-slot='marginalia'
			className={cn(
				'text-sm font-medium tabular-nums',
				hasUnit && 'inline-flex items-baseline gap-[0.2em]',
				className,
			)}
		>
			{value}
			{hasUnit && (
				<>
					<span
						data-slot='marginalia-unit'
						aria-hidden={unitLabel !== undefined ? 'true' : undefined}
						className='inline-flex items-center self-baseline text-[0.7em] font-normal text-muted-foreground [&_svg]:size-[1em] [&_svg]:shrink-0'
					>
						{unit}
					</span>
					{unitLabel !== undefined && (
						<span className='sr-only'> {unitLabel}</span>
					)}
				</>
			)}
		</p>
	)
}
