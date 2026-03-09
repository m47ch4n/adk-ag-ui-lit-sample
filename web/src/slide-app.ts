import type { Message } from "@ag-ui/core";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import type { AgUiAgent } from "./ag-ui-agent.js";
import "./ag-ui-agent.js";
import "./custom-elements/chat-input.js";
import "./custom-elements/chat-messages.js";
import "./custom-elements/code-editor.js";
import "./custom-elements/slide-preview.js";
import "./custom-elements/toast-manager.js";
import type { ToastData } from "./custom-elements/toast-manager.js";
import { chatTokens } from "./styles/tokens.js";
import type {
  AgUiMessagesChangedEvent,
  AgUiReasoningContentEvent,
  AgUiReasoningEndEvent,
  AgUiRunFailedEvent,
  AgUiRunFinalizedEvent,
  AgUiRunStartedEvent,
  AgUiStateChangedEvent,
  ChatLoadingData,
  ChatMessageData,
} from "./types/index.js";

@customElement("slide-app")
export class SlideApp extends LitElement {
  @query("ag-ui-agent")
  private _agentElement!: AgUiAgent;

  // Chat state
  @state() private _messages: ChatMessageData[] = [];
  @state() private _loading: ChatLoadingData | null = null;
  @state() private _isRunning = false;
  @state() private _reasoningContent = "";
  @state() private _toasts: ToastData[] = [];

  // Slide state
  @state() private _slidesMarkdown = "";
  @state() private _slidesCss = "";
  @state() private _currentSlide = 0;

  // --- AG-UI Event Handlers ---

  private _handleMessagesChanged = (e: AgUiMessagesChangedEvent) => {
    this._messages = this._transformMessages(e.detail.messages);
    this._loading = this._computeLoading(e.detail.messages);
  };

  private _handleRunStarted = (_e: AgUiRunStartedEvent) => {
    this._isRunning = true;
    this._reasoningContent = "";
    this._loading = { position: "left", variant: "secondary" };
  };

  private _handleRunFailed = (e: AgUiRunFailedEvent) => {
    this._isRunning = false;
    this._loading = null;
    if (
      e.detail.error instanceof Error &&
      e.detail.error.name === "AbortError"
    )
      return;
    const message =
      e.detail.error instanceof Error
        ? e.detail.error.message
        : "Unknown error";
    this._addErrorToast(message);
  };

  private _handleRunFinalized = (_e: AgUiRunFinalizedEvent) => {
    this._isRunning = false;
    this._loading = null;
  };

  private _handleReasoningContent = (e: AgUiReasoningContentEvent) => {
    this._reasoningContent = e.detail.buffer;
  };

  private _handleReasoningEnd = (_e: AgUiReasoningEndEvent) => {
    // Keep for display; reset on next run start
  };

  private _handleStateChanged = (e: AgUiStateChangedEvent) => {
    const agentState = e.detail.state;
    if (typeof agentState.slides_markdown === "string") {
      this._slidesMarkdown = agentState.slides_markdown;
    }
    if (typeof agentState.slides_css === "string") {
      this._slidesCss = agentState.slides_css;
    }
  };

  // --- User Actions ---

  private _handleSend(e: CustomEvent<{ message: string }>) {
    // Sync current editor state to agent before sending
    this._agentElement.setState({
      slides_markdown: this._slidesMarkdown,
      slides_css: this._slidesCss,
    });
    this._agentElement.sendMessage(e.detail.message);
  }

  private _handleAbort() {
    this._agentElement.abort();
  }

  private _handleMarkdownChange(e: CustomEvent<{ value: string }>) {
    this._slidesMarkdown = e.detail.value;
  }

  private _handleCssChange(e: CustomEvent<{ value: string }>) {
    this._slidesCss = e.detail.value;
  }

  private _handleSlideChange(e: CustomEvent<{ index: number }>) {
    this._currentSlide = e.detail.index;
  }

  private _handleToastClose(e: CustomEvent<{ id: string }>) {
    this._toasts = this._toasts.filter((t) => t.id !== e.detail.id);
  }

  // --- Helpers ---

