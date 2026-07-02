import { defineConfig } from "vite-plus";
import { createRequire } from "node:module";
import solid from "vite-plugin-solid";

const require = createRequire(import.meta.url);
const solidClientEntry = require.resolve("solid-js/dist/solid.js");

export default defineConfig({
  plugins: [
    solid({
      solid: {
        generate: "universal",
        moduleName: "@solid-tui/runtime",
      },
    }),
  ],
  pack: {
    entry: ["src/index.ts"],
    dts: true,
    exports: true,
    rolldown: {
      resolve: {
        alias: [{ find: /^solid-js$/, replacement: solidClientEntry }],
      },
    },
  },
  test: {
    environment: "node",
    env: { FORCE_COLOR: "3", CI: "false" },
  },
});
