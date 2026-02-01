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
```

## Tech Stack

**Backend:**
- Google ADK 1.23+ with Gemini 2.5 Flash
- AG-UI ADK middleware (`ag-ui-adk`) for protocol integration
- FastAPI + Uvicorn

**Frontend:**
- Lit 3.3.1 - Web components with decorators
- AG-UI client (`@ag-ui/client`) - HttpAgent for backend communication
- TypeScript ~5.9.3 - Strict mode, ES2022 target, experimental decorators
- Vite 7.2.5 (rolldown-vite)

## Key Patterns

### Agent Definition (agent/sample_agent/agent.py)

Agents use Google ADK's `Agent` class with model, description, instruction, and tools.

### AG-UI Integration (agent/main.py)

`ADKAgent.from_app()` wraps the ADK app, and `add_adk_fastapi_endpoint()` adds the AG-UI endpoint. Custom headers can be extracted via `extract_headers` parameter.

### Frontend State Management (web/src/ag-ui-controller.ts)

`AgUiController` implements Lit's `ReactiveController` pattern to manage AG-UI client communication. It wraps `HttpAgent` from `@ag-ui/client`, handles message state, and triggers host updates on events (messages changed, run failed, run finalized).

### Lit Components (web/src/)

Components extend `LitElement` with `@customElement` decorator, `@property()` for reactive state, `static styles` with `css` literal, and `html` literal for rendering. Declare custom elements in `HTMLElementTagNameMap`.
