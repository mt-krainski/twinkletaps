import os
import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, status


API_TOKEN = os.getenv("API_TOKEN", "").encode("utf8")


def validate_token(user_token: str):
    token_b = user_token.encode("utf8")
    is_correct_token = secrets.compare_digest(token_b, API_TOKEN)
    if not is_correct_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return "user"


TokenValidation = Annotated[str, Depends(validate_token)]
