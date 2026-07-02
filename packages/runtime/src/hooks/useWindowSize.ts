import terminalSize from "terminal-size";
import { createSignal, onCleanup, useContext, type Accessor } from "../solid-client.ts";
import { AppContextKey } from "../context.ts";

export interface WindowSize {
  readonly columns: number;
  readonly rows: number;
}

export function resolveSize(stdout: NodeJS.WriteStream): WindowSize {
  const cols = stdout.columns;
  const rowsVal = stdout.rows;
  if (cols && rowsVal) return { columns: cols, rows: rowsVal };
  const fallback = terminalSize();
  return {
    columns: cols || fallback.columns || 80,
    rows: rowsVal || fallback.rows || 24,
  };
}

export function useWindowSize(): { columns: Accessor<number>; rows: Accessor<number> } {
  const ctx = useContext(AppContextKey);
  if (!ctx) throw new Error("useWindowSize() must be called inside a solid-tui render tree");
  const appCtx = ctx;
  const initial = resolveSize(appCtx.stdout);
  const [columns, setColumns] = createSignal(initial.columns);
  const [rows, setRows] = createSignal(initial.rows);
  function onResize() {
    const size = resolveSize(appCtx.stdout);
    setColumns(size.columns);
    setRows(size.rows);
  }
  appCtx.stdout.on("resize", onResize);
  onCleanup(() => appCtx.stdout.off("resize", onResize));
  return { columns, rows };
}
