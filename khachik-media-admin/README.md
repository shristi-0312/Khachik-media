# Khachik Media Admin

Functional admin panel for managing projects and media slots. No public-site design work.

## Develop

```bash
cp .env.example .env
npm install
npm run dev
```

Runs at `http://localhost:5174/admin/` and expects the API at `VITE_API_URL` (default `http://localhost:4000`).

## Build

```bash
VITE_API_URL=https://api.yourdomain.com npm run build
```

Output is under `/admin/` base path for Nginx on EC2.
