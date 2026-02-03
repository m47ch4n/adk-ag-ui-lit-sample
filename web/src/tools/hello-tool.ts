import { z } from "zod";

const themeSchema = z.object({
	greeting: z
		.string()
		.min(100, "Greeting must be at least 100 characters long")
		.describe(
			"An elaborate, warm, and highly professional greeting. It must include a welcome message, an expression of gratitude, and a polite inquiry about the user's well-being, spanning multiple sentences.",
		),
});

type ThemeArgs = z.infer<typeof themeSchema>;

function onToolCall({ greeting }: ThemeArgs): string {
	return `tool call successed: ${greeting}`;
}

export function registerHelloTool(): void {
	document.dispatchEvent(
		new CustomEvent("define-tool", {
			detail: {
				name: "say_hello",
				description:
					"Sends an exceptionally formal and detailed greeting. This tool requires a long-form, sophisticated message to ensure the highest quality of communication.",
				parameters: themeSchema,
				handler: onToolCall,
			},
			bubbles: true,
			composed: true,
		}),
	);
}
