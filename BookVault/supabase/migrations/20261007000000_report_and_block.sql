-- Reporting and blocking (App Store Guideline 1.2 — user-generated content).
--
-- Blocking: when A blocks B,
--   * A stops seeing B's reviews, shelves (and their books), card applications,
--     book requests, and suggested catalog edits — enforced here with
--     RESTRICTIVE select policies, so they can only narrow what the existing
--     permissive policies allow and never re-open access;
--   * B can no longer apply for a card on, or request books from, A's shelves;
--   * B's existing cards and requests on A's shelves are deleted (unblocking
--     does not restore them).
--
-- Reporting: report_content() records a report with a server-side snapshot of
-- the reported content, so moderation still has the evidence if it is edited
-- or deleted afterwards. Reports are not readable through the API; they're
-- reviewed in the Supabase dashboard (see supabase/tools/MODERATION.md).
--
-- Idempotent: safe to re-run.

-- ── user_blocks ─────────────────────────────────────────────────────────────

create table if not exists user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table user_blocks enable row level security;

drop policy if exists "Users see their own blocks" on user_blocks;
create policy "Users see their own blocks"
  on user_blocks for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "Users block others" on user_blocks;
create policy "Users block others"
  on user_blocks for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "Users unblock others" on user_blocks;
create policy "Users unblock others"
  on user_blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- Has the current user blocked p_user? Invoker rights: callers only ever read
-- their own block rows. False when signed out.
create or replace function public.i_blocked(p_user uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks
    where blocker_id = auth.uid() and blocked_id = p_user
  );
$$;

grant execute on function public.i_blocked(uuid) to anon, authenticated;

-- Has the owner of p_library blocked the current user? Needs definer rights:
-- the blocked user can't read the owner's block rows.
create or replace function public.blocked_by_library_owner(p_library uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.libraries l
    join public.user_blocks b on b.blocker_id = l.owner_id
    where l.id = p_library and b.blocked_id = auth.uid()
  );
$$;

revoke execute on function public.blocked_by_library_owner(uuid) from public, anon;
grant execute on function public.blocked_by_library_owner(uuid) to authenticated;

-- ── Hide blocked users' content from the blocker ────────────────────────────

drop policy if exists "Hide reviews from blocked users" on book_ratings;
create policy "Hide reviews from blocked users"
  on book_ratings as restrictive for select
  using (not public.i_blocked(user_id));

-- Also hides the shelf's books, which are only visible through an accessible shelf
drop policy if exists "Hide shelves of blocked users" on libraries;
create policy "Hide shelves of blocked users"
  on libraries as restrictive for select
  using (not public.i_blocked(owner_id));

drop policy if exists "Hide cards from blocked users" on library_cards;
create policy "Hide cards from blocked users"
  on library_cards as restrictive for select
  using (user_id is null or not public.i_blocked(user_id));

drop policy if exists "Hide requests from blocked users" on book_requests;
create policy "Hide requests from blocked users"
  on book_requests as restrictive for select
  using (not public.i_blocked(requester_id));

drop policy if exists "Hide suggested edits from blocked users" on community_book_edits;
create policy "Hide suggested edits from blocked users"
  on community_book_edits as restrictive for select
  using (not public.i_blocked(proposed_by));

-- ── Blocked users can't reach the blocker's shelves ─────────────────────────

drop policy if exists "Blocked users cannot apply" on library_cards;
create policy "Blocked users cannot apply"
  on library_cards as restrictive for insert to authenticated
  with check (not public.blocked_by_library_owner(library_id));

drop policy if exists "Blocked users cannot request" on book_requests;
create policy "Blocked users cannot request"
  on book_requests as restrictive for insert to authenticated
  with check (not public.blocked_by_library_owner(library_id));

-- Remove the blocked user's cards and requests on the blocker's shelves
create or replace function public.on_user_blocked()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.book_requests r
  using public.libraries l
  where r.library_id = l.id and l.owner_id = new.blocker_id and r.requester_id = new.blocked_id;

  delete from public.library_cards c
  using public.libraries l
  where c.library_id = l.id and l.owner_id = new.blocker_id and c.user_id = new.blocked_id;

  return new;
end;
$$;

revoke execute on function public.on_user_blocked() from public, anon, authenticated;

drop trigger if exists on_user_blocked on user_blocks;
create trigger on_user_blocked
  after insert on user_blocks
  for each row execute function public.on_user_blocked();

-- ── content_reports ─────────────────────────────────────────────────────────

create table if not exists content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  reported_user_id uuid references auth.users(id) on delete set null,
  content_type text not null
    check (content_type in ('review', 'shelf', 'card', 'request', 'catalog_edit', 'profile')),
  content_id uuid not null,
  reason text not null
    check (reason in ('spam', 'harassment', 'sexual', 'violence', 'other')),
  details text check (char_length(details) <= 1000),
  -- The reported content as it was when reported
  snapshot jsonb,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  moderator_notes text
);

create index if not exists content_reports_open on content_reports (created_at) where status = 'open';
create unique index if not exists content_reports_once_per_reporter
  on content_reports (reporter_id, content_type, content_id);

-- RLS on with no policies: only report_content() writes, only the dashboard reads
alter table content_reports enable row level security;

-- Returns 'reported', or 'already_reported' if this user reported it before.
create or replace function public.report_content(
  p_type text,
  p_id uuid,
  p_reason text,
  p_details text default null
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user uuid;
  v_snapshot jsonb;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  if (select count(*) from public.content_reports
      where reporter_id = v_uid and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Too many reports today' using errcode = '54000';
  end if;

  case p_type
    when 'review' then
      select user_id, jsonb_build_object('isbn', isbn, 'stars', stars, 'review', review)
        into v_user, v_snapshot from public.book_ratings where id = p_id;
    when 'shelf' then
      select owner_id, jsonb_build_object('name', name, 'description', description, 'is_public', is_public)
        into v_user, v_snapshot from public.libraries where id = p_id;
    when 'card' then
      select user_id, jsonb_build_object('library_id', library_id, 'message', message,
                                         'display_name', requester_display_name)
        into v_user, v_snapshot from public.library_cards where id = p_id;
    when 'request' then
      select requester_id, jsonb_build_object('library_id', library_id, 'book_title', book_title,
                                              'notes', notes, 'display_name', requester_display_name)
        into v_user, v_snapshot from public.book_requests where id = p_id;
    when 'catalog_edit' then
      select proposed_by, jsonb_build_object('isbn13', isbn13, 'changes', changes)
        into v_user, v_snapshot from public.community_book_edits where id = p_id;
    when 'profile' then
      select id, jsonb_build_object('display_name', display_name, 'avatar_url', avatar_url)
        into v_user, v_snapshot from public.profiles where id = p_id;
    else
      raise exception 'Unknown content type %', p_type using errcode = '22023';
  end case;

  if v_snapshot is null then
    raise exception 'Content not found' using errcode = 'P0002';
  end if;

  insert into public.content_reports
    (reporter_id, reported_user_id, content_type, content_id, reason, details, snapshot)
  values
    (v_uid, v_user, p_type, p_id, p_reason, nullif(btrim(left(p_details, 1000)), ''), v_snapshot)
  on conflict (reporter_id, content_type, content_id) do nothing;

  return case when found then 'reported' else 'already_reported' end;
end;
$$;

revoke execute on function public.report_content(text, uuid, text, text) from public, anon;
grant execute on function public.report_content(text, uuid, text, text) to authenticated;
