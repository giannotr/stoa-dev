'use client'

import { Moon, Sun } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../button'

export interface ThemeToggleProps
	extends Omit<
		ComponentProps<typeof Button>,
		'aria-pressed' | 'asChild' | 'children' | 'onToggle' | 'type'
	> {
	/** Currently applied color scheme. */
	theme: 'light' | 'dark'
	/** Apply the requested scheme in your app's theme provider. */
	onToggle: (theme: 'light' | 'dark') => void | Promise<void>
	/** Accessible label for the dark mode button. */
	label?: string
}

export function ThemeToggle({
	theme,
	onToggle,
	label,
	variant = 'outline',
	size = 'icon',
	onClick,
	'aria-label': ariaLabel,
	...props
}: ThemeToggleProps) {
	const { t } = useTranslation(STOA_NS)
	const dark = theme === 'dark'
	const Icon = dark ? Moon : Sun

	return (
		<Button
			{...props}
			type='button'
			variant={variant}
			size={size}
			aria-label={label ?? ariaLabel ?? t('app.darkMode')}
			aria-pressed={dark}
			onClick={(event) => {
				onClick?.(event)
				if (!event.defaultPrevented) void onToggle(dark ? 'light' : 'dark')
			}}
		>
			<Icon aria-hidden='true' strokeWidth={1.75} />
		</Button>
	)
}
