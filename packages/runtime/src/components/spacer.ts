import { createElement, setProp } from "../renderer.ts";
import type { SpacerProps } from "./spacer-props.ts";

export function Spacer(_props: SpacerProps) {
  const el = createElement("tui-box");
  setProp(el, "flexGrow", 1);
  setProp(el, "flexShrink", 1);
  return el;
}
