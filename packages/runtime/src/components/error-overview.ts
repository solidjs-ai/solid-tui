import * as fs from "node:fs";
import { cwd } from "node:process";
import StackUtils from "stack-utils";
import codeExcerpt, { type CodeExcerpt } from "code-excerpt";
import { createComponent, type JSX } from "../solid-client.ts";
import { Box } from "./box.ts";
import { Text } from "./text.ts";

const cleanupPath = (path: string | undefined): string | undefined => {
  return path?.replace(`file://${cwd()}/`, "");
};

const stackUtils = new StackUtils({
  cwd: cwd(),
  internals: StackUtils.nodeInternals(),
});

const safeString = (value: unknown): string => {
  try {
    return String(value);
  } catch {
    return "[unserializable value]";
  }
};

export function messageForNonError(value: unknown): string {
  let message: unknown;
  try {
    message = (value as { message?: unknown })?.message;
  } catch {
    return safeString(value);
  }
  return typeof message === "string" ? message : safeString(value);
}

export function isErrorInput(value: unknown): value is Error {
  try {
    return value instanceof Error || Object.prototype.toString.call(value) === "[object Error]";
  } catch {
    return false;
  }
}

export function ErrorOverview(props: { error: unknown }) {
  return createComponent(Box, {
    flexDirection: "column",
    padding: 1,
    get children() {
      const error = props.error;
      let errorStack: string | undefined;
      try {
        const rawStack = (error as { stack?: unknown })?.stack;
        errorStack = typeof rawStack === "string" ? rawStack : undefined;
      } catch {
        errorStack = undefined;
      }

      const errorMessage = messageForNonError(error);
      const stack = errorStack ? errorStack.split("\n").slice(1) : undefined;
      const origin = stack ? stackUtils.parseLine(stack[0]!) : undefined;
      const filePath = cleanupPath(origin?.file);
      let excerpt: CodeExcerpt[] | undefined;
      let lineWidth = 0;

      if (filePath && origin?.line && fs.existsSync(filePath)) {
        try {
          const sourceCode = fs.readFileSync(filePath, "utf8");
          excerpt = codeExcerpt(sourceCode, origin.line);
          if (excerpt) {
            for (const { line } of excerpt) lineWidth = Math.max(lineWidth, String(line).length);
          }
        } catch {
          excerpt = undefined;
        }
      }

      const parts: JSX.Element[] = [
        createComponent(Box, {
          get children() {
            return [
              createComponent(Text, {
                backgroundColor: "red",
                color: "white",
                children: " ERROR ",
              }),
              createComponent(Text, {
                children: ` ${errorMessage}`,
              }),
            ];
          },
        }),
      ];

      if (origin && filePath) {
        parts.push(
          createComponent(Box, {
            marginTop: 1,
            get children() {
              return createComponent(Text, {
                dimColor: true,
                children: `${filePath}:${origin.line}:${origin.column}`,
              });
            },
          }),
        );
      }

      if (origin && excerpt) {
        parts.push(
          createComponent(Box, {
            marginTop: 1,
            flexDirection: "column",
            get children() {
              return excerpt!.map(({ line, value }) =>
                createComponent(Box, {
                  get children() {
                    return [
                      createComponent(Box, {
                        width: lineWidth + 1,
                        get children() {
                          return createComponent(Text, {
                            dimColor: line !== origin.line,
                            backgroundColor: line === origin.line ? "red" : undefined,
                            color: line === origin.line ? "white" : undefined,
                            ariaLabel:
                              line === origin.line ? `Line ${line}, error` : `Line ${line}`,
                            children: `${String(line).padStart(lineWidth, " ")}:`,
                          });
                        },
                      }),
                      createComponent(Text, {
                        backgroundColor: line === origin.line ? "red" : undefined,
                        color: line === origin.line ? "white" : undefined,
                        children: ` ${value}`,
                      }),
                    ];
                  },
                }),
              );
            },
          }),
        );
      }

      if (errorStack) {
        parts.push(
          createComponent(Box, {
            marginTop: 1,
            flexDirection: "column",
            get children() {
              return errorStack!
                .split("\n")
                .slice(1)
                .map((line) => {
                  const parsedLine = stackUtils.parseLine(line);
                  if (!parsedLine) {
                    return createComponent(Box, {
                      get children() {
                        return [
                          createComponent(Text, { dimColor: true, children: "- " }),
                          createComponent(Text, {
                            dimColor: true,
                            bold: true,
                            children: line + "\\t ",
                          }),
                        ];
                      },
                    });
                  }

                  const file = cleanupPath(parsedLine.file) ?? "";
                  return createComponent(Box, {
                    get children() {
                      return [
                        createComponent(Text, { dimColor: true, children: "- " }),
                        createComponent(Text, {
                          dimColor: true,
                          bold: true,
                          children: parsedLine.function,
                        }),
                        createComponent(Text, {
                          dimColor: true,
                          color: "gray",
                          ariaLabel: `at ${file} line ${parsedLine.line} column ${parsedLine.column}`,
                          children: ` (${file}:${parsedLine.line}:${parsedLine.column})`,
                        }),
                      ];
                    },
                  });
                });
            },
          }),
        );
      }

      return parts;
    },
  });
}

export function shortStackForError(error: unknown): string {
  try {
    const value = (error as { stack?: unknown })?.stack;
    return typeof value === "string" ? value.split("\n").slice(1, 4).join("\n") : "";
  } catch {
    return "";
  }
}
