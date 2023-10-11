from typing import Literal
from pydantic import BaseModel
from fastapi import FastAPI
import redis

from .redis import RedisBoolean


OK = Literal["OK"]

app = FastAPI()
cache = redis.Redis(host="localhost", port=6379)
LAMP_STATE = "lamp-state"
lamp_state = RedisBoolean(cache, LAMP_STATE, False)


class LampState(BaseModel):
    state: bool


def init():
    if cache.get(LAMP_STATE) is None:
        cache.set(LAMP_STATE, b"False")


@app.get("/state")
async def get_state() -> LampState:
    state = lamp_state.get()
    return LampState(state=state)


@app.post("/state")
async def post_state(state: LampState) -> OK:
    lamp_state.set(state.state)
    return "OK"


@app.post("/state/toggle")
async def post_toggle_state() -> LampState:
    value = lamp_state.toggle()
    return LampState(state=value)


init()
