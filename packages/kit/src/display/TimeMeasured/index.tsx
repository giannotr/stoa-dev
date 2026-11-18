import { cn } from '../../utils/cn'

export type TimeMeasuredProps = {
	/** Unit shown after the figure. Defaults to `H`. */
	unit?: string
	className?: string
} & (
	| { hours?: number; minutes?: number; value?: never }
	| {
			/** Total duration in minutes. */ value: number
			hours?: never
			minutes?: never
	  }
)

const pad = (value: number) => String(value).padStart(2, '0')

/** A large readout of a duration as `HH:MM`, e.g. practice time. */
export function TimeMeasured(props: TimeMeasuredProps) {
	const { unit = 'H', className } = props
	const total = Math.max(
		0,
		Math.round(props.value ?? (props.hours ?? 0) * 60 + (props.minutes ?? 0)),
	)
	const hours = Math.floor(total / 60)
	const minutes = total % 60

	return (
		<p
			data-slot='time-measured'
			className={cn(
				'flex items-start text-7xl font-extralight leading-none tracking-tight tabular-nums',
				className,
			)}
		>
			<time dateTime={`PT${hours}H${minutes}M`}>
				{pad(hours)}:{pad(minutes)}
			</time>
			<span
				data-slot='time-measured-unit'
				className='ml-2 text-sm font-normal tracking-normal text-muted-foreground'
			>
				{unit}
			</span>
		</p>
	)
}
