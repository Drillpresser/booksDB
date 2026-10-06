# Supabase

Database schema is managed as versioned migrations under `migrations/` and
applied with the Supabase CLI. On `main`, the
[`deploy-migrations`](../../.github/workflows/deploy-migrations.yml) GitHub
Actions workflow runs `supabase db push` automatically whenever a migration
file changes.

## Migrations

Files are applied in filename (timestamp) order:

| Order | File | What it creates |
|-------|------|-----------------|
| 0 | `20240831000000_profiles_and_ratings.sql` | `profiles`, `book_ratings`, `handle_new_user` trigger + RLS (captured from production 2026-10-06; dated first because the directory view joins `profiles`) |
| 1 | `20240901000000_library.sql` | libraries, library_books, library_cards, book_requests + RLS |
| 2 | `20240901000100_anon_access.sql` | anon read policies for invite/browse |
| 3 | `20250801000000_public_directory.sql` | `public_library_directory` view (hides empty shelves) |
| 4 | `20250801000100_community_books.sql` | shared ISBN-keyed `community_books` catalog |
| 5 | `20261005000000_community_edit_approval.sql` | contributor-owned catalog entries, `community_book_edits` suggestions, `contribute_community_book` / `review_community_edit` RPCs, field limits |
| 6 | `20261006000000_reharden_shelf_policies.sql` | re-applies the July shelf hardening (owner-only card/request updates, no invite-row access) that files 1–2 reverted on their first CI deploy |
| 7 | `20261006000100_revoke_exposed_invites.sql` | deletes unclaimed invites issued before the re-hardening (their tokens were publicly readable) |
| 8 | `20261006000200_capture_invite_rpcs.sql` | `get_invite` / `claim_invite` RPCs, realtime publication + replica identity for cards/requests (captured from production) |

All migrations are **idempotent** (tables use `IF NOT EXISTS`; policies are
dropped before being recreated; views use `CREATE OR REPLACE`), so they are
safe to apply to a database that was previously provisioned by hand.

### One-time setup on an existing project

Because the production database already contains these objects (they were
applied manually before this folder existed), the first `db push` will run all
four migrations. Idempotency makes that safe — it re-declares the same objects.

Alternatively, baseline the history so they are marked applied without running:

```bash
supabase link --project-ref <ref>
supabase migration repair --status applied \
  20240901000000 20240901000100 20250801000000 20250801000100
```

### CI secrets

The workflow needs these repository secrets:

- `SUPABASE_ACCESS_TOKEN` — a personal access token
- `SUPABASE_DB_PASSWORD` — the project database password
- `SUPABASE_PROJECT_REF` — the project ref (`<ref>` in `https://<ref>.supabase.co`)

## Applying locally

```bash
cd BookVault
supabase link --project-ref <ref>
supabase db push
```

## Keeping the repo and production in sync

Never change the production schema by hand without adding a migration — CI's
`supabase db push` can revert anything the migrations don't describe (this
reopened the July 2026 security fixes on 2026-08-08). `tools/` has a drift
check that rebuilds the schema from the migrations and compares it with
production; see [`tools/README.md`](tools/README.md). As of 2026-10-06 the
migrations reproduce production exactly.

CI runs `supabase db push --include-all`, so a migration dated earlier than the
latest applied one (like `20240831000000`) is still applied. Keep every
migration idempotent.
