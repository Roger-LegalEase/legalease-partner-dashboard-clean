#!/usr/bin/env node
/** The family matrix, read from the committed raster queue.
 *  Emits GitHub Actions outputs. It refuses rather than emitting an empty
 *  matrix silently: "nothing to render" and "the queue lost its contents" look
 *  identical from outside, and one of them is a regression. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flag = (n) => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const manifest = flag("--manifest") ?? "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json";
const only = (flag("--families") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const fail = (why) => { console.error(`REFUSED raster plan — ${why}`); process.exit(1); };
if (!fs.existsSync(path.join(ROOT, manifest))) fail(`${manifest} is not committed at this commit`);
let doc;
try { doc = JSON.parse(fs.readFileSync(path.join(ROOT, manifest), "utf8")); } catch (e) { fail(`${manifest} is not readable JSON: ${e.message}`); }

const rows = (doc.rows ?? []).filter((r) => r.currentRasterState === "RASTER_PENDING");
if (rows.length === 0) fail("the queue holds no RASTER_PENDING row; nothing to render and no way to tell that from a queue that lost its contents");

const unknown = only.filter((f) => !rows.some((r) => r.familyId === f));
if (unknown.length) fail(`requested famil(ies) not RASTER_PENDING in the queue: ${unknown.join(", ")}`);

const families = (only.length ? only : rows.map((r) => r.familyId)).sort();
const dup = families.filter((x, i, a) => a.indexOf(x) !== i);
if (dup.length) fail(`duplicate famil(ies) in the batch: ${dup.join(", ")}`);

console.log(`families=${JSON.stringify(families)}`);
console.log(`count=${families.length}`);
