import logging

from fastapi import FastAPI
from google.adk.apps import App
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint

from agent.agent.agent import root_agent

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logging.getLogger("adk_agent").setLevel(logging.DEBUG)
logging.getLogger("event_translator").setLevel(logging.INFO)
logging.getLogger("session_manager").setLevel(logging.WARNING)
logging.getLogger("endpoint").setLevel(logging.ERROR)

adk_app = App(
    name="sample_app",
    root_agent=root_agent,
)

agent = ADKAgent.from_app(
    adk_app,
    user_id_extractor=lambda input: input.state.get("headers", {}).get(
        "user_id", "anonymous"
    ),
)

app = FastAPI(title="ADK Agent API")


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
