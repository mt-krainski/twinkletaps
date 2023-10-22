import os
from typing import Literal

from pydantic import BaseModel
from fastapi import FastAPI
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

app = FastAPI()
cache = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
LAMP_STATE = "lamp-state"
lamp_state = RedisBoolean(cache, LAMP_STATE, False, ttl=REDIS_STATE_TTL)


class LampState(BaseModel):
    state: bool


def init():
    if cache.get(LAMP_STATE) is None:
        cache.set(LAMP_STATE, b"False")


@app.get("/{user_token}/state")
async def get_state(user: TokenValidation) -> LampState:
    state = lamp_state.get()
    return LampState(state=state)


@app.post("/{user_token}/state")
async def post_state(state: LampState, user: TokenValidation) -> OK:
    lamp_state.set(state.state)
    return "OK"


@app.post("/{user_token}/state/toggle")
async def post_toggle_state(user: TokenValidation) -> LampState:
    value = lamp_state.toggle()
    return LampState(state=value)


init()
