create table if not exists public.feed_state (user_id uuid primary key references auth.users(id) on delete cascade, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
alter table public.feed_state enable row level security;
create policy feed_state_select on public.feed_state for select using (auth.uid() = user_id);
create policy feed_state_insert on public.feed_state for insert with check (auth.uid() = user_id);
create policy feed_state_update on public.feed_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy feed_state_delete on public.feed_state for delete using (auth.uid() = user_id);
