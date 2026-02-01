import { type AgentSubscriber, HttpAgent } from "@ag-ui/client";
import type { Message, UserMessage } from "@ag-ui/core";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { ChatLoadingData, ChatMessageData } from "./types.js";

type DisplayableRole = "user" | "assistant";

export class AgUiController implements ReactiveController {
	private host: ReactiveControllerHost;

	private agent: HttpAgent;
	private unsubscribe: (() => void) | null = null;

	error: string | null = null;

	get isRunning(): boolean {
		return this.agent.isRunning;
	}

	get messages(): ChatMessageData[] {
		return this.agent.messages
			.filter(
				(msg): msg is Message & { role: DisplayableRole } =>
					msg.role === "user" || msg.role === "assistant",
			)
			.map((msg) => ({
				id: msg.id,
				position: msg.role === "user" ? "right" : "left",
				variant: msg.role === "user" ? "primary" : "secondary",
				avatar: msg.role === "user" ? "U" : "A",
				content: this.getContentText(msg.content),
			}));
	}

	get loading(): ChatLoadingData | null {
		if (!this.isRunning) return null;

		const lastMessage = this.agent.messages.at(-1);
		if (
			lastMessage?.role === "assistant" &&
			this.getContentText(lastMessage.content)
		) {
			return null;
		}

		return {
			position: "left",
			variant: "secondary",
			avatar: "A",
		};
	}

	private getContentText(content: Message["content"]): string {
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
			onMessagesChanged: (_) => {
				this.host.requestUpdate();
			},
			onRunFailed: ({ error }) => {
				console.error("Subscriber Error:", error);
				this.error = "Stream error occurred";
				this.host.requestUpdate();
			},
			onRunFinalized: () => {
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
		this.error = null;

		const userMessage: UserMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: content,
		};
		this.agent.addMessage(userMessage);
		this.host.requestUpdate();

		try {
			await this.agent.runAgent({
				tools: [],
				context: [],
			});
		} catch (e) {
			console.error("Error:", e);
			this.error = e instanceof Error ? e.message : "Unknown error";
			this.host.requestUpdate();
		}
	}
}
