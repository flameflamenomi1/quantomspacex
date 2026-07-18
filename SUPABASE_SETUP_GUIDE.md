# Supabase Setup Guide — Quantumspacex

This guide walks you through connecting the app to a **brand-new** Supabase
project. Follow the steps in order. It should take about 10 minutes.

---

## 1. Create a new Supabase project

1. Go to <https://supabase.com> and sign in (or sign up — it's free).
2. Click **New project**.
3. Fill in:
   - **Name:** `quantumspacex` (anything works)
   - **Database password:** pick a strong one and save it somewhere safe.
   - **Region:** choose the region closest to most of your users. This only
     affects latency — it does not change how the app works.
4. Click **Create new project** and wait ~1 minute for it to finish
   provisioning.

---

## 2. Find your project URL and anon key

1. In the left sidebar, click the gear icon → **Project Settings**.
2. Click **Data API** (older UIs may call this **API**).
3. You will see two values you need:
   - **Project URL** — a URL like `https://abcxyz.supabase.co`
   - **Project API Keys → `anon` `public`** — a long string starting with
     `eyJ…`
4. Keep this tab open — you will paste both values in step 4.

---

## 3. Run the database migration

1. In the left sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/migrations/0001_initial_schema.sql` from this
   repository in any text editor.
4. Copy its **entire** contents and paste them into the Supabase SQL editor.
5. Click **Run** (or press `Ctrl/Cmd + Enter`).
6. Wait until you see **Success. No rows returned** (or similar). That
   means every table, index, RLS policy, storage bucket, and the seed data
   (3 investment plans + 1 admin user) has been created.

> **Default admin login (created by the migration):**
> `admin@quantumspacex.com` / `Admin123!`
> **Change this password from the app immediately after your first login.**

---

## 4. Paste the two values into `.env` and into GitHub Actions

### 4a. Local `.env`

1. Open the `.env` file at the root of the repo in a text editor.
2. Replace the two lines with your new values from step 2:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...your-long-anon-key...
   ```

3. Save the file. **Do not commit** `.env` — it is git-ignored.

### 4b. GitHub Actions secrets (for the keep-alive workflow)

1. Go to your GitHub repo in the browser:
   <https://github.com/flameflamenomi1/quantomspacex>
2. Click **Settings** (top tab).
3. In the left sidebar: **Secrets and variables → Actions**.
4. Click **New repository secret** and add these two — one at a time:

   | Name                 | Value                                            |
   |----------------------|--------------------------------------------------|
   | `SUPABASE_URL`       | The same Project URL from step 2                 |
   | `SUPABASE_ANON_KEY`  | The same anon public key from step 2             |

5. Save each. That's it — the workflow will pick them up automatically.

---

## 5. Verify it works

1. In the repo folder, run:

   ```
   pnpm install
   pnpm dev
   ```

2. Open <http://localhost:5173> (or whatever URL Vite prints).
3. Sign in as the admin user (`admin@quantumspacex.com` / `Admin123!`).
4. You should see the dashboard load with **no red errors** in the browser
   console (F12 → Console). The Investment Plans page should show the 3
   seeded tiers (Starter / Growth / Elite).
5. Try registering a new normal user, submitting a deposit, or opening the
   admin panel — all should work end to end.

If you see errors about missing tables, re-run step 3. If you see errors
about `VITE_SUPABASE_URL is undefined`, re-check step 4a and restart
`pnpm dev`.

---

## 6. Keep-alive workflow — what it does & how to check it

The file `.github/workflows/supabase-keepalive.yml` runs automatically **every
6 hours** and pings your Supabase project with a small `SELECT` query. This
prevents Supabase's free tier from auto-pausing your project after 7 days of
inactivity.

**To check it's running:**

1. On GitHub, click the **Actions** tab of the repo.
2. In the sidebar, click **Supabase Keep-Alive**.
3. You should see runs appearing every 6 hours with green checkmarks
   (the first one will appear within a few hours of you enabling the
   workflow — you can also click **Run workflow** to trigger one manually
   right now).

If a run ever fails (yellow warning), it will **not** break your repo — it
just logs the failure. Open the run and read the log to see why (usually a
typo in a secret).

---

## Notes & Assumptions

These are the assumptions this migration was built on. Skim them so you
know what's in your new database.

- **Custom auth, not Supabase Auth.** This app has its own login flow — it
  stores users in `public.users` with a `password_hash` column (a simple
  `btoa()` base-64 hash of the plaintext password). It does **not** use
  Supabase Auth (`auth.users`). Nothing in the SQL touches `auth.*`.
- **Permissive RLS policies for the `anon` role.** Because the frontend
  talks to Supabase directly with the anon key (no JWT), Row Level Security
  is enabled on every table but the policies allow anon to read/write. If
  you later migrate to Supabase Auth, tighten these policies (see the
  bottom of the SQL file). This matches how the old project was
  configured — the app was already relying on this.
- **Three storage buckets, all public.** `kyc-documents`, `receipts`, and
  `deposit-receipts` are created as public buckets so `getPublicUrl()`
  works out of the box. For real production KYC data, consider flipping
  `kyc-documents` to private and using signed URLs.
- **Investment plan tiers are seeded with sensible defaults** (Starter /
  Growth / Elite; $500–$5M ranges; 30/60/120 day durations). The frontend
  lays out exactly three cards, ordered by `min_amount`. You can edit the
  seeded rows from the Supabase Table Editor any time — no code change
  needed.
- **Default admin user is seeded** with the credentials advertised on the
  admin login page (`admin@quantumspacex.com` / `Admin123!`). **Change
  this password immediately** by editing the row via the Table Editor, or
  by using the app's password reset flow.
- **Realtime is enabled** for the tables the app subscribes to
  (`users`, `deposits`, `withdrawals`, `trades`, `notifications`,
  `admin_notifications`, `chat_messages`, `plan_subscriptions`,
  `balance_history`).
- **No hardcoded Supabase URL/key remains in the code.** All Supabase
  access reads from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env
  vars via `src/lib/supabase.ts`.
- **Keep-alive interval:** 6 hours. Supabase pauses free projects after
  ~7 days of inactivity, so this leaves a very generous margin. A shorter
  interval would just waste CI minutes.
