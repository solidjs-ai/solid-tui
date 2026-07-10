import { afterAll, beforeAll, expect, test, vi } from "vite-plus/test";
import {
  Box,
  Text,
  createComponent,
  createSignal,
  useDraggable,
  useMouseInput,
  type MouseTarget,
  type TuiMouseEvent,
  type TuiWheelEvent,
} from "@solid-tui/runtime";
import { render } from "../src/index.ts";

const originalTerm = process.env["TERM"];

beforeAll(() => {
  process.env["TERM"] = "xterm-256color";
});

afterAll(() => {
  if (originalTerm === undefined) delete process.env["TERM"];
  else process.env["TERM"] = originalTerm;
});

test("fullscreen mouse events hit-test, bubble, and expose DOM-shaped coordinates", async () => {
  const calls: string[] = [];
  let click: TuiMouseEvent | undefined;
  let wheel: TuiWheelEvent | undefined;

  function App() {
    return createComponent(Box, {
      width: 20,
      height: 6,
      onClick(event) {
        calls.push("parent");
        click = event;
      },
      onWheel(event) {
        wheel = event;
      },
      get children() {
        return createComponent(Box, {
          width: 8,
          height: 3,
          marginLeft: 2,
          marginTop: 1,
          onClick() {
            calls.push("child");
          },
        });
      },
    });
  }

  const result = await render(App, { fullscreen: true, columns: 30, rows: 10 });
  try {
    await result.stdin.write("\x1b[<0;4;2M");
    await result.stdin.write("\x1b[<0;4;2m");
    expect(calls).toEqual(["child", "parent"]);
    expect(click).toMatchObject({
      type: "click",
      button: "left",
      screenX: 3,
      screenY: 1,
      offsetX: 3,
      offsetY: 1,
      detail: 1,
    });
    expect(click?.target).not.toBe(click?.currentTarget);
    expect(click?.currentTarget?.rect).toEqual({ x: 0, y: 0, width: 20, height: 6 });

    await result.stdin.write("\x1b[<65;4;2M");
    expect(wheel).toMatchObject({
      type: "wheel",
      deltaX: 0,
      deltaY: 1,
      screenX: 3,
      screenY: 1,
    });
  } finally {
    result.unmount();
  }
});

test("stopPropagation prevents ancestor mouse handlers", async () => {
  const calls: string[] = [];
  function App() {
    return createComponent(Box, {
      width: 10,
      height: 4,
      onClick() {
        calls.push("parent");
      },
      get children() {
        return createComponent(Box, {
          width: 5,
          height: 2,
          onClick(event) {
            calls.push("child");
            event.stopPropagation();
          },
        });
      },
    });
  }

  const result = await render(App, { fullscreen: true });
  try {
    await result.stdin.write("\x1b[<0;1;1M");
    await result.stdin.write("\x1b[<0;1;1m");
    expect(calls).toEqual(["child"]);
  } finally {
    result.unmount();
  }
});

test("useDraggable uses a Solid host-ref accessor and suppresses click after movement", async () => {
  let x!: () => number;
  let y!: () => number;
  let dragging!: () => boolean;
  let clicks = 0;

  function App() {
    let target: unknown;
    const draggable = useDraggable(() => target, { initialValue: { x: 2, y: 2 } });
    x = draggable.x;
    y = draggable.y;
    dragging = draggable.isDragging;
    return createComponent(Box, {
      width: 20,
      height: 10,
      get children() {
        return createComponent(Box, {
          position: "absolute",
          width: 4,
          height: 2,
          ref(node: unknown) {
            target = node;
          },
          get left() {
            return draggable.x();
          },
          get top() {
            return draggable.y();
          },
          onClick() {
            clicks++;
          },
        });
      },
    });
  }

  const result = await render(App, { fullscreen: true });
  try {
    await result.stdin.write("\x1b[<0;3;3M");
    expect(dragging()).toBe(true);
    await result.stdin.write("\x1b[<32;6;5M");
    expect({ x: x(), y: y() }).toEqual({ x: 5, y: 4 });
    await result.stdin.write("\x1b[<0;6;5m");
    expect(dragging()).toBe(false);
    expect(clicks).toBe(0);
  } finally {
    result.unmount();
  }
});

