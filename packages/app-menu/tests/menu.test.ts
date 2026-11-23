import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	buildStandardAppMenu,
	buildStandardHelpMenu,
	buildStandardViewMenu,
	buildStandardWindowMenu,
	computeShortVersion,
	isMac,
} from '../src'

const about = { name: 'practicr', version: '1.4.2' }
const year = new Date().getFullYear()

describe('computeShortVersion', () => {
	it('keeps major and minor', () => {
		expect(computeShortVersion('1.4.2')).toBe('1.4')
		expect(computeShortVersion('2.0')).toBe('2.0')
		expect(computeShortVersion('3')).toBe('3')
	})
})

describe('isMac', () => {
	afterEach(() => vi.unstubAllGlobals())

	it('reads the user agent', () => {
		vi.stubGlobal('navigator', {
			userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
		})
		expect(isMac()).toBe(true)
		vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })
		expect(isMac()).toBe(false)
	})

	it('is false without a navigator', () => {
		vi.stubGlobal('navigator', undefined)
		expect(isMac()).toBe(false)
	})
})

describe('buildStandardAppMenu', () => {
	it('builds the macOS app menu with About metadata', () => {
		const menu = buildStandardAppMenu(about)
		expect(menu.text).toBe('practicr')
		expect(
			menu.items?.map((entry) => ('item' in entry ? entry.item : entry)),
		).toEqual([
			{
				About: {
					...about,
					shortVersion: '1.4',
					copyright: `Copyright © ${year} STOA`,
					credits: 'Entwickelt von STOA\nhttps://stoa.berlin',
				},
			},
			'Separator',
			'Services',
			'Separator',
			'Hide',
			'HideOthers',
			'Separator',
			'Quit',
		])
	})

	it('accepts own copyright and credits', () => {
		const menu = buildStandardAppMenu(about, {
			copyright: '© Someone',
			credits: 'Thanks',
		})
		const first = menu.items?.[0] as {
			item: { About: Record<string, unknown> }
		}
		expect(first.item.About).toMatchObject({
			copyright: '© Someone',
			credits: 'Thanks',
		})
	})

	it('gives every menu its own About copy (Tauri mutates icon in place)', () => {
		const withIcon = { ...about, icon: {} as never }
		const app = buildStandardAppMenu(withIcon).items?.[0] as {
			item: { About: object }
		}
		const help = buildStandardHelpMenu('Hilfe', withIcon, { mac: false })
			.items?.[0] as { item: { About: object } }
		expect(app.item.About).not.toBe(help.item.About)
		expect(app.item.About).not.toBe(withIcon)
	})
})

describe('buildStandardViewMenu', () => {
	it('holds the full screen toggle', () => {
		expect(buildStandardViewMenu('Darstellung')).toEqual({
			text: 'Darstellung',
			items: [{ item: 'Fullscreen' }],
		})
	})
})

describe('buildStandardWindowMenu', () => {
	it('adds a separator on macOS only', () => {
		expect(buildStandardWindowMenu('Fenster', { mac: true }).items).toEqual([
			{ item: 'Minimize' },
			{ item: 'Maximize' },
			{ item: 'Separator' },
			{ item: 'CloseWindow' },
		])
		expect(buildStandardWindowMenu('Fenster', { mac: false }).items).toEqual([
			{ item: 'Minimize' },
			{ item: 'Maximize' },
			{ item: 'CloseWindow' },
		])
	})
})

describe('buildStandardHelpMenu', () => {
	it('is empty on macOS and holds About elsewhere', () => {
		expect(buildStandardHelpMenu('Hilfe', about, { mac: true }).items).toEqual(
			[],
		)
		const items = buildStandardHelpMenu('Hilfe', about, { mac: false }).items
		expect(items).toHaveLength(1)
		expect(items?.[0]).toMatchObject({
			item: { About: { name: 'practicr', shortVersion: '1.4' } },
		})
	})
})
