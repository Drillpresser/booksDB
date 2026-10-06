# Schema drift check

Anything changed by hand in the Supabase dashboard (or via MCP / SQL editor) and
not captured in `../migrations/` can be silently reverted by CI's
`supabase db push` — that is how the July 2026 shelf hardening was undone on
2026-08-08. Run this check after any manual database change, and before
trusting that the migrations describe production.

1. **Export production's definitions** (read-only, no row data; uses the access
   token in `BookVault/.mcp.json`):

   ```bash
   node supabase/tools/dump-schema.cjs      # → supabase/.temp/prod_schema.json
   ```

2. **Build a fresh database from the migrations** in a throwaway Postgres 17
   container (any Docker host — e.g. the home server), applying `stub.sql`
   (stands in for Supabase's `auth` schema, roles and realtime publication)
   followed by every file in `../migrations/` in filename order. Then run
   `introspect.sql` against it with `psql -q` and save the output, e.g. to
   `supabase/.temp/fresh_schema.json`.

3. **Compare:**

   ```bash
   node supabase/tools/compare.cjs supabase/.temp/fresh_schema.json
   ```

   `MATCH` means the repo reproduces production. Anything `MISSING in repo` or
   `DIFFERS` needs a new migration (idempotent: `if not exists`,
   `create or replace`, `drop policy if exists` + `create policy`).
