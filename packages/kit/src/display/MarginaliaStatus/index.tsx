import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface MarginaliaStatusProps {
	children: ReactNode
	/** Announce changes to screen readers (role="status"). */
	live?: boolean
	className?: string
}

/** A status line between quiet double colons: ":: Target Range Clear ::". */
export function MarginaliaStatus({
	children,
	live = false,
	className,
}: MarginaliaStatusProps) {
	return (
		<p
			data-slot='marginalia-status'
			role={live ? 'status' : undefined}
			className={cn(
				'inline-flex items-baseline gap-2 text-sm font-light',
				className,
			)}
		>
			<span aria-hidden='true' className='text-muted-foreground'>
				::
			</span>
			{children}
			<span aria-hidden='true' className='text-muted-foreground'>
				::
			</span>
		</p>
	)
}
