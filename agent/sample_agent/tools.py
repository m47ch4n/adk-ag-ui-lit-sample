"""Slide manipulation tools for the LT Slide Creator.

Medium-granularity tool design inspired by Claude Code:
- write_slides / edit_slide = specialized (preferred)
- update_slides = universal fallback (JSON Patch)
"""

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
