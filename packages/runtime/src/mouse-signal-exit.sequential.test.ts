import { PassThrough } from "node:stream";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { createApp, createComponent, Text, useMouseInput } from "./index.ts";

const MOUSE_ON = "\x1b[?1000h\x1b[?1006h";
const MOUSE_OFF = "\x1b[?1003l\x1b[?1002l\x1b[?1000l\x1b[?1006l";
const SHOW_CURSOR = "\x1b[?25h";
const EXIT_ALTERNATE_SCREEN = "\x1b[?1049l";
let previousTerm: string | undefined;

beforeEach(() => {
  previousTerm = process.env["TERM"];
  process.env["TERM"] = "xterm-256color";
});

afterEach(() => {
  if (previousTerm === undefined) delete process.env["TERM"];
  else process.env["TERM"] = previousTerm;
});

function makeFakeStdin(): NodeJS.ReadStream {
  const stream = new PassThrough() as unknown as NodeJS.ReadStream;
  Object.assign(stream, {
    isTTY: true,
    setRawMode() {
      return stream;
    },
    setEncoding() {
      return stream;
    },
    ref() {},
    unref() {},
  });
  return stream;
}

function makeFdBackedStdout(): {
  stdout: NodeJS.WriteStream;
  asyncWrites: string[];
  readSyncBytes: () => string;
  cleanup: () => void;
} {
  const filePath = path.join(os.tmpdir(), `solid-tui-sync-${process.pid}-${Date.now()}.bin`);
  const fd = fs.openSync(filePath, "w+");
  const inner = new PassThrough();
  const asyncWrites: string[] = [];
  const realWrite = inner.write.bind(inner);
  const stdout = inner as unknown as NodeJS.WriteStream;

  stdout.write = ((data: string | Uint8Array, ...args: unknown[]) => {
    asyncWrites.push(String(data));
    return realWrite(data, ...(args as []));
  }) as NodeJS.WriteStream["write"];
  Object.assign(stdout, { columns: 80, rows: 24, isTTY: true, fd });

  return {
    stdout,
    asyncWrites,
    readSyncBytes: () => fs.readFileSync(filePath, "utf8"),
    cleanup: () => {
      fs.closeSync(fd);
      fs.rmSync(filePath, { force: true });
    },
  };
}

function MouseApp() {
  useMouseInput(() => {});
  return createComponent(Text, { children: "mouse" });
}

test("signal teardown disables every SGR mouse mode synchronously", async () => {
  const { stdout, asyncWrites, readSyncBytes, cleanup } = makeFdBackedStdout();
  const app = createApp(MouseApp);
  app.mount({
    stdout,
    stdin: makeFakeStdin(),
    debug: false,
    patchConsole: false,
    exitOnCtrlC: false,
    interactive: true,
    fullscreen: true,
  });

  await new Promise<void>((resolve) => setTimeout(resolve, 60));
  expect(asyncWrites.join("")).toContain(MOUSE_ON);

  const kill = vi.spyOn(process, "kill").mockImplementation(() => true);
  try {
    process.emit("SIGINT", "SIGINT");
  } finally {
    kill.mockRestore();
  }

  try {
    const syncBytes = readSyncBytes();
    expect(syncBytes).toContain(MOUSE_OFF);
    expect(syncBytes).toContain(SHOW_CURSOR);
    expect(syncBytes).toContain(EXIT_ALTERNATE_SCREEN);
  } finally {
    cleanup();
  }
});
