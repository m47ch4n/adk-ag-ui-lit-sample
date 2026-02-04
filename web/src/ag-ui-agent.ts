import { type AgentSubscriber, HttpAgent } from "@ag-ui/client";
import type { Message, Tool, ToolMessage, UserMessage } from "@ag-ui/core";
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { z } from "zod";
import type {
	AgUiMessagesChangedEvent,
	AgUiRunFailedEvent,
	AgUiRunFinalizedEvent,
	AgUiRunStartedEvent,
	AgUiToolCallEndEvent,
	AgUiToolCallErrorEvent,
	AgUiToolCallStartEvent,
	RegisteredTool,
	ToolHandler,
} from "./types/index.js";

/**
 * Headless custom element that wraps HttpAgent and dispatches AG-UI events.
 * Does not render any UI - use with event listeners in parent components.
 */
@customElement("ag-ui-agent")
export class AgUiAgent extends LitElement {
	@property({ type: String })
	url = "/api/chat";

	@property({ type: String, attribute: "thread-id" })
	threadId = crypto.randomUUID();

	private _agent: HttpAgent | null = null;
	private _unsubscribe: (() => void) | null = null;
	private _registeredTools: Map<string, RegisteredTool> = new Map();

	get isRunning(): boolean {
		return this._agent?.isRunning ?? false;
	}

	get messages(): Message[] {
		return this._agent?.messages ?? [];
	}

	/**
	 * Register a tool that can be invoked by the LLM.
	 * The generic parameter ensures type safety between the Zod schema and handler.
	 *
	 * @param name - Unique tool name
	 * @param description - Description of what the tool does
	 * @param parameters - Zod schema for tool parameters
	 * @param handler - Function to execute when tool is called (args typed from schema)
	 */
	registerTool<T extends z.ZodTypeAny>(
		name: string,
		description: string,
		parameters: T,
		handler: (args: z.infer<T>) => string | Promise<string>,
	): void {
		const jsonSchema = z.toJSONSchema(parameters);
		this._registeredTools.set(name, {
			name,
			description,
			parameters: jsonSchema,
			handler: handler as ToolHandler,
		});
	}

	/**
	 * Unregister a previously registered tool.
	 * @param name - Name of the tool to unregister
	 */
	unregisterTool(name: string): void {
		this._registeredTools.delete(name);
	}

	/**
	 * Get list of registered tool names.
	 */
	get registeredToolNames(): string[] {
		return Array.from(this._registeredTools.keys());
	}

	/**
	 * Convert registered tools to AG-UI Tool format.
	 * Removes $schema property as Google ADK's types.Schema doesn't allow it.
	 */
	private _getToolsForAgent(): Tool[] {
		return Array.from(this._registeredTools.values()).map((tool) => {
			// Remove $schema from parameters as ADK doesn't accept it
			const { $schema, ...parameters } = tool.parameters as Record<
				string,
				unknown
			>;
			return {
				name: tool.name,
				description: tool.description,
				parameters,
			};
		});
	}

	/** Disable Shadow DOM for headless operation */
	protected createRenderRoot() {
		return this;
	}

	connectedCallback() {
		super.connectedCallback();
		this._initAgent();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._cleanupAgent();
	}

	private _initAgent() {
		this._agent = new HttpAgent({
			url: this.url,
			threadId: this.threadId,
		});

		const subscriber: AgentSubscriber = {
			onMessagesChanged: (params) => {
				this._dispatchEvent("ag-ui-messages-changed", {
					messages: params.messages,
				} satisfies AgUiMessagesChangedEvent["detail"]);
			},
			onRunFailed: (params) => {
				console.error("AG-UI Run Failed:", params.error);
				this._dispatchEvent("ag-ui-run-failed", {
					error: params.error,
				} satisfies AgUiRunFailedEvent["detail"]);
			},
			onRunFinalized: () => {
				this._dispatchEvent("ag-ui-run-finalized", {
					threadId: this.threadId,
				} satisfies AgUiRunFinalizedEvent["detail"]);
			},
			onToolCallStartEvent: (params) => {
				this._dispatchEvent("ag-ui-tool-call-start", {
					toolCallId: params.event.toolCallId,
					toolCallName: params.event.toolCallName,
				} satisfies AgUiToolCallStartEvent["detail"]);
			},
			onToolCallEndEvent: async (params) => {
				const { toolCallName, toolCallArgs } = params;
				const toolCallId = params.event.toolCallId;

				const registeredTool = this._registeredTools.get(toolCallName);
				if (!registeredTool) {
					// Tool not registered locally - let backend handle it
					return;
				}

				try {
					const result = await registeredTool.handler(toolCallArgs);

					// Add ToolMessage to the agent
					const toolMessage: ToolMessage = {
						id: crypto.randomUUID(),
						role: "tool",
						content: result,
						toolCallId,
					};
					this._agent?.addMessage(toolMessage);

					this._dispatchEvent("ag-ui-tool-call-end", {
						toolCallId,
						toolCallName,
						toolCallArgs,
						result,
					} satisfies AgUiToolCallEndEvent["detail"]);
				} catch (error) {
					console.error(`Tool "${toolCallName}" execution failed:`, error);

					// Add error ToolMessage
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					const toolMessage: ToolMessage = {
						id: crypto.randomUUID(),
						role: "tool",
						content: "",
						toolCallId,
						error: errorMessage,
					};
					this._agent?.addMessage(toolMessage);

					this._dispatchEvent("ag-ui-tool-call-error", {
						toolCallId,
						toolCallName,
						error,
					} satisfies AgUiToolCallErrorEvent["detail"]);
				}
			},
		};

		const subscription = this._agent.subscribe(subscriber);
		this._unsubscribe = () => subscription.unsubscribe();
	}

	private _cleanupAgent() {
		if (this._unsubscribe) {
			this._unsubscribe();
			this._unsubscribe = null;
		}
		this._agent = null;
	}

	private _dispatchEvent<T>(name: string, detail: T) {
		this.dispatchEvent(
			new CustomEvent(name, {
				detail,
				bubbles: true,
				composed: true,
			}),
		);
	}

	async sendMessage(content: string) {
		if (!content.trim() || !this._agent || this.isRunning) return;

		const userMessage: UserMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: content,
		};
		this._agent.addMessage(userMessage);

		this._dispatchEvent("ag-ui-run-started", {
			threadId: this.threadId,
		} satisfies AgUiRunStartedEvent["detail"]);

		try {
			await this._agent.runAgent({
				tools: this._getToolsForAgent(),
				context: [],
			});
		} catch (e) {
			console.error("AG-UI Error:", e);
			this._dispatchEvent("ag-ui-run-failed", {
				error: e,
			} satisfies AgUiRunFailedEvent["detail"]);
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"ag-ui-agent": AgUiAgent;
	}
}
