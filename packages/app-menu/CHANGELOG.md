# Changelog — @stoa-dev/app-menu

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
