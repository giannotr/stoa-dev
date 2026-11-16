# @stoa-dev/biome-config

```jsonc
// biome.json einer App
{
  "extends": ["@stoa-dev/biome-config"],
  "files": {
    "includes": ["**", "!!**/node_modules", "!!**/dist", "!!src-tauri/gen", "!!src-tauri/binaries"]
  }
}
```

App-spezifische Ignore-Pfade bleiben in der App; Regeln und Formatierung kommen aus dem Paket.
