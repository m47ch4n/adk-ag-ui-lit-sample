import type { Message } from "@ag-ui/core";
import { css, html, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import type { AgUiAgent } from "./ag-ui-agent.js";
import "./ag-ui-agent.js";
import "./custom-elements/chat-input.js";
import "./custom-elements/chat-messages.js";
import "./custom-elements/toast-manager.js";
import type { ToastData } from "./custom-elements/toast-manager.js";
import { chatTokens } from "./styles/tokens.js";
import { registerHelloTool } from "./tools/hello-tool.js";
import type {
	AgUiMessagesChangedEvent,
	AgUiRunFailedEvent,
	AgUiRunFinalizedEvent,
	AgUiRunStartedEvent,
	AgUiToolCallEndEvent,
	AgUiToolCallErrorEvent,
	AgUiToolCallStartEvent,
	ChatLoadingData,
	ChatMessageData,
	DefineToolEvent,
} from "./types/index.js";

type DisplayableRole = "user" | "assistant";

@customElement("chat-app")
export class ChatApp extends LitElement {
	@query("ag-ui-agent")
	private _agentElement!: AgUiAgent;

	@state()
	private _messages: ChatMessageData[] = [];

	@state()
	private _loading: ChatLoadingData | null = null;

	@state()
	private _isRunning = false;

	@state()
	private _toasts: ToastData[] = [];

	private _handleMessagesChanged = (e: AgUiMessagesChangedEvent) => {
		this._messages = this._transformMessages(e.detail.messages);
		this._loading = this._computeLoading(e.detail.messages);
	};

	private _handleRunStarted = (_e: AgUiRunStartedEvent) => {
		this._isRunning = true;
		this._loading = {
			position: "left",
			variant: "secondary",
			avatar: "A",
		};
	};

	private _handleRunFailed = (e: AgUiRunFailedEvent) => {
		this._isRunning = false;
		this._loading = null;
		const message =
			e.detail.error instanceof Error
				? e.detail.error.message
				: "Unknown error";
		this._addErrorToast(message);
	};

	private _handleRunFinalized = (_e: AgUiRunFinalizedEvent) => {
		this._isRunning = false;
		this._loading = null;
	};

	private _handleToolCallStart = (e: AgUiToolCallStartEvent) => {
		// WIP
		console.log(e);
	};

	private _handleToolCallEnd = (e: AgUiToolCallEndEvent) => {
		// WIP
		console.log(e);
	};

	private _handleToolCallError = (e: AgUiToolCallErrorEvent) => {
		// WIP
		console.log(e);
	};

	private _handleDefineTool = (e: Event) => {
		const event = e as DefineToolEvent;
		const { name, description, parameters, handler } = event.detail;
		this._agentElement.registerTool(name, description, parameters, handler);
	};

	connectedCallback() {
		super.connectedCallback();
		document.addEventListener("define-tool", this._handleDefineTool);
	}

	firstUpdated() {
		// Register tools after first render when _agentElement is available
		registerHelloTool();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener("define-tool", this._handleDefineTool);
	}

	private _transformMessages(messages: Message[]): ChatMessageData[] {
		console.log({ messages });
		return messages
			.filter(
				(msg): msg is Message & { role: DisplayableRole } =>
					msg.role === "user" || msg.role === "assistant",
			)
			.map((msg) => ({
				id: msg.id,
				position: msg.role === "user" ? "right" : "left",
				variant: msg.role === "user" ? "primary" : "secondary",
				avatar: msg.role === "user" ? "U" : "A",
				content: this._getContentText(msg.content),
			}));
	}

	private _getContentText(content: Message["content"]): string {
		if (typeof content === "string") return content;
		if (Array.isArray(content)) {
			return content
				.filter(
					(part): part is { type: "text"; text: string } =>
						part.type === "text",
				)
				.map((part) => part.text)
				.join("");
		}
		return "";
	}

	private _computeLoading(messages: Message[]): ChatLoadingData | null {
		if (!this._isRunning) return null;

		const lastMessage = messages.at(-1);
		if (
			lastMessage?.role === "assistant" &&
			this._getContentText(lastMessage.content)
		) {
			return null;
		}

		return {
			position: "left",
			variant: "secondary",
			avatar: "A",
		};
	}

	private _addErrorToast(message: string) {
		this._toasts = [
			...this._toasts,
			{
				id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				message,
				type: "error",
				noAutoDismiss: true,
			},
		];
	}

	private _handleSend(e: CustomEvent<{ message: string }>) {
		this._agentElement.sendMessage(e.detail.message);
	}

	private _handleToastClose(e: CustomEvent<{ id: string }>) {
		this._toasts = this._toasts.filter((t) => t.id !== e.detail.id);
	}

	render() {
		return html`
      <ag-ui-agent
        @ag-ui-messages-changed=${this._handleMessagesChanged}
        @ag-ui-run-started=${this._handleRunStarted}
        @ag-ui-run-failed=${this._handleRunFailed}
        @ag-ui-run-finalized=${this._handleRunFinalized}
        @ag-ui-tool-call-start=${this._handleToolCallStart}
        @ag-ui-tool-call-end=${this._handleToolCallEnd}
        @ag-ui-tool-call-error=${this._handleToolCallError}
      ></ag-ui-agent>

      <main part="container" class="chat-container" aria-label="Chat application">
        <slot name="header"></slot>

        <chat-messages
          .messages=${this._messages}
          .loading=${this._loading}
        >
        </chat-messages>

        <chat-input
          @send=${this._handleSend}
          ?disabled=${this._isRunning}
          label="Type your message"
        ></chat-input>
      </main>

      <toast-manager
        .toasts=${this._toasts}
        position="bottom-right"
        @toast-close=${this._handleToastClose}
      ></toast-manager>
    `;
	}

	static styles = [
		chatTokens,
		css`
    :host {
      display: block;
      height: 100%;
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: var(--chat-container-max-width);
      margin: 0 auto;
      background: var(--chat-surface-primary);
    }

    .tool-calls {
      display: flex;
      flex-direction: column;
      gap: var(--chat-spacing-sm);
      padding: var(--chat-spacing-md) var(--chat-spacing-lg);
      border-top: 1px solid var(--chat-border-secondary);
    }
  `,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"chat-app": ChatApp;
	}
}
