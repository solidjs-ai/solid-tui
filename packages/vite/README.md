# @solid-tui/vite

Development plugin for [solid-tui](https://github.com/solidjs-ai/solid-tui): universal Solid TSX,
an in-process terminal dev server, and HMR.

## Install

```sh
npm install -D @solid-tui/vite vite
```

## Development

`solidTui()` includes the Solid compiler because terminal JSX must use Solid's universal transform
with `moduleName: "@solid-tui/runtime"`. It also forces the client Solid runtime so the application,
stores, and custom renderer share one reactive owner graph.

```ts
import { defineConfig } from "vite";
import { solidTui } from "@solid-tui/vite";

export default defineConfig({
  plugins: [solidTui()],
});
```

```sh
vite
```

### Options

```ts
solidTui({
  entry: "src/main.tsx", // default
  solid: {}, // additional vite-plugin-solid options
});
```

## Production Build

`solidTui()` is dev-only. Build the Node application with `tsdown` and the Rolldown Solid plugin.
The aliases and explicit `external` policy keep application signals, stores, and the renderer on
one bundled Solid client runtime. Without the policy, the Solid Rolldown plugin externalizes its
framework imports by default, which creates a second reactive owner graph at runtime.

```ts
import { createRequire } from "node:module";
import { defineConfig } from "tsdown";
import Solid from "unplugin-solid/rolldown";

const require = createRequire(import.meta.url);

export default defineConfig({
  entry: ["src/main.tsx"],
  platform: "node",
  format: "esm",
  deps: { alwaysBundle: [/./], onlyBundle: false },
  inputOptions: {
    external: /^node:/,
    resolve: {
      alias: {
        "solid-js/store": require.resolve("solid-js/store/dist/store.js"),
        "solid-js": require.resolve("solid-js/dist/solid.js"),
      },
    },
  },
  outputOptions: { codeSplitting: false },
  plugins: [
    Solid({
      dev: false,
      hot: false,
      solid: { generate: "universal", moduleName: "@solid-tui/runtime" },
    }),
  ],
});
```

This emits one self-contained Node file in `dist/`. See every app under `examples/` for a complete
configuration.

## License

MIT
