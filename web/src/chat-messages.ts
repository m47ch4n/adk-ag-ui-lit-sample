import type { Message } from "@ag-ui/core";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { chatTokens } from "./styles/tokens.js";
import "./chat-message.js";

@customElement("chat-messages")
export class ChatMessages extends LitElement {
	@property({ type: Array })
	messages: Message[] = [];

	@property({ type: Boolean })
	loading = false;

	@property({ type: Boolean })
	streaming = false;

	@property({ type: String })
	error: string | null = null;

	updated() {
		this.scrollToBottom();
	}

	private scrollToBottom() {
		const container = this.shadowRoot?.querySelector(".messages");
		if (container) {
			container.scrollTop = container.scrollHeight;
		}
	}

	private getContentText(content: Message["content"]): string {
		if (typeof content === "string") return content;
		if (Array.isArray(content)) {
			return content
				.filter((part) => part.type === "text")
				.map((part) => (part as { type: "text"; text: string }).text)
				.join("");
		}
		return "";
	}

	render() {
		return html`
      <div part="messages-container" class="messages">
        <slot name="header"></slot>

        ${
					this.messages.length === 0
						? html`
              <div part="empty-state" class="empty-state">
                <slot name="empty">
                  <div class="empty-icon">💬</div>
                  <p>Start a conversation</p>
                </slot>
              </div>
            `
						: this.messages.map(
								(msg, index) => html`
                <chat-message
                  .role=${msg.role as "user" | "assistant"}
                  .content=${this.getContentText(msg.content)}
                  .streaming=${this.streaming && msg.role === "assistant" && index === this.messages.length - 1}
                ></chat-message>
              `,
							)
				}

        ${
					this.loading
						? html`<chat-message role="assistant" loading></chat-message>`
						: null
				}

        ${
					this.error
						? html`
              <div part="error" class="error">
                <slot name="error">
                  <span class="error-icon">⚠️</span>
                  ${this.error}
                </slot>
              </div>
            `
						: null
				}

        <slot name="footer"></slot>
      </div>
    `;
	}

	static styles = [
		chatTokens,
		css`
    :host {
      display: block;
      flex: 1;
      min-height: 0;
    }

    .messages {
      height: 100%;
      overflow-y: auto;
      padding: var(--chat-spacing-2xl) var(--chat-spacing-xl);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: var(--chat-spacing-xl);
    }

    .messages::-webkit-scrollbar {
      width: 4px;
    }

    .messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages::-webkit-scrollbar-thumb {
      background: var(--chat-scrollbar-thumb);
      border-radius: 2px;
    }

    .messages::-webkit-scrollbar-thumb:hover {
      background: var(--chat-scrollbar-thumb-hover);
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--chat-empty-text);
      gap: var(--chat-spacing-md);
    }

    .empty-icon {
      font-size: 2rem;
      opacity: 0.4;
    }

    .empty-state p {
      margin: 0;
      font-size: var(--chat-font-size-sm);
      font-weight: 400;
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--chat-spacing-sm);
      padding: var(--chat-spacing-md) var(--chat-spacing-lg);
      background: var(--chat-error-bg);
      border: 1px solid var(--chat-error-border);
      border-radius: var(--chat-radius-md);
      color: var(--chat-error-text);
      font-size: var(--chat-font-size-sm);
    }

    .error-icon {
      font-size: var(--chat-font-size-lg);
    }
  `,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"chat-messages": ChatMessages;
	}
}
