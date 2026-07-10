import type { HotPayload, ViteDevServer } from "vite";

// Solid Refresh installs standard import.meta.hot acceptance boundaries, which Vite's SSR
// module runner handles on its in-process hot channel. The browser socket is disabled for a
// terminal app, though, and Vite or companion plugins can still publish custom events and
// compile errors through server.ws. Mirror those payloads into the runnable environment so
// the runtime overlay and custom dev integrations observe the same events. Error payloads
// stay intact because the runner dispatches their `.err` through `vite:error`.
export function bridgeHmrEventsToRunner(server: ViteDevServer): void {
  const ssr = server.environments.ssr;
  if (!ssr) return;
  const ws = server.ws as { send: (...a: [HotPayload] | [string, unknown?]) => void };
  const original = ws.send.bind(ws);
  ws.send = (...args: [HotPayload] | [string, unknown?]): void => {
    const payload: HotPayload =
      typeof args[0] === "string" ? { type: "custom", event: args[0], data: args[1] } : args[0];
    if (payload.type === "custom" || payload.type === "error") ssr.hot.send(payload);
    original(...args);
  };
}
