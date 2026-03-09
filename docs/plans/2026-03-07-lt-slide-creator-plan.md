# LT Slide Creator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the ADK AG-UI sample into an LT slide creation app with real-time Marp preview, multi-agent (Flash + Claude Opus), and bidirectional editing.

**Architecture:** Flash root agent handles conversation and skill routing. Claude Opus sub-agent generates/edits Marp Markdown via slide tools. Predictive State Updates stream tool arguments to the frontend, where Marpit renders slides in real-time. CodeMirror 6 editors allow direct Markdown/CSS editing.

**Tech Stack:** Google ADK 1.26+ (Skills, multi-agent), LiteLLM (Claude via Vertex AI), ag-ui-adk (Predictive State), Lit 3.x, Marpit, CodeMirror 6, Vite

**Design doc:** `docs/plans/2026-03-07-lt-slide-creator-design.md`

---

## Task 1: Backend Dependencies

**Files:**
- Modify: `agent/pyproject.toml`

**Step 1: Add litellm and jsonpatch dependencies**

```toml
[project]
name = "agent"
version = "0.1.0"
description = "LT Slide Creator - ADK AG-UI sample with multi-agent architecture"
readme = "README.md"
requires-python = ">=3.13"
dependencies = [
    "google-adk>=1.26.0",
    "ag-ui-adk>=0.5.0",
    "uvicorn[standard]>=0.34.0",
    "litellm>=1.70.0",
    "jsonpatch>=1.33",
]
```

**Step 2: Install and verify**

Run: `cd agent && uv sync`
Expected: Dependencies install successfully

**Step 3: Verify imports work**

Run: `cd agent && uv run python -c "from google.adk.models.lite_llm import LiteLlm; from google.adk.skills import load_skill_from_dir; from google.adk.tools.skill_toolset import SkillToolset; import jsonpatch; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add agent/pyproject.toml agent/uv.lock
git commit -m "chore: Add litellm and jsonpatch dependencies for multi-agent and slide tools"
```

---

## Task 2: Create Slide Tools

**Files:**
- Create: `agent/sample_agent/tools.py`

**Step 1: Implement the four slide tools**

Reference: Design doc "Tool Design" section. Tools operate on `tool_context.state["slides_markdown"]`.

```python
"""Slide manipulation tools for the LT Slide Creator.

Medium-granularity tool design inspired by Claude Code:
- write_slides / edit_slide = specialized (preferred)
- update_slides = universal fallback (JSON Patch)
"""

import json
import logging

import jsonpatch
from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)

SLIDE_SEPARATOR = "\n---\n"


def _split_slides(markdown: str) -> list[str]:
    """Split Marp markdown into individual slides by '---' separator."""
    return markdown.split(SLIDE_SEPARATOR)


def _join_slides(slides: list[str]) -> str:
    """Join individual slides back into Marp markdown."""
    return SLIDE_SEPARATOR.join(slides)


def write_slides(tool_context: ToolContext, markdown: str) -> dict[str, str]:
    """Create or overwrite the entire slide deck with Marp Markdown.

    Use this tool for initial slide creation or complete rewrites.
    The markdown should use Marp format with '---' slide separators.
    """
    tool_context.state["slides_markdown"] = markdown
    slide_count = len(_split_slides(markdown))
    return {
        "status": "success",
        "message": f"Wrote {slide_count} slides successfully.",
    }


def edit_slide(
    tool_context: ToolContext,
    slide_index: int,
    old_text: str,
    new_text: str,
) -> dict[str, str]:
    """Replace text within a specific slide. Like a targeted find-and-replace.

    Use this for modifying content in an existing slide without regenerating
    the entire deck. The old_text must match exactly within the target slide.

    Args:
        slide_index: Zero-based index of the slide to edit.
        old_text: Exact text to find in the slide.
        new_text: Text to replace it with.
    """
    markdown = tool_context.state.get("slides_markdown", "")
    if not markdown:
        return {"status": "error", "message": "No slides exist yet. Use write_slides first."}

    slides = _split_slides(markdown)

    if slide_index < 0 or slide_index >= len(slides):
        return {
            "status": "error",
            "message": f"Slide index {slide_index} out of range. Deck has {len(slides)} slides (0-{len(slides) - 1}).",
        }

    slide = slides[slide_index]
    if old_text not in slide:
        return {
            "status": "error",
            "message": f"old_text not found in slide {slide_index}. Use get_slides to check current content.",
        }

    slides[slide_index] = slide.replace(old_text, new_text, 1)
    tool_context.state["slides_markdown"] = _join_slides(slides)
    return {"status": "success", "message": f"Edited slide {slide_index} successfully."}


def get_slides(tool_context: ToolContext) -> dict[str, str | list[dict[str, str | int]]]:
    """Read the current slide deck content.

    Returns the full markdown and a summary of each slide.
    """
    markdown = tool_context.state.get("slides_markdown", "")
    if not markdown:
        return {"status": "empty", "message": "No slides yet.", "markdown": "", "slides": []}

    slides = _split_slides(markdown)
    slide_summaries = []
    for i, slide in enumerate(slides):
        lines = slide.strip().splitlines()
        first_line = lines[0] if lines else "(empty)"
        slide_summaries.append({"index": i, "preview": first_line})

    return {
        "status": "success",
        "markdown": markdown,
        "slides": slide_summaries,
    }


def update_slides(tool_context: ToolContext, patch: list[dict]) -> dict[str, str]:
    """Apply structural operations to slides using JSON Patch (RFC 6902).

    Use this for reordering, deleting, or other structural changes that
    write_slides/edit_slide cannot handle. Operates on a JSON array of
    slide strings.

    Example patches:
    - Delete slide 2: [{"op": "remove", "path": "/2"}]
    - Move slide 3 to position 1: [{"op": "move", "from": "/3", "path": "/1"}]
    - Add a new slide at end: [{"op": "add", "path": "/-", "value": "# New Slide"}]

    Args:
        patch: JSON Patch operations array. Each operation's path refers to
               the slides array (e.g., "/0" is the first slide).
    """
    markdown = tool_context.state.get("slides_markdown", "")
    if not markdown:
        return {"status": "error", "message": "No slides exist yet. Use write_slides first."}

    slides = _split_slides(markdown)

    try:
        patch_obj = jsonpatch.JsonPatch(patch)
        slides = patch_obj.apply(slides)
    except jsonpatch.JsonPatchException as e:
        return {"status": "error", "message": f"Invalid patch: {e}"}

    tool_context.state["slides_markdown"] = _join_slides(slides)
    return {
        "status": "success",
        "message": f"Patch applied. Deck now has {len(slides)} slides.",
    }
```

