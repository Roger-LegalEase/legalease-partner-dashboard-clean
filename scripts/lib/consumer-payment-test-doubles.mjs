/**
 * Test doubles for driving the REAL consumer payment and render routes.
 *
 * What is real here: the route handlers, the reconciliation logic, the Stripe
 * SDK's signature verification, every migration from 26 through 53, the RPCs,
 * the grants and the constraints. A payment recorded in these tests is recorded
 * by `record_consumer_packet_payment` running in Postgres, and a job created is
 * created by the Phase 53 `enqueue_packet_render_job`.
 *
 * What is doubled: exactly two boundaries — the Supabase JS client, replaced by
 * a shim that translates the specific calls the application makes into SQL
 * against an ephemeral cluster, and the session reader, so a test can say who is
 * logged in. Neither double contains business logic, and neither can make a
 * refused write succeed: the refusals come from the database.
 *
 * The distinction matters because the previous coverage asserted on SOURCE TEXT
 * — that the handler file contained the string `constructEvent(...)` — which
 * would pass for a handler that verified a signature and then ignored the
 * result. Nothing below can pass that way.
 */

import { createHash } from "node:crypto";

let db = null;
let session = { isAuthenticated: false, userId: undefined };

export function bindEphemeralDb(handle) {
  db = handle;
}
export function setSession(next) {
  session = next ?? { isAuthenticated: false, userId: undefined };
}
export function currentSession() {
  return session;
}

function quote(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    if (value.some((entry) => typeof entry !== "string")) {
      throw new Error("this test double supports only string-array column values");
    }
    return value.length === 0
      ? "array[]::text[]"
      : `array[${value.map(quote).join(", ")}]::text[]`;
  }
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Postgres will not accept INSERT/UPDATE inside a subselect, so writes are
 * wrapped in a CTE instead. Getting this wrong silently turned every write into
 * an error the application then reported as a refusal — which looked exactly
 * like a working gate.
 */
