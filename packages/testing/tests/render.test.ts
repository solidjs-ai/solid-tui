import { expect, test } from "vite-plus/test";
import { Text, createComponent, createSignal, useInput } from "@solid-tui/runtime";
import { render } from "../src/index.ts";

test("lastFrame captures rendered output", async () => {
  const { lastFrame } = await render(() => createComponent(Text, { children: "hello" }));
  expect(lastFrame()).toContain("hello");
});

test("frames accumulate on signal updates", async () => {
  const [message, setMessage] = createSignal("first");
  const { frames, lastFrame, waitUntilRenderFlush } = await render(() =>
    createComponent(Text, {
      get children() {
        return message();
      },
    }),
  );
  const initialCount = frames.length;

  expect(lastFrame()).toContain("first");
  setMessage("second");
  await waitUntilRenderFlush();
  await new Promise((resolve) => setImmediate(resolve));

  expect(lastFrame()).toContain("second");
  expect(frames.length).toBeGreaterThan(initialCount);
});

test("render with custom columns", async () => {
  const { terminal, lastFrame } = await render(() => createComponent(Text, { children: "hello" }), {
    columns: 20,
  });
  expect(terminal.columns).toBe(20);
  expect(lastFrame()).toContain("hello");
});

test("stdin input updates Solid state", async () => {
  const App = () => {
    const [message, setMessage] = createSignal("idle");
    useInput((input, key) => {
      if (input === " ") setMessage("space");
      if (key.upArrow) setMessage("up");
    });
    return createComponent(Text, {
      get children() {
        return message();
      },
    });
  };

  const { lastFrame, stdin, terminal } = await render(App);
  expect(terminal.rawMode.current).toBe(true);
  expect(lastFrame()).toContain("idle");

  await stdin.write(" ");
  expect(lastFrame()).toContain("space");

  await stdin.write("\x1b[A");
  expect(lastFrame()).toContain("up");
});
