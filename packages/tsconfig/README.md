# @stoa/tsconfig

```jsonc
// tsconfig.json einer App
{
  "extends": "@stoa/tsconfig/app.json",
  "compilerOptions": { "paths": { "@/*": ["./src/*"] } },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}

// tsconfig.node.json
{ "extends": "@stoa/tsconfig/node.json", "include": ["vite.config.ts"] }
```

`paths` bleibt in der App, weil TypeScript Pfade relativ zur Datei auflöst, in der sie stehen.
