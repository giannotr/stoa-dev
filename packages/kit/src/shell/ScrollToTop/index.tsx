import { ArrowUp } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'
import { cn } from '../../utils/cn'

export interface ScrollToTopProps {
	/**
	 * Scroll area to watch. Without it the nearest scrolling ancestor of the
	 * component is used, and the page if there is none.
	 */
	scrollContainerRef?: RefObject<HTMLElement | null>
	/** Scroll distance in pixels after which the button appears. */
	threshold?: number
	label?: string
	/** Fixed at the bottom right (default) or placed by the surrounding layout. */
	floating?: boolean
	className?: string
}

function findScrollContainer(element: HTMLElement | null) {
	let parent = element?.parentElement
	while (parent) {
		if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent
		parent = parent.parentElement
	}
	return document.scrollingElement as HTMLElement | null
}

/** Button that appears after scrolling down and returns to the top of the area. */
export function ScrollToTop({
	scrollContainerRef,
	threshold = 320,
	label,
	floating = true,
	className,
}: ScrollToTopProps) {
	const { t } = useTranslation(STOA_NS)
	const reducedMotion = useReducedMotion() ?? false
	const anchorRef = useRef<HTMLSpanElement>(null)
	const containerRef = useRef<HTMLElement | null>(null)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		const container =
			scrollContainerRef?.current ?? findScrollContainer(anchorRef.current)
		containerRef.current = container
		if (!container) return
		const isPage = container === document.scrollingElement
		const source: HTMLElement | Window = isPage ? window : container
		let frame: number | undefined
		const update = () => {
			frame = undefined
			setVisible(container.scrollTop > threshold)
		}
		const schedule = () => {
			if (frame === undefined) frame = requestAnimationFrame(update)
		}
		update()
		source.addEventListener('scroll', schedule, { passive: true })
		return () => {
			source.removeEventListener('scroll', schedule)
			if (frame !== undefined) cancelAnimationFrame(frame)
		}
	}, [scrollContainerRef, threshold])

	function scrollToTop() {
		const container = containerRef.current
		if (!container) return
		container.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
		// The button disappears at the top; keep keyboard focus at the start of the area.
		if (container === document.scrollingElement) {
			;(document.activeElement as HTMLElement | null)?.blur()
			return
		}
		if (!container.hasAttribute('tabindex'))
			container.setAttribute('tabindex', '-1')
		container.focus({ preventScroll: true })
	}

	const text = label ?? t('app.scrollToTop')

	return (
		<span ref={anchorRef} data-slot='scroll-to-top' className='contents'>
			<AnimatePresence>
				{visible && (
					<motion.span
						className={cn(
							floating && 'fixed right-6 bottom-6 z-40',
							'inline-flex',
							className,
						)}
						initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
						transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
					>
						<Button
							type='button'
							size='icon-lg'
							className='rounded-full shadow-md'
							aria-label={text}
							title={text}
							onClick={scrollToTop}
						>
							<ArrowUp />
						</Button>
					</motion.span>
				)}
			</AnimatePresence>
		</span>
	)
}
