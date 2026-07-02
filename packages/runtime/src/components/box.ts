import { splitProps, useContext } from "../solid-client.ts";
import { createElement, insert, spread } from "../renderer.ts";
import { AppContextKey } from "../context.ts";
import { assertBoxValid } from "./box-validate.ts";
import type { BoxProps } from "./box-props.ts";
import type { JSX } from "../solid-client.ts";

export function Box(props: BoxProps): JSX.Element {
  const appCtx = useContext(AppContextKey);
  const [local, rest] = splitProps(props, ["children", "ariaHidden", "ariaLabel"]);
  const el = createElement("tui-box");

  spread(el, rest, true);
  insert(el, () => {
    const srEnabled = appCtx?.isScreenReaderEnabled ?? false;
    return srEnabled && local.ariaLabel ? local.ariaLabel : local.children;
  });

  return (() => {
    const srEnabled = appCtx?.isScreenReaderEnabled ?? false;
    if (srEnabled && local.ariaHidden) return null;
    if (!srEnabled) assertBoxValid(props);
    return el;
  }) as unknown as JSX.Element;
}
