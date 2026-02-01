import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { chatMessageBaseStyles } from "../styles/chat-message-base.js";
import { chatTokens } from "../styles/tokens.js";
import type { MessagePosition, MessageVariant } from "../types.js";
import "./markdown-content.js";

@customElement("chat-message")
export class ChatMessage extends LitElement {
	@property({ type: String })
	position: MessagePosition = "left";

	@property({ type: String })
	variant: MessageVariant = "secondary";

	@property({ type: String })
	avatar = "";

	@property({ type: String })
	content = "";

	render() {
		return html`
      <article part="message" class="message ${this.position} ${this.variant}"
               aria-label="${this.position === "right" ? "Your message" : "Assistant message"}">
        <div part="avatar" class="avatar" aria-hidden="true">
          <slot name="avatar">${this.avatar}</slot>
        </div>
        <div part="bubble" class="bubble">
          <slot>
            <markdown-content .content=${this.content}></markdown-content>
          </slot>
        </div>
      </article>
    `;
	}

	static styles = [chatTokens, chatMessageBaseStyles];
}

declare global {
	interface HTMLElementTagNameMap {
		"chat-message": ChatMessage;
	}
}
