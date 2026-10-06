-- Same definitions as dump-schema.cjs, emitted as one JSON document.
\pset tuples_only on
\pset format unaligned
select json_build_object(
  'tables', (select json_agg(t order by t.table) from (
      select c.relname as table, c.relrowsecurity as rls, c.relreplident::text as replica_identity
      from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r') t),
  'columns', (select json_agg(t order by t.table_name, t.column_name) from (
      select table_name, column_name, udt_name, is_nullable, column_default
      from information_schema.columns where table_schema = 'public') t),
  'constraints', (select json_agg(t order by t.table, t.conname) from (
      select conrelid::regclass::text as table, conname, pg_get_constraintdef(oid) as def
      from pg_constraint where connamespace = 'public'::regnamespace) t),
  'indexes', (select json_agg(t order by t.indexname) from (
      select tablename, indexname, indexdef from pg_indexes where schemaname = 'public') t),
  'policies', (select json_agg(t order by t.tablename, t.policyname) from (
      select tablename, policyname, roles::text as roles, cmd, qual, with_check
      from pg_policies where schemaname = 'public') t),
  'functions', (select json_agg(t order by t.proname) from (
      select p.proname, p.prosecdef as security_definer, pg_get_functiondef(p.oid) as def
      from pg_proc p where p.pronamespace = 'public'::regnamespace) t),
  'function_grants', (select json_agg(t order by t.routine_name, t.grantee) from (
      select distinct routine_name, grantee from information_schema.routine_privileges
      where routine_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')) t),
  'triggers', (select json_agg(t order by t.tgname) from (
      select tgrelid::regclass::text as table, tgname, pg_get_triggerdef(oid) as def
      from pg_trigger where not tgisinternal) t),
  'views', (select json_agg(t) from (select viewname, definition from pg_views where schemaname = 'public') t),
  'realtime', (select json_agg(t order by t.tablename) from (
      select tablename from pg_publication_tables where pubname = 'supabase_realtime') t)
);
