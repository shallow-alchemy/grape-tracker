#!/bin/sh
set -e

echo "Starting entrypoint..."
echo "Deploying permissions..."

zero-deploy-permissions --schema-path /app/schema.cjs --upstream-db "$ZERO_UPSTREAM_DB"

echo "Permissions deployed, starting zero-cache..."

exec zero-cache
