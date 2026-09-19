// A counting stand-in for `@/lib/supabase/server`, used only by the
// sponsored-cap controls.
//
// The real module returns `null` whenever Supabase is not configured, which is
// this environment and CI. That makes "the denied controls performed zero
// Supabase calls" trivially true rather than proven: nothing was callable. With
// this stub installed a client DOES exist, every table read is counted, and
// every write or RPC throws — so "refused before Supabase" becomes a measured
// ordering claim, and an accidental write becomes a loud failure instead of a
// silent one.
//
// It touches no production source. The loader beside it redirects the specifier.

export const calls = { reads: 0, writes: 0, rpc: 0, tables: [] };
export function resetCalls() {
  calls.reads = 0; calls.writes = 0; calls.rpc = 0; calls.tables = [];
}

/** What the next `.from(table)` chain resolves to, per table. */
export const rows = new Map();
export function setRows(table, data) { rows.set(table, data); }

const forbidden = (kind) => () => {
  calls[kind] += 1;
  throw new Error(`census control: a ${kind} reached Supabase; this path must perform none`);
};

function queryFor(table) {
  const result = { data: rows.has(table) ? rows.get(table) : null, error: null };
  const chain = {
    select() { calls.reads += 1; calls.tables.push(table); return chain; },
    eq() { return chain; },
    in() { return chain; },
    order() { return chain; },
    limit() { return chain; },
    maybeSingle() { return Promise.resolve(result); },
    single() { return Promise.resolve(result); },
    insert: forbidden("writes"),
    update: forbidden("writes"),
    upsert: forbidden("writes"),
    delete: forbidden("writes"),
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }
  };
  return chain;
}

export function getSupabaseAdminClient() {
  return {
    from(table) { return queryFor(table); },
    rpc: forbidden("rpc")
  };
}

export function isSupabaseConfigured() { return true; }
export function getSupabaseServerClient() { return getSupabaseAdminClient(); }
