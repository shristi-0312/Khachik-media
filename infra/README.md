# Khachik Media — AWS runbook

Public portfolio stays on Vercel. This stack runs the **API**, **admin UI**, and **Postgres** on EC2, with **S3 + CloudFront** for high-fidelity media.

## Architecture

- `api.yourdomain.com` → Nginx → Docker `api` (Node) on `:4000`
- `admin.yourdomain.com` → Nginx → Docker `admin` (static SPA) on `:8080`
- Postgres only on the Docker network (not public)
- Media uploads: admin → API presign → browser PUT → S3 → served via CloudFront

## 1. S3 + CloudFront

```bash
export AWS_REGION=ap-south-1
export S3_BUCKET=khachik-media-assets
export ADMIN_ORIGIN=https://admin.yourdomain.com
export SITE_ORIGIN=https://khachik-media.vercel.app
chmod +x infra/scripts/create-s3-cloudfront.sh
./infra/scripts/create-s3-cloudfront.sh
```

Save the printed `CLOUDFRONT_URL`.

New uploads set `Cache-Control: public, max-age=31536000, immutable`. For objects already in the bucket, backfill once:

```bash
chmod +x infra/scripts/backfill-s3-cache-control.sh
./infra/scripts/backfill-s3-cache-control.sh
# optional second pass for project uploads:
./infra/scripts/backfill-s3-cache-control.sh projects/
```

Create an IAM role for EC2 using [`iam/ec2-s3-policy.json`](iam/ec2-s3-policy.json) (update the bucket name if different) and attach it to the instance. Prefer the instance role over long-lived access keys.

## 2. EC2

1. Launch **Amazon Linux 2023**, `t3.small` (or `t3.medium`), region `ap-south-1`.
2. Security group:
   - inbound `22` from your IP
   - inbound `80` / `443` from `0.0.0.0/0`
   - **do not** open `5432`
3. Attach Elastic IP.
4. Point DNS:
   - `api.yourdomain.com` → Elastic IP
   - `admin.yourdomain.com` → Elastic IP
5. SSH in and bootstrap:

```bash
curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/infra/scripts/ec2-bootstrap.sh | sudo bash
# or copy the script from this repo and run it
```

## 3. Deploy app containers

```bash
sudo mkdir -p /opt/khachik-media
sudo chown ec2-user:ec2-user /opt/khachik-media
git clone <your-repo-url> /opt/khachik-media
cd /opt/khachik-media/infra
cp .env.example .env
# edit .env with JWT, admin password, S3, CloudFront, CORS, PUBLIC_API_URL
docker compose up -d --build
```

The API container entrypoint runs `prisma migrate deploy` and seeds the admin user + eight portfolio projects on every start (`RUN_SEED=true` by default; seeding is idempotent via upserts).

## 4. Nginx + TLS

```bash
sudo cp /opt/khachik-media/infra/nginx/khachik.conf /etc/nginx/conf.d/khachik.conf
# edit server_name values
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```

## 5. Vercel public site

In the Vercel project for `khachik-media-site`, set:

```
VITE_API_URL=https://api.yourdomain.com
```

Redeploy the site so the SPA fetches projects from the API.

## 6. GitHub Actions

Add repository secrets:

- `EC2_HOST` — Elastic IP or hostname (`65.2.150.121`)
- `EC2_USER` — usually `ec2-user`
- `EC2_SSH_KEY` — private key contents
- `EC2_SSH_PORT` — optional, default `22`

Push to `main` touching `khachik-media-api/**`, `khachik-media-admin/**`, or `infra/**` triggers [`.github/workflows/deploy-api.yml`](../.github/workflows/deploy-api.yml).

### If Actions fail with “startup failure” / “account is locked due to a billing issue”

GitHub will not start any runners until billing is clear — workflow YAML changes cannot fix this.

1. Open [GitHub Billing](https://github.com/settings/billing)
2. Fix the payment method / outstanding invoice / spending limit for Actions
3. Re-run **CI** and **Deploy API + Admin** from the Actions tab

### Manual deploy (bypass Actions)

When Actions is locked, deploy from your Mac with the same PEM used for `EC2_SSH_KEY`:

```bash
chmod +x infra/scripts/manual-deploy.sh
./infra/scripts/manual-deploy.sh /path/to/khachik.pem
```

## Local development

```bash
# terminal 1 — Postgres
docker run --name khachik-pg -e POSTGRES_PASSWORD=khachik -e POSTGRES_USER=khachik -e POSTGRES_DB=khachik -p 5432:5432 -d postgres:16-alpine

# terminal 2 — API
cd khachik-media-api
cp .env.example .env
npm install
npm run db:setup
npm run dev

# terminal 3 — Admin
cd khachik-media-admin
cp .env.example .env
npm install
npm run dev
```

Without AWS credentials, project CRUD works; uploads fail until S3/CloudFront are configured.
