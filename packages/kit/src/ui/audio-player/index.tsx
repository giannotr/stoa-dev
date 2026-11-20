'use client'

import { Pause, Play, Repeat, RotateCcw, RotateCw } from 'lucide-react'
import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { cn } from '../../utils/cn'
import { getRuntimeLocale } from '../../utils/dates'
import styles from './AudioPlayer.module.scss'

export interface AudioPlayerProps {
	/** Audio URL; `null` while the app is still resolving the file. */
	src: string | null
	/** Heading, e.g. the file name. Defaults to "Audio instrument". */
	title?: ReactNode
	/** Caption under the heading, e.g. file type and size. */
	description?: ReactNode
	/** Selectable playback rates. */
	speeds?: readonly number[]
	/** Seconds for the back/forward buttons and the arrow keys. */
	skipSeconds?: number
	defaultSpeed?: number
	defaultLoop?: boolean
	/** Focus the play button on mount, e.g. inside a dialog. */
	autoFocus?: boolean
	/** Shown instead of the default message when the file cannot be played. */
	errorMessage?: ReactNode
	/** Extra actions below the controls, e.g. "open in default app". */
	footer?: ReactNode
	onError?: () => void
	className?: string
}

const CENTER = 160
const RADIUS = 139
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ringPoint(degrees: number, radius: number) {
	const radians = ((degrees - 90) * Math.PI) / 180
	return {
		x: CENTER + Math.cos(radians) * radius,
		y: CENTER + Math.sin(radians) * radius,
	}
}

const TICKS = Array.from({ length: 60 }, (_, index) => {
	const degrees = index * 6
	const major = index % 5 === 0
	const start = ringPoint(degrees, major ? 140 : 145)
	const end = ringPoint(degrees, 151)
	return { degrees, major, x1: start.x, y1: start.y, x2: end.x, y2: end.y }
})

