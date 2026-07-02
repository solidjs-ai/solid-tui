import { defineConfig } from "vite-plus";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const solidClientEntry = require.resolve("solid-js/dist/solid.js");

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/internal.ts"],
    dts: true,
    exports: true,
    rolldown: {
      resolve: {
        alias: [{ find: /^solid-js$/, replacement: solidClientEntry }],
      },
    },
  },
});
