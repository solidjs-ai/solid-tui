import { useContext } from "../solid-client.ts";
import { AppContextKey } from "../context.ts";

export interface UseAppReturn {
  readonly exit: (errorOrResult?: unknown) => void;
  readonly waitUntilRenderFlush: () => Promise<void>;
}

export function useApp(): UseAppReturn {
  const ctx = useContext(AppContextKey);
  if (!ctx) throw new Error("useApp() must be called inside a solid-tui render tree");
  return { exit: ctx.exit, waitUntilRenderFlush: ctx.waitUntilRenderFlush };
}
