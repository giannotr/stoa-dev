'use client'

import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react'
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
import { useCloseAction } from '../dialog'
import styles from './FileViewer.module.scss'

export type FileViewerKind = 'image' | 'pdf'

export interface FileViewerProps {
	/** File URL; `null` while the app is still resolving it. */
	src: string | null
	/** File name: heading, alt text and the source of the default `kind`. */
	name: string
	/** Defaults to `pdf` for `*.pdf` names, otherwise `image`. */
	kind?: FileViewerKind
	/** Extra caption next to the kind, e.g. the file size. */
	description?: ReactNode
	/** Position in a collection (0-based) for paging. */
	index?: number
	count?: number
	onIndexChange?: (index: number) => void
	/** Shown instead of the default message when the file cannot be displayed. */
	errorMessage?: ReactNode
	/** Extra actions below the controls, e.g. "open in default app". */
	footer?: ReactNode
	onError?: () => void
	/**
	 * Shows an own close button (and Escape outside of dialogs). It calls
	 * `onClose`, closes a surrounding kit Dialog, or else hides the component.
	 */
	closable?: boolean
	/** Called by the close button; optional inside a kit Dialog. */
	onClose?: () => void
	className?: string
}

/** Zoom stops of the scale; `null` (fit) sits outside the scale. */
export const FILE_VIEWER_ZOOM_STEPS = [
	0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4,
] as const
const STEPS = FILE_VIEWER_ZOOM_STEPS
const DOTS_MAX = 12

