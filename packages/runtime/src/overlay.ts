import { createComponent, useContext, type Component, type JSX } from "./solid-client.ts";
import { Box } from "./components/box.ts";
import { Text } from "./components/text.ts";
import { DevStateKey, type DevState } from "./hmr.ts";

function ErrorDisplay(props: { error: DevState & { type: "error" } }) {
  return createComponent(Box, {
    flexDirection: "column",
    borderStyle: "single",
    borderColor: "red",
    paddingX: 1,
    get children() {
      return [
        createComponent(Text, { color: "red", bold: true, children: "Build Error" }),
        createComponent(Text, {
          get children() {
            return props.error.error.message;
          },
        }),
        props.error.error.loc
          ? createComponent(Text, {
              dimColor: true,
              get children() {
                const loc = props.error.error.loc!;
                return `${loc.file}:${loc.line}:${loc.column}`;
              },
            })
          : null,
      ];
    },
  });
}

function StatusLine(props: { paths: string[] }) {
  return createComponent(Text, {
    dimColor: true,
    get children() {
      return `[HMR] updated: ${props.paths.join(", ")}`;
    },
  });
}

export function createDevOverlayWrapper(
  Root: Component<Record<string, unknown>>,
  rootProps?: Record<string, unknown>,
): Component<Record<string, unknown>> {
  return function DevOverlayWrapper() {
    const state = useContext(DevStateKey);
    return (() => {
      const current = state?.() ?? { type: "ok" as const };
      if (current.type === "error") return createComponent(ErrorDisplay, { error: current });

      return createComponent(Box, {
        flexDirection: "column",
        flexGrow: 1,
        get children() {
          return [
            createComponent(Box, {
              flexGrow: 1,
              get children() {
                return createComponent(Root, rootProps ?? {});
              },
            }),
            current.type === "update"
              ? createComponent(StatusLine, { paths: current.paths })
              : null,
          ];
        },
      });
    }) as unknown as JSX.Element;
  };
}

export function DevStatusLine(props: { state: DevState }) {
  const state = props.state;
  if (state.type === "ok") return null;
  return createComponent(Box, {
    marginTop: 1,
    get children() {
      return createComponent(Text, {
        dimColor: state.type === "update",
        color: state.type === "error" ? "red" : "yellow",
        get children() {
          if (state.type === "error") return `Build Error: ${state.error.message}`;
          return `[HMR] updated ${state.paths.join(", ")}`;
        },
      });
    },
  });
}
