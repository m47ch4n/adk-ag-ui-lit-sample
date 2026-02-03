from typing import Dict
from ag_ui_adk import AGUIToolset
from google.adk.agents.llm_agent import Agent

async def test_agent_tool() -> Dict[str, str]:
    """
    test agent tool
    """
    return { "status": "success", "message": "test_agent_tool invoked" }

root_agent = Agent(
    name="root_agent",
    model="gemini-2.5-flash",
    description="A helpful assistant for user questions.",
    instruction="Answer user questions to the best of your knowledge",
    tools=[
        AGUIToolset(),
    ],
)
