-- ============================================================================
-- 0002_rls.sql
-- Row-level security for all user-owned tables.
-- Every row is keyed by user_id; every policy is `auth.uid() = user_id`.
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.models              enable row level security;
alter table public.model_images        enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.projects            enable row level security;
alter table public.generation_requests enable row level security;
alter table public.generated_images    enable row level security;
alter table public.revision_requests   enable row level security;
alter table public.activity_logs       enable row level security;

-- Generic policy helper macro is not available in pg; emit the policies inline.
-- One SELECT/INSERT/UPDATE/DELETE policy per table, gated by ownership.

-- profiles --------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

-- models ----------------------------------------------------------------------
drop policy if exists "models_owner_all" on public.models;
create policy "models_owner_all" on public.models
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- model_images ----------------------------------------------------------------
drop policy if exists "model_images_owner_all" on public.model_images;
create policy "model_images_owner_all" on public.model_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- products --------------------------------------------------------------------
drop policy if exists "products_owner_all" on public.products;
create policy "products_owner_all" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- product_images --------------------------------------------------------------
drop policy if exists "product_images_owner_all" on public.product_images;
create policy "product_images_owner_all" on public.product_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- projects --------------------------------------------------------------------
drop policy if exists "projects_owner_all" on public.projects;
create policy "projects_owner_all" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- generation_requests ---------------------------------------------------------
drop policy if exists "generation_requests_owner_all" on public.generation_requests;
create policy "generation_requests_owner_all" on public.generation_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- generated_images ------------------------------------------------------------
drop policy if exists "generated_images_owner_all" on public.generated_images;
create policy "generated_images_owner_all" on public.generated_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- revision_requests -----------------------------------------------------------
drop policy if exists "revision_requests_owner_all" on public.revision_requests;
create policy "revision_requests_owner_all" on public.revision_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- activity_logs ---------------------------------------------------------------
drop policy if exists "activity_logs_owner_all" on public.activity_logs;
create policy "activity_logs_owner_all" on public.activity_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
