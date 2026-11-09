# Khachik Media API

Express + Prisma + Postgres API for the public site and admin panel.

## Scripts

```bash
cp .env.example .env
npm install
npm run db:setup   # prisma db push + seed
npm run dev        # http://localhost:4000
```

## Endpoints

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | no |
| POST | `/auth/login` | no |
| GET | `/projects` | no (published only) |
| GET | `/projects/:slug` | no |
| GET/POST/PATCH/DELETE | `/admin/projects` | Bearer JWT |
| POST | `/admin/uploads/presign` | Bearer JWT |

Seed creates `ADMIN_EMAIL` / `ADMIN_PASSWORD` and the eight existing portfolio projects as published.
