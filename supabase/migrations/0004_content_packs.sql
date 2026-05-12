-- ============================================================================
-- 0004_content_packs.sql
-- Expansion: studio/UGC, product-only vs. with-model, scaled content packs.
-- Backward-compatible: existing projects keep working with sensible defaults.
-- ============================================================================

-- 1. Extend projects ---------------------------------------------------------
alter table public.projects
  add column if not exists subject_mode text not null default 'product_with_model'
    check (subject_mode in ('product_only','product_with_model')),
  add column if not exists style_mode text not null default 'ugc'
    check (style_mode in ('studio','lifestyle','ugc','hybrid')),
  add column if not exists output_scope text not null default 'single_image'
    check (output_scope in (
      'single_image','few_variations','multi_format_pack','multi_concept_pack','full_campaign_pack'
    )),
  add column if not exists selected_platforms_json jsonb not null default '[]'::jsonb,
  add column if not exists pack_config_json jsonb not null default '{}'::jsonb,
  add column if not exists content_plan_json jsonb;

-- Make selected_model_id truly optional (already nullable in the original schema,
-- but the workspace previously required it). We rely on the app layer to
-- enforce it for product_with_model.

-- 2. Extend generation_requests ----------------------------------------------
alter table public.generation_requests
  add column if not exists generation_mode text not null default 'ugc_composite_generation'
    check (generation_mode in (
      'ugc_composite_generation',
      'image_refinement',
      'approved_style_variation',
      'product_only_studio_generation',
      'product_only_lifestyle_generation',
      'product_model_studio_generation',
      'pack_anchor_generation',
      'pack_variation_generation'
    )),
  add column if not exists anchor_image_id uuid references public.generated_images(id) on delete set null,
  add column if not exists concept_id uuid,
  add column if not exists target_platform text,
  add column if not exists target_aspect_ratio text,
  add column if not exists pack_id uuid;

-- Allow model_id to be NULL going forward (product_only generations have no
-- model). New rows can have NULL. We also relax the FK action.
alter table public.generation_requests
  alter column model_id drop not null;

-- 3. content_packs -----------------------------------------------------------
create table if not exists public.content_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  pack_type text not null check (pack_type in ('multi_format','multi_concept','campaign')),
  title text not null,
  description text,
  selected_platforms_json jsonb not null default '[]'::jsonb,
  requested_ratios_json jsonb not null default '[]'::jsonb,
  concept_count int not null default 1,
  variation_count int not null default 1,
  status text not null default 'draft'
    check (status in ('draft','planning','generating','completed','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_packs_project_idx
  on public.content_packs (project_id, created_at desc);

-- Now that content_packs exists, attach the FK on generation_requests.pack_id.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'generation_requests_pack_id_fkey'
  ) then
    alter table public.generation_requests
      add constraint generation_requests_pack_id_fkey
      foreign key (pack_id) references public.content_packs(id) on delete set null;
  end if;
end $$;

-- 4. content_pack_concepts ---------------------------------------------------
create table if not exists public.content_pack_concepts (
  id uuid primary key default gen_random_uuid(),
  content_pack_id uuid not null references public.content_packs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  concept_prompt text not null,
  scene_type text,
  style_mode text not null
    check (style_mode in ('studio','lifestyle','ugc','hybrid')),
  subject_mode text not null
    check (subject_mode in ('product_only','product_with_model')),
  recommended_controls_json jsonb not null default '{}'::jsonb,
  anchor_image_id uuid references public.generated_images(id) on delete set null,
  status text not null default 'planned'
    check (status in ('planned','anchor_generating','anchor_ready','expanded','failed')),
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists content_pack_concepts_pack_idx
  on public.content_pack_concepts (content_pack_id);

-- 5. content_pack_outputs ----------------------------------------------------
create table if not exists public.content_pack_outputs (
  id uuid primary key default gen_random_uuid(),
  content_pack_id uuid not null references public.content_packs(id) on delete cascade,
  content_pack_concept_id uuid not null references public.content_pack_concepts(id) on delete cascade,
  generated_image_id uuid not null references public.generated_images(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('anchor','variation','ratio_variant','final')),
  target_platform text,
  target_aspect_ratio text,
  created_at timestamptz not null default now()
);
create index if not exists content_pack_outputs_pack_idx
  on public.content_pack_outputs (content_pack_id);
create index if not exists content_pack_outputs_concept_idx
  on public.content_pack_outputs (content_pack_concept_id);

-- 6. updated_at trigger for content_packs ------------------------------------
drop trigger if exists trg_touch_content_packs on public.content_packs;
create trigger trg_touch_content_packs before update on public.content_packs
  for each row execute procedure public.touch_updated_at();

-- 7. RLS ---------------------------------------------------------------------
alter table public.content_packs           enable row level security;
alter table public.content_pack_concepts   enable row level security;
alter table public.content_pack_outputs    enable row level security;

drop policy if exists "content_packs_owner_all" on public.content_packs;
create policy "content_packs_owner_all" on public.content_packs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "content_pack_concepts_owner_all" on public.content_pack_concepts;
create policy "content_pack_concepts_owner_all" on public.content_pack_concepts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "content_pack_outputs_owner_all" on public.content_pack_outputs;
create policy "content_pack_outputs_owner_all" on public.content_pack_outputs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
