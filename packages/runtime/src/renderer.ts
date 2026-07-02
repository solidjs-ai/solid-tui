import type { JSX } from "solid-js";
import { createRenderer } from "./solid-universal.ts";
import { buildNodeOps } from "./host/node-ops.ts";
import type { TuiNode } from "./host/nodes.ts";

let onCommit: () => void = () => {};

export function setRendererCommit(fn: () => void): () => void {
  const previous = onCommit;
  onCommit = fn;
  return () => {
    onCommit = previous;
  };
}

export const tuiRenderer = createRenderer<TuiNode>(
  buildNodeOps({
    onCommit: () => onCommit(),
  }),
);

export const renderSolidRoot = tuiRenderer.render;
export const createElement = tuiRenderer.createElement;
export const createTextNode = tuiRenderer.createTextNode;
export const insertNode = tuiRenderer.insertNode;
export const insert = tuiRenderer.insert;
export const spread = tuiRenderer.spread;
export const setProp = tuiRenderer.setProp;
export const mergeProps = tuiRenderer.mergeProps;
export const effect = tuiRenderer.effect;
export const memo = tuiRenderer.memo;
export const createComponent = tuiRenderer.createComponent as unknown as <T>(
  component: (props: T) => unknown,
  props: T,
) => JSX.Element;
export const use = tuiRenderer.use;
