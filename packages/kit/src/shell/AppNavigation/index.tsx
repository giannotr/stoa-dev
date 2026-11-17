import { Eclipse, type LucideIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { cn } from '../../utils/cn'
import styles from './AppNavigation.module.scss'

type ItemBase = {
	/** Translated label, used for tooltip and aria-label. */
	label: string
	Icon: LucideIcon
	disabled?: boolean
}

export type AppNavigationLink = ItemBase & {
	path: string
	/** Custom active matcher, e.g. to keep "Library" active on `/books/:id`. */
	isActive?: (pathname: string) => boolean
}

export type AppNavigationAction = ItemBase & {
	onClick: () => void
	/** Stable React key; defaults to the label. */
	id?: string
}

export type AppNavigationEntry =
	| AppNavigationLink
	| AppNavigationAction
	| ReactNode

/** Groups are rendered top to bottom and separated by dividers. */
export type AppNavigationGroup = readonly AppNavigationEntry[]

export interface AppNavigationProps {
	groups: readonly AppNavigationGroup[]
	/** Image URL or custom node rendered above the first group. */
	logo?: string | ReactNode
	/** Groups pinned to the bottom of the bar. */
	footerGroups?: readonly AppNavigationGroup[]
	label?: string
	className?: string
}

function isLink(entry: AppNavigationEntry): entry is AppNavigationLink {
	return (
		typeof entry === 'object' &&
		entry !== null &&
		'path' in entry &&
		'Icon' in entry
	)
}

function isAction(entry: AppNavigationEntry): entry is AppNavigationAction {
	return (
		typeof entry === 'object' &&
		entry !== null &&
		'onClick' in entry &&
		'Icon' in entry
	)
}

function ItemTooltip({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side='right'>{label}</TooltipContent>
		</Tooltip>
	)
}

export function AppNavigationItem({
	path,
	label,
	Icon,
	isActive,
	disabled,
}: AppNavigationLink) {
	const { pathname } = useLocation()
	const active = isActive ? isActive(pathname) : pathname === path

	return (
		<ItemTooltip label={label}>
			<Button
				variant='ghost'
				size='icon'
				data-nav-item=''
				className={cn(styles.menuButton, 'rounded-xl')}
				disabled={disabled}
				asChild={!disabled}
			>
				{disabled ? (
					<Icon className='size-4' strokeWidth={1.75} />
				) : (
					<Link
						to={path}
						aria-label={label}
						aria-current={active ? 'page' : undefined}
					>
						<Icon className='size-4' strokeWidth={1.75} />
					</Link>
				)}
			</Button>
		</ItemTooltip>
	)
}

export function AppNavigationButton({
	label,
	Icon,
	onClick,
	disabled,
}: AppNavigationAction) {
	return (
		<ItemTooltip label={label}>
			<Button
				variant='ghost'
				size='icon'
				data-nav-item=''
				className={cn(styles.menuButton, 'rounded-xl')}
				aria-label={label}
				disabled={disabled}
				onClick={onClick}
			>
				<Icon className='size-4' strokeWidth={1.75} />
			</Button>
		</ItemTooltip>
	)
}

export interface AppNavigationThemeToggleProps {
	/** Persist the new theme (settings file, autosave, …). `next-themes` is updated by the app. */
	onToggle: (theme: 'light' | 'dark') => void | Promise<void>
	/** Current stored preference; `system` resolves via `next-themes`. */
	theme?: 'light' | 'dark' | 'system'
	disabled?: boolean
	label?: string
}

export function AppNavigationThemeToggle({
	onToggle,
	theme = 'system',
	disabled,
	label,
}: AppNavigationThemeToggleProps) {
	const { t } = useTranslation(STOA_NS)
	const { resolvedTheme } = useTheme()
	const current = theme === 'system' ? resolvedTheme : theme

	return (
		<AppNavigationButton
			label={label ?? t('app.switchTheme')}
			Icon={Eclipse}
			disabled={disabled}
			onClick={() => void onToggle(current === 'dark' ? 'light' : 'dark')}
		/>
	)
}

export function AppNavigationDivider() {
	return (
		<div
			data-slot='app-navigation-divider'
			className={styles.divider}
			aria-hidden='true'
		/>
	)
}

function renderGroups(
	groups: readonly AppNavigationGroup[],
	keyPrefix: string,
) {
	return groups.map((group, groupIndex) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: groups are static configuration
		<Fragment key={`${keyPrefix}-${groupIndex}`}>
			{groupIndex > 0 && <AppNavigationDivider />}
			{group.map((entry, index) => {
				if (isLink(entry))
					return <AppNavigationItem key={entry.path} {...entry} />
				if (isAction(entry))
					return (
						<AppNavigationButton key={entry.id ?? entry.label} {...entry} />
					)
				// biome-ignore lint/suspicious/noArrayIndexKey: custom nodes have no identity
				return <Fragment key={index}>{entry}</Fragment>
			})}
		</Fragment>
	))
}

export function AppNavigation({
	groups,
	logo,
	footerGroups,
	label,
	className,
}: AppNavigationProps) {
	const { t } = useTranslation(STOA_NS)

	return (
		<nav
			data-slot='app-navigation'
			aria-label={label ?? t('app.navigation')}
			className={cn(styles.root, className)}
		>
			{typeof logo === 'string' ? (
				<img
					src={logo}
					data-slot='app-navigation-logo'
					className={styles.logo}
					alt=''
					aria-hidden='true'
				/>
			) : (
				logo
			)}
			{renderGroups(groups, 'main')}
			{footerGroups && footerGroups.length > 0 && (
				<>
					<div className={styles.spacer} />
					{renderGroups(footerGroups, 'footer')}
				</>
			)}
		</nav>
	)
}
