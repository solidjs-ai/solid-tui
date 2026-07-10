import { afterAll, beforeAll, expect, test } from "vite-plus/test";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveConfig } from "vite";

const root = fileURLToPath(new URL("./fixtures/cjs-config", import.meta.url));
const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const fixtureModules = `${root}/node_modules`;

beforeAll(() => {
  rmSync(fixtureModules, { recursive: true, force: true });
  mkdirSync(`${fixtureModules}/@solid-tui`, { recursive: true });
  symlinkSync(packageRoot, `${fixtureModules}/@solid-tui/vite`, "junction");
});

afterAll(() => {
  rmSync(fixtureModules, { recursive: true, force: true });
});

test("loads @solid-tui/vite from a CommonJS Vite config", async () => {
  const config = await resolveConfig(
    { root, configFile: `${root}/vite.config.ts`, logLevel: "silent" },
    "serve",
  );
  expect(config.plugins.some((plugin) => plugin.name?.startsWith("solid-tui"))).toBe(true);
});
