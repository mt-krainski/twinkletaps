#!/usr/bin/env bash

# Smoke test for HiveMQ broker.
# Starts the container, verifies MQTT pub/sub, then tears down.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"
PROJECT_NAME="hivemq-smoke-test"
RESULT_FILE=$(mktemp /tmp/mqtt-smoke-XXXXXX)

cleanup() {
  echo "Tearing down..."
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down --volumes --remove-orphans 2>/dev/null
  rm -f "$RESULT_FILE"
}
trap cleanup EXIT

# Override auth so the smoke test can do anonymous pub/sub without a running backend
export HIVEMQ_ALLOW_ALL_CLIENTS=true

echo "Starting HiveMQ broker..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d

echo "Waiting for broker to be healthy..."
RETRIES=30
while [ $RETRIES -gt 0 ]; do
  STATUS=$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | head -1 || true)
  if echo "$STATUS" | grep -q "healthy"; then
    echo "Broker is healthy"
    break
  fi
  RETRIES=$((RETRIES - 1))
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo "ERROR: Broker did not become healthy in time"
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs
  exit 1
fi

echo "Verifying WebSocket port..."
timeout 5 bash -c 'echo > /dev/tcp/localhost/8000' || { echo "FAIL: WebSocket port 8000 not accessible"; exit 1; }
echo "WebSocket port 8000 is accessible"

if ! command -v mosquitto_pub &> /dev/null; then
  echo "ERROR: mosquitto_pub not found. Install mosquitto-clients (apt) or mosquitto (brew)."
  exit 1
fi

TOPIC="twinkletaps/smoke-test"
MESSAGE="hello-$(date +%s)"

echo "Starting subscriber..."
timeout 10 mosquitto_sub -h localhost -p 1883 -t "$TOPIC" -C 1 > "$RESULT_FILE" &
SUB_PID=$!
sleep 2

echo "Publishing test message..."
mosquitto_pub -h localhost -p 1883 -t "$TOPIC" -m "$MESSAGE"

wait $SUB_PID 2>/dev/null || true
RECEIVED=$(cat "$RESULT_FILE" 2>/dev/null || true)

if [ "$RECEIVED" = "$MESSAGE" ]; then
  echo "PASS: pub/sub verified (received: $RECEIVED)"
else
  echo "FAIL: expected '$MESSAGE', got '$RECEIVED'"
  exit 1
fi

echo "Smoke test passed!"
