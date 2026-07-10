# @solid-tui/components

High-level Solid components composed from `@solid-tui/runtime` primitives.

Currently: `ScrollBox`, `Spinner`.

## Install

```sh
npm install @solid-tui/components @solid-tui/runtime solid-js
```

## Spinner

```tsx
import { Spinner } from "@solid-tui/components";

export default function App() {
  return <Spinner type="dots" label="Loading" color="green" />;
}
```

| prop       | type                                  | default  | description                      |
| ---------- | ------------------------------------- | -------- | -------------------------------- |
| `type`     | preset name (e.g. `"dots"`, `"line"`) | `"dots"` | built-in animation               |
| `frames`   | `readonly string[]`                   | -        | custom frames, overriding `type` |
| `interval` | `number`                              | preset's | milliseconds between frames      |
| `color`    | `string`                              | -        | spinner glyph color              |
| `label`    | `string`                              | -        | adjacent text                    |

## ScrollBox

`ScrollBox` is a bounded viewport that follows new content while it remains at the bottom. It owns
no keyboard or mouse policy. Wire application input to the imperative Solid component ref:

```tsx
import { For } from "solid-js";
import { ScrollBox, type ScrollBoxHandle } from "@solid-tui/components";
import { Text, useInput } from "@solid-tui/runtime";

function LogView(props: { lines: string[] }) {
  let scrollBox!: ScrollBoxHandle;

  useInput((_input, key) => {
    if (key.upArrow) scrollBox.scrollByLines(-1);
    if (key.downArrow) scrollBox.scrollByLines(1);
  });

  return (
    <ScrollBox
      ref={(handle) => {
        scrollBox = handle;
      }}
    >
      <For each={props.lines}>{(line) => <Text>{line}</Text>}</For>
    </ScrollBox>
  );
}
```

| action                 | description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `scrollToLine(line)`   | place a clamped content line at the viewport top               |
| `scrollByLines(lines)` | scroll relative to the current position (`+` moves down)       |
| `scrollToTop()`        | jump to the top                                                |
| `scrollToBottom()`     | jump to the bottom and resume following newly appended content |

For inline streaming output, prefer `Static` and let the terminal own scrollback and selection.

## License

MIT
