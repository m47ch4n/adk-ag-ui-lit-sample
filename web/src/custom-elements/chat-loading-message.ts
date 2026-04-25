import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { a11yStyles } from "../styles/a11y.js";
import { chatMessageBaseStyles } from "../styles/chat-message-base.js";
import { chatTokens } from "../styles/tokens.js";
import type { MessagePosition, MessageVariant } from "../types/index.js";

@customElement("chat-loading-message")
export class ChatLoadingMessage extends LitElement {
  @property({ type: String })
  position: MessagePosition = "left";

  @property({ type: String })
  variant: MessageVariant = "secondary";

  @property({ type: String })
  avatar = "";

  @property({ type: String })
  reasoning?: string;

  render() {
    return html`
      <div
        part="message"
        class="message ${this.position} ${this.variant}"
        role="status"
        aria-label=${this.reasoning ? "Assistant is thinking" : "Assistant is typing"}
      >
        <div part="avatar" class="avatar" aria-hidden="true">
          <slot name="avatar">${this.avatar}</slot>
        </div>
        <div part="bubble" class="bubble">
          ${this.reasoning
            ? html`
                <details class="reasoning" open>
                  <summary>Thinking...</summary>
                  <div class="reasoning-content">${this.reasoning}</div>
                </details>
              `
            : html` <span class="visually-hidden">Loading response</span> `}
        </div>
      </div>
    `;
  }

  static styles = [
    chatTokens,
    chatMessageBaseStyles,
    a11yStyles,
    css`
      .bubble:not(:has(.reasoning)) {
        color: var(--chat-text-muted);

        &::after {
          content: "";
          display: inline-block;
          animation: dots 1.4s infinite;
        }
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

      .reasoning {
        font-size: var(--chat-font-size-sm);

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
        max-height: 200px;
        overflow-y: auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-loading-message": ChatLoadingMessage;
  }
}
