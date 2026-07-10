import type { JSX } from "solid-js";
import { Box, createComponent, createMemo, createSignal, useBoxMetrics } from "@solid-tui/runtime";
import type { ScrollBoxHandle, ScrollBoxProps } from "./scroll-box-props.ts";

const viewportProps = {
  flexDirection: "column" as const,
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0,
  minHeight: 0,
  overflowY: "hidden" as const,
  width: "100%",
};

/** A bounded viewport that follows the bottom until explicitly scrolled up. */
export function ScrollBox(props: ScrollBoxProps): JSX.Element {
  let viewportNode: unknown;
  let contentNode: unknown;
  const viewport = useBoxMetrics(() => viewportNode);
  const content = useBoxMetrics(() => contentNode);
  const [requestedScrollTop, setRequestedScrollTop] = createSignal(0);
  const [sticky, setSticky] = createSignal(true);
  const maxScroll = createMemo(() => Math.max(0, Math.ceil(content.height() - viewport.height())));
  const scrollTop = createMemo(() =>
    sticky() ? maxScroll() : clamp(requestedScrollTop(), maxScroll()),
  );

  function clamp(value: number, maximum = maxScroll()): number {
    return Math.max(0, Math.min(maximum, Math.floor(value)));
  }

  function scrollToLine(value: number, nextSticky = false): void {
    const next = clamp(value);
    setRequestedScrollTop(next);
    setSticky(nextSticky || next >= maxScroll());
  }

  const handle: ScrollBoxHandle = {
    scrollToLine,
    scrollByLines(lines) {
      scrollToLine(scrollTop() + lines);
    },
    scrollToTop() {
      scrollToLine(0);
    },
    scrollToBottom() {
      scrollToLine(maxScroll(), true);
    },
  };

  if (typeof props.ref === "function") props.ref(handle);

  return createComponent(Box, {
    ...viewportProps,
    ref(node: unknown) {
      viewportNode = node;
    },
    get children() {
      return createComponent(Box, {
        flexDirection: "column",
        flexShrink: 0,
        width: "100%",
        ref(node: unknown) {
          contentNode = node;
        },
        get marginTop() {
          return -scrollTop();
        },
        get children() {
          return props.children;
        },
      });
    },
  }) as JSX.Element;
}
