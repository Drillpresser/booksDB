# Moderation runbook

App Store Guideline 1.2 requires acting on reports **within 24 hours**. Reports
come from the in-app ⋯ menu (table `content_reports`) or by email to
bookhoarder.app@gmail.com. Check both at least daily.

Run these in the Supabase dashboard → SQL Editor. The editor runs as
`postgres`, which bypasses RLS.

## Open reports

```sql
select r.created_at, r.content_type, r.reason, r.details, r.snapshot,
       p.display_name as reported_user, r.reported_user_id, r.content_id, r.id
from content_reports r
left join profiles p on p.id = r.reported_user_id
where r.status = 'open'
order by r.created_at;
```

`snapshot` is the content as it was when it was reported, so it's still there
if the user has since edited or deleted it.

## Remove the content

| content_type   | delete with                                                     |
|----------------|-----------------------------------------------------------------|
| `review`       | `delete from book_ratings where id = '<content_id>';`           |
| `shelf`        | `delete from libraries where id = '<content_id>';` (cascades to its books, cards, requests) |
| `card`         | `delete from library_cards where id = '<content_id>';`          |
| `request`      | `delete from book_requests where id = '<content_id>';`          |
| `catalog_edit` | `delete from community_book_edits where id = '<content_id>';`   |
| `profile`      | `update profiles set display_name = 'Reader', avatar_url = null where id = '<content_id>';` |

For a shelf whose name is the only problem, you can rename it instead:
`update libraries set name = 'Untitled shelf', description = null where id = '<content_id>';`

## Ban or delete the user

For repeated or severe abuse, go to Dashboard → Authentication → Users, find
the user by `reported_user_id`, and either:

- **Ban.** Use the "Ban user" action. Their data stays, but they can't sign in.
- **Delete.** Removes the account and cascades to everything they posted.

## Close the report

```sql
update content_reports
set status = 'actioned',          -- or 'dismissed'
    resolved_at = now(),
    moderator_notes = 'removed review'
where id = '<report id>';
```
