import Yoga from "better-yoga-layout";
import { EventEmitter } from "node:events";
import { writeSync as fsWriteSync } from "node:fs";
import isInCi from "is-in-ci";
import { onExit } from "signal-exit";
import patchConsoleFn from "patch-console";
import ansiEscapes from "ansi-escapes";
import wrapAnsi from "wrap-ansi";
import {
  createComponent,
  createSignal,
  catchError,
  type Component,
  type JSX,
} from "./solid-client.ts";
import { renderSolidRoot, setRendererCommit } from "./renderer.ts";
import { createInputParser, type InputEvent } from "./io/input-parser.ts";
import { isSgrMouseInput, parseMouseInput, parseSgrMouseInput } from "./io/parse-mouse.ts";
import { parseKeypress } from "./io/parse-keypress.ts";
import { createKittyKeyboardController, type KittyKeyboardOptions } from "./io/kitty-keyboard.ts";
import { createRoot, emitLayoutListeners, type TuiRoot } from "./host/nodes.ts";
import { attachYoga, detachYoga } from "./host/yoga.ts";
import { calculateLayoutWithContentGuards } from "./host/layout-guards.ts";
import { createCommitScheduler } from "./scheduler.ts";
import { createAnimationScheduler } from "./animation-scheduler.ts";
import { paint } from "./paint/paint.ts";
import { renderScreenReaderOutput } from "./paint/screen-reader.ts";
import { findStatics, paintStaticNode } from "./paint/static-channel.ts";
import { createFrameWriter } from "./io/frame-writer.ts";
import { INTERNAL_FRAME_SINK, type FrameSink } from "./io/frame-sink.ts";
import { bsu, esu, shouldSynchronize } from "./io/write-synchronized.ts";
import { createMouseController, type MouseHitMapEntry } from "./mouse/controller.ts";
import {
  AnimationSchedulerKey,
  AppContextKey,
  FocusContextKey,
  StdinContextKey,
  type AppContext,
  type CursorPosition,
  type FocusContext,
  type SgrMouseMode,
  type StdinContext,
} from "./context.ts";
import { ErrorOverview, isErrorInput, messageForNonError } from "./components/error-overview.ts";
import { resolveSize } from "./hooks/useWindowSize.ts";
import {
  devState,
  DevStateKey,
  isDevConnected,
  notifyDevExit,
  registerDevApp,
  resetDevState,
  unregisterDevApp,
} from "./hmr.ts";
import { createDevOverlayWrapper } from "./overlay.ts";

export interface MountOptions {
  stdout?: NodeJS.WriteStream;
  stdin?: NodeJS.ReadStream;
  stderr?: NodeJS.WriteStream;
  debug?: boolean;
  exitOnCtrlC?: boolean;
  rawMode?: "always" | "auto";
  interactive?: boolean;
  patchConsole?: boolean;
  onRender?: (info: { renderTime: number }) => void;
  maxFps?: number;
  isScreenReaderEnabled?: boolean;
  incrementalRendering?: boolean;
  /** Render from terminal origin in the alternate buffer and enable targeted mouse input. */
  fullscreen?: boolean;
  /** @deprecated Use `fullscreen` instead. */
  alternateScreen?: boolean;
  kittyKeyboard?: KittyKeyboardOptions;
}

export interface TuiApp {
  mount(options?: MountOptions): unknown;
  unmount(): void;
  waitUntilExit(): Promise<unknown>;
  waitUntilRenderFlush(): Promise<void>;
  clear(): void;
}

type RootProps = Record<string, unknown>;
type MaybeWritableStream = NodeJS.WriteStream & {
  writable?: boolean;
  writableEnded?: boolean;
  destroyed?: boolean;
  _writableState?: unknown;
  writableLength?: number;
};

const liveInstances = new WeakMap<NodeJS.WriteStream, TuiApp>();

function supportsTerminalMouse(): boolean {
  return process.env["TERM"] !== "dumb";
}

