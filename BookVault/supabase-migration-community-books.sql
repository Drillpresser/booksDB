-- Run this in your Supabase SQL editor:
-- https://supabase.com/dashboard/project/_/sql/new
--
-- Community catalog: a shared, ISBN-keyed record of book metadata that any
-- authenticated user can contribute to. When a user edits a book's details
-- (or adds one), the metadata is upserted here; when another user adds the same
-- ISBN, the lookup consults this table so they receive the community version.
-- Policy is last-write-wins, recorded via updated_by / updated_at.

create table if not exists community_books (
  isbn13 text primary key,
  title text not null,
  authors jsonb not null default '[]',
  publisher text,
  published_year int,
  page_count int,
  synopsis text,
  cover_url text,
  dewey_decimal text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table community_books enable row level security;

-- Anyone signed in can read the shared catalog.
create policy "Community books are readable by authenticated users"
  on community_books for select to authenticated
  using (true);

-- Contributions must be attributed to the signed-in user.
create policy "Authenticated users can contribute community books"
  on community_books for insert to authenticated
  with check (updated_by = auth.uid());

-- Last-write-wins: any signed-in user may overwrite, but the row must be
-- re-attributed to them.
create policy "Authenticated users can update community books"
  on community_books for update to authenticated
  using (true)
  with check (updated_by = auth.uid());
