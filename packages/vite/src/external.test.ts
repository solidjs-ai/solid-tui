import { describe, expect, test } from "vite-plus/test";
import { isExternalId } from "./external.ts";

describe("isExternalId", () => {
  test("keeps Solid runtime ids bundled", () => {
    expect(isExternalId("solid-js")).toBe(false);
    expect(isExternalId("solid-js/store")).toBe(false);
  });

  test("keeps source and virtual ids bundled", () => {
    expect(isExternalId("./app.tsx")).toBe(false);
    expect(isExternalId("/tmp/app.tsx")).toBe(false);
    expect(isExternalId("virtual:solid-tui/dev")).toBe(false);
    expect(isExternalId("\0virtual:solid-tui/dev")).toBe(false);
  });

  test("externalizes ordinary bare dependencies", () => {
    expect(isExternalId("chalk")).toBe(true);
  });
});
