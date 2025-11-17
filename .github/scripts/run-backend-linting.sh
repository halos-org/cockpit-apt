#!/bin/bash
# Run backend linting with ruff in Docker container

set -e

echo "Running ruff linting..."
docker compose -f docker/docker-compose.devtools.yml run --rm --user root devtools bash -c "cd backend && uv sync --extra dev && uv run ruff check --ignore SIM117,B904,E501 ."
echo "✅ Linting complete"
