#!/usr/bin/env bash
# Deploy API + Admin from your Mac when GitHub Actions is blocked.
# Usage:
#   ./infra/scripts/manual-deploy.sh /path/to/khachik.pem
# Optional:
#   EC2_HOST=3.108.244.235 EC2_USER=ubuntu ./infra/scripts/manual-deploy.sh ./deqoy.pem
set -euo pipefail

KEY="${1:-}"
HOST="${EC2_HOST:-3.108.244.235}"
USER="${EC2_USER:-ubuntu}"

if [[ -z "$KEY" || ! -f "$KEY" ]]; then
  echo "Usage: $0 /path/to/ssh-private-key.pem"
  echo "This should be the same key stored in the GitHub secret EC2_SSH_KEY."
  exit 1
fi

chmod 400 "$KEY"

echo "==> Deploying to ${USER}@${HOST}"
ssh -i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new "${USER}@${HOST}" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/khachik-media
git fetch origin
git reset --hard origin/main
bash infra/scripts/deploy-pm2.sh
REMOTE

echo "==> Done"
echo "Admin: https://3-108-244-235.sslip.io/admin/"
echo "API:   https://3-108-244-235.sslip.io/api/health"
