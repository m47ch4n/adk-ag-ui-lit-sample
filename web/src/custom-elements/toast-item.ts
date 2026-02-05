import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { chatTokens } from "../styles/tokens.js";

export type ToastType = "info" | "error" | "warning" | "success";

@customElement("toast-item")
export class ToastItem extends LitElement {
	@property({ type: String })
	message = "";

	@property({ type: String })
	type: ToastType = "info";

	@property({ type: Number })
	duration = 5000;

	@property({ type: Boolean, attribute: "no-auto-dismiss" })
	noAutoDismiss = false;

	private _timerId: number | null = null;
	private _remainingTime = 0;
	private _pausedAt: number | null = null;

	connectedCallback() {
		super.connectedCallback();
		if (!this.noAutoDismiss && this.duration > 0) {
			this._remainingTime = this.duration;
			this._startTimer();
		}
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._clearTimer();
	}

	private _startTimer() {
		if (this._remainingTime <= 0) return;
		this._timerId = window.setTimeout(() => {
			this._dispatchClose();
		}, this._remainingTime);
		this._pausedAt = null;
	}

	private _clearTimer() {
		if (this._timerId !== null) {
			clearTimeout(this._timerId);
			this._timerId = null;
		}
	}

	private _pauseTimer() {
		if (this._timerId === null || this.noAutoDismiss) return;
		this._clearTimer();
		this._pausedAt = Date.now();
	}

	private _resumeTimer() {
		if (this._pausedAt === null || this.noAutoDismiss) return;
		this._remainingTime = Math.max(
			0,
			this._remainingTime - (Date.now() - this._pausedAt),
		);
		this._pausedAt = null;
		if (this._remainingTime > 0) {
			this._startTimer();
		} else {
			this._dispatchClose();
		}
	}

	private _handleMouseEnter() {
		this._pauseTimer();
	}

	private _handleMouseLeave() {
		this._resumeTimer();
	}

	private _handleFocus() {
		this._pauseTimer();
	}

	private _handleBlur() {
		this._resumeTimer();
	}

	private _dispatchClose() {
		this._clearTimer();
		this.dispatchEvent(
			new CustomEvent("close", { bubbles: true, composed: true }),
		);
	}

	private _getIcon(): string {
		switch (this.type) {
			case "error":
				return "⚠️";
			case "warning":
				return "⚡";
			case "success":
				return "✓";
			case "info":
				return "ℹ️";
			default:
				return "❔️";
		}
	}

	render() {
		return html`
			<div
				class="toast ${this.type}"
				@mouseenter=${this._handleMouseEnter}
				@mouseleave=${this._handleMouseLeave}
				@focusin=${this._handleFocus}
				@focusout=${this._handleBlur}
			>
				<span class="icon" aria-hidden="true">${this._getIcon()}</span>
				<p class="message">${this.message}</p>
				<button
					class="close-button"
					aria-label="Close this notification"
					@click=${this._dispatchClose}
				>
					<span aria-hidden="true">×</span>
				</button>
			</div>
		`;
	}

	static styles = [
		chatTokens,
		css`
			:host {
				display: block;
			}

			.toast {
				display: flex;
				align-items: flex-start;
				gap: var(--chat-spacing-sm);
				padding: var(--chat-spacing-md) var(--chat-spacing-lg);
				border-radius: var(--chat-radius-md);
				font-size: var(--chat-font-size-sm);
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
				animation: slide-in 0.2s ease-out;

				&.info {
					background: var(--chat-surface-secondary, #f0f4f8);
					border: 1px solid var(--chat-border-color, #d0d7de);
					color: var(--chat-text-primary, #1f2328);
				}

				&.error {
					background: var(--chat-error-bg, #ffebe9);
					border: 1px solid var(--chat-error-border, #ff8182);
					color: var(--chat-error-text, #cf222e);
				}

				&.warning {
					background: #fff8c5;
					border: 1px solid #d4a72c;
					color: #9a6700;
				}

				&.success {
					background: #dafbe1;
					border: 1px solid #4ac26b;
					color: #1a7f37;
				}
			}

			@keyframes slide-in {
				from {
					opacity: 0;
					transform: translateY(-8px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}

			.icon {
				flex-shrink: 0;
				font-size: var(--chat-font-size-lg);
				line-height: 1;
			}

			.message {
				flex: 1;
				margin: 0;
				line-height: 1.4;
				padding-top: 2px;
			}

			.close-button {
				flex-shrink: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				width: 24px;
				height: 24px;
				padding: 0;
				border: none;
				border-radius: var(--chat-radius-sm);
				background: transparent;
				color: inherit;
				font-size: 18px;
				line-height: 1;
				cursor: pointer;
				opacity: 0.7;
				transition: opacity 0.15s, background 0.15s;

				&:hover {
					opacity: 1;
					background: rgba(0, 0, 0, 0.1);
				}

				&:focus-visible {
					outline: 2px solid currentColor;
					outline-offset: 2px;
				}
			}
		`,
	];
}

declare global {
	interface HTMLElementTagNameMap {
		"toast-item": ToastItem;
	}
}
