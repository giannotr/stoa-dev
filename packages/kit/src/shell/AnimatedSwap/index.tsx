import {
	AnimatePresence,
	motion,
	useIsPresent,
	useReducedMotion,
} from 'motion/react'
import {
	type Key,
	type ReactNode,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { cn } from '../../utils/cn'

function Panel({
	children,
	onHeight,
	reducedMotion,
}: {
	children: ReactNode
	onHeight: (height: number) => void
	reducedMotion: boolean
}) {
	const ref = useRef<HTMLDivElement>(null)
	const present = useIsPresent()
	useLayoutEffect(() => {
		const panel = ref.current
		if (!panel || !present) return
		const measure = () => onHeight(panel.offsetHeight)
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(panel)
		return () => observer.disconnect()
	}, [onHeight, present])

	return (
		<motion.div
			ref={ref}
			className='flow-root p-1'
			inert={!present}
			aria-hidden={!present}
			initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 6 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{
				opacity: reducedMotion ? 1 : 0,
				y: reducedMotion ? 0 : -4,
				transition: { duration: reducedMotion ? 0 : 0.1 },
			}}
			transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
		>
			{children}
		</motion.div>
	)
}

export interface AnimatedSwapProps {
	/** Changing the key cross-fades to the new children. */
	swapKey: Key
	children: ReactNode
	className?: string
}

/**
 * Cross-fades between contents and animates its height in between, e.g. a
 * toolbar that changes with the selection.
 */
export function AnimatedSwap({
	swapKey,
	children,
	className,
}: AnimatedSwapProps) {
	const [height, setHeight] = useState<number | null>(null)
	const reducedMotion = useReducedMotion() ?? false
	return (
		<motion.div
			data-slot='animated-swap'
			className={cn('relative shrink-0 overflow-hidden', className)}
			initial={false}
			animate={{ height: height ?? 'auto' }}
			transition={{
				duration: reducedMotion ? 0 : 0.24,
				ease: [0.22, 1, 0.36, 1],
			}}
		>
			<AnimatePresence initial={false} mode='wait'>
				<Panel key={swapKey} onHeight={setHeight} reducedMotion={reducedMotion}>
					{children}
				</Panel>
			</AnimatePresence>
		</motion.div>
	)
}
