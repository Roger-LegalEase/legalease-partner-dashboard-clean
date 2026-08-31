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
if (String(receipt.acquisitionRunId) !== runId) refuse("receipt run id does not match");
if (receipt.artifactName !== artifactName) refuse("receipt artifact name does not match");
if (receipt.sha256 !== observed) refuse("receipt hash does not match the artifact bytes");

/*
 * The expected hash is the receipt's, not the operator's.
 *
 * C13 found that --expected-sha256 was the only thing measured, and that the
 * receipt carries TWO 64-hex fields: `expectedSha256`, the hash the manifest
 * pinned, and `sha256`, the hash of whatever actually arrived. Passing the
 * second always passed. Same artifact, same receipt, verdict decided by which
 * field the operator typed -- and the field that always passes is the one that
 * asks nothing. That is not a gate; it is a prompt for the answer.
 *
 * So the manifest's pin, recorded in the receipt at fetch time, is what the
 * bytes are measured against. --expected-sha256 stays required and must agree
 * with it, because a caller naming a different hash is telling us it expected a
 * different document.
 */
const pinned = String(receipt.expectedSha256 ?? "").toLowerCase();
if (!/^[0-9a-f]{64}$/.test(pinned)) refuse("the receipt records no expected SHA-256; an acquisition with no pinned identity cannot be promoted");
if (pinned !== observed) refuse(`the manifest pinned ${pinned} and the artifact bytes are ${observed}; the publisher's document is not the document this dispatch expected`);
if (expected !== pinned) refuse(`--expected-sha256 ${expected} is not the hash the receipt pins (${pinned})`);
if (expected !== observed) refuse("expected hash does not match the artifact bytes");

/*
 * The receipt's own verdict fields, which the materializer previously ignored
 * entirely. C13 materialized a receipt declaring outcome "not_acquired", a
 * redirect to someone-elses-host.us, looksLikePdf false, matchesExpectedSha256
 * false and a binaryFile naming a different file, and got comparisonResult
 * MATCH with promoLaunchNow true.
 */
if (receipt.outcome !== "acquired") refuse(`the receipt says outcome "${receipt.outcome ?? "(absent)"}"; only an acquired source can be promoted`);
if (receipt.matchesExpectedSha256 === false) refuse("the receipt records that the retrieved bytes did not match the pinned hash");
if (receipt.binaryFile && path.basename(receipt.binaryFile) !== path.basename(input)) {
  refuse(`the receipt describes ${path.basename(receipt.binaryFile)} and the artifact body is ${path.basename(input)}`);
}
if (receipt.looksLikePdf === false) refuse("the receipt says the retrieved bytes are not a PDF; an HTML error page served with a 200 is the case this catches");

const out = path.join("private/source-acquisition-handoff", runId, artifactName);
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(input, path.join(out, "source-body"));
fs.copyFileSync(receiptArg, path.join(out, "receipt.json"));
fs.writeFileSync(path.join(out, "PROMO_HANDOFF.json"), `${JSON.stringify({
  schemaVersion: "rcap-acq-promo-handoff/v1", acquisitionRunId: runId,
  artifactName, receiptPath: path.resolve(receiptArg), expectedSha256: pinned,
  expectedSha256Source: "the receipt's own expectedSha256, recorded from the manifest pin at fetch time — not the caller's argument",
  observedSha256: observed, comparisonResult: "MATCH", promoLaunchNow: true,
  receiptOutcome: receipt.outcome, finalResolvedUrl: receipt.finalResolvedUrl ?? null,
  publisherHost: receipt.publisherHost ?? null,
  bodyCommitted: false
}, null, 2)}\n`);
console.log(`ACQ_TO_PROMO_HANDOFF_READY ${out}`);
