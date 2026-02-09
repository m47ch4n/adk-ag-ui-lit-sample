import logging

from fastapi import FastAPI
from google.adk.apps import App
from google.adk.agents import RunConfig
from google.adk.agents.run_config import StreamingMode
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint

from sample_agent.agent import root_agent

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
    # Disable SSE streaming to work around partial FunctionCall events not
    # being persisted to the session (google/adk-python#4311). With
    # StreamingMode.SSE (the default), Gemini emits FunctionCalls in partial
    # events which the ADK runner skips when persisting. The ag-ui-adk
    # middleware then detects LRO in the partial event and returns early, so
    # the aggregated event is never processed, causing a ValueError in
    # _rearrange_events_for_latest_function_response. StreamingMode.NONE
    # ensures FunctionCalls only appear in non-partial events that are always
    # persisted. See also:
    # https://github.com/ag-ui-protocol/ag-ui/blob/main/integrations/adk-middleware/python/STREAMING_FC_ARGS_RECONSTRUCTION.md
    run_config_factory=lambda input: RunConfig(
        streaming_mode=StreamingMode.NONE,
        save_input_blobs_as_artifacts=True,
    ),
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
