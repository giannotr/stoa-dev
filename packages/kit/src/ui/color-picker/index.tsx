'use client'

import { type CSSProperties, type PointerEvent, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { cn } from '../../utils/cn'
import styles from './ColorPicker.module.scss'
import {
	DEFAULT_COLOR,
	discTextColor,
	type Hsla,
	hexToHsla,
	hslaToHex,
	normalizeColor,
	PRESETS,
} from './color'

export interface ColorPickerProps {
	/** Displayed hex color. Omit to let the picker own the selection. */
	value?: string
	defaultValue?: string
	/** Emits uppercase #RRGGBB or #RRGGBBAA. */
	onChange?: (color: string) => void
	className?: string
}

const CENTER = 160
const RADIUS = 139
const CHANNELS = ['s', 'l', 'a'] as const

function ringPoint(degrees: number, radius: number) {
	const radians = ((degrees - 90) * Math.PI) / 180
	return {
		x: CENTER + Math.cos(radians) * radius,
		y: CENTER + Math.sin(radians) * radius,
	}
}

const TICKS = Array.from({ length: 72 }, (_, index) => {
	const degrees = index * 5
	const major = degrees % 30 === 0
	const start = ringPoint(degrees, major ? 140 : 145)
	const end = ringPoint(degrees, 151)
	return { degrees, major, x1: start.x, y1: start.y, x2: end.x, y2: end.y }
})

function selectionFromHex(color: string) {
	return { color, hsla: hexToHsla(color) }
}

export function ColorPicker({
	value,
	defaultValue,
	onChange,
	className,
}: ColorPickerProps) {
	const { t } = useTranslation(STOA_NS)
	const id = useId()
	const external =
		value === undefined ? undefined : (normalizeColor(value) ?? DEFAULT_COLOR)
	const [selection, setSelection] = useState(() =>
		selectionFromHex(
			external ?? normalizeColor(defaultValue ?? '') ?? DEFAULT_COLOR,
		),
	)
	const [previousExternal, setPreviousExternal] = useState(external)
	const [draft, setDraft] = useState<{ color: string; text: string }>()
	const [copyResult, setCopyResult] = useState<{
		color: string
		success: boolean
	}>()

	let current = selection
	if (external !== undefined && external !== selection.color) {
		current = selectionFromHex(external)
	}
	if (external !== previousExternal) {
		setPreviousExternal(external)
		setSelection(current)
		setDraft(undefined)
		setCopyResult(undefined)
	}

	const { color, hsla } = current
	const text = draft?.color === color ? draft.text : color
	const hue = Math.round(hsla.h) % 360
	const indicator = ringPoint(hsla.h, RADIUS)
	const title = t('colorPicker.title', 'Color instrument')

	function commit(next: typeof selection) {
		setDraft(undefined)
		setCopyResult(undefined)
		setSelection(next)
		if (next.color !== color) onChange?.(next.color)
	}

	function changeChannel(channel: keyof Hsla, amount: number) {
		const next = { ...hsla, [channel]: amount }
		// Preserve the dial settings when multiple HSL values map to the same hex.
		commit({ color: hslaToHex(next), hsla: next })
	}

	function pointToHue(event: PointerEvent<SVGCircleElement>) {
		const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
		if (!bounds) return
		const x = event.clientX - bounds.left - bounds.width / 2
		const y = event.clientY - bounds.top - bounds.height / 2
		if (x === 0 && y === 0) return
		changeChannel(
			'h',
			(Math.round((Math.atan2(x, -y) * 180) / Math.PI) + 360) % 360,
		)
	}

	function finishEditing() {
		const next = normalizeColor(text)
		if (next && next !== color) commit(selectionFromHex(next))
		else setDraft(undefined)
	}

	async function copyColor() {
		try {
			await navigator.clipboard.writeText(color)
			setCopyResult({ color, success: true })
		} catch {
			setCopyResult({ color, success: false })
		}
	}

	const channelLabels = {
		s: t('colorPicker.saturation', 'Saturation'),
		l: t('colorPicker.lightness', 'Lightness'),
		a: t('colorPicker.opacity', 'Opacity'),
	}

	return (
		<section
			className={cn(styles.picker, className)}
			data-slot='color-picker'
			aria-labelledby={`${id}-title`}
		>
			<header className={styles.header}>
				<h2
					id={`${id}-title`}
					className='font-heading text-2xl leading-snug font-semibold tracking-tight'
				>
					{title}
				</h2>
			</header>
			<div className={styles.wheel}>
				<input
					className={styles.hueInput}
					type='range'
					min={0}
					max={359}
					value={hue}
					onChange={(event) =>
						changeChannel('h', event.currentTarget.valueAsNumber)
					}
					aria-label={t('colorPicker.hue', 'Hue')}
					aria-valuetext={`${hue}°`}
				/>
				<svg viewBox='0 0 320 320' aria-hidden='true'>
					<circle cx={CENTER} cy={CENTER} r={RADIUS} className={styles.track} />
					{TICKS.map(({ degrees, major, ...line }) => (
						<line
							key={degrees}
							{...line}
							className={major ? styles.majorTick : styles.tick}
						/>
					))}
					<circle
						cx={CENTER}
						cy={CENTER}
						r={126}
						className={styles.innerTrack}
					/>
					<circle cx={CENTER} cy={CENTER} r={117} fill='white' />
					<circle cx={CENTER} cy={CENTER} r={117} fill={color} />
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
						className={styles.hueRing}
						onPointerDown={(event) => {
							if (event.button !== 0 || !event.isPrimary) return
							event.currentTarget.setPointerCapture(event.pointerId)
							pointToHue(event)
						}}
						onPointerMove={(event) => {
							if (event.currentTarget.hasPointerCapture(event.pointerId))
								pointToHue(event)
						}}
					/>
				</svg>
				<div
					className={styles.center}
					style={{ color: discTextColor(color, hsla.a) }}
					aria-hidden='true'
				>
					<strong>{color.slice(0, 7)}</strong>
					<span>
						{t('colorPicker.hue', 'Hue')} {String(hue).padStart(3, '0')}°
					</span>
				</div>
			</div>
			<div className={styles.readout}>
				<label className={styles.caption} htmlFor={`${id}-hex`}>
					{t('colorPicker.hex', 'Hex color')}
				</label>
				<div className={styles.hexRow}>
					<input
						id={`${id}-hex`}
						value={text}
						onChange={(event) =>
							setDraft({ color, text: event.currentTarget.value })
						}
						onBlur={finishEditing}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
								event.preventDefault()
								event.currentTarget.blur()
							}
						}}
						spellCheck={false}
					/>
					<button type='button' onClick={copyColor}>
						{t('colorPicker.copy', 'Copy')} <span aria-hidden='true'>↗</span>
					</button>
				</div>
				<span className={styles.caption} role='status'>
					{copyResult?.color === color &&
						(copyResult.success
							? t('colorPicker.copied', 'Color copied')
							: t('colorPicker.copyFailed', 'Could not copy color'))}
				</span>
			</div>
			<div className={styles.controls}>
				{CHANNELS.map((channel) => {
					const amount = Math.round(
						channel === 'a' ? hsla.a * 100 : hsla[channel],
					)
					return (
						<div key={channel} className={styles.control}>
							<label htmlFor={`${id}-${channel}`}>
								{channelLabels[channel]}
							</label>
							<span aria-hidden='true'>{String(amount).padStart(2, '0')}%</span>
							<input
								id={`${id}-${channel}`}
								type='range'
								min={0}
								max={100}
								value={amount}
								aria-valuetext={`${amount}%`}
								onChange={(event) => {
									const next = event.currentTarget.valueAsNumber
									changeChannel(channel, channel === 'a' ? next / 100 : next)
								}}
								style={{ '--progress': `${amount}%` } as CSSProperties}
							/>
						</div>
					)
				})}
			</div>
			<footer className={styles.footer}>
				<fieldset>
					<legend className={styles.caption}>
						{t('colorPicker.presets', 'Quick select')}
					</legend>
					<div className={styles.swatches}>
						{PRESETS.map((preset) => (
							<button
								key={preset}
								type='button'
								aria-label={t('colorPicker.select', {
									defaultValue: 'Select {{color}}',
									color: preset,
								})}
								aria-pressed={color === preset}
								title={preset}
								style={{ backgroundColor: preset }}
								onClick={() => commit(selectionFromHex(preset))}
							/>
						))}
					</div>
				</fieldset>
			</footer>
		</section>
	)
}
