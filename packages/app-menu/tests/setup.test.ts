import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const tauri = vi.hoisted(() => ({ isTauri: true }))
const built: { menus: FakeMenu[]; submenus: FakeSubmenu[] } = vi.hoisted(
	() => ({
		menus: [],
		submenus: [],
	}),
)

type FakeSubmenu = {
	text: string
	items: unknown[]
	setAsWindowsMenuForNSApp: ReturnType<typeof vi.fn>
	setAsHelpMenuForNSApp: ReturnType<typeof vi.fn>
}
type FakeMenu = {
	items: FakeSubmenu[]
	setAsAppMenu: ReturnType<typeof vi.fn>
	close: ReturnType<typeof vi.fn>
}

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.isTauri }))
vi.mock('@tauri-apps/api/app', () => ({
	getName: async () => 'practicr',
	getVersion: async () => '1.4.2',
	defaultWindowIcon: async () => null,
}))
vi.mock('@tauri-apps/api/menu', () => ({
	Submenu: {
		new: async (options: { text: string; items: unknown[] }) => {
			const submenu = {
				...options,
				setAsWindowsMenuForNSApp: vi.fn(async () => {}),
				setAsHelpMenuForNSApp: vi.fn(async () => {}),
			}
			built.submenus.push(submenu)
			return submenu
		},
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
}
const english = {
	file: 'File',
	edit: 'Edit',
	view: 'View',
	window: 'Window',
	help: 'Help',
}
const texts = (menu: FakeMenu) => menu.items.map((submenu) => submenu.text)

beforeEach(() => {
	tauri.isTauri = true
	built.menus.length = 0
	built.submenus.length = 0
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

	it('leaves out the app and View menus elsewhere and puts Quit into File', async () => {
		vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0' })
		await setupStandardAppMenu({ labels: () => ({ ...german, file: 'Datei' }) })
		const [menu] = built.menus
		expect(texts(menu)).toEqual(['Datei', 'Bearbeiten', 'Fenster', 'Hilfe'])
		expect(menu.items[0].items).toEqual([
			{ item: 'CloseWindow' },
			{ item: 'Quit' },
		])
		expect(menu.items[3].items).toHaveLength(1)
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
