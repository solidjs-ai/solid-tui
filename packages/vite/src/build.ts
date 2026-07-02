import type { Plugin } from "vite";
import { isExternalId } from "./external.ts";

// Production build path: `vite build` → a Node entry. The dev plugins are apply: "serve" and this
// one is apply: "build", so they coexist in the solidTui() array and Vite applies the right set per
// mode.
export function buildConfigPlugin(opts: { entry?: string }): Plugin {
  const entry = opts.entry ?? "src/main.tsx";
  return {
    name: "solid-tui:build",
    apply: "build",
    config(userConfig) {
      const userBuild = userConfig?.build;
      const consumerSetExternal =
        userBuild?.rolldownOptions?.external !== undefined ||
        userBuild?.rollupOptions?.external !== undefined;
      return {
        build: {
          // Node runs the output directly — keep modern syntax (top-level await, etc.) instead of
          // down-leveling for browsers.
          target: "esnext",
          // The module-preload polyfill is a browser-only helper; it's meaningless for a Node entry.
          modulePreload: false,
          rolldownOptions: {
            // Name the entry directly so the build does not look for an index.html.
            input: entry,
            // DEFAULT ONLY: externalize bare deps; relative/virtual/source ids stay bundled. Omitted
            // when the consumer set their own external, so theirs takes effect instead.
            ...(consumerSetExternal ? {} : { external: (id: string) => isExternalId(id) }),
            // Emit `<name>.js` (e.g. main.js) rather than a hashed asset name.
            output: { entryFileNames: "[name].js" },
          },
        },
      };
    },
  };
}
