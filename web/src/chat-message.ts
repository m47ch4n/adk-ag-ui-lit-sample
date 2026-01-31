import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { chatTokens } from "./styles/tokens.js";
import "./markdown-content.ts";

export type MessageRole = "user" | "assistant";

@customElement("chat-message")
export class ChatMessage extends LitElement {
	@property({ type: String })
	role: MessageRole = "user";

	@property({ type: String })
	content = "";

	@property({ type: Boolean })
	loading = false;

	@property({ type: Boolean })
	streaming = false;

	render() {
		return html`
      <div part="message message-${this.role}" class="message ${this.role} ${this.loading ? "loading" : ""}">
        <div part="avatar avatar-${this.role}" class="avatar">
          <slot name="avatar">
            ${this.role === "user" ? "U" : "A"}
          </slot>
        </div>
        <div part="bubble bubble-${this.role}" class="bubble">
          <slot>
            <markdown-content
              .content=${this.content}
              .streaming=${this.streaming}
            >
            </markdown-content>
          </slot>
        </div>
      </div>
    `;
	}

	static styles = [
		chatTokens,
		css`
    :host {
      display: block;
    }

    .message {
      display: flex;
      gap: var(--chat-spacing-md);
      align-items: flex-start;
      max-width: var(--chat-message-max-width);
    }

    .message.user {
      flex-direction: row-reverse;
      margin-left: auto;
    }

    .message.assistant {
      margin-right: auto;
    }

    .avatar {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: var(--chat-radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--chat-font-size-xs);
      font-weight: 500;
      flex-shrink: 0;
    }

    .message.user .avatar {
      background: var(--chat-avatar-user-bg);
      color: var(--chat-avatar-user-text);
    }

    .message.assistant .avatar {
      background: var(--chat-avatar-assistant-bg);
      color: var(--chat-avatar-assistant-text);
      border: 1px solid var(--chat-avatar-assistant-border);
    }

    .bubble {
      padding: var(--chat-spacing-md) var(--chat-spacing-lg);
      border-radius: var(--chat-radius-lg);
      line-height: var(--chat-line-height-normal);
      word-break: break-word;
      font-size: var(--chat-font-size-base);
    }

    .message.user .bubble {
      background: var(--chat-bubble-user-bg);
      color: var(--chat-bubble-user-text);
      border-top-right-radius: var(--chat-radius-sm);
    }

    .message.assistant .bubble {
      background: var(--chat-bubble-assistant-bg);
      color: var(--chat-bubble-assistant-text);
      border-top-left-radius: var(--chat-radius-sm);
    }

    .message.loading .bubble {
      color: var(--chat-text-muted);
    }

    .message.loading .bubble::after {
      content: '';
      display: inline-block;
      animation: dots 1.4s infinite;
    }

    @keyframes dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }
  `,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"chat-message": ChatMessage;
	}
}