  private _transformMessages(messages: Message[]): ChatMessageData[] {
    const result: ChatMessageData[] = [];
    let pendingReasoning: string | undefined;
    for (const msg of messages) {
      if (msg.role === "reasoning") {
        pendingReasoning = this._getContentText(msg.content);
        continue;
      }
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      result.push({
        id: msg.id,
        position: msg.role === "user" ? "right" : "left",
        variant: msg.role === "user" ? "primary" : "secondary",
        content: this._getContentText(msg.content),
        reasoning: msg.role === "assistant" ? pendingReasoning : undefined,
      });
      pendingReasoning = undefined;
    }
    return result;
  }

  private _getContentText(content: Message["content"]): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join("");
    }
    return "";
  }

  private _computeLoading(messages: Message[]): ChatLoadingData | null {
    if (!this._isRunning) return null;
    const lastMessage = messages.at(-1);
    if (
      lastMessage?.role === "assistant" &&
      this._getContentText(lastMessage.content)
    ) {
      return null;
    }
    return {
      position: "left",
      variant: "secondary",
      reasoning: this._reasoningContent || undefined,
    };
  }

  private _addErrorToast(message: string) {
    this._toasts = [
      ...this._toasts,
      {
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        message,
        type: "error",
        noAutoDismiss: true,
      },
    ];
  }

  // --- Render ---

  render() {
    return html`
      <ag-ui-agent
        @ag-ui-messages-changed=${this._handleMessagesChanged}
        @ag-ui-run-started=${this._handleRunStarted}
        @ag-ui-run-failed=${this._handleRunFailed}
        @ag-ui-run-finalized=${this._handleRunFinalized}
        @ag-ui-reasoning-content=${this._handleReasoningContent}
        @ag-ui-reasoning-end=${this._handleReasoningEnd}
        @ag-ui-state-changed=${this._handleStateChanged}
      ></ag-ui-agent>

      <main class="app-layout" aria-label="LT Slide Creator">
        <!-- Left: Chat Panel -->
        <section class="chat-panel" aria-label="Chat">
          <chat-messages
            .messages=${this._messages}
            .loading=${this._loading}
          ></chat-messages>

          <chat-input
            @send=${this._handleSend}
            ?disabled=${this._isRunning}
            label="Describe your LT slides..."
          >
            ${this._isRunning
              ? html`
                  <button
                    slot="suffix"
                    class="stop-button"
                    @click=${this._handleAbort}
                    aria-label="Stop generating"
                    type="button"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                `
              : nothing}
          </chat-input>
        </section>

        <!-- Right: Slide Area -->
        <section class="slide-area" aria-label="Slides">
          <slide-preview
            .markdown=${this._slidesMarkdown}
            .customCss=${this._slidesCss}
            .currentSlide=${this._currentSlide}
            @slide-change=${this._handleSlideChange}
          ></slide-preview>

          <div class="editors-panel">
            <code-editor
              .value=${this._slidesMarkdown}
              language="markdown"
              label="Marp Markdown"
              @value-changed=${this._handleMarkdownChange}
            ></code-editor>

            <code-editor
              .value=${this._slidesCss}
              language="css"
              label="Custom CSS"
              @value-changed=${this._handleCssChange}
            ></code-editor>
          </div>
        </section>
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

      .app-layout {
        display: grid;
        grid-template-columns: 380px 1fr;
        height: 100%;
        overflow: hidden;
      }

      /* Left: Chat Panel */
      .chat-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        border-right: 1px solid var(--chat-border-secondary, #e0e0e0);
        background: var(--chat-surface-primary, #fff);
      }

      /* Right: Slide Area */
      .slide-area {
        display: grid;
        grid-template-rows: 1fr auto;
        height: 100%;
        overflow: hidden;
      }

      /* Bottom Editors */
      .editors-panel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        height: 280px;
        border-top: 1px solid #e0e0e0;
      }

      .editors-panel code-editor:first-child {
        border-right: 1px solid #e0e0e0;
      }

      .stop-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: none;
        border-radius: var(--chat-radius-md);
        background: var(--chat-color-error-500);
        color: #ffffff;
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover {
          background: var(--chat-color-error-600);
        }

        &:focus-visible {
          outline: 2px solid var(--chat-color-error-500);
          outline-offset: 2px;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "slide-app": SlideApp;
  }
}
