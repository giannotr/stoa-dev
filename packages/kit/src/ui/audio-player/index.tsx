'use client'

import { Pause, Play, Repeat, RotateCcw, RotateCw } from 'lucide-react'
import {
	type CSSProperties,
	type KeyboardEvent,
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
const RADIUS = 118
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Ticks on the straight position scale (major every fifth). */
const SCALE_TICKS = 41

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
	const start = ringPoint(degrees, major ? 121 : 125)
	const end = ringPoint(degrees, 130)
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
 * straight position scale to scrub, a decorative dial that mirrors the
 * progress, skip buttons, playback speed and repeat.
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
					{/* Decoration only: the dial mirrors the position, the scale below controls it. */}
					<div className={styles.dial} aria-hidden='true'>
						<svg viewBox='0 0 320 320' aria-hidden='true'>
							{/* Guide line from both edges to the ring, kept clear of the readout. */}
							<line
								x1={4}
								y1={CENTER}
								x2={CENTER - RADIUS - 16}
								y2={CENTER}
								className={styles.guide}
							/>
							<line
								x1={CENTER + RADIUS + 16}
								y1={CENTER}
								x2={316}
								y2={CENTER}
								className={styles.guide}
							/>
							<rect
								x={0}
								y={CENTER - 3}
								width={6}
								height={6}
								className={styles.guideEnd}
							/>
							<rect
								x={314}
								y={CENTER - 3}
								width={6}
								height={6}
								className={styles.guideEnd}
							/>
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
								r={104}
								className={styles.innerTrack}
							/>
							{[0, 90, 180, 270].map((mark) => {
								const outer = ringPoint(mark, 100)
								const inner = ringPoint(mark, 92)
								return (
									<line
										key={mark}
										x1={outer.x}
										y1={outer.y}
										x2={inner.x}
										y2={inner.y}
										className={styles.crosshair}
									/>
								)
							})}
							<circle
								cx={indicator.x}
								cy={indicator.y}
								r={6}
								className={styles.indicator}
							/>
						</svg>
						<div className={styles.center}>
							<strong data-slot='audio-player-time'>
								{formatTime(current)}
							</strong>
							<span>
								{src === null
									? t('audioPlayer.loading')
									: `${t('audioPlayer.remaining')} −${formatTime(known ? duration - current : Number.NaN)}`}
							</span>
						</div>
					</div>

					<div className={styles.scale}>
						<input
							className={styles.scrubber}
							type='range'
							min={0}
							max={known ? duration : 0}
							step={0.1}
							value={current}
							disabled={!ready || !known}
							aria-label={t('audioPlayer.position')}
							aria-valuetext={`${formatTime(current)} / ${formatTime(duration)}`}
							style={{ '--progress': `${share * 100}%` } as CSSProperties}
							onChange={(event) => seek(event.currentTarget.valueAsNumber)}
						/>
						<div className={styles.ruler} aria-hidden='true'>
							{Array.from({ length: SCALE_TICKS }, (_, index) => (
								<i
									// biome-ignore lint/suspicious/noArrayIndexKey: static scale
									key={index}
									data-major={index % 5 === 0 || undefined}
									data-passed={
										known && index / (SCALE_TICKS - 1) <= share ? '' : undefined
									}
								/>
							))}
						</div>
						<div className={styles.scaleLabels} aria-hidden='true'>
							<span>0:00</span>
							<span>{formatTime(duration)}</span>
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
