# Khachik Media Admin

Functional admin panel for managing projects and media slots. No public-site design work.

## Develop

```bash
cp .env.example .env
npm install
npm run dev
```

Runs at `http://localhost:5174/admin/`.

By default `VITE_DEMO_MODE=true`, so you can sign in with **any password** and browse the dashboard with sample projects — no API or Postgres needed.

To talk to a real API instead:

1. Set `VITE_DEMO_MODE=false` in `.env`
2. Run the API on `VITE_API_URL` (default `http://localhost:4000`)
3. Use the seeded `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults: `admin@khachikmedia.com` / `change-me`)

## Build

```bash
VITE_API_URL=https://api.yourdomain.com npm run build
```

Output is under `/admin/` base path for Nginx on EC2.
