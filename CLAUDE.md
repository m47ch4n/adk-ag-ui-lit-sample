# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LT (Lightning Talk) Slide Creator application demonstrating AG-UI protocol integration with Google ADK (Agent Development Kit) multi-agent backend and Lit web components frontend. Features Marp Markdown slide preview, CodeMirror editors, and real-time streaming. Licensed under Apache 2.0.

## Architecture

```
├── agent/          # Python backend - Google ADK multi-agent with AG-UI middleware
└── web/            # TypeScript frontend - Lit web components with Vite
```

The agent exposes `/chat` endpoint via FastAPI with AG-UI protocol support. The web frontend communicates through Vite's dev proxy (`/api/*` → `localhost:8000/*`).

### Multi-Agent Backend (agent/)

```
agent/
├── main.py                  # FastAPI + AG-UI middleware, PredictStateMapping
└── sample_agent/
    ├── agent.py             # Multi-agent definition (root + sub-agents)
    ├── tools.py             # Slide manipulation tools
    └── skills/              # ADK Skills (context/knowledge for LLM)
        ├── lt-structure/    # Slide structure patterns
        ├── marp-design/     # Marp syntax guide
        └── pptx-export/     # PPTX export guidelines
```

**Agent hierarchy:**
- **root_agent (lt_assistant)** — gemini-3.1-flash-lite-preview: Conversation router, loads ADK Skills, delegates to sub-agents. Has ThinkingConfig enabled.
- **slide_author** — gemini-3.1-pro-preview: Slide content generation/editing. Tools: `write_slides`, `edit_slide`, `get_slides`, `update_slides`.

Tools in `tools.py` operate on `tool_context.state["slides_markdown"]`. Slide separation uses `"\n---\n"`.

**PredictStateMapping** in `main.py` enables real-time streaming of tool arguments (e.g., `write_slides` markdown → frontend state → live Marpit preview).

### Frontend Structure (web/src/)

```
web/src/
├── slide-app.ts             # Main entry point (mediator pattern, state management)
├── chat-app.ts              # Simpler chat-only app variant
├── ag-ui-agent.ts           # Headless Custom Element wrapping HttpAgent
├── custom-elements/         # Reusable UI primitives (Shadow DOM)
│   ├── chat-input.ts        # Textarea with IME fix (Safari)
│   ├── chat-messages.ts     # Message list with turn grouping + auto-scroll
│   ├── chat-message.ts      # Single message bubble (markdown + collapsible reasoning)
│   ├── chat-loading-message.ts
│   ├── slide-preview.ts     # Marpit renderer with slide navigation
│   ├── code-editor.ts       # CodeMirror 6 wrapper (Markdown/CSS languages)
│   ├── markdown-content.ts  # marked + remend + DOMPurify (XSS-safe)
│   ├── toast-manager.ts     # Accessible notification container (aria-live)
│   └── toast-item.ts        # Individual toast with auto-dismiss
├── styles/                  # Shared CSS
│   ├── tokens.ts            # Design tokens (light/dark theme via CSS custom properties)
│   ├── a11y.ts              # Accessibility utilities
│   └── chat-message-base.ts # Shared message styles
├── types/                   # TypeScript type definitions
│   ├── message.ts           # ChatMessageData, ChatLoadingData
│   ├── events.ts            # AG-UI custom event types
│   └── tool.ts              # ToolDefinition, ToolHandler, defineTool()
└── tools/                   # Client-side tool implementations
    └── hello-tool.ts        # Example tool registration
```

**Design principle:** Custom elements in `custom-elements/` are primitive, reusable components independent of application logic. `ag-ui-agent` is a headless Custom Element (no Shadow DOM) that handles AG-UI protocol communication and dispatches events.

## Commands

### Agent (Python Backend)

From `agent/` directory using uv (Python 3.13):

```bash
uv sync                           # Install dependencies

# Option A: Google AI Studio (Gemini API)
export GOOGLE_API_KEY=<your-api-key>

# Option B: Vertex AI
export GOOGLE_GENAI_USE_VERTEXAI=1
export GOOGLE_CLOUD_PROJECT=<your-project-id>
export GOOGLE_CLOUD_LOCATION=global

uv run python main.py             # Start server on port 8000
```

Endpoints:
- `GET /health` - Health check
- `POST /chat` - AG-UI chat endpoint (accepts x-user-id, x-tenant-id headers)

### Web (TypeScript Frontend)

