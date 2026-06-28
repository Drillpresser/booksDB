-- Run this in your Supabase SQL editor:
-- https://supabase.com/dashboard/project/_/sql/new

-- Libraries: users can own multiple
create table if not exists libraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists libraries_owner_idx on libraries(owner_id);
create index if not exists libraries_public_idx on libraries(is_public) where is_public = true;

-- Library books: a copy can live in multiple libraries
create table if not exists library_books (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references libraries(id) on delete cascade,
  copy_id text not null,
  record_id text not null,
  title text not null,
  authors jsonb not null default '[]',
  sort_author text not null default '',
  isbn13 text,
  publisher text,
  published_year int,
  page_count int,
  synopsis text,
  cover_image text,
  dewey_decimal text,
  copy_number int not null default 1,
  division_code text,
  division_name text,
  section_code text,
  section_name text,
  main_class_code text,
  main_class_name text,
  is_on_loan boolean not null default false,
  synced_at timestamptz not null default now(),
  unique(library_id, copy_id)
);
create index if not exists library_books_library_idx on library_books(library_id);
create index if not exists library_books_copy_idx on library_books(copy_id);

-- Library cards: access requests, approvals, and invite tokens
create table if not exists library_cards (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references libraries(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'denied', 'invite')),
  invite_token text unique,
  message text,
  requester_display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(library_id, user_id)
);
create index if not exists library_cards_library_idx on library_cards(library_id);
create index if not exists library_cards_user_idx on library_cards(user_id);
create index if not exists library_cards_token_idx on library_cards(invite_token);

-- Book requests from cardholders
create table if not exists book_requests (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references libraries(id) on delete cascade,
  copy_id text not null,
  book_title text not null,
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_display_name text,
  type text not null check (type in ('checkout', 'hold')),
  status text not null check (status in ('pending', 'approved', 'denied', 'fulfilled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists book_requests_library_idx on book_requests(library_id);
create index if not exists book_requests_requester_idx on book_requests(requester_id);

-- Enable RLS
alter table libraries enable row level security;
alter table library_books enable row level security;
alter table library_cards enable row level security;
alter table book_requests enable row level security;

-- ── libraries ──────────────────────────────────────────────────────────────

create policy "Authenticated users can view public libraries or own"
  on libraries for select to authenticated
  using (is_public = true or owner_id = auth.uid());

create policy "Users can create their own libraries"
  on libraries for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update their libraries"
  on libraries for update to authenticated
  using (owner_id = auth.uid());

create policy "Owners can delete their libraries"
  on libraries for delete to authenticated
  using (owner_id = auth.uid());

-- ── library_books ──────────────────────────────────────────────────────────

create policy "Books visible for accessible libraries"
  on library_books for select to authenticated
  using (
    exists (
      select 1 from libraries l
      where l.id = library_id
      and (l.is_public = true or l.owner_id = auth.uid())
    )
    or exists (
      select 1 from library_cards lc
      where lc.library_id = library_books.library_id
      and lc.user_id = auth.uid()
      and lc.status = 'approved'
    )
  );

create policy "Owners can manage their library books"
  on library_books for all to authenticated
  using (
    exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
  );

-- ── library_cards ──────────────────────────────────────────────────────────

create policy "Owners, card holders, and unclaimed invites are visible"
  on library_cards for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
    or (status = 'invite' and user_id is null)
  );

create policy "Users can apply for cards"
  on library_cards for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy "Owners can create invite cards"
  on library_cards for insert to authenticated
  with check (
    user_id is null and status = 'invite'
    and exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
  );

create policy "Owners and users can update cards"
  on library_cards for update to authenticated
  using (
    exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
    or user_id = auth.uid()
    or (status = 'invite' and user_id is null)
  );

create policy "Owners and users can delete cards"
  on library_cards for delete to authenticated
  using (
    exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
    or user_id = auth.uid()
  );

-- ── book_requests ──────────────────────────────────────────────────────────

create policy "Requester and owner can view requests"
  on book_requests for select to authenticated
  using (
    requester_id = auth.uid()
    or exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
  );

create policy "Approved cardholders can request"
  on book_requests for insert to authenticated
  with check (
    requester_id = auth.uid()
    and exists (
      select 1 from library_cards lc
      where lc.library_id = book_requests.library_id
      and lc.user_id = auth.uid()
      and lc.status = 'approved'
    )
  );

create policy "Owners and requesters can update"
  on book_requests for update to authenticated
  using (
    requester_id = auth.uid()
    or exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
  );
