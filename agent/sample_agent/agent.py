from ag_ui_adk import AGUIToolset
from google.adk.agents.llm_agent import Agent
from google.genai.types import GenerateContentConfig, ThinkingConfig

root_agent = Agent(
    name="root_agent",
    model="gemini-3-flash-preview",
    description="A helpful assistant for user questions.",
    instruction="Answer user questions to the best of your knowledge",
    generate_content_config=GenerateContentConfig(
        thinking_config=ThinkingConfig(include_thoughts=True),
    ),
    tools=[
        AGUIToolset(),
    ],
)