function formatTime(seconds: number) {
	if (!Number.isFinite(seconds)) return '–:––'
	const whole = Math.max(0, Math.floor(seconds))
	const minutes = Math.floor(whole / 60)
	return `${minutes}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * Practice-friendly audio player in the style of the color instrument: a
 * position ring to scrub, skip buttons, playback speed and repeat.
 */
export function AudioPlayer({
	src,
	title,
	description,
	speeds = [0.5, 0.75, 1, 1.25],
	skipSeconds = 5,
	defaultSpeed = 1,
	defaultLoop = false,
	autoFocus = false,
	errorMessage,
	footer,
	onError,
	className,
}: AudioPlayerProps) {
	const { t } = useTranslation(STOA_NS)
	const id = useId()
	const audio = useRef<HTMLAudioElement>(null)
	const [failed, setFailed] = useState(false)
	const [playing, setPlaying] = useState(false)
	const [current, setCurrent] = useState(0)
	const [duration, setDuration] = useState(Number.NaN)
	const [speed, setSpeed] = useState(defaultSpeed)
	const [loop, setLoop] = useState(defaultLoop)

	// A new file starts from the beginning (reset during render, no extra effect).
	const [previousSrc, setPreviousSrc] = useState(src)
	if (src !== previousSrc) {
		setPreviousSrc(src)
		setFailed(false)
		setPlaying(false)
		setCurrent(0)
		setDuration(Number.NaN)
	}

	useEffect(() => {
		if (audio.current) audio.current.playbackRate = speed
	}, [speed])

	const known = Number.isFinite(duration) && duration > 0
	const ready = src !== null && !failed
	const share = known ? Math.min(1, current / duration) : 0
	const degrees = share * 360
	const indicator = ringPoint(degrees, RADIUS)

	function fail() {
		setFailed(true)
		setPlaying(false)
		onError?.()
	}

	function toggle() {
		const element = audio.current
		if (!element || !ready) return
		if (!element.paused) {
			element.pause()
			return
		}
		element.play().catch((error: unknown) => {
			// A blocked or interrupted start (autoplay policy, quick pause) is not a broken file.
			const name = error instanceof DOMException ? error.name : ''
			if (name === 'NotAllowedError' || name === 'AbortError') setPlaying(false)
			else fail()
		})
	}

	function seek(seconds: number) {
		const element = audio.current
		if (!element || !Number.isFinite(element.duration)) return
		element.currentTime = Math.min(element.duration, Math.max(0, seconds))
		setCurrent(element.currentTime)
	}

	function pointToPosition(event: PointerEvent<SVGCircleElement>) {
		const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
		if (!bounds || !known) return
		const x = event.clientX - bounds.left - bounds.width / 2
		const y = event.clientY - bounds.top - bounds.height / 2
		if (x === 0 && y === 0) return
		const angle = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
		seek((angle / 360) * duration)
	}

	function onKeyDown(event: KeyboardEvent) {
		const target = event.target as HTMLElement
		if (target.closest('input[type="text"], textarea, select')) return
		if (event.key === ' ' && !target.closest('button')) {
			event.preventDefault()
			toggle()
		} else if (event.key === 'ArrowLeft' && !target.closest('input')) {
			event.preventDefault()
			seek(current - skipSeconds)
		} else if (event.key === 'ArrowRight' && !target.closest('input')) {
			event.preventDefault()
			seek(current + skipSeconds)
		}
	}

	const number = new Intl.NumberFormat(getRuntimeLocale(), {
		maximumFractionDigits: 2,
	})

	return (
		<section
			className={cn(styles.player, className)}
			data-slot='audio-player'
			data-state={failed ? 'error' : playing ? 'playing' : 'paused'}
			aria-labelledby={`${id}-title`}
			onKeyDown={onKeyDown}
		>
			<header className={styles.header}>
				<h2
					id={`${id}-title`}
					className='truncate font-heading text-2xl leading-snug font-semibold tracking-tight'
				>
					{title ?? t('audioPlayer.title')}
				</h2>
				{description && <p className={styles.caption}>{description}</p>}
			</header>

			{src && (
				// biome-ignore lint/a11y/useMediaCaption: practice recordings come without captions.
				<audio
					ref={audio}
					src={src}
					loop={loop}
					preload='metadata'
					onLoadedMetadata={(event) => {
						setDuration(event.currentTarget.duration)
						event.currentTarget.playbackRate = speed
					}}
					onDurationChange={(event) =>
						setDuration(event.currentTarget.duration)
					}
					onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
					onPlay={() => setPlaying(true)}
					onPause={() => setPlaying(false)}
					onEnded={() => setPlaying(false)}
					onError={fail}
				/>
			)}

			{failed ? (
				<p className={styles.error} role='alert'>
					{errorMessage ?? t('audioPlayer.error')}
				</p>
			) : (
				<>
					<div className={styles.dial}>
						<input
							className={styles.positionInput}
							type='range'
							min={0}
							max={known ? duration : 0}
							step={0.1}
							value={current}
							disabled={!ready || !known}
							aria-label={t('audioPlayer.position')}
							aria-valuetext={`${formatTime(current)} / ${formatTime(duration)}`}
							onChange={(event) => seek(event.currentTarget.valueAsNumber)}
						/>
						<svg viewBox='0 0 320 320' aria-hidden='true'>
							<circle
								cx={CENTER}
								cy={CENTER}
								r={RADIUS}
								className={styles.track}
							/>
							{TICKS.map(({ degrees: tick, major, ...line }) => (
								<line
									key={tick}
									{...line}
									className={cn(
										major ? styles.majorTick : styles.tick,
										tick <= degrees && known && styles.passed,
									)}
								/>
							))}
							<circle
								cx={CENTER}
								cy={CENTER}
								r={RADIUS}
								className={styles.progress}
								strokeDasharray={CIRCUMFERENCE}
								strokeDashoffset={CIRCUMFERENCE * (1 - share)}
								transform={`rotate(-90 ${CENTER} ${CENTER})`}
							/>
							<circle
								cx={CENTER}
								cy={CENTER}
								r={126}
								className={styles.innerTrack}
							/>
							<circle
								cx={indicator.x}
								cy={indicator.y}
								r={8}
								className={styles.indicator}
							/>
							<circle
								cx={CENTER}
								cy={CENTER}
								r={RADIUS}
								className={styles.scrubRing}
								onPointerDown={(event) => {
									if (event.button !== 0 || !event.isPrimary || !ready) return
									event.currentTarget.setPointerCapture(event.pointerId)
									pointToPosition(event)
								}}
								onPointerMove={(event) => {
									if (event.currentTarget.hasPointerCapture(event.pointerId))
										pointToPosition(event)
								}}
							/>
						</svg>
						<div className={styles.center} aria-hidden='true'>
							<strong data-slot='audio-player-time'>
								{formatTime(current)}
							</strong>
							<span>
								{src === null
									? t('audioPlayer.loading')
									: `${t('audioPlayer.duration')} ${formatTime(duration)}`}
							</span>
						</div>
					</div>

					<div className={styles.transport}>
						<button
							type='button'
							className={styles.skip}
							disabled={!ready}
							aria-label={t('audioPlayer.back', { seconds: skipSeconds })}
							title={t('audioPlayer.back', { seconds: skipSeconds })}
							onClick={() => seek(current - skipSeconds)}
						>
							<RotateCcw />
						</button>
						<button
							type='button'
							className={styles.play}
							disabled={!ready}
							// biome-ignore lint/a11y/noAutofocus: opt-in for dialogs
							autoFocus={autoFocus}
							aria-label={t(playing ? 'audioPlayer.pause' : 'audioPlayer.play')}
							onClick={toggle}
						>
							{playing ? <Pause /> : <Play className={styles.playIcon} />}
						</button>
						<button
							type='button'
							className={styles.skip}
							disabled={!ready}
							aria-label={t('audioPlayer.forward', { seconds: skipSeconds })}
							title={t('audioPlayer.forward', { seconds: skipSeconds })}
							onClick={() => seek(current + skipSeconds)}
						>
							<RotateCw />
						</button>
					</div>

					<div className={styles.options}>
						<fieldset className={styles.speeds}>
							<legend className={styles.caption}>
								{t('audioPlayer.speed')}
							</legend>
							<div>
								{speeds.map((value) => (
									<button
										key={value}
										type='button'
										aria-pressed={speed === value}
										onClick={() => setSpeed(value)}
									>
										{number.format(value)}×
									</button>
								))}
							</div>
						</fieldset>
						<button
							type='button'
							className={styles.loop}
							aria-pressed={loop}
							onClick={() => setLoop((value) => !value)}
						>
							<Repeat aria-hidden='true' />
							{t('audioPlayer.loop')}
						</button>
					</div>
				</>
			)}

			{footer && <footer className={styles.footer}>{footer}</footer>}
		</section>
	)
}
