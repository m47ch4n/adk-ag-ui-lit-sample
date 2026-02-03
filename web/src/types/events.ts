import type { Message } from "@ag-ui/core";
import type { ToolHandler } from "./tool.js";

export interface AgUiMessagesChangedEvent
	extends CustomEvent<{ messages: Message[] }> {}

export interface AgUiRunStartedEvent
	extends CustomEvent<{ threadId: string }> {}

export interface AgUiRunFailedEvent extends CustomEvent<{ error: unknown }> {}

export interface AgUiRunFinalizedEvent
	extends CustomEvent<{ threadId: string }> {}

// Tool-related events
export interface AgUiToolCallStartEvent
	extends CustomEvent<{ toolCallId: string; toolCallName: string }> {}

export interface AgUiToolCallEndEvent
	extends CustomEvent<{
		toolCallId: string;
		toolCallName: string;
		toolCallArgs: Record<string, unknown>;
		result: string;
	}> {}

export interface AgUiToolCallErrorEvent
	extends CustomEvent<{
		toolCallId: string;
		toolCallName: string;
		error: unknown;
	}> {}

export interface DefineToolEvent
	extends CustomEvent<{
		name: string;
		description: string;
		parameters: unknown; // ZodType
		handler: ToolHandler;
	}> {}
