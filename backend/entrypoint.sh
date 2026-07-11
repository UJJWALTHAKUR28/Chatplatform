#!/bin/sh
# entrypoint.sh — run before the main Daphne process starts
# This script is executed as the container ENTRYPOINT.
#
# Railway injects $PORT automatically. Fallback to 8000 for local Docker.

set -e  # Exit immediately on any error

PORT="${PORT:-8000}"

echo "==> Running database migrations…"
python manage.py migrate --noinput

echo "==> Collecting static files…"
python manage.py collectstatic --noinput --clear

echo "==> Starting Daphne ASGI server on 0.0.0.0:${PORT}…"
exec daphne \
    -b 0.0.0.0 \
    -p "${PORT}" \
    --websocket_timeout 86400 \
    --ping-interval 20 \
    --ping-timeout 30 \
    core.asgi:application
