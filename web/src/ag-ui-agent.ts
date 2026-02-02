import { type AgentSubscriber, HttpAgent } from "@ag-ui/client";
import type { Message, UserMessage } from "@ag-ui/core";
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type {
	AgUiMessagesChangedEvent,
	AgUiRunFailedEvent,
	AgUiRunFinalizedEvent,
	AgUiRunStartedEvent,
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

	get isRunning(): boolean {
		return this._agent?.isRunning ?? false;
	}

	get messages(): Message[] {
		return this._agent?.messages ?? [];
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
				tools: [],
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
