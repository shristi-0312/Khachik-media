# Khachik Media

Portfolio site, admin panel, and AWS-backed API for Khachik Media.

| Package | Role |
|---|---|
| [`khachik-media-site/`](khachik-media-site/) | Public portfolio (Vercel) |
| [`khachik-media-admin/`](khachik-media-admin/) | Functional admin UI |
| [`khachik-media-api/`](khachik-media-api/) | Node API + Postgres |
| [`infra/`](infra/) | Docker Compose, Nginx, AWS runbook |

## Public site

```bash
cd khachik-media-site
npm install
npm run dev
```

Vercel root directory: `khachik-media-site`. Set `VITE_API_URL` to the API origin once EC2 is live.

## Admin + API (local)

See [`infra/README.md`](infra/README.md) for AWS/EC2/S3/CloudFront setup and GitHub Actions secrets.

```bash
# API
cd khachik-media-api && cp .env.example .env && npm install && npm run db:setup && npm run dev

# Admin (http://localhost:5174/admin/)
cd khachik-media-admin && cp .env.example .env && npm install && npm run dev
```

## Routes (public site)

- `/` — Home (with projects globe)
- `/projects`, `/projects/:slug`, `/about`
- Dark showcase: `/dark`, `/dark/projects`, `/dark/about`, …
