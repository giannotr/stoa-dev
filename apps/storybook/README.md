# @stoa-dev/storybook

Storybook für `@stoa-dev/kit`. Wird nicht veröffentlicht.

```bash
npm run storybook        # Entwicklungsserver auf http://localhost:6006
npm run test             # Interaktionstests (play-Funktionen) in headless Chromium
npm run build            # statische Seite nach storybook-static/
```

Beim ersten Mal einmalig den Testbrowser installieren: `npx playwright install chromium`.

## Aufbau

- Die Stories importieren `@stoa-dev/kit/*` direkt aus `packages/kit/src`
  (Alias in `vite.config.ts`). Änderungen am Kit sind sofort sichtbar, ohne Build.
- `.storybook/preview.tsx` stellt alles bereit, was sonst die App liefert: i18next mit den
  Kit-Texten, `next-themes`, `MemoryRouter` (Startpfad per `parameters.route`) und `TooltipProvider`.
- In der Werkzeugleiste lassen sich **Theme**, **Sprache** und **Akzentfarbe** der Apps umschalten.
- `.storybook/tauri-mock.ts` ersetzt das Rust-Backend für die Lizenz-Komponenten. Pro Story
  über `parameters.tauri` steuerbar, z. B. `{ license: licenseState('expired') }` oder
  `{ activationError: 'NETWORK' }`.

## Neue Stories

Eine Datei `src/stories/<bereich>/<Komponente>.stories.tsx` anlegen. Interaktionen, die
nicht kaputtgehen dürfen, als `play`-Funktion schreiben, z. B. `JumpToAnotherYear` im
DatePicker. Sie laufen bei `npm run check` im Root mit.

Hinweis: vitest ist auf 4.x festgelegt, weil vitest 5 Node 22 voraussetzt.
