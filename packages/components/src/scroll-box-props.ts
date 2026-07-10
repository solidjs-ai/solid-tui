import type { JSX, Ref } from "solid-js";

/** Imperative ref exposed by `ScrollBox`. Input policy stays with the application. */
export interface ScrollBoxHandle {
  /** Scroll so content line `line` is at the viewport top (clamped). */
  scrollToLine(line: number): void;
  /** Scroll relative to the current position (positive = toward the bottom). */
  scrollByLines(lines: number): void;
  /** Jump to the top. */
  scrollToTop(): void;
  /** Jump to the bottom and resume following new content. */
  scrollToBottom(): void;
}

export interface ScrollBoxProps {
  children?: JSX.Element;
  /** Solid component ref callback receiving the imperative scroll handle. */
  ref?: Ref<ScrollBoxHandle>;
}
