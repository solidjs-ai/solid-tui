import { createEffect, onCleanup, useContext, type Accessor } from "../solid-client.ts";
import { StdinContextKey } from "../context.ts";
import type { MouseInputEvent } from "../io/parse-mouse.ts";

export type { MouseInputEvent } from "../io/parse-mouse.ts";

export interface UseMouseInputOptions {
  isActive?: boolean | Accessor<boolean>;
}

export type MouseInputHandler = (event: MouseInputEvent) => void;

const read = <T>(value: T | Accessor<T>): T =>
  typeof value === "function" ? (value as Accessor<T>)() : value;

/**
 * Subscribe to the low-level vertical wheel stream in either inline or fullscreen mode.
 * The handler is intentionally a normal function: close over signals for reactive behavior.
 */
export function useMouseInput(
  handler: MouseInputHandler,
  options: UseMouseInputOptions = {},
): void {
  const stdin = useContext(StdinContextKey);
  if (!stdin) throw new Error("useMouseInput() must be called inside a solid-tui render tree");
  const stdinContext = stdin;

  let attached = false;
  let mouseModeToken: symbol | undefined;

  function attach() {
    if (attached) return;
    stdinContext.acquireRawMode();
    try {
      mouseModeToken = stdinContext.acquireSgrMouseMode("button");
      stdinContext.internal_eventEmitter.on("mouse", handler);
      attached = true;
    } catch (error) {
      mouseModeToken = undefined;
      stdinContext.releaseRawMode();
      throw error;
    }
  }

  function detach() {
    if (!attached) return;
    attached = false;
    stdinContext.internal_eventEmitter.off("mouse", handler);
    if (mouseModeToken) {
      stdinContext.releaseSgrMouseMode(mouseModeToken);
      mouseModeToken = undefined;
    }
    stdinContext.releaseRawMode();
  }

  createEffect(() => {
    if (read(options.isActive ?? true)) attach();
    else detach();
  });

  onCleanup(detach);
}
