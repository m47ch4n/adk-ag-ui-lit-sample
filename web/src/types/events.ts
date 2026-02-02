import type { Message } from "@ag-ui/core";

export interface AgUiMessagesChangedEvent
	extends CustomEvent<{ messages: Message[] }> {}

export interface AgUiRunStartedEvent
	extends CustomEvent<{ threadId: string }> {}

export interface AgUiRunFailedEvent extends CustomEvent<{ error: unknown }> {}

export interface AgUiRunFinalizedEvent
	extends CustomEvent<{ threadId: string }> {}
