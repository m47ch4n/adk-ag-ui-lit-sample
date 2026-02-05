import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { chatTokens } from "../styles/tokens.js";
import type { ChatLoadingData, ChatMessageData } from "../types/index.js";
import "./chat-message.js";
import "./chat-loading-message.js";

@customElement("chat-messages")
export class ChatMessages extends LitElement {
	@property({ type: Array })
	messages: ChatMessageData[] = [];

	@property({ type: Object })
	loading: ChatLoadingData | null = null;

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
      <section part="messages-container" class="messages"
               role="log"
               aria-label="Chat messages"
               aria-live="polite"
               aria-relevant="additions">
        <slot name="header"></slot>

        ${
					this.messages.length === 0
						? html`
              <div part="empty-state" class="empty-state" role="status">
                <slot name="empty">
                  <div class="empty-icon" aria-hidden="true">💬</div>
                  <p>Start a conversation</p>
                </slot>
              </div>
            `
						: html`
              <ul class="message-list" role="list">
                ${repeat(
									this.messages,
									(msg) => msg.id,
									(msg) => html`
                    <li>
                      <chat-message
                        .position=${msg.position}
                        .variant=${msg.variant}
                        .avatar=${msg.avatar}
                        .content=${msg.content}
                      ></chat-message>
                    </li>
                  `,
								)}
              </ul>
            `
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

        <slot name="footer"></slot>
      </section>
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

				&::-webkit-scrollbar {
					width: 4px;
				}

				&::-webkit-scrollbar-track {
					background: transparent;
				}

				&::-webkit-scrollbar-thumb {
					background: var(--chat-scrollbar-thumb);
					border-radius: 2px;

					&:hover {
						background: var(--chat-scrollbar-thumb-hover);
					}
				}
			}

			.empty-state {
				flex: 1;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				color: var(--chat-empty-text);
				gap: var(--chat-spacing-md);

				& p {
					margin: 0;
					font-size: var(--chat-font-size-sm);
					font-weight: 400;
				}
			}

			.empty-icon {
				font-size: 2rem;
				opacity: 0.4;
			}

			.message-list {
				list-style: none;
				margin: 0;
				padding: 0;
				display: flex;
				flex-direction: column;
				gap: var(--chat-spacing-xl);

				& li {
					display: block;
				}
			}
		`,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"chat-messages": ChatMessages;
	}
}
