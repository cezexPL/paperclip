#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${REGISTRY:-127.0.0.1:30500}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

IMAGE="${REGISTRY}/paperclip/server:${TAG}"
IMAGE_LATEST="${REGISTRY}/paperclip/server:latest"

echo "Building image: ${IMAGE}"
docker build --no-cache \
  -f deploy/Dockerfile \
  -t "${IMAGE}" \
  -t "${IMAGE_LATEST}" \
  .

echo "Pushing images to ${REGISTRY}"
docker push "${IMAGE}"
docker push "${IMAGE_LATEST}"

cat <<EOF
Image pushed successfully.
  image=${IMAGE}
  latest=${IMAGE_LATEST}
  tag=${TAG}
EOF
