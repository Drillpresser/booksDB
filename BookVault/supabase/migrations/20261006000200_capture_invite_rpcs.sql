-- The rest of the July 2026 hand-applied changes, captured from production
-- (2026-10-06) so CI can never revert them again. Production already matches;
-- every statement here is idempotent.

-- ── Invite RPCs ─────────────────────────────────────────────────────────────
-- Invite rows aren't readable directly (see 20261006000000); the token is the
-- capability, validated here.

create or replace function public.get_invite(p_token text)
returns table (card_id uuid, library_id uuid, library_name text, library_description text)
language sql
security definer
set search_path = ''
as $$
  select lc.id, l.id, l.name, l.description
  from public.library_cards lc
  join public.libraries l on l.id = lc.library_id
  where lc.invite_token = p_token and lc.status = 'invite' and lc.user_id is null
  limit 1;
$$;

create or replace function public.claim_invite(p_token text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  -- Single-use: only an unclaimed invite matches, and claiming it clears that state
  update public.library_cards
  set user_id = auth.uid(),
      status = 'approved',
      requester_display_name = coalesce(p_display_name, requester_display_name),
      updated_at = now()
  where invite_token = p_token and status = 'invite' and user_id is null
  returning id into v_card_id;
  if v_card_id is null then
    raise exception 'invalid or already-claimed invite';
  end if;
  return v_card_id;
end;
$$;

-- Previewing works signed out (invite links open before sign-in); claiming needs an account
revoke execute on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;
revoke execute on function public.claim_invite(text, text) from public, anon;
grant execute on function public.claim_invite(text, text) to authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- The owner's shelf screen subscribes to these with a library_id filter. DELETE
-- events only carry filterable columns with REPLICA IDENTITY FULL.

alter table library_cards replica identity full;
alter table book_requests replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'library_cards') then
    alter publication supabase_realtime add table public.library_cards;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'book_requests') then
    alter publication supabase_realtime add table public.book_requests;
  end if;
end $$;

-- ── Tidy-up ─────────────────────────────────────────────────────────────────
-- July's owner-only card update policy duplicates "Owners can update cards"
-- from 20261006000000 (identical USING / WITH CHECK); keep one.
drop policy if exists "Owners can update cards in their library" on library_cards;
