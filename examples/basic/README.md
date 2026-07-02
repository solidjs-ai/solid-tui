# basic

Minimal solid-tui app written as Solid TSX.

## Setup

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { solidTui } from "@solid-tui/vite";

export default defineConfig({
  plugins: [solidTui()],
});
```

```jsonc
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite build && node dist/main.js",
  },
}
```
