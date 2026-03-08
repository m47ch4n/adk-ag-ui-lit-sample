import type { Message } from "@ag-ui/core";
import type { z } from "zod";
import type { ToolHandler } from "./tool.js";

export interface AgUiMessagesChangedEvent extends CustomEvent<{
  messages: Message[];
}> {}

export interface AgUiRunStartedEvent extends CustomEvent<{
  threadId: string;
}> {}

export interface AgUiRunFailedEvent extends CustomEvent<{ error: unknown }> {}

export interface AgUiRunFinalizedEvent extends CustomEvent<{
  threadId: string;
}> {}

// Reasoning events (thinking/reasoning from LLM)
export interface AgUiReasoningStartEvent extends CustomEvent<{}> {}

export interface AgUiReasoningContentEvent
  extends CustomEvent<{
    delta: string;
    buffer: string;
  }> {}

export interface AgUiReasoningEndEvent
  extends CustomEvent<{
    content: string;
  }> {}

// Tool-related events
export interface AgUiToolCallArgsEvent
  extends CustomEvent<{
    toolCallId: string;
    toolCallName: string;
    delta: string;
    buffer: string;
  }> {}

export interface AgUiToolCallStartEvent extends CustomEvent<{
  toolCallId: string;
  toolCallName: string;
}> {}

export interface AgUiToolCallEndEvent extends CustomEvent<{
  toolCallId: string;
  toolCallName: string;
  toolCallArgs: Record<string, unknown>;
  result: string;
}> {}

export interface AgUiToolCallErrorEvent extends CustomEvent<{
  toolCallId: string;
  toolCallName: string;
  error: unknown;
}> {}

// --- State Events ---

export interface AgUiStateSnapshotEvent extends CustomEvent<{
  snapshot: Record<string, unknown>;
}> {}

export interface AgUiStateDeltaEvent extends CustomEvent<{
  delta: unknown[];
}> {}

export interface AgUiStateChangedEvent extends CustomEvent<{
  state: Record<string, unknown>;
}> {}

export interface AgUiCustomAgEvent extends CustomEvent<{
  name: string;
  value: unknown;
}> {}

/**
 * Detail payload for DefineToolEvent.
 * Generic over the Zod schema type to ensure handler receives correctly typed args.
 */
export interface DefineToolEventDetail<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: T;
  handler: ToolHandler<z.infer<T>>;
}

/**
 * Event dispatched to register a tool with ag-ui-agent.
 * The generic parameter ensures type safety between schema and handler.
 */
export interface DefineToolEvent<
  T extends z.ZodTypeAny = z.ZodTypeAny,
> extends CustomEvent<DefineToolEventDetail<T>> {}
