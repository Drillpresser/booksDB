// Read-only: exports the public schema's DEFINITIONS (no row data) from the
// BookHoarder Supabase project via the Management API, using the personal
// access token in BookVault/.mcp.json. Writes prod_schema.json to the
// script's sibling supabase/.temp/ (gitignored).
const fs = require('fs');
const path = require('path');

const REF = 'xukrezkcuufoqkiwnkkj';
const mcpPath = path.join(__dirname, '..', '..', '.mcp.json');
const outDir = path.join(__dirname, '..', '.temp');
const token = (JSON.stringify(JSON.parse(fs.readFileSync(mcpPath, 'utf8'))).match(/sbp_[A-Za-z0-9]+/) || [])[0];
if (!token) { console.error('No Supabase access token found in .mcp.json'); process.exit(1); }

const queries = {
  migrations: `select version, name from supabase_migrations.schema_migrations order by version`,
  tables: `select c.relname as table, c.relrowsecurity as rls, c.relreplident as replica_identity
           from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1`,
  columns: `select table_name, column_name, data_type, udt_name, is_nullable, column_default
            from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`,
  constraints: `select conrelid::regclass::text as table, conname, contype, pg_get_constraintdef(oid) as def
                from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2`,
  indexes: `select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by 1, 2`,
  policies: `select tablename, policyname, permissive, roles, cmd, qual, with_check
             from pg_policies where schemaname = 'public' order by 1, 2`,
  functions: `select p.proname, p.prosecdef as security_definer, pg_get_functiondef(p.oid) as def
              from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1`,
  function_grants: `select routine_name, grantee, privilege_type from information_schema.routine_privileges
                    where routine_schema = 'public' order by 1, 2`,
  triggers: `select tgrelid::regclass::text as table, tgname, pg_get_triggerdef(oid) as def
             from pg_trigger
             where not tgisinternal
               and tgrelid::regclass::text not like 'storage.%'
               and tgrelid::regclass::text not like 'realtime.%'
             order by 1, 2`,
  table_grants: `select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privs
                 from information_schema.role_table_grants
                 where table_schema = 'public' and grantee in ('anon', 'authenticated')
                 group by 1, 2 order by 1, 2`,
  views: `select viewname, definition from pg_views where schemaname = 'public'`,
  realtime: `select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime'`,
};

(async () => {
  const out = {};
  for (const [name, query] of Object.entries(queries)) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    out[name] = res.ok ? await res.json() : { error: res.status, body: await res.text() };
    console.log(`${name}: ${res.ok ? (Array.isArray(out[name]) ? out[name].length + ' rows' : 'ok') : 'HTTP ' + res.status}`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, 'prod_schema.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log('Saved', file);
})().catch((e) => { console.error(e); process.exit(1); });