function nearestStep(scale: number) {
	let best = 0
	for (let index = 1; index < STEPS.length; index += 1)
		if (Math.abs(STEPS[index] - scale) < Math.abs(STEPS[best] - scale))
			best = index
	return best
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * In-app viewer for images and PDFs in the instrument style: a stage with
 * viewfinder marks, a straight zoom scale, and paging through a collection.
 * PDFs use the webview's own PDF viewer (pages, scrolling, zoom).
 */
export function FileViewer({
	src,
	name,
	kind,
	description,
	index = 0,
	count = 1,
	onIndexChange,
	errorMessage,
	footer,
	onError,
	closable = false,
	onClose,
	className,
}: FileViewerProps) {
	const { t } = useTranslation(STOA_NS)
	const id = useId()
	const image = useRef<HTMLImageElement>(null)
	const [failed, setFailed] = useState(false)
	// `null` fits the image into the stage.
	const [zoom, setZoom] = useState<number | null>(null)
	const [naturalWidth, setNaturalWidth] = useState(0)
	// The scale the fitted image is shown at, measured from the layout.
	const [fitScale, setFitScale] = useState(1)
	const { close, dismissed, insideDialog } = useCloseAction(onClose)

	// A new file starts fitted (reset during render, no extra effect).
	const [previousSrc, setPreviousSrc] = useState(src)
	if (src !== previousSrc) {
		setPreviousSrc(src)
		setFailed(false)
		setZoom(null)
		setNaturalWidth(0)
		setFitScale(1)
	}

	const type: FileViewerKind = kind ?? (/\.pdf$/i.test(name) ? 'pdf' : 'image')
	const pdf = type === 'pdf'
	const ready = src !== null && !failed
	const paging = count > 1 && Boolean(onIndexChange)

	function go(step: number) {
		if (!paging) return
		onIndexChange?.((index + step + count) % count)
	}

	useEffect(() => {
		const element = image.current
		if (zoom !== null || !element || !naturalWidth) return
		const measure = () => setFitScale(element.clientWidth / naturalWidth)
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(element)
		return () => observer.disconnect()
	}, [zoom, naturalWidth])

	/** The scale the image is shown at right now, also while fitted. */
	const shownScale = () => zoom ?? fitScale

	function zoomBy(direction: 1 | -1) {
		const from = shownScale()
		const next =
			direction > 0
				? STEPS.find((step) => step > from + 0.001)
				: [...STEPS].reverse().find((step) => step < from - 0.001)
		if (next !== undefined) setZoom(next)
	}

	function fail() {
		setFailed(true)
		onError?.()
	}

	function onKeyDown(event: KeyboardEvent) {
		if (
			event.key === 'Escape' &&
			closable &&
			!insideDialog &&
			!event.defaultPrevented
		) {
			event.preventDefault()
			close()
			return
		}
		const target = event.target as HTMLElement
		if (target.closest('input, textarea, select')) return
		if (event.key === 'ArrowLeft' && paging) {
			event.preventDefault()
			go(-1)
		} else if (event.key === 'ArrowRight' && paging) {
			event.preventDefault()
			go(1)
		} else if (pdf || !ready) return
		else if (event.key === '+' || event.key === '=') zoomBy(1)
		else if (event.key === '-') zoomBy(-1)
		else if (event.key === '0') setZoom(null)
	}

	const stepIndex = nearestStep(ready ? shownScale() : 1)
	const percent = `${Math.round((zoom ?? shownScale()) * 100)} %`
	const caption = [t(pdf ? 'fileViewer.pdf' : 'fileViewer.image')]
	const position = t('fileViewer.position', { current: index + 1, count })

	if (closable && dismissed) return null

	return (
		<section
			className={cn(styles.viewer, className)}
			data-slot='file-viewer'
			data-kind={type}
			data-zoomed={zoom !== null || undefined}
			aria-labelledby={`${id}-title`}
			onKeyDown={onKeyDown}
		>
			<header className={styles.header}>
				<div className={styles.heading}>
					<h2
						id={`${id}-title`}
						className='truncate font-heading text-2xl leading-snug font-semibold tracking-tight'
					>
						{name || t('fileViewer.title')}
					</h2>
					<p className={styles.caption}>
						{caption}
						{description && <> · {description}</>}
					</p>
				</div>
				{count > 1 && (
					<span className={styles.index} title={position}>
						<span className='sr-only'>{position}</span>
						<span aria-hidden='true'>
							{pad(index + 1)} / {pad(count)}
						</span>
					</span>
				)}
				{closable && (
					<button
						type='button'
						className={styles.close}
						aria-label={t('actions.close')}
						title={t('actions.close')}
						onClick={close}
					>
						<X />
					</button>
				)}
			</header>

			<div className={styles.stage}>
				{/* Viewfinder marks behind the content: decoration only. */}
				<div className={styles.marks} aria-hidden='true'>
					<i data-corner='tl' />
					<i data-corner='tr' />
					<i data-corner='bl' />
					<i data-corner='br' />
					<i data-edge='top' />
					<i data-edge='bottom' />
					<i data-edge='left' />
					<i data-edge='right' />
					<i data-center='' />
				</div>
				<div className={styles.viewport}>
					{failed ? (
						<p className={styles.error} role='alert'>
							{errorMessage ?? t('fileViewer.error')}
						</p>
					) : src === null ? (
						<p className={styles.loading} role='status'>
							{t('fileViewer.loading')}
						</p>
					) : pdf ? (
						<iframe key={src} src={src} title={name} className={styles.pdf} />
					) : (
						<div className={styles.canvas}>
							<img
								ref={image}
								key={src}
								src={src}
								alt={name}
								className={styles.image}
								style={
									zoom === null || !naturalWidth
										? undefined
										: {
												width: naturalWidth * zoom,
												maxWidth: 'none',
												maxHeight: 'none',
											}
								}
								onLoad={(event) =>
									setNaturalWidth(event.currentTarget.naturalWidth)
								}
								onError={fail}
							/>
						</div>
					)}
				</div>
			</div>

			<div className={styles.controls}>
				{paging && (
					<div className={styles.paging}>
						<button
							type='button'
							className={styles.round}
							aria-label={t('fileViewer.previous')}
							title={t('fileViewer.previous')}
							onClick={() => go(-1)}
						>
							<ChevronLeft />
						</button>
						{count <= DOTS_MAX ? (
							<ol className={styles.dots} aria-label={position}>
								{Array.from({ length: count }, (_, dot) => (
									<li
										// biome-ignore lint/suspicious/noArrayIndexKey: one dot per position
										key={dot}
										aria-current={dot === index ? 'true' : undefined}
									/>
								))}
							</ol>
						) : (
							<span className={styles.counter} aria-hidden='true'>
								{pad(index + 1)} / {pad(count)}
							</span>
						)}
						<button
							type='button'
							className={styles.round}
							aria-label={t('fileViewer.next')}
							title={t('fileViewer.next')}
							onClick={() => go(1)}
						>
							<ChevronRight />
						</button>
					</div>
				)}

				{!pdf && (
					<div className={styles.zoom}>
						<button
							type='button'
							className={styles.round}
							disabled={!ready || stepIndex === 0}
							aria-label={t('fileViewer.zoomOut')}
							title={t('fileViewer.zoomOut')}
							onClick={() => zoomBy(-1)}
						>
							<Minus />
						</button>
						<div className={styles.scale}>
							<input
								className={styles.slider}
								type='range'
								min={0}
								max={STEPS.length - 1}
								step={1}
								value={stepIndex}
								disabled={!ready}
								aria-label={t('fileViewer.zoom')}
								aria-valuetext={
									zoom === null
										? `${t('fileViewer.fit')} (${percent})`
										: percent
								}
								style={
									{
										'--progress': `${(stepIndex / (STEPS.length - 1)) * 100}%`,
									} as CSSProperties
								}
								onChange={(event) =>
									setZoom(STEPS[event.currentTarget.valueAsNumber])
								}
							/>
							<div className={styles.ruler} aria-hidden='true'>
								{STEPS.map((step, tick) => (
									<i
										key={step}
										data-major={step === 1 || undefined}
										data-passed={tick <= stepIndex || undefined}
									/>
								))}
							</div>
						</div>
						<button
							type='button'
							className={styles.round}
							disabled={!ready || stepIndex === STEPS.length - 1}
							aria-label={t('fileViewer.zoomIn')}
							title={t('fileViewer.zoomIn')}
							onClick={() => zoomBy(1)}
						>
							<Plus />
						</button>
						<span className={styles.readout} aria-hidden='true'>
							{percent}
						</span>
						<button
							type='button'
							className={styles.fit}
							disabled={!ready}
							aria-pressed={zoom === null}
							onClick={() => setZoom(zoom === null ? 1 : null)}
						>
							{t('fileViewer.fit')}
						</button>
					</div>
				)}
			</div>

			{footer && <footer className={styles.footer}>{footer}</footer>}
		</section>
	)
}
