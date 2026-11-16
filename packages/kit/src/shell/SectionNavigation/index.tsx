import { motion, useReducedMotion } from 'motion/react'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { STOA_NS } from '../../i18n/namespace'

export type NavigationSection = { id: string; label: string }

const showBackgroundOffset = 125
const hideBackgroundOffset = 75

function getScrollContainer(content: HTMLElement | null) {
	let parent = content?.parentElement
	while (parent) {
		if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent
		parent = parent.parentElement
	}
	return null
}

export interface SectionNavigationProps {
	sections: readonly NavigationSection[]
	label?: string
	scrollContainerRef: RefObject<HTMLDivElement | null>
}

export function SectionNavigation({
	scrollContainerRef,
	sections,
	label,
}: SectionNavigationProps) {
	const [showBackground, setShowBackground] = useState(false)
	const reducedMotion = useReducedMotion() ?? false
	const { t } = useTranslation(STOA_NS)
	const { hash } = useLocation()
	const navigationRef = useRef<HTMLElement>(null)
	const [activeSection, setActiveSection] = useState<string>(
		sections[0]?.id ?? '',
	)

	const scrollToSection = useCallback(
		(id: string) => {
			const container = getScrollContainer(scrollContainerRef.current)
			const navigation = navigationRef.current
			const section = document.getElementById(id)

			if (!container || !navigation || !section) return

			const top =
				container.scrollTop +
				section.getBoundingClientRect().top -
				container.getBoundingClientRect().top -
				navigation.offsetHeight -
				16
			container.scrollTo({ top: Math.max(0, top) })
			section.focus({ preventScroll: true })
		},
		[scrollContainerRef],
	)

	useEffect(() => {
		const container = getScrollContainer(scrollContainerRef.current)
		const navigation = navigationRef.current

		if (!container || !navigation) return

		const targets = sections.map(({ id }) => document.getElementById(id))
		let animationFrame: number | undefined

		function updateActiveSection() {
			animationFrame = undefined

			if (!container || !navigation) return

			setShowBackground((visible) =>
				visible
					? container.scrollTop > hideBackgroundOffset
					: container.scrollTop >= showBackgroundOffset,
			)

			let active: string = sections[0]?.id ?? ''
			let largestVisibleHeight = 0
			const viewport = container.getBoundingClientRect()
			const visibleTop = Math.max(
				viewport.top,
				navigation.getBoundingClientRect().bottom,
			)
			const visibleBottom = Math.min(viewport.bottom, window.innerHeight)

			for (const section of targets) {
				if (!section) continue
				const bounds = section.getBoundingClientRect()
				const visibleHeight = Math.max(
					0,
					Math.min(bounds.bottom, visibleBottom) -
						Math.max(bounds.top, visibleTop),
				)
				if (visibleHeight > largestVisibleHeight) {
					largestVisibleHeight = visibleHeight
					active = section.id
				}
			}

			if (
				container.scrollHeight > container.clientHeight &&
				container.scrollHeight - container.clientHeight - container.scrollTop <=
					2
			) {
				active = sections[sections.length - 1]?.id ?? ''
			}
			setActiveSection(active)
		}

		function scheduleUpdate() {
			if (animationFrame === undefined)
				animationFrame = requestAnimationFrame(updateActiveSection)
		}

		// Capture scrolls from the page and its ancestors, including native WebView scrolling.
		document.addEventListener('scroll', scheduleUpdate, {
			capture: true,
			passive: true,
		})

		window.addEventListener('resize', scheduleUpdate)
		const observer = new ResizeObserver(scheduleUpdate)
		observer.observe(container)
		observer.observe(navigation)
		for (const target of targets) if (target) observer.observe(target)
		updateActiveSection()

		return () => {
			document.removeEventListener('scroll', scheduleUpdate, true)
			window.removeEventListener('resize', scheduleUpdate)
			if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
			observer.disconnect()
		}
	}, [scrollContainerRef, sections])

	useEffect(() => {
		const id = hash.slice(1)
		if (sections.some((section) => section.id === id)) scrollToSection(id)
	}, [hash, scrollToSection, sections])

	if (sections.length === 0) return null

	return (
		<nav
			ref={navigationRef}
			aria-label={label ?? t('app.navigation')}
			className='sticky top-1 z-20 isolate m-1 mt-4 flex flex-wrap gap-1 rounded-xl p-2'
		>
			<motion.div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0 -z-10 rounded-xl bg-background/25 shadow-sm backdrop-blur-xs'
				initial={false}
				animate={{ opacity: showBackground ? 1 : 0 }}
				transition={{ duration: reducedMotion ? 0 : 0.2, ease: 'easeOut' }}
			/>
			{sections.map(({ id, label }) => (
				<Link
					key={id}
					to={`#${id}`}
					replace
					aria-current={activeSection === id ? 'location' : undefined}
					onClick={() => {
						if (hash === `#${id}`) scrollToSection(id)
					}}
					className={`
						rounded-full px-3 py-2
						text-sm font-medium transition-colors
						outline-none focus-visible:ring-2 focus-visible:ring-ring
						${
							activeSection === id
								? 'bg-(--section-active) text-foreground'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground'
						}
					`}
				>
					{label}
				</Link>
			))}
		</nav>
	)
}
