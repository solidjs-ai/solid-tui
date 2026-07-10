import type { JSX } from "../solid-client.ts";
import type { MouseHandlerProps } from "../mouse/events.ts";
import type { Ref } from "solid-js";

type WrapMode =
  | "wrap"
  | "hard"
  | "truncate"
  | "truncate-end"
  | "truncate-middle"
  | "truncate-start";

export interface TextProps extends MouseHandlerProps {
  children?: JSX.Element;
  ref?: Ref<unknown>;
  color?: string;
  backgroundColor?: string;
  dimColor?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
  wrap?: WrapMode;
  ariaLabel?: string;
  ariaHidden?: boolean;
}
