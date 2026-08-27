// Isolated PostgreSQL harness for RCAP verifiers.
//
// Native PostgreSQL boots a throwaway cluster on a private socket. Verifiers
// whose SQL is known to run under PGlite may explicitly opt into the installed
// in-process fallback. Neither backend can reach a shared or remote database.

import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  MessageChannel,
  Worker,
  receiveMessageOnPort
} from "node:worker_threads";

const PG_BIN = "/usr/lib/postgresql/16/bin";
const require = createRequire(import.meta.url);

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

export function resolveNativePgToolchain(find = findPgBin) {
  const initdb = find("initdb");
  const pgCtl = find("pg_ctl");
  const psql = find("psql");
  return initdb && pgCtl && psql ? { initdb, pgCtl, psql } : null;
}

function availableNativePgToolchain() {
  const toolchain = resolveNativePgToolchain();
  if (!toolchain) return null;
  if (!isRoot) return toolchain; // run the server as the current user
  try {
    execFileSync("id", ["postgres"], { stdio: "ignore" });
    return toolchain; // root drops privileges to the postgres user
  } catch {
    return null;
  }
}

function pgliteAvailable() {
  try {
    require.resolve("@electric-sql/pglite");
    return true;
  } catch {
    return false;
  }
}

export function ephemeralPgAvailable({ allowPgliteFallback = false } = {}) {
  return Boolean(availableNativePgToolchain()) || (allowPgliteFallback && pgliteAvailable());
}

function startPglitePg() {
  const signal = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(new URL("./rcap-pglite-sync-worker.mjs", import.meta.url), {
    workerData: { port: port2, signalBuffer: signal.buffer },
    transferList: [port2]
  });
  let nextId = 1;
  let stopped = false;

  function receive(id) {
    const waited = Atomics.wait(signal, 0, 0, 120_000);
    if (waited === "timed-out") throw new Error(`PGlite command ${id} timed out`);
    Atomics.store(signal, 0, 0);
    const packet = receiveMessageOnPort(port1)?.message;
    if (!packet || packet.id !== id) {
      throw new Error(`PGlite command ${id} returned an invalid response`);
    }
    if (!packet.ok) {
      const error = new Error(packet.error);
      error.stderr = packet.stderr ?? packet.error;
      if (packet.stack) error.stack = packet.stack;
      throw error;
    }
    return packet.output ?? "";
  }

  receive(0);

  function call(kind, sql = "") {
    if (stopped) throw new Error("PGlite harness is already stopped");
    const id = nextId++;
    Atomics.store(signal, 0, 0);
    port1.postMessage({ id, kind, sql });
    return receive(id);
  }

  return {
    root: null,
    port: null,
    backend: "pglite",
    sql(text) {
      return call("exec", text);
    },
    sqlExpectError(text) {
      try {
        this.sql(text);
      } catch (error) {
        return String(error.stderr ?? error.message);
      }
      throw new Error(`SQL unexpectedly succeeded: ${text}`);
    },
    json(text) {
      const out = this.sql(`select coalesce((${text})::text, 'null')`).trim();
      return JSON.parse(out || "null");
    },
    scalar(text) {
      return this.sql(text).trim();
    },
    applyFile(file) {
      this.sql(fs.readFileSync(file, "utf8"));
    },
    sqlAsync() {
      throw new Error("PGlite fallback does not provide independent concurrent psql sessions; use native PostgreSQL");
    },
    stop() {
      if (stopped) return;
      call("stop");
      stopped = true;
      port1.close();
      void worker.terminate();
    }
  };
}

export function startEphemeralPg({ allowPgliteFallback = false } = {}) {
  const native = availableNativePgToolchain();
  if (!native) {
    if (!allowPgliteFallback || !pgliteAvailable()) {
      throw new Error("No isolated PostgreSQL runtime is available");
    }
    return startPglitePg();
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-epg-"));
  const port = 54000 + Math.floor(Math.random() * 2000);
  if (isRoot) {
    // The server refuses to run as root; drop privileges to the postgres user.
    fs.chmodSync(root, 0o777);
    execFileSync("chown", ["postgres:postgres", root]);
  }
  run(`${native.initdb} -D ${root}/data -U postgres -A trust`);
  run(`${native.pgCtl} -D ${root}/data -o '-p ${port} -k ${root} -c listen_addresses=' -l ${root}/pg.log start -w -t 30`);

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
      return execFileSync(native.psql, [...psqlBase, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", text], {
        encoding: "utf8"
      });
    },
    /** Runs SQL expecting failure; returns the error text, throws if it succeeded. */
    sqlExpectError(text) {
      try {
        execFileSync(native.psql, [...psqlBase, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", text], {
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
      execFileSync(native.psql, [...psqlBase, "-v", "ON_ERROR_STOP=1", "-q", "-f", file], { encoding: "utf8" });
    },
    /** Launches a concurrent statement; resolves with {ok, out}. */
    sqlAsync(text) {
      return new Promise((resolve) => {
        const child = spawn(native.psql, [...psqlBase, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", text]);
        let out = "";
        let err = "";
        child.stdout.on("data", (chunk) => (out += chunk));
        child.stderr.on("data", (chunk) => (err += chunk));
        child.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim() }));
      });
    },
    stop() {
      try {
        run(`${native.pgCtl} -D ${root}/data stop -m immediate`);
      } catch {
        // Already gone.
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}
