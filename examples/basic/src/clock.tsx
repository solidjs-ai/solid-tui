import { createSignal, onCleanup } from "solid-js";
import { Box, Text } from "@solid-tui/runtime";

export default function Clock() {
  const [time, setTime] = createSignal(new Date().toLocaleTimeString());
  const timer = setInterval(() => {
    setTime(new Date().toLocaleTimeString());
  }, 1000);

  onCleanup(() => clearInterval(timer));

  return (
    <Box>
      <Text>Clock: </Text>
      <Text bold color="yellow">
        {time()}
      </Text>
    </Box>
  );
}
