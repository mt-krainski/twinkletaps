#!/usr/bin/env sh

uvicorn web_app.server:app --host 0.0.0.0 --port ${PORT} --workers ${WORKERS}
