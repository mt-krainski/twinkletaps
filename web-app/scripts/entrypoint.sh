#!/usr/bin/env sh

uvicorn the_one_lamp_web_app.server:app --host 0.0.0.0 --port ${PORT} --workers ${WORKERS}
