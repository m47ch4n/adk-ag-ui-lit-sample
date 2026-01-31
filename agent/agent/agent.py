from google.adk.agents.llm_agent import Agent

root_agent = Agent(
    name="root_agent",
    model="gemini-2.5-flash",
    description="A helpful assistant for user questions.",
    instruction="Answer user questions to the best of your knowledge",
    tools=[
        # AGUIToolset(),
    ]
)
