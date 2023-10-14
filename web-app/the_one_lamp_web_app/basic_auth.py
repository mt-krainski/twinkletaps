import os
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

app = FastAPI()

security = HTTPBasic()
USERNAME = os.getenv("BASIC_AUTH_USERNAME", "").encode("utf8")
PASSWORD = os.getenv("BASIC_AUTH_PASSWORD", "").encode("utf8")

if USERNAME == b"" or PASSWORD == b"":
    raise Exception(
        "Invalid configuration, BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD env "
        "variables have to be set"
    )


def validate_user(credentials: Annotated[HTTPBasicCredentials, Depends(security)]):
    current_username_bytes = credentials.username.encode("utf8")
    is_correct_username = secrets.compare_digest(current_username_bytes, USERNAME)
    current_password_bytes = credentials.password.encode("utf8")
    is_correct_password = secrets.compare_digest(current_password_bytes, PASSWORD)
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


UserValidation = Annotated[str, Depends(validate_user)]
