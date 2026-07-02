import { For } from "solid-js";
import { Box, Text } from "@solid-tui/runtime";
import type { Message } from "../agent.ts";

export interface MessageListProps {
  message: Message;
}

function parseCommand(tc: { function: { arguments: string } }): string {
  return JSON.parse(tc.function.arguments).command;
}

export default function MessageList(props: MessageListProps) {
  return (
    <>
      {props.message.role === "user" ? (
        <Box>
          <Text>
            <Text bold color="green">
              You:{" "}
            </Text>
            {props.message.content}
          </Text>
        </Box>
      ) : props.message.role === "assistant" && props.message.tool_calls ? (
        <Box flexDirection="column">
          {props.message.content ? (
            <Text>
              <Text bold color="cyan">
                Agent:{" "}
              </Text>
              {props.message.content}
            </Text>
          ) : null}
          <For each={props.message.tool_calls}>
            {(tc) => (
              <Box borderStyle="round" borderColor="yellow" paddingX={1}>
                <Text color="yellow">{parseCommand(tc)}</Text>
              </Box>
            )}
          </For>
        </Box>
      ) : props.message.role === "assistant" ? (
        <Box>
          <Text>
            <Text bold color="cyan">
              Agent:{" "}
            </Text>
            {props.message.content}
          </Text>
        </Box>
      ) : props.message.role === "tool" ? (
        <Box paddingLeft={2}>
          <Text dimColor>{props.message.content}</Text>
        </Box>
      ) : null}
    </>
  );
}
