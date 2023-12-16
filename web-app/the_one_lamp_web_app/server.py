from datetime import datetime
import os
from typing import Literal, Optional

from pydantic import BaseModel
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
import redis

from .token_auth import TokenValidation
from .redis import RedisBoolean, RedisDatetime, RedisInt


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
LAMP_LAST_HIT = "lamp-last-hit"
lamp_last_hit = RedisDatetime(cache, LAMP_LAST_HIT, ttl=REDIS_STATE_TTL)
HEARTS_COUNT = "hearts-count"
hearts_count = RedisInt(cache, HEARTS_COUNT, 0)


class LampState(BaseModel):
    state: bool
    active: bool


class IncrementHeartsRequst(BaseModel):
    count: int


class HeartsCount(BaseModel):
    count: int


@app.get("/{user_token}/state")
async def get_state(
    request: Request, user: TokenValidation, caller: Optional[str] = None
) -> LampState:
    state = lamp_state.get()
    if caller == "one-lamp":
        lamp_last_hit.set(datetime.now())
        return LampState(state=state, active=True)

    return LampState(state=state, active=_is_lamp_active())


@app.post("/{user_token}/state")
async def post_state(request: Request, state: LampState, user: TokenValidation) -> OK:
    lamp_state.set(state.state)
    return "OK"


@app.post("/{user_token}/hearts/add")
async def add_hearts(
    request: Request, increment: IncrementHeartsRequst, user: TokenValidation
) -> OK:
    hearts_count.add(increment.count)
    return "OK"


@app.get("/{user_token}/hearts")
async def get_hearts(request: Request, user: TokenValidation) -> HeartsCount:
    return HeartsCount(count=hearts_count.get())


@app.post("/{user_token}/hearts/clear")
async def clear_hearts(request: Request, user: TokenValidation) -> HeartsCount:
    count = hearts_count.set(0)
    return HeartsCount(count=count)


@app.post("/{user_token}/state/toggle")
async def post_toggle_state(request: Request, user: TokenValidation) -> LampState:
    value = lamp_state.toggle()
    return LampState(state=value, active=_is_lamp_active())


@app.get("/{user_token}")
async def main(request: Request, user: TokenValidation):
    return templates.TemplateResponse(
        "index.html", {"request": request, "user": user["user"], "token": user["token"]}
    )


def _is_lamp_active():
    last_hit = lamp_last_hit.get()
    if last_hit is None:
        return False
    if (datetime.now() - last_hit).total_seconds() > 15:
        return False
    return True
