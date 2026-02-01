import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { chatMessageBaseStyles } from "./styles/chat-message-base.js";
import { chatTokens } from "./styles/tokens.js";
import type { MessagePosition, MessageVariant } from "./types.js";

@customElement("chat-loading-message")
export class ChatLoadingMessage extends LitElement {
	@property({ type: String })
	position: MessagePosition = "left";

	@property({ type: String })
	variant: MessageVariant = "secondary";

	@property({ type: String })
	avatar = "";

	render() {
		return html`
      <div part="message" class="message ${this.position} ${this.variant}">
        <div part="avatar" class="avatar">
          <slot name="avatar">${this.avatar}</slot>
        </div>
        <div part="bubble" class="bubble"></div>
      </div>
    `;
	}

	static styles = [
		chatTokens,
		chatMessageBaseStyles,
		css`
      .bubble {
        color: var(--chat-text-muted);
      }

      .bubble::after {
        content: "";
        display: inline-block;
        animation: dots 1.4s infinite;
      }

      @keyframes dots {
        0%,
        20% {
          content: ".";
        }
        40% {
          content: "..";
        }
        60%,
        100% {
          content: "...";
        }
      }
    `,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"chat-loading-message": ChatLoadingMessage;
	}
}
