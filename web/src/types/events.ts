import type { Message } from "@ag-ui/core";
import type { z } from "zod";
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
export interface DefineToolEvent<T extends z.ZodTypeAny = z.ZodTypeAny>
	extends CustomEvent<DefineToolEventDetail<T>> {}
