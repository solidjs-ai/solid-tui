import { useContext, type Accessor } from "../solid-client.ts";
import { FocusContextKey } from "../context.ts";

export function useFocusManager(): {
  enableFocus: () => void;
  disableFocus: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
  focus: (id: string) => void;
  activeId: Accessor<string | null>;
} {
  const ctx = useContext(FocusContextKey);
  if (!ctx) throw new Error("useFocusManager() must be called inside a solid-tui render tree");
  return {
    enableFocus: ctx.enableFocus.bind(ctx),
    disableFocus: ctx.disableFocus.bind(ctx),
    focusNext: ctx.focusNext.bind(ctx),
    focusPrevious: ctx.focusPrevious.bind(ctx),
    focus: ctx.focus.bind(ctx),
    activeId: ctx.activeIdValue,
  };
}
