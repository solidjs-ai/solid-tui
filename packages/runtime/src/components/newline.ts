import { useContext } from "../solid-client.ts";
import { createElement, insert } from "../renderer.ts";
import { TextContextKey } from "../context.ts";
import type { NewlineProps } from "./newline-props.ts";

export function Newline(props: NewlineProps) {
  const insideText = useContext(TextContextKey);
  const el = createElement(insideText ? "tui-virtual-text" : "tui-text");
  insert(el, () => "\n".repeat(props.count ?? 1));
  return el;
}
