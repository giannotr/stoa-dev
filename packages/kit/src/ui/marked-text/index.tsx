import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '../../utils/cn'

type MarkedTextProps = ComponentProps<'div'> & {
	/** CSS color of the leading border. Defaults to the theme accent. */
	color?: string
	asChild?: boolean
}

function MarkedText({
	asChild = false,
	className,
	color,
	style,
	...props
}: MarkedTextProps) {
	const Component = asChild ? Slot.Root : 'div'
	return (
		<Component
			data-slot='marked-text'
			className={cn(
				'border-s-[3px] border-accent py-0.5 ps-3 text-sm font-medium whitespace-pre-line',
				className,
			)}
			style={
				color === undefined
					? style
					: { borderInlineStartColor: color, ...style }
			}
			{...props}
		/>
	)
}

export { MarkedText, type MarkedTextProps }
