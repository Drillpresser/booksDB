-- Revoke every unclaimed invite issued before the shelf policies were re-hardened.
--
-- From 2026-08-08 until 20261006000000_reharden_shelf_policies.sql, unclaimed
-- invite cards (including invite_token) were readable by anyone holding the
-- public anon key, so every outstanding token must be treated as leaked.
-- Owners re-share an invite from the shelf screen; opening an old link shows
-- "Invite Not Found". Claimed cards are untouched (an audit on 2026-10-05
-- found no unexpected members or approvals).
--
-- The cutoff keeps this a no-op if the migration is ever re-applied.

delete from library_cards
where status = 'invite'
  and user_id is null
  and created_at < '2026-10-06T03:37:27Z'  -- when the re-hardening deployed;
