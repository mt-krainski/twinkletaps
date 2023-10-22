import os
import secrets
from typing import Annotated, TypedDict

from fastapi import Depends, HTTPException, status


class TokenCredentials(TypedDict):
    user: str
    token: str


API_TOKEN = os.getenv("API_TOKEN", "").encode("utf8")
API_USERNAME = os.getenv("API_USERNAME", "user")


def validate_token(user_token: str) -> TokenCredentials:
    token_b = user_token.encode("utf8")
    is_correct_token = secrets.compare_digest(token_b, API_TOKEN)
    if not is_correct_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return {"user": API_USERNAME, "token": user_token}


TokenValidation = Annotated[TokenCredentials, Depends(validate_token)]
