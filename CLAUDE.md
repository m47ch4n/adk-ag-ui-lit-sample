# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sample application demonstrating AG-UI protocol integration with Google ADK (Agent Development Kit) backend and Lit web components frontend. Licensed under Apache 2.0.

## Architecture

```
├── agent/          # Python backend - Google ADK agent with AG-UI middleware
└── web/            # TypeScript frontend - Lit web components with Vite
```

The agent exposes `/chat` endpoint via FastAPI with AG-UI protocol support. The web frontend communicates with this endpoint.

## Commands

### Agent (Python Backend)

From `agent/` directory using uv (Python 3.13):

```bash
uv sync                           # Install dependencies
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
- AG-UI ADK middleware for protocol integration
- FastAPI + Uvicorn

**Frontend:**
- Lit 3.3.1 - Web components with decorators
- TypeScript ~5.9.3 - Strict mode, ES2022 target, experimental decorators
- Vite 7.2.5 (rolldown-vite)

## Key Patterns

### Agent Definition (agent/sample_agent/agent.py)

Agents use Google ADK's `Agent` class with model, description, instruction, and tools.

### AG-UI Integration (agent/main.py)

`ADKAgent.from_app()` wraps the ADK app, and `add_adk_fastapi_endpoint()` adds the AG-UI endpoint.

### Lit Components (web/src/)

Components extend `LitElement` with `@customElement` decorator, `@property()` for reactive state, `static styles` with `css` literal, and `html` literal for rendering. Declare custom elements in `HTMLElementTagNameMap`.
