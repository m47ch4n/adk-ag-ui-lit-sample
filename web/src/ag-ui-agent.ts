import { type AgentSubscriber, HttpAgent } from "@ag-ui/client";
import {
  EventType,
  type Message,
  type Tool,
  type ToolMessage,
  type UserMessage,
} from "@ag-ui/core";
import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { z } from "zod";
import type {
  AgUiMessagesChangedEvent,
  AgUiReasoningContentEvent,
  AgUiReasoningEndEvent,
  AgUiRunFailedEvent,
  AgUiRunFinalizedEvent,
  AgUiRunStartedEvent,
  AgUiToolCallArgsEvent,
  AgUiToolCallEndEvent,
  AgUiToolCallErrorEvent,
  AgUiToolCallStartEvent,
  RegisteredTool,
  ToolHandler,
} from "./types/index.js";

/**
 * Headless custom element that wraps HttpAgent and dispatches AG-UI events.
 * Does not render any UI - use with event listeners in parent components.
 */
@customElement("ag-ui-agent")
export class AgUiAgent extends LitElement {
  @property({ type: String })
  url = "/api/chat";

  @property({ type: String, attribute: "thread-id" })
  threadId = crypto.randomUUID();

  private _agent: HttpAgent | null = null;
  private _unsubscribe: (() => void) | null = null;
  private _abortController: AbortController | null = null;
  private _registeredTools: Map<string, RegisteredTool> = new Map();
  private _pendingToolResults: Promise<void>[] = [];
  private _reasoningBuffer = "";

  get isRunning(): boolean {
    return this._agent?.isRunning ?? false;
  }

  abort(): void {
    this._abortController?.abort();
    this._pendingToolResults = [];
  }

  get messages(): Message[] {
    return this._agent?.messages ?? [];
  }

  /**
   * Register a tool that can be invoked by the LLM.
   * The generic parameter ensures type safety between the Zod schema and handler.
   *
   * @param name - Unique tool name
   * @param description - Description of what the tool does
   * @param parameters - Zod schema for tool parameters
   * @param handler - Function to execute when tool is called (args typed from schema)
   */
  registerTool<T extends z.ZodTypeAny>(
    name: string,
    description: string,
    parameters: T,
    handler: (args: z.infer<T>) => string | Promise<string>,
  ): void {
    const jsonSchema = z.toJSONSchema(parameters);
    this._registeredTools.set(name, {
      name,
      description,
      parameters: jsonSchema,
      handler: handler as ToolHandler,
    });
  }

  /**
   * Unregister a previously registered tool.
   * @param name - Name of the tool to unregister
   */
  unregisterTool(name: string): void {
    this._registeredTools.delete(name);
  }

  /**
   * Get list of registered tool names.
   */
  get registeredToolNames(): string[] {
    return Array.from(this._registeredTools.keys());
  }

  /**
   * Convert registered tools to AG-UI Tool format.
   * Removes $schema property as Google ADK's types.Schema doesn't allow it.
   */
  private _getToolsForAgent(): Tool[] {
    return Array.from(this._registeredTools.values()).map((tool) => {
      // Remove $schema from parameters as ADK doesn't accept it
      const { $schema, ...parameters } = tool.parameters as Record<
        string,
        unknown
      >;
      return {
        name: tool.name,
        description: tool.description,
        parameters,
      };
    });
  }

