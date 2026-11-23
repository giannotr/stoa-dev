import { defaultWindowIcon, getName, getVersion } from '@tauri-apps/api/app'
import { isTauri } from '@tauri-apps/api/core'
import { Menu, Submenu, type SubmenuOptions } from '@tauri-apps/api/menu'
import {
	type About,
	type AboutOptions,
	buildStandardAppMenu,
	buildStandardEditMenu,
	buildStandardFileMenu,
	buildStandardHelpMenu,
	buildStandardViewMenu,
	buildStandardWindowMenu,
	isMac,
} from './builders'

/** Submenu names; re-read on every build so they follow the app language. */
export type AppMenuLabels = {
	/** Usually "Ablage" on macOS and "Datei" elsewhere. */
	file: string
	edit: string
	view: string
	window: string
	help: string
}

/** What the app's own menu builders get. */
export type AppMenuContext = {
	mac: boolean
	about: About
	labels: AppMenuLabels
}

export type StandardAppMenuOptions = {
	/** Called before each build, e.g. `() => ({ file: t('menu.file'), … })`. */
	labels: (context: { mac: boolean }) => AppMenuLabels
	/** Defaults to buildStandardFileMenu. */
	fileMenu?: (context: AppMenuContext) => SubmenuOptions
	/** Defaults to buildStandardEditMenu. */
	editMenu?: (context: AppMenuContext) => SubmenuOptions
	/** Extra menus between Edit and View, e.g. a "Library" menu. */
	extraMenus?: (context: AppMenuContext) => SubmenuOptions[]
	/** Copyright and credits in the About panel. */
	about?: AboutOptions
	/**
	 * Rebuild trigger, e.g. language changes:
	 * `(rebuild) => { i18next.on('languageChanged', rebuild); return () => i18next.off('languageChanged', rebuild) }`
	 */
	subscribe?: (rebuild: () => void) => (() => void) | undefined
	/** Defaults to console.error. */
	onError?: (error: unknown) => void
}

async function loadAbout(onError: (error: unknown) => void): Promise<About> {
	const [name, version, icon] = await Promise.all([
		getName(),
		getVersion(),
		// The app icon from tauri.conf.json, embedded into the binary at build time.
		defaultWindowIcon().catch((error: unknown) => {
			onError(error)
			return null
		}),
	])
	return { name, version, icon: icon ?? undefined }
}

/**
 * Builds and sets the app menu the way Tauri's default menu does
 * (`Menu::default` in tauri 2): an app menu on macOS, then File, Edit, the
 * extra menus, View (macOS only), Window and Help. Only File and Edit are
 * app-specific. Rebuilds when `subscribe` reports a change and closes the
 * previous menu. Outside Tauri it does nothing.
 *
 * Resolves to a function that stops the rebuilds.
 */
export async function setupStandardAppMenu({
	labels,
	fileMenu = ({ labels, mac }) => buildStandardFileMenu(labels.file, { mac }),
	editMenu = ({ labels }) => buildStandardEditMenu(labels.edit),
	extraMenus,
	about: aboutOptions,
	subscribe,
	onError = (error) => console.error('Building the app menu failed', error),
}: StandardAppMenuOptions): Promise<() => void> {
	if (!isTauri()) return () => {}

	const mac = isMac()
	const about = await loadAbout(onError)

	async function build() {
		const context: AppMenuContext = { mac, about, labels: labels({ mac }) }
		const text = context.labels

		// macOS: the first submenu becomes the app menu, named after the app.
		const appMenu = mac
			? [await Submenu.new(buildStandardAppMenu(about, aboutOptions))]
			: []
		const ownMenus = await Promise.all(
			[
				fileMenu(context),
				editMenu(context),
				...(extraMenus?.(context) ?? []),
			].map((options) => Submenu.new(options)),
		)
		const viewMenu = mac
			? [await Submenu.new(buildStandardViewMenu(text.view))]
			: []
		const windowMenu = await Submenu.new(
			buildStandardWindowMenu(text.window, { mac }),
		)
		const helpMenu = await Submenu.new(
			buildStandardHelpMenu(text.help, about, { mac, ...aboutOptions }),
		)

		const menu = await Menu.new({
			items: [...appMenu, ...ownMenus, ...viewMenu, windowMenu, helpMenu],
		})
		await menu.setAsAppMenu()

		if (mac) {
			// macOS adds the window list to this menu and the search field to Help.
			await windowMenu.setAsWindowsMenuForNSApp()
			await helpMenu.setAsHelpMenuForNSApp()
		}
		return menu
	}

	let current = await build()
	// Rebuilds run one after another, so a quick series of changes ends with the latest.
	let queue = Promise.resolve()
	let stopped = false

	const unsubscribe = subscribe?.(() => {
		queue = queue
			.then(async () => {
				if (stopped) return
				const next = await build()
				void current.close()
				current = next
			})
			.catch(onError)
	})

	return () => {
		stopped = true
		unsubscribe?.()
	}
}