**Step 2: Verify module imports**

Run: `cd agent && uv run python -c "from sample_agent.tools import write_slides, edit_slide, get_slides, update_slides; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add agent/sample_agent/tools.py
git commit -m "feat: Add slide manipulation tools (write/edit/get/update)"
```

---

## Task 3: Create ADK Skills

**Files:**
- Create: `agent/sample_agent/skills/lt_structure/SKILL.md`
- Create: `agent/sample_agent/skills/marp_design/SKILL.md`
- Create: `agent/sample_agent/skills/marp_design/references/directives.md`
- Create: `agent/sample_agent/skills/pptx_export/SKILL.md`

**Step 1: Create lt-structure skill**

Create `agent/sample_agent/skills/lt_structure/SKILL.md`:

```markdown
---
name: lt-structure
description: >-
  Lightning Talk (LT) composition patterns and structure guidelines.
  Use when the user wants to create a new LT presentation or restructure
  an existing one. Provides slide count recommendations, structure patterns,
  and audience engagement techniques.
---

# LT Structure Guidelines

## Slide Count by Duration

| Duration | Slides | Pace |
|----------|--------|------|
| 5 min | 5-8 slides | ~1 slide/min, fast-paced |
| 10 min | 8-15 slides | ~1-1.5 slides/min, moderate |
| 20 min | 15-25 slides | ~1 slide/min, detailed |

## Structure Patterns

### Problem-Solution (recommended for technical LTs)
1. **Hook** (1 slide) - Start with a relatable problem or surprising fact
2. **Problem** (1-2 slides) - Define the problem clearly
3. **Solution** (2-4 slides) - Present your approach
4. **Demo/Evidence** (1-2 slides) - Show it works
5. **Takeaway** (1 slide) - One clear message to remember

### Story Arc (recommended for experience sharing)
1. **Setting** (1 slide) - Context and background
2. **Challenge** (1-2 slides) - What you faced
3. **Journey** (2-3 slides) - Steps taken, lessons learned
4. **Resolution** (1 slide) - Outcome and results
5. **Reflection** (1 slide) - What you'd do differently

### Show & Tell (recommended for tool/library introductions)
1. **What** (1 slide) - Name and one-sentence description
2. **Why** (1-2 slides) - Problem it solves
3. **How** (2-4 slides) - Key features with examples
4. **Getting Started** (1 slide) - How to try it today

## Engagement Techniques

- **Opening hook**: Question, statistic, or bold statement in the first slide
- **One idea per slide**: Never put two concepts on one slide
- **Visual > Text**: Use images, diagrams, or code snippets over bullet points
- **Progressive disclosure**: Reveal information step by step
- **Call to action**: End with something the audience can do right now
```

