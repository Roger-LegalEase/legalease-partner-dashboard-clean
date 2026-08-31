#!/usr/bin/env node
/** Fail-closed ACQ -> PROMO materialization. This consumes an artifact already
 * downloaded by the reviewed setup phase; it performs no network request and
 * accepts no token. Source bytes remain under gitignored private storage. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
const runId = flag("--run-id");
const artifactName = flag("--artifact-name");
const input = flag("--input");
const expected = flag("--expected-sha256");
const receiptArg = flag("--receipt");
const refuse = (why) => { console.error(`REFUSED ACQ_TO_PROMO_HANDOFF — ${why}`); process.exit(1); };

if (!/^\d+$/.test(runId ?? "")) refuse("an exact numeric GitHub Actions run id is required");
if (!/^[A-Za-z0-9][A-Za-z0-9._-]+$/.test(artifactName ?? "")) refuse("an exact artifact name is required");
if (!input || !fs.existsSync(input) || !fs.statSync(input).isFile()) refuse("the exact artifact body is missing");
if (!receiptArg || !fs.existsSync(receiptArg)) refuse("the exact receipt is missing");
if (!/^[0-9a-f]{64}$/.test(expected ?? "")) refuse("expected SHA-256 is missing or malformed");
let receipt;
try { receipt = JSON.parse(fs.readFileSync(receiptArg, "utf8")); } catch (e) { refuse(`receipt is unreadable: ${e.message}`); }
const observed = crypto.createHash("sha256").update(fs.readFileSync(input)).digest("hex");
if (String(receipt.acquisitionRunId ?? receipt.runId) !== runId) refuse("receipt run id does not match");
if (receipt.artifactName !== artifactName) refuse("receipt artifact name does not match");
if (receipt.sha256 !== observed) refuse("receipt hash does not match the artifact bytes");
if (expected !== observed) refuse("expected hash does not match the artifact bytes");

const out = path.join("private/source-acquisition-handoff", runId, artifactName);
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(input, path.join(out, "source-body"));
fs.copyFileSync(receiptArg, path.join(out, "receipt.json"));
fs.writeFileSync(path.join(out, "PROMO_HANDOFF.json"), `${JSON.stringify({
  schemaVersion: "rcap-acq-promo-handoff/v1", acquisitionRunId: runId,
  artifactName, receiptPath: path.resolve(receiptArg), expectedSha256: expected,
  observedSha256: observed, comparisonResult: "MATCH", promoLaunchNow: true,
  bodyCommitted: false
}, null, 2)}\n`);
console.log(`ACQ_TO_PROMO_HANDOFF_READY ${out}`);
