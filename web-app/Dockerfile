FROM python:3.11-alpine

WORKDIR /app

ARG POETRY_VERSION

ENV \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_VERSION=${POETRY_VERSION}

RUN pip install "poetry==$POETRY_VERSION"
COPY poetry.lock pyproject.toml ./

RUN poetry config virtualenvs.create false
RUN poetry install --without dev --no-interaction --no-ansi --no-root

COPY the_one_lamp_web_app ./the_one_lamp_web_app
COPY scripts ./scripts

# Poetry requires a readme file to be present
RUN touch README.md

RUN poetry install --only-root

CMD ["./scripts/entrypoint.sh"]