// Compares a schema built from the migrations (argv[2], JSON from introspect.sql)
// with the production export written by dump-schema.cjs.
const fs = require('fs');
const path = require('path');
const prod = require(path.join(__dirname, '..', '.temp', 'prod_schema.json'));
const fresh = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const keyed = {
  tables: (r) => [r.table, `rls=${r.rls} ri=${r.replica_identity}`],
  columns: (r) => [`${r.table_name}.${r.column_name}`, `${r.udt_name} null=${r.is_nullable} default=${r.column_default ?? ''}`],
  constraints: (r) => [`${r.table}.${r.conname}`, norm(r.def)],
  indexes: (r) => [r.indexname, norm(r.indexdef)],
  policies: (r) => [`${r.tablename}: ${r.policyname}`, `${r.cmd} ${String(r.roles).replace(/[{}"]/g, '')} using=${norm(r.qual)} check=${norm(r.with_check)}`],
  // Function source is stored verbatim: ignore case, comments and whitespace
  functions: (r) => [r.proname, `secdef=${r.security_definer} ${norm((r.def ?? '').replace(/--[^\n]*/g, '')).toLowerCase().replace(/\$[a-z_]*\$/g, '$$')}`],
  function_grants: (r) => [`${r.routine_name} → ${r.grantee}`, 'granted'],
  triggers: (r) => [`${r.table}.${r.tgname}`, norm(r.def)],
  views: (r) => [r.viewname, norm(r.definition)],
  realtime: (r) => [r.tablename, 'published'],
};

let diffs = 0;
for (const [section, toKV] of Object.entries(keyed)) {
  let prodRows = prod[section] ?? [];
  if (section === 'function_grants') {
    prodRows = [...new Map(prodRows.filter((r) => ['anon', 'authenticated', 'PUBLIC'].includes(r.grantee))
      .map((r) => [`${r.routine_name}|${r.grantee}`, r])).values()];
  }
  if (section === 'triggers') prodRows = prodRows.filter((r) => !/^(storage|realtime)\./.test(r.table));
  const p = new Map(prodRows.map(toKV));
  const f = new Map((fresh[section] ?? []).map(toKV));
  for (const [k, v] of p) {
    if (!f.has(k)) { diffs++; console.log(`[${section}] MISSING in repo: ${k}`); }
    else if (f.get(k) !== v) { diffs++; console.log(`[${section}] DIFFERS: ${k}\n   prod: ${v}\n   repo: ${f.get(k)}`); }
  }
  for (const k of f.keys()) if (!p.has(k)) { diffs++; console.log(`[${section}] EXTRA in repo: ${k}`); }
}
console.log(diffs === 0 ? 'MATCH: repo migrations reproduce production' : `${diffs} difference(s)`);
