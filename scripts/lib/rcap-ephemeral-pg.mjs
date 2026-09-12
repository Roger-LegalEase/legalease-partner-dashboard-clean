// Ephemeral PostgreSQL 16 harness for RCAP verifiers.
//
// Boots a throwaway cluster as the postgres OS user on a private socket under
// /tmp, applies whatever SQL the caller feeds it, and tears the cluster down.
// Nothing here can reach a shared or remote database: the server listens on no
// TCP address, only its own unix socket.

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

const PG_BIN = "/usr/lib/postgresql/16/bin";

const isRoot = typeof process.getuid === "function" && process.getuid() === 0;

function findPgBin(name) {
  const candidates = [path.join(PG_BIN, name)];
  try {
    const found = execFileSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" }).trim();
    if (found) candidates.unshift(found);
  } catch {
    // not on PATH
  }
  for (const root of ["/usr/lib/postgresql", "/usr/local/pgsql"]) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      candidates.push(path.join(root, entry, "bin", name));
    }
  }
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export function ephemeralPgAvailable() {
  if (process.env.RCAP_EXTERNAL_TEST_DATABASE_URL) {
    validateExternalTestDatabase(process.env);
    return Boolean(findPgBin("psql"));
  }
  if (!findPgBin("initdb") || !findPgBin("pg_ctl")) return false;
  if (!isRoot) return true; // run the server as the current user
  try {
    execFileSync("id", ["postgres"], { stdio: "ignore" });
    return true; // root drops privileges to the postgres user
  } catch {
    return false;
  }
}

const PRODUCTION_ENVIRONMENT_KEYS = [
  "VERCEL_ENV", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL",
  "POSTGRES_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"
];

/** Fail-closed validation for the workflow-owned, localhost-only PostgreSQL service. */
export function validateExternalTestDatabase(env = process.env) {
  if (env.RCAP_ALLOW_LOCAL_TEST_DATABASE !== "true") {
    throw new Error("UNAVAILABLE: external PostgreSQL requires RCAP_ALLOW_LOCAL_TEST_DATABASE=true");
  }
  let url;
  try {
    url = new URL(env.RCAP_EXTERNAL_TEST_DATABASE_URL);
  } catch {
    throw new Error("UNAVAILABLE: RCAP_EXTERNAL_TEST_DATABASE_URL is not a valid URL");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("UNAVAILABLE: external test database must use PostgreSQL");
  }
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("UNAVAILABLE: external test database host must be localhost or 127.0.0.1");
  }
  const identity = `${decodeURIComponent(url.username)} ${decodeURIComponent(url.pathname.slice(1))}`;
  if (!/(^|[_-])test([_-]|$)/i.test(identity)) {
    throw new Error("UNAVAILABLE: external database user or database must have a test-only identity");
  }
  const present = PRODUCTION_ENVIRONMENT_KEYS.filter((key) => {
    const value = env[key];
    return value && !(key === "VERCEL_ENV" && value === "development");
  });
  if (present.length) {
    throw new Error(`UNAVAILABLE: production-capable environment variables are present: ${present.join(", ")}`);
  }
  return url;
}

