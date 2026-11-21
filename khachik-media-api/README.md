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
| POST | `/contact` | no (Resend → `CONTACT_TO_EMAIL`) |
| GET | `/projects` | no (published only) |
| GET | `/projects/:slug` | no |
| GET/POST/PATCH/DELETE | `/admin/projects` | Bearer JWT |
| POST | `/admin/uploads/presign` | Bearer JWT |

Contact form delivery uses [Resend](https://resend.com). Set `RESEND_API_KEY`, verify `khachikmedia.com` in the Resend dashboard, and keep `CONTACT_TO_EMAIL=contact@khachikmedia.com`.

Seed creates `ADMIN_EMAIL` / `ADMIN_PASSWORD` and the eight existing portfolio projects as published.
