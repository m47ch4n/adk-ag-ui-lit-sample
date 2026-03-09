import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
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

  @state() private _expanded = false;
  @state() private _overflows = false;

  @query(".bubble-content")
  private _bubbleContent?: HTMLDivElement;

  willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("content")) {
      this._expanded = false;
    }
  }

  updated() {
    if (this.position === "right" && !this._expanded) {
      this._checkOverflow();
    }
  }

  private _checkOverflow() {
    if (!this._bubbleContent) return;
    const overflows =
      this._bubbleContent.scrollHeight > this._bubbleContent.clientHeight;
    if (overflows !== this._overflows) {
      this._overflows = overflows;
    }
  }

  private _toggleExpand() {
    this._expanded = !this._expanded;
  }

  render() {
    const isUserMessage = this.position === "right";
    const isCollapsed = isUserMessage && !this._expanded;

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
          <div class="bubble-content ${isCollapsed ? "collapsed" : ""}">
            <slot>
              <markdown-content .content=${this.content}></markdown-content>
            </slot>
          </div>
          ${isUserMessage && this._overflows
            ? html`
                <button
                  class="expand-toggle"
                  @click=${this._toggleExpand}
                  aria-expanded=${this._expanded}
                >
                  ${this._expanded ? "Show less" : "Show more"}
                </button>
              `
            : nothing}
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

      .bubble-content.collapsed {
        max-height: 7.5em; /* ~5 lines at 1.5 line-height */
        overflow: hidden;
        mask-image: linear-gradient(to bottom, #000 5em, transparent);
        -webkit-mask-image: linear-gradient(to bottom, #000 5em, transparent);
      }

      .expand-toggle {
        display: block;
        margin-top: var(--chat-spacing-xs, 4px);
        padding: 0;
        border: none;
        background: none;
        color: var(--chat-text-muted, #888);
        font-size: var(--chat-font-size-sm, 0.8125rem);
        cursor: pointer;
        text-align: right;
        width: 100%;

        &:hover {
          text-decoration: underline;
        }

        &:focus-visible {
          outline: 2px solid var(--chat-color-primary, #1976d2);
          outline-offset: 2px;
          border-radius: 2px;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "chat-message": ChatMessage;
  }
}
