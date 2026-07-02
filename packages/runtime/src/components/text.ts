import { createComponent, splitProps, useContext } from "../solid-client.ts";
import { createElement, insert, spread } from "../renderer.ts";
import { AppContextKey, TextContextKey } from "../context.ts";
import { assertValidBackgroundColor, assertValidForegroundColor } from "../paint/text-style.ts";
import type { TextProps } from "./text-props.ts";
import type { JSX } from "../solid-client.ts";

export function Text(props: TextProps): JSX.Element {
  const insideText = useContext(TextContextKey);
  const appCtx = useContext(AppContextKey);
  const [local, rest] = splitProps(props, ["children", "ariaHidden", "ariaLabel"]);
  const el = createElement(insideText ? "tui-virtual-text" : "tui-text");
  const content = createComponent(TextContextKey.Provider, {
    value: true,
    get children() {
      return local.children;
    },
  });

  spread(
    el,
    () => ({
      ...rest,
      wrap: rest.wrap ?? "wrap",
      ...(insideText ? null : { flexShrink: 1 }),
    }),
    true,
  );
  insert(el, () => {
    const srEnabled = appCtx?.isScreenReaderEnabled ?? false;
    return srEnabled && local.ariaLabel ? local.ariaLabel : content;
  });

  return (() => {
    const srEnabled = appCtx?.isScreenReaderEnabled ?? false;
    if (srEnabled && local.ariaHidden) return null;
    if (!srEnabled) {
      assertValidForegroundColor(rest.color);
      assertValidBackgroundColor(rest.backgroundColor);
    }
    const hasContent = (srEnabled && local.ariaLabel != null) || local.children != null;
    return hasContent ? el : null;
  }) as unknown as JSX.Element;
}
