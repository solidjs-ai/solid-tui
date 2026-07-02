import { describe, expect, test } from "vite-plus/test";
import { render } from "@solid-tui/testing";
import { Spinner } from "./spinner.tsx";
import { PRESETS } from "./spinners.ts";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("Spinner", () => {
  test("renders a dots glyph by default", async () => {
    const r = await render(Spinner, { interactive: false });
    await delay(50);
    const out = r.lastFrame() ?? "";
    expect(PRESETS.dots.frames.some((glyph) => out.includes(glyph))).toBe(true);
    r.unmount();
  });

  test("custom frames override the preset", async () => {
    const r = await render(Spinner, { interactive: false, props: { frames: ["@"] } });
    await delay(50);
    expect(r.lastFrame() ?? "").toContain("@");
    r.unmount();
  });

  test("label renders after the glyph with a separating space", async () => {
    const r = await render(Spinner, {
      interactive: false,
      props: { frames: ["⠋"], label: "Done" },
    });
    await delay(20);
    expect(r.lastFrame() ?? "").toContain("⠋ Done");
    r.unmount();
  });
});
