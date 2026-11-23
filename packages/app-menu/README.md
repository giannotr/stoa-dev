# @stoa-dev/app-menu

Standard-Anwendungsmenüs für Tauri-2-Apps. `setupStandardAppMenu()` baut die ganze
Menüleiste so auf wie Tauris Standardmenü (App-Menü auf macOS, Ablage, Bearbeiten,
Darstellung, Fenster, Hilfe) und baut sie bei Sprachwechseln neu auf. Die App
liefert nur die Beschriftungen und, wenn sie möchte, eigene Ablage- und
Bearbeiten-Menüs.

```bash
npm i @stoa-dev/app-menu
```

`@tauri-apps/api` (Version 2) ist Peer-Abhängigkeit. Eine Übersetzungsbibliothek
braucht das Paket nicht: Beschriftungen und Sprachwechsel kommen über Callbacks.

## Schnellstart

So sieht `src/lib/menu.ts` einer App damit aus (hier mit i18next):

```ts
import { setupStandardAppMenu } from '@stoa-dev/app-menu'
import i18next from 'i18next'

const scope = 'common.app.menu'

export async function setupAppMenu() {
	if (!i18next.isInitialized)
		await new Promise((resolve) => i18next.on('initialized', resolve))

	return setupStandardAppMenu({
		labels: ({ mac }) => ({
			file: i18next.t(mac ? `${scope}.fileMac` : `${scope}.file`),
			edit: i18next.t(`${scope}.edit`),
			view: i18next.t(`${scope}.view`),
			window: i18next.t(`${scope}.window`),
			help: i18next.t(`${scope}.help`),
		}),
		// Optional; ohne diese beiden gelten buildStandardFileMenu/-EditMenu.
		fileMenu: ({ labels, mac }) => ({
			text: labels.file,
			items: [{ item: 'CloseWindow' }, ...(mac ? [] : [{ item: 'Quit' } as const])],
		}),
		editMenu: ({ labels }) => ({
			text: labels.edit,
			items: [{ item: 'Undo' }, { item: 'Redo' }, { item: 'Separator' }, { item: 'Cut' }, { item: 'Copy' }, { item: 'Paste' }, { item: 'SelectAll' }],
		}),
		subscribe: (rebuild) => {
			i18next.on('languageChanged', rebuild)
			return () => i18next.off('languageChanged', rebuild)
		},
	})
}
```

`setupStandardAppMenu` tut außerhalb von Tauri nichts (Browser-Vorschau), lädt Name,
Version und Icon der App, setzt das Menü, meldet auf macOS Fenster- und Hilfe-Menü
an, baut bei jedem `rebuild()` neu auf (der Reihe nach, das alte Menü wird
geschlossen) und liefert eine Funktion zum Beenden zurück. Weitere Optionen:
`extraMenus` (eigene Menüs zwischen Bearbeiten und Darstellung), `about`
(Copyright und Credits), `onError`.

## Inhalt

| Export | Zweck |
|---|---|
| `setupStandardAppMenu(options)` | ganze Menüleiste setzen und aktuell halten (siehe oben) |
| `buildStandardFileMenu(text, { mac? })` | Ablage: Fenster schließen, außerhalb von macOS auch Beenden |
| `buildStandardEditMenu(text)` | Bearbeiten: Widerrufen, Wiederholen, Ausschneiden, Kopieren, Einsetzen, Alles auswählen |
| `buildStandardAppMenu(about, options?)` | macOS-App-Menü: Über, Dienste, Ausblenden, Andere ausblenden, Beenden |
| `buildStandardViewMenu(text)` | Darstellung mit „Vollbild“ |
| `buildStandardWindowMenu(text, { mac? })` | Fenster: Minimieren, Maximieren, Schließen (macOS mit Trennlinie) |
| `buildStandardHelpMenu(text, about, { mac?, ...options })` | Hilfe: auf macOS leer, sonst mit „Über“ |
| `isMac()` | `true` auf macOS, `false` ohne `navigator` (Tests) |
| `computeShortVersion(version)` | `"1.4.2"` → `"1.4"` |
| `copyrightYears(appCreationYear, currentYear?)` | `2024` → `"2024–2026"`, im ersten Jahr `"2026"` |
| `About`, `AboutOptions`, `PlatformOptions`, `AppMenuLabels`, `AppMenuContext`, `StandardAppMenuOptions` | Typen |

`options` (`AboutOptions`) steuert das Über-Fenster: `appCreationYear: 2024` ergibt
„Copyright © 2024–2026 STOA“ (im ersten Jahr nur „© 2026“), `copyright` ersetzt die
Zeile ganz, `credits` den Entwickler-Hinweis (Standard „Entwickelt von STOA“). Mit
`setupStandardAppMenu` gibt man sie als `about: { appCreationYear: 2024 }` mit. `{ mac }` legt die
Plattform fest, sonst wird sie aus dem User-Agent gelesen. Jedes Über-Element
bekommt eine eigene Kopie der Metadaten, weil Tauri `icon` an Ort und Stelle durch
seine Ressourcen-ID ersetzt.

## Einzelne Bausteine

Wer die Menüleiste selbst zusammensetzen will, nutzt die Builder direkt:

```ts
import { defaultWindowIcon, getName, getVersion } from '@tauri-apps/api/app'
import { Menu, Submenu } from '@tauri-apps/api/menu'
import {
	buildStandardAppMenu,
	buildStandardHelpMenu,
	buildStandardViewMenu,
	buildStandardWindowMenu,
	isMac,
} from '@stoa-dev/app-menu'

const [name, version, icon] = await Promise.all([getName(), getVersion(), defaultWindowIcon()])
const about = { name, version, icon: icon ?? undefined }
const mac = isMac()

const appMenu = mac ? [await Submenu.new(buildStandardAppMenu(about))] : []
const fileMenu = await Submenu.new({
	text: mac ? 'Ablage' : 'Datei',
	items: [{ item: 'CloseWindow' }, ...(mac ? [] : [{ item: 'Quit' } as const])],
})
const viewMenu = mac ? [await Submenu.new(buildStandardViewMenu('Darstellung'))] : []
const windowMenu = await Submenu.new(buildStandardWindowMenu('Fenster'))
const helpMenu = await Submenu.new(buildStandardHelpMenu('Hilfe', about))

const menu = await Menu.new({ items: [...appMenu, fileMenu, ...viewMenu, windowMenu, helpMenu] })
await menu.setAsAppMenu()
if (mac) {
	await windowMenu.setAsWindowsMenuForNSApp()
	await helpMenu.setAsHelpMenuForNSApp()
}
```
