/** Accepts `#rgb`, `#rrggbb`, with or without `#`; returns `#RRGGBB` or null. */
export function parseHexColor(value: string) {
	const hex = value.trim().replace(/^#/, '')
	if (/^[\da-f]{3}$/i.test(hex))
		return `#${[...hex].map((char) => char + char).join('')}`.toUpperCase()
	if (/^[\da-f]{6}$/i.test(hex)) return `#${hex}`.toUpperCase()
	return null
}
