import { createSignal } from "solid-js";
import { Box, Static, Text, useApp, useInput } from "@solid-tui/runtime";
import { runAgentLoop, type Message, type ToolCall } from "./agent.ts";
import MessageList from "./components/message-list.tsx";

type AppState = "idle" | "streaming" | "approving";

export default function App() {
  const [state, setState] = createSignal<AppState>("idle");
  const [inputText, setInputText] = createSignal("");
  const [completedMessages, setCompletedMessages] = createSignal<Message[]>([]);
  const [streamingText, setStreamingText] = createSignal("");
  const [pendingCommand, setPendingCommand] = createSignal("");
  const messages: Message[] = [];
  const autoApprove = process.argv.includes("--yolo");
  const { exit } = useApp();
  let approvalResolve: ((approved: boolean) => void) | null = null;

  async function submit() {
    const text = inputText().trim();
    if (!text) return;

    setInputText("");
    setState("streaming");
    setStreamingText("");
    setCompletedMessages((items) => [...items, { role: "user" as const, content: text }]);

    try {
      const updated = await runAgentLoop(text, messages, {
        onToken(token) {
          setStreamingText((value) => value + token);
        },
        onToolCall(_tc: ToolCall, command: string) {
          const current = streamingText();
          if (current) {
            setCompletedMessages((items) => [...items, { role: "assistant", content: current }]);
            setStreamingText("");
          }
          setPendingCommand(command);
        },
        onToolResult(tc: ToolCall, output: string) {
          setCompletedMessages((items) => [
            ...items,
            { role: "assistant", tool_calls: [tc] },
            { role: "tool", tool_call_id: tc.id, content: output },
          ]);
          setPendingCommand("");
        },
        onComplete() {
          const current = streamingText();
          if (current) {
            setCompletedMessages((items) => [...items, { role: "assistant", content: current }]);
            setStreamingText("");
          }
        },
        autoApprove,
        requestApproval(command) {
          setState("approving");
          setPendingCommand(command);
          return new Promise<boolean>((resolve) => {
            approvalResolve = resolve;
          });
        },
      });

      messages.length = 0;
      messages.push(...updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errParts: Message[] = [];
      const current = streamingText();
      if (current) errParts.push({ role: "assistant", content: current });
      errParts.push({ role: "assistant", content: `Error: ${error.message}` });
      setCompletedMessages((items) => [...items, ...errParts]);
    }

    setStreamingText("");
    setPendingCommand("");
    setState("idle");
  }

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      return;
    }

    if (state() === "approving") {
      if (key.return) {
        setState("streaming");
        approvalResolve?.(true);
        approvalResolve = null;
      } else if (key.escape) {
        setState("streaming");
        approvalResolve?.(false);
        approvalResolve = null;
      }
      return;
    }

    if (state() !== "idle") return;

    if (key.return) {
      void submit();
    } else if (key.backspace || key.delete) {
      setInputText((value) => value.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setInputText((value) => value + input);
    }
  });

  return (
    <Box flexDirection="column">
      <Static items={completedMessages()}>{({ item }) => <MessageList message={item} />}</Static>

      {streamingText() ? (
        <Box>
          <Text>{streamingText()}</Text>
        </Box>
      ) : null}

      {state() === "approving" ? (
        <Box borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text color="yellow">{pendingCommand()}</Text>
          <Text dimColor>{"  [Enter] run / [Esc] skip"}</Text>
        </Box>
      ) : null}

      <Box>
        {state() === "idle" ? (
          <Text>
            <Text color="cyan">&gt; </Text>
            {inputText()}
            <Text dimColor>█</Text>
          </Text>
        ) : state() === "streaming" ? (
          <Text dimColor>...</Text>
        ) : null}
      </Box>
    </Box>
  );
}
