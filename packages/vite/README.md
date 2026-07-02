# @solid-tui/vite

Vite plugin for solid-tui: an in-process terminal dev server with HMR, plus a
production build, for Solid apps that render to the terminal via
`@solid-tui/runtime`.

## Install

```sh
npm install -D @solid-tui/vite
# peer deps: vite ^8, @solid-tui/runtime, solid-js ^1.9
```

## Usage

```ts
import { defineConfig } from "vite";
import { solidTui } from "@solid-tui/vite";

export default defineConfig({
  plugins: [solidTui()],
});
```

- `vite` boots the app in-process through Vite's SSR module runner and renders it
  to the terminal with HMR.
- `vite build` bundles a Node entry (`dist/main.js` by default).

### Options

```ts
solidTui({
  entry: "src/main.tsx",
  solid: {
    // vite-plugin-solid options; generate/moduleName are forced for solid-tui.
  },
});
```

## Build output

By default the production build externalizes bare dependencies, while bundling
relative, absolute, virtual, and Solid runtime ids required by the terminal
renderer. To produce a self-contained single file, set your own
`build.rolldownOptions.external`; the plugin will yield to it.

```ts
import { isBuiltin } from "node:module";

export default defineConfig({
  plugins: [solidTui()],
  build: {
    rolldownOptions: {
      external: (id) => isBuiltin(id),
      platform: "node",
      output: { inlineDynamicImports: true },
    },
  },
});
```

## License

MIT