export function startEphemeralPg() {
  if (process.env.RCAP_EXTERNAL_TEST_DATABASE_URL) return startExternalTestPg();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-epg-"));
  const port = 54000 + Math.floor(Math.random() * 2000);
  const initdb = findPgBin("initdb");
  const pgCtl = findPgBin("pg_ctl");
  if (isRoot) {
    // The server refuses to run as root; drop privileges to the postgres user.
    fs.chmodSync(root, 0o777);
    execFileSync("chown", ["postgres:postgres", root]);
  }
  run(`${initdb} -D ${root}/data -U postgres -A trust`);
  run(`${pgCtl} -D ${root}/data -o '-p ${port} -k ${root} -c listen_addresses=' -l ${root}/pg.log start -w -t 30`);

  const psqlBase = ["-h", root, "-p", String(port), "-U", "postgres", "-d", "postgres", "-X", "--no-psqlrc"];

  function run(cmd) {
    if (isRoot) {
      execFileSync("su", ["postgres", "-s", "/bin/bash", "-c", cmd], { stdio: ["ignore", "pipe", "pipe"] });
    } else {
      execFileSync("sh", ["-c", cmd], { stdio: ["ignore", "pipe", "pipe"] });
    }
  }

  return {
    root,
    port,
    /** Runs SQL, throws on error, returns raw stdout. */
    sql(text) {
      return execFileSync("psql", [...psqlBase, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", text], {
        encoding: "utf8"
      });
    },
    /** Runs SQL expecting failure; returns the error text, throws if it succeeded. */
    sqlExpectError(text) {
      try {
        execFileSync("psql", [...psqlBase, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", text], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"]
        });
      } catch (error) {
        return String(error.stderr ?? error.message);
      }
      throw new Error(`SQL unexpectedly succeeded: ${text}`);
    },
    /** Runs a query and parses a JSON aggregate: select ... must yield one json value. */
    json(text) {
      const out = this.sql(`select coalesce((${text})::text, 'null')`).trim();
      return JSON.parse(out || "null");
    },
    /** One scalar value as string (trimmed). */
    scalar(text) {
      return this.sql(text).trim();
    },
    applyFile(file) {
      execFileSync("psql", [...psqlBase, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
    },
    /** Launches a concurrent statement; resolves with {ok, out}. */
    sqlAsync(text) {
      return new Promise((resolve) => {
        const child = spawn("psql", [...psqlBase, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", text]);
        let out = "";
        let err = "";
        child.stdout.on("data", (chunk) => (out += chunk));
        child.stderr.on("data", (chunk) => (err += chunk));
        child.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim() }));
      });
    },
    stop() {
      try {
        run(`${pgCtl} -D ${root}/data stop -m immediate`);
      } catch {
        // Already gone.
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

function startExternalTestPg() {
  const adminUrl = validateExternalTestDatabase(process.env);
  const database = `rcap_test_${process.pid}_${randomBytes(6).toString("hex")}`;
  const quotedDatabase = `"${database.replaceAll('"', '""')}"`;
  const childUrl = new URL(adminUrl);
  childUrl.pathname = `/${database}`;
  const base = [adminUrl.toString(), "-X", "--no-psqlrc"];
  execFileSync("psql", [...base, "-v", "ON_ERROR_STOP=1", "-c", `create database ${quotedDatabase}`], { stdio: "pipe" });
  const psqlBase = [childUrl.toString(), "-X", "--no-psqlrc"];
  let stopped = false;
  return {
    root: null,
    port: Number(childUrl.port || 5432),
    sql(text) {
      return execFileSync("psql", [...psqlBase, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", text], { encoding: "utf8" });
    },
    sqlExpectError(text) {
      try {
        execFileSync("psql", [...psqlBase, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", text], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      } catch (error) {
        return String(error.stderr ?? error.message);
      }
      throw new Error(`SQL unexpectedly succeeded: ${text}`);
    },
    json(text) { return JSON.parse(this.sql(`select coalesce((${text})::text, 'null')`).trim() || "null"); },
    scalar(text) { return this.sql(text).trim(); },
    applyFile(file) {
      execFileSync("psql", [...psqlBase, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
    },
    sqlAsync(text) {
      return new Promise((resolve) => {
        const child = spawn("psql", [...psqlBase, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", text]);
        let out = ""; let err = "";
        child.stdout.on("data", (chunk) => (out += chunk));
        child.stderr.on("data", (chunk) => (err += chunk));
        child.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim() }));
      });
    },
    stop() {
      if (stopped) return;
      stopped = true;
      try {
        execFileSync("psql", [...base, "-v", "ON_ERROR_STOP=1", "-c", `drop database ${quotedDatabase} with (force)`], { stdio: "pipe" });
        // These Supabase fixture roles are cluster-scoped rather than
        // database-scoped. Remove them after dropping the isolated database so
        // the next sequential verifier receives a genuinely clean namespace.
        execFileSync("psql", [...base, "-v", "ON_ERROR_STOP=1", "-c", "drop role if exists service_role, authenticated, anon"], { stdio: "pipe" });
      } catch (error) {
        throw new Error(`External test database cleanup failed for ${database}: ${error.message}`);
      }
    }
  };
}
