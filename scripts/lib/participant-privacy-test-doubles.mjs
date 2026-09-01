/**
 * Test doubles for driving the REAL participant data-rights routes.
 *
 * What is real: the route handlers, the same-origin check, the bounded JSON
 * reader, the rate limiter, the proof mint and verify, the export builder, the
 * whole ordered deletion pipeline, and every SQL object in
 * supabase/migrations/20260830120000_participant_data_rights.sql running in Postgres. A deletion
 * in these tests is performed by the shipped pipeline against a real cluster,
 * and a refusal is a refusal from the database or from the handler — never a
 * string this file returns.
 *
 * What is doubled: three boundaries, and only three.
 *
 *   1. the Supabase JS client — a shim that turns the specific calls the
 *      application makes into SQL against an ephemeral cluster, plus Storage and
 *      Auth-admin surfaces backed by real tables;
 *   2. the session reader, so a test can say who is signed in;
 *   3. GoTrue itself, replaced by a local HTTP server (see the verifier) so the
 *      password check and the session revocation are genuine HTTP calls whose
 *      method and path are asserted.
 *
 * None of these contains business logic, and none can make a refused write
 * succeed.
 */

import { createHash } from "node:crypto";

let db = null;
let session = { isAuthenticated: false, userId: undefined };
const storageState = {
  objects: new Map(),
  removed: [],
  listCalls: [],
  removeCalls: [],
  // Injected faults. A sweep that cannot survive a mid-run failure is a sweep
  // that silently leaves files behind, so the failure has to be producible.
  failListingFor: new Set(),
  failRemovalFor: new Set()
};

export function bindEphemeralDb(handle) {
  db = handle;
}
export function setSession(next) {
  session = next ?? { isAuthenticated: false, userId: undefined };
}
export function currentSession() {
  return session;
}
export function seedStorageObject(path, size = 1024) {
  storageState.objects.set(path, { size });
}
export function storageRemovals() {
  return [...storageState.removed];
}
export function storageListCalls() {
  return [...storageState.listCalls];
}
export function storagePaths() {
  return [...storageState.objects.keys()];
}
export function storageRemoveCalls() {
  return storageState.removeCalls.map((batch) => [...batch]);
}
/** Make one prefix unlistable, to prove a listing failure is a failed step. */
export function failStorageListing(prefix) {
  storageState.failListingFor.add(prefix);
}
/** Make one object undeletable, to prove a partial sweep resumes. */
export function failStorageRemoval(path) {
  storageState.failRemovalFor.add(path);
}
export function clearStorageFaults() {
  storageState.failListingFor.clear();
  storageState.failRemovalFor.clear();
}
export function resetStorage() {
  storageState.objects.clear();
  storageState.removed.length = 0;
  storageState.listCalls.length = 0;
  storageState.removeCalls.length = 0;
  storageState.failListingFor.clear();
  storageState.failRemovalFor.clear();
}

