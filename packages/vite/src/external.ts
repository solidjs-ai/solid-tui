import { posix, win32 } from "node:path";

// Externalize bare imports (resolved from node_modules at runtime by Node) but KEEP
// in the bundle: relative imports, ABSOLUTE paths, Rollup virtual ids ("\0..."), and
// our "virtual:" ids (no on-disk file — externalizing them would crash at runtime).
//
// Absolute source ids must count as internal. We test BOTH posix.isAbsolute AND
// win32.isAbsolute, not a bare `/`-prefix check: on Windows source ids can be
// drive-letter paths like `D:\app\src\App.tsx` (or `D:/…`, or a `\\server\share`
// UNC path) that a POSIX-only `/` check misses.
export function isExternalId(id: string): boolean {
  if (id.startsWith("\0") || id.startsWith("virtual:")) return false;
  if (id === "solid-js") return false;
  if (id === "solid-js/store" || id.startsWith("solid-js/store/")) return false;
  if (id.startsWith(".")) return false;
  if (posix.isAbsolute(id) || win32.isAbsolute(id)) return false;
  return true;
}
