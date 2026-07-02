import { useContext } from "../solid-client.ts";
import { AppContextKey } from "../context.ts";

export interface UseStderrReturn {
  readonly stderr: NodeJS.WriteStream;
  readonly write: (data: string) => void;
}

export function useStderr(): UseStderrReturn {
  const ctx = useContext(AppContextKey);
  if (!ctx) throw new Error("useStderr() must be called inside a solid-tui render tree");
  return { stderr: ctx.stderr, write: (data) => ctx.writeToStderr(data) };
}
