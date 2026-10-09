# Daily Standup Attendance — Supabase edition

React + Vite attendance dashboard with shared team data, Supabase Auth, Postgres storage, and Realtime updates. The dashboard layout and existing attendance features are retained.

## What is shared
- Team members and their active/inactive state
- Attendance status by date
- PDF export and JSON backup/import
- Realtime refresh when another signed-in user changes a record

## Supabase setup
1. Create a project at https://supabase.com/ and wait for its database to finish provisioning.
2. Open **SQL Editor → New query**.
3. Copy all of `supabase/setup.sql` into the editor and click **Run**. This creates the tables, authenticated-only Row Level Security policies, Realtime publication entries, and initial 30-member team with today's seed attendance if the team table is empty.
4. Open **Project Settings → API** (the exact menu label may be **API Keys** in the current dashboard). Copy the Project URL and the publishable key (or legacy `anon` key). Never use a `service_role` or secret key in this frontend.
5. Open **Authentication → Users → Add user** and create an email/password account for yourself and each teammate who needs access. This project uses administrator-created accounts; users cannot self-register from the public site.
6. In Supabase **Authentication → URL Configuration**, add `https://sauravArrow.github.io/daily-standup-attendance/` to the allowed Site URL/redirect URLs if the dashboard requires it.

## Configure locally
1. Copy `.env.example` to `.env.local`.
2. Fill in:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```
3. Run `npm install`, then `npm run dev`.
4. Sign in with an account created in Supabase Authentication.

The publishable/anon key is intended for browser use; security is enforced by the SQL Row Level Security policies. Never expose a service-role key.

## Deploy to GitHub Pages
1. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**.
2. Create `VITE_SUPABASE_URL` with the Supabase Project URL.
3. Create `VITE_SUPABASE_ANON_KEY` with the publishable/anon key.
4. Commit and push the project to `main`, or manually run **Actions → Deploy to GitHub Pages → Run workflow**.
5. Wait for both build and deploy jobs to succeed. Open `https://sauravArrow.github.io/daily-standup-attendance/` and sign in.

The GitHub Actions workflow injects these values at build time. GitHub Pages itself does not store attendance data.

## Existing localStorage data
The old website saved data separately in each browser. Before replacing the old version, open it in the browser where the latest records live and use **Backup data** to download `attendance-backup.json`. After the new version is deployed and you sign in, use **Import data** to import that file into Supabase. Import adds/updates records in the shared database; review the data first because it affects every signed-in teammate. A JSON backup from the old app is supported.

## Security model
- Only authenticated Supabase users can read/write attendance and team records.
- Create and remove user accounts from Supabase Authentication; do not enable public sign-up unless you intentionally want anyone to create an account.
- All authenticated accounts created for this project can update the shared team's data. If you later need manager-only permissions, add a role/authorization table and stricter RLS policies.
- Do not place service-role keys in `.env.local`, GitHub secrets used for the Vite frontend, or any `VITE_*` variable.
