import type { JSX } from "../solid-client.ts";
import type { BoxLayoutStyle } from "./box-props.ts";

export interface StaticSlotProps<T = unknown> {
  item: T;
  index: number;
}

export type StaticSlot<T = unknown> = (props: StaticSlotProps<T>) => JSX.Element;
export type StaticChildren<T = unknown> = StaticSlot<T>;
export type StaticStyle = BoxLayoutStyle;

export interface StaticProps<T = unknown> {
  items: T[];
  style?: StaticStyle;
  children?: StaticChildren<T>;
}
