export type ToolHandler<T = Record<string, unknown>> = (
	args: T,
) => string | Promise<string>;

export interface RegisteredTool {
	name: string;
	description: string;
	parameters: unknown; // JSON Schema
	handler: ToolHandler;
}

export type ToolCallStatus = "pending" | "running" | "completed" | "error";

export interface ToolCallDisplayData {
	id: string;
	toolCallId: string;
	name: string;
	args: Record<string, unknown>;
	status: ToolCallStatus;
	result?: string;
	error?: string;
}
