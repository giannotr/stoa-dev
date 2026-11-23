# @stoa-dev/app-menu

Standard-Anwendungsmenüs für Tauri-2-Apps: App-Menü (macOS), Darstellung, Fenster
und Hilfe. Die Bausteine liefern `SubmenuOptions` für `Submenu.new()` aus
`@tauri-apps/api/menu` und sind in allen STOA-Apps gleich; App-spezifisch bleiben
Ablage, Bearbeiten und eigene Einträge.

```bash
npm i @stoa-dev/app-menu
```

`@tauri-apps/api` (Version 2) ist Peer-Abhängigkeit und wird nur für die Typen
gebraucht; das Paket selbst hat keine Laufzeit-Abhängigkeiten.

## Inhalt

| Export | Zweck |
|---|---|
| `buildStandardAppMenu(about, options?)` | macOS-App-Menü: Über, Dienste, Ausblenden, Andere ausblenden, Beenden |
| `buildStandardViewMenu(text)` | Darstellung mit „Vollbild“ |
| `buildStandardWindowMenu(text, { mac? })` | Fenster: Minimieren, Maximieren, Schließen (macOS mit Trennlinie) |
| `buildStandardHelpMenu(text, about, { mac?, ...options })` | Hilfe: auf macOS leer, sonst mit „Über“ |
| `isMac()` | `true` auf macOS, `false` ohne `navigator` (Tests) |
| `computeShortVersion(version)` | `"1.4.2"` → `"1.4"` |
| `About`, `AboutOptions`, `PlatformOptions` | Typen |

`options` (`AboutOptions`) überschreibt `copyright` und `credits` im Über-Fenster;
Standard ist „Copyright © ‹Jahr› STOA“ und „Entwickelt von STOA“. `{ mac }` legt die
Plattform fest, sonst wird sie aus dem User-Agent gelesen. Jedes Über-Element
bekommt eine eigene Kopie der Metadaten, weil Tauri `icon` an Ort und Stelle durch
seine Ressourcen-ID ersetzt.

## Beispiel

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
