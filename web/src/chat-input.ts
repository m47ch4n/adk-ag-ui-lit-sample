import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { chatTokens } from "./styles/tokens.js";

@customElement("chat-input")
export class ChatInput extends LitElement {
	@property({ type: Boolean })
	disabled = false;

	@property({ type: String })
	placeholder = "Type a message...";

	@state()
	private value = "";

	@state()
	private isComposing = false;

	private handleSubmit(e: Event) {
		e.preventDefault();
		if (this.value.trim() && !this.disabled) {
			this.dispatchEvent(
				new CustomEvent("send", {
					detail: { message: this.value },
					bubbles: true,
					composed: true,
				}),
			);
			this.value = "";
		}
	}

	private handleInput(e: Event) {
		this.value = (e.target as HTMLTextAreaElement).value;
	}

	private handleCompositionStart() {
		this.isComposing = true;
	}

	private handleCompositionEnd() {
		// Defer flag reset to handle Safari where compositionend fires before keydown.
		setTimeout(() => {
			this.isComposing = false;
		}, 100);
	}

	private handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey && !this.isComposing) {
			e.preventDefault();
			this.handleSubmit(e);
		}
	}

	render() {
		return html`
      <form part="form" class="input-form" @submit=${this.handleSubmit}>
        <slot name="prefix"></slot>
        <div part="input-wrapper" class="input-wrapper">
          <textarea
            part="input"
            rows="2"
            .value=${this.value}
            @input=${this.handleInput}
            @keydown=${this.handleKeyDown}
            @compositionstart=${this.handleCompositionStart}
            @compositionend=${this.handleCompositionEnd}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
          ></textarea>
        </div>
        <slot name="suffix">
          <button part="send-button" type="submit" ?disabled=${this.disabled || !this.value.trim()}>
            <slot name="send-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </slot>
          </button>
        </slot>
      </form>
    `;
	}

	static styles = [
		chatTokens,
		css`
    :host {
      display: block;
    }

    .input-form {
      display: flex;
      gap: var(--chat-spacing-md);
      padding: var(--chat-spacing-lg) var(--chat-spacing-xl) var(--chat-spacing-xl);
      background: var(--chat-surface-primary);
      border-top: 1px solid var(--chat-border-secondary);
      align-items: center;
    }

    .input-wrapper {
      flex: 1;
      position: relative;
    }

    textarea {
      width: 100%;
      padding: var(--chat-spacing-md) var(--chat-spacing-lg);
      border: 1px solid var(--chat-input-border);
      border-radius: var(--chat-radius-lg);
      background: var(--chat-input-bg);
      color: var(--chat-input-text);
      font-size: var(--chat-font-size-base);
      font-family: var(--chat-font-family);
      line-height: var(--chat-line-height-normal);
      resize: none;
      min-height: 1.5rem;
      max-height: 150px;
      box-sizing: border-box;
      transition: border-color 0.2s, background 0.2s;
    }

    textarea::placeholder {
      color: var(--chat-input-placeholder);
    }

    textarea:focus {
      outline: none;
      border-color: var(--chat-input-border-focus);
      background: var(--chat-input-bg-focus);
    }

    textarea:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button {
      width: 2.5rem;
      height: 2.5rem;
      padding: 0;
      background: var(--chat-button-bg);
      color: var(--chat-button-text);
      border: none;
      border-radius: var(--chat-radius-full);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
      flex-shrink: 0;
    }

    button:hover:not(:disabled) {
      opacity: 0.8;
    }

    button:active:not(:disabled) {
      opacity: 0.7;
    }

    button:disabled {
      background: var(--chat-button-disabled-bg);
      color: var(--chat-button-disabled-text);
      cursor: not-allowed;
    }

    button svg {
      width: 1.125rem;
      height: 1.125rem;
    }
  `,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"chat-input": ChatInput;
	}
}
