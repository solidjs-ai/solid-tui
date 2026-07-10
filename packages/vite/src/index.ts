import solid from "vite-plugin-solid";
import type { Plugin } from "vite";
import { devVmodPlugin } from "./dev-vmod.ts";
import { devPlugin } from "./dev.ts";
import { solidRuntimeConfigPlugin } from "./solid-runtime-config.ts";

export interface SolidTuiOptions {
  solid?: Parameters<typeof solid>[0];
  entry?: string;
}

export function solidTui(options: SolidTuiOptions = {}): Plugin[] {
  // solidTui() is dev-only. It owns the dev compiler because Solid always authors in JSX and the
  // universal renderer's moduleName must not be left to consumer convention. Production builds use
  // tsdown + unplugin-solid/rolldown with the same universal compiler options.
  const entry = normalizeDevEntry(options.entry);
  const solidOptions = {
    ...options.solid,
    solid: {
      ...(options.solid as { solid?: Record<string, unknown> } | undefined)?.solid,
      generate: "universal",
      moduleName: "@solid-tui/runtime",
    },
  } as Parameters<typeof solid>[0];
  const solidCompiler = solid(solidOptions) as Plugin;
  solidCompiler.apply = "serve";

  return [solidRuntimeConfigPlugin(), devPlugin({ entry }), devVmodPlugin(), solidCompiler];
}

function normalizeDevEntry(entry?: string): string {
  const e = (entry ?? "src/main.tsx").replace(/\\/g, "/");
  if (e.startsWith("/") || /^[a-zA-Z]:\//.test(e)) return e;
  const bare = e.replace(/^(?:\.\/)+/, "");
  return `/${bare}`;
}

export default solidTui;
