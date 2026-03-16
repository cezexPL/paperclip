#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-paperclip}"
RELEASE="${RELEASE:-paperclip}"
CHART_DIR="${CHART_DIR:-deploy/helm/paperclip}"
VALUES_FILE="${VALUES_FILE:-${CHART_DIR}/values.k3s.yaml}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

helm upgrade --install "${RELEASE}" "${CHART_DIR}" \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  -f "${VALUES_FILE}" \
  --set images.server.tag="${TAG}"

kubectl -n "${NAMESPACE}" rollout status deployment/"${RELEASE}"-server --timeout=5m

echo "Deploy complete."
kubectl -n "${NAMESPACE}" get pods,svc,ingress