test("useMouseInput keeps raw vertical wheel coordinates available inline", async () => {
  let latest = "none";
  function App() {
    useMouseInput((event) => {
      latest = `${event.direction}:${event.x},${event.y}`;
    });
    return createComponent(Box, { width: 1, height: 1 });
  }

  const result = await render(App);
  try {
    await result.stdin.write("\x1b[<64;7;8M");
    expect(latest).toBe("up:7,8");
  } finally {
    result.unmount();
  }
});

test("useMouseInput follows a reactive Solid isActive accessor", async () => {
  const events: string[] = [];
  let setActive!: (value: boolean) => void;
  function App() {
    const [active, updateActive] = createSignal(false);
    setActive = updateActive;
    useMouseInput((event) => events.push(event.direction), { isActive: active });
    return createComponent(Box, { width: 1, height: 1 });
  }

  const result = await render(App);
  try {
    await result.stdin.write("\x1b[<64;1;1M");
    expect(events).toEqual([]);

    setActive(true);
    await result.waitUntilRenderFlush();
    await result.stdin.write("\x1b[<65;1;1M");
    expect(events).toEqual(["down"]);

    setActive(false);
    await result.waitUntilRenderFlush();
    await result.stdin.write("\x1b[<64;1;1M");
    expect(events).toEqual(["down"]);
  } finally {
    result.unmount();
  }
});

test("bubbling rebases stable event objects and increments click detail", async () => {
  const childEvents: TuiMouseEvent[] = [];
  const parentEvents: TuiMouseEvent[] = [];

  function App() {
    return createComponent(Box, {
      marginLeft: 2,
      width: 5,
      height: 1,
      onClick(event) {
        parentEvents.push(event);
      },
      get children() {
        return createComponent(Box, {
          marginLeft: 1,
          width: 2,
          height: 1,
          onClick(event) {
            childEvents.push(event);
          },
        });
      },
    });
  }

  const result = await render(App, { fullscreen: true });
  try {
    await result.stdin.write("\x1b[<0;4;1M\x1b[<0;4;1m\x1b[<0;4;1M\x1b[<0;4;1m");
    expect(childEvents).toHaveLength(2);
    expect(parentEvents).toHaveLength(2);
    expect(childEvents[0]).not.toBe(parentEvents[0]);
    expect(childEvents[0]?.currentTarget).not.toBe(parentEvents[0]?.currentTarget);
    expect(childEvents.map((event) => [event.offsetX, event.offsetY, event.detail])).toEqual([
      [0, 0, 1],
      [0, 0, 2],
    ]);
    expect(parentEvents.map((event) => [event.offsetX, event.offsetY, event.detail])).toEqual([
      [1, 0, 1],
      [1, 0, 2],
    ]);
  } finally {
    result.unmount();
  }
});

test("click synthesis requires down and up to resolve to the same target", async () => {
  const clicks: string[] = [];
  function App() {
    return createComponent(Box, {
      height: 1,
      get children() {
        return [
          createComponent(Box, {
            width: 2,
            height: 1,
            onClick() {
              clicks.push("left");
            },
          }),
          createComponent(Box, {
            width: 2,
            height: 1,
            onClick() {
              clicks.push("right");
            },
          }),
        ];
      },
    });
  }

  const result = await render(App, { fullscreen: true });
  try {
    await result.stdin.write("\x1b[<0;1;1M\x1b[<0;4;1m");
    expect(clicks).toEqual([]);
  } finally {
    result.unmount();
  }
});

