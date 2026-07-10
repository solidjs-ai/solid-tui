import { For, createSignal, onCleanup, onMount } from "solid-js";
import { Box, Text, useApp, useInput, useWindowSize } from "@solid-tui/runtime";
import { ScrollBox, type ScrollBoxHandle } from "@solid-tui/components";

export default function App() {
  const { exit } = useApp();
  const { rows } = useWindowSize();
  const [lines, setLines] = createSignal<string[]>([]);
  let box!: ScrollBoxHandle;
  let nextLine = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  onMount(() => {
    timer = setInterval(() => {
      nextLine += 1;
      setLines((current) => [
        ...current,
        `#${String(nextLine).padStart(3, "0")}  streaming log line - the quick brown fox jumps over the lazy dog`,
      ]);
    }, 350);
  });
  onCleanup(() => {
    if (timer) clearInterval(timer);
  });

  useInput((input, key) => {
    if (input === "q") exit();
    else if (key.upArrow) box.scrollByLines(-1);
    else if (key.downArrow) box.scrollByLines(1);
    else if (key.home) box.scrollToTop();
    else if (key.end) box.scrollToBottom();
  });

  return (
    <Box flexDirection="column" height={rows()}>
      <Box borderStyle="round" paddingX={1}>
        <Text bold color="cyan">
          ScrollBox demo
        </Text>
        <Text dimColor> - Up/Down, Home/End, q to quit</Text>
      </Box>

      <Box flexGrow={1} minHeight={0} flexDirection="column" borderStyle="round" paddingX={1}>
        <ScrollBox
          ref={(handle) => {
            box = handle;
          }}
        >
          <For each={lines()}>{(line) => <Text>{line}</Text>}</For>
        </ScrollBox>
      </Box>

      <Box paddingX={1}>
        <Text dimColor>{lines().length} lines - sticks to bottom until you scroll up</Text>
      </Box>
    </Box>
  );
}
