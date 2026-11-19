import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '../../utils/cn'

type PillProps = ComponentProps<'span'> & {
	variant?: 'default' | 'accent' | 'outline'
	asChild?: boolean
}

const variants = {
	default: 'bg-muted text-foreground',
	accent: 'bg-(--accent-wash) text-foreground',
	outline: 'border border-input text-foreground',
}

function Pill({
	asChild = false,
	className,
	variant = 'default',
	...props
}: PillProps) {
	const Component = asChild ? Slot.Root : 'span'
	return (
		<Component
			data-slot='pill'
			data-variant={variant}
			className={cn(
				'inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&>svg]:size-3 [&>svg]:shrink-0',
				variants[variant],
				className,
			)}
			{...props}
		/>
	)
}

export { Pill, type PillProps }
