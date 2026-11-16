# Khachik Media Admin

Media library for Films, Stills, and Globe HQ clips. Uploads go browser → S3 (original bytes) → CloudFront.

## Develop

```bash
cp .env.example .env
# VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

Runs at `http://localhost:5174/admin/`.

1. Start Postgres + API (`khachik-media-api`)
2. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults: `admin@khachikmedia.com` / `change-me`)
3. Upload into **Films**, **Stills**, or **Globe**

## Build

```bash
VITE_API_URL=https://api.yourdomain.com npm run build
```

Output is under `/admin/` base path for Nginx on EC2.