**Step 2: Create marp-design skill**

Create `agent/sample_agent/skills/marp_design/SKILL.md`:

```markdown
---
name: marp-design
description: >-
  Marp Markdown syntax and slide design best practices.
  Use when generating or editing slide content in Marp format.
  Covers directives, layout patterns, color schemes, and typography.
  See references/directives.md for detailed directive reference.
---

# Marp Design Guide

## Basic Structure

Every Marp deck starts with a YAML frontmatter:

```markdown
---
marp: true
theme: default
paginate: true
---
```

Slides are separated by `---` on its own line.

## Layout Patterns

### Title Slide
```markdown
---
marp: true
theme: default
---

# Presentation Title
## Subtitle or Author Name

A brief tagline or date
```

### Content Slide with Bullets
```markdown
## Slide Title

- First point — keep it short
- Second point — one idea per bullet
- Third point — three is ideal
```

### Code Slide
Use fenced code blocks. Marp renders them with syntax highlighting:
````markdown
## Implementation

```python
def hello():
    return "world"
```
````

### Image Slides
```markdown
![bg right:40%](image-url)

## Topic

Content beside the image
```

### Split Layout
```markdown
![bg left:50%](image-url)

## Right Side Content

Text appears on the right half
```

## Color & Typography

### Recommended Palettes for LTs

**Dark Professional**: bg `#1a1a2e`, text `#e0e0e0`, accent `#e94560`
**Light Clean**: bg `#ffffff`, text `#2d3436`, accent `#0984e3`
**Warm Creative**: bg `#ffeaa7`, text `#2d3436`, accent `#d63031`

### Applying Styles

Per-slide styling with scoped directives (underscore prefix):
```markdown
<!-- _backgroundColor: #1a1a2e -->
<!-- _color: #e0e0e0 -->
```

Global styling in frontmatter:
```markdown
---
marp: true
backgroundColor: #1a1a2e
color: #e0e0e0
---
```

## Anti-Patterns

- Never use more than 3 bullet points per slide
- Avoid walls of text — if it needs a paragraph, split into multiple slides
- Don't use default theme without customization — always set colors
- Avoid tiny font sizes — if text doesn't fit, the slide has too much content
```

**Step 3: Create Marp directives reference**

Create `agent/sample_agent/skills/marp_design/references/directives.md`:

```markdown
# Marp Directives Reference

## Global Directives (in frontmatter)

| Directive | Values | Description |
|-----------|--------|-------------|
| `marp` | `true` | Enable Marp rendering |
| `theme` | `default`, `gaia`, `uncover` | Built-in themes |
| `paginate` | `true`, `false` | Show page numbers |
| `header` | string | Header text for all slides |
| `footer` | string | Footer text for all slides |
| `backgroundColor` | CSS color | Default background color |
| `color` | CSS color | Default text color |
| `backgroundImage` | CSS url() | Background image |
| `size` | `16:9`, `4:3` | Slide aspect ratio |
| `math` | `mathjax`, `katex` | Math rendering engine |
| `style` | CSS string | Custom CSS for entire deck |

## Scoped Directives (per-slide, underscore prefix)

Same as global but prefixed with `_` and placed as HTML comments:

```markdown
<!-- _backgroundColor: #000 -->
<!-- _color: #fff -->
<!-- _paginate: false -->
<!-- _header: "" -->
<!-- _footer: "" -->
<!-- _class: special -->
```

## Image Syntax

### Background Images
```
![bg](url)                    Full background
![bg contain](url)            Contain within slide
![bg cover](url)              Cover entire slide (default)
![bg fit](url)                Fit within slide
![bg auto](url)               Original size
![bg left](url)               Left half background
![bg right](url)              Right half background
![bg left:30%](url)           Custom split ratio
![bg right:40%](url)          Custom split ratio
![bg blur:5px](url)           Blur filter
![bg brightness:0.5](url)     Brightness filter
![bg opacity:0.5](url)        Opacity filter
```

### Multiple Backgrounds
```
![bg](url1)
![bg](url2)
```
Renders side by side.

### Inline Images
```
![width:300px](url)           Set width
![height:200px](url)          Set height
![w:300 h:200](url)           Both dimensions
```

## Fragment/Animation

Marp supports `*` prefixed lists for fragment-like behavior:

```markdown
- Item 1
* Item 2 (appears on click in presenter mode)
* Item 3
```

## Presenter Notes

```markdown
<!-- This is a presenter note -->
```

