-- Profiles and community ratings, captured from production (2026-10-06).
--
-- These were created by hand before the migrations folder existed, so they were
-- missing from the repo. The timestamp deliberately precedes every other
-- migration: public_library_directory (20250801000000) joins profiles, so a
-- fresh database needs these first. Production already has all of it; this
-- file re-declares the same objects idempotently, so applying it there is a
-- no-op (CI runs `supabase db push --include-all` so an out-of-order file can
-- be applied).

-- ── profiles ────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Display names and avatars are shown next to reviews and shelves, including
-- to signed-out visitors browsing public shelves.
drop policy if exists "anyone can view profiles" on profiles;
create policy "anyone can view profiles" on profiles for select using (true);

drop policy if exists "users insert own" on profiles;
create policy "users insert own" on profiles for insert with check (auth.uid() = id);

-- No separate WITH CHECK: Postgres applies USING to the new row too, so a user
-- can't move their profile onto another id.
drop policy if exists "users update own" on profiles;
create policy "users update own" on profiles for update using (auth.uid() = id);

-- Every new account gets a profile, named from the provider's metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Reader'),
    new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

-- Only the trigger calls it (July 2026 hardening)
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Create only if missing: dropping a trigger needs ownership of auth.users,
-- which belongs to Supabase's auth role, not the role CI deploys as.
do $$
begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- ── book_ratings ────────────────────────────────────────────────────────────

create table if not exists book_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  isbn text not null,
  stars int not null check (stars between 1 and 5),
  review text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, isbn)
);

create index if not exists idx_book_ratings_isbn on book_ratings (isbn);

alter table book_ratings enable row level security;

drop policy if exists "anyone can view ratings" on book_ratings;
create policy "anyone can view ratings" on book_ratings for select using (true);

drop policy if exists "users insert own ratings" on book_ratings;
create policy "users insert own ratings" on book_ratings for insert with check (auth.uid() = user_id);

drop policy if exists "users update own ratings" on book_ratings;
create policy "users update own ratings" on book_ratings for update using (auth.uid() = user_id);

drop policy if exists "users delete own ratings" on book_ratings;
create policy "users delete own ratings" on book_ratings for delete using (auth.uid() = user_id);
