import { invoke, isTauri } from '@tauri-apps/api/core'
import type { ComponentProps } from 'react'
import { cn } from '../../utils/cn'

export type ExternalLinkProps = ComponentProps<'a'> & { href: string }

/**
 * Opens http(s) links in the system browser inside Tauri (needs the opener
 * plugin on the Rust side) and in a new tab in the browser preview.
 */
export function ExternalLink({
	href,
	className,
	onClick,
	children,
	...props
}: ExternalLinkProps) {
	return (
		<a
			{...props}
			href={href}
			target='_blank'
			rel='noreferrer'
			data-slot='external-link'
			className={cn('underline underline-offset-2', className)}
			onClick={(event) => {
				onClick?.(event)
				if (event.defaultPrevented || !isTauri()) return
				event.preventDefault()
				void invoke('plugin:opener|open_url', { url: href })
			}}
		>
			{children}
		</a>
	)
}