function getWritableStreamState(stdout: MaybeWritableStream): {
  canWriteToStdout: boolean;
  hasWritableState: boolean;
} {
  return {
    canWriteToStdout: !stdout.destroyed && !stdout.writableEnded && (stdout.writable ?? true),
    hasWritableState: stdout._writableState !== undefined || stdout.writableLength !== undefined,
  };
}

function isComponent(value: unknown): value is Component<Record<string, unknown>> {
  return typeof value === "function";
}

export function createApp(root: Component<RootProps>, rootProps?: RootProps | null): TuiApp {
  let exitResolve!: (result?: unknown) => void;
  let exitReject!: (e: Error) => void;
  const exitPromise = new Promise<unknown>((res, rej) => {
    exitResolve = res;
    exitReject = rej;
  });
  exitPromise.catch(() => {});

  let mountedRoot: TuiRoot | null = null;
  let mountedDispose: (() => void) | null = null;
  let mountedScheduler: ReturnType<typeof createCommitScheduler> | null = null;
  let mountedAnimationScheduler: ReturnType<typeof createAnimationScheduler> | null = null;
  let mountedStdinController: StdinController | null = null;
  let mountedKittyController: ReturnType<typeof createKittyKeyboardController> | null = null;
  let mountedRestoreRendererCommit: (() => void) | null = null;
  let mountedRestoreConsole: (() => void) | null = null;
  let mountedResizeHandler: (() => void) | null = null;
  let mountedUnsubscribeExit: (() => void) | null = null;
  let mountedExitListener: (() => void) | null = null;
  let mountedDevTeardown: (() => void) | null = null;
  let mountedClear: (() => void) | null = null;
  let mountedAppContext: AppContext | null = null;
  let mountedStdout: NodeJS.WriteStream | null = null;
  let mountedGetLastOutput: (() => string) | null = null;
  let mountedAsOwner = false;
  let mountedFullscreen = false;
  let teardownStarted = false;
  let exitInitiated = false;
  let pendingExitError: unknown;
  let pendingExitResult: unknown;

  function resolveExit() {
    const finish = () => {
      if (isErrorInput(pendingExitError)) exitReject(pendingExitError);
      else exitResolve(pendingExitResult);
    };
    const stdout = mountedAppContext?.stdout as MaybeWritableStream | undefined;
    if (!stdout) {
      setImmediate(finish);
      return;
    }
    const { canWriteToStdout, hasWritableState } = getWritableStreamState(stdout);
    if (canWriteToStdout && hasWritableState) stdout.write("", finish);
    else setImmediate(finish);
  }

  function writeTerminalRestore(data: string, sync: boolean): void {
    const stdout = mountedAppContext?.stdout as MaybeWritableStream | undefined;
    if (!stdout?.isTTY || !getWritableStreamState(stdout).canWriteToStdout) return;
    try {
      if (sync) {
        const streamFd = (stdout as { fd?: number }).fd;
        fsWriteSync(typeof streamFd === "number" ? streamFd : 1, data);
      } else {
        stdout.write(data);
      }
    } catch {
      // Terminal restoration is best-effort during process shutdown.
    }
  }

  function teardown(sync = false) {
    if (teardownStarted) return;
    teardownStarted = true;

    mountedScheduler?.cancel();
    mountedRestoreRendererCommit?.();
    mountedRestoreRendererCommit = null;
    mountedClear = null;
    mountedGetLastOutput = null;

    if (mountedRestoreConsole) {
      mountedRestoreConsole();
      mountedRestoreConsole = null;
    }

    mountedDispose?.();
    mountedDispose = null;
    mountedAnimationScheduler?.dispose();
    mountedAnimationScheduler = null;
    mountedKittyController?.dispose();
    mountedKittyController = null;
    mountedStdinController?.dispose(sync);
    mountedStdinController = null;

    if (mountedRoot) {
      detachYoga(mountedRoot);
      mountedRoot = null;
    }

    if (mountedResizeHandler && mountedAppContext) {
      mountedAppContext.stdout.off("resize", mountedResizeHandler);
    }
    mountedResizeHandler = null;

    if (mountedUnsubscribeExit) {
      mountedUnsubscribeExit();
      mountedUnsubscribeExit = null;
    }
    if (mountedExitListener) {
      process.off("exit", mountedExitListener);
      mountedExitListener = null;
    }
    if (mountedDevTeardown) {
      unregisterDevApp(mountedDevTeardown);
      mountedDevTeardown = null;
    }

    if (mountedAppContext?.interactive) {
      const restore = "\x1b[?25h" + (mountedFullscreen ? ansiEscapes.exitAlternativeScreen : "");
      writeTerminalRestore(restore, sync);
    }
    mountedFullscreen = false;

    if (mountedAsOwner && mountedStdout) {
      liveInstances.delete(mountedStdout);
      mountedAsOwner = false;
    }
  }

  const app: TuiApp = {
    mount(options: MountOptions = {}) {
      if (mountedRoot) return {};

      const stdout = options.stdout ?? process.stdout;
      const stdin = options.stdin ?? process.stdin;
      const stderr = options.stderr ?? process.stderr;
      const debug = options.debug ?? false;
      const frameSink = (options as { [INTERNAL_FRAME_SINK]?: FrameSink })[INTERNAL_FRAME_SINK];

      if (liveInstances.has(stdout)) {
        process.stderr.write(
          "Warning: this stdout already has a live app, so this mount() was ignored. Unmount the existing app before mounting another one.\n",
        );
        return {};
      }
      liveInstances.set(stdout, app);
      mountedAsOwner = true;
      mountedStdout = stdout;
      teardownStarted = false;

      const interactive = options.interactive ?? (!isInCi && Boolean(stdout.isTTY));
      const fullscreen =
        Boolean(options.fullscreen ?? options.alternateScreen) &&
        interactive &&
        Boolean(stdout.isTTY);
      const mouseFullscreen =
        fullscreen && supportsTerminalMouse() && Boolean((stdin as { isTTY?: boolean }).isTTY);
      const isScreenReaderEnabled =
        options.isScreenReaderEnabled ?? process.env["INK_SCREEN_READER"] === "true";
      const maxFps = options.maxFps ?? 30;
      const unthrottled = debug || isScreenReaderEnabled;
      const renderThrottleMs =
        !unthrottled && maxFps > 0 ? Math.max(1, Math.ceil(1000 / maxFps)) : 0;

      const frameState = {
        lastOutput: "",
        lastOutputToRender: "" as string | undefined,
        outputHeight: 0,
        fullStaticOutput: "",
      };
      mountedGetLastOutput = () => frameState.lastOutput;
      let cursorPosition: CursorPosition | undefined;

      const writer = createFrameWriter(stdout, {
        debug,
        incremental: options.incrementalRendering,
      });
      const synchronize = shouldSynchronize(stdout, interactive);

      function writeToStdout(data: string) {
        if (teardownStarted) return;
        if (debug || !interactive) {
          stdout.write(data);
          return;
        }
        if (synchronize) stdout.write(bsu);
        writer.clear();
        stdout.write(data);
        writer.write(frameState.lastOutputToRender || frameState.lastOutput + "\n");
        if (synchronize) stdout.write(esu);
      }

      function writeToStderr(data: string) {
        if (teardownStarted) return;
        if (debug || !interactive) {
          stderr.write(data);
          return;
        }
        if (synchronize) stdout.write(bsu);
        writer.clear();
        stderr.write(data);
        writer.write(frameState.lastOutputToRender || frameState.lastOutput + "\n");
        if (synchronize) stdout.write(esu);
      }

      const appContext: AppContext = {
        exit(errorOrResult?: unknown) {
          if (exitInitiated || teardownStarted) return;
          exitInitiated = true;
          if (isErrorInput(errorOrResult)) pendingExitError = errorOrResult;
          else pendingExitResult = errorOrResult;
          queueMicrotask(() => {
            teardown();
            resolveExit();
          });
        },
        waitUntilRenderFlush,
        stdout,
        stderr,
        stdin,
        debug,
        interactive,
        isScreenReaderEnabled,
        isRawModeSupported: !!(stdin as { isTTY?: boolean }).isTTY,
        setRawMode(mode: boolean) {
          const raw = stdin as { setRawMode?: (mode: boolean) => unknown };
          if (typeof raw.setRawMode === "function") raw.setRawMode(mode);
        },
        writeToStdout,
        writeToStderr,
        cursorPosition: undefined,
        setCursorPosition(pos) {
          cursorPosition = pos;
          appContext.cursorPosition = pos;
          writer.setCursorPosition(pos);
        },
      };
      mountedAppContext = appContext;

      const focusContext = createFocusController();
      const stdinController = createStdinController(stdin, {
        exitOnCtrlC: options.exitOnCtrlC ?? true,
        appCtx: appContext,
        focusContext,
      });
      mountedStdinController = stdinController;

      if (
        (options.rawMode ?? "always") === "always" &&
        interactive &&
        stdinController.isRawModeSupported
      ) {
        stdinController.holdRawModeForLifetime();
      }

      const kittyController = createKittyKeyboardController(stdin, stdout);
      mountedKittyController = kittyController;
      kittyController.init(options.kittyKeyboard, interactive);

      const tuiRoot = createRoot(appContext);
      attachYoga(tuiRoot);
      tuiRoot.yoga.setWidth(resolveSize(stdout).columns);
      mountedRoot = tuiRoot;

      const animationScheduler = createAnimationScheduler(renderThrottleMs);
      mountedAnimationScheduler = animationScheduler;

      const [caughtError, setCaughtError] = createSignal<unknown>();
      const devConnected = isDevConnected();
      let userRoot = root;
      let userRootProps = rootProps;
      if (devConnected) {
        resetDevState();
        userRoot = createDevOverlayWrapper(userRoot, userRootProps ?? undefined);
        userRootProps = undefined;
      }

      const Root = () =>
        catchError(
          () =>
            createComponent(AppContextKey.Provider, {
              value: appContext,
              get children() {
                const tree = () =>
                  createComponent(FocusContextKey.Provider, {
                    value: focusContext,
                    get children() {
                      return createComponent(StdinContextKey.Provider, {
                        value: stdinController,
                        get children() {
                          return createComponent(AnimationSchedulerKey.Provider, {
                            value: animationScheduler,
                            get children() {
                              const err = caughtError();
                              if (err !== undefined) {
                                return createComponent(ErrorOverview, { error: err });
                              }
                              return isComponent(userRoot)
                                ? createComponent(userRoot, (userRootProps ?? {}) as RootProps)
                                : (userRoot as unknown as JSX.Element);
                            },
                          });
                        },
                      });
                    },
                  });
                if (!devConnected) return tree();
                return createComponent(DevStateKey.Provider, {
                  value: devState.read,
                  get children() {
                    return tree();
                  },
                });
              },
            }),
          (err: unknown) => {
            const error = isErrorInput(err) ? err : new Error(messageForNonError(err));
            pendingExitError ??= error;
            setCaughtError(err);
            queueMicrotask(() => appContext.exit(error));
          },
        );

      function renderFrame(width: number, hitMap?: MouseHitMapEntry[]): string {
        if (!isScreenReaderEnabled) return paint(tuiRoot, { hitMap });
        const linear = renderScreenReaderOutput(tuiRoot, { skipStaticElements: true });
        return wrapAnsi(linear, width, { trim: false, hard: true });
      }

      function commit() {
        const start = options.onRender ? performance.now() : 0;
        const width = resolveSize(stdout).columns;
        tuiRoot.yoga.setWidth(width);
        const restoreLayoutGuards = calculateLayoutWithContentGuards(
          tuiRoot,
          width,
          undefined,
          Yoga.DIRECTION_LTR,
        );
        try {
          emitLayoutListeners(tuiRoot);

          let staticOutput = "";
          for (const stat of findStatics(tuiRoot)) {
            const staticFrame = paintStaticNode(stat, width, isScreenReaderEnabled);
            if (staticFrame.length > 0) staticOutput += staticFrame + "\n";
          }
          if (staticOutput) frameState.fullStaticOutput += staticOutput;

          const hitMap = mouseFullscreen ? [] : undefined;
          const frame = renderFrame(width, hitMap);
          mouseController.updateHitMap(hitMap ?? []);
          const outputHeight = frame === "" ? 0 : frame.split("\n").length;
          frameState.lastOutput = frame;
          frameState.outputHeight = outputHeight;
          frameState.lastOutputToRender =
            interactive && !isScreenReaderEnabled ? frame + "\n" : frame;

          if (options.onRender) options.onRender({ renderTime: performance.now() - start });

          if (debug) {
            if (frameState.fullStaticOutput) {
              stdout.write(frameState.fullStaticOutput);
              if (!teardownStarted) frameSink?.(frameState.fullStaticOutput);
            }
            stdout.write(frame);
            if (!teardownStarted) frameSink?.(frame);
            return;
          }

          if (!interactive) {
            if (staticOutput) stdout.write(staticOutput);
            return;
          }

          if (staticOutput) stdout.write(staticOutput);
          if (cursorPosition) writer.setCursorPosition(cursorPosition);
          const outputToRender = isScreenReaderEnabled ? frame : frame + "\n";
          writer.write(outputToRender);
        } finally {
          restoreLayoutGuards();
        }
      }

      const scheduler = createCommitScheduler(commit, {
        immediate: unthrottled,
        throttleMs: renderThrottleMs,
      });
      const mouseController = createMouseController({
        stdin: stdinController,
        fullscreen: mouseFullscreen,
        now: scheduler.now,
      });
      appContext.internal_mouse = mouseController;
      mountedScheduler = scheduler;
      mountedRestoreRendererCommit = setRendererCommit(scheduler.schedule);

      if (fullscreen) {
        stdout.write(ansiEscapes.enterAlternativeScreen + "\x1b[H");
        stdout.write("\x1b[?25l");
      }
      mountedFullscreen = fullscreen;

      if (options.patchConsole !== false && !debug) {
        mountedRestoreConsole = patchConsoleFn((stream, data) => {
          if (stream === "stdout") appContext.writeToStdout(data);
          if (stream === "stderr") appContext.writeToStderr(data);
        });
      }

      mountedClear = () => {
        if (!interactive || debug) return;
        writer.clear();
      };

      mountedDispose = renderSolidRoot(
        () => createComponent(Root, {}) as unknown as TuiRoot,
        tuiRoot,
      );
      scheduler.schedule();

      if (devConnected) {
        mountedDevTeardown = () => teardown();
        registerDevApp(mountedDevTeardown);
        void exitPromise.finally(() => notifyDevExit()).catch(() => {});
      }

      if (interactive) {
        const onResize = () => {
          scheduler.cancel();
          commit();
        };
        stdout.on("resize", onResize);
        mountedResizeHandler = onResize;
      }

      mountedExitListener = () => teardown(true);
      process.on("exit", mountedExitListener);
      if (interactive) mountedUnsubscribeExit = onExit(() => teardown(true), { alwaysLast: false });

      return {};
    },
    unmount() {
      if (!mountedAppContext) {
        resolveExit();
        return;
      }
      if (!mountedAppContext.interactive && !mountedAppContext.debug) {
        const frame = mountedGetLastOutput?.() ?? "";
        if (frame) mountedAppContext.stdout.write(frame + "\n");
      }
      teardown();
      resolveExit();
    },
    waitUntilExit() {
      return exitPromise;
    },
    waitUntilRenderFlush,
    clear() {
      mountedClear?.();
    },
  };

  async function waitUntilRenderFlush(): Promise<void> {
    await mountedScheduler?.flush();
    const stream = (mountedAppContext?.stdout ?? process.stdout) as MaybeWritableStream;
    const { canWriteToStdout, hasWritableState } = getWritableStreamState(stream);
    await new Promise<void>((resolve) => {
      if (!canWriteToStdout || !hasWritableState) {
        setImmediate(resolve);
        return;
      }
      try {
        stream.write("", () => resolve());
      } catch {
        setImmediate(resolve);
      }
    });
  }

  return app;
}

