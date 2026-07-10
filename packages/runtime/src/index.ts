export {
  createComponent,
  createElement,
  createTextNode,
  effect,
  insert,
  insertNode,
  memo,
  setProp,
  spread,
  use,
} from "./renderer.ts";
export {
  batch,
  catchError,
  children,
  createEffect,
  createMemo,
  createRenderEffect,
  createRoot,
  createSignal,
  createContext,
  mergeProps,
  on,
  onCleanup,
  splitProps,
  untrack,
  useContext,
  type Accessor,
  type Component,
  type JSX,
  type JSXElement,
  type Setter,
} from "./solid-client.ts";

export { createApp, type MountOptions, type TuiApp } from "./render.ts";
export { renderToString, type RenderToStringOptions } from "./render-to-string.ts";

export { Box } from "./components/box.ts";
export type {
  AriaRole,
  AriaState,
  BoxLayoutStyle,
  BoxProps,
  BoxStyle,
} from "./components/box-props.ts";
export { Text } from "./components/text.ts";
export type { TextProps } from "./components/text-props.ts";
export { Newline } from "./components/newline.ts";
export type { NewlineProps } from "./components/newline-props.ts";
export { Spacer } from "./components/spacer.ts";
export type { SpacerProps } from "./components/spacer-props.ts";
export { Static } from "./components/static.ts";
export type {
  StaticChildren,
  StaticProps,
  StaticSlot,
  StaticSlotProps,
  StaticStyle,
} from "./components/static-props.ts";
export { Transform, type TransformProps } from "./components/transform.ts";

export { useApp, type UseAppReturn } from "./hooks/useApp.ts";
export { useInput, type Key, type UseInputOptions } from "./hooks/useInput.ts";
export {
  useMouseInput,
  type MouseInputEvent,
  type MouseInputHandler,
  type UseMouseInputOptions,
} from "./hooks/useMouseInput.ts";
export {
  useDraggable,
  type UseDraggableAxis,
  type UseDraggableOptions,
  type UseDraggablePosition,
  type UseDraggableReturn,
  type UseDraggableTarget,
} from "./hooks/useDraggable.ts";
export type {
  MouseButton,
  MouseHandlerProps,
  MouseTarget,
  MouseTargetRect,
  TuiMouseEvent,
  TuiMouseEventType,
  TuiWheelEvent,
} from "./mouse/events.ts";
export { usePaste, type UsePasteOptions } from "./hooks/usePaste.ts";
export { useFocus, type UseFocusOptions } from "./hooks/useFocus.ts";
export { useFocusManager } from "./hooks/useFocusManager.ts";
export { useStdin, type UseStdinReturn } from "./hooks/useStdin.ts";
export { useStdout, type UseStdoutReturn } from "./hooks/useStdout.ts";
export { useStderr, type UseStderrReturn } from "./hooks/useStderr.ts";
export { useWindowSize, type WindowSize } from "./hooks/useWindowSize.ts";
export { useCursor, type CursorPosition } from "./hooks/useCursor.ts";
export { useIsScreenReaderEnabled } from "./hooks/useIsScreenReaderEnabled.ts";
export {
  useAnimation,
  type UseAnimationOptions,
  type UseAnimationReturn,
} from "./hooks/useAnimation.ts";
export {
  measureElement,
  useBoxMetrics,
  type BoxMetrics,
  type UseBoxMetricsReturn,
} from "./hooks/useBoxMetrics.ts";
export {
  kittyFlags,
  kittyModifiers,
  type KittyFlagName,
  type KittyKeyboardOptions,
} from "./io/kitty-keyboard.ts";
