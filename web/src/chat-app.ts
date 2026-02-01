import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { AgUiController } from "./ag-ui-controller.js";
import { chatTokens } from "./styles/tokens.js";
import "./custom-elements/chat-messages.js";
import "./custom-elements/chat-input.js";
import "./custom-elements/toast-manager.js";
import type { ToastData } from "./custom-elements/toast-manager.js";

@customElement("chat-app")
export class ChatApp extends LitElement {
	private agentController = new AgUiController(this);

	@state()
	private _toasts: ToastData[] = [];

	connectedCallback() {
		super.connectedCallback();
		this.addEventListener(
			"ag-ui-error",
			this._handleAgUiError as EventListener,
		);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this.removeEventListener(
			"ag-ui-error",
			this._handleAgUiError as EventListener,
		);
	}

	private _handleAgUiError = (e: CustomEvent<{ message: string }>) => {
		this._toasts = [
			...this._toasts,
			{
				id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				message: e.detail.message,
				type: "error",
				noAutoDismiss: true,
			},
		];
	};

	private handleSend(e: CustomEvent<{ message: string }>) {
		this.agentController.sendMessage(e.detail.message);
	}

	private _handleToastClose(e: CustomEvent<{ id: string }>) {
		this._toasts = this._toasts.filter((t) => t.id !== e.detail.id);
	}

	render() {
		return html`
      <main part="container" class="chat-container" aria-label="Chat application">
        <slot name="header"></slot>

        <chat-messages
          .messages=${this.agentController.messages}
          .loading=${this.agentController.loading}
        >
          <slot name="messages-header" slot="header"></slot>
          <slot name="messages-empty" slot="empty"></slot>
          <slot name="messages-footer" slot="footer"></slot>
        </chat-messages>

        <chat-input
          @send=${this.handleSend}
          ?disabled=${this.agentController.isRunning}
          label="Type your message"
        ></chat-input>
      </main>

      <toast-manager
        .toasts=${this._toasts}
        position="bottom-right"
        @toast-close=${this._handleToastClose}
      ></toast-manager>
    `;
	}

	static styles = [
		chatTokens,
		css`
    :host {
      display: block;
      height: 100%;
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: var(--chat-container-max-width);
      margin: 0 auto;
      background: var(--chat-surface-primary);
    }
  `,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"chat-app": ChatApp;
	}
}
