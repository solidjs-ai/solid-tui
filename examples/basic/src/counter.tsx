import { createSignal } from "solid-js";
import { Box, Text, useInput } from "@solid-tui/runtime";

export default function Counter() {
  const [count, setCount] = createSignal(0);

  useInput((input) => {
    if (input === "+") setCount((value) => value + 1);
    if (input === "-") setCount((value) => value - 1);
  });

  return (
    <Box>
      <Text>Count: </Text>
      <Text bold color="green">
        {count()}
      </Text>
      <Text dimColor> (+/- to change)</Text>
    </Box>
  );
}
