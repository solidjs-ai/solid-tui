import { useContext } from "../solid-client.ts";
import { StdinContextKey } from "../context.ts";

export interface UseStdinReturn {
  readonly stdin: NodeJS.ReadStream;
  readonly setRawMode: (mode: boolean) => void;
  readonly isRawModeSupported: boolean;
}

export function useStdin(): UseStdinReturn {
  const ctx = useContext(StdinContextKey);
  if (!ctx) throw new Error("useStdin() must be called inside a solid-tui render tree");
  return ctx;
}
