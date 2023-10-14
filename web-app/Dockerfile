FROM python:3.11-alpine

WORKDIR /app

ENV ENV=prod \
    PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_VERSION=1.6.1

RUN pip install "poetry==$POETRY_VERSION"
COPY poetry.lock pyproject.toml ./

RUN poetry config virtualenvs.create false
RUN poetry install --without dev --no-interaction --no-ansi --no-root

COPY the_one_lamp_web_app ./web_app
COPY scripts ./scripts

RUN poetry install --only-root

CMD ["./scripts/entrypoint.sh"]