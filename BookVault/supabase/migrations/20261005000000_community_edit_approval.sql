-- Community catalog: contributor-approved edits.
--
-- Previously any signed-in user could overwrite any field of any catalog entry
-- (last-write-wins, no history). Now:
--   * The user who first adds an ISBN owns the entry (created_by) and may edit it.
--   * Anyone else's changes become a pending suggestion in community_book_edits;
--     the owner approves (applied atomically) or rejects it.
--   * An entry whose owner deleted their account is adopted by the next contributor.
--   * All writes go through SECURITY DEFINER RPCs; there are no direct
--     INSERT/UPDATE policies left on community_books.
--   * Field limits and a cover-host allow-list bound what can be published.
-- Idempotent like the other migrations.

-- ── Ownership ───────────────────────────────────────────────────────────────

alter table community_books
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Best available owner for rows written before ownership existed
update community_books set created_by = updated_by where created_by is null;

-- ── Clean existing rows so the limits below can be validated ────────────────
-- Rows keyed by a non-canonical ISBN can never match a lookup (the app
-- normalizes ISBNs before querying), so they are dropped. Other fields are
-- trimmed to fit rather than losing the row.

delete from community_books where isbn13 !~ '^97[89][0-9]{10}$' or btrim(title) = '';

update community_books set cover_url = regexp_replace(cover_url, '^http://', 'https://')
where cover_url like 'http://%';
update community_books set cover_url = null
where cover_url is not null
  and cover_url !~ '^https://(covers\.openlibrary\.org|books\.google\.com|books\.googleusercontent\.com)/';

update community_books set synopsis = left(synopsis, 5000) where char_length(synopsis) > 5000;
update community_books set title = left(btrim(title), 500) where char_length(btrim(title)) > 500;
update community_books set publisher = left(publisher, 200) where char_length(publisher) > 200;
update community_books set dewey_decimal = left(dewey_decimal, 30) where char_length(dewey_decimal) > 30;
update community_books set published_year = null where published_year not between 1000 and 2100;
update community_books set page_count = null where page_count not between 1 and 20000;
update community_books set authors = '[]'::jsonb where jsonb_typeof(authors) <> 'array';
update community_books
set authors = (select jsonb_agg(a) from (select a from jsonb_array_elements(authors) a limit 20) s)
where jsonb_typeof(authors) = 'array' and jsonb_array_length(authors) > 20;

-- ── Field limits ────────────────────────────────────────────────────────────
-- Every stored row satisfies these after the cleanup above, so they are fully validated.

alter table community_books drop constraint if exists community_books_isbn13_format;
alter table community_books add constraint community_books_isbn13_format
  check (isbn13 ~ '^97[89][0-9]{10}$');

-- One definition of the field rules, used by the table constraint and checked
-- up front by contribute_community_book so a bad suggestion is refused when
-- it's made rather than failing later when the owner approves it.
create or replace function public.community_book_fields_valid(
  p_title text,
  p_authors jsonb,
  p_publisher text,
  p_published_year int,
  p_page_count int,
  p_synopsis text,
  p_dewey_decimal text
) returns boolean
language sql
immutable
as $$
  select coalesce(
    char_length(btrim(p_title)) between 1 and 500
    and jsonb_typeof(p_authors) = 'array' and jsonb_array_length(p_authors) <= 20
    and (p_publisher is null or char_length(p_publisher) <= 200)
    and (p_published_year is null or p_published_year between 1000 and 2100)
    and (p_page_count is null or p_page_count between 1 and 20000)
    and (p_synopsis is null or char_length(p_synopsis) <= 5000)
    and (p_dewey_decimal is null or char_length(p_dewey_decimal) <= 30),
    false)
$$;

alter table community_books drop constraint if exists community_books_field_limits;
alter table community_books add constraint community_books_field_limits check (
  public.community_book_fields_valid(title, authors, publisher, published_year, page_count, synopsis, dewey_decimal)
);

