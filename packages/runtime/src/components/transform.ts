import { children, createComponent, splitProps, useContext } from "../solid-client.ts";
import { createElement, insert, spread } from "../renderer.ts";
import { AppContextKey, TextContextKey } from "../context.ts";
import type { JSX } from "../solid-client.ts";

type TransformFn = (line: string, lineIndex: number) => string;

export interface TransformProps {
  transform: TransformFn;
  accessibilityLabel?: string;
  children?: JSX.Element;
}

function isEmpty(value: unknown): boolean {
  if (value == null || value === false || value === true) return true;
  if (Array.isArray(value)) return value.every(isEmpty);
  return false;
}

export function Transform(props: TransformProps): JSX.Element {
  const appCtx = useContext(AppContextKey);
  const [local, rest] = splitProps(props, ["children", "accessibilityLabel"]);
  const content = createComponent(TextContextKey.Provider, {
    value: true,
    get children() {
      return local.children;
    },
  });
  const resolved = children(() => content);
  const el = createElement("tui-transform");

  spread(el, rest, true);
  insert(el, () => {
    const srEnabled = appCtx?.isScreenReaderEnabled ?? false;
    return srEnabled && local.accessibilityLabel ? local.accessibilityLabel : resolved();
  });

  return (() => (isEmpty(resolved()) ? null : el)) as unknown as JSX.Element;
}
