// A small, local, in-process stand-in for the three Supabase services the
// application talks to (PostgREST, GoTrue's /user, Storage), backed by an
// isolated PGlite database. It exists so the real Next.js build can be
// exercised end to end in this container, which has no Docker daemon and no
// network route to a hosted Supabase project.
//
// It is a verification tool, not a product component: it emulates only the
// wire features the application uses, runs every REST query under the role
// implied by the caller's key (service_role for the service key, authenticated
// for a user token), and records every request so a test can prove that a
// protected value never crossed the wire in clear.

import http from "node:http";
import { randomUUID } from "node:crypto";

export function makeJwt(payload) {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ aud: "authenticated", role: "authenticated", iat: 1700000000, exp: 4102444800, ...payload })}.local-shim-signature`;
}

function decodeJwt(token) {
  try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")); } catch { return null; }
}

export async function startSupabaseShim({ db, serviceKey, anonKey, users, port = 0 }) {
  const requests = [];
  const objects = new Map();
  const server = http.createServer((request, response) => {
    handle(request, response).catch((error) => {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: String(error?.message ?? error), code: "SHIM500" }));
    });
  });

  async function readBody(request) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  function actor(request) {
    const header = request.headers.authorization ?? "";
    const token = header.replace(/^Bearer\s+/i, "");
    const apikey = request.headers.apikey;
    if (token === serviceKey || (!token && apikey === serviceKey)) return { role: "service_role", sub: null, claims: { role: "service_role" } };
    const claims = token && token !== anonKey ? decodeJwt(token) : null;
    if (claims?.sub) return { role: "authenticated", sub: claims.sub, claims };
    return { role: "anon", sub: null, claims: { role: "anon" } };
  }

  async function withRole(who, fn) {
    await db.exec("begin");
    try {
      await db.exec(`set local role ${who.role}`);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [who.sub ?? ""]);
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(who.claims)]);
      const result = await fn();
      await db.exec("commit");
      return result;
    } catch (error) {
      await db.exec("rollback").catch(() => null);
      throw error;
    }
  }

  function json(response, status, body, headers = {}) {
    response.writeHead(status, { "content-type": "application/json", ...headers });
    const text = body === undefined ? "" : JSON.stringify(body);
    if (status >= 400) { const last = requests[requests.length - 1]; if (last) { last.status = status; last.response = text.slice(0, 600); } }
    response.end(text);
  }

  function pgError(response, error) {
    json(response, 400, { message: error.message, code: error.code ?? "PGRST", details: error.detail ?? null, hint: error.hint ?? null });
  }

  const ident = (name) => { if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`bad identifier ${name}`); return `"${name}"`; };

  function parseFilters(params) {
    const clauses = [];
    const values = [];
    const push = (value) => { values.push(value); return `$${values.length}`; };
    for (const [key, raw] of params.entries()) {
      if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) continue;
      if (key === "or") {
        // PostgREST disjunction of simple column filters: or=(a.eq.x,b.eq.y).
        const parts = raw.replace(/^\(|\)$/g, "").split(",").map((part) => {
          const [orColumn, orOp, ...rest] = part.split(".");
          const orValue = rest.join(".");
          if (orOp === "eq") return `${ident(orColumn)} = ${push(orValue)}`;
          if (orOp === "is" && orValue === "null") return `${ident(orColumn)} is null`;
          throw new Error(`unsupported or-filter ${part}`);
        });
        clauses.push(`(${parts.join(" or ")})`);
        continue;
      }
      const dot = raw.indexOf(".");
      const op = raw.slice(0, dot);
      const value = raw.slice(dot + 1);
      const column = ident(key);
      switch (op) {
        case "eq": clauses.push(`${column} = ${push(value)}`); break;
        case "neq": clauses.push(`${column} <> ${push(value)}`); break;
        case "gt": clauses.push(`${column} > ${push(value)}`); break;
        case "gte": clauses.push(`${column} >= ${push(value)}`); break;
        case "lt": clauses.push(`${column} < ${push(value)}`); break;
        case "lte": clauses.push(`${column} <= ${push(value)}`); break;
        case "like": clauses.push(`${column} like ${push(value)}`); break;
        case "ilike": clauses.push(`${column} ilike ${push(value)}`); break;
        case "is": clauses.push(value === "null" ? `${column} is null` : value === "not.null" ? `${column} is not null` : `${column} is ${value === "true" ? "true" : "false"}`); break;
        case "in": {
          const inner = value.replace(/^\(|\)$/g, "");
          const items = inner === "" ? [] : inner.split(",").map((item) => item.replace(/^"|"$/g, ""));
          clauses.push(items.length ? `${column} in (${items.map(push).join(",")})` : "false");
          break;
        }
        default: throw new Error(`unsupported filter ${op}`);
      }
    }
    return { where: clauses.length ? ` where ${clauses.join(" and ")}` : "", values };
  }

  function parseOrder(params) {
    const order = params.get("order");
    if (!order) return "";
    return " order by " + order.split(",").map((part) => {
      const [column, direction, nulls] = part.split(".");
      return `${ident(column)} ${direction === "desc" ? "desc" : "asc"}${nulls === "nullsfirst" ? " nulls first" : nulls === "nullslast" ? " nulls last" : ""}`;
    }).join(", ");
  }

  function selectList(params) {
    const select = params.get("select") ?? "*";
    if (select.trim() === "*" || select === "") return "*";
    return select.split(",").map((column) => column.trim()).filter(Boolean).map(ident).join(", ");
  }

  async function handle(request, response) {
    const url = new URL(request.url, "http://shim");
    const body = await readBody(request);
    requests.push({ method: request.method, path: url.pathname + url.search, body: body.toString("latin1") });
    const who = actor(request);

    if (url.pathname === "/auth/v1/user" && request.method === "GET") {
      const user = who.sub ? users.get(who.sub) : null;
      if (!user) return json(response, 401, { message: "invalid JWT", code: 401 });
      return json(response, 200, { id: user.id, aud: "authenticated", role: "authenticated", email: user.email, email_confirmed_at: user.confirmed ? "2026-09-01T00:00:00Z" : null, confirmed_at: user.confirmed ? "2026-09-01T00:00:00Z" : null, app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [], created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z", is_anonymous: false });
    }
    if (url.pathname.startsWith("/auth/v1/logout")) return json(response, 204, undefined);
    if (url.pathname === "/auth/v1/token") return json(response, 400, { error: "unsupported_grant_type", error_description: "The local shim does not issue tokens." });

    if (url.pathname.startsWith("/storage/v1/object/")) {
      const rest = url.pathname.slice("/storage/v1/object/".length).replace(/^authenticated\//, "");
      if (request.method === "DELETE") {
        const bucket = rest;
        const prefixes = JSON.parse(body.toString("utf8") || "{}").prefixes ?? [];
        const removed = [];
        for (const prefix of prefixes) if (objects.delete(`${bucket}/${prefix}`)) removed.push({ name: prefix, bucket_id: bucket });
        return json(response, 200, removed);
      }
      if (request.method === "POST" || request.method === "PUT") {
        if (objects.has(rest) && request.headers["x-upsert"] !== "true") return json(response, 400, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
        let bytes = body;
        let contentType = request.headers["content-type"] ?? "application/octet-stream";
        if (contentType.startsWith("multipart/form-data")) {
          const form = await new Response(body, { headers: { "content-type": contentType } }).formData();
          const file = [...form.values()].find((value) => typeof value !== "string");
          bytes = Buffer.from(await file.arrayBuffer());
          contentType = file.type || "application/octet-stream";
        }
        objects.set(rest, { bytes, contentType });
        return json(response, 200, { Key: rest, Id: randomUUID() });
      }
      if (request.method === "GET") {
        const object = objects.get(rest);
        if (!object) return json(response, 404, { statusCode: "404", error: "not_found", message: "Object not found" });
        response.writeHead(200, { "content-type": object.contentType, "content-length": String(object.bytes.length) });
        return response.end(object.bytes);
      }
    }

    if (url.pathname.startsWith("/rest/v1/rpc/") && request.method === "POST") {
      const fn = url.pathname.slice("/rest/v1/rpc/".length);
      const args = body.length ? JSON.parse(body.toString("utf8")) : {};
      const keys = Object.keys(args);
      const meta = await db.query("select p.proretset, t.typtype, t.typname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type t on t.oid=p.prorettype where n.nspname='public' and p.proname=$1 limit 1", [fn]);
      if (!meta.rows[0]) return json(response, 404, { message: `Could not find the function public.${fn}`, code: "PGRST202" });
      const { proretset, typtype, typname } = meta.rows[0];
      const argTypes = await db.query("select unnest(p.proargnames) as name, unnest(p.proargtypes::oid[]) as oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1 limit 100", [fn]);
      const typeOf = new Map();
      for (const row of argTypes.rows) {
        const type = await db.query("select format_type($1::oid, null) as name", [row.oid]);
        typeOf.set(row.name, type.rows[0].name);
      }
      const values = [];
      const call = keys.map((key) => {
        const value = args[key];
        const type = typeOf.get(key) ?? "text";
        // PGlite serialises each parameter by the type the server infers from the cast, so booleans and numbers must stay JS booleans and numbers.
        values.push(value === null || value === undefined ? null
          : type === "jsonb" || type === "json" ? JSON.stringify(value)
          : type === "boolean" ? value === true || value === "true"
          : type === "integer" || type === "bigint" || type === "smallint" ? Number(value)
          : Array.isArray(value) ? `{${value.map((item) => `"${String(item).replace(/"/g, '\\"')}"`).join(",")}}` : String(value));
        return `${ident(key)} := $${values.length}::${type}`;
      }).join(", ");
      const setReturning = proretset || typtype === "c" || typname === "record";
      const sql = setReturning ? `select * from public.${ident(fn)}(${call})` : `select public.${ident(fn)}(${call}) as value`;
      try {
        const result = await withRole(who, () => db.query(sql, values));
        if (setReturning) return json(response, 200, result.rows);
        return json(response, 200, result.rows[0]?.value ?? null);
      } catch (error) { return pgError(response, error); }
    }

    if (url.pathname.startsWith("/rest/v1/")) {
      const table = url.pathname.slice("/rest/v1/".length);
      const params = url.searchParams;
      const prefer = String(request.headers.prefer ?? "");
      const wantsObject = String(request.headers.accept ?? "").includes("vnd.pgrst.object");
      const { where, values } = parseFilters(params);
      const limit = params.get("limit") ? ` limit ${Number(params.get("limit"))}` : "";
      const offset = params.get("offset") ? ` offset ${Number(params.get("offset"))}` : "";
      const finish = (rows, status = 200, extra = {}) => {
        if (wantsObject) {
          if (rows.length !== 1) return json(response, 406, { code: "PGRST116", message: `JSON object requested, multiple (or no) rows returned`, details: `The result contains ${rows.length} rows`, hint: null }, extra);
          return json(response, status, rows[0], extra);
        }
        return json(response, status, rows, extra);
      };
      try {
        if (request.method === "GET" || request.method === "HEAD") {
          const headers = {};
          if (/count=exact/.test(prefer)) {
            const count = await withRole(who, () => db.query(`select count(*)::int as n from public.${ident(table)}${where}`, values));
            headers["content-range"] = `0-${Math.max(0, count.rows[0].n - 1)}/${count.rows[0].n}`;
          }
          if (request.method === "HEAD") { response.writeHead(200, headers); return response.end(); }
          const rows = await withRole(who, () => db.query(`select ${selectList(params)} from public.${ident(table)}${where}${parseOrder(params)}${limit}${offset}`, values));
          return finish(rows.rows, 200, headers);
        }
        if (request.method === "POST") {
          const payload = JSON.parse(body.toString("utf8"));
          const rows = Array.isArray(payload) ? payload : [payload];
          const inserted = await withRole(who, () => db.query(`insert into public.${ident(table)} select * from json_populate_recordset(null::public.${ident(table)}, $1::json) returning *`, [JSON.stringify(rows)]));
          return /return=representation/.test(prefer) ? finish(inserted.rows, 201) : json(response, 201, undefined);
        }
        if (request.method === "PATCH") {
          const payload = JSON.parse(body.toString("utf8"));
          const columns = Object.keys(payload);
          const sets = columns.map((column) => `${ident(column)} = (select ${ident(column)} from json_populate_record(null::public.${ident(table)}, $${values.length + 1}::json))`).join(", ");
          const updated = await withRole(who, () => db.query(`update public.${ident(table)} set ${sets}${where} returning *`, [...values, JSON.stringify(payload)]));
          return /return=representation/.test(prefer) ? finish(updated.rows) : json(response, 204, undefined);
        }
        if (request.method === "DELETE") {
          const deleted = await withRole(who, () => db.query(`delete from public.${ident(table)}${where} returning *`, values));
          return /return=representation/.test(prefer) ? finish(deleted.rows) : json(response, 204, undefined);
        }
      } catch (error) { return pgError(response, error); }
    }
    json(response, 404, { message: `shim: no route for ${request.method} ${url.pathname}` });
  }

  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    objects,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}
