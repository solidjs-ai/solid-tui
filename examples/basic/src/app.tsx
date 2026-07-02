import { createSignal } from "solid-js";
import { Box, Text, useInput } from "@solid-tui/runtime";
import Counter from "./counter.tsx";
import Clock from "./clock.tsx";

export default function App() {
  const [showClock, setShowClock] = createSignal(true);

  useInput((input) => {
    if (input === "c") setShowClock((value) => !value);
    if (input === "q") process.exit(0);
  });

  return (
    <Box flexDirection="column" backgroundColor="blue" borderStyle="round" width="20">
      <Text bold color="cyan">
        solid-tui basic
      </Text>
      <Text dimColor>Try editing counter.tsx or app.tsx</Text>
      <Text dimColor>Press c=toggle clock, q=quit</Text>
      <Text> </Text>
      <Counter />
      {showClock() ? <Clock /> : null}
    </Box>
  );
}
