import type { JSX } from "../solid-client.ts";

type WrapMode =
  | "wrap"
  | "hard"
  | "truncate"
  | "truncate-end"
  | "truncate-middle"
  | "truncate-start";

export interface TextProps {
  children?: JSX.Element;
  ref?: (node: unknown) => void;
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
