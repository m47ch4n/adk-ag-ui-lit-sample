# LT Slide Creator - Design Document

## Overview

Transform the ADK AG-UI sample application into an LT (Lightning Talk) slide creation tool. The core value proposition is real-time, interactive slide editing powered by a multi-agent architecture.

## Architecture

### System Diagram

```
Browser (Lit Web Components)
┌──────────────┬───────────────────────────────┐
│              │                               │
│  chat-panel  │     slide-preview             │
│              │     (Marpit HTML rendering)    │
│  ┌────────┐  │                               │
│  │messages│  │                               │
│  ├────────┤  ├───────────────┬───────────────┤
│  │ input  │  │ markdown-     │ css-          │
│  └────────┘  │ editor        │ editor        │
│              │ (CodeMirror6) │ (CodeMirror6) │
└──────────────┴───────────────┴───────────────┘
        │ SSE (AG-UI Protocol)
        ▼
┌─────────────────────────────────────────────┐
│  FastAPI + AG-UI ADK Middleware              │
│                                             │
│  Flash Agent (lt_assistant)                 │
│  - Conversation & intent understanding      │
│  - Skill selection (SkillToolset)           │
│  - Delegates to sub-agent                   │
│                                             │
│    └─► Claude Opus 4.6 (slide_author)       │
│        - Slide content generation & editing  │
│        - write/edit/get/update_slides tools  │
└─────────────────────────────────────────────┘
```

### Multi-Agent Configuration

| Agent | Model | Role |
|-------|-------|------|
| `lt_assistant` (root) | gemini-2.5-flash | Conversation, intent understanding, skill routing |
| `slide_author` (sub) | vertex_ai/claude-opus-4-6 | High-quality slide content generation and editing |

Flash provides fast response for conversation. Claude Opus provides high-quality output for slide content.

## ADK Skills

Three skills using ADK's `SkillToolset` with progressive disclosure:

```
agent/sample_agent/skills/
├── lt_structure/
│   └── SKILL.md          # LT composition patterns, timing, structure
├── marp_design/
│   ├── SKILL.md          # Marp syntax, layout patterns, color/typography
│   └── references/
│       └── directives.md # Detailed Marp directive reference (L3)
└── pptx_export/
    └── SKILL.md          # Marp CLI --pptx-editable usage, caveats
```

**lt-structure**: LT composition knowledge - structure patterns (5/10/20 min), slide count guidelines, audience engagement techniques.

**marp-design**: Marp Markdown syntax - directives, layout patterns (title slides, bullet points, image splits, code display), color palettes, typography best practices.

**pptx-export**: PPTX export procedure using Marp CLI `--pptx-editable`, LibreOffice dependency notes, pre-export Markdown optimization.

## Tool Design

Medium-granularity tools inspired by Claude Code's design philosophy (specialized tools preferred, universal fallback available):

| Tool | Purpose | Analogy |
|------|---------|---------|
| `write_slides(markdown)` | Create/overwrite entire deck | `Write` |
| `edit_slide(slide_index, old_text, new_text)` | Partial replacement in a specific slide | `Edit` |
| `get_slides()` | Read current slide state | `Read` |
| `update_slides(patch)` | Structural operations via JSON Patch (reorder, delete) | `Bash` |

Agent instruction: "Prefer `write_slides` / `edit_slide`. Use `update_slides` only for structural operations."

## Real-Time Updates (Predictive State)

### Backend Configuration

```python
PredictStateMapping(
    state_key="slides_markdown",
    tool="write_slides",
    tool_argument="markdown",
)
```

### Event Flow

```
CUSTOM("PredictState") → Frontend saves mapping metadata
    ↓
TOOL_CALL_ARGS (repeated) → Incrementally updates slides_markdown
    ↓                        → Marpit.render() → Preview updates
TOOL_CALL_END → Finalized
    ↓
STATE_SNAPSHOT → Full state sync
```

### Bidirectional Editing

```
Agent → (Predictive State) → slides_markdown / slides_css → Preview
                                        ↑
User  → (Direct editor edit) ───────────┘
                                        │
                                        ↓
                          Sent as current state on next agent run
```

- Agent generates via `write_slides` → Markdown editor and preview update simultaneously
- User edits directly in editor → Marpit re-renders preview immediately + state synced
- Next chat message → Agent receives latest state (including user edits)

## Frontend Components

### Technology Choices

| Component | Library | Rationale |
|-----------|---------|-----------|
| Slide preview | Marpit (~85KB gzip) | Pure function `render(md)` → `{html, css}`. Ideal for streaming |
| Code editors | CodeMirror 6 (~150KB gzip) | Modular, lightweight, Markdown/CSS syntax highlighting |
| UI framework | Lit 3.x | Existing project foundation |

### Component Structure

```
web/src/
├── custom-elements/
│   ├── chat-input.ts        # Existing
│   ├── chat-messages.ts     # Existing
│   ├── chat-message.ts      # Existing
│   ├── slide-preview.ts     # New: Marpit rendering
│   ├── code-editor.ts       # New: CodeMirror 6 wrapper
│   ├── toast-manager.ts     # Existing
│   └── toast-item.ts        # Existing
├── ag-ui-agent.ts           # Extended: State event subscribers
└── slide-app.ts             # New: Application entry point (replaces chat-app.ts)
```

### Layout

```
┌──────────────┬───────────────────────────────┐
│              │                               │
│  chat-panel  │     slide-preview             │
│              │     (Marpit HTML rendering)    │
│  (left col)  │     ← Main area, large        │
│              │                               │
│              ├───────────────┬───────────────┤
│              │ Marp Markdown │ Marp CSS      │
│              │ (CodeMirror)  │ (CodeMirror)  │
│              │ (editable)    │ (editable)    │
└──────────────┴───────────────┴───────────────┘
```

## Markdown Format

Marp standard format with directives:

```markdown
---
marp: true
theme: default
paginate: true
---

# Slide Title
Content here

---

<!-- _backgroundColor: #1a1a2e -->
<!-- _color: white -->

## Second Slide
- Bullet points
- More content
```

## PPTX Export

- Trigger: User requests export via chat
- Backend: `marp-cli --pptx --pptx-editable` (requires LibreOffice)
- Fallback: Standard image-based PPTX if LibreOffice unavailable
- Scope: Supplementary feature; core experience is real-time preview

## Coding Conventions

- Agent `instruction` and `description` fields in English
- Multi-line strings use `textwrap.dedent`
- Frontend follows existing Lit patterns (decorators, Shadow DOM, events)
- Custom elements in `custom-elements/` are framework-agnostic primitives

## Key Dependencies (New)

### Backend
- `google-adk >= 1.26.0` (existing, includes Skills support)
- `litellm` (for Claude Opus 4.6 via Vertex AI)

### Frontend
- `@marp-team/marpit` (slide rendering)
- `@codemirror/view`, `@codemirror/lang-markdown`, `@codemirror/lang-css` (editors)
