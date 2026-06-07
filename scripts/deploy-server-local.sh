#!/usr/bin/env bash
set -euo pipefail

echo "[local] Deployment script placeholder"
echo "[local] Production deployment runs on the server with scripts/deploy-server.sh"
echo "[local] Current directory: $(pwd)"
echo "[local] Branch: ${ADMIN_DEPLOY_BRANCH:-}"
echo "[local] Target ref: ${ADMIN_DEPLOY_REF:-}"
echo "[local] Completed without changing git state"
