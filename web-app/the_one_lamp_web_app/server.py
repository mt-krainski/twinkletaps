import os
from typing import Literal

from pydantic import BaseModel
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
import redis

from .token_auth import TokenValidation
from .redis import RedisBoolean


OK = Literal["OK"]
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
redis_state_ttl_env_value = os.getenv("REDIS_STATE_TTL")
REDIS_STATE_TTL = (
    int(redis_state_ttl_env_value) if redis_state_ttl_env_value is not None else None
)
templates = Jinja2Templates(directory="the_one_lamp_web_app/templates")

app = FastAPI()
cache = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
LAMP_STATE = "lamp-state"
lamp_state = RedisBoolean(cache, LAMP_STATE, False, ttl=REDIS_STATE_TTL)


class LampState(BaseModel):
    state: bool


@app.get("/{user_token}/state")
async def get_state(request: Request, user: TokenValidation) -> LampState:
    state = lamp_state.get()
    return LampState(state=state)


@app.post("/{user_token}/state")
async def post_state(request: Request, state: LampState, user: TokenValidation) -> OK:
    lamp_state.set(state.state)
    return "OK"


@app.post("/{user_token}/state/toggle")
async def post_toggle_state(request: Request, user: TokenValidation) -> LampState:
    value = lamp_state.toggle()
    return LampState(state=value)


@app.get("/{user_token}")
async def main(request: Request, user: TokenValidation):
    return templates.TemplateResponse(
        "index.html", {"request": request, "user": user["user"], "token": user["token"]}
    )
