# Renault After-Sales Performance Studio — Supabase edition

A separate copy of the Performance Studio with a new interface (Next.js + Supabase Auth)
and a new database (Supabase/Postgres instead of local files). The original project
(`../renault-performance-studio`) is untouched.

The studio's tabs, calculations and Excel/PowerPoint/PDF exports are the proven engine
from the original app (`src/lib/app.js` + `core.js`) — only the storage layer changed,
from `shim.js` (local server) to `src/lib/supashim.js` (Supabase).

## 1. Create a Supabase project

1. Go to https://supabase.com, sign in (or create a free account).
2. Click **New project**. Pick an organization, name it (e.g. `renault-performance-studio`),
   set a database password (save it somewhere), pick a region, click **Create new project**.
   Wait a minute or two for it to finish provisioning.
3. In the project, go to **Project Settings → API**. Copy:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Set up the database

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates the `profiles`, `documents`, `blobs` tables, their security policies, and a
   public `blobs` storage bucket.
3. Go to **Authentication → Providers** and make sure **Email** is enabled (it is by default).
   For an internal tool, you can also turn off "Confirm email" under
   **Authentication → Sign In / Providers → Email** so new users can sign in right away.

## 3. Create your users

For each person who should use the studio:

1. Go to **Authentication → Users → Add user** (or have them sign up, if you enable it).
2. Set their email + a password.
3. A row for them appears automatically in `public.profiles` with `role = 'member'`.
4. To make someone an **administrator** (can import data / edit), run in the SQL editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   Everyone else is read-only, same as the original app.

## 4. Configure and run this app

```
cp .env.local.example .env.local      # then fill in your project URL + anon key
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to the studio, which redirects to `/login` if
you're signed out. Sign in with a user created in step 3.

## 5. Deploy

This is a standard Next.js app — deploy it anywhere Next.js runs (e.g. Vercel). Set the two
`NEXT_PUBLIC_SUPABASE_*` environment variables in your hosting provider's project settings.
The Supabase anon key is meant to be public; all access control is enforced server-side by
the Row Level Security policies in `supabase/schema.sql`.

## Folders

| Folder | What it holds |
|---|---|
| `src/lib/` | Copied engine from the original app (`app.js`, `core.js`, `style.css`, `shell.html`, `inter.js`, `spnames.json`, `frbg.json`) + the new `supashim.js` storage adapter |
| `scripts/build-studio.mjs` | Assembles `public/studio.html` from `src/lib/*` — run via `npm run build:studio` (done automatically by `dev`/`build`) |
| `app/` | The Next.js shell: `/login` (Supabase Auth sign-in page), `/` (redirects into the studio), `/supabase-config.js` (injects your Supabase URL/key into the static bundle) |
| `supabase/schema.sql` | Run once in the Supabase SQL editor to create the database |
| `public/` | Built studio bundle + static assets (logo, icon) |

## Rebuilding after changing `src/lib/`

```
npm run build:studio
```

(Also runs automatically before `npm run dev` / `npm run build`.)

## Notes / things to revisit later

- Uploaded files (`blobs` bucket) are public-read by default, for simplicity — tighten the
  storage policy in `supabase/schema.sql` if these ever contain sensitive data.
- Live updates poll Supabase every 15 seconds (mirrors the original app's behavior). If you
  want instant multi-user sync, `supashim.js` can be extended to use Supabase Realtime.
- `members`/`views` collections and roles follow the same shape as the original app; the
  `admin` flag is now controlled by `public.profiles.role` instead of `config.json`.
