import {
	Children,
	createContext,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useContext,
} from 'react'
import { cn } from '../../utils/cn'

type Variant = 'vertical' | 'horizontal'

const ChartContext = createContext<{ max: number; variant: Variant }>({
	max: 1,
	variant: 'vertical',
})

export interface BarChartItemProps {
	label: ReactNode
	value: number
	/** Text for the figure; defaults to the value. */
	display?: ReactNode
}

export interface BarChartProps {
	children: ReactNode
	variant?: Variant
	/** Scale maximum; defaults to the largest item value. */
	max?: number
	/** Accessible name of the chart. */
	label?: string
	className?: string
}

function itemValue(child: ReactNode) {
	return isValidElement(child)
		? Number((child as ReactElement<BarChartItemProps>).props.value) || 0
		: 0
}

/**
 * Bars as firm rounded strokes. `vertical`: columns with figure and label
 * below; `horizontal`: rows with label, bar and figure.
 */
export function BarChart({
	children,
	variant = 'vertical',
	max,
	label,
	className,
}: BarChartProps) {
	const scale = max ?? Math.max(1, ...(Children.map(children, itemValue) ?? []))

	return (
		<ChartContext.Provider value={{ max: scale, variant }}>
			<ul
				data-slot='bar-chart'
				data-variant={variant}
				aria-label={label}
				className={cn(
					variant === 'vertical'
						? 'grid auto-cols-fr grid-flow-col items-end gap-4'
						: 'grid gap-3',
					className,
				)}
			>
				{children}
			</ul>
		</ChartContext.Provider>
	)
}

export function BarChartItem({ label, value, display }: BarChartItemProps) {
	const { max, variant } = useContext(ChartContext)
	const share = Math.min(1, Math.max(0, value / max))
	const figure = display ?? value

	if (variant === 'horizontal')
		return (
			<li
				data-slot='bar-chart-item'
				className='grid grid-cols-[minmax(4rem,auto)_1fr_auto] items-center gap-4'
			>
				<span className='font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
					{label}
				</span>
				<span className='h-1.5 rounded-full bg-border/60'>
					<span
						data-slot='bar-chart-bar'
						className='block h-full rounded-full bg-foreground'
						style={{ width: `${share * 100}%` }}
					/>
				</span>
				<span className='text-lg font-light tabular-nums'>{figure}</span>
			</li>
		)

	return (
		<li data-slot='bar-chart-item' className='grid justify-items-center gap-2'>
			<span className='flex h-28 items-end' aria-hidden='true'>
				<span
					data-slot='bar-chart-bar'
					className='block w-1.5 rounded-full bg-foreground'
					style={{ height: `${share * 100}%` }}
				/>
			</span>
			<span className='text-xl font-light tabular-nums'>{figure}</span>
			<span className='font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
				{label}
			</span>
		</li>
	)
}
