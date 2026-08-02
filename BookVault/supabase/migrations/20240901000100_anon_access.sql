-- Allow unauthenticated users to read public libraries and unclaimed invite
-- cards, so invite deep links and anonymous browsing can show library details
-- before the user signs in.

drop policy if exists "Anyone can view public libraries" on libraries;
create policy "Anyone can view public libraries"
  on libraries for select to anon
  using (
    is_public = true
    or exists (
      select 1 from library_cards lc
      where lc.library_id = libraries.id
        and lc.status = 'invite'
        and lc.user_id is null
    )
  );

drop policy if exists "Anyone can view unclaimed invite cards" on library_cards;
create policy "Anyone can view unclaimed invite cards"
  on library_cards for select to anon
  using (status = 'invite' and user_id is null);
