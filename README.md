# solid-tui

> Public beta. The runtime API is stabilizing; terminal HMR remains experimental.

The Solid framework for terminal UIs, inspired by
[`vue-tui`](https://github.com/vuejs-ai/vue-tui) and powered by
[`better-yoga-layout`](https://www.npmjs.com/package/better-yoga-layout).

- Solid signals, stores, control flow, context, refs, and lifecycle cleanup
- Yoga flexbox layout, borders, clipping, styled text, static output, and transforms
- Keyboard, focus, paste, cursor, Kitty keyboard protocol, raw and targeted mouse input
- Terminal HMR during development and self-contained Node builds for production
- Component testing with fake terminal streams and input simulation

## Quick Start

Install the runtime and Solid:

```sh
npm install @solid-tui/runtime solid-js
npm install -D @solid-tui/vite vite tsdown unplugin-solid
```

```tsx
import { createSignal } from "solid-js";
import { Box, Text, createApp, useInput } from "@solid-tui/runtime";

function App() {
  const [count, setCount] = createSignal(0);

  useInput((input) => {
    if (input === "+" || input === "=") setCount((value) => value + 1);
    if (input === "-") setCount((value) => value - 1);
  });

  return (
    <Box>
      <Text>Count: </Text>
      <Text bold color="green">
        {count()}
      </Text>
    </Box>
  );
}

createApp(App).mount();
```

Use `solidTui()` in `vite.config.ts` for development:

```ts
import { defineConfig } from "vite";
import { solidTui } from "@solid-tui/vite";

export default defineConfig({ plugins: [solidTui()] });
```

Production builds use `tsdown` with `unplugin-solid/rolldown`, universal generation, and the
`@solid-tui/runtime` module target. See [`examples/basic`](./examples/basic) or the complete setup in
[`@solid-tui/vite`](./packages/vite).

## Packages

| Package                 | Responsibility                                                       |
| ----------------------- | -------------------------------------------------------------------- |
| `@solid-tui/runtime`    | custom renderer, primitives, terminal I/O, hooks, `renderToString`   |
| `@solid-tui/components` | higher-level `ScrollBox` and `Spinner` components                    |
| `@solid-tui/testing`    | isolated terminal rendering, frame assertions, and input simulation  |
| `@solid-tui/vite`       | dev-only universal TSX compiler, in-process terminal server, and HMR |

The dependency direction is documented in [`docs/package-layers.md`](./docs/package-layers.md).

## Examples

| Example                                   | Description                                                      |
| ----------------------------------------- | ---------------------------------------------------------------- |
| [`basic`](./examples/basic)               | Solid TSX counter and clock                                      |
| [`coding-agent`](./examples/coding-agent) | streaming coding-agent interface                                 |
| [`flappy-bird`](./examples/flappy-bird)   | reactive game loop, input, repeated layout, and borders          |
| [`mouse`](./examples/mouse)               | targeted click/wheel events and draggable host refs              |
| [`scroll-box`](./examples/scroll-box)     | sticky viewport driven through an imperative Solid component ref |

Run an example with HMR:

```sh
pnpm install
pnpm --filter @solid-tui/example-basic dev
```

Every example also has `build` and `preview` scripts backed by `tsdown`.

## Mouse Input

Element handlers (`onMousedown`, `onMouseup`, `onClick`, `onWheel`) are enabled on demand in
fullscreen apps and use hit-testing, bubbling, clipping-aware targets, and drag capture. Mount with:

```ts
createApp(App).mount({ fullscreen: true });
```

Use `useMouseInput()` for raw vertical wheel input in inline applications, or
`useDraggable(() => hostRef)` for an idiomatic Solid accessor-based drag target.

## Solid Conventions

Application state comes directly from `solid-js`; no parallel reactivity layer is introduced.
Derived values use memos, subscriptions and terminal mode ownership use effects with cleanup, and
component imperative APIs use Solid refs. The compiler is always configured for Solid's universal
renderer, and application/runtime imports resolve to one client Solid core.

## Release Policy

All public `@solid-tui/*` packages use linked versions. A release updates `runtime`, `components`,
`testing`, and `vite` together.

## License

MIT
