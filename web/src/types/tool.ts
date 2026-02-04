import type { z } from "zod";

export type ToolHandler<T = Record<string, unknown>> = (
	args: T,
) => string | Promise<string>;

/**
 * Type-safe tool definition with Zod schema.
 * The handler's argument type is inferred from the Zod schema.
 */
export interface ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
	name: string;
	description: string;
	parameters: T;
	handler: ToolHandler<z.infer<T>>;
}

/**
 * Helper function to create a type-safe tool definition.
 * This ensures the handler's argument type matches the Zod schema.
 *
 * @example
 * ```ts
 * const myTool = defineTool({
 *   name: "greet",
 *   description: "Greets a user",
 *   parameters: z.object({ name: z.string() }),
 *   handler: ({ name }) => `Hello, ${name}!`, // name is typed as string
 * });
 * ```
 */
export function defineTool<T extends z.ZodTypeAny>(
	definition: ToolDefinition<T>,
): ToolDefinition<T> {
	return definition;
}

/**
 * Registered tool with JSON Schema parameters (after Zod conversion).
 * Used internally by ag-ui-agent.
 */
export interface RegisteredTool {
	name: string;
	description: string;
	parameters: unknown; // JSON Schema (converted from Zod)
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
