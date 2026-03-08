"""LT Slide Creator - Multi-agent configuration.

Architecture:
- lt_assistant (root): Flash Lite for fast conversation and skill routing
- slide_author (sub): Pro for high-quality slide generation
"""

from pathlib import Path
from textwrap import dedent

from ag_ui_adk import AGUIToolset
from google.adk.agents.llm_agent import Agent
from google.adk.skills import load_skill_from_dir
from google.adk.tools.skill_toolset import SkillToolset
from google.genai.types import GenerateContentConfig, ThinkingConfig

from sample_agent.tools import edit_slide, get_slides, update_slides, write_slides

SKILLS_DIR = Path(__file__).parent / "skills"

# --- Load ADK Skills ---
lt_skill = load_skill_from_dir(SKILLS_DIR / "lt-structure")
marp_skill = load_skill_from_dir(SKILLS_DIR / "marp-design")
pptx_skill = load_skill_from_dir(SKILLS_DIR / "pptx-export")

skills = SkillToolset(skills=[lt_skill, marp_skill, pptx_skill])

# --- Sub-agent: Slide Author ---
slide_author = Agent(
    model="gemini-3.1-pro-preview",
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

# --- Root agent: LT Assistant ---
root_agent = Agent(
    name="lt_assistant",
    model="gemini-3.1-flash-lite-preview",
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
