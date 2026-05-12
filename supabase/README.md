# Supabase setup

This project depends on a Supabase project for auth, Postgres, and object storage.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com), create a new project.
2. From **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## 2. Apply migrations

In order, run the three files in `supabase/migrations/` against your project.
Easiest path is the SQL editor in the Supabase dashboard:

1. `0001_init.sql` — tables, triggers, indexes.
2. `0002_rls.sql` — row-level security.
3. `0003_storage.sql` — `ugc-assets` bucket and access policies.

If you have the Supabase CLI linked: `supabase db push`.

## 3. Auth configuration

- **Authentication → Providers → Email**: enable email/password, disable
  "Confirm email" for local development if you want signup to work without
  inbox round-trips. Re-enable for production.
- **Authentication → URL Configuration**:
  - Site URL: `http://localhost:3000`
  - Redirect URLs (add): `http://localhost:3000/auth/callback`

## 4. Storage

The bucket `ugc-assets` is created by `0003_storage.sql`. It is **private**;
the app uses signed URLs (15 min default) for display and downloads.
