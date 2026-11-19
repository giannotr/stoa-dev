import * as React from 'react'

import { cn } from '../../utils/cn'

type CardProps = React.ComponentProps<'div'> & {
	size?: 'default' | 'sm'
	clickable?: boolean
	/** Primary action of a clickable card. */
	action?: () => void
	/** Decorative affordance for the primary action. */
	actionIcon?: React.ReactNode
	/** On hover-capable devices, also reveal a hover-only icon during keyboard focus. */
	actionIconVisibility?: 'hoverOnly' | 'always'
}

const interactiveCardContent =
	'a[href], button, input, select, textarea, summary, label, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"], [tabindex]'

function Card({
	className,
	size = 'default',
	clickable = false,
	action,
	actionIcon,
	actionIconVisibility = 'hoverOnly',
	children,
	id,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	onClick,
	...props
}: CardProps) {
	const generatedId = React.useId()
	const hasTrigger = clickable && Boolean(action || onClick)
	const cardId = id ?? (hasTrigger ? generatedId : undefined)
	const hasIcon = clickable && actionIcon != null && actionIcon !== false

	function handleClick(event: React.MouseEvent<HTMLDivElement>) {
		const { target, currentTarget } = event
		if (
			!(target instanceof Element) ||
			target.closest('[data-slot="card"]') !== currentTarget
		)
			return

		const control = target.closest(interactiveCardContent)
		if (
			control &&
			control !== currentTarget &&
			currentTarget.contains(control) &&
			control.getAttribute('data-slot') !== 'card-trigger'
		)
			return

		onClick?.(event)
		if (!event.defaultPrevented) action?.()
	}

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: The native card trigger handles keyboard activation. The card delegates pointer clicks on its surface.
		<div
			id={cardId}
			data-slot='card'
			data-size={size}
			data-clickable={clickable ? 'true' : undefined}
			{...(!hasTrigger && {
				'aria-label': ariaLabel,
				'aria-labelledby': ariaLabelledBy,
			})}
			onClick={hasTrigger ? handleClick : onClick}
			className={cn(
				'group/card flex flex-col gap-4 overflow-hidden rounded-xl border-0 bg-card/95 py-5 shadow-(--surface-shadow) text-sm text-card-foreground has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
				clickable && 'relative',
				hasIcon ? 'pe-9' : hasTrigger && 'pe-3',
				className,
			)}
			{...props}
		>
			{hasTrigger || hasIcon ? (
				<>
					{children}
					{hasTrigger && (
						<button
							type='button'
							data-slot='card-trigger'
							aria-label={ariaLabel}
							aria-labelledby={
								ariaLabelledBy ?? (ariaLabel ? undefined : cardId)
							}
							className={cn(
								'absolute inset-y-0 end-0 outline-none',
								hasIcon ? 'w-9' : 'w-3',
							)}
						/>
					)}
					{hasIcon && (
						<span
							aria-hidden='true'
							data-slot='card-action-icon'
							data-visibility={actionIconVisibility}
							className='pointer-events-none absolute end-4 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-muted-foreground [&>svg]:size-full'
						>
							{actionIcon}
						</span>
					)}
				</>
			) : (
				children
			)}
		</div>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-header'
			className={cn(
				'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-5 sm:px-6 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-5 group-data-[size=sm]/card:[.border-b]:pb-4',
				className,
			)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-title'
			className={cn(
				'font-heading text-lg leading-snug font-semibold tracking-tight group-data-[size=sm]/card:text-sm',
				className,
			)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-description'
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-action'
			className={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className,
			)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-content'
			className={cn('px-5 sm:px-6 group-data-[size=sm]/card:px-3', className)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-footer'
			className={cn(
				'flex items-center rounded-b-xl mt-1 border-t bg-transparent p-5 pt-6 sm:px-6 group-data-[size=sm]/card:p-3 group-data-[size=sm]/card:pt-4',
				className,
			)}
			{...props}
		/>
	)
}

export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	type CardProps,
	CardTitle,
}
