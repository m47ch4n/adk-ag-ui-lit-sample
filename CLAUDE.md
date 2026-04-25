# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sample application demonstrating AG-UI protocol integration with Google ADK (Agent Development Kit) backend and Lit web components frontend. Licensed under Apache 2.0.

## Architecture

```
├── agent/          # Python backend - Google ADK agent with AG-UI middleware
└── web/            # TypeScript frontend - Lit web components with Vite
```

The agent exposes `/chat` endpoint via FastAPI with AG-UI protocol support. The web frontend communicates with this endpoint through Vite's dev proxy (`/api/*` → `localhost:8000/*`).

### Frontend Structure

```
web/src/
├── custom-elements/     # Reusable Custom Elements (framework-agnostic primitives)
├── styles/              # Shared CSS (tokens, base styles, a11y utilities)
├── types/               # TypeScript type definitions
│   ├── message.ts       # Chat message types (ChatMessageData, ChatLoadingData)
│   ├── events.ts        # AG-UI custom event types
│   └── tool.ts          # ToolDefinition, ToolHandler, defineTool()
├── tools/               # Client-side tool implementations
│   └── hello-tool.ts    # Example tool registration
├── ag-ui-agent.ts       # Headless Custom Element wrapping HttpAgent
├── chat-app.ts          # Application entry point
└── index.css            # Global styles
```

**Design principle:** Custom elements in `custom-elements/` are primitive, reusable components independent of application logic. `ag-ui-agent` is a headless Custom Element that handles AG-UI protocol communication and dispatches events.

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

From `web/` directory using pnpm. **NEVER use npm or yarn for this project — pnpm only.** This includes any registry queries (`pnpm view`, `pnpm outdated`) and dependency operations (`pnpm add`, `pnpm update`).

```bash
pnpm install      # Install dependencies
pnpm dev          # Start dev server with hot reload
pnpm build        # Compile TypeScript + build production bundle
pnpm preview      # Preview production build locally
pnpm lint         # oxlint
pnpm lint:fix     # oxlint --fix
pnpm format       # oxfmt format
pnpm format:check # oxfmt check
```

### Linting & Formatting

- **oxlint** (linter): `correctness` category as error, plugins: `typescript`, `unicorn`, `import`. Config in `.oxlintrc.json`.
- **oxfmt** (formatter): Prettier-compatible defaults (double quotes, 2-space indent), `sortImports: true` for grouped/sorted imports. Config in `.oxfmtrc.json`.
- **TypeScript**: Strict mode, `experimentalDecorators`, `noUnusedLocals`, `noUnusedParameters`.
- **No test suite** currently configured.

## Tech Stack

**Backend:**
- Google ADK 2.0.0b1+ with Gemini (`gemini-flash-latest` alias)
- AG-UI ADK middleware (`ag-ui-adk` 0.6.0+) for protocol integration. The `google-adk<2.0.0` constraint in ag-ui-adk is overridden via `[tool.uv] override-dependencies` in `pyproject.toml`.
- FastAPI + Uvicorn

**Frontend:**
- Lit 3.3.1 - Web components with decorators
- AG-UI client (`@ag-ui/client`) - HttpAgent for backend communication
- marked + remend + DOMPurify - Safe Markdown rendering with XSS protection
- Zod - Schema validation for client-side tool parameters
- TypeScript ~5.9.3 - Strict mode, ES2022 target, experimental decorators
- Vite 7.2.5 (rolldown-vite)

## Key Patterns

### Agent Definition (agent/sample_agent/agent.py)

Agents use Google ADK's `Agent` class with model, description, instruction, and tools.

### AG-UI Integration (agent/main.py)

`ADKAgent.from_app()` wraps the ADK app, and `add_adk_fastapi_endpoint()` adds the AG-UI endpoint. Custom headers can be extracted via `extract_headers` parameter.

### Frontend Event-Driven Architecture (web/src/ag-ui-agent.ts)

`<ag-ui-agent>` is a headless Custom Element (Shadow DOM disabled) that wraps `HttpAgent` from `@ag-ui/client`. It dispatches these events:

| Event | Detail | Timing |
|-------|--------|--------|
| `ag-ui-messages-changed` | `{ messages: Message[] }` | On message update |
| `ag-ui-run-started` | `{ threadId: string }` | On run start |
| `ag-ui-run-failed` | `{ error: unknown }` | On error |
| `ag-ui-run-finalized` | `{ threadId: string }` | On run complete |
| `ag-ui-reasoning-start/content/end` | reasoning stream | THINKING/REASONING events |
| `ag-ui-tool-call-start/args/end/error` | tool call details | Client-side tool execution |

`chat-app.ts` listens to these events and manages UI state with `@state()` decorators.

### Tool Definition Pattern (web/src/tools/, web/src/types/tool.ts)

Client-side tools are defined with a Zod schema (auto-converted to JSON Schema) and registered by dispatching a `define-tool` CustomEvent:

```typescript
const tool = defineTool({
  name: "tool_name",
  description: "What it does",
  parameters: z.object({ arg: z.string() }),
  handler: ({ arg }) => `result: ${arg}`,
});
// Dispatch CustomEvent("define-tool", { detail: tool, bubbles: true, composed: true })
// in firstUpdated(); ag-ui-agent listens and forwards to HttpAgent.
```

Tool execution is tracked in `_pendingToolResults[]` to prevent `ag-ui-run-finalized` from firing prematurely. After all tools complete, `_runAgent()` re-runs so the agent can process results.

### Custom Elements (web/src/custom-elements/)

Custom elements extend `LitElement` with `@customElement` decorator, `@property()` for reactive state, `static styles` with `css` literal, and `html` literal for rendering. Declare custom elements in `HTMLElementTagNameMap`. These are native Custom Elements, not Virtual DOM components.

### Toast System (web/src/custom-elements/toast-*.ts)

Two-layer architecture for accessible notifications:
- **`toast-manager`**: Container with `aria-live` region. Manages toast stack, emits `toast-close` events.
- **`toast-item`**: Individual notification with auto-dismiss timer, pause on hover/focus.

Errors use `noAutoDismiss: true` to persist until user dismissal.
