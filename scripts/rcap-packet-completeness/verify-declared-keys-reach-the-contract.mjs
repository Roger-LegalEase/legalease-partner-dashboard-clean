#!/usr/bin/env node
/**
 * Every `dec.*` key the contract decides on must be forwarded by the reader.
 *
 * Twice now the completeness contract has grown a guard that no packet could
 * reach, because `normalizeRow` in verify-packet-completeness.mjs builds the
 * `declared` object from a fixed list of keys and the new one was not on it.
 * The first time it was `factAvailable` and the case-determined pair; the
 * second time it was `routeConditionThatMakesItInapplicable`, which made the
 * whole declared NOT_APPLICABLE_ON_THIS_ROUTE channel inert from the day it was
 * written. Both were found by someone reading the reader rather than trusting
 * the contract, and a packet that declared the disposition correctly was told
 * its blank was unclassified.
 *
 * This is the cheap structural check that makes a third time loud. It reads the
 * contract for every key consulted on the declaration object, reads the reader
 * for every key it forwards, and fails on the difference. It proves nothing
 * about whether a guard is RIGHT -- only that a packet can reach it at all.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT = "scripts/rcap-packet-completeness/completeness-contract.mjs";
const READER = "scripts/rcap-packet-completeness/verify-packet-completeness.mjs";

const contract = fs.readFileSync(path.join(ROOT, CONTRACT), "utf8");
const reader = fs.readFileSync(path.join(ROOT, READER), "utf8");

/* What the contract reads off the declaration. classifyBlank binds it as `dec`,
 * so every dec.<key> in that file is a key a packet must be able to set. */
const consulted = new Set([...contract.matchAll(/\bdec\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
if (consulted.size === 0) {
  throw new Error(`read zero dec.* keys out of ${CONTRACT}; the denominator is broken, not the contract`);
}

/* What the reader forwards. The declared object is a single object literal, so
 * take its span and read the keys it sets. */
const start = reader.indexOf("declared: {");
if (start === -1) throw new Error(`no declared object literal in ${READER}; this check cannot measure what it cannot find`);
let depth = 0, end = -1;
for (let i = reader.indexOf("{", start); i < reader.length; i++) {
  if (reader[i] === "{") depth++;
  else if (reader[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
}
if (end === -1) throw new Error(`the declared object literal in ${READER} is unbalanced`);
const declaredSpan = reader.slice(start, end + 1);
const forwarded = new Set([...declaredSpan.matchAll(/(?:^|[\s{,])([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]));
/* A spread of a conditional object forwards its keys too. */
for (const m of declaredSpan.matchAll(/Object\.hasOwn\(row,\s*"([^"]+)"\)/g)) forwarded.add(m[1]);
forwarded.delete("declared");

const missing = [...consulted].filter((k) => !forwarded.has(k)).sort();
console.log(`contract consults ${consulted.size} declaration key(s); the reader forwards ${forwarded.size}`);
if (missing.length === 0) {
  console.log("EVERY_DECLARED_KEY_REACHES_THE_CONTRACT");
  process.exit(0);
}
console.log(`\nUNREACHABLE: ${missing.length} key(s) the contract decides on that no packet can set:`);
for (const k of missing) console.log(`  dec.${k}`);
console.log(`\nEach one is a guard that cannot fire, or a channel that is inert. Forward it in the declared object of ${READER}.`);
process.exit(1);