Visible in presenter view, hidden in slides.
```

**Step 4: Create pptx-export skill**

Create `agent/sample_agent/skills/pptx_export/SKILL.md`:

```markdown
---
name: pptx-export
description: >-
  PPTX export procedure using Marp CLI.
  Use when the user wants to download or export their slides as a PowerPoint file.
  Covers the export command, prerequisites, and known limitations.
---

# PPTX Export Guide

## Prerequisites

- Node.js and npm installed on the server
- `@marp-team/marp-cli` installed globally or as a project dependency
- For editable PPTX: LibreOffice Impress must be installed

## Export Command

### Standard PPTX (image-based, high fidelity)
```bash
npx @marp-team/marp-cli input.md --pptx -o output.pptx
```

### Editable PPTX (experimental, requires LibreOffice)
```bash
npx @marp-team/marp-cli input.md --pptx --pptx-editable -o output.pptx
```

## Pre-Export Checklist

Before exporting, verify:
1. Frontmatter has `marp: true`
2. All image URLs are accessible (absolute URLs or local paths)
3. Custom CSS is applied via `style` directive in frontmatter
4. Slide count and content are finalized

## Known Limitations

- Standard PPTX: Slides are PNG screenshots — text is not editable
- Editable PPTX: Experimental feature, visual fidelity may differ from HTML preview
- Editable PPTX: Requires LibreOffice Impress on the server
- Custom fonts may not render correctly in PPTX
- Animated elements are not supported in PPTX output

## Fallback Strategy

If LibreOffice is unavailable, fall back to standard (image-based) PPTX.
Inform the user that the exported file will have high visual fidelity but
text will not be editable in PowerPoint.
```

**Step 5: Verify skill structure**

Run: `find agent/sample_agent/skills -type f | sort`
Expected:
```
agent/sample_agent/skills/lt_structure/SKILL.md
agent/sample_agent/skills/marp_design/SKILL.md
agent/sample_agent/skills/marp_design/references/directives.md
agent/sample_agent/skills/pptx_export/SKILL.md
```

**Step 6: Verify skills load in ADK**

Run: `cd agent && uv run python -c "
from pathlib import Path
from google.adk.skills import load_skill_from_dir
skills_dir = Path('sample_agent/skills')
for name in ['lt_structure', 'marp_design', 'pptx_export']:
    skill = load_skill_from_dir(skills_dir / name)
    print(f'{skill.name}: OK')
"`
Expected:
```
lt-structure: OK
marp-design: OK
pptx-export: OK
```

**Step 7: Commit**

```bash
git add agent/sample_agent/skills/
git commit -m "feat: Add ADK Skills for LT structure, Marp design, and PPTX export"
```

---

## Task 4: Multi-Agent Setup

**Files:**
- Rewrite: `agent/sample_agent/agent.py`

**Step 1: Implement multi-agent configuration**

```python
"""LT Slide Creator - Multi-agent configuration.

Architecture:
- lt_assistant (root): Flash model for fast conversation and skill routing
- slide_author (sub): Claude Opus for high-quality slide generation
"""

from pathlib import Path
from textwrap import dedent

from ag_ui_adk import AGUIToolset
from google.adk.agents.llm_agent import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.skills import load_skill_from_dir
from google.adk.tools.skill_toolset import SkillToolset
from google.genai.types import GenerateContentConfig, ThinkingConfig

from sample_agent.tools import edit_slide, get_slides, update_slides, write_slides

SKILLS_DIR = Path(__file__).parent / "skills"

# --- Load ADK Skills ---
lt_skill = load_skill_from_dir(SKILLS_DIR / "lt_structure")
marp_skill = load_skill_from_dir(SKILLS_DIR / "marp_design")
pptx_skill = load_skill_from_dir(SKILLS_DIR / "pptx_export")

skills = SkillToolset(skills=[lt_skill, marp_skill, pptx_skill])

# --- Claude sub-agent: Slide Author ---
slide_author = Agent(
    model=LiteLlm(model="vertex_ai/claude-opus-4-6"),
    name="slide_author",
    description=dedent("""\
        Specialist in creating and editing LT (Lightning Talk) slide content.
        Generates high-quality Marp Markdown for presentations. Delegate to
        this agent when the user wants to create, edit, or restructure slides.\
    """),
    instruction=dedent("""\
        You are an expert slide author for Lightning Talk presentations.

        Your job is to generate and edit slides in Marp Markdown format.
        Follow the design knowledge loaded by the lead assistant's skills.

        Tool usage guidelines:
        - Use write_slides for creating a new deck or complete rewrites
        - Use edit_slide for targeted text changes in a specific slide
        - Use get_slides to read current slide content before editing
        - Use update_slides (JSON Patch) only for structural operations
          like reordering or deleting slides

        Always use Marp directives for styling (backgroundColor, color, etc.).
        Keep slides concise: one idea per slide, max 3 bullet points.\
    """),
    tools=[write_slides, edit_slide, get_slides, update_slides],
)

# --- Flash root agent: LT Assistant ---
root_agent = Agent(
    name="lt_assistant",
    model="gemini-2.5-flash",
    description="LT presentation creation assistant powered by multi-agent architecture.",
    instruction=dedent("""\
        You are an LT (Lightning Talk) presentation assistant.

        Your role:
        1. Understand the user's presentation goals through conversation
        2. Load relevant skills (lt-structure, marp-design) to guide the process
        3. Delegate slide creation and editing to slide_author

        Workflow:
        - When the user wants to create slides, first load lt-structure skill
          to understand composition patterns, then load marp-design skill for
          syntax guidance, then delegate to slide_author.
        - For simple conversational questions, respond directly without delegation.
        - When the user wants to export to PPTX, load pptx-export skill.

        Always be responsive and keep conversations concise.\
    """),
    generate_content_config=GenerateContentConfig(
        thinking_config=ThinkingConfig(include_thoughts=True),
    ),
    tools=[skills, AGUIToolset()],
    sub_agents=[slide_author],
)
```

