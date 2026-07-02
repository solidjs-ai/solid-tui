import cliBoxes from "cli-boxes";
import type { JSX } from "../solid-client.ts";

type Spacing = number;
type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";
type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";
type Align = "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
type AlignSelf = "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
type AlignContent =
  | "flex-start"
  | "center"
  | "flex-end"
  | "stretch"
  | "space-between"
  | "space-around"
  | "space-evenly";
type Justify =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";
type BorderStyle =
  | "single"
  | "double"
  | "round"
  | "bold"
  | "singleDouble"
  | "doubleSingle"
  | "classic"
  | "arrow";

export type BoxStyle = (typeof cliBoxes)[keyof cliBoxes.Boxes];

export type AriaRole =
  | "button"
  | "checkbox"
  | "combobox"
  | "list"
  | "listbox"
  | "listitem"
  | "menu"
  | "menuitem"
  | "option"
  | "progressbar"
  | "radio"
  | "radiogroup"
  | "tab"
  | "tablist"
  | "table"
  | "textbox"
  | "timer"
  | "toolbar";

export interface AriaState {
  busy?: boolean;
  checked?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  multiline?: boolean;
  multiselectable?: boolean;
  readonly?: boolean;
  required?: boolean;
  selected?: boolean;
}

export interface BoxProps {
  children?: JSX.Element;
  ref?: (node: unknown) => void;
  flexDirection?: FlexDirection;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
  flexWrap?: FlexWrap;
  alignItems?: Align;
  alignSelf?: AlignSelf;
  justifyContent?: Justify;
  gap?: number;
  columnGap?: number;
  rowGap?: number;
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  aspectRatio?: number;
  alignContent?: AlignContent;
  position?: "absolute" | "relative" | "static";
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  margin?: Spacing;
  marginX?: number;
  marginY?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  borderStyle?: BorderStyle | BoxStyle;
  borderColor?: string;
  borderDimColor?: boolean;
  borderTopDimColor?: boolean;
  borderBottomDimColor?: boolean;
  borderLeftDimColor?: boolean;
  borderRightDimColor?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderRight?: boolean;
  borderTopColor?: string;
  borderBottomColor?: string;
  borderLeftColor?: string;
  borderRightColor?: string;
  borderBackgroundColor?: string;
  borderTopBackgroundColor?: string;
  borderBottomBackgroundColor?: string;
  borderLeftBackgroundColor?: string;
  borderRightBackgroundColor?: string;
  backgroundColor?: string;
  overflow?: "visible" | "hidden";
  overflowX?: "visible" | "hidden";
  overflowY?: "visible" | "hidden";
  display?: "flex" | "none";
  ariaLabel?: string;
  ariaHidden?: boolean;
  ariaRole?: AriaRole;
  ariaState?: AriaState;
}

export type BoxLayoutStyle = Pick<
  BoxProps,
  | "flexDirection"
  | "flexGrow"
  | "flexShrink"
  | "flexBasis"
  | "flexWrap"
  | "alignItems"
  | "alignSelf"
  | "justifyContent"
  | "gap"
  | "columnGap"
  | "rowGap"
  | "width"
  | "height"
  | "minWidth"
  | "minHeight"
  | "maxWidth"
  | "maxHeight"
  | "aspectRatio"
  | "alignContent"
  | "position"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "margin"
  | "marginX"
  | "marginY"
  | "marginTop"
  | "marginBottom"
  | "marginLeft"
  | "marginRight"
  | "padding"
  | "paddingX"
  | "paddingY"
  | "paddingTop"
  | "paddingBottom"
  | "paddingLeft"
  | "paddingRight"
  | "overflow"
  | "overflowX"
  | "overflowY"
  | "display"
>;
