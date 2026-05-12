-- ============================================================================
-- 0001_init.sql
-- UGC Image Generator — initial schema.
-- Run against a fresh Supabase project (SQL editor or `supabase db push`).
-- ============================================================================

-- Required extensions ---------------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================================
-- profiles
-- One row per auth.users entry. Created automatically on signup via trigger.
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- models
-- ============================================================================
create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists models_user_id_idx on public.models (user_id, created_at desc);

create table if not exists public.model_images (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists model_images_model_id_idx on public.model_images (model_id, sort_order);

-- ============================================================================
-- products
-- ============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand_name text,
  category text,
  description text,
  preservation_rules_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_user_id_idx on public.products (user_id, created_at desc);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_id_idx on public.product_images (product_id, sort_order);

-- ============================================================================
-- projects
-- ============================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  selected_model_id uuid references public.models (id) on delete set null,
  selected_product_id uuid references public.products (id) on delete set null,
  target_channel text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects (user_id, created_at desc);

-- ============================================================================
-- generation_requests
-- ============================================================================
create table if not exists public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  model_id uuid not null references public.models (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  raw_scene_prompt text not null,
  structured_payload_json jsonb not null,
  controls_json jsonb not null,
  status text not null default 'draft'
    check (status in ('draft','queued','generating','completed','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists generation_requests_project_idx
  on public.generation_requests (project_id, created_at desc);
create index if not exists generation_requests_user_idx
  on public.generation_requests (user_id, created_at desc);

-- ============================================================================
-- generated_images
-- ============================================================================
create table if not exists public.generated_images (
  id uuid primary key default gen_random_uuid(),
  generation_request_id uuid not null references public.generation_requests (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_image_id uuid references public.generated_images (id) on delete set null,
  storage_path text not null,
  prompt_used text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  review_json jsonb,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists generated_images_request_idx
  on public.generated_images (generation_request_id, created_at);
create index if not exists generated_images_project_idx
  on public.generated_images (project_id, created_at desc);
create index if not exists generated_images_user_idx
  on public.generated_images (user_id, created_at desc);

-- ============================================================================
-- revision_requests
-- A refinement is a special generation_request linked to a source image.
-- We model it as a separate table for analytics; the actual revised image
-- is stored as a generated_images row with parent_image_id set.
-- ============================================================================
create table if not exists public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  source_generated_image_id uuid not null references public.generated_images (id) on delete cascade,
  generation_request_id uuid references public.generation_requests (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  refinement_prompt text not null,
  structured_payload_json jsonb not null,
  status text not null default 'draft'
    check (status in ('draft','queued','generating','completed','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists revision_requests_user_idx
  on public.revision_requests (user_id, created_at desc);

-- ============================================================================
-- activity_logs
-- Optional. Best-effort audit trail. Failed inserts must never block the user.
-- ============================================================================
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  action_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_user_idx
  on public.activity_logs (user_id, created_at desc);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles','models','products','projects',
      'generation_requests','revision_requests'
    ])
  loop
    execute format(
      'drop trigger if exists trg_touch_%1$s on public.%1$s;
       create trigger trg_touch_%1$s before update on public.%1$s
         for each row execute procedure public.touch_updated_at();', t);
  end loop;
end $$;

-- ============================================================================
-- Auto-create a profile row when a user signs up.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