**Step 2: Verify agent graph**

Run: `cd agent && uv run python -c "
from sample_agent.agent import root_agent, slide_author
print(f'Root: {root_agent.name} ({root_agent.model})')
print(f'Sub: {slide_author.name} ({slide_author.model})')
print(f'Root sub_agents: {[a.name for a in root_agent.sub_agents]}')
print(f'Slide author tools: {[t.__name__ if callable(t) else str(t) for t in slide_author.tools]}')
"`
Expected:
```
Root: lt_assistant (gemini-2.5-flash)
Sub: slide_author (LiteLlm(...))
Root sub_agents: ['slide_author']
Slide author tools: [...]
```

**Step 3: Commit**

```bash
git add agent/sample_agent/agent.py
git commit -m "feat: Multi-agent setup with Flash root and Claude Opus slide author"
```

---

## Task 5: Backend Integration (main.py)

**Files:**
- Modify: `agent/main.py`

**Step 1: Add PredictStateMapping and enable streaming**

```python
import logging
import warnings

from fastapi import FastAPI
from google.adk.apps import App
from google.adk.apps.app import ResumabilityConfig
from ag_ui_adk import ADKAgent, PredictStateMapping, add_adk_fastapi_endpoint

from sample_agent.agent import root_agent

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logging.getLogger("adk_agent").setLevel(logging.DEBUG)
logging.getLogger("event_translator").setLevel(logging.INFO)
logging.getLogger("session_manager").setLevel(logging.WARNING)
logging.getLogger("endpoint").setLevel(logging.ERROR)

# Suppress experimental warnings
warnings.filterwarnings("ignore", message=".*ResumabilityConfig.*")
warnings.filterwarnings("ignore", message=".*SkillToolset.*")

adk_app = App(
    name="lt_slide_creator",
    root_agent=root_agent,
    resumability_config=ResumabilityConfig(is_resumable=True),
)

agent = ADKAgent.from_app(
    adk_app,
    predict_state=[
        PredictStateMapping(
            state_key="slides_markdown",
            tool="write_slides",
            tool_argument="markdown",
        ),
    ],
    user_id_extractor=lambda input: input.state.get("headers", {}).get(
        "user_id", "anonymous"
    ),
)

app = FastAPI(title="LT Slide Creator API")


@app.get("/health")
async def health():
    return {"status": "ok"}


add_adk_fastapi_endpoint(
    app,
    agent,
    path="/chat",
    extract_headers=["x-user-id", "x-tenant-id"],
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Step 2: Verify server starts**

Run: `cd agent && timeout 5 uv run python main.py 2>&1 || true`
Expected: Server starts without import errors (will timeout after 5s, that's OK)

**Step 3: Commit**

```bash
git add agent/main.py
git commit -m "feat: Add PredictStateMapping for real-time slide streaming"
```

---

## Task 6: Frontend Dependencies

**Files:**
- Modify: `web/package.json`

**Step 1: Install Marpit and CodeMirror packages**

Run from `web/` directory:

```bash
cd web && pnpm add @marp-team/marpit @codemirror/view @codemirror/state @codemirror/lang-markdown @codemirror/lang-css @codemirror/language @codemirror/commands @codemirror/search
```

**Step 2: Verify imports compile**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | head -5`
Expected: No new errors (existing codebase should still compile)

