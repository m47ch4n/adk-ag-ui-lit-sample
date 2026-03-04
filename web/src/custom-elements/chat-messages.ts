import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
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

  private _prevMessageCount = 0;

  firstUpdated() {
    this._prevMessageCount = this.messages.length;
  }

  updated() {
    const newCount = this.messages.length;
    if (
      newCount > this._prevMessageCount &&
      this.messages[newCount - 1]?.position === "right"
    ) {
      const turns = this.shadowRoot?.querySelectorAll(".turn");
      turns?.[turns.length - 1]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    this._prevMessageCount = newCount;
  }

  private _groupIntoTurns() {
    const turns: { id: string; messages: ChatMessageData[] }[] = [];
    let current: ChatMessageData[] = [];

    for (const msg of this.messages) {
      if (msg.position === "right") {
        if (current.length > 0) {
          turns.push({ id: current[0].id, messages: current });
        }
        current = [msg];
      } else {
        current.push(msg);
      }
    }
    if (current.length > 0) {
      turns.push({ id: current[0].id, messages: current });
    }
    return turns;
  }

  render() {
    const turns = this._groupIntoTurns();

    return html`
      <section
        part="messages-container"
        class="messages"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        <slot name="header"></slot>

        ${turns.length === 0
          ? html`
              <div part="empty-state" class="empty-state" role="status">
                <slot name="empty">
                  <div class="empty-icon" aria-hidden="true">💬</div>
                  <p>Start a conversation</p>
                </slot>
              </div>
            `
          : turns.map(
              (turn, i) => html`
                <div class="turn">
                  ${turn.messages.map(
                    (msg) => html`
                      <chat-message
                        .position=${msg.position}
                        .variant=${msg.variant}
                        .avatar=${msg.avatar}
                        .content=${msg.content}
                        .reasoning=${msg.reasoning}
                      ></chat-message>
                    `,
                  )}
                  ${i === turns.length - 1 && this.loading
                    ? html`
                        <chat-loading-message
                          .position=${this.loading.position}
                          .variant=${this.loading.variant}
                          .avatar=${this.loading.avatar}
                          .reasoning=${this.loading.reasoning}
                        ></chat-loading-message>
                      `
                    : null}
                </div>
              `,
            )}

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
        scroll-padding-top: var(--chat-spacing-2xl);
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

      .turn {
        display: flex;
        flex-direction: column;
        gap: var(--chat-spacing-xl);

        &:last-of-type:not(:first-of-type) {
          flex: 1 0 100%;
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
