import { createEffect, createSignal, onCleanup, type Accessor } from "../solid-client.ts";
import type { Node as YogaNode } from "better-yoga-layout";
import { addLayoutListener, type TuiNode, type TuiRoot } from "../host/nodes.ts";

export interface BoxMetrics {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly top: number;
}

export interface UseBoxMetricsReturn {
  readonly width: Accessor<number>;
  readonly height: Accessor<number>;
  readonly left: Accessor<number>;
  readonly top: Accessor<number>;
  readonly hasMeasured: Accessor<boolean>;
}

function resolveYogaNode(value: unknown): { yoga: YogaNode } | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (obj.yoga) return obj as { yoga: YogaNode };
  return null;
}

function resolveTuiNode(value: unknown): TuiNode | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  return typeof obj.type === "string" ? (obj as unknown as TuiNode) : null;
}

function findRootNode(node: TuiNode | null): TuiRoot | null {
  let current: TuiNode | null = node;
  while (current) {
    if (current.type === "root") return current;
    current = current.parent;
  }
  return null;
}

export function measureElement(node: unknown): { width: number; height: number } {
  const tuiNode = resolveYogaNode(node);
  if (!tuiNode) return { width: 0, height: 0 };
  const width = tuiNode.yoga.getComputedWidth();
  const height = tuiNode.yoga.getComputedHeight();
  return {
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
  };
}

export function useBoxMetrics(ref: Accessor<unknown>): UseBoxMetricsReturn {
  const [width, setWidth] = createSignal(0);
  const [height, setHeight] = createSignal(0);
  const [left, setLeft] = createSignal(0);
  const [top, setTop] = createSignal(0);
  const [hasMeasured, setHasMeasured] = createSignal(false);
  let unsubscribeLayout: (() => void) | undefined;

  function updateMetrics() {
    const node = resolveYogaNode(ref());
    if (!node) {
      setWidth(0);
      setHeight(0);
      setLeft(0);
      setTop(0);
      setHasMeasured(false);
      return;
    }

    const w = node.yoga.getComputedWidth();
    const h = node.yoga.getComputedHeight();
    const l = node.yoga.getComputedLeft();
    const t = node.yoga.getComputedTop();

    setWidth(Number.isFinite(w) ? w : 0);
    setHeight(Number.isFinite(h) ? h : 0);
    setLeft(Number.isFinite(l) ? l : 0);
    setTop(Number.isFinite(t) ? t : 0);
    setHasMeasured(true);
  }

  createEffect(() => {
    unsubscribeLayout?.();
    unsubscribeLayout = undefined;
    const root = findRootNode(resolveTuiNode(ref()));
    if (root) {
      unsubscribeLayout = addLayoutListener(root, updateMetrics);
      updateMetrics();
    } else {
      updateMetrics();
    }
  });

  onCleanup(() => unsubscribeLayout?.());

  return { width, height, left, top, hasMeasured };
}