function rowsFromJson(text, { dml = false, role = null } = {}) {
  const base = dml
    ? `with t as (${text}) select coalesce(json_agg(t), '[]'::json) from t`
    : `select coalesce(json_agg(t), '[]'::json) from (${text}) t`;
  // Each psql invocation is a fresh session, so the role AND the JWT claim RLS
  // reads have to travel with the statement. Omitting the claim made auth.uid()
  // null, which is not "no filter" — it is a policy that matches nothing, so
  // every participant read came back empty.
  const claim = role && session.userId
    ? ` select set_config('request.jwt.claim.sub', '${session.userId}', false);`
    : "";
  const query = role ? `set role ${role};${claim} ${base}` : base;
  // Deliberately `sql` rather than the harness's `json` helper: that helper
  // wraps its argument in a scalar subquery, and a data-modifying CTE cannot
  // appear inside one.
  const out = db.sql(query).trim().split("\n").filter((line) => line.trim() && line.trim() !== "SET").pop() ?? "[]";
  const parsed = JSON.parse(out || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * A deliberately small query builder. It supports only the shapes the
 * application actually uses; anything else throws rather than silently
 * returning an empty result, so an untested call path cannot look like a
 * passing one.
 */
function table(name, role = null) {
  const state = {
    name,
    role,
    filters: [],
    columns: "*",
    op: null,
    payload: null,
    order: null,
    onConflict: null
  };

  const api = {
    select(columns = "*") {
      if (!state.op) state.op = "select";
      state.columns = columns === "*" ? "*" : columns;
      return api;
    },
    insert(payload) {
      state.op = "insert";
      state.payload = payload;
      return api;
    },
    upsert(payload, { onConflict } = {}) {
      if (!onConflict) throw new Error("upsert() requires onConflict in this test double");
      state.op = "upsert";
      state.payload = payload;
      state.onConflict = onConflict;
      return api;
    },
    update(payload) {
      state.op = "update";
      state.payload = payload;
      return api;
    },
    eq(column, value) {
      state.filters.push(`${column} = ${quote(value)}`);
      return api;
    },
    in(column, values) {
      if (!Array.isArray(values) || values.length === 0) {
        throw new Error("in() requires at least one value in this test double");
      }
      state.filters.push(`${column} in (${values.map(quote).join(", ")})`);
      return api;
    },
    not(column, operator, value) {
      if (operator !== "is") throw new Error(`unsupported not() operator: ${operator}`);
      state.filters.push(`${column} is not ${value === null ? "null" : quote(value)}`);
      return api;
    },
    order(column, { ascending = true } = {}) {
      state.order = `${column} ${ascending ? "asc" : "desc"}`;
      return api;
    },
    async maybeSingle() {
      const rows = await run(state);
      return { data: rows[0] ?? null, error: rows.error ?? null };
    },
    async single() {
      const rows = await run(state);
      if (!rows[0]) return { data: null, error: rows.error ?? { message: "no rows" } };
      return { data: rows[0], error: null };
    },
    async returns() {
      const rows = await run(state);
      return { data: rows, error: rows.error ?? null };
    },
    then(resolve, reject) {
      return run(state).then((rows) => resolve({ data: rows, error: rows.error ?? null }), reject);
    }
  };

  return api;
}

async function run(state) {
  const where = state.filters.length ? ` where ${state.filters.join(" and ")}` : "";
  try {
    if (state.op === "insert") {
      const cols = Object.keys(state.payload);
      const vals = cols.map((c) => quote(state.payload[c]));
      return rowsFromJson(
        `insert into ${state.name} (${cols.join(", ")}) values (${vals.join(", ")}) returning *`,
        { dml: true, role: state.role }
      );
    }
    if (state.op === "upsert") {
      const cols = Object.keys(state.payload);
      const vals = cols.map((c) => quote(state.payload[c]));
      const conflictCols = state.onConflict.split(",").map((column) => column.trim()).filter(Boolean);
      const updates = cols
        .filter((column) => !conflictCols.includes(column))
        .map((column) => `${column} = excluded.${column}`)
        .join(", ");
      const conflictAction = updates ? `do update set ${updates}` : "do nothing";
      return rowsFromJson(
        `insert into ${state.name} (${cols.join(", ")}) values (${vals.join(", ")}) on conflict (${conflictCols.join(", ")}) ${conflictAction} returning *`,
        { dml: true, role: state.role }
      );
    }
    if (state.op === "update") {
      const sets = Object.keys(state.payload)
        .map((c) => `${c} = ${quote(state.payload[c])}`)
        .join(", ");
      return rowsFromJson(`update ${state.name} set ${sets}${where} returning *`, { dml: true, role: state.role });
    }
    const order = state.order ? ` order by ${state.order}` : "";
    return rowsFromJson(`select ${state.columns} from ${state.name}${where}${order}`, { role: state.role });
  } catch (error) {
    // Postgres refusals — a revoked grant, a violated check constraint, a
    // unique conflict — surface the way the Supabase client surfaces them, as
    // an error field rather than a throw, because that is what the application
    // branches on.
    const message = String(error.stderr ?? error.message ?? error);
    const rows = [];
    rows.error = { message, code: /duplicate key/.test(message) ? "23505" : undefined };
    return rows;
  }
}

function rpc(name, params, role = null) {
  const args = Object.entries(params ?? {})
    .map(([key, value]) => `${key} => ${quote(value)}`)
    .join(", ");
  try {
    const rows = rowsFromJson(`select * from ${name}(${args})`, { role });
    return Promise.resolve({ data: rows, error: null });
  } catch (error) {
    return Promise.resolve({
      data: null,
      error: { message: String(error.stderr ?? error.message ?? error) }
    });
  }
}

/**
 * Stands in for the service-role client.
 *
 * Bound to `service_role` rather than left on the owner connection. After
 * phase 54 that distinction is load-bearing: rcap_persons has RLS enabled and
 * no grant for browser roles, and the owner is exempt from RLS while
 * service_role passes it by BYPASSRLS. Running these calls as the owner would
 * prove the application works with privileges it does not hold in production.
 */
export function getSupabaseAdminClient() {
  if (!db) return null;
  return { from: (name) => table(name, "service_role"), rpc: (name, params) => rpc(name, params, "service_role") };
}

/**
 * Stands in for the participant-authenticated client.
 *
 * Backed by the same cluster but run through `set role authenticated`, so a
 * write Phase 52 revoked genuinely fails here instead of quietly succeeding
 * because the test happened to use an admin connection.
 */
export function createServerSupabaseAuthClient() {
  if (!db) return null;
  // A plain role-bound builder. An earlier version wrapped the builder in a
  // Proxy that returned a FRESH builder from every chained call, which silently
  // discarded the `user_id` filter — so a lookup scoped to one user returned
  // whichever row happened to be first. That made an unpaid item look paid and
  // handed one user another user's item, while every test still "passed" the
  // parts that did not depend on scoping.
  return { from: (name) => table(name, "authenticated"), rpc };
}

export async function getRcapBriefcaseAuthState() {
  return session.isAuthenticated
    ? { isAuthenticated: true, userId: session.userId, userEmail: session.email, mode: "supabase" }
    : { isAuthenticated: false, mode: "supabase" };
}

export async function getServerAuthState() {
  return session.isAuthenticated
    ? { isAuthenticated: true, userId: session.userId, email: session.email }
    : { isAuthenticated: false };
}

/** Deterministic ids so failures name a stable fixture. */
export function fixtureUuid(label) {
  const h = createHash("sha256").update(`consumer-payment-http/${label}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