interface Focusable {
  readonly id: string;
  isActive: boolean;
}

export interface FocusControllerForTest extends FocusContext {
  __subscriberMapSize: () => number;
}

export function createFocusController(): FocusControllerForTest {
  const focusables: Focusable[] = [];
  const subs = new Map<string, Set<(focused: boolean) => void>>();
  let activeFocusable: Focusable | null = null;
  let activeId: string | null = null;
  const [activeIdValue, setActiveIdValue] = createSignal<string | null>(null);

  function notify(id: string, focused: boolean) {
    subs.get(id)?.forEach((fn) => fn(focused));
  }

  function setActiveFocusable(next: Focusable | null) {
    if (next !== null && !focusables.includes(next)) next = null;
    if (activeFocusable === next) return;
    const prev = activeId;
    activeFocusable = next;
    activeId = next?.id ?? null;
    ctx.activeId = activeId;
    setActiveIdValue(activeId);
    if (prev) notify(prev, false);
    if (activeId) notify(activeId, true);
  }

  function findNextActive(startIdx: number, direction: 1 | -1): Focusable | null {
    const len = focusables.length;
    for (let i = 0; i < len; i++) {
      const idx = (startIdx + direction * (i + 1) + len * len) % len;
      if (focusables[idx]!.isActive) return focusables[idx]!;
    }
    return null;
  }

  function startSearchIndex(direction: 1 | -1): number {
    if (activeFocusable) {
      const i = focusables.indexOf(activeFocusable);
      if (i >= 0) return i;
    }
    if (activeId) {
      const i = focusables.findIndex((f) => f.id === activeId);
      if (i >= 0) return i;
    }
    return direction === 1 ? -1 : focusables.length;
  }

  const ctx: FocusContext = {
    activeId: null,
    activeIdValue,
    enabled: true,
    enableFocus() {
      ctx.enabled = true;
    },
    disableFocus() {
      ctx.enabled = false;
    },
    focusNext() {
      if (focusables.length === 0) return;
      setActiveFocusable(findNextActive(startSearchIndex(1), 1));
    },
    focusPrevious() {
      if (focusables.length === 0) return;
      setActiveFocusable(findNextActive(startSearchIndex(-1), -1));
    },
    focus(id) {
      const entry = focusables.find((f) => f.id === id);
      if (entry) setActiveFocusable(entry);
    },
    blur() {
      setActiveFocusable(null);
    },
    add(id, options) {
      const entry: Focusable = { id, isActive: true };
      focusables.push(entry);
      if (options.autoFocus && activeFocusable == null) setActiveFocusable(entry);
    },
    remove(id) {
      const removingActive = activeFocusable?.id === id;
      for (let i = focusables.length - 1; i >= 0; i--) {
        if (focusables[i]!.id === id) focusables.splice(i, 1);
      }
      if (removingActive) setActiveFocusable(null);
    },
    activate(id) {
      for (const entry of focusables) if (entry.id === id) entry.isActive = true;
    },
    deactivate(id) {
      let changed = false;
      for (const entry of focusables) {
        if (entry.id === id) {
          entry.isActive = false;
          changed = true;
        }
      }
      if (changed && activeFocusable?.id === id) setActiveFocusable(null);
    },
    subscribe(id, fn) {
      let set = subs.get(id);
      if (!set) {
        set = new Set();
        subs.set(id, set);
      }
      set.add(fn);
      return () => {
        set!.delete(fn);
        if (set!.size === 0 && subs.get(id) === set) subs.delete(id);
      };
    },
  };

  return Object.assign(ctx, {
    __subscriberMapSize: () => subs.size,
  });
}

