import { describe, expect, it } from 'vitest'
import { withSql } from './clients'

// Reglas que tienen que valer para todo el esquema `public`, también para las tablas
// y funciones que se agreguen después (CLAUDE.md, «Reglas»; decisión 23).
describe('invariantes del esquema public', () => {
  it('todas las tablas tienen RLS activada', async () => {
    const { rows } = await withSql((sql) =>
      sql.query<{ tabla: string }>(
        `select c.relname as tabla
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity`,
      ),
    )
    expect(rows.map((r) => r.tabla)).toEqual([])
  })

  it('anon sólo tiene SELECT; authenticated, a lo sumo SELECT, INSERT, UPDATE y DELETE', async () => {
    const { rows } = await withSql((sql) =>
      sql.query<{ grantee: string; tabla: string; privilegio: string }>(
        `select grantee, table_name as tabla, privilege_type as privilegio
           from information_schema.role_table_grants
          where table_schema = 'public'
            and (
              (grantee = 'anon' and privilege_type <> 'SELECT')
              or (grantee = 'authenticated'
                  and privilege_type not in ('SELECT', 'INSERT', 'UPDATE', 'DELETE'))
              or grantee = 'PUBLIC'
            )`,
      ),
    )
    expect(rows).toEqual([])
  })

  it('ninguna policy de escritura se apoya sólo en el rol', async () => {
    // Toda policy que no sea de lectura tiene que exigir es_admin() o ser del dueño (auth.uid()).
    const { rows } = await withSql((sql) =>
      sql.query<{ tabla: string; policy: string }>(
        `select tablename as tabla, policyname as policy
           from pg_policies
          where schemaname = 'public'
            and cmd <> 'SELECT'
            and (
              roles::text[] && array['anon', 'public']
              or coalesce(qual, with_check) !~ $1
              or coalesce(with_check, qual) !~ $1
            )`,
        [String.raw`(es_admin\(\)|auth\.uid\(\))`],
      ),
    )
    expect(rows).toEqual([])
  })

  it('todas las funciones propias fijan el search_path', async () => {
    const { rows } = await withSql((sql) =>
      sql.query<{ funcion: string }>(
        `select p.proname as funcion
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
            and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')`,
      ),
    )
    expect(rows.map((r) => r.funcion)).toEqual([])
  })
})
