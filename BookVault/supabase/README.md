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
| 1 | `20240901000000_library.sql` | libraries, library_books, library_cards, book_requests + RLS |
| 2 | `20240901000100_anon_access.sql` | anon read policies for invite/browse |
| 3 | `20250801000000_public_directory.sql` | `public_library_directory` view (hides empty shelves) |
| 4 | `20250801000100_community_books.sql` | shared ISBN-keyed `community_books` catalog |

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

> Note: `profiles` and `book_ratings` are not yet captured as migrations here —
> they exist in the production database. `db push` to production works because
> it targets that database directly, but a fresh `supabase db reset` / local
> stack would need those tables before the `public_directory` view migration.
