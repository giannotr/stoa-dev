'use client'

import { Separator as SeparatorPrimitive } from 'radix-ui'
import type * as React from 'react'

import { cn } from '../../utils/cn'

function Separator({
	className,
	orientation = 'horizontal',
	decorative = true,
	...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
	return (
		<SeparatorPrimitive.Root
			data-slot='separator'
			decorative={decorative}
			orientation={orientation}
			className={cn(
				'shrink-0 bg-border data-horizontal:my-2 data-vertical:mx-2 data-horizontal:h-(--ui-border-width) data-horizontal:w-full data-vertical:w-(--ui-border-width) data-vertical:self-stretch',
				className,
			)}
			{...props}
		/>
	)
}

export { Separator }
