import { motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { cn } from '../../utils/cn'
import { BrandLines } from '../BrandLines'

export type StartupPhase = 'license' | 'settings' | 'app'

export interface StartupAnimationProps {
	ready: boolean
	phase: StartupPhase
	onComplete: () => void
	/** App name shown under the logo. */
	name: string
	/** Image URL or a custom (e.g. animated inline SVG) logo. */
	logo?: string | ReactNode
	/**
	 * Already translated setting names that flicker by while settings load,
	 * e.g. `['Sprache', 'Darstellung']` or deeper paths like `'Einstellungen/E-Mail/Server'`.
	 */
	settingsPaths?: readonly string[]
	/** Milliseconds per setting name. */
	settingsInterval?: number
	/** Keeps the final message visible a moment before the overlay fades. */
	finalMessageDelay?: number
	/** Per-phase status text; defaults come from the kit locales. */
	messages?: Partial<Record<StartupPhase, string>>
	className?: string
}

/** Startup overlay: logo, app name, brand lines and the current loading step. */
export function StartupAnimation({
	ready,
	phase,
	onComplete,
	name,
	logo,
	settingsPaths = [],
	settingsInterval = 150,
	finalMessageDelay = 0,
	messages,
	className,
}: StartupAnimationProps) {
	const { t } = useTranslation(STOA_NS)
	const reducedMotion = useReducedMotion() ?? false
	const [introFinished, setIntroFinished] = useState(false)
	const [settingsShown, setSettingsShown] = useState(false)
	const [finalShown, setFinalShown] = useState(false)
	const [index, setIndex] = useState(0)
	const checkingLicense = phase === 'license'
	const display: StartupPhase = checkingLicense
		? 'license'
		: settingsShown
			? phase
			: 'settings'
	const exiting =
		ready && (reducedMotion || (introFinished && settingsShown && finalShown))

	useEffect(() => {
		const timer = window.setTimeout(
			() => setIntroFinished(true),
			reducedMotion ? 0 : 2000,
		)
		return () => window.clearTimeout(timer)
	}, [reducedMotion])

	useEffect(() => {
		if (checkingLicense) return
		if (reducedMotion || settingsPaths.length === 0) {
			setSettingsShown(true)
			return
		}
		let current = 0
		const timer = window.setInterval(() => {
			current += 1
			if (current < settingsPaths.length) setIndex(current)
			else {
				setSettingsShown(true)
				window.clearInterval(timer)
			}
		}, settingsInterval)
		return () => window.clearInterval(timer)
	}, [checkingLicense, reducedMotion, settingsPaths.length, settingsInterval])

	useEffect(() => {
		if (display !== 'app') return
		const timer = window.setTimeout(
			() => setFinalShown(true),
			reducedMotion ? 0 : finalMessageDelay,
		)
		return () => window.clearTimeout(timer)
	}, [display, reducedMotion, finalMessageDelay])

	const text =
		messages?.[display] ??
		t(
			display === 'license'
				? 'licensing.gate.loading'
				: display === 'settings'
					? 'app.loadingSettings'
					: 'app.loadingApp',
		)

	return (
		<motion.main
			role='status'
			data-slot='startup-animation'
			className={cn(
				'app-shell relative flex h-screen items-center justify-center overflow-hidden p-6',
				className,
			)}
			initial={false}
			animate={{ opacity: exiting ? 0 : 1 }}
			transition={{ duration: reducedMotion ? 0 : 0.18 }}
			onAnimationComplete={() => {
				if (exiting) onComplete()
			}}
		>
			<div className='relative grid justify-items-center gap-5'>
				{typeof logo === 'string' ? (
					<motion.img
						src={logo}
						alt=''
						aria-hidden='true'
						className='size-28 rounded-3xl'
						initial={{ opacity: reducedMotion ? 1 : 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: reducedMotion ? 0 : 0.5 }}
					/>
				) : (
					logo
				)}
				<p className='text-lg font-medium tracking-[0.18em]'>{name}</p>
				<BrandLines loading={!reducedMotion} />
				<p className='text-sm text-muted-foreground'>{text}</p>
				<span aria-hidden='true' className='h-5 text-xs text-muted-foreground'>
					{display === 'settings' && !reducedMotion && settingsPaths[index]
						? `/${settingsPaths[index]}`
						: ''}
				</span>
			</div>
		</motion.main>
	)
}