-- Shared covers may only come from the public catalogs the app looks up;
-- an arbitrary URL would let anyone show any image to other users.
-- (contribute_community_book applies the same pattern.)
alter table community_books drop constraint if exists community_books_cover_host;
alter table community_books add constraint community_books_cover_host check (
  cover_url is null
  or cover_url ~ '^https://(covers\.openlibrary\.org|books\.google\.com|books\.googleusercontent\.com)/'
);

-- ── Writes only via RPC ─────────────────────────────────────────────────────

drop policy if exists "Authenticated users can contribute community books" on community_books;
drop policy if exists "Authenticated users can update community books" on community_books;

-- ── Suggested edits ─────────────────────────────────────────────────────────

create table if not exists community_book_edits (
  id uuid primary key default gen_random_uuid(),
  isbn13 text not null references community_books(isbn13) on delete cascade,
  proposed_by uuid not null references auth.users(id) on delete cascade,
  -- Only the fields that differ from the entry at proposal time, keyed by column name
  changes jsonb not null check (jsonb_typeof(changes) = 'object' and pg_column_size(changes) <= 16000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists community_book_edits_isbn_pending
  on community_book_edits (isbn13) where status = 'pending';

alter table community_book_edits enable row level security;

-- Proposers see their own suggestions; entry owners see suggestions for their entries.
drop policy if exists "Proposers and owners can read edits" on community_book_edits;
create policy "Proposers and owners can read edits"
  on community_book_edits for select to authenticated
  using (
    proposed_by = auth.uid()
    or exists (
      select 1 from community_books b
      where b.isbn13 = community_book_edits.isbn13 and b.created_by = auth.uid()
    )
  );

-- Proposers may withdraw a suggestion that hasn't been reviewed yet.
drop policy if exists "Proposers can withdraw pending edits" on community_book_edits;
create policy "Proposers can withdraw pending edits"
  on community_book_edits for delete to authenticated
  using (proposed_by = auth.uid() and status = 'pending');

-- ── contribute_community_book ───────────────────────────────────────────────
-- Returns what happened: 'created' | 'updated' | 'proposed' | 'unchanged' | 'skipped'.
-- p_propose = false (adding a book) never creates a suggestion; only explicit
-- edits do. A null cover never removes a shared cover — the app sends null when
-- the user's cover is a private on-device photo.

create or replace function public.contribute_community_book(
  p_isbn13 text,
  p_title text,
  p_authors jsonb,
  p_publisher text,
  p_published_year int,
  p_page_count int,
  p_synopsis text,
  p_cover_url text,
  p_dewey_decimal text,
  p_propose boolean default false
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.community_books;
  v_changes jsonb := '{}'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_isbn13 !~ '^97[89][0-9]{10}$'
     or not public.community_book_fields_valid(p_title, coalesce(p_authors, '[]'::jsonb), p_publisher,
                                               p_published_year, p_page_count, p_synopsis, p_dewey_decimal) then
    raise exception 'Invalid book details' using errcode = '22023';
  end if;
  -- A cover from anywhere else is ignored rather than failing the contribution
  if p_cover_url !~ '^https://(covers\.openlibrary\.org|books\.google\.com|books\.googleusercontent\.com)/' then
    p_cover_url := null;
  end if;

  select * into v_row from public.community_books where isbn13 = p_isbn13 for update;

  if not found then
    insert into public.community_books
      (isbn13, title, authors, publisher, published_year, page_count, synopsis,
       cover_url, dewey_decimal, created_by, updated_by)
    values
      (p_isbn13, p_title, coalesce(p_authors, '[]'::jsonb), p_publisher, p_published_year,
       p_page_count, p_synopsis, p_cover_url, p_dewey_decimal, v_uid, v_uid);
    return 'created';
  end if;

  -- Owner edits apply directly; an orphaned entry is adopted by this contributor
  if v_row.created_by = v_uid or v_row.created_by is null then
    update public.community_books set
      title = p_title,
      authors = coalesce(p_authors, '[]'::jsonb),
      publisher = p_publisher,
      published_year = p_published_year,
      page_count = p_page_count,
      synopsis = p_synopsis,
      cover_url = coalesce(p_cover_url, v_row.cover_url),
      dewey_decimal = p_dewey_decimal,
      created_by = v_uid,
      updated_by = v_uid,
      updated_at = now()
    where isbn13 = p_isbn13;
    return 'updated';
  end if;

  -- Someone else's entry: collect only the fields that actually differ
  if p_title is distinct from v_row.title then
    v_changes := v_changes || jsonb_build_object('title', p_title);
  end if;
  if coalesce(p_authors, '[]'::jsonb) is distinct from v_row.authors then
    v_changes := v_changes || jsonb_build_object('authors', coalesce(p_authors, '[]'::jsonb));
  end if;
  if p_publisher is distinct from v_row.publisher then
    v_changes := v_changes || jsonb_build_object('publisher', p_publisher);
  end if;
  if p_published_year is distinct from v_row.published_year then
    v_changes := v_changes || jsonb_build_object('published_year', p_published_year);
  end if;
  if p_page_count is distinct from v_row.page_count then
    v_changes := v_changes || jsonb_build_object('page_count', p_page_count);
  end if;
  if p_synopsis is distinct from v_row.synopsis then
    v_changes := v_changes || jsonb_build_object('synopsis', p_synopsis);
  end if;
  if p_cover_url is not null and p_cover_url is distinct from v_row.cover_url then
    v_changes := v_changes || jsonb_build_object('cover_url', p_cover_url);
  end if;
  if p_dewey_decimal is distinct from v_row.dewey_decimal then
    v_changes := v_changes || jsonb_build_object('dewey_decimal', p_dewey_decimal);
  end if;

  if v_changes = '{}'::jsonb then
    return 'unchanged';
  end if;
  if not p_propose then
    return 'skipped';
  end if;

  -- One open suggestion per user per book: a newer edit replaces the older one
  delete from public.community_book_edits
  where isbn13 = p_isbn13 and proposed_by = v_uid and status = 'pending';

  insert into public.community_book_edits (isbn13, proposed_by, changes)
  values (p_isbn13, v_uid, v_changes);
  return 'proposed';
end;
$$;

-- ── review_community_edit ───────────────────────────────────────────────────
-- Only the entry's owner may review. Approval applies the suggested fields in
-- the same transaction; the table's constraints still validate the result.

create or replace function public.review_community_edit(p_edit_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edit public.community_book_edits;
  v_owner uuid;
  c jsonb;
begin
  select * into v_edit from public.community_book_edits where id = p_edit_id for update;
  if not found or v_edit.status <> 'pending' then
    raise exception 'Suggestion not found or already reviewed' using errcode = 'P0002';
  end if;

  select created_by into v_owner from public.community_books where isbn13 = v_edit.isbn13;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Only the book''s contributor can review suggestions' using errcode = '42501';
  end if;

  if p_approve then
    c := v_edit.changes;
    update public.community_books b set
      title          = case when c ? 'title'          then c->>'title'                 else b.title end,
      authors        = case when c ? 'authors'        then c->'authors'                else b.authors end,
      publisher      = case when c ? 'publisher'      then c->>'publisher'             else b.publisher end,
      published_year = case when c ? 'published_year' then (c->>'published_year')::int else b.published_year end,
      page_count     = case when c ? 'page_count'     then (c->>'page_count')::int     else b.page_count end,
      synopsis       = case when c ? 'synopsis'       then c->>'synopsis'              else b.synopsis end,
      cover_url      = case when c ? 'cover_url'      then c->>'cover_url'             else b.cover_url end,
      dewey_decimal  = case when c ? 'dewey_decimal'  then c->>'dewey_decimal'         else b.dewey_decimal end,
      updated_by = v_edit.proposed_by,
      updated_at = now()
    where b.isbn13 = v_edit.isbn13;
  end if;

  update public.community_book_edits
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_at = now()
  where id = p_edit_id;
end;
$$;

revoke execute on function public.contribute_community_book(text, text, jsonb, text, int, int, text, text, text, boolean) from public, anon;
grant execute on function public.contribute_community_book(text, text, jsonb, text, int, int, text, text, text, boolean) to authenticated;

revoke execute on function public.review_community_edit(uuid, boolean) from public, anon;
grant execute on function public.review_community_edit(uuid, boolean) to authenticated;
