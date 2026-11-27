-- Chart: cloud sync of the user's chart workspace + server-side price alerts sent to Telegram.
-- Additive only and safe to re-run. Run once in Supabase (SQL editor) for project nimfkykshfijxbgwgkrg.

-- 1) one row per user with the chart workspace (watchlists, layouts, drawings, indicators, alerts, settings)
create table if not exists public.chart_state (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.chart_state enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='chart_state' and policyname='chart_state own read') then
    create policy "chart_state own read" on public.chart_state for select using (user_id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where tablename='chart_state' and policyname='chart_state own insert') then
    create policy "chart_state own insert" on public.chart_state for insert with check (user_id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where tablename='chart_state' and policyname='chart_state own update') then
    create policy "chart_state own update" on public.chart_state for update using (user_id = auth.uid()) with check (user_id = auth.uid()); end if;
end $$;

-- 2) price alerts checked by the scheduled GitHub Action (tools/chart_alerts.mjs) even when no page is open.
--    Alerts are never deleted: they are switched off (active=false) by the user or when they fire.
create table if not exists public.chart_alerts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sym text not null,
  type text not null check (type in ('above','below')),
  level numeric not null,
  note text,
  tg_chat text,
  active boolean not null default true,
  fired_at timestamptz,
  fired_price numeric,
  created_at timestamptz not null default now()
);
alter table public.chart_alerts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='chart_alerts' and policyname='chart_alerts own read') then
    create policy "chart_alerts own read" on public.chart_alerts for select using (user_id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where tablename='chart_alerts' and policyname='chart_alerts own insert') then
    create policy "chart_alerts own insert" on public.chart_alerts for insert with check (user_id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where tablename='chart_alerts' and policyname='chart_alerts own update') then
    create policy "chart_alerts own update" on public.chart_alerts for update using (user_id = auth.uid()) with check (user_id = auth.uid()); end if;
end $$;
create index if not exists chart_alerts_active on public.chart_alerts (active) where active;
