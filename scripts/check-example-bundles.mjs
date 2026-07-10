import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { isBuiltin } from "node:module";

const bundles = new Map([
  ["basic", "main.mjs"],
  ["coding-agent", "main.mjs"],
  ["flappy-bird", "game.mjs"],
  ["mouse", "main.mjs"],
  ["scroll-box", "main.mjs"],
]);

const staticImport = /^\s*(?:import|export)\s+(?:[^;"']+\s+from\s+)?["']([^"']+)["']/gm;
const dynamicImport = /\bimport\(\s*["']([^"']+)["']/g;
const failures = [];

for (const [example, outputName] of bundles) {
  const dist = join("examples", example, "dist");
  const output = join(dist, outputName);
  const files = (await readdir(dist)).filter((file) => file.endsWith(".mjs"));
  if (files.length !== 1 || files[0] !== outputName) {
    failures.push(`${example}: expected only ${outputName}, found ${files.join(", ") || "none"}`);
    continue;
  }

  const syntax = spawnSync(process.execPath, ["--check", output], { encoding: "utf8" });
  if (syntax.status !== 0) {
    failures.push(`${example}: generated bundle failed node --check\n${syntax.stderr.trim()}`);
    continue;
  }

  const source = await readFile(output, "utf8");
  const imports = new Set([
    ...Array.from(source.matchAll(staticImport), (match) => match[1]),
    ...Array.from(source.matchAll(dynamicImport), (match) => match[1]),
  ]);
  const nonBuiltinImports = [...imports].filter((specifier) => !isBuiltin(specifier));
  if (nonBuiltinImports.length > 0) {
    failures.push(`${example}: bundle retains external imports: ${nonBuiltinImports.join(", ")}`);
  }
}

if (failures.length > 0) {
  console.error("Example bundle checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Verified ${bundles.size} self-contained example bundles.`);
