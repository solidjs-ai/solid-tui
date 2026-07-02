import { createMemo, mergeProps, type JSX } from "solid-js";
import { Text, useAnimation } from "@solid-tui/runtime";
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

  return (
    <Text>
      <Text color={merged.color}>{glyph()}</Text>
      {merged.label ? <Text>{" " + merged.label}</Text> : null}
    </Text>
  );
}
