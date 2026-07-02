import { createContext, createSignal, type Accessor } from "./solid-client.ts";

export interface DevErrorInfo {
  message: string;
  stack?: string;
  loc?: { file: string; line: number; column: number };
}

export type DevState =
  | { type: "ok" }
  | { type: "error"; error: DevErrorInfo }
  | { type: "update"; paths: string[] };

const [readDevState, writeDevState] = createSignal<DevState>({ type: "ok" });

export const DevStateKey = createContext<Accessor<DevState>>();
export const devState = {
  get value(): DevState {
    return readDevState();
  },
  set value(next: DevState) {
    writeDevState(next);
  },
  read: readDevState,
};

interface HotContext {
  on(event: string, cb: (payload: unknown) => void): void;
  send(event: string, data?: unknown): void;
}

const realHot = (import.meta as { hot?: HotContext }).hot;
let bridgedHot: HotContext | undefined;
let currentDevAppTeardown: (() => void) | undefined;
let pendingResetTimer: ReturnType<typeof setTimeout> | undefined;
let devConnected = false;

export function registerDevApp(teardown: () => void): void {
  currentDevAppTeardown = teardown;
}

export function unregisterDevApp(teardown: () => void): void {
  if (currentDevAppTeardown === teardown) currentDevAppTeardown = undefined;
}

export function initHmrBridge(hot: HotContext | undefined = realHot): void {
  if (!hot || hot === bridgedHot) return;
  bridgedHot = hot;

  hot.on("vite:error", (payload: unknown) => {
    if (pendingResetTimer !== undefined) {
      clearTimeout(pendingResetTimer);
      pendingResetTimer = undefined;
    }
    const p = payload as { err: DevErrorInfo };
    devState.value = { type: "error", error: p.err };
  });

  hot.on("vite:beforeUpdate", (payload: unknown) => {
    if (pendingResetTimer !== undefined) {
      clearTimeout(pendingResetTimer);
      pendingResetTimer = undefined;
    }
    const p = payload as { updates: Array<{ path: string }> };
    devState.value = { type: "update", paths: p.updates.map((u) => u.path) };
    const timer = setTimeout(() => {
      pendingResetTimer = undefined;
      if (devState.value.type === "update") devState.value = { type: "ok" };
    }, 2000);
    pendingResetTimer = timer;
    timer.unref?.();
  });

  hot.on("vite:beforeFullReload", () => {
    currentDevAppTeardown?.();
    currentDevAppTeardown = undefined;
    hot.send("solid-tui:request-reload");
  });
}

export function isDevConnected(): boolean {
  return devConnected;
}

export function connectDevtools(hot: HotContext): void {
  devConnected = true;
  initHmrBridge(hot);
}

export function notifyDevExit(): void {
  bridgedHot?.send("solid-tui:exit");
}

export function resetDevState(): void {
  devState.value = { type: "ok" };
}
