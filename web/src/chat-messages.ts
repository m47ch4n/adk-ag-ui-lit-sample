import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { chatTokens } from "./styles/tokens.js";
import type { ChatLoadingData, ChatMessageData } from "./types.js";
import "./chat-message.js";
import "./chat-loading-message.js";

@customElement("chat-messages")
export class ChatMessages extends LitElement {
	@property({ type: Array })
	messages: ChatMessageData[] = [];

	@property({ type: Object })
	loading: ChatLoadingData | null = null;

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
						: repeat(
								this.messages,
								(msg) => msg.id,
								(msg) => html`
                  <chat-message
                    .position=${msg.position}
                    .variant=${msg.variant}
                    .avatar=${msg.avatar}
                    .content=${msg.content}
                  ></chat-message>
                `,
							)
				}

        ${
					this.loading
						? html`
                <chat-loading-message
                  .position=${this.loading.position}
                  .variant=${this.loading.variant}
                  .avatar=${this.loading.avatar}
                ></chat-loading-message>
              `
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
