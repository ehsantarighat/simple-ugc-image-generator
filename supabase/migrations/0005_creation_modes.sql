-- ============================================================================
-- 0005_creation_modes.sql
-- Final unified spec — two-mode product (product_reproduction + ugc_model_product),
-- provider routing fields, generation stage lifecycle, generation_plans table.
-- Backward compatible: existing projects default to ugc_model_product.
-- ============================================================================

-- 1. Extend projects with creation mode + quality priority + intent notes -----
alter table public.projects
  add column if not exists creation_mode text not null default 'ugc_model_product'
    check (creation_mode in ('product_reproduction', 'ugc_model_product')),
  add column if not exists quality_priority text not null default 'auto'
    check (quality_priority in ('economy', 'balanced', 'premium', 'auto')),
  add column if not exists content_intent_notes text,
  add column if not exists selected_styles_json jsonb not null default '[]'::jsonb,
  add column if not exists selected_aspect_ratios_json jsonb not null default '[]'::jsonb,
  add column if not exists generate_all_formats boolean not null default false,
  add column if not exists primary_anchor_image_id uuid
    references public.generated_images(id) on delete set null;

-- 2. Extend generation_requests with routing + stage + style preset ----------
alter table public.generation_requests
  add column if not exists workflow_type text,
  add column if not exists generation_stage text
    check (generation_stage in (
      'plan','anchor','style_variant','ratio_variant','final','refinement'
    )),
  add column if not exists source_anchor_image_id uuid
    references public.generated_images(id) on delete set null,
  add column if not exists style_preset text,
  add column if not exists provider_selected text,
  add column if not exists fallback_provider text,
  add column if not exists routing_reason text,
  add column if not exists final_prompt_used text;

-- Allow the new product-reproduction generation modes.
do $$
begin
  alter table public.generation_requests drop constraint if exists generation_requests_generation_mode_check;
exception when others then null;
end $$;
alter table public.generation_requests
  add constraint generation_requests_generation_mode_check check (
    generation_mode in (
      'ugc_composite_generation',
      'image_refinement',
      'approved_style_variation',
      'product_only_studio_generation',
      'product_only_lifestyle_generation',
      'product_model_studio_generation',
      'pack_anchor_generation',
      'pack_variation_generation',
      'product_reproduction_generation',
      'ratio_variant_generation'
    )
  );

-- 3. Extend generated_images with role label --------------------------------
alter table public.generated_images
  add column if not exists image_role text
    check (image_role in (
      'anchor','style_variant','ratio_variant','final','refinement'
    ));

-- 4. generation_plans (approval / preview layer) ----------------------------
create table if not exists public.generation_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  creation_mode text not null
    check (creation_mode in ('product_reproduction','ugc_model_product')),
  plan_type text not null,
  plan_json jsonb not null,
  approved_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists generation_plans_project_idx
  on public.generation_plans (project_id, created_at desc);

drop trigger if exists trg_touch_generation_plans on public.generation_plans;
create trigger trg_touch_generation_plans before update on public.generation_plans
  for each row execute procedure public.touch_updated_at();

-- 5. Optional: product_images.role + model_images.role ----------------------
alter table public.product_images
  add column if not exists role text;
alter table public.model_images
  add column if not exists role text;

-- 6. RLS for generation_plans -----------------------------------------------
alter table public.generation_plans enable row level security;
drop policy if exists "generation_plans_owner_all" on public.generation_plans;
create policy "generation_plans_owner_all" on public.generation_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
