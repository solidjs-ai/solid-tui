import type { EventEmitter } from "node:events";
import { createContext, type Accessor } from "./solid-client.ts";
import type { AnimationScheduler } from "./animation-scheduler.ts";
import type { MouseController } from "./mouse/controller.ts";

export interface CursorPosition {
  x: number;
  y: number;
}

export interface AppContext {
  exit: (errorOrResult?: unknown) => void;
  waitUntilRenderFlush: () => Promise<void>;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  stdin: NodeJS.ReadStream;
  debug: boolean;
  interactive: boolean;
  isScreenReaderEnabled: boolean;
  isRawModeSupported: boolean;
  setRawMode: (mode: boolean) => void;
  writeToStdout: (data: string) => void;
  writeToStderr: (data: string) => void;
  cursorPosition: CursorPosition | undefined;
  setCursorPosition: (pos: CursorPosition | undefined) => void;
  internal_mouse?: MouseController;
}

export interface FocusContext {
  activeId: string | null;
  activeIdValue: Accessor<string | null>;
  enabled: boolean;
  enableFocus: () => void;
  disableFocus: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
  focus: (id: string) => void;
  blur: () => void;
  add: (id: string, options: { autoFocus?: boolean }) => void;
  remove: (id: string) => void;
  activate: (id: string) => void;
  deactivate: (id: string) => void;
  subscribe: (id: string, fn: (focused: boolean) => void) => () => void;
}

export interface StdinContext {
  stdin: NodeJS.ReadStream;
  setRawMode: (mode: boolean) => void;
  isRawModeSupported: boolean;
  internal_eventEmitter: EventEmitter;
  internal_exitOnCtrlC: boolean;
  acquireRawMode: () => void;
  releaseRawMode: () => void;
  setBracketedPasteMode: (enabled: boolean) => void;
  acquireSgrMouseMode: (level?: SgrMouseMode) => symbol;
  releaseSgrMouseMode: (token: symbol) => void;
}

export type SgrMouseMode = "button" | "drag" | "hover";

export const AppContextKey = createContext<AppContext>();
export const FocusContextKey = createContext<FocusContext>();
export const StdinContextKey = createContext<StdinContext>();
export const AnimationSchedulerKey = createContext<AnimationScheduler>();
export const TextContextKey = createContext(false);
