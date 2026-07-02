import { createEffect, createSignal, onCleanup, useContext } from "../solid-client.ts";
import { AppContextKey, type CursorPosition } from "../context.ts";

export type { CursorPosition } from "../context.ts";

export function useCursor() {
  const ctx = useContext(AppContextKey);
  if (!ctx) throw new Error("useCursor() must be called inside a solid-tui render tree");

  const [position, setPosition] = createSignal<CursorPosition | undefined>(undefined);

  createEffect(() => {
    ctx.setCursorPosition(position());
  });

  onCleanup(() => {
    ctx.setCursorPosition(undefined);
  });

  return { setCursorPosition: setPosition };
}
