/// <reference types="vite-plus/test/globals" />
import type { TuiApp } from "@solid-tui/runtime";

declare const afterEach: undefined | ((fn: () => void) => void);

const activeApps: TuiApp[] = [];

export function trackApp(app: TuiApp): void {
  activeApps.push(app);
}

export function cleanup(): void {
  for (const app of activeApps) {
    app.unmount();
  }
  activeApps.length = 0;
}

if (typeof afterEach === "function") {
  afterEach(() => cleanup());
}
