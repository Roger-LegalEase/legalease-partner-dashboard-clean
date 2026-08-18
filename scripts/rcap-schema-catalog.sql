-- Normalized catalog inventory of the `public` schema plus the Storage surface.
--
-- One TSV line per definition: class, identity, definition. Sorted, so two
-- databases are identical exactly when their inventories are byte-identical.
-- Role OIDs are resolved to role names and owners are omitted, because the
-- local lab and Production do not share OIDs or an owning role name.
--
--   psql "$URL" -At -F $'\t' -f scripts/rcap-schema-catalog.sql
--
-- Used by scripts/rcap-schema-upgrade-lab.sh and
-- scripts/verify-rcap-production-schema-upgrade.mjs.

with
tables as (
  select 'table' as class, c.relname::text as identity,
         case c.relkind when 'p' then 'partitioned' else 'ordinary' end as definition
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
columns as (
  select 'column', c.relname || '.' || a.attname,
         format_type(a.atttypid, a.atttypmod)
           || case when a.attnotnull then ' not null' else ' null' end
           || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')
           || case when a.attidentity <> '' then ' identity ' || a.attidentity::text else '' end
           || case when a.attgenerated <> '' then ' generated ' || a.attgenerated::text else '' end
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
    and a.attnum > 0 and not a.attisdropped
),
constraints as (
  select 'constraint', c.relname || '.' || con.conname, pg_get_constraintdef(con.oid)
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
indexes as (
  select 'index', c.relname || '.' || ic.relname, pg_get_indexdef(i.indexrelid)
  from pg_index i
  join pg_class c on c.oid = i.indrelid
  join pg_class ic on ic.oid = i.indexrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
triggers as (
  select 'trigger', c.relname || '.' || t.tgname, pg_get_triggerdef(t.oid)
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
functions as (
  select 'function',
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         pg_get_functiondef(p.oid)
           || ' | security ' || case when p.prosecdef then 'definer' else 'invoker' end
           || ' | config ' || coalesce(array_to_string(p.proconfig, ','), '(none)')
           || ' | volatility ' || p.provolatile::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
),
views as (
  select case c.relkind when 'm' then 'matview' else 'view' end, c.relname::text,
         pg_get_viewdef(c.oid, true)
           || ' | options ' || coalesce(array_to_string(c.reloptions, ','), '(none)')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v', 'm')
),
sequences as (
  select 'sequence', c.relname::text,
         s.seqtypid::regtype::text || ' increment ' || s.seqincrement
           || ' start ' || s.seqstart || ' cycle ' || s.seqcycle
  from pg_sequence s
  join pg_class c on c.oid = s.seqrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
enums as (
  select 'enum', t.typname::text,
         (select string_agg(e.enumlabel, ',' order by e.enumsortorder)
          from pg_enum e where e.enumtypid = t.oid)
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typtype = 'e'
),
rls as (
  select 'rls', c.relname::text,
         'enabled ' || c.relrowsecurity || ' forced ' || c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
policies as (
  select 'policy', p.tablename || '.' || p.policyname,
         'permissive ' || p.permissive
           || ' | roles ' || array_to_string(p.roles, ',')
           || ' | cmd ' || p.cmd
           || ' | using ' || coalesce(p.qual, '(none)')
           || ' | check ' || coalesce(p.with_check, '(none)')
  from pg_policies p
  where p.schemaname = 'public'
),
relation_grants as (
  select 'grant.relation', c.relname || '.' || acl.grantee_name || '.' || acl.privilege_type, ''
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join lateral (
    select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee_name,
           a.privilege_type
    from aclexplode(c.relacl) a
  ) acl
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'S')
),
column_grants as (
  select 'grant.column',
         c.relname || '.' || a.attname || '.' || acl.grantee_name || '.' || acl.privilege_type, ''
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  cross join lateral (
    select case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end as grantee_name,
           x.privilege_type
    from aclexplode(a.attacl) x
  ) acl
  where n.nspname = 'public' and a.attnum > 0 and not a.attisdropped
),
function_grants as (
  select 'grant.function',
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ').'
           || acl.grantee_name || '.' || acl.privilege_type, ''
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral (
    select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee_name,
           a.privilege_type
    from aclexplode(p.proacl) a
  ) acl
  where n.nspname = 'public'
),
storage_buckets as (
  select 'storage.bucket', b.id::text, 'public ' || coalesce(b.public::text, 'null')
  from storage.buckets b
),
storage_policies as (
  select 'storage.policy', p.tablename || '.' || p.policyname,
         'permissive ' || p.permissive
           || ' | roles ' || array_to_string(p.roles, ',')
           || ' | cmd ' || p.cmd
           || ' | using ' || coalesce(p.qual, '(none)')
           || ' | check ' || coalesce(p.with_check, '(none)')
  from pg_policies p
  where p.schemaname = 'storage'
),
storage_rls as (
  select 'storage.rls', c.relname::text,
         'enabled ' || c.relrowsecurity || ' forced ' || c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage' and c.relkind = 'r'
),
everything as (
  select * from tables
  union all select * from columns
  union all select * from constraints
  union all select * from indexes
  union all select * from triggers
  union all select * from functions
  union all select * from views
  union all select * from sequences
  union all select * from enums
  union all select * from rls
  union all select * from policies
  union all select * from relation_grants
  union all select * from column_grants
  union all select * from function_grants
  union all select * from storage_buckets
  union all select * from storage_policies
  union all select * from storage_rls
)
select class, identity, replace(replace(coalesce(definition, ''), E'\n', ' '), E'\t', ' ')
from everything
order by class, identity, 3;
