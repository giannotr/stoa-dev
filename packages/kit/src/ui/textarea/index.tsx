import type * as React from 'react'

import { cn } from '../../utils/cn'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
	return (
		<textarea
			data-slot='textarea'
			className={cn(
				'flex field-sizing-content min-h-16 w-full rounded-lg border-[1.5px] border-foreground/35 bg-background/70 px-3 py-2 text-sm transition-colors outline-none placeholder:font-semibold placeholder:text-foreground/75 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-background/40 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
				className,
			)}
			{...props}
		/>
	)
}

export { Textarea }
