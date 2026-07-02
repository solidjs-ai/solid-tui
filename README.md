# solid-tui

Solid terminal UI framework inspired by `vue-tui`, using `better-yoga-layout` for Yoga flexbox layout.

## Packages

- `@solid-tui/runtime` - Solid custom renderer, host components, hooks, and `renderToString`
- `@solid-tui/components` - higher-level components composed from runtime primitives
- `@solid-tui/vite` - Vite plugin that compiles Solid TSX in `universal` renderer mode
- `@solid-tui/testing` - component test harness with fake terminal streams

## Examples

- `examples/basic` - minimal Solid TSX app
- `examples/coding-agent` - Solid TSX translation of the agent UI example
- `examples/flappy-bird` - Solid TSX/store translation of the Flappy Bird example

## Quick Start

```bash
pnpm install
pnpm --filter @solid-tui/example-basic dev
```

```tsx
import { createSignal } from "solid-js";
import { Box, Text, createApp, useInput } from "@solid-tui/runtime";

function App() {
  const [count, setCount] = createSignal(0);

  useInput((input) => {
    if (input === "+") setCount((value) => value + 1);
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

Use Solid primitives from `solid-js` in apps. The Vite plugin aliases the bare
`solid-js` entry to Solid's client runtime for terminal rendering while leaving
subpaths such as `solid-js/store` intact.
