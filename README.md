# Data Base: church report system

Monthly department reports with a review workflow, a member database and an archive.
Built with Next.js (App Router), React, Tailwind and PostgreSQL.

- **Admin** reviews and approves reports, chases late departments, manages members and registers users.
- **Department heads** (one per department) fill in and submit their monthly report.
- **Leadership** has a read-only dashboard, archive and member list.

There is no public sign-up: the admin registers every user and gives them a temporary password.
Department heads and leadership sign in at `/login`; the admin signs in at `/admin`.

## Run it locally

You need Node 20+ and a PostgreSQL database (a Docker/OrbStack container is fine):

```bash
docker run -d --name churchdb --restart unless-stopped -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=church_reports -p 5432:5432 -v churchdb-data:/var/lib/postgresql/data postgres:17

cp .env.example .env.local     # then set ADMIN_USERNAME and ADMIN_PASSWORD
npm install
npm run db:migrate             # create the tables and the 15 departments
npm run db:admin               # create the admin from ADMIN_* in .env.local
npm run dev                    # http://localhost:3000
```

Change the church's name in `src/lib/config.ts` (`CHURCH_NAME`) and the Instagram link (`INSTAGRAM_URL`).

## Production (Neon + Vercel)

1. **Database.** Create a Neon project. Put its **direct** connection string in `.env.production.local`
   (git-ignored) as `DATABASE_URL`, plus `ADMIN_NAME`, `ADMIN_USERNAME` and a **long** `ADMIN_PASSWORD`
   (see `.env.example`). Then run:

   ```bash
   npm run db:migrate:prod
   npm run db:admin:prod
   ```

   Run `db:migrate:prod` again after pulling any change that adds a file to `db/migrations/`.
   To change the admin password later, edit `ADMIN_PASSWORD` and run `db:admin:prod` again.

2. **Vercel.** Import this repository and set one environment variable:
   `DATABASE_URL` = Neon's **pooled** connection string (the host contains `-pooler`).
   Pick the region closest to the database. Deploy, then sign in at `/admin`.

## Good to know

- **Timezone.** Dates and times are worked out in `Africa/Lagos` (`APP_TIMEZONE` in `src/lib/config.ts`),
  whatever timezone the server runs in. Reports for a month are due on the 5th of the next month.
- **Attachments** are stored in the database and limited to 4 MB per save (Vercel's request limit).
  Larger files would need object storage such as Vercel Blob (`src/lib/limits.ts`).
- **Failed sign-ins** are counted in the database: 5 wrong passwords for one username, or 30 from one address,
  lock further attempts for 15 minutes.
- **Roles** are `admin`, `head` and `leadership`. Heads are tied to exactly one department.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development, production build, production server |
| `npm run db:migrate` / `db:admin` | Migrations and admin bootstrap against `.env.local` |
| `npm run db:migrate:prod` / `db:admin:prod` | The same against `.env.production.local` |
| `npm run lint` | ESLint |
