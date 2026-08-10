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

const PG_BIN = "/usr/lib/postgresql/16/bin";

export function ephemeralPgAvailable() {
  try {
    execFileSync("id", ["postgres"], { stdio: "ignore" });
    fs.accessSync(path.join(PG_BIN, "initdb"));
    return true;
  } catch {
    return false;
  }
}

export function startEphemeralPg() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-epg-"));
  const port = 54000 + Math.floor(Math.random() * 2000);
  fs.chmodSync(root, 0o777);
  execFileSync("chown", ["postgres:postgres", root]);
  run(`${PG_BIN}/initdb -D ${root}/data -A trust`);
  run(`${PG_BIN}/pg_ctl -D ${root}/data -o '-p ${port} -k ${root} -c listen_addresses=' -l ${root}/pg.log start`);

  const psqlBase = ["-h", root, "-p", String(port), "-U", "postgres", "-d", "postgres", "-X", "--no-psqlrc"];

  function run(cmd) {
    execFileSync("su", ["postgres", "-s", "/bin/bash", "-c", cmd], { stdio: ["ignore", "pipe", "pipe"] });
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
        run(`${PG_BIN}/pg_ctl -D ${root}/data stop -m immediate`);
      } catch {
        // Already gone.
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}
