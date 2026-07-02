import { PassThrough } from "node:stream";
import type { Component } from "@solid-tui/runtime";
import { createApp, type TuiApp } from "@solid-tui/runtime";
import { INTERNAL_FRAME_SINK, type FrameSink } from "@solid-tui/runtime/internal";
import { makeFakeStdin, makeFakeWritable, type RawModeState } from "./streams.ts";
import { trackApp } from "./cleanup.ts";

export interface RenderOptions {
  columns?: number;
  rows?: number;
  props?: Record<string, unknown>;
  exitOnCtrlC?: boolean;
  interactive?: boolean;
}

export interface Terminal {
  readonly columns: number;
  readonly rows: number;
  resize(columns: number, rows: number): Promise<void>;
  rawMode: RawModeState;
}

export interface LastFrameOptions {
  raw?: boolean;
  trimLines?: boolean;
}

export interface RenderResult {
  lastFrame(this: void, opts?: LastFrameOptions): string | undefined;
  frames: string[];
  stdin: {
    write(data: string): Promise<void>;
  };
  terminal: Terminal;
  unmount(this: void): void;
  waitUntilExit(this: void): Promise<unknown>;
  waitUntilRenderFlush(this: void): Promise<void>;
}

function trimFrame(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();
}

export async function render(
  component: Component<Record<string, unknown>>,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const stdout = makeFakeWritable({
    columns: options.columns ?? 100,
    rows: options.rows ?? 100,
  });
  const stderr = makeFakeWritable({
    columns: options.columns ?? 100,
    rows: options.rows ?? 100,
  });
  const { stream: stdin, rawMode } = makeFakeStdin();

  const frames: string[] = [];
  const frameSink: FrameSink = (chunk) => {
    frames.push(chunk);
  };

  const app: TuiApp = createApp(component, options.props ?? undefined);
  app.mount({
    stdout,
    stdin,
    stderr,
    debug: true,
    interactive: options.interactive ?? true,
    exitOnCtrlC: options.exitOnCtrlC ?? false,
    [INTERNAL_FRAME_SINK]: frameSink,
  } as Parameters<TuiApp["mount"]>[0]);

  trackApp(app);
  await app.waitUntilRenderFlush();
  await Promise.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));

  const terminal: Terminal = {
    get columns() {
      return stdout.columns;
    },
    get rows() {
      return stdout.rows;
    },
    async resize(columns: number, rows: number) {
      stdout.columns = columns;
      stdout.rows = rows;
      (stderr as NodeJS.WriteStream).columns = columns;
      (stderr as NodeJS.WriteStream).rows = rows;
      (stdout as unknown as PassThrough).emit("resize");
      await app.waitUntilRenderFlush();
    },
    rawMode,
  };

  return {
    lastFrame: (opts?: LastFrameOptions) => {
      const f = frames.at(-1) ?? "";
      if (opts?.raw) return f;
      if (opts?.trimLines)
        return f
          .split("\n")
          .map((l) => l.trimEnd())
          .join("\n");
      return trimFrame(f);
    },
    frames,
    stdin: {
      async write(data: string): Promise<void> {
        stdin.emit("data", data);
        await new Promise((r) => setTimeout(r, 30));
        await app.waitUntilRenderFlush();
      },
    },
    terminal,
    unmount: app.unmount.bind(app),
    waitUntilExit: app.waitUntilExit.bind(app),
    waitUntilRenderFlush: app.waitUntilRenderFlush.bind(app),
  };
}
