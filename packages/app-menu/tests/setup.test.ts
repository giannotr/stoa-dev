import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type FakeItem = {
	id?: string
	text?: string
	accelerator?: string
	enabled?: boolean
	action?: () => void
	setEnabled: ReturnType<typeof vi.fn>
}
type FakeSubmenu = {
	text: string
	items: (FakeItem | { item: unknown })[]
	setAsWindowsMenuForNSApp: ReturnType<typeof vi.fn>
	setAsHelpMenuForNSApp: ReturnType<typeof vi.fn>
}
type FakeMenu = {
	items: FakeSubmenu[]
	setAsAppMenu: ReturnType<typeof vi.fn>
	close: ReturnType<typeof vi.fn>
}

const tauri = vi.hoisted(() => ({ isTauri: true }))
const built: { menus: FakeMenu[] } = vi.hoisted(() => ({ menus: [] }))
const webview = vi.hoisted(() => ({
	setZoom: vi.fn(async (_level: number) => {}),
}))

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.isTauri }))
vi.mock('@tauri-apps/api/webview', () => ({ getCurrentWebview: () => webview }))
vi.mock('@tauri-apps/api/app', () => ({
	getName: async () => 'practicr',
	getVersion: async () => '1.4.2',
	defaultWindowIcon: async () => null,
}))
vi.mock('@tauri-apps/api/menu', () => ({
	MenuItem: {
		new: async (options: Omit<FakeItem, 'setEnabled'>) => {
			const item: FakeItem = { ...options, setEnabled: vi.fn(async () => {}) }
			item.setEnabled.mockImplementation(async (enabled: boolean) => {
				item.enabled = enabled
			})
			return item
		},
	},
	Submenu: {
		new: async (options: { text: string; items: FakeSubmenu['items'] }) => ({
			...options,
			setAsWindowsMenuForNSApp: vi.fn(async () => {}),
			setAsHelpMenuForNSApp: vi.fn(async () => {}),
		}),
	},
	Menu: {
		new: async ({ items }: { items: FakeSubmenu[] }) => {
			const menu = {
				items,
				setAsAppMenu: vi.fn(async () => null),
				close: vi.fn(async () => {}),
			}
			built.menus.push(menu)
			return menu
		},
	},
}))

const { setupStandardAppMenu } = await import('../src')

const german = {
	file: 'Ablage',
	edit: 'Bearbeiten',
	view: 'Darstellung',
	window: 'Fenster',
	help: 'Hilfe',
	actualSize: 'Originalgröße',
	zoomIn: 'Vergrößern',
	zoomOut: 'Verkleinern',
	reload: 'Neu laden',
}
const english = {
	...german,
	file: 'File',
	edit: 'Edit',
	view: 'View',
	window: 'Window',
	help: 'Help',
}
const texts = (menu: FakeMenu) => menu.items.map((submenu) => submenu.text)
const view = (menu: FakeMenu) =>
	menu.items.find((submenu) => submenu.text === german.view) as FakeSubmenu
const entry = (submenu: FakeSubmenu, text: string) =>
	submenu.items.find((item) => 'text' in item && item.text === text) as FakeItem
const storage = new Map<string, string>()

beforeEach(() => {
	tauri.isTauri = true
	built.menus.length = 0
	webview.setZoom.mockClear()
	storage.clear()
	vi.stubGlobal('sessionStorage', {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => storage.set(key, value),
	})
})
afterEach(() => vi.unstubAllGlobals())

