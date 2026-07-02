import { expect, test } from "vite-plus/test";
import { For, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import { Box, Text } from "@solid-tui/runtime";
import { render } from "@solid-tui/testing";
import App from "./app.tsx";

test("Solid store memo lines render through the TUI Vite config", async () => {
  const StoreApp = () => {
    const [state] = createStore({ lines: ["one", "two"] });
    const lines = createMemo(() => state.lines);
    return (
      <Box flexDirection="column">
        <For each={lines()}>{(line) => <Text>{line}</Text>}</For>
      </Box>
    );
  };
  const app = await render(StoreApp);
  try {
    expect(app.lastFrame()).toContain("one");
    expect(app.lastFrame()).toContain("two");
  } finally {
    app.unmount();
  }
});

test("space starts the game and the frame advances", async () => {
  const app = await render(App, { columns: 80, rows: 30 });

  try {
    const initialFrame = app.lastFrame({ trimLines: true });
    const initialFrameCount = app.frames.length;

    expect(initialFrame).toContain("press space to start");

    await app.stdin.write(" ");
    expect(app.lastFrame()).toContain("space /");

    await new Promise((resolve) => setTimeout(resolve, 500));
    await app.waitUntilRenderFlush();

    expect(app.frames.length).toBeGreaterThan(initialFrameCount);
    expect(app.lastFrame({ trimLines: true })).not.toBe(initialFrame);
  } finally {
    app.unmount();
  }
});
