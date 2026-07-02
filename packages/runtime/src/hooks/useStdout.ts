import { useContext } from "../solid-client.ts";
import { AppContextKey } from "../context.ts";

export interface UseStdoutReturn {
  readonly stdout: NodeJS.WriteStream;
  readonly write: (data: string) => void;
}

export function useStdout(): UseStdoutReturn {
  const ctx = useContext(AppContextKey);
  if (!ctx) throw new Error("useStdout() must be called inside a solid-tui render tree");
  return { stdout: ctx.stdout, write: (data) => ctx.writeToStdout(data) };
}