interface StdinController extends StdinContext {
  dispose: (sync?: boolean) => void;
  holdRawModeForLifetime: () => void;
}

interface CreateStdinControllerOptions {
  exitOnCtrlC: boolean;
  appCtx: AppContext;
  focusContext: FocusContext;
}

function createStdinController(
  stdin: NodeJS.ReadStream,
  opts: CreateStdinControllerOptions,
): StdinController {
  const { appCtx, focusContext } = opts;
  const emitter = new EventEmitter();
  emitter.setMaxListeners(Infinity);
  const inputParser = createInputParser();
  let refs = 0;
  let bracketedPasteModeCount = 0;
  const sgrMouseModeTokens = new Map<symbol, SgrMouseMode>();
  let activeSgrMouseMode: SgrMouseMode | undefined;
  let everEnabledBracketedPaste = false;
  let everEnabledSgrMouse = false;
  let pendingFlushTimer: ReturnType<typeof setTimeout> | undefined;
  const FLUSH_DELAY = 20;
  const DISABLE_SGR_MOUSE = "\x1b[?1003l\x1b[?1002l\x1b[?1000l\x1b[?1006l";

  function canWriteTerminalMode(): boolean {
    const stdout = appCtx.stdout as MaybeWritableStream;
    return Boolean(stdout.isTTY) && !stdout.destroyed && !stdout.writableEnded;
  }

  function canUseSgrMouseMode(): boolean {
    return canWriteTerminalMode() && supportsTerminalMouse();
  }

  function writeTerminalMode(data: string, sync = false) {
    if (!canWriteTerminalMode()) return;
    if (sync) {
      try {
        const streamFd = (appCtx.stdout as { fd?: number }).fd;
        fsWriteSync(typeof streamFd === "number" ? streamFd : 1, data);
      } catch {
        // Best-effort restore during abrupt shutdown.
      }
      return;
    }
    appCtx.stdout.write(data);
  }

  function disableSgrMouse(sync = false) {
    writeTerminalMode(DISABLE_SGR_MOUSE, sync);
  }

  function enableSgrMouse(level: SgrMouseMode) {
    switch (level) {
      case "button":
        writeTerminalMode("\x1b[?1000h\x1b[?1006h");
        everEnabledSgrMouse = true;
        return;
      case "drag":
        writeTerminalMode("\x1b[?1002h\x1b[?1006h");
        everEnabledSgrMouse = true;
        return;
      case "hover":
        writeTerminalMode("\x1b[?1003h\x1b[?1006h");
        everEnabledSgrMouse = true;
    }
  }

  function sgrMouseModeRank(level: SgrMouseMode): number {
    return level === "button" ? 1 : level === "drag" ? 2 : 3;
  }

  function highestRequestedSgrMouseMode(): SgrMouseMode | undefined {
    let highest: SgrMouseMode | undefined;
    for (const level of sgrMouseModeTokens.values()) {
      if (!highest || sgrMouseModeRank(level) > sgrMouseModeRank(highest)) highest = level;
    }
    return highest;
  }

  function reconcileSgrMouseMode() {
    const next = highestRequestedSgrMouseMode();
    if (!canUseSgrMouseMode()) {
      if (activeSgrMouseMode) disableSgrMouse();
      activeSgrMouseMode = undefined;
      return;
    }
    if (next === activeSgrMouseMode) return;
    if (activeSgrMouseMode) disableSgrMouse();
    if (next) enableSgrMouse(next);
    activeSgrMouseMode = next;
  }

  function clearPendingFlush() {
    if (pendingFlushTimer !== undefined) {
      clearTimeout(pendingFlushTimer);
      pendingFlushTimer = undefined;
    }
  }

  function emitInput(input: string) {
    if (opts.exitOnCtrlC) {
      if (input === "\x03") {
        appCtx.exit();
        return;
      }
      if (input.charCodeAt(0) === 0x1b) {
        const key = parseKeypress(input);
        if (key.name === "c" && key.ctrl && !key.shift && key.eventType !== "release") {
          appCtx.exit();
          return;
        }
      }
    }
    if (activeSgrMouseMode && isSgrMouseInput(input)) {
      const rawMouse = parseSgrMouseInput(input);
      if (rawMouse && emitter.listenerCount("internal_mouse") > 0) {
        emitter.emit("internal_mouse", rawMouse);
      }
      const mouse = parseMouseInput(input);
      if (mouse && emitter.listenerCount("mouse") > 0) emitter.emit("mouse", mouse);
      return;
    }
    if (input === "\x1b" && focusContext.enabled) focusContext.blur();
    emitter.emit("input", input);
  }

  function schedulePendingFlush() {
    clearPendingFlush();
    pendingFlushTimer = setTimeout(() => {
      pendingFlushTimer = undefined;
      const pending = inputParser.flushPendingEscape();
      if (pending) emitInput(pending);
    }, FLUSH_DELAY);
  }

  function handleData(chunk: Buffer | string) {
    clearPendingFlush();
    const data = typeof chunk === "string" ? chunk : chunk.toString();
    const events: InputEvent[] = inputParser.push(data);
    for (const event of events) {
      if (typeof event === "string") emitInput(event);
      else if (emitter.listenerCount("paste") > 0) emitter.emit("paste", event.paste);
      else emitInput(event.paste);
    }
    if (inputParser.hasPendingEscape()) schedulePendingFlush();
  }

  const focusInputListener = (data: string) => {
    if (!focusContext.enabled) return;
    if (data === "\t") focusContext.focusNext();
    else if (data === "\x1b[Z") focusContext.focusPrevious();
  };
  emitter.on("input", focusInputListener);

  const controller: StdinController = {
    stdin,
    isRawModeSupported: appCtx.isRawModeSupported,
    internal_eventEmitter: emitter,
    internal_exitOnCtrlC: opts.exitOnCtrlC,
    setRawMode(mode) {
      if (!appCtx.isRawModeSupported) {
        throw new Error("Raw mode is not supported on the configured stdin stream.");
      }
      if (mode) controller.acquireRawMode();
      else controller.releaseRawMode();
    },
    acquireRawMode() {
      if (!appCtx.isRawModeSupported) {
        throw new Error("Raw mode is not supported on the configured stdin stream.");
      }
      if (refs === 0) {
        appCtx.setRawMode(true);
        if (typeof stdin.ref === "function") stdin.ref();
        if (
          typeof (stdin as { setEncoding?: (encoding: BufferEncoding) => void }).setEncoding ===
          "function"
        ) {
          (stdin as { setEncoding: (encoding: BufferEncoding) => void }).setEncoding("utf8");
        }
        stdin.on("data", handleData);
      }
      refs++;
    },
    releaseRawMode() {
      if (!appCtx.isRawModeSupported || refs === 0) return;
      refs--;
      if (refs === 0) {
        inputParser.reset();
        clearPendingFlush();
        stdin.off("data", handleData);
        appCtx.setRawMode(false);
        if (typeof stdin.unref === "function") stdin.unref();
      }
    },
    holdRawModeForLifetime() {
      controller.acquireRawMode();
    },
    setBracketedPasteMode(enabled) {
      if (enabled) {
        if (bracketedPasteModeCount === 0 && appCtx.stdout.isTTY) {
          appCtx.stdout.write("\x1b[?2004h");
          everEnabledBracketedPaste = true;
        }
        bracketedPasteModeCount++;
      } else {
        if (bracketedPasteModeCount === 0) return;
        bracketedPasteModeCount--;
        if (bracketedPasteModeCount === 0 && appCtx.stdout.isTTY) {
          appCtx.stdout.write("\x1b[?2004l");
        }
      }
    },
    acquireSgrMouseMode(level: SgrMouseMode = "button") {
      const token = Symbol("sgr-mouse");
      sgrMouseModeTokens.set(token, level);
      reconcileSgrMouseMode();
      return token;
    },
    releaseSgrMouseMode(token: symbol) {
      if (!sgrMouseModeTokens.delete(token)) return;
      reconcileSgrMouseMode();
    },
    dispose(sync = false) {
      clearPendingFlush();
      stdin.off("data", handleData);
      emitter.off("input", focusInputListener);
      if (sync && everEnabledBracketedPaste) writeTerminalMode("\x1b[?2004l", true);
      else if (bracketedPasteModeCount > 0) writeTerminalMode("\x1b[?2004l");
      bracketedPasteModeCount = 0;
      if (sync && everEnabledSgrMouse) disableSgrMouse(true);
      else if (activeSgrMouseMode || sgrMouseModeTokens.size > 0) disableSgrMouse();
      activeSgrMouseMode = undefined;
      sgrMouseModeTokens.clear();
      if (refs > 0 && appCtx.isRawModeSupported) {
        refs = 0;
        appCtx.setRawMode(false);
        if (typeof stdin.unref === "function") stdin.unref();
      }
    },
  };

  return controller;
}
