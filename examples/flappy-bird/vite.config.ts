import { defineConfig } from "vite-plus";
import { solidTui } from "@solid-tui/vite";

export default defineConfig({
  plugins: [solidTui({ entry: "/src/main.tsx" })],
  test: {
    environment: "node",
  },
});
