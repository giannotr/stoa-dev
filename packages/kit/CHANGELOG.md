# Changelog — @stoa-dev/kit

## 1.0.0

Erste stabile Version: neues Design, neue Anzeige-Bausteine und die gemeinsamen
Teile der Apps im Kit.

### Neu

- **Skin „Instrument“** (`@stoa-dev/kit/instrument.css`, Klasse `stoa-instrument` auf
  `<html>`, hell und dunkel): ruhige, papiergraue Flächen mit großen Rundungen,
  kräftige Linien, Mono-Versalien für Beschriftungen und Buttons, Schwarz für aktive
  Zustände, die App-Akzentfarbe nur als kleiner Indikator. Schriften: Mona Sans und
  Mona Sans Mono.
- **`@stoa-dev/kit/display`**: `MarginaliaPair`, `Marginalia`, `MarginaliaFramed`,
  `TimeMeasured`, `ProgressBar`, `BarChart`/`BarChartItem` (vertikal und horizontal).
- **Aus den Apps übernommen** (`@stoa-dev/kit/shell`): `StartupProvider`/`useStartup`,
  `StartupAnimation`, `SaveStatus`, `TagInput`, `ValidatedInput` (+ `fieldFeedback`),
  `ExternalLink`, `AnimatedSwap`; in `@stoa-dev/kit/utils`: `SaveFeedback`.
- Kit-Texte für Laden der Einstellungen, Autosave, Schlagwörter und „Erneut versuchen“
  (de, de-AT, en, it).
- Stabile `data-slot`-Attribute an AppNavigation, PageHeading, BrandLines und
  SectionNavigation.

### Geändert

- `DatePickerInput`: Der Kalender zeigt immer sechs Wochenzeilen; Höhe und
  Monatspfeile bleiben beim Blättern stabil.
- Theme: `font-mono` ist Mona Sans Mono (Fallback: System-Monospace).

### Umstieg von 0.1.x

Keine entfernten oder umbenannten Exporte; bestehende Apps bauen unverändert.
Empfohlen beim Integrieren:

1. App-eigene Kopien von StartupAnimation/StartupProvider, SaveStatus, TagInput,
   ValidatedInput, ExternalLink und AnimatedActionRow durch die Kit-Versionen ersetzen.
2. Für den Skin `@stoa-dev/kit/instrument.css` nach `theme.css` importieren und
   `stoa-instrument` auf `<html>` setzen.
3. Mona Sans Mono einbinden (github.com/github/mona-sans, SIL OFL), sonst greift die
   System-Monospace.

## 0.1.4

- `DatePickerInput`: Auswahllisten für Monat und Jahr (100 Jahre zurück, 10 voraus,
  per `startMonth`/`endMonth` änderbar).
- `InputGroupAddon`: Klicks aus Portalen (z. B. dem Kalender-Popover) setzen den Fokus
  nicht mehr ins Feld.

## 0.1.3

- Dropdown-Menüs passen sich dem Inhalt an: mindestens 12rem, höchstens 20rem.

## 0.1.2

- App-spezifische Link-Hover-Farbe aus dem gemeinsamen Theme entfernt.

## 0.1.1

- Repository-Metadaten, stabile CSS-Modul-Klassennamen.

## 0.1.0

- Erste Veröffentlichung.
