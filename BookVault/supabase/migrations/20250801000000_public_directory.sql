-- Public shelf directory: public libraries that hold at least one book, with
-- their owner's display name and book count precomputed. Empty shelves are
-- excluded here (at the database level) so they never appear in public browse
-- and the 50-row page limit applies to non-empty shelves only.
--
-- security_invoker = on makes the view respect the querying user's RLS on the
-- underlying tables. The existing policies already let any authenticated user
-- read public libraries, their books, and profile display names, so this is
-- exactly the data the browse screen is allowed to see.

create or replace view public_library_directory
  with (security_invoker = on) as
select
  l.id,
  l.owner_id,
  l.name,
  l.description,
  l.is_public,
  l.created_at,
  coalesce(p.display_name, 'Reader') as owner_display_name,
  count(lb.id) as book_count
from libraries l
left join profiles p on p.id = l.owner_id
left join library_books lb on lb.library_id = l.id
where l.is_public = true
group by l.id, p.display_name
having count(lb.id) > 0;

grant select on public_library_directory to authenticated;
