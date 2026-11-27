-- Chart: shared trade ideas and comments (additive; run once in the Supabase SQL editor).
-- Any signed-in suite user can read; each user writes only their own rows. Nothing is deleted: an idea is withdrawn by setting voided_at.
create table if not exists public.chart_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  author text,
  sym text not null,
  tf text,
  side text check (side in ('long','short','neutral')),
  title text not null,
  body text,
  entry numeric, stop numeric, target numeric,
  price_at numeric,
  share text,
  created_at timestamptz not null default now(),
  voided_at timestamptz
);
create table if not exists public.chart_idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.chart_ideas(id),
  user_id uuid not null default auth.uid() references auth.users(id),
  author text,
  body text not null,
  created_at timestamptz not null default now(),
  voided_at timestamptz
);
create index if not exists chart_ideas_created on public.chart_ideas(created_at desc);
create index if not exists chart_idea_comments_idea on public.chart_idea_comments(idea_id, created_at);
alter table public.chart_ideas enable row level security;
alter table public.chart_idea_comments enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='chart_ideas' and policyname='ideas_read') then
    create policy ideas_read on public.chart_ideas for select to authenticated using (true); end if;
  if not exists (select 1 from pg_policies where tablename='chart_ideas' and policyname='ideas_insert') then
    create policy ideas_insert on public.chart_ideas for insert to authenticated with check (user_id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where tablename='chart_ideas' and policyname='ideas_update') then
    create policy ideas_update on public.chart_ideas for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where tablename='chart_idea_comments' and policyname='ic_read') then
    create policy ic_read on public.chart_idea_comments for select to authenticated using (true); end if;
  if not exists (select 1 from pg_policies where tablename='chart_idea_comments' and policyname='ic_insert') then
    create policy ic_insert on public.chart_idea_comments for insert to authenticated with check (user_id = auth.uid()); end if;
  if not exists (select 1 from pg_policies where tablename='chart_idea_comments' and policyname='ic_update') then
    create policy ic_update on public.chart_idea_comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid()); end if;
end $$;
-- no delete policy on purpose (void, never delete)
