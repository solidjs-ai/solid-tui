import type { Plugin } from "vite";

const solidClientEntry = "solid-js/dist/solid.js";
const solidStoreEntry = "solid-js/store/dist/store.js";

export function solidRuntimeConfigPlugin(): Plugin {
  return {
    name: "solid-tui:solid-runtime-config",
    apply: "serve",
    config() {
      return {
        resolve: {
          alias: [
            { find: /^solid-js\/store$/, replacement: solidStoreEntry },
            { find: /^solid-js$/, replacement: solidClientEntry },
          ],
        },
        ssr: {
          noExternal: ["solid-js", "@solid-tui/runtime"],
        },
      };
    },
  };
}
