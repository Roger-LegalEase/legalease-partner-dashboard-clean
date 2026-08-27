#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveNativePgToolchain } from "./lib/rcap-ephemeral-pg.mjs";

const all = new Map([
  ["initdb", "/pg/bin/initdb"],
  ["pg_ctl", "/pg/bin/pg_ctl"],
  ["psql", "/pg/bin/psql"]
]);
assert.deepEqual(resolveNativePgToolchain((name) => all.get(name) ?? null), {
  initdb: "/pg/bin/initdb",
  pgCtl: "/pg/bin/pg_ctl",
  psql: "/pg/bin/psql"
});
for (const missing of all.keys()) {
  assert.equal(resolveNativePgToolchain((name) => name === missing ? null : all.get(name)), null,
    `native PostgreSQL must be unavailable without ${missing}`);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const relative of [
  "scripts/verify-rcap-phase52-consumer-payment-authority.mjs",
  "scripts/verify-rcap-phase53-consumer-job-binding.mjs"
]) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  assert.doesNotMatch(source, /SKIPPED:[\s\S]{0,160}process\.exit\(0\)/,
    `${relative} must fail closed when neither isolated PostgreSQL backend exists`);
}

console.log("RCAP native PostgreSQL toolchain resolution passed.");
