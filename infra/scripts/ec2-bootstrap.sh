#!/usr/bin/env bash
# Run once on a fresh Amazon Linux 2023 EC2 instance as root/sudo.
set -euo pipefail

dnf update -y
dnf install -y docker nginx git
systemctl enable --now docker
usermod -aG docker ec2-user || true

# Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

systemctl enable --now nginx

# Certbot (optional HTTPS)
dnf install -y certbot python3-certbot-nginx || true

echo "Bootstrap complete."
echo "Next:"
echo "  1. Clone the repo to /opt/khachik-media"
echo "  2. Copy infra/.env.example -> infra/.env and fill values"
echo "  3. Copy infra/nginx/khachik.conf -> /etc/nginx/conf.d/ and edit domains"
echo "  4. nginx -t && systemctl reload nginx"
echo "  5. cd /opt/khachik-media/infra && docker compose up -d --build"
echo "  6. docker compose exec api npm run db:seed"
echo "  7. certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com"
