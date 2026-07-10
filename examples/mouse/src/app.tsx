import { createSignal } from "solid-js";
import {
  Box,
  Text,
  useApp,
  useDraggable,
  useInput,
  type TuiMouseEvent,
  type TuiWheelEvent,
} from "@solid-tui/runtime";

export default function App() {
  const { exit } = useApp();
  const [clicks, setClicks] = createSignal(0);
  const [lastClick, setLastClick] = createSignal("none");
  const [lastWheel, setLastWheel] = createSignal("none");
  let dragNode: unknown;

  useInput((input) => {
    if (input === "q") exit();
  });

  const drag = useDraggable(() => dragNode, {
    initialValue: { x: 2, y: 7 },
  });

  function onPanelClick(event: TuiMouseEvent) {
    setClicks((value) => value + 1);
    setLastClick(`${event.button} @ ${event.offsetX},${event.offsetY} (${event.detail})`);
  }

  function onPanelWheel(event: TuiWheelEvent) {
    setLastWheel(`${event.deltaX},${event.deltaY} @ ${event.offsetX},${event.offsetY}`);
  }

  return (
    <Box flexDirection="column" width="100%" height="100%" paddingX={1} paddingY={1}>
      <Text bold color="cyan">
        solid-tui mouse input
      </Text>
      <Text dimColor>Click, wheel, or drag the block. Press q to quit.</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>Clicks: {clicks()}</Text>
        <Text>Last click: {lastClick()}</Text>
        <Text>Last wheel: {lastWheel()}</Text>
      </Box>

      <Box
        marginTop={1}
        width={50}
        height={10}
        borderStyle="single"
        borderColor="gray"
        onClick={onPanelClick}
        onWheel={onPanelWheel}
      >
        <Box
          ref={(node: unknown) => {
            dragNode = node;
          }}
          position="absolute"
          left={drag.x()}
          top={drag.y()}
          width={8}
          height={3}
          borderStyle="round"
          borderColor="green"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="green">drag</Text>
        </Box>
      </Box>
    </Box>
  );
}
