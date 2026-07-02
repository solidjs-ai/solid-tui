import type { Plugin } from "vite";
import { isRunnableDevEnvironment } from "vite";
import { bridgeHmrEventsToRunner } from "./bridge-hmr.ts";
import { DEV_VMOD_ID } from "./dev-vmod.ts";

export function devPlugin(opts: { entry?: string }): Plugin {
  const entry = opts.entry ?? "/src/main.tsx";
  return {
    name: "solid-tui:dev",
    apply: "serve",
    config() {
      // Terminal renderer owns the screen; keep Vite quiet and skip the browser HMR
      // socket (HMR flows through the module runner's in-process channel instead).
      return {
        clearScreen: false,
        logLevel: "error",
        server: { ws: false },
      };
    },
    transform(code, id) {
      // Inject the dev connector at the TOP of the configured entry (a transformed
      // module → its import.meta.hot is live). Runs before createApp().mount(), so
      // isDevConnected() is already true when the overlay gate is checked. `id` is an
      // ABSOLUTE fs path and `entry` is the rooted form normalizeEntry() produced (a leading
      // "/" or a drive-letter path), so endsWith matches both the default and a custom entry —
      // and must inject into exactly the entry configureServer's runner.import(entry) loads.
      const q = id.indexOf("?");
      const path = q === -1 ? id : id.slice(0, q);
      if (path.endsWith(entry)) {
        return { code: `import ${JSON.stringify(DEV_VMOD_ID)};\n` + code, map: null };
      }
    },
    configureServer(server) {
      if (server.config.mode === "test" || process.env.VITEST) return;
      // The in-process TUI owns process.stdin (raw mode). Vite's CLI keyboard shortcuts
      // (q=quit, r=restart, …) attach their own readline 'line' listener to process.stdin, so a
      // submitted "q"/"r"/… line would run a dev-server action out from under the running app
      // (q = server.close()). Neutralize them — the terminal app, not the CLI, owns the keys.
      server.bindCLIShortcuts = () => {};
      bridgeHmrEventsToRunner(server);
      // App-exit → server teardown. The app runs in-process, so the dev server
      // holds the event loop open (ports, watchers, the module runner). When the
      // app genuinely exits, the runtime emits "solid-tui:exit" over the in-process hot channel;
      // close the server so the process can exit cleanly instead of hanging on the still-open
      // server. A full reload does NOT settle the app's exit promise, so it never emits this.
      server.environments.ssr?.hot.on("solid-tui:exit", () => {
        void server.close();
      });
      return () => {
        const env = server.environments.ssr;
        if (!isRunnableDevEnvironment(env)) {
          server.config.logger.error('[solid-tui] the "ssr" environment is not runnable');
          return;
        }
        void env.runner.import(entry).catch((err: unknown) => {
          server.config.logger.error(`[solid-tui] failed to launch ${entry}`);
          console.error(err);
        });
      };
    },
  };
}
