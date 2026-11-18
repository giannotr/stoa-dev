# @stoa-dev/kit

Gemeinsame React-Komponenten, Hooks, Hilfsfunktionen, Lizenz-UI und Theme der STOA-Desktop-Apps.

| Import | Inhalt |
|---|---|
| `@stoa-dev/kit/ui` | shadcn-Primitives (Button, Dialog, Select, Calendar, …) |
| `@stoa-dev/kit/shell` | AppNavigation, SectionNavigation, PageHeading, BrandLines, Spinner, BackHomeButton, ErrorBoundary, ConfirmDialog, DatePickerInput, NativeSelect, UploadButton, StartupProvider/`useStartup`, StartupAnimation, SaveStatus, TagInput, ValidatedInput, ExternalLink, AnimatedSwap |
| `@stoa-dev/kit/display` | MarginaliaPair, Marginalia, MarginaliaFramed, TimeMeasured, ProgressBar, BarChart/BarChartItem |
| `@stoa-dev/kit/licensing` | LicenseProvider/`useLicense`, LicenseGate, LicenseCard, LicenseActivation, LicenseStatusBanner, Tauri-API |
| `@stoa-dev/kit/autosave` | `createAutosave<T>()`, typisierte Provider/Hooks, `AutosaveController` |
| `@stoa-dev/kit/hooks` | `useOnlineStatus`, `useRouting<Route>()` |
| `@stoa-dev/kit/utils` | `cn`, `formatDate`, `formatTimestamp`, `parseHexColor`, `SaveFeedback`, … |
| `@stoa-dev/kit/i18n` | `registerStoaLocales`, `supportedLanguages`, Namespace `stoa` (de, de-AT, en, it) |
| `@stoa-dev/kit/theme.css` | Tailwind-4-Tokens (shadcn-Variablen + STOA-Extras), Quelle für die App-Tailwind |
| `@stoa-dev/kit/instrument.css` | Skin „Instrument“ (siehe unten) |
| `@stoa-dev/kit/styles.css` | Kompilierte SCSS-Module der Komponenten |
| `@stoa-dev/kit/scss` | SCSS-Werkzeuge (`reduced-motion`, `dark`, `accent-mix`, …) für App-Module |

## Einbindung in eine App

```bash
npm i @stoa-dev/kit sass-embedded
```

```css
/* src/App.css */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@stoa-dev/kit/theme.css";
@import "@stoa-dev/kit/styles.css";
@source "../node_modules/@stoa-dev/kit/dist";   /* Tailwind 4 scannt node_modules nicht von selbst */

:root { --stoa-accent: #0093af; }            /* Akzent je App */
```

```ts
// src/i18n.ts – nach i18next.init(...)
import { registerStoaLocales } from '@stoa-dev/kit/i18n'
registerStoaLocales(i18next)
```

```tsx
// App-Navigation
import { AppNavigation, AppNavigationThemeToggle } from '@stoa-dev/kit/shell'

<AppNavigation
  logo='/practicr.svg'
  groups={[
    [{ path: '/', label: t('common.app.home'), Icon: Home }],
    [<AppNavigationThemeToggle key='theme' theme={settings.theme} onToggle={saveTheme} disabled={!canWrite} />],
    [{ path: '/settings', label: t('common.app.settings'), Icon: Settings }],
  ]}
/>
```

```tsx
// Lizenz-Gate mit Startup-Overlay der App
<LicenseProvider>
  <LicenseGate onInteractionRequired={finishStartup}>…</LicenseGate>
</LicenseProvider>
```

## Konventionen

- **Ein Ordner je Komponente**: `Name/index.tsx` und optional `Name/Name.module.scss`.
- **Tailwind liefert Layout und Abstände**, SCSS-Module den eigenen Anstrich (Pseudo-Elemente,
  Animationen, Zustände). Farben immer über CSS-Variablen, damit Theming zur Laufzeit greift.
- Klassen aus Modulen heißen `stoa-<Komponente>-<klasse>-<hash>` und lassen sich so in Apps gezielt
  überschreiben.
- Keine App-Imports (`@/…`) im Paket: App-Spezifisches kommt über Props/Callbacks herein.
- Texte liegen im i18next-Namespace `stoa`; einzelne Strings überschreibt eine App mit
  `registerStoaLocales(i18next, { de: { app: { back: 'Zurück' } } })`.

## Lokale Entwicklung

```bash
cd stoa-dev && npm run dev          # baut bei Änderungen neu
cd ../practicr && npm link ../stoa-dev/packages/kit
```

Vite: Bei verlinkten Paketen `resolve.dedupe: ['react', 'react-dom', 'react-router', 'i18next', 'react-i18next']`
setzen, damit Kontext-Provider (Router, i18n) nicht doppelt geladen werden.

## Skin „Instrument“

Ruhiges, monochromes Instrumenten-Design: papiergraue, stark gerundete Flächen mit viel Luft,
kräftige Linien, Mono-Versalien für Beschriftungen und Buttons, Pillen-Buttons und Schwarz
für aktive Zustände (auch die hervorgehobene Zeile im Kontextmenü).
Die App-Akzentfarbe bleibt nur als kleiner Indikator erhalten.

