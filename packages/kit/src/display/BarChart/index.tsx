'use client'

import {
	Children,
	createContext,
	Fragment,
	isValidElement,
	type ReactNode,
	useContext,
	useId,
} from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { cn } from '../../utils/cn'

type Variant = 'vertical' | 'horizontal'

const ChartContext = createContext<{
	max: number
	variant: Variant
	formatValue?: (value: number) => string
}>({
	max: 1,
	variant: 'vertical',
})

export interface BarChartItemProps {
	label: ReactNode
	value: number
	/** Text for the figure; defaults to the value. */
	display?: ReactNode
}

export interface BarChartSegment {
	/** Unique within the item. */
	id: string
	label: string
	value: number
	/** Theme classes that color the segment. */
	className?: string
}

export interface BarChartStackedItemProps {
	/** Presentational content for the visible category label. */
	label: ReactNode
	/** Presentational override for the visible total. */
	display?: ReactNode
	segments: readonly BarChartSegment[]
	value?: never
	totalLabel: string
	/** Full category name for the trigger and details, e.g. November 2026. */
	detailLabel?: string
}

type ItemProps =
	| (BarChartItemProps & { segments?: never })
	| BarChartStackedItemProps

export interface BarChartProps {
	children: ReactNode
	variant?: Variant
	/** Scale maximum; defaults to the largest item value. */
	max?: number
	/** Accessible name of the chart. */
	label?: string
	className?: string
	/** Formats visible figures, accessible totals and segment details. */
	formatValue?: (value: number) => string
}

const categoryClass =
	'font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'

function segmentValue({ value }: BarChartSegment) {
	return Number.isFinite(value) && value > 0 ? value : 0
}

function stackTotal(segments: readonly BarChartSegment[]) {
	return segments.reduce((total, segment) => total + segmentValue(segment), 0)
}

function itemValue(child: ReactNode) {
	if (!isValidElement<Partial<ItemProps>>(child)) return 0
	const { value, segments } = child.props
	if (child.type === BarChartItem && segments !== undefined)
		return stackTotal(segments)
	return Number(value) || 0
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
	formatValue,
}: BarChartProps) {
	const scale =
		max !== undefined && Number.isFinite(max) && max > 0
			? max
			: Math.max(1, ...(Children.map(children, itemValue) ?? []))

	return (
		<ChartContext.Provider value={{ max: scale, variant, formatValue }}>
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

export function BarChartItem(props: ItemProps) {
	if (props.segments !== undefined) return <StackedBarChartItem {...props} />
	return <SimpleBarChartItem {...props} />
}

function SimpleBarChartItem({ label, value, display }: BarChartItemProps) {
	const { max, variant, formatValue } = useContext(ChartContext)
	const share = Math.min(1, Math.max(0, value / max))
	const figure = display ?? formatValue?.(value) ?? value

	if (variant === 'horizontal')
		return (
			<li
				data-slot='bar-chart-item'
				className='grid grid-cols-[minmax(4rem,auto)_1fr_auto] items-center gap-4'
			>
				<span className={categoryClass}>{label}</span>
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
			<span className={categoryClass}>{label}</span>
		</li>
	)
}

function StackedBarChartItem({
	label,
	display,
	segments,
	totalLabel,
	detailLabel,
}: BarChartStackedItemProps) {
	const { max, variant, formatValue = String } = useContext(ChartContext)
	const id = useId()
	const total = stackTotal(segments)
	const formattedTotal = formatValue(total)
	const share = Math.min(1, total / max)
	const horizontal = variant === 'horizontal'
	const categoryId = `${id}-category`
	const totalId = `${id}-total`
	const titleId = `${id}-title`

	return (
		<li data-slot='bar-chart-item' className='@container min-w-0'>
			<Popover>
				<PopoverTrigger asChild>
					<button
						type='button'
						aria-labelledby={`${categoryId} ${totalId}`}
						className={cn(
							'grid min-h-11 w-full min-w-0 cursor-pointer rounded-md p-1 text-start hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
							horizontal
								? 'grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 @md:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto]'
								: 'justify-items-center gap-2 text-center',
						)}
					>
						{detailLabel !== undefined && (
							<span id={categoryId} className='sr-only'>
								{detailLabel}
							</span>
						)}
						<span
							id={detailLabel === undefined ? categoryId : undefined}
							className={cn(
								categoryClass,
								'min-w-0 wrap-anywhere',
								!horizontal && 'order-3',
							)}
						>
							{label}
						</span>
						<span
							aria-hidden='true'
							className={cn(
								'flex rounded-full bg-muted',
								horizontal
									? 'col-span-2 col-start-1 row-start-2 h-3 @md:col-span-1 @md:col-start-2 @md:row-start-1'
									: 'order-1 h-28 w-3 items-end',
							)}
						>
							<span
								data-slot='bar-chart-bar'
								className={cn(
									'flex overflow-hidden rounded-full',
									horizontal ? 'h-full' : 'w-full flex-col-reverse',
								)}
								style={
									horizontal
										? { width: `${share * 100}%` }
										: { height: `${share * 100}%` }
								}
							>
								{segments.map((segment) => (
									<span
										key={segment.id}
										data-slot='bar-chart-segment'
										className={cn(
											'min-h-0 min-w-0 flex-none bg-foreground',
											segment.className,
										)}
										style={{
											flexBasis: `${total ? (segmentValue(segment) / total) * 100 : 0}%`,
										}}
									/>
								))}
							</span>
						</span>
						<span
							aria-hidden='true'
							className={cn(
								'min-w-0 wrap-anywhere font-light tabular-nums',
								horizontal
									? 'col-start-2 row-start-1 max-w-[45cqw] text-end text-lg @md:col-start-3'
									: 'order-2 text-xl',
							)}
						>
							{display ?? formattedTotal}
						</span>
						<span id={totalId} className='sr-only'>
							{formattedTotal}
						</span>
					</button>
				</PopoverTrigger>
				<PopoverContent
					aria-labelledby={titleId}
					collisionPadding={8}
					className='max-h-(--radix-popover-content-available-height) max-w-(--radix-popover-content-available-width) overflow-auto'
				>
					<div id={titleId} className='font-heading font-semibold wrap-anywhere'>
						{detailLabel ?? label}
					</div>
					<dl className='grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-x-4 gap-y-1 wrap-anywhere'>
						<dt className='font-medium'>{totalLabel}</dt>
						<dd className='text-end font-medium tabular-nums'>
							{formattedTotal}
						</dd>
						{segments.map((segment) => (
							<Fragment key={segment.id}>
								<dt>{segment.label}</dt>
								<dd className='text-end tabular-nums'>
									{formatValue(segmentValue(segment))}
								</dd>
							</Fragment>
						))}
					</dl>
				</PopoverContent>
			</Popover>
		</li>
	)
}
