# Changelog — @stoa-dev/app-menu

## 0.3.0

- `appCreationYear` in den About-Optionen: Der Copyright-Hinweis lautet dann
  „Copyright © 2024–2026 STOA“ (Halbgeviertstrich) bzw. im ersten Jahr nur
  „Copyright © 2026 STOA“. Ein eigener `copyright`-Text hat weiter Vorrang.
- `copyrightYears(appCreationYear, currentYear?)` als Hilfsfunktion.

## 0.2.0

- `setupStandardAppMenu(options)`: baut die ganze Menüleiste wie Tauris Standardmenü,
  lädt Name, Version und Icon, meldet auf macOS Fenster- und Hilfe-Menü an und baut
  bei `subscribe`-Meldungen (z. B. Sprachwechsel) der Reihe nach neu auf. Die App
  liefert nur Beschriftungen und optional eigene Ablage-/Bearbeiten-Menüs sowie
  `extraMenus`. Unabhängig von einer Übersetzungsbibliothek.
- `buildStandardFileMenu`, `buildStandardEditMenu` als Vorlagen.

## 0.1.0

- `buildStandardAppMenu`, `buildStandardViewMenu`, `buildStandardWindowMenu`,
  `buildStandardHelpMenu`, `isMac`, `computeShortVersion`, Typ `About`.
