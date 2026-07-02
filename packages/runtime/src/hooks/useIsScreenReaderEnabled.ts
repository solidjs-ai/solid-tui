import { useContext } from "../solid-client.ts";
import { AppContextKey } from "../context.ts";

export function useIsScreenReaderEnabled(): boolean {
  const ctx = useContext(AppContextKey);
  if (!ctx)
    throw new Error("useIsScreenReaderEnabled() must be called inside a solid-tui render tree");
  return ctx.isScreenReaderEnabled;
}
