import type { JSX } from "solid-js";
import { createComponent, createMemo, mergeProps, Text, useAnimation } from "@solid-tui/runtime";
import type { SpinnerProps } from "./spinner-props.ts";
import { resolveSpinner } from "./spinners.ts";

export function Spinner(props: SpinnerProps): JSX.Element {
  const merged = mergeProps({ type: "dots" as const }, props);
  const set = createMemo(() => resolveSpinner(merged));
  const { frame } = useAnimation({ interval: () => set().interval });
  const glyph = createMemo(() => {
    const frames = set().frames;
    return frames[frame() % frames.length] ?? "";
  });

  return createComponent(Text, {
    get children() {
      return [
        createComponent(Text, {
          get color() {
            return merged.color;
          },
          get children() {
            return glyph();
          },
        }),
        merged.label
          ? createComponent(Text, {
              get children() {
                return ` ${merged.label}`;
              },
            })
          : null,
      ];
    },
  }) as JSX.Element;
}
