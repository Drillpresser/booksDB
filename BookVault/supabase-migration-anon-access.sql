-- Run in Supabase SQL editor to fix invite deep links and anonymous browsing.
-- These policies allow unauthenticated users to read public libraries and
-- unclaimed invite cards, so the invite screen can show library details
-- before the user signs in.

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

create policy "Anyone can view unclaimed invite cards"
  on library_cards for select to anon
  using (status = 'invite' and user_id is null);
