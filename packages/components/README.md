# @solid-tui/components

High-level Solid components for solid-tui, composed from `@solid-tui/runtime`
primitives.

Currently: `Spinner`.

## Install

```sh
npm install @solid-tui/components
# peer deps: @solid-tui/runtime, solid-js ^1.9
```

## Spinner

An animated loading spinner.

```tsx
import { Spinner } from "@solid-tui/components";

export default function App() {
  return <Spinner type="dots" label="Loading" color="green" />;
}
```

### Props

| prop       | type                                  | default  | description                                |
| ---------- | ------------------------------------- | -------- | ------------------------------------------ |
| `type`     | preset name (e.g. `"dots"`, `"line"`) | `"dots"` | a built-in spinner animation               |
| `frames`   | `readonly string[]`                   | -        | custom animation frames (overrides `type`) |
| `interval` | `number`                              | preset's | ms between frames                          |
| `color`    | `string`                              | -        | chalk color for the spinner glyph          |
| `label`    | `string`                              | -        | text shown next to the spinner             |

## License

MIT
