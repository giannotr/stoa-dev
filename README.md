# stoa-kit

Monorepo für die gemeinsamen Bausteine der STOA-Apps
(invoicer, servicerecordr, latextemplater, bookcollectr, practicr).

| Paket | Registry | Zweck |
|---|---|---|
| [`@stoa/kit`](packages/kit) | npm | Komponenten, Hooks, Utils, Lizenz-UI, Theme, Locales |
| [`@stoa/biome-config`](packages/biome-config) | npm | gemeinsame Biome-Regeln |
| [`@stoa/tsconfig`](packages/tsconfig) | npm | `base`, `app`, `node`, `library` |
| [`stoa-licensing`](crates/stoa-licensing) | crates.io | Rust-Lizenzmodul für Tauri |

## Befehle

```bash
npm install
npm run check          # Biome + Typecheck + Build
npm run rust:test      # Tests des Lizenz-Crates
npm run release:check  # zusätzlich: Inhalt des npm-Pakets anzeigen
```

## Veröffentlichen

```bash
npm publish --workspace @stoa/kit            # bzw. @stoa/biome-config, @stoa/tsconfig
cargo publish --manifest-path crates/stoa-licensing/Cargo.toml
```

Versionierung nach SemVer: Breaking Changes an Props/Exports nur mit neuer Major-Version
(in 0.x: neue Minor-Version).
