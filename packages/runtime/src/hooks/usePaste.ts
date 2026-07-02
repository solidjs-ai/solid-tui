import { createEffect, onCleanup, useContext } from "../solid-client.ts";
import { StdinContextKey } from "../context.ts";

export interface UsePasteOptions {
  isActive?: boolean | (() => boolean);
}

type PasteHandler = (text: string) => void;

const read = <T>(value: T | (() => T)): T =>
  typeof value === "function" ? (value as () => T)() : value;

export function usePaste(handler: PasteHandler, options: UsePasteOptions = {}): void {
  const stdin = useContext(StdinContextKey);
  if (!stdin) throw new Error("usePaste() must be called inside a solid-tui render tree");
  const stdinCtx = stdin;

  let attached = false;

  function listener(text: string) {
    handler(text);
  }

  function attach() {
    if (attached) return;
    attached = true;
    stdinCtx.acquireRawMode();
    stdinCtx.setBracketedPasteMode(true);
    stdinCtx.internal_eventEmitter.on("paste", listener);
  }

  function detach() {
    if (!attached) return;
    attached = false;
    stdinCtx.internal_eventEmitter.off("paste", listener);
    stdinCtx.setBracketedPasteMode(false);
    stdinCtx.releaseRawMode();
  }

  createEffect(() => {
    if (read(options.isActive ?? true)) attach();
    else detach();
  });

  onCleanup(detach);
}
