import Yoga from "better-yoga-layout";
import { EventEmitter } from "node:events";
import { createComponent, createSignal, catchError, type Component } from "./solid-client.ts";
import { renderSolidRoot, setRendererCommit } from "./renderer.ts";
import { createRoot, type TuiNode } from "./host/nodes.ts";
import { attachYoga } from "./host/yoga.ts";
import { calculateLayoutWithContentGuards } from "./host/layout-guards.ts";
import { paint } from "./paint/paint.ts";
import { renderScreenReaderOutput } from "./paint/screen-reader.ts";
import { findStatics, paintStaticNode } from "./paint/static-channel.ts";
import {
  AnimationSchedulerKey,
  AppContextKey,
  FocusContextKey,
  StdinContextKey,
  type AppContext,
  type FocusContext,
  type StdinContext,
} from "./context.ts";
import { createNoOpAnimationScheduler } from "./animation-scheduler.ts";
import { isErrorInput, messageForNonError } from "./components/error-overview.ts";

export interface RenderToStringOptions {
  columns?: number;
}

interface RenderToStringInternalOptions extends RenderToStringOptions {
  isScreenReaderEnabled?: boolean;
}

export function renderToString(
  component: Component<Record<string, unknown>>,
  options?: RenderToStringOptions,
): string {
  return renderToStringInternal(component, options);
}

export function renderToStringWithScreenReader(
  component: Component<Record<string, unknown>>,
  options?: RenderToStringInternalOptions,
): string {
  return renderToStringInternal(component, options);
}

function renderToStringInternal(
  component: Component<Record<string, unknown>>,
  options?: RenderToStringInternalOptions,
): string {
  const columns = options?.columns ?? 80;
  const isScreenReaderEnabled = options?.isScreenReaderEnabled ?? false;
  const appContext = createNoOpAppContext(isScreenReaderEnabled);
  const root = createRoot(appContext);
  attachYoga(root);
  root.yoga.setWidth(columns);

  let capturedStaticOutput = "";
  let output = "";
  let errored = false;
  let caught: unknown;

  const restoreCommit = setRendererCommit(() => {
    const restoreLayoutGuards = calculateLayoutWithContentGuards(
      root,
      columns,
      undefined,
      Yoga.DIRECTION_LTR,
    );
    try {
      for (const stat of findStatics(root)) {
        const staticFrame = paintStaticNode(stat, columns, isScreenReaderEnabled);
        if (staticFrame && staticFrame !== "\n") capturedStaticOutput += staticFrame + "\n";
      }
      output = isScreenReaderEnabled
        ? renderScreenReaderOutput(root, { skipStaticElements: true })
        : paint(root);
    } finally {
      restoreLayoutGuards();
    }
  });

  let dispose: (() => void) | undefined;
  try {
    const Root = () =>
      catchError(
        () =>
          createComponent(AppContextKey.Provider, {
            value: appContext,
            get children() {
              return createComponent(FocusContextKey.Provider, {
                value: createNoOpFocusContext(),
                get children() {
                  return createComponent(StdinContextKey.Provider, {
                    value: createNoOpStdinContext(),
                    get children() {
                      return createComponent(AnimationSchedulerKey.Provider, {
                        value: createNoOpAnimationScheduler(),
                        get children() {
                          return createComponent(component, {});
                        },
                      });
                    },
                  });
                },
              });
            },
          }),
        (err: unknown) => {
          errored = true;
          caught = err;
        },
      );

    dispose = renderSolidRoot(
      () => createComponent(Root, {}) as unknown as TuiNode,
      root as TuiNode,
    );
    const restoreLayoutGuards = calculateLayoutWithContentGuards(
      root,
      columns,
      undefined,
      Yoga.DIRECTION_LTR,
    );
    try {
      for (const stat of findStatics(root)) {
        const staticFrame = paintStaticNode(stat, columns, isScreenReaderEnabled);
        if (staticFrame && staticFrame !== "\n") capturedStaticOutput += staticFrame + "\n";
      }
      output = isScreenReaderEnabled
        ? renderScreenReaderOutput(root, { skipStaticElements: true })
        : paint(root);
    } finally {
      restoreLayoutGuards();
    }
    dispose();
    dispose = undefined;
    root.yoga.freeRecursive();

    if (errored) throw isErrorInput(caught) ? caught : new Error(messageForNonError(caught));

    const normalizedStaticOutput = capturedStaticOutput.endsWith("\n")
      ? capturedStaticOutput.slice(0, -1)
      : capturedStaticOutput;
    if (normalizedStaticOutput && output) return normalizedStaticOutput + "\n" + output;
    return normalizedStaticOutput || output;
  } finally {
    restoreCommit();
    try {
      dispose?.();
    } catch {
      // Best effort cleanup.
    }
  }
}

function createNoOpAppContext(isScreenReaderEnabled = false): AppContext {
  return {
    exit: () => {},
    waitUntilRenderFlush: async () => {},
    stdout: process.stdout,
    stderr: process.stderr,
    stdin: process.stdin,
    debug: false,
    interactive: false,
    isScreenReaderEnabled,
    isRawModeSupported: false,
    setRawMode: () => {},
    writeToStdout: () => {},
    writeToStderr: () => {},
    cursorPosition: undefined,
    setCursorPosition: () => {},
  };
}

function createNoOpFocusContext(): FocusContext {
  const [activeIdValue] = createSignal<string | null>(null);
  return {
    activeId: null,
    activeIdValue,
    enabled: false,
    enableFocus: () => {},
    disableFocus: () => {},
    focusNext: () => {},
    focusPrevious: () => {},
    focus: () => {},
    blur: () => {},
    add: () => {},
    remove: () => {},
    activate: () => {},
    deactivate: () => {},
    subscribe: () => () => {},
  };
}

function createNoOpStdinContext(): StdinContext {
  return {
    stdin: process.stdin,
    setRawMode: () => {},
    isRawModeSupported: false,
    internal_eventEmitter: new EventEmitter(),
    internal_exitOnCtrlC: false,
    acquireRawMode: () => {},
    releaseRawMode: () => {},
    setBracketedPasteMode: () => {},
    acquireSgrMouseMode: () => Symbol("sgr-mouse"),
    releaseSgrMouseMode: () => {},
  };
}
