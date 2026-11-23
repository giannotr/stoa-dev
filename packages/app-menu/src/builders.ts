import type { Image } from '@tauri-apps/api/image'
import type { AboutMetadata, SubmenuOptions } from '@tauri-apps/api/menu'

/** What the About panel shows. */
export type About = {
	name: string
	version: string
	icon?: Image
}

/** Overrides for the About panel; defaults name STOA. */
export type AboutOptions = {
	/** Defaults to "Copyright © <current year> STOA". */
	copyright?: string
	/** Defaults to "Entwickelt von STOA\nhttps://stoa.berlin". */
	credits?: string
}

/** Pins the platform instead of reading the user agent, e.g. in tests. */
export type PlatformOptions = {
	mac?: boolean
}

/** True on macOS; false where there is no `navigator` (tests, SSR). */
export function isMac() {
	return typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
}

/** "1.2.3" → "1.2", "4" → "4". */
export function computeShortVersion(longVersion: string) {
	const [major, minor] = longVersion.split('.')
	return minor === undefined ? major : `${major}.${minor}`
}

/**
 * About metadata as a fresh object: Tauri's JS replaces `icon` in place with
 * its resource id, so every About item needs its own copy.
 */
function aboutMetadata(
	about: About,
	options: AboutOptions = {},
): AboutMetadata {
	return {
		...about,
		shortVersion: computeShortVersion(about.version),
		copyright:
			options.copyright ?? `Copyright © ${new Date().getFullYear()} STOA`,
		credits: options.credits ?? 'Entwickelt von STOA\nhttps://stoa.berlin',
	}
}

/**
 * The macOS app menu (the first submenu, named after the app): About,
 * Services, Hide, Hide Others and Quit.
 */
export function buildStandardAppMenu(
	about: About,
	options: AboutOptions = {},
): SubmenuOptions {
	return {
		text: about.name,
		items: [
			{ item: { About: aboutMetadata(about, options) } },
			{ item: 'Separator' },
			{ item: 'Services' },
			{ item: 'Separator' },
			{ item: 'Hide' },
			{ item: 'HideOthers' },
			{ item: 'Separator' },
			{ item: 'Quit' },
		],
	}
}

/** View menu with the native full screen toggle (macOS). */
export function buildStandardViewMenu(text: string): SubmenuOptions {
	return {
		text,
		items: [{ item: 'Fullscreen' }],
	}
}

/** Window menu: Minimize, Maximize and Close; macOS adds a separator. */
export function buildStandardWindowMenu(
	text: string,
	{ mac = isMac() }: PlatformOptions = {},
): SubmenuOptions {
	return {
		text,
		items: [
			{ item: 'Minimize' },
			{ item: 'Maximize' },
			...(mac ? [{ item: 'Separator' } as const] : []),
			{ item: 'CloseWindow' },
		],
	}
}

/**
 * Help menu. macOS shows "About" in the app menu, so it stays empty there
 * (the OS adds its search field); elsewhere it holds the About item.
 */
export function buildStandardHelpMenu(
	text: string,
	about: About,
	{ mac = isMac(), ...options }: PlatformOptions & AboutOptions = {},
): SubmenuOptions {
	return {
		text,
		items: mac ? [] : [{ item: { About: aboutMetadata(about, options) } }],
	}
}

/**
 * File menu as in the STOA apps: Close Window, plus Quit where there is no
 * macOS app menu to hold it.
 */
export function buildStandardFileMenu(
	text: string,
	{ mac = isMac() }: PlatformOptions = {},
): SubmenuOptions {
	return {
		text,
		items: [
			{ item: 'CloseWindow' },
			...(mac ? [] : [{ item: 'Quit' } as const]),
		],
	}
}

/** Edit menu with the native Undo, Redo, Cut, Copy, Paste and Select All. */
export function buildStandardEditMenu(text: string): SubmenuOptions {
	return {
		text,
		items: [
			{ item: 'Undo' },
			{ item: 'Redo' },
			{ item: 'Separator' },
			{ item: 'Cut' },
			{ item: 'Copy' },
			{ item: 'Paste' },
			{ item: 'SelectAll' },
		],
	}
}
