import {
  createEffect,
  createSignal,
  onCleanup,
  useContext,
  type Accessor,
} from "../solid-client.ts";
import { FocusContextKey, StdinContextKey } from "../context.ts";

let nextAutoId = 0;

export interface UseFocusOptions {
  autoFocus?: boolean | (() => boolean);
  isActive?: boolean | (() => boolean);
  id?: string | (() => string | undefined);
}

const read = <T>(value: T | (() => T)): T =>
  typeof value === "function" ? (value as () => T)() : value;

export function useFocus(options: UseFocusOptions = {}): {
  isFocused: Accessor<boolean>;
  focus: (id: string) => void;
} {
  const ctx = useContext(FocusContextKey);
  const stdin = useContext(StdinContextKey);
  if (!ctx) throw new Error("useFocus() must be called inside a solid-tui render tree");

  const fallbackId = `__auto-${nextAutoId++}`;
  const [isFocused, setFocused] = createSignal(false);
  let rawModeAcquired = false;
  let currentId: string | undefined;
  let unsubscribe: (() => void) | undefined;

  const unregister = () => {
    if (currentId === undefined) return;
    unsubscribe?.();
    unsubscribe = undefined;
    ctx.remove(currentId);
    currentId = undefined;
  };

  const acquireRaw = () => {
    if (!rawModeAcquired && stdin?.isRawModeSupported) {
      stdin.acquireRawMode();
      rawModeAcquired = true;
    }
  };

  const releaseRaw = () => {
    if (rawModeAcquired && stdin) {
      stdin.releaseRawMode();
      rawModeAcquired = false;
    }
  };

  createEffect(() => {
    const id = read(options.id ?? fallbackId) ?? fallbackId;
    const autoFocus = read(options.autoFocus ?? false);
    if (id === currentId) return;
    unregister();
    setFocused(false);
    unsubscribe = ctx.subscribe(id, setFocused);
    ctx.add(id, { autoFocus });
    currentId = id;
    setFocused(ctx.activeId === id);
    if (read(options.isActive ?? true)) {
      ctx.activate(id);
      acquireRaw();
    } else {
      ctx.deactivate(id);
    }
  });

  createEffect(() => {
    if (currentId === undefined) return;
    if (read(options.isActive ?? true)) {
      ctx.activate(currentId);
      acquireRaw();
    } else {
      ctx.deactivate(currentId);
      releaseRaw();
    }
  });

  onCleanup(() => {
    unregister();
    releaseRaw();
  });

  return { isFocused, focus: ctx.focus };
}
