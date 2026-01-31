import { type AgentSubscriber, HttpAgent } from "@ag-ui/client";
import type { Message, UserMessage } from "@ag-ui/core";
import type { ReactiveController, ReactiveControllerHost } from "lit";

export class AgUiController implements ReactiveController {
	host: ReactiveControllerHost;

	private agent: HttpAgent;
	private unsubscribe: (() => void) | null = null;

	messages: Message[] = [];
	isRunning = false;
	error: string | null = null;

	constructor(host: ReactiveControllerHost) {
		this.host = host;
		host.addController(this);

		this.agent = new HttpAgent({
			url: "/api/chat",
			threadId: crypto.randomUUID(),
		});
	}

	hostConnected() {
		if (this.unsubscribe) return;

		const subscriber: AgentSubscriber = {
			onMessagesChanged: ({ messages }) => {
				this.messages = messages;
				this.host.requestUpdate();
			},
			onRunFailed: ({ error }) => {
				console.error("Subscriber Error:", error);
				this.error = "Stream error occurred";
				this.isRunning = false;
				this.host.requestUpdate();
			},
			onRunFinalized: () => {
				this.isRunning = false;
				this.host.requestUpdate();
			},
		};

		const subscription = this.agent.subscribe(subscriber);
		this.unsubscribe = () => subscription.unsubscribe();
	}

	hostDisconnected() {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
	}

	async sendMessage(content: string) {
		if (!content.trim() || this.isRunning) return;

		this.isRunning = true;
		this.error = null;

		const userMessage: UserMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: content,
		};
		this.agent.addMessage(userMessage);

		this.messages = [...this.agent.messages];
		this.host.requestUpdate();

		try {
			await this.agent.runAgent({
				tools: [],
				context: [],
			});
		} catch (e) {
			console.error("Error:", e);
			this.error = e instanceof Error ? e.message : "Unknown error";
			this.isRunning = false;
			this.host.requestUpdate();
		}
	}
}