test("nested Text handlers receive virtual-text coordinates", async () => {
  let click: TuiMouseEvent | undefined;
  function App() {
    return createComponent(Text, {
      get children() {
        return [
          "outer ",
          createComponent(Text, {
            onClick(event) {
              click = event;
            },
            children: "inner",
          }),
        ];
      },
    });
  }

  const result = await render(App, { fullscreen: true });
  try {
    await result.stdin.write("\x1b[<0;8;1M\x1b[<0;8;1m");
    expect(click?.target).toBe(click?.currentTarget);
    expect(click).toMatchObject({ offsetX: 1, offsetY: 0 });
    expect(click?.target?.rect).toEqual({ x: 6, y: 0, width: 5, height: 1 });
  } finally {
    result.unmount();
  }
});

test("hit-testing honors clipping, absolute positioning, and paint order", async () => {
  const calls: string[] = [];
  function App() {
    return createComponent(Box, {
      width: 8,
      height: 3,
      overflow: "hidden",
      get children() {
        return [
          createComponent(Box, {
            marginLeft: 7,
            width: 3,
            height: 1,
            onClick() {
              calls.push("clipped");
            },
          }),
          createComponent(Box, {
            position: "absolute",
            left: 2,
            top: 1,
            width: 2,
            height: 1,
            onClick() {
              calls.push("first");
            },
          }),
          createComponent(Box, {
            position: "absolute",
            left: 2,
            top: 1,
            width: 2,
            height: 1,
            onClick() {
              calls.push("last");
            },
          }),
        ];
      },
    });
  }

  const result = await render(App, { fullscreen: true });
  try {
    await result.stdin.write("\x1b[<0;8;1M\x1b[<0;8;1m");
    await result.stdin.write("\x1b[<0;9;1M\x1b[<0;9;1m");
    await result.stdin.write("\x1b[<0;3;2M\x1b[<0;3;2m");
    expect(calls).toEqual(["clipped", "last"]);
  } finally {
    result.unmount();
  }
});