describe('setupStandardAppMenu', () => {
	it('does nothing outside Tauri', async () => {
		tauri.isTauri = false
		const stop = await setupStandardAppMenu({ labels: () => german })
		expect(built.menus).toHaveLength(0)
		stop()
	})

	it('builds the macOS menu bar in Tauri order and registers Window and Help', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Macintosh' })
		await setupStandardAppMenu({
			labels: () => german,
			extraMenus: () => [{ text: 'Bibliothek', items: [] }],
		})
		const [menu] = built.menus
		expect(texts(menu)).toEqual([
			'practicr',
			'Ablage',
			'Bearbeiten',
			'Bibliothek',
			'Darstellung',
			'Fenster',
			'Hilfe',
		])
		expect(menu.setAsAppMenu).toHaveBeenCalledOnce()
		expect(menu.items[5].setAsWindowsMenuForNSApp).toHaveBeenCalledOnce()
		expect(menu.items[6].setAsHelpMenuForNSApp).toHaveBeenCalledOnce()
		// File keeps only Close Window: Quit lives in the app menu.
		expect(menu.items[1].items).toEqual([{ item: 'CloseWindow' }])
	})

	it('fills View with full screen (macOS), zoom and reload', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Macintosh' })
		await setupStandardAppMenu({ labels: () => german })
		const items = view(built.menus[0]).items
		expect(
			items.map((item) => ('item' in item ? item.item : item.text)),
		).toEqual([
			'Fullscreen',
			'Separator',
			'Originalgröße',
			'Vergrößern',
			'Verkleinern',
			'Separator',
			'Neu laden',
		])
		const accelerators = items.flatMap((item) =>
			'accelerator' in item ? [item.accelerator] : [],
		)
		expect(accelerators).toEqual([
			'CmdOrCtrl+0',
			'CmdOrCtrl+=',
			'CmdOrCtrl+-',
			'CmdOrCtrl+R',
		])
	})

	it('shows View elsewhere too, without full screen, and puts Quit into File', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0' })
		await setupStandardAppMenu({ labels: () => ({ ...german, file: 'Datei' }) })
		const [menu] = built.menus
		expect(texts(menu)).toEqual([
			'Datei',
			'Bearbeiten',
			'Darstellung',
			'Fenster',
			'Hilfe',
		])
		expect(menu.items[0].items).toEqual([
			{ item: 'CloseWindow' },
			{ item: 'Quit' },
		])
		expect(
			view(menu).items.some(
				(item) => 'item' in item && item.item === 'Fullscreen',
			),
		).toBe(false)
	})

	it('zooms in steps, enables Actual Size off 100 % and remembers the zoom', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Macintosh' })
		await setupStandardAppMenu({ labels: () => german })
		const submenu = view(built.menus[0])
		const actual = entry(submenu, 'Originalgröße')
		expect(actual.enabled).toBe(false)

		entry(submenu, 'Vergrößern').action?.()
		await vi.waitFor(() =>
			expect(webview.setZoom).toHaveBeenLastCalledWith(1.1),
		)
		await vi.waitFor(() => expect(actual.enabled).toBe(true))
		expect(storage.get('stoa-app-menu:zoom')).toBe('1.1')

		entry(submenu, 'Verkleinern').action?.()
		entry(submenu, 'Verkleinern').action?.()
		await vi.waitFor(() =>
			expect(webview.setZoom).toHaveBeenLastCalledWith(0.9),
		)

		actual.action?.()
		await vi.waitFor(() => expect(webview.setZoom).toHaveBeenLastCalledWith(1))
		await vi.waitFor(() => expect(actual.enabled).toBe(false))
	})

	it('restores a remembered zoom after Reload', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Macintosh' })
		storage.set('stoa-app-menu:zoom', '1.5')
		await setupStandardAppMenu({ labels: () => german })
		expect(webview.setZoom).toHaveBeenCalledWith(1.5)
		expect(entry(view(built.menus[0]), 'Originalgröße').enabled).toBe(true)
	})

	it('reloads the page', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Macintosh' })
		const reload = vi.fn()
		vi.stubGlobal('window', { location: { reload } })
		await setupStandardAppMenu({ labels: () => german })
		entry(view(built.menus[0]), 'Neu laden').action?.()
		expect(reload).toHaveBeenCalledOnce()
	})

	it('passes the about options, e.g. appCreationYear, to the app menu', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Macintosh' })
		await setupStandardAppMenu({
			labels: () => german,
			about: { appCreationYear: 2000 },
		})
		const appMenu = built.menus[0].items[0] as unknown as {
			items: { item: { About: { copyright: string } } }[]
		}
		expect(appMenu.items[0].item.About.copyright).toBe(
			`Copyright © 2000–${new Date().getFullYear()} STOA`,
		)
	})

	it('uses the app-specific File and Edit menus', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0' })
		await setupStandardAppMenu({
			labels: () => german,
			fileMenu: ({ labels }) => ({
				text: labels.file,
				items: [{ item: 'Quit' }],
			}),
			editMenu: ({ labels }) => ({ text: `${labels.edit}!`, items: [] }),
		})
		const [menu] = built.menus
		expect(menu.items[0].items).toEqual([{ item: 'Quit' }])
		expect(menu.items[1].text).toBe('Bearbeiten!')
	})

	it('rebuilds on subscribe, closes the previous menu and stops on dispose', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Macintosh' })
		let current = german
		let rebuild = () => {}
		const unsubscribe = vi.fn()
		const stop = await setupStandardAppMenu({
			labels: () => current,
			subscribe: (callback) => {
				rebuild = callback
				return unsubscribe
			},
		})
		current = english
		rebuild()
		await vi.waitFor(() => expect(built.menus).toHaveLength(2))
		expect(texts(built.menus[1])).toContain('Window')
		await vi.waitFor(() => expect(built.menus[0].close).toHaveBeenCalledOnce())

		stop()
		expect(unsubscribe).toHaveBeenCalledOnce()
		rebuild()
		await new Promise((resolve) => setTimeout(resolve, 10))
		expect(built.menus).toHaveLength(2)
	})
})