**Step 3: Commit**

```bash
git add web/package.json web/pnpm-lock.yaml
git commit -m "chore: Add Marpit and CodeMirror 6 frontend dependencies"
```

---

## Task 7: Extend ag-ui-agent.ts with State Events

**Files:**
- Modify: `web/src/ag-ui-agent.ts`
- Modify: `web/src/types/events.ts`
- Modify: `web/src/types/index.ts`

**Step 1: Add state event types**

Add to `web/src/types/events.ts`:

```typescript
// --- State Events ---

export type AgUiStateSnapshotEvent = CustomEvent<{
  snapshot: Record<string, unknown>;
}>;

export type AgUiStateDeltaEvent = CustomEvent<{
  delta: unknown[];
}>;

export type AgUiStateChangedEvent = CustomEvent<{
  state: Record<string, unknown>;
}>;

export type AgUiCustomAgEvent = CustomEvent<{
  name: string;
  value: unknown;
}>;
```

Update `web/src/types/index.ts` to re-export the new types.

**Step 2: Add state subscriber callbacks to ag-ui-agent.ts**

In `_initAgent()`, add these to the subscriber object:

```typescript
onStateSnapshotEvent: (params) => {
  this._dispatchEvent("ag-ui-state-snapshot", {
    snapshot: params.event.snapshot,
  } satisfies AgUiStateSnapshotEvent["detail"]);
  return { state: params.event.snapshot };
},

onStateDeltaEvent: (params) => {
  this._dispatchEvent("ag-ui-state-delta", {
    delta: params.event.delta,
  } satisfies AgUiStateDeltaEvent["detail"]);
},

onCustomEvent: (params) => {
  this._dispatchEvent("ag-ui-custom", {
    name: params.event.name,
    value: params.event.value,
  } satisfies AgUiCustomAgEvent["detail"]);
},

onStateChanged: (params) => {
  this._dispatchEvent("ag-ui-state-changed", {
    state: params.state,
  } satisfies AgUiStateChangedEvent["detail"]);
},
```

**Step 3: Add setState method to ag-ui-agent.ts**

```typescript
setState(state: Record<string, unknown>): void {
  this._agent?.setState(state);
}

get state(): Record<string, unknown> {
  return (this._agent?.state as Record<string, unknown>) ?? {};
}
```

**Step 4: Update sendMessage to include state**

Ensure the agent's state is sent with each run. The HttpAgent already manages state internally via subscriber mutations, so `setState()` before `sendMessage()` is the pattern the parent app will use.

**Step 5: Verify TypeScript compiles**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add web/src/ag-ui-agent.ts web/src/types/events.ts web/src/types/index.ts
git commit -m "feat: Add state event handling to ag-ui-agent (snapshot, delta, custom)"
```

---

## Task 8: Slide Preview Component

**Files:**
- Create: `web/src/custom-elements/slide-preview.ts`

**Step 1: Implement slide-preview with Marpit**

```typescript
import Marpit from "@marp-team/marpit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/**
 * Renders Marp Markdown as HTML slides using Marpit.
 * Pure rendering component — receives markdown, outputs slides.
 */
@customElement("slide-preview")
export class SlidePreview extends LitElement {
  @property({ type: String })
  markdown = "";

  @property({ type: String, attribute: "custom-css" })
  customCss = "";

  @property({ type: Number, attribute: "current-slide" })
  currentSlide = 0;

  @state()
  private _slideCount = 0;

  private _marpit = new Marpit();

  render() {
    const { html: slidesHtml, css: slidesCss } = this._marpit.render(
      this.markdown || "# No slides yet\n\nStart by describing your LT topic in the chat.",
    );

    // Count slides from rendered HTML
    const slideMatches = slidesHtml.match(/<section/g);
    this._slideCount = slideMatches?.length ?? 0;

    return html`
      <div class="preview-container">
        <div class="slide-viewport">
          <div class="slides-wrapper">
            <style>${slidesCss}${this.customCss}</style>
            ${this._renderSlides(slidesHtml)}
          </div>
        </div>
        <div class="slide-nav" aria-label="Slide navigation">
          <button
            @click=${this._prevSlide}
            ?disabled=${this.currentSlide <= 0}
            aria-label="Previous slide"
          >&lt;</button>
          <span>${this.currentSlide + 1} / ${this._slideCount || 1}</span>
          <button
            @click=${this._nextSlide}
            ?disabled=${this.currentSlide >= this._slideCount - 1}
            aria-label="Next slide"
          >&gt;</button>
        </div>
      </div>
    `;
  }

