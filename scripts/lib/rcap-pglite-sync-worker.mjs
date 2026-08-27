import { workerData } from "node:worker_threads";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const { port, signalBuffer } = workerData;
const signal = new Int32Array(signalBuffer);

function reply(message) {
  port.postMessage(message);
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0, 1);
}

function cell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "t" : "f";
  if (value instanceof Uint8Array) return `\\x${Buffer.from(value).toString("hex")}`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function psqlTuples(results) {
  const lines = [];
  for (const result of results) {
    if (!result?.rows?.length) continue;
    const names = result.fields.map((field) => field.name);
    for (const row of result.rows) lines.push(names.map((name) => cell(row[name])).join("|"));
  }
  return lines.length ? `${lines.join("\n")}\n` : "";
}

function psqlError(error) {
  const lines = [`${error?.severity ?? "ERROR"}:  ${String(error?.message ?? error)}`];
  if (error?.detail) lines.push(`DETAIL:  ${error.detail}`);
  if (error?.hint) lines.push(`HINT:  ${error.hint}`);
  if (error?.where) lines.push(`CONTEXT:  ${error.where}`);
  return `${lines.join("\n")}\n`;
}

const db = new PGlite({ extensions: { pgcrypto } });
await db.waitReady;
reply({ id: 0, ok: true });

port.on("message", async ({ id, kind, sql }) => {
  try {
    if (kind === "stop") {
      await db.close();
      reply({ id, ok: true, output: "" });
      port.close();
      return;
    }
    let results;
    try {
      results = await db.exec(sql);
    } finally {
      try {
        await db.exec("reset role; reset all");
      } catch {
        await db.exec("rollback; reset role; reset all");
      }
    }
    reply({ id, ok: true, output: psqlTuples(results) });
  } catch (error) {
    reply({
      id,
      ok: false,
      error: String(error?.message ?? error),
      stderr: psqlError(error),
      stack: String(error?.stack ?? "")
    });
  }
});
