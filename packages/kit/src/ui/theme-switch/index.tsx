'use client'

import { Moon, Sun } from 'lucide-react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { cn } from '../../utils/cn'
import styles from './ThemeSwitch.module.scss'

export interface ThemeSwitchProps {
	/** Currently applied color scheme. */
	theme: 'light' | 'dark'
	/** Apply the requested scheme in your app's theme provider. */
	onToggle: (theme: 'light' | 'dark') => void | Promise<void>
	/** Accessible label for the dark mode switch. */
	label?: string
	disabled?: boolean
	className?: string
}

export function ThemeSwitch({
	theme,
	onToggle,
	label,
	disabled,
	className,
}: ThemeSwitchProps) {
	const { t } = useTranslation(STOA_NS)

	return (
		<SwitchPrimitive.Root
			aria-label={label ?? t('app.darkMode')}
			className={cn(styles.track, className)}
			data-slot='theme-switch'
			checked={theme === 'dark'}
			disabled={disabled}
			onCheckedChange={(checked) => void onToggle(checked ? 'dark' : 'light')}
		>
			<SwitchPrimitive.Thumb className={styles.thumb} aria-hidden='true' />
			<Sun className={styles.sun} aria-hidden='true' strokeWidth={1.75} />
			<Moon className={styles.moon} aria-hidden='true' strokeWidth={1.75} />
		</SwitchPrimitive.Root>
	)
}
