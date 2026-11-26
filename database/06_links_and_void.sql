-- Cross-program links and void columns (additive only; safe to re-run: every statement is IF NOT EXISTS).
-- These objects are already live on project nimfkykshfijxbgwgkrg (used by portal/hub.js and the Dispute Center);
-- this file records them so the repo matches the database. Nothing here drops, renames or deletes.

create table if not exists public.suite_links (
  id uuid primary key default gen_random_uuid(),
  src_prog text not null,            -- 'iom' | 'iom-sale' | 'feed'
  src_id   text not null,            -- IOM receipt/sales ref, Feed batch id (FB-YYYYMMDD-NNN)
  dst_prog text not null,            -- 'grain' | 'dispute' | 'poultry'
  dst_id   text,                     -- id of the created destination row
  status   text not null default 'posted' check (status in ('posted','voided')),
  note     text,                     -- 'TEST' marks test posts
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  voided_at timestamptz
);
alter table public.suite_links enable row level security;
-- idempotent posting: one live post per source and destination; a voided post frees the slot for a re-post
create unique index if not exists suite_links_one_live on public.suite_links (src_prog, src_id, dst_prog) where status = 'posted';

-- Dispute Center: void status for contracts (void, never delete) and the source of a posted contract
alter table public.dc_contracts add column if not exists voided_at timestamptz;
alter table public.dc_contracts add column if not exists source_ref text;   -- e.g. 'IOM:SO-0012'
