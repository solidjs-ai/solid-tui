import type { Node as YogaNode } from "better-yoga-layout";
import type { TuiNode, TuiRoot } from "./nodes.ts";

function hasYoga(value: unknown): value is { yoga: YogaNode } {
  return Boolean(value && typeof value === "object" && "yoga" in value);
}

/** Solid host refs already resolve to the rendered TUI node; no component-instance walk is needed. */
export function resolveTuiNode(value: unknown): TuiNode | null {
  if (!value || typeof value !== "object") return null;
  const node = value as Record<string, unknown>;
  return typeof node.type === "string" ? (node as unknown as TuiNode) : null;
}

export function resolveYogaNode(value: unknown): { yoga: YogaNode } | null {
  if (hasYoga(value)) return value;
  const node = resolveTuiNode(value);
  return node && "yoga" in node ? (node as { yoga: YogaNode }) : null;
}

export function findRootNode(node: TuiNode | null): TuiRoot | null {
  let current = node;
  while (current) {
    if (current.type === "root") return current;
    current = current.parent;
  }
  return null;
}