From `web/` directory using pnpm:

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server with hot reload
pnpm build      # Compile TypeScript + build production bundle
pnpm preview    # Preview production build locally
pnpm check      # Biome lint & auto-fix
pnpm format     # Prettier format
```

### Linting & Formatting

- **Biome** (linter): Recommended rules, auto-organize imports. Formatter disabled (delegated to Prettier).
- **Prettier** (formatter): Double quotes.
- **TypeScript**: Strict mode, `experimentalDecorators`, `noUnusedLocals`, `noUnusedParameters`.
- **No test suite** currently configured.

## Tech Stack

**Backend:**
- Google ADK 1.26+ with Gemini 3.1 (Flash Lite + Pro)
- AG-UI ADK middleware (`ag-ui-adk`) for protocol integration
- FastAPI + Uvicorn
- jsonpatch (RFC 6902) for `update_slides` tool

**Frontend:**
- Lit 3.3.1 - Web components with decorators
- AG-UI client (`@ag-ui/client`) - HttpAgent for backend communication
- Marpit - Marp Markdown → HTML slide rendering
- CodeMirror 6 - Code editors (Markdown, CSS)
- marked + DOMPurify - Safe Markdown rendering
- Zod - Schema validation for tool parameters
- TypeScript ~5.9.3 - Strict mode, ES2022 target, experimental decorators
- Vite 7.2.5 (rolldown-vite)

## Key Patterns

### Event-Driven Architecture ("Properties Down, Events Up")

`slide-app.ts` acts as mediator: listens to `ag-ui-agent` events, updates `@state()` properties, passes them down to child elements via `@property()`.

```
slide-app (mediator, @state)
  ├── ag-ui-agent  ──→ dispatches ag-ui-* events ──→ slide-app listens
  ├── chat-messages ←── .messages property
  ├── slide-preview ←── .markdown, .css properties
  └── code-editor   ←── .value property, emits "value-changed" event
```

### AG-UI Agent Events (web/src/ag-ui-agent.ts)

`<ag-ui-agent>` is a headless Custom Element (Shadow DOM disabled) wrapping `HttpAgent`. Key events:

| Event | Detail | Timing |
|-------|--------|--------|
| `ag-ui-messages-changed` | `{ messages: Message[] }` | On message update |
| `ag-ui-run-started` | `{ threadId: string }` | On run start |
| `ag-ui-run-failed` | `{ error: unknown }` | On error |
| `ag-ui-run-finalized` | `{ threadId: string }` | On run complete |
| `ag-ui-reasoning-content` | `{ delta, buffer }` | Reasoning stream |
| `ag-ui-state-changed` | `{ state }` | State snapshot/delta |
| `ag-ui-tool-call-start/args/end` | tool call details | Tool execution |

### Slide State Synchronization

1. **Frontend → Backend:** On send, `slide-app` calls `agentElement.setState({ slides_markdown, slides_css })` before `sendMessage()`.
2. **Backend → Frontend:** PredictStateMapping streams tool arguments as state updates → `ag-ui-state-changed` event → live preview.
3. **State key:** `slides_markdown` (full Marp deck string), `slides_css` (custom CSS overlay).

### Tool Definition Pattern

**Frontend** (Zod schema → JSON Schema conversion):
```typescript
const tool = defineTool({
  name: "tool_name",
  description: "What it does",
  parameters: z.object({ arg: z.string() }),
  handler: ({ arg }) => `result: ${arg}`,
});
// Register via CustomEvent("define-tool") in firstUpdated()
```

**Backend** (Python functions with ToolContext):
```python
def write_slides(tool_context: ToolContext, markdown: str) -> dict[str, str]:
    tool_context.state["slides_markdown"] = markdown
    return {"status": "success", "message": "..."}
```

### Tool Call Race Condition Fix

`ag-ui-agent` tracks pending tool results in `_pendingToolResults[]`. `onRunFinalized` is guarded—won't fire while tools are pending. After all tools complete, `_runAgent()` re-runs to let the agent process results.

### Custom Elements Convention

Custom elements extend `LitElement` with `@customElement` decorator, `@property()` for reactive state, `static styles` with `css` literal, and `html` literal for rendering. Declare custom elements in `HTMLElementTagNameMap`. These are native Custom Elements, not Virtual DOM components.

### Toast System (web/src/custom-elements/toast-*.ts)

Two-layer architecture for accessible notifications:
- **`toast-manager`**: Container with `aria-live` region. Manages toast stack, emits `toast-close` events.
- **`toast-item`**: Individual notification with auto-dismiss timer, pause on hover/focus.

Errors use `noAutoDismiss: true` to persist until user dismissal.

### Design Tokens (web/src/styles/tokens.ts)

CSS custom properties for theming. Light by default, dark via `:host-context([data-theme="dark"])`. Token categories: neutral colors (50-950), semantic surfaces, spacing (xs-2xl), typography (system font stack, SF Mono for code), border radius.

## Debugging

**Backend logging** (configured in `main.py`):
- `adk_agent`: DEBUG, `event_translator`: INFO, `session_manager`: WARNING, `endpoint`: ERROR

**Common issues:**
- CORS errors → Ensure Vite dev proxy is running (`pnpm dev`)
- Tool not found → Check registration happens in `firstUpdated()`
- Slides not updating → Verify `ag-ui-state-changed` fires and state key matches
