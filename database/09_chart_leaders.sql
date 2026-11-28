-- Chart: paper-trading leaderboard and copy trading (additive; run once in the Supabase SQL editor).
-- One row per user, written only by that user (opt-in from the Leaders tab). Signed-in suite users can read all rows.
-- Paper accounts only: no real money, no broker. Leaving the board sets hidden_at; rows are never deleted.
create table if not exists public.chart_leaders (
  user_id uuid primary key default auth.uid() references auth.users(id),
  author text,
  ret numeric,            -- % return since the paper account started
  win numeric,            -- % winning closed trades
  trades int,
  max_dd numeric,         -- % max drawdown of the paper equity curve
  pf numeric,             -- profit factor
  positions jsonb,        -- open paper positions [{sym,q,avg}]
  recent jsonb,           -- last closed trades [{sym,dir,entry,exit,d1}]
  updated_at timestamptz not null default now(),
  hidden_at timestamptz
);
alter table public.chart_leaders enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='chart_leaders' and policyname='leaders_read') then
    create policy leaders_read on public.chart_leaders for select to authenticated using (true); end if;
  if not exists (select 1 from pg_policies where tablename='chart_leaders' and policyname='leaders_insert') then
    create policy leaders_insert on public.chart_leaders for insert to authenticated with check (user_id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where tablename='chart_leaders' and policyname='leaders_update') then
    create policy leaders_update on public.chart_leaders for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid()); end if;
end $$;
-- no delete policy on purpose
