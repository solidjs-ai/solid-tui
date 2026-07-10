import { describe, expect, test } from "vite-plus/test";
import { parseMouseInput, parseSgrMouseInput } from "./parse-mouse.ts";

describe("parseSgrMouseInput", () => {
  test("decodes button press, release, and drag events", () => {
    expect(parseSgrMouseInput("\x1b[<0;3;4M")).toEqual({
      type: "down",
      button: "left",
      x: 3,
      y: 4,
      shift: false,
      meta: false,
      ctrl: false,
    });
    expect(parseSgrMouseInput("\x1b[<1;5;6m")).toEqual({
      type: "up",
      button: "middle",
      x: 5,
      y: 6,
      shift: false,
      meta: false,
      ctrl: false,
    });
    expect(parseSgrMouseInput("\x1b[<34;7;8M")).toEqual({
      type: "drag",
      button: "right",
      x: 7,
      y: 8,
      shift: false,
      meta: false,
      ctrl: false,
    });
  });

  test("keeps modifier bits and wheel directions", () => {
    expect(parseSgrMouseInput("\x1b[<28;9;10M")).toMatchObject({
      type: "down",
      shift: true,
      meta: true,
      ctrl: true,
    });
    expect(parseSgrMouseInput("\x1b[<64;1;2M")).toMatchObject({ type: "wheel", direction: "up" });
    expect(parseSgrMouseInput("\x1b[<67;1;2M")).toMatchObject({
      type: "wheel",
      direction: "right",
    });
  });

  test("drops unsupported buttons and keeps the public parser vertical-wheel-only", () => {
    expect(parseSgrMouseInput("\x1b[<3;1;2M")).toBeUndefined();
    expect(parseMouseInput("\x1b[<64;1;2M")).toEqual({
      type: "wheel",
      direction: "up",
      x: 1,
      y: 2,
      shift: false,
      meta: false,
      ctrl: false,
    });
    expect(parseMouseInput("\x1b[<0;1;2M")).toBeUndefined();
    expect(parseMouseInput("\x1b[<66;1;2M")).toBeUndefined();
  });
});