```css
@import "@stoa-dev/kit/theme.css";
@import "@stoa-dev/kit/instrument.css";
```

Aktiv wird er mit der Klasse `stoa-instrument` auf `<html>` (zusammen mit `dark` für die dunkle
Variante). Der Skin greift nur über `data-slot`-Attribute und braucht für die Beschriftungen
die Schriften „Mona Sans“ und „Mona Sans Mono“ (github.com/github/mona-sans, SIL OFL; sonst
Fallback auf Geist bzw. die System-Monospace). Im Storybook über die
Toolbar „Design“ umschaltbar.


## Autosave und manuelles Speichern

`createAutosave<T>()` erzeugt ein zusammengehöriges Paar aus `AutosaveProvider`
und `useAutosave`. Die Factory einmal auf Modulebene aufrufen. Jeder gemountete
Provider hält einen unabhängigen Datensatz und dessen Schreibwarteschlange.

```tsx
import { createAutosave } from '@stoa-dev/kit/autosave'

type Preferences = { language: string; theme: 'light' | 'dark' }
export const { AutosaveProvider, useAutosave } = createAutosave<Preferences>()

// Erst nach erfolgreichem Laden mounten; initialValue gilt als bereits gespeichert.
// savePreferences muss erst auflösen, wenn die Speicherung abgeschlossen ist.
<AutosaveProvider
  initialValue={loadedPreferences}
  save={savePreferences}
  enabled={canWrite}
  debounceMs={600}
  maxWaitMs={5000}
>
  <PreferencesEditor />
</AutosaveProvider>

function PreferencesEditor() {
  const { value, setValue, dirty, status, error, flush, retry } = useAutosave()
  // Beispiel für ein Formularfeld:
  // setValue(previous => ({ ...previous, language: 'it' }))
  // Manueller Button: await flush(); Fehler anzeigen oder über status behandeln.
  // Wiederholen nach Fehler: await retry().
  return <button disabled={!dirty || status === 'saving'}
    onClick={() => { void flush().catch(console.error) }}>Speichern</button>
}
```

- `value` immer unveränderlich aktualisieren; vorhandene Objekte nicht mutieren.
  Nur gültige Daten an `setValue` übergeben. Unvollständige Formulartexte separat
  halten. Ein abgelehnter `save`-Aufruf bewahrt den neuesten Entwurf.
- Standard: Speicherung nach 600 ms Eingabepause, spätestens nach 5 s fortlaufender
  Änderungen, sofern kein Schreibvorgang läuft. Während einer Speicherung werden
  neue Änderungen gesammelt und anschließend als neuester Stand geschrieben.
- `autoSave={false}` bietet ausschließlich manuelles Speichern über `flush`/`retry`.
  `enabled={false}` sperrt auch manuelle Schreibversuche; Änderungen bleiben im
  Speicher. Die App muss Berechtigungen zusätzlich im Backend prüfen.
- `flush()` wartet auch auf Änderungen während eines laufenden Schreibvorgangs.
  Gleichzeitige Aufrufe teilen sich eine Promise. Fehler werden weitergereicht;
  automatische Fehler erzeugen keine unbegrenzte Wiederholungsschleife.
  `retry()` oder eine neue Änderung können einen weiteren Versuch auslösen.
- `status`: `idle`, `pending`, `saving`, `saved`, `error`; zusätzlich `dirty`,
  `error`, `editRevision` und `successfulSaves`. `SaveStatus` aus `/shell` versteht
  `pending`, `saving`, `saved`, `error` und `null`. `idle` als `null` abbilden.
- Den Provider oberhalb wechselnder Routen halten. Beim Unmount werden Timer
  gestoppt, ausstehende Änderungen werden **nicht automatisch gespeichert**.
  Vor dem bewussten Dokumentwechsel `await flush()` ausführen, dann für das neue
  Dokument mit einem neuen React-`key` mounten. Änderungen an `initialValue`
  setzen einen bestehenden Provider absichtlich nicht zurück.
- React StrictMode wird unterstützt. `AutosaveController<T>` stellt dieselbe
  Steuerung ohne React bereit (`start`, `stop`, `setValue`, `flush`, `subscribe`,
  `getSnapshot`, `configure`).

Der Provider koordiniert eine schreibende Instanz. Atomare Dateiablage,
Datenbankschemata, Migrationen, Konflikte zwischen Fenstern/Prozessen und
Backups liegen beim Speicheradapter. Es gibt keine Garantie für noch nicht
persistierte Änderungen bei Prozessabsturz, erzwungenem Beenden oder Stromausfall.

Das Desktop-Boilerplate enthält ein Beispiel mit den vorhandenen Tauri-Commands
und `localStorage` für die Browser-Vorschau. Sein nativer Exit-Guard fängt
Fensterschließen und reguläres App-Beenden ab, wartet auf `flush()` und lässt die
App bei Speicherfehlern geöffnet. Die Browser-Vorschau warnt bei ungespeicherten
Änderungen vor dem Verlassen; Browser erlauben keine verlässliche asynchrone
Speicherung während des Schließens. Diese Integration ist app-spezifisch und
wird vom Kit nicht automatisch registriert.
