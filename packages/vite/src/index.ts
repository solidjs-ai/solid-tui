import solid from "vite-plugin-solid";
import type { Plugin } from "vite";
import { devVmodPlugin } from "./dev-vmod.ts";
import { devPlugin } from "./dev.ts";
import { buildConfigPlugin } from "./build.ts";
import { solidRuntimeConfigPlugin } from "./solid-runtime-config.ts";

export interface SolidTuiOptions {
  solid?: Parameters<typeof solid>[0];
  entry?: string;
}

export function solidTui(options: SolidTuiOptions = {}): Plugin[] {
  // solidTui() owns the Solid TSX compiler configuration because Solid's universal renderer needs
  // a custom moduleName. Consumers can still pass vite-plugin-solid options through `solid`.
  const { dev, build } = normalizeEntry(options.entry);
  const solidOptions = {
    ...options.solid,
    solid: {
      ...(options.solid as { solid?: Record<string, unknown> } | undefined)?.solid,
      generate: "universal",
      moduleName: "@solid-tui/runtime",
    },
  } as Parameters<typeof solid>[0];

  return [
    solidRuntimeConfigPlugin(),
    devPlugin({ entry: dev }),
    buildConfigPlugin({ entry: build }),
    devVmodPlugin(),
    solid(solidOptions) as Plugin,
  ];
}

function normalizeEntry(entry?: string): { dev: string; build: string } {
  const e = (entry ?? "src/main.tsx").replace(/\\/g, "/");
  if (e.startsWith("/") || /^[a-zA-Z]:\//.test(e)) return { dev: e, build: e };
  const bare = e.replace(/^(?:\.\/)+/, "");
  return { dev: `/${bare}`, build: bare };
}

export default solidTui;