  /** Disable Shadow DOM for headless operation */
  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this._initAgent();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanupAgent();
  }

  private _initAgent() {
    this._agent = new HttpAgent({
      url: this.url,
      threadId: this.threadId,
    });

    const subscriber: AgentSubscriber = {
      onEvent: (params) => {
        const { event } = params;
        // Handle THINKING_* events (ag-ui-adk 0.5.0 emits these)
        // and REASONING_* events (future ag-ui-adk versions) via onEvent
        // to provide a unified reasoning event interface.
        switch (event.type) {
          case EventType.THINKING_START:
          case EventType.REASONING_START:
            this._reasoningBuffer = "";
            this._dispatchEvent("ag-ui-reasoning-start", undefined);
            break;
          case EventType.THINKING_TEXT_MESSAGE_CONTENT:
          case EventType.REASONING_MESSAGE_CONTENT: {
            const delta = (event as { delta?: string }).delta ?? "";
            this._reasoningBuffer += delta;
            this._dispatchEvent("ag-ui-reasoning-content", {
              delta,
              buffer: this._reasoningBuffer,
            } satisfies AgUiReasoningContentEvent["detail"]);
            break;
          }
          case EventType.THINKING_END:
          case EventType.REASONING_END:
            this._dispatchEvent("ag-ui-reasoning-end", {
              content: this._reasoningBuffer,
            } satisfies AgUiReasoningEndEvent["detail"]);
            this._reasoningBuffer = "";
            break;
        }
      },
      onMessagesChanged: (params) => {
        this._dispatchEvent("ag-ui-messages-changed", {
          messages: params.messages,
        } satisfies AgUiMessagesChangedEvent["detail"]);
      },
      onRunFailed: (params) => {
        console.error("AG-UI Run Failed:", params.error);
        this._dispatchEvent("ag-ui-run-failed", {
          error: params.error,
        } satisfies AgUiRunFailedEvent["detail"]);
      },
      onRunFinalized: () => {
        if (this._pendingToolResults.length > 0) return;
        this._dispatchEvent("ag-ui-run-finalized", {
          threadId: this.threadId,
        } satisfies AgUiRunFinalizedEvent["detail"]);
      },
      onToolCallStartEvent: (params) => {
        this._dispatchEvent("ag-ui-tool-call-start", {
          toolCallId: params.event.toolCallId,
          toolCallName: params.event.toolCallName,
        } satisfies AgUiToolCallStartEvent["detail"]);
      },
      onToolCallArgsEvent: (params) => {
        this._dispatchEvent("ag-ui-tool-call-args", {
          toolCallId: params.event.toolCallId,
          toolCallName: params.toolCallName,
          delta: params.event.delta,
          buffer: params.toolCallBuffer,
        } satisfies AgUiToolCallArgsEvent["detail"]);
      },
      onToolCallEndEvent: (params) => {
        if (this._agent == null) return;

        const { toolCallName, toolCallArgs } = params;
        const toolCallId = params.event.toolCallId;

        const registeredTool = this._registeredTools.get(toolCallName);
        if (!registeredTool) return;

        this._pendingToolResults.push(
          this._executeToolCall(
            toolCallId,
            toolCallName,
            toolCallArgs,
            registeredTool.handler,
          ),
        );
      },
    };

    const subscription = this._agent.subscribe(subscriber);
    this._unsubscribe = () => subscription.unsubscribe();
  }

  private _cleanupAgent() {
    this._abortController?.abort();
    this._abortController = null;
    this._pendingToolResults = [];
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._agent = null;
  }

  private async _executeToolCall(
    toolCallId: string,
    toolCallName: string,
    toolCallArgs: Record<string, unknown>,
    handler: ToolHandler,
  ): Promise<void> {
    try {
      const result = await handler(toolCallArgs);

      const toolMessage: ToolMessage = {
        id: crypto.randomUUID(),
        role: "tool",
        content: result,
        toolCallId,
      };
      this._agent?.addMessage(toolMessage);
      this._dispatchEvent("ag-ui-tool-call-end", {
        toolCallId,
        toolCallName,
        toolCallArgs,
        result,
      } satisfies AgUiToolCallEndEvent["detail"]);
    } catch (error) {
      console.error(`Tool "${toolCallName}" execution failed:`, error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const toolMessage: ToolMessage = {
        id: crypto.randomUUID(),
        role: "tool",
        content: "",
        toolCallId,
        error: errorMessage,
      };
      this._agent?.addMessage(toolMessage);

      this._dispatchEvent("ag-ui-tool-call-error", {
        toolCallId,
        toolCallName,
        error,
      } satisfies AgUiToolCallErrorEvent["detail"]);
    }
  }

  private _dispatchEvent<T>(name: string, detail: T) {
    this.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  async sendMessage(content: string) {
    if (!content.trim() || !this._agent || this.isRunning) return;

    const userMessage: UserMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content,
    };
    this._agent.addMessage(userMessage);

    this._dispatchEvent("ag-ui-run-started", {
      threadId: this.threadId,
    } satisfies AgUiRunStartedEvent["detail"]);

    await this._runAgent();
  }

  async _runAgent() {
    if (this._agent == null) return;
    this._abortController = new AbortController();

    try {
      await this._agent.runAgent({
        tools: this._getToolsForAgent(),
        context: [],
        abortController: this._abortController,
      });
      if (this._pendingToolResults.length > 0) {
        const pending = this._pendingToolResults;
        this._pendingToolResults = [];
        await Promise.all(pending);
        await this._runAgent();
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("AG-UI Error:", e);
      this._dispatchEvent("ag-ui-run-failed", {
        error: e,
      } satisfies AgUiRunFailedEvent["detail"]);
    } finally {
      this._abortController = null;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ag-ui-agent": AgUiAgent;
  }
}
