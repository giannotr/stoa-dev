import { parseHexColor } from '../../utils/colors'

export const DEFAULT_COLOR = '#FF607F'
export const PRESETS = [
	DEFAULT_COLOR,
	'#E23F5A',
	'#FF9BFA',
	'#0070FF',
	'#0093AF',
	'#A226AD',
	'#262629',
	'#F0F0ED',
]

export type Hsla = { h: number; s: number; l: number; a: number }

export function normalizeColor(value: string) {
	const hex = value.trim().replace(/^#/, '')
	if (/^[\da-f]{8}$/i.test(hex)) {
		const canonical = `#${hex.toUpperCase()}`
		return canonical.endsWith('FF') ? canonical.slice(0, 7) : canonical
	}
	return parseHexColor(value)
}

function readChannel(hex: string, offset: number) {
	return Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
}

export function hexToHsla(hex: string): Hsla {
	const r = readChannel(hex, 1)
	const g = readChannel(hex, 3)
	const b = readChannel(hex, 5)
	const a = hex.length === 9 ? readChannel(hex, 7) : 1
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const delta = max - min
	const l = (max + min) / 2
	if (delta === 0) return { h: 0, s: 0, l: l * 100, a }

	let sector = (r - g) / delta + 4
	if (max === r) sector = (g - b) / delta
	else if (max === g) sector = (b - r) / delta + 2

	return {
		h: (sector * 60 + 360) % 360,
		s: (delta / (1 - Math.abs(2 * l - 1))) * 100,
		l: l * 100,
		a,
	}
}

export function hslaToHex({ h, s, l, a }: Hsla) {
	const lightness = l / 100
	const chroma = (s / 100) * Math.min(lightness, 1 - lightness)

	function channel(offset: number) {
		const position = (offset + h / 30) % 12
		return (
			lightness - chroma * Math.max(-1, Math.min(position - 3, 9 - position, 1))
		)
	}

	const hex = [channel(0), channel(8), channel(4), a]
		.map((value) =>
			Math.round(value * 255)
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')
		.toUpperCase()
	return hex.endsWith('FF') ? `#${hex.slice(0, 6)}` : `#${hex}`
}

// The disc composites transparent colors over white.
export function discTextColor(hex: string, alpha: number) {
	const [r, g, b] = [1, 3, 5].map((offset) => {
		const channel = readChannel(hex, offset) * alpha + 1 - alpha
		return channel <= 0.04045
			? channel / 12.92
			: ((channel + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#000' : '#fff'
}
