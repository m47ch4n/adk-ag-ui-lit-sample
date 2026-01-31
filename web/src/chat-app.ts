import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { AgUiController } from "./ag-ui-controller.js";
import { chatTokens } from "./styles/tokens.js";
import "./chat-messages.js";
import "./chat-input.js";

@customElement("chat-app")
export class ChatApp extends LitElement {
	private agentController = new AgUiController(this);

	private handleSend(e: CustomEvent<{ message: string }>) {
		this.agentController.sendMessage(e.detail.message);
	}

	render() {
		return html`
      <div part="container" class="chat-container">
        <slot name="header"></slot>

        <chat-messages
          .messages=${this.agentController.messages}
          .loading=${this.agentController.isRunning}
          .streaming=${this.agentController.isRunning}
          .error=${this.agentController.error}
        >
          <slot name="messages-header" slot="header"></slot>
          <slot name="messages-empty" slot="empty"></slot>
          <slot name="messages-footer" slot="footer"></slot>
        </chat-messages>

        <chat-input
          @send=${this.handleSend}
          ?disabled=${this.agentController.isRunning}
        ></chat-input>
      </div>
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
