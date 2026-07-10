import { createRequire } from "node:module";
import { defineConfig } from "tsdown";
import Solid from "unplugin-solid/rolldown";

const require = createRequire(import.meta.url);

export default defineConfig({
  entry: ["src/main.tsx"],
  platform: "node",
  format: "esm",
  deps: { alwaysBundle: [/./], onlyBundle: false },
  inputOptions: {
    external: /^node:/,
    resolve: {
      alias: {
        "solid-js/store": require.resolve("solid-js/store/dist/store.js"),
        "solid-js": require.resolve("solid-js/dist/solid.js"),
      },
    },
  },
  outputOptions: { codeSplitting: false },
  plugins: [
    Solid({
      dev: false,
      hot: false,
      solid: { generate: "universal", moduleName: "@solid-tui/runtime" },
    }),
  ],
});
