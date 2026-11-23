/** Zoom stops of the View menu, like in browsers (50 % to 300 %). */
export const ZOOM_STEPS = [
	0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3,
] as const

/** Next stop up (1) or down (-1); stays put at the ends. */
export function stepZoom(level: number, direction: 1 | -1) {
	const next =
		direction > 0
			? ZOOM_STEPS.find((step) => step > level + 0.001)
			: [...ZOOM_STEPS].reverse().find((step) => step < level - 0.001)
	return next ?? level
}

const STORAGE_KEY = 'stoa-app-menu:zoom'

/** The zoom of this session; survives "Reload", resets on a new app start. */
export function readStoredZoom() {
	try {
		const value = Number(sessionStorage.getItem(STORAGE_KEY))
		return ZOOM_STEPS.some((step) => step === value) ? value : 1
	} catch {
		return 1
	}
}

export function storeZoom(level: number) {
	try {
		sessionStorage.setItem(STORAGE_KEY, String(level))
	} catch {
		// Storage can be unavailable; zoom then simply resets on reload.
	}
}
