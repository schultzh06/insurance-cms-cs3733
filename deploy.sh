#!/usr/bin/env bash
set -euo pipefail

REGISTRY="potatorocket"
IMAGES=(
  "softeng-frontend:apps/frontend/Dockerfile"
  "softeng-backend:apps/backend/Dockerfile"
  "softeng-ml-server:apps/python/Dockerfile"
)
REMOTE_HOST="elitedesk-1"
REMOTE_DIR="/opt/compose/softeng-demo"

cd "$(dirname "$0")"

echo "==> Building images..."
for entry in "${IMAGES[@]}"; do
  name="${entry%%:*}"
  dockerfile="${entry#*:}"
  echo "    $name"
  docker build -f "$dockerfile" -t "$REGISTRY/$name:latest" .
done

echo "==> Pushing images..."
for entry in "${IMAGES[@]}"; do
  name="${entry%%:*}"
  echo "    $name"
  docker push "$REGISTRY/$name:latest"
done

echo "==> Deploying on $REMOTE_HOST..."

ssh "$REMOTE_HOST" "cd $REMOTE_DIR && sudo docker compose pull && sudo docker compose up -d --force-recreate"

echo "==> Done."
