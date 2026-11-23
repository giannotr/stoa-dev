# stoa-dev

Monorepo für die gemeinsamen Bausteine der STOA-Apps
(invoicer, servicerecordr, latextemplater, bookcollectr, practicr).

| Paket | Registry | Zweck |
|---|---|---|
| [`@stoa-dev/kit`](packages/kit) | npm | Komponenten, Hooks, Utils, Lizenz-UI, Theme, Locales |
| [`@stoa-dev/biome-config`](packages/biome-config) | npm | gemeinsame Biome-Regeln |
| [`@stoa-dev/tsconfig`](packages/tsconfig) | npm | `base`, `app`, `node`, `library` |
| [`@stoa-dev/app-menu`](packages/app-menu) | npm | Standard-Anwendungsmenüs für Tauri 2 (App, Darstellung, Fenster, Hilfe) |
| [`stoa-licensing`](crates/stoa-licensing) | crates.io | Rust-Lizenzmodul für Tauri |
| [`@stoa-dev/storybook`](apps/storybook) | – (privat) | Storybook und Interaktionstests für das Kit |

## Befehle

```bash
npm install
npm run check          # Biome + Typecheck + Build + Storybook-Tests
npm run storybook      # Storybook auf http://localhost:6006
npm run storybook:test # nur die Interaktionstests (headless Chromium)
npm run rust:test      # Tests des Lizenz-Crates
npm run release:check  # zusätzlich: Inhalt des npm-Pakets anzeigen
```

## Veröffentlichen

```bash
npm publish --workspace @stoa-dev/kit            # bzw. @stoa-dev/app-menu, @stoa-dev/biome-config, @stoa-dev/tsconfig
cargo publish --manifest-path crates/stoa-licensing/Cargo.toml
```

Versionierung nach SemVer: Breaking Changes an Props/Exports nur mit neuer Major-Version
(in 0.x: neue Minor-Version).
