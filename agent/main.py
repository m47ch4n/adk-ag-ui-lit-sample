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
