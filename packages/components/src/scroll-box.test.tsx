import { For, createSignal } from "solid-js";
import { expect, test } from "vite-plus/test";
import { render } from "@solid-tui/testing";
import { Box, Text, useInput } from "@solid-tui/runtime";
import { ScrollBox, type ScrollBoxHandle } from "./index.ts";

function messages(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `message ${index}`);
}

test("ScrollBox follows the bottom while sticky", async () => {
  let append!: (value: string) => void;
  function App() {
    const [items, setItems] = createSignal(messages(8));
    append = (value) => setItems((current) => [...current, value]);
    return (
      <Box height={4} width={20}>
        <ScrollBox>
          <For each={items()}>{(item) => <Text>{item}</Text>}</For>
        </ScrollBox>
      </Box>
    );
  }

  const result = await render(App, { columns: 40, rows: 8 });
  try {
    expect(result.lastFrame()).toContain("message 7");
    append("streaming latest");
    await result.waitUntilRenderFlush();
    expect(result.lastFrame()).toContain("streaming latest");
  } finally {
    result.unmount();
  }
});

test("ScrollBox exposes an imperative Solid ref and owns no input policy", async () => {
  let append!: (value: string) => void;
  let box!: ScrollBoxHandle;

  function App() {
    const [items, setItems] = createSignal(messages(12));
    append = (value) => setItems((current) => [...current, value]);
    useInput((input) => {
      if (input === "u") box.scrollByLines(-4);
      else if (input === "g") box.scrollToTop();
      else if (input === "G") box.scrollToBottom();
    });
    return (
      <Box height={4} width={20}>
        <ScrollBox
          ref={(handle) => {
            box = handle;
          }}
        >
          <For each={items()}>{(item) => <Text>{item}</Text>}</For>
        </ScrollBox>
      </Box>
    );
  }

  const result = await render(App, { columns: 40, rows: 8 });
  try {
    expect(result.lastFrame()).toContain("message 11");

    await result.stdin.write("u");
    expect(result.lastFrame()).not.toContain("message 11");

    await result.stdin.write("g");
    expect(result.lastFrame()).toContain("message 0");
    expect(result.lastFrame()).not.toContain("message 11");

    await result.stdin.write("G");
    expect(result.lastFrame()).toContain("message 11");

    box.scrollToLine(-5);
    await result.waitUntilRenderFlush();
    expect(result.lastFrame()).toContain("message 0");
    box.scrollByLines(9999);
    await result.waitUntilRenderFlush();
    expect(result.lastFrame()).toContain("message 11");

    append("streaming latest");
    await result.waitUntilRenderFlush();
    expect(result.lastFrame()).toContain("streaming latest");
  } finally {
    result.unmount();
  }
});
