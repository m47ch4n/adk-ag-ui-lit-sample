import { z } from "zod";
import type { DefineToolEvent } from "../types/events.js";
import { defineTool } from "../types/tool.js";

const helloTool = defineTool({
	name: "say_hello",
	description:
		"Sends an exceptionally formal and detailed greeting. This tool requires a long-form, sophisticated message to ensure the highest quality of communication.",
	parameters: z.object({
		greeting: z
			.string()
			.min(100, "Greeting must be at least 100 characters long")
			.describe(
				"An elaborate, warm, and highly professional greeting. It must include a welcome message, an expression of gratitude, and a polite inquiry about the user's well-being, spanning multiple sentences.",
			),
	}),
	handler: ({ greeting }) => `tool call successed: ${greeting}`,
});

export function registerHelloTool(): void {
	const event: DefineToolEvent<typeof helloTool.parameters> = new CustomEvent(
		"define-tool",
		{
			detail: helloTool,
			bubbles: true,
			composed: true,
		},
	);
	document.dispatchEvent(event);
}
