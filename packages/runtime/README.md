# @solid-tui/runtime

Core Solid renderer and terminal primitives for `solid-tui`.

## Install

```sh
npm install @solid-tui/runtime solid-js
```

## Usage

```tsx
import { Box, Text, createApp } from "@solid-tui/runtime";

function App() {
  return (
    <Box>
      <Text>Hello from solid-tui</Text>
    </Box>
  );
}

createApp(App).mount();
```

For Vite-based apps with HMR and production builds, use `@solid-tui/vite`.

## License

MIT
