import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { chatTokens } from "../styles/tokens.js";
import type { ToastType } from "./toast-item.js";
import "./toast-item.js";

export interface ToastData {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
	noAutoDismiss?: boolean;
}

@customElement("toast-manager")
export class ToastManager extends LitElement {
	@property({ type: Array })
	toasts: ToastData[] = [];

	@property({ type: String })
	position: "top-right" | "top-left" | "bottom-right" | "bottom-left" =
		"bottom-right";

	private _handleClose(id: string) {
		this.dispatchEvent(
			new CustomEvent("toast-close", {
				detail: { id },
				bubbles: true,
				composed: true,
			}),
		);
	}

	render() {
		const isBottom = this.position.startsWith("bottom");

		return html`
			<div
				class="toast-container ${this.position}"
				role="region"
				aria-label="Notifications"
			>
				<!--
					aria-live container exists from page load.
					Only the inner content changes dynamically.
				-->
				<div
					class="toast-live-region"
					aria-live=${this._hasErrors() ? "assertive" : "polite"}
					aria-atomic="false"
					aria-relevant="additions"
				>
					${repeat(
						isBottom ? [...this.toasts].reverse() : this.toasts,
						(toast) => toast.id,
						(toast) => html`
							<toast-item
								.message=${toast.message}
								.type=${toast.type}
								.duration=${toast.duration ?? 5000}
								?no-auto-dismiss=${toast.noAutoDismiss}
								@close=${() => this._handleClose(toast.id)}
							></toast-item>
						`,
					)}
				</div>
			</div>
		`;
	}

	private _hasErrors(): boolean {
		return this.toasts.some((t) => t.type === "error");
	}

	static styles = [
		chatTokens,
		css`
			:host {
				display: block;
				position: fixed;
				z-index: 9999;
				pointer-events: none;
			}

			.toast-container {
				display: flex;
				flex-direction: column;
				gap: var(--chat-spacing-sm);
				max-width: 400px;
				padding: var(--chat-spacing-lg);
			}

			.toast-container.top-right {
				position: fixed;
				top: 0;
				right: 0;
			}

			.toast-container.top-left {
				position: fixed;
				top: 0;
				left: 0;
			}

			.toast-container.bottom-right {
				position: fixed;
				bottom: 0;
				right: 0;
			}

			.toast-container.bottom-left {
				position: fixed;
				bottom: 0;
				left: 0;
			}

			.toast-live-region {
				display: flex;
				flex-direction: column;
				gap: var(--chat-spacing-sm);
			}

			toast-item {
				pointer-events: auto;
			}
		`,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"toast-manager": ToastManager;
	}
}
