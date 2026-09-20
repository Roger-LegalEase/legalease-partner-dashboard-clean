/**
 * An in-memory stand-in for the PostgREST shape the Clinic services call
 * through the Supabase *admin* client.
 *
 * The admin client bypasses RLS in production, so on these paths the service
 * module is the only thing standing between a caller and another participant's
 * matter. This double therefore stores and filters rows faithfully and applies
 * no authorization of its own: every denial a scenario observes has to come
 * from the module under test, not from here.
 */
export function createPostgrestDouble({ tables = {}, rpc = {} } = {}) {
  const reads = [];

  function query(table) {
    const filters = [];
    let ordered = null;
    let limit = Number.POSITIVE_INFINITY;

    const rows = () => {
      let result = (tables[table] ?? []).filter((row) => filters.every((predicate) => predicate(row)));
      if (ordered) {
        result = [...result].sort((left, right) => String(left[ordered] ?? "").localeCompare(String(right[ordered] ?? "")));
      }
      return result.slice(0, limit);
    };

    const builder = {
      select() { return builder; },
      eq(column, value) { filters.push((row) => row[column] === value); return builder; },
      neq(column, value) { filters.push((row) => row[column] !== value); return builder; },
      in(column, values) { filters.push((row) => values.includes(row[column])); return builder; },
      gt(column, value) { filters.push((row) => String(row[column]) > String(value)); return builder; },
      gte(column, value) { filters.push((row) => String(row[column]) >= String(value)); return builder; },
      lt(column, value) { filters.push((row) => String(row[column]) < String(value)); return builder; },
      is(column, value) { filters.push((row) => (row[column] ?? null) === value); return builder; },
      contains(column, values) {
        filters.push((row) => values.every((value) => (row[column] ?? []).includes(value)));
        return builder;
      },
      order(column) { ordered = column; return builder; },
      limit(value) { limit = value; return builder; },
      async maybeSingle() {
        const matched = rows();
        reads.push({ table, matched: matched.length });
        if (matched.length > 1) return { data: null, error: { message: "multiple rows returned" } };
        return { data: matched[0] ?? null, error: null };
      },
      async single() {
        const matched = rows();
        reads.push({ table, matched: matched.length });
        if (matched.length !== 1) return { data: null, error: { message: "expected exactly one row" } };
        return { data: matched[0], error: null };
      },
      then(resolve, reject) {
        const matched = rows();
        reads.push({ table, matched: matched.length });
        return Promise.resolve({ data: matched, error: null }).then(resolve, reject);
      }
    };
    return builder;
  }

  return {
    reads,
    from(table) { return query(table); },
    async rpc(name, args) {
      const handler = rpc[name];
      if (!handler) return { data: null, error: { message: `unmapped rpc ${name}` } };
      return handler(args);
    }
  };
}
