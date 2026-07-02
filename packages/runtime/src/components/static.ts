import { createEffect, createSignal, type JSX } from "../solid-client.ts";
import { createElement, insert, spread } from "../renderer.ts";
import type { StaticProps } from "./static-props.ts";

export function Static<T = unknown>(props: StaticProps<T>): JSX.Element {
  const [cursor, setCursor] = createSignal(0);
  const el = createElement("tui-static");

  const onWritten = () => {
    setCursor(props.items.length);
  };

  createEffect(() => {
    const len = props.items.length;
    if (len < cursor()) setCursor(len);
  });

  spread(
    el,
    () => ({
      position: "absolute",
      flexDirection: "column",
      ...props.style,
      internal_onWritten: onWritten,
    }),
    true,
  );

  insert(el, () => {
    const renderItem = props.children;
    if (!renderItem) return null;
    return props.items.slice(cursor()).map((item, i) =>
      renderItem({
        item,
        index: cursor() + i,
      }),
    );
  });

  return el as unknown as JSX.Element;
}
