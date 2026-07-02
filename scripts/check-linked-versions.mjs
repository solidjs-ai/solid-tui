import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = JSON.parse(await readFile("package.json", "utf8"));
const packagesDir = "packages";
const entries = await readdir(packagesDir, { withFileTypes: true });
const mismatches = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;

  const packagePath = join(packagesDir, entry.name, "package.json");
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  if (pkg.private || !pkg.name?.startsWith("@solid-tui/")) continue;

  if (pkg.version !== root.version) {
    mismatches.push(`${pkg.name}: ${pkg.version} != ${root.version}`);
  }
}

if (mismatches.length > 0) {
  console.error("Linked package versions are out of sync:");
  for (const mismatch of mismatches) console.error(`- ${mismatch}`);
  process.exit(1);
}
