-- Re-apply the July 2026 shelf security hardening.
--
-- 20240901000000_library.sql and 20240901000100_anon_access.sql still contain
-- the original policies that the July security sweep replaced by hand. When CI
-- first ran `supabase db push` (2026-08-08) it re-created them, and because
-- permissive policies are OR'd together they re-opened these holes alongside
-- the hardened ones:
--   * any signed-in user could UPDATE an unclaimed invite card to claim it,
--     joining a private shelf without the invite token;
--   * anyone (even signed out, using the public anon key) could read every
--     unclaimed invite card, including its invite_token;
--   * a pending applicant could approve their own library card;
--   * a requester could approve their own book request.
--
-- Invites are previewed and claimed only through the SECURITY DEFINER RPCs
-- get_invite / claim_invite, so invite rows need no direct access at all.
-- Idempotent: safe to re-run.

-- ── Signed-out access ───────────────────────────────────────────────────────

drop policy if exists "Anyone can view unclaimed invite cards" on library_cards;

-- Signed-out visitors may browse public shelves only (invite previews use get_invite)
drop policy if exists "Anyone can view public libraries" on libraries;
create policy "Anyone can view public libraries"
  on libraries for select to anon
  using (is_public = true);

-- ── library_cards ───────────────────────────────────────────────────────────

-- Invite rows are no longer readable: only the holder and the shelf owner see a card
drop policy if exists "Owners, card holders, and unclaimed invites are visible" on library_cards;
drop policy if exists "Owners and card holders can view cards" on library_cards;
create policy "Owners and card holders can view cards"
  on library_cards for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid())
  );

-- Only the shelf owner changes a card's status; applicants withdraw by DELETE
-- and claim invites through claim_invite
drop policy if exists "Owners and users can update cards" on library_cards;
drop policy if exists "Owners can update cards" on library_cards;
create policy "Owners can update cards"
  on library_cards for update to authenticated
  using (exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid()));

-- ── book_requests ───────────────────────────────────────────────────────────

-- Only the shelf owner approves / denies / fulfils (requesters can't change a request once made)
drop policy if exists "Owners and requesters can update" on book_requests;
drop policy if exists "Owners can update requests" on book_requests;
create policy "Owners can update requests"
  on book_requests for update to authenticated
  using (exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from libraries l where l.id = library_id and l.owner_id = auth.uid()));
