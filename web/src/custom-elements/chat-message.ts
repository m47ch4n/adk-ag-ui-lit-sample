import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { chatMessageBaseStyles } from "../styles/chat-message-base.js";
import { chatTokens } from "../styles/tokens.js";
import type { MessagePosition, MessageVariant } from "../types/index.js";
import "./markdown-content.js";

@customElement("chat-message")
export class ChatMessage extends LitElement {
  @property({ type: String, reflect: true })
  position: MessagePosition = "left";

  @property({ type: String })
  variant: MessageVariant = "secondary";

  @property({ type: String })
  content = "";

  @property({ type: String })
  reasoning?: string;

  render() {
    return html`
      <article
        part="message"
        class="message ${this.position} ${this.variant}"
        aria-label="${this.position === "right"
          ? "Your message"
          : "Assistant message"}"
      >
        <div part="bubble" class="bubble">
          ${this.reasoning
            ? html`
                <details class="reasoning">
                  <summary>Thought for a moment</summary>
                  <div class="reasoning-content">${this.reasoning}</div>
                </details>
              `
            : nothing}
          <slot>
            <markdown-content .content=${this.content}></markdown-content>
          </slot>
        </div>
      </article>
    `;
  }

  static styles = [
    chatTokens,
    chatMessageBaseStyles,
    css`
      .reasoning {
        font-size: var(--chat-font-size-sm);
        margin-bottom: var(--chat-spacing-sm);

        & summary {
          cursor: pointer;
          color: var(--chat-text-muted);
          font-style: italic;
          user-select: none;
        }
      }

      .reasoning-content {
        margin-top: var(--chat-spacing-sm);
        padding: var(--chat-spacing-sm) var(--chat-spacing-md);
        border-left: 2px solid var(--chat-border-secondary);
        color: var(--chat-text-muted);
        white-space: pre-wrap;
        max-height: 300px;
        overflow-y: auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-message": ChatMessage;
  }
}
