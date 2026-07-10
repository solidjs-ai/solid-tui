# @solid-tui/runtime

Solid custom renderer and terminal primitives for `solid-tui`, with flexbox layout powered by
`better-yoga-layout`.

## Install

```sh
npm install @solid-tui/runtime solid-js
```

## Usage

```tsx
import { createSignal } from "solid-js";
import { Box, Text, createApp, useInput } from "@solid-tui/runtime";

function App() {
  const [count, setCount] = createSignal(0);
  useInput((input) => {
    if (input === "+" || input === "=") setCount((value) => value + 1);
  });
  return (
    <Box>
      <Text>Count: {count()}</Text>
    </Box>
  );
}

createApp(App).mount();
```

Use `@solid-tui/vite` for terminal HMR during development and `tsdown` for a self-contained Node
production build.

## Mouse Input

Targeted mouse handlers use DOM-shaped events and require fullscreen mode, where terminal screen
coordinates map exactly to the rendered layout:

```tsx
import { Box, createApp, type TuiMouseEvent } from "@solid-tui/runtime";

function App() {
  return <Box onClick={(event: TuiMouseEvent) => console.log(event.offsetX, event.offsetY)} />;
}

createApp(App).mount({ fullscreen: true });
```

Supported element handlers are `onMousedown`, `onMouseup`, `onClick`, and `onWheel`. Events bubble,
support `stopPropagation()`, expose stable `target`/`currentTarget` rectangles, and synthesize click
detail counts. `useDraggable(() => hostRef)` adds drag capture and reactive `x`, `y`, `position`, and
`isDragging` accessors.

For raw vertical wheel coordinates in inline output, use `useMouseInput()`. Mouse tracking is
reference-counted and disabled automatically on cleanup. `alternateScreen` remains a deprecated
alias for `fullscreen`.

## License

MIT