  private _renderSlides(slidesHtml: string) {
    // Marpit renders <section> elements; we inject them via innerHTML
    const container = document.createElement("div");
    container.innerHTML = slidesHtml;
    const sections = container.querySelectorAll("section");

    // Show only the current slide
    for (let i = 0; i < sections.length; i++) {
      if (i !== this.currentSlide) {
        sections[i].style.display = "none";
      }
    }

    // Use unsafeHTML or direct innerHTML injection
    const wrapper = document.createElement("div");
    wrapper.innerHTML = container.innerHTML;
    return html`${wrapper}`;
  }

  private _prevSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this._dispatchSlideChange();
    }
  }

  private _nextSlide() {
    if (this.currentSlide < this._slideCount - 1) {
      this.currentSlide++;
      this._dispatchSlideChange();
    }
  }

  private _dispatchSlideChange() {
    this.dispatchEvent(
      new CustomEvent("slide-change", {
        detail: { index: this.currentSlide },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .preview-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .slide-viewport {
      flex: 1;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      border-radius: 8px;
      padding: 16px;
    }

    .slides-wrapper {
      width: 100%;
      max-width: 960px;
      aspect-ratio: 16 / 9;
      background: white;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .slides-wrapper section {
      width: 100%;
      height: 100%;
      padding: 40px;
      box-sizing: border-box;
    }

    .slide-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 12px;
    }

    .slide-nav button {
      padding: 4px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 16px;

      &:disabled {
        opacity: 0.3;
        cursor: default;
      }

      &:hover:not(:disabled) {
        background: #f0f0f0;
      }
    }

    .slide-nav span {
      font-size: 14px;
      color: #666;
      min-width: 60px;
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "slide-preview": SlidePreview;
  }
}
```

Note: The exact Marpit rendering approach may need adjustment during implementation. The Marpit API returns `{ html, css }` from `render()`. The implementer should check Marpit's actual default export and constructor API, and adjust imports accordingly (e.g., `import Marpit from '@marp-team/marpit'` or `import { Marpit } from '@marp-team/marpit'`).

**Step 2: Verify TypeScript compiles**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: No errors (may need import adjustments)

**Step 3: Commit**

```bash
git add web/src/custom-elements/slide-preview.ts
git commit -m "feat: Add slide-preview component with Marpit rendering"
```

---

## Task 9: Code Editor Component

**Files:**
- Create: `web/src/custom-elements/code-editor.ts`

**Step 1: Implement CodeMirror 6 wrapper**

```typescript
import { css as cmCss } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

type EditorLanguage = "markdown" | "css";

/**
 * CodeMirror 6 editor wrapped as a Lit custom element.
 * Supports Markdown and CSS syntax highlighting.
 */
@customElement("code-editor")
export class CodeEditor extends LitElement {
  @property({ type: String })
  value = "";

  @property({ type: String })
  language: EditorLanguage = "markdown";

  @property({ type: String })
  label = "Editor";

  @query(".editor-container")
  private _container!: HTMLDivElement;

  private _view: EditorView | null = null;
  private _suppressUpdate = false;

  protected firstUpdated() {
    this._initEditor();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._view?.destroy();
    this._view = null;
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("value") && this._view) {
      const currentValue = this._view.state.doc.toString();
      if (currentValue !== this.value) {
        this._suppressUpdate = true;
        this._view.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: this.value,
          },
        });
        this._suppressUpdate = false;
      }
    }
  }

  private _initEditor() {
    const languageExtension =
      this.language === "css" ? cmCss() : markdown();

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !this._suppressUpdate) {
        const newValue = update.state.doc.toString();
        this.dispatchEvent(
          new CustomEvent("value-changed", {
            detail: { value: newValue },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });

    const state = EditorState.create({
      doc: this.value,
      extensions: [basicSetup, languageExtension, updateListener],
    });

    this._view = new EditorView({
      state,
      parent: this._container,
    });
  }

  render() {
    return html`
      <div class="editor-wrapper">
        <div class="editor-label">${this.label}</div>
        <div class="editor-container" role="textbox" aria-label=${this.label}></div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .editor-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .editor-label {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e0e0e0;
      background: #fafafa;
    }

    .editor-container {
      flex: 1;
      overflow: auto;
    }

    /* CodeMirror fills its container */
    .editor-container .cm-editor {
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "code-editor": CodeEditor;
  }
}
```

Note: The `codemirror` package provides `basicSetup` — verify this import works. If not, import `basicSetup` from `@codemirror/basic-setup` or construct manually from individual extensions.

**Step 2: Verify TypeScript compiles**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: No errors (may need import adjustments)

**Step 3: Commit**

```bash
git add web/src/custom-elements/code-editor.ts
git commit -m "feat: Add code-editor component wrapping CodeMirror 6"
```

---

## Task 10: Slide App (Main Application)

**Files:**
- Create: `web/src/slide-app.ts`

**Step 1: Implement the 2-column slide application**

This is the main app component replacing `chat-app.ts`. It manages state between chat, editors, and preview.

```typescript
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
    this._loading = { position: "left", variant: "secondary", avatar: "A" };
  };

  private _handleRunFailed = (e: AgUiRunFailedEvent) => {
    this._isRunning = false;
    this._loading = null;
    if (e.detail.error instanceof Error && e.detail.error.name === "AbortError") return;
    const message = e.detail.error instanceof Error
      ? e.detail.error.message : "Unknown error";
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
        avatar: msg.role === "user" ? "U" : "A",
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
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join("");
    }
    return "";
  }

  private _computeLoading(messages: Message[]): ChatLoadingData | null {
    if (!this._isRunning) return null;
    const lastMessage = messages.at(-1);
    if (lastMessage?.role === "assistant" && this._getContentText(lastMessage.content)) {
      return null;
    }
    return { position: "left", variant: "secondary", avatar: "A",
      reasoning: this._reasoningContent || undefined };
  }

  private _addErrorToast(message: string) {
    this._toasts = [
      ...this._toasts,
      { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        message, type: "error", noAutoDismiss: true },
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
```

**Step 2: Verify TypeScript compiles**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add web/src/slide-app.ts
git commit -m "feat: Add slide-app with 2-column layout, editors, and preview"
```

---

## Task 11: Update Entry Points

**Files:**
- Modify: `web/index.html`
- Modify: `web/src/index.css` (if layout adjustments needed)

**Step 1: Switch index.html to use slide-app**

Replace `<chat-app>` with `<slide-app>` and update the script import:

```html
<!-- Change the main component -->
<slide-app></slide-app>

<!-- Update script src if needed -->
<script type="module" src="/src/slide-app.ts"></script>
```

Keep the existing `<chat-app>` script import commented out for reference.

**Step 2: Ensure body fills viewport**

Verify `web/src/index.css` has:
```css
html, body {
  height: 100%;
  margin: 0;
}
```

**Step 3: Verify dev server starts**

Run: `cd web && pnpm dev &`
Then open `http://localhost:5173` in browser.
Expected: 2-column layout visible — chat on left, empty slide preview on right, editors at bottom right.

**Step 4: Commit**

```bash
git add web/index.html web/src/index.css
git commit -m "feat: Switch entry point to slide-app with 2-column layout"
```

---

## Task 12: End-to-End Verification

**Step 1: Start backend**

```bash
cd agent && uv run python main.py
```

Prerequisite: `GOOGLE_API_KEY` or Vertex AI credentials configured.
Expected: Server starts on port 8000.

**Step 2: Start frontend**

```bash
cd web && pnpm dev
```

Expected: Dev server starts on port 5173.

**Step 3: Verify the following scenarios manually**

1. **Chat works**: Type a message in the chat → Flash agent responds
2. **Skill loading**: Ask "Create a 5-minute LT about TypeScript" → Agent should load lt-structure and marp-design skills
3. **Slide generation**: After skill loading, agent delegates to slide_author → Claude generates Marp Markdown → slides_markdown state updates → preview shows slides
4. **Real-time streaming**: During slide generation, preview updates incrementally (Predictive State)
5. **Editor sync**: After generation, Markdown editor shows the generated content
6. **Direct editing**: Edit Markdown in the editor → preview updates immediately
7. **Bidirectional**: Edit in editor, then ask agent to "change the title" → agent reads updated state
8. **Slide navigation**: Click prev/next buttons to navigate between slides

**Step 4: Fix any issues found during verification**

Likely areas that may need adjustment:
- Marpit import/constructor API
- CodeMirror `basicSetup` import path
- State sync timing between Predictive State events and editor updates
- CSS layout fine-tuning

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix: Integration adjustments from end-to-end testing"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Backend dependencies | `pyproject.toml` |
| 2 | Slide tools | `tools.py` |
| 3 | ADK Skills | `skills/*/SKILL.md` |
| 4 | Multi-agent setup | `agent.py` |
| 5 | Backend integration | `main.py` |
| 6 | Frontend dependencies | `package.json` |
| 7 | State events in ag-ui-agent | `ag-ui-agent.ts`, `types/` |
| 8 | Slide preview | `slide-preview.ts` |
| 9 | Code editor | `code-editor.ts` |
| 10 | Slide app | `slide-app.ts` |
| 11 | Entry points | `index.html` |
| 12 | E2E verification | Manual testing |
