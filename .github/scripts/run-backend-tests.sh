#!/bin/bash
# Run backend tests in Docker container
# Checks for test pass/fail in output

set +e
output=$(docker compose -f docker/docker-compose.devtools.yml run --rm --user root devtools bash -c "uv sync --extra dev && uv run pytest" 2>&1)
echo "$output"

if echo "$output" | grep -q "passed" && ! echo "$output" | grep -q "failed"; then
  echo "✅ All backend tests passed"
  exit 0
else
  echo "❌ Backend tests failed"
  exit 1
fi