test("MouseTarget rect clears when a mounted node stops painting", async () => {
  let hide!: () => void;
  let target: MouseTarget | null = null;
  function App() {
    const [hidden, setHidden] = createSignal(false);
    hide = () => setHidden(true);
    return createComponent(Box, {
      width: 4,
      height: 2,
      get display() {
        return hidden() ? "none" : "flex";
      },
      onClick(event) {
        target = event.currentTarget;
      },
      children: createComponent(Text, { children: "box" }),
    });
  }

  const result = await render(App, { fullscreen: true });
  try {
    await result.stdin.write("\x1b[<0;1;1M\x1b[<0;1;1m");
    expect(target?.rect).toEqual({ x: 0, y: 0, width: 4, height: 2 });
    hide();
    await result.waitUntilRenderFlush();
    expect(target?.rect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  } finally {
    result.unmount();
  }
});

test("useDraggable reports movement, honors axis, and can cancel capture", async () => {
  const positions: Array<[string, number, number, number, number]> = [];
  let target: unknown;
  function App() {
    useDraggable(() => target, {
      initialValue: { x: 10, y: 20 },
      axis: "x",
      onStart(position, event) {
        positions.push([event.type, position.x, position.y, event.movementX, event.movementY]);
      },
      onMove(position, event) {
        positions.push([event.type, position.x, position.y, event.movementX, event.movementY]);
      },
      onEnd(position, event) {
        positions.push([event.type, position.x, position.y, event.movementX, event.movementY]);
      },
    });
    return createComponent(Box, {
      width: 4,
      height: 2,
      ref(node: unknown) {
        target = node;
      },
    });
  }

  const result = await render(App, { fullscreen: true });
  try {
    await result.stdin.write("\x1b[<0;1;1M\x1b[<32;6;4M\x1b[<0;6;4m");
    expect(positions).toEqual([
      ["dragstart", 10, 20, 0, 0],
      ["drag", 15, 20, 5, 3],
      ["dragend", 15, 20, 0, 0],
    ]);
  } finally {
    result.unmount();
  }

  const cancelled: string[] = [];
  target = undefined;
  function CancelApp() {
    useDraggable(() => target, {
      onStart() {
        cancelled.push("start");
        return false;
      },
      onMove() {
        cancelled.push("move");
      },
      onEnd() {
        cancelled.push("end");
      },
    });
    return createComponent(Box, {
      width: 4,
      height: 2,
      ref(node: unknown) {
        target = node;
      },
    });
  }

  const cancelledResult = await render(CancelApp, { fullscreen: true });
  try {
    await cancelledResult.stdin.write("\x1b[<0;1;1M\x1b[<32;6;2M\x1b[<0;6;2m");
    expect(cancelled).toEqual(["start"]);
  } finally {
    cancelledResult.unmount();
  }
});

test("useDraggable cancels active state when its host node unmounts", async () => {
  const moves: string[] = [];
  let dragging!: () => boolean;
  function App() {
    const [mounted, setMounted] = createSignal(true);
    let target: unknown;
    const draggable = useDraggable(() => target, {
      onStart() {
        moves.push("start");
      },
      onMove() {
        moves.push("move");
        setMounted(false);
      },
      onEnd() {
        moves.push("end");
      },
    });
    dragging = draggable.isDragging;
    return createComponent(Box, {
      width: 8,
      height: 2,
      get children() {
        return mounted()
          ? createComponent(Box, {
              width: 4,
              height: 1,
              ref(node: unknown) {
                target = node;
              },
            })
          : createComponent(Box, { width: 4, height: 1 });
      },
    });
  }

  const result = await render(App, { fullscreen: true });
  try {
    await result.stdin.write("\x1b[<0;1;1M");
    expect(dragging()).toBe(true);
    await result.stdin.write("\x1b[<32;6;1M");
    expect(dragging()).toBe(false);
    await result.stdin.write("\x1b[<32;7;1M\x1b[<0;7;1m");
    expect(moves).toEqual(["start", "move"]);
  } finally {
    result.unmount();
  }
});

test("useDraggable captures middle and right button drags", async () => {
  for (const item of [
    { button: "middle", sequence: "\x1b[<1;1;1M\x1b[<33;6;2M\x1b[<1;6;2m" },
    { button: "right", sequence: "\x1b[<2;1;1M\x1b[<34;6;2M\x1b[<2;6;2m" },
  ] as const) {
    const moves: Array<[string, TuiMouseEvent["button"]]> = [];
    let target: unknown;
    function App() {
      useDraggable(() => target, {
        onStart(_position, event) {
          moves.push([event.type, event.button]);
        },
        onMove(_position, event) {
          moves.push([event.type, event.button]);
        },
        onEnd(_position, event) {
          moves.push([event.type, event.button]);
        },
      });
      return createComponent(Box, {
        width: 4,
        height: 2,
        ref(node: unknown) {
          target = node;
        },
      });
    }

    const result = await render(App, { fullscreen: true });
    try {
      await result.stdin.write(item.sequence);
      expect(moves).toEqual([
        ["dragstart", item.button],
        ["drag", item.button],
        ["dragend", item.button],
      ]);
    } finally {
      result.unmount();
    }
  }
});

test("inline handlers warn once, while TERM=dumb never delivers targeted events", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  let clicks = 0;
  function App() {
    return createComponent(Box, {
      width: 4,
      height: 2,
      onClick() {
        clicks++;
      },
    });
  }

  const inline = await render(App);
  try {
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("app.mount({ fullscreen: true })");
  } finally {
    inline.unmount();
  }

  warn.mockClear();
  process.env["TERM"] = "dumb";
  const dumb = await render(App, { fullscreen: true });
  try {
    await dumb.stdin.write("\x1b[<0;1;1M\x1b[<0;1;1m");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(clicks).toBe(0);
  } finally {
    dumb.unmount();
    process.env["TERM"] = "xterm-256color";
    warn.mockRestore();
  }
});