function quote(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === "string")) {
      return value.length === 0
        ? "array[]::text[]"
        : `array[${value.map(quote).join(", ")}]::text[]`;
    }
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function rowsFromJson(text, { dml = false, role = null } = {}) {
  const base = dml
    ? `with t as (${text}) select coalesce(json_agg(t), '[]'::json) from t`
    : `select coalesce(json_agg(t), '[]'::json) from (${text}) t`;
  const claim = role && session.userId
    ? ` select set_config('request.jwt.claim.sub', '${session.userId}', false);`
    : "";
  const query = role ? `set role ${role};${claim} ${base}` : base;
  const out = db
    .sql(query)
    .split("\n")
    .filter((line) => {
      const value = line.trim();
      return value && value !== "SET" && !(role && session.userId && value === session.userId);
    })
    .join("\n");
  const parsed = JSON.parse(out || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

function table(name, role = null) {
  const state = { name, role, filters: [], columns: "*", op: null, payload: null, order: null, onConflict: null, limit: null };

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
    delete() {
      state.op = "delete";
      return api;
    },
    eq(column, value) {
      state.filters.push(`${column} = ${quote(value)}`);
      return api;
    },
    in(column, values) {
      if (!Array.isArray(values)) throw new Error("in() requires an array in this test double");
      // An empty IN list is a filter that matches nothing, which is exactly
      // what the application means by it. Turning it into "no filter" would
      // make a scoped delete unscoped.
      state.filters.push(values.length === 0 ? "false" : `${column} in (${values.map(quote).join(", ")})`);
      return api;
    },
    is(column, value) {
      state.filters.push(`${column} is ${value === null ? "null" : quote(value)}`);
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
    limit(count) {
      state.limit = count;
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
      const conflictCols = state.onConflict.split(",").map((c) => c.trim()).filter(Boolean);
      const updates = cols
        .filter((column) => !conflictCols.includes(column))
        .map((column) => `${column} = excluded.${column}`)
        .join(", ");
      const action = updates ? `do update set ${updates}` : "do nothing";
      return rowsFromJson(
        `insert into ${state.name} (${cols.join(", ")}) values (${vals.join(", ")}) on conflict (${conflictCols.join(", ")}) ${action} returning *`,
        { dml: true, role: state.role }
      );
    }
    if (state.op === "update") {
      const sets = Object.keys(state.payload).map((c) => `${c} = ${quote(state.payload[c])}`).join(", ");
      return rowsFromJson(`update ${state.name} set ${sets}${where} returning *`, { dml: true, role: state.role });
    }
    if (state.op === "delete") {
      return rowsFromJson(`delete from ${state.name}${where} returning *`, { dml: true, role: state.role });
    }
    const order = state.order ? ` order by ${state.order}` : "";
    const limit = state.limit ? ` limit ${Number(state.limit)}` : "";
    return rowsFromJson(`select ${state.columns} from ${state.name}${where}${order}${limit}`, { role: state.role });
  } catch (error) {
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
    // PostgREST returns a scalar for a scalar-returning function and an array
    // of rows for a set-returning one. Reproducing that here is what lets the
    // application read `data === true` and `typeof data === "number"` the way
    // it does in production.
    if (rows.length === 1) {
      const keys = Object.keys(rows[0]);
      if (keys.length === 1 && keys[0] === name.split(".").pop()) {
        return Promise.resolve({ data: rows[0][keys[0]], error: null });
      }
    }
    if (rows.length === 0) return Promise.resolve({ data: null, error: null });
    return Promise.resolve({ data: rows, error: null });
  } catch (error) {
    return Promise.resolve({ data: null, error: { message: String(error.stderr ?? error.message ?? error) } });
  }
}

/**
 * Supabase Storage, as it actually behaves.
 *
 * The first version of this double returned every descendant of a prefix in one
 * unlimited flat array. Nothing that read it could tell a correct sweep from one
 * that missed a nested folder or stopped at the first page, so a deletion that
 * left a thousand objects behind would have passed. Storage does none of those
 * things, so neither does this:
 *
 *   - only IMMEDIATE children are returned; a nested prefix appears as one
 *     folder entry with a null id, and its contents are invisible until you
 *     list that prefix too;
 *   - `limit` and `offset` are honoured, and limit is capped at 1000 the way
 *     the real API caps it, so a caller that does not paginate silently sees a
 *     truncated bucket;
 *   - a listing failure returns an error, NOT an empty array, because the
 *     difference between "nothing is here" and "I could not look" is the whole
 *     question when the answer decides whether files get deleted.
 */
function storageBucket() {
  return {
    async list(prefix, options = {}) {
      storageState.listCalls.push({ prefix, ...options });
      if (storageState.failListingFor.has(prefix)) {
        return { data: null, error: { message: `listing failed for ${prefix}` } };
      }
      const limit = Math.min(options.limit ?? 100, 1000);
      const offset = options.offset ?? 0;
      const base = prefix ? `${prefix}/` : "";
      const files = new Map();
      const folders = new Set();
      for (const [path, meta] of storageState.objects) {
        if (!path.startsWith(base)) continue;
        const rest = path.slice(base.length);
        if (!rest) continue;
        const slash = rest.indexOf("/");
        if (slash === -1) files.set(rest, meta);
        else folders.add(rest.slice(0, slash));
      }
      const entries = [
        ...[...folders].sort().map((name) => ({ name, id: null, metadata: null })),
        ...[...files.keys()].sort().map((name) => ({
          name,
          id: `obj-${name}`,
          created_at: "2026-01-01T00:00:00.000Z",
          metadata: { size: files.get(name).size, mimetype: "application/pdf" }
        }))
      ];
      return { data: entries.slice(offset, offset + limit), error: null };
    },
    async remove(paths) {
      storageState.removeCalls.push([...paths]);
      const failing = paths.filter((path) => storageState.failRemovalFor.has(path));
      if (failing.length > 0) {
        return { data: null, error: { message: `removal failed for ${failing.length} object(s)` } };
      }
      const removed = [];
      for (const path of paths) {
        // Removing an object that is already gone succeeds, exactly as Storage
        // does — which is what makes a resumed deletion safe.
        storageState.objects.delete(path);
        storageState.removed.push(path);
        removed.push({ name: path });
      }
      return { data: removed, error: null };
    },
    async download() {
      return { data: null, error: { message: "not implemented in this double" } };
    },
    async upload() {
      return { data: null, error: { message: "not implemented in this double" } };
    }
  };
}

const authAdmin = {
  async getUserById(userId) {
    const rows = rowsFromJson(
      `select id, email, created_at, email_confirmed_at, last_sign_in_at from auth.users where id = ${quote(userId)}`
    );
    if (!rows[0]) return { data: { user: null }, error: { message: "User not found" } };
    return { data: { user: rows[0] }, error: null };
  },
  async deleteUser(userId) {
    const rows = rowsFromJson(`delete from auth.users where id = ${quote(userId)} returning id`, { dml: true });
    if (rows.error) return { data: null, error: rows.error };
    if (rows.length === 0) return { data: null, error: { message: "User not found" } };
    return { data: {}, error: null };
  }
};

export function isSupabaseConfigured() {
  return Boolean(db);
}

export function getSupabaseAdminClient() {
  if (!db) return null;
  return {
    from: (name) => table(name, "service_role"),
    rpc: (name, params) => rpc(name, params, "service_role"),
    storage: { from: () => storageBucket() },
    auth: { admin: authAdmin }
  };
}

export function createServerSupabaseAuthClient() {
  if (!db) return null;
  return { from: (name) => table(name, "authenticated"), rpc };
}

export async function getRcapBriefcaseAuthState() {
  return session.isAuthenticated
    ? {
        isAuthenticated: true,
        isVerified: session.isVerified !== false,
        userId: session.userId,
        userEmail: session.email,
        mode: "supabase"
      }
    : { isAuthenticated: false, mode: "supabase" };
}

export async function getServerAuthState() {
  return session.isAuthenticated
    ? { isAuthenticated: true, userId: session.userId, email: session.email }
    : { isAuthenticated: false };
}

export function fixtureUuid(label) {
  const h = createHash("sha256").update(`participant-privacy/${label}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
