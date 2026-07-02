import { defineConfig } from "vite";
import { solidTui } from "@solid-tui/vite";

export default defineConfig({
  plugins: [solidTui({ entry: "/src/main.tsx" })],
});
