'use client'

import { ArrowRight, Check } from 'lucide-react'
import {
	type CSSProperties,
	type PointerEvent,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { cn } from '../../utils/cn'
import styles from './SlideAction.module.scss'

export interface SlideActionProps {
	label?: string
	successLabel?: string
	onComplete: () => void
	disabled?: boolean
	/** Return to the initial state 1.2 seconds after activation. */
	resetAfterSuccess?: boolean
	/** Track height in pixels. */
	height?: number
	className?: string
}

type Drag = {
	pointerId: number
	startX: number
	travel: number
	thumb: HTMLButtonElement
}

const idle = { progress: 0, status: 'idle' } as const
type SlideState = {
	progress: number
	status: 'idle' | 'dragging' | 'completed'
}

function dragProgress(drag: Drag, clientX: number) {
	return Math.min(1, Math.max(0, (clientX - drag.startX) / drag.travel))
}

/** Triggers an action after dragging the thumb to the right and releasing it. */
export function SlideAction({
	label,
	successLabel,
	onComplete,
	disabled = false,
	resetAfterSuccess = false,
	height = 56,
	className,
}: SlideActionProps) {
	const { t } = useTranslation(STOA_NS)
	const actionLabel =
		label ?? t('slideAction.label', { defaultValue: 'Slide to confirm' })
	const completionLabel =
		successLabel ?? t('slideAction.success', { defaultValue: 'Confirmed' })
	const trackHeight = Number.isFinite(height) ? Math.max(24, height) : 56
	const trackRef = useRef<HTMLDivElement>(null)
	const drag = useRef<Drag | null>(null)
	const completed = useRef(false)
	const resetTimer = useRef<number | undefined>(undefined)
	const [state, setState] = useState<SlideState>(idle)

	useEffect(() => () => window.clearTimeout(resetTimer.current), [])
	useEffect(() => {
		if (!disabled || !drag.current) return
		const { pointerId, thumb } = drag.current
		drag.current = null
		if (thumb.hasPointerCapture(pointerId))
			thumb.releasePointerCapture(pointerId)
		setState(idle)
	}, [disabled])

	function complete() {
		if (disabled || completed.current) return
		completed.current = true
		setState({ progress: 1, status: 'completed' })
		if (resetAfterSuccess) {
			resetTimer.current = window.setTimeout(() => {
				completed.current = false
				setState(idle)
			}, 1200)
		}
		onComplete()
	}

	function startDrag(event: PointerEvent<HTMLButtonElement>) {
		if (
			disabled ||
			completed.current ||
			drag.current ||
			event.button !== 0 ||
			!event.isPrimary
		)
			return
		const travel = (trackRef.current?.clientWidth ?? 0) - trackHeight
		if (travel <= 0) return

		const thumb = event.currentTarget
		thumb.setPointerCapture(event.pointerId)
		drag.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			travel,
			thumb,
		}
		setState({ progress: 0, status: 'dragging' })
	}

	function moveDrag(event: PointerEvent<HTMLButtonElement>) {
		const active = drag.current
		if (disabled || !active || active.pointerId !== event.pointerId) return
		setState({
			progress: dragProgress(active, event.clientX),
			status: 'dragging',
		})
	}

	function endDrag(event: PointerEvent<HTMLButtonElement>) {
		const active = drag.current
		if (!active || active.pointerId !== event.pointerId) return
		drag.current = null
		if (!disabled && dragProgress(active, event.clientX) >= 0.85) complete()
		else setState(idle)
	}

	function cancelDrag(event: PointerEvent<HTMLButtonElement>) {
		if (drag.current?.pointerId !== event.pointerId) return
		drag.current = null
		setState(idle)
	}

	const isComplete = state.status === 'completed'

	return (
		<div
			ref={trackRef}
			data-slot='slide-action'
			data-state={state.status}
			data-disabled={disabled || undefined}
			className={cn(styles.track, 'w-full max-w-[360px]', className)}
			style={
				{
					'--slide-height': `${trackHeight}px`,
					'--slide-progress': state.progress,
				} as CSSProperties
			}
		>
			<span aria-hidden='true' className={styles.fill} />
			<span role='status' className={styles.label}>
				{isComplete ? completionLabel : actionLabel}
			</span>
			<button
				type='button'
				data-slot='slide-action-thumb'
				className={styles.thumb}
				aria-label={actionLabel}
				aria-disabled={isComplete || undefined}
				disabled={disabled}
				onPointerDown={startDrag}
				onPointerMove={moveDrag}
				onPointerUp={endDrag}
				onPointerCancel={cancelDrag}
				onLostPointerCapture={cancelDrag}
				onClick={(event) => {
					// Keyboard and assistive technology activate the native button directly.
					if (event.detail === 0 && !drag.current) complete()
				}}
			>
				{isComplete ? (
					<Check aria-hidden='true' />
				) : (
					<ArrowRight aria-hidden='true' />
				)}
			</button>
		</div>
	)
}
