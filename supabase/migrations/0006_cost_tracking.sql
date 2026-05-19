-- ============================================================================
-- 0006_cost_tracking.sql
-- Per-image cost tracking. Every row in generated_images now carries the
-- routed provider id (`provider_used`), the cost in tenths of a cent
-- (`provider_cost_tenth_cents`) — fine enough to capture sub-cent OpenAI
-- pricing without floating-point drift — and the price table version that
-- was used to compute it (`price_table_version`, e.g. "2026-05") so future
-- price changes don't retroactively rewrite history.
--
-- generation_requests gets a rollup column (`total_cost_tenth_cents`) so
-- per-request totals can be read without joining + summing the children.
--
-- billed_cost_tenth_cents is for a future markup layer (charging end-users
-- more than what providers cost you). Defaults to provider cost = no markup.
-- ============================================================================

-- generated_images: per-image cost columns -----------------------------------
alter table public.generated_images
  add column if not exists provider_used text,
  add column if not exists provider_cost_tenth_cents integer not null default 0,
  add column if not exists billed_cost_tenth_cents integer not null default 0,
  add column if not exists price_table_version text,
  add column if not exists cost_attribution text not null default 'unknown'
    check (cost_attribution in ('billed', 'free_failure', 'unknown'));

-- generation_requests: rollup totals -----------------------------------------
alter table public.generation_requests
  add column if not exists total_cost_tenth_cents integer not null default 0;

-- Index supporting "spend in last N days" queries by user --------------------
create index if not exists generated_images_user_cost_idx
  on public.generated_images (user_id, created_at desc)
  where provider_cost_tenth_cents > 0;

-- View: per-user spend rollup (cheap query for the dashboard widget) ---------
create or replace view public.user_spend_rollup as
select
  gi.user_id,
  count(*)                            as image_count,
  sum(gi.provider_cost_tenth_cents)   as provider_cost_tenth_cents,
  sum(gi.billed_cost_tenth_cents)     as billed_cost_tenth_cents,
  date_trunc('day', gi.created_at)    as day
from public.generated_images gi
group by gi.user_id, date_trunc('day', gi.created_at);

-- Views inherit RLS from their underlying tables, but explicitly granting
-- select keeps the supabase client happy.
grant select on public.user_spend_rollup to anon, authenticated;
