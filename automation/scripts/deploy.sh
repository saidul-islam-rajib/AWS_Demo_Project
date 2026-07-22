#!/bin/bash
# Blue-Green Deployment Script for NestJS Application
set -e

IMAGE_TAG="${1:-latest}"
IMAGE_NAME="nestjs-image:${IMAGE_TAG}"
VOLUME_NAME="blog_data"
ENV_FILE="/opt/blog/.env"
BLUE_PORT=3001
GREEN_PORT=3002
HEALTH_ENDPOINT="/health"

# Create data volume if it doesn't exist
docker volume create ${VOLUME_NAME} || true

# Load environment variables
ENV_ARG=""
if [ -r "${ENV_FILE}" ]; then
  ENV_ARG="--env-file ${ENV_FILE}"
  echo "Loading secrets from ${ENV_FILE}"
fi

# Determine which color is currently active
ACTIVE_PORT=""
if command -v caddy &> /dev/null; then
  ACTIVE_PORT=$(grep -o '127\.0\.0\.1:[0-9]*' /etc/caddy/upstream.conf 2>/dev/null | head -1 | cut -d: -f2 || echo "")
fi

# Decide which environment to deploy to
if [ "${ACTIVE_PORT}" = "${BLUE_PORT}" ]; then
  NEW_COLOR="green"
  NEW_PORT=${GREEN_PORT}
  OLD_COLOR="blue"
  OLD_PORT=${BLUE_PORT}
else
  NEW_COLOR="blue"
  NEW_PORT=${BLUE_PORT}
  OLD_COLOR="green"
  OLD_PORT=${GREEN_PORT}
fi

NEW_NAME="nestjs-app-${NEW_COLOR}"
OLD_NAME="nestjs-app-${OLD_COLOR}"

if [ -z "${ACTIVE_PORT}" ]; then
  echo "Active upstream: none — deploying ${NEW_COLOR} on ${NEW_PORT}."
else
  echo "Active upstream: ${OLD_COLOR} on ${OLD_PORT} → deploying ${NEW_COLOR} on ${NEW_PORT}."
fi

# Stop and remove existing container for the new color (if any)
docker stop ${NEW_NAME} 2>/dev/null || true
docker rm ${NEW_NAME} 2>/dev/null || true

# Start the new container
docker run -d \
  --name ${NEW_NAME} \
  --restart unless-stopped \
  -p 127.0.0.1:${NEW_PORT}:3000 \
  -v ${VOLUME_NAME}:/app/data \
  ${ENV_ARG} \
  ${IMAGE_NAME}

# Wait for the new container to become healthy
echo "Waiting for ${NEW_COLOR} to answer on ${NEW_PORT}..."
ok=""
for i in $(seq 1 20); do
  if curl -fsS --max-time 3 "http://127.0.0.1:${NEW_PORT}${HEALTH_ENDPOINT}"; then
    echo "  healthy after ${i} attempt(s)."
    ok="yes"
    break
  fi
  sleep 2
done

if [ -z "${ok}" ]; then
  echo "ERROR: ${NEW_COLOR} did not become healthy in time!"
  docker logs ${NEW_NAME} --tail 50
  exit 1
fi

# Switch Caddy upstream to the new container
sh scripts/switch-upstream.sh ${NEW_PORT}

# Optional: Stop the old container after successful deployment
if [ -n "${ACTIVE_PORT}" ]; then
  echo "Stopping old ${OLD_COLOR} container..."
  docker stop ${OLD_NAME} 2>/dev/null || true
fi

echo "Deployment complete! ${NEW_COLOR} is now live on port ${NEW_PORT}."
