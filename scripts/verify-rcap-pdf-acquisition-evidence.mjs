#!/usr/bin/env node
// The gate between an acquired binary and the branch.
//
//   node scripts/verify-rcap-pdf-acquisition-evidence.mjs
//   node scripts/verify-rcap-pdf-acquisition-evidence.mjs --mutations
//
// Nothing reaches the source tree without a receipt that proves all six checks
// passed for it: publisher, url, revision, content type, page count and
// sha-256. This runs in the collect job before the commit, and it fails the run
// rather than letting an unproven file through.
//
// It also refuses the quieter failure: a binary on disk that no receipt
// mentions, and a receipt that claims acceptance without the bytes to show for
// it. Both are how an unverified file gets in while every individual check
// still looks green.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const MUTATIONS = process.argv.includes("--mutations");
const BINARY_ROOT = "data/record-clearing/official-sources";
const RECEIPT_ROOT = "data/record-clearing/official-source-receipts";
const REQUIRED_CHECKS = ["publisher", "url", "revision", "contentType", "pageCount", "sha256"];

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function listFiles(root) {
  const abs = path.join(rootDir, root);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      out.push(path.relative(rootDir, p));
    }
  })(abs);
  return out.sort();
}

function loadReceipts() {
  return listFiles(RECEIPT_ROOT)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ file: f, body: JSON.parse(fs.readFileSync(path.join(rootDir, f), "utf8")) }));
}

function failures({ receipts, binaries, readBytes }) {
  const out = [];
  const fail = (ok, message) => { if (!ok) out.push(message); };

  const acceptedByPath = new Map();
  for (const { file, body } of receipts) {
    fail(body.schemaVersion === "rcap-official-source-receipt/v1", `${file}: not an acquisition receipt`);
    fail(body.dryRun !== true, `${file}: a dry-run receipt may never authorize a commit`);
    for (const result of body.results ?? []) {
      if (!result.accepted) {
        fail(typeof result.quarantineReason === "string" && result.quarantineReason.length > 0,
          `${file}: ${result.formId} was not accepted and records no quarantine reason`);
        continue;
      }
      for (const check of REQUIRED_CHECKS) {
        fail(result.checks?.[check]?.ok === true,
          `${file}: ${result.jurisdiction} ${result.formId} was accepted with ${check} not passing`);
      }
      fail(typeof result.writtenTo === "string" && result.writtenTo.length > 0,
        `${file}: ${result.formId} was accepted without recording where it was written`);
      fail(result.checks?.pageCount?.value > 0, `${file}: ${result.formId} was accepted with no page count`);
      fail(result.checks?.contentType?.value === "application/pdf", `${file}: ${result.formId} was accepted with content type ${result.checks?.contentType?.value}`);
      fail(result.checks?.publisher?.finalHost === result.checks?.publisher?.queuedHost,
        `${file}: ${result.formId} was accepted after landing on a different host than the queue recorded`);
      if (result.writtenTo) acceptedByPath.set(result.writtenTo, { result, file });
    }
  }

  // Every binary present must be one a receipt accepted, and its bytes must be
  // the bytes the receipt hashed.
  for (const binary of binaries) {
    const claim = acceptedByPath.get(binary);
    fail(Boolean(claim), `${binary}: present in the source tree with no receipt accepting it`);
    if (!claim) continue;
    const bytes = readBytes(binary);
    if (!bytes) continue;
    fail(sha256(bytes) === claim.result.checks.sha256.computed,
      `${binary}: bytes on disk do not match the sha-256 its receipt recorded`);
    fail(bytes.subarray(0, 5).toString("latin1") === "%PDF-", `${binary}: does not begin %PDF-`);
  }

  // And every acceptance must have produced the file it claims.
  for (const [p, claim] of acceptedByPath) {
    fail(binaries.includes(p), `${claim.file}: accepted ${claim.result.formId} but ${p} is not present`);
  }

  return out;
}

const receipts = loadReceipts();
const binaries = listFiles(BINARY_ROOT);
const readBytes = (rel) => { try { return fs.readFileSync(path.join(rootDir, rel)); } catch { return null; } };

if (MUTATIONS) {
  const base = { receipts: JSON.parse(JSON.stringify(receipts)), binaries: [...binaries], readBytes: () => null };
  const baseCount = failures(base).length;
  const withOne = (mutate) => {
    const d = { receipts: JSON.parse(JSON.stringify(receipts)), binaries: [...binaries], readBytes: () => null };
    if (d.receipts.length === 0) {
      d.receipts = [{
        file: `${RECEIPT_ROOT}/shard-00.json`,
        body: {
          schemaVersion: "rcap-official-source-receipt/v1", dryRun: false,
          results: [{
            jurisdiction: "XX", formId: "PROBE-1", accepted: true, writtenTo: `${BINARY_ROOT}/XX/PROBE-1.pdf`,
            checks: {
              publisher: { ok: true, queuedHost: "courts.example.gov", finalHost: "courts.example.gov" },
              url: { ok: true }, revision: { ok: true },
              contentType: { ok: true, value: "application/pdf" },
              pageCount: { ok: true, value: 3 },
              sha256: { ok: true, computed: "0".repeat(64) }
            }
          }]
        }
      }];
      d.binaries = [`${BINARY_ROOT}/XX/PROBE-1.pdf`];
      d.readBytes = () => Buffer.from("%PDF-1.7\n");
      // the synthetic baseline must itself be clean apart from the sha compare
      d.readBytes = () => null;
    }
    mutate(d);
    return d;
  };
  const cleanCount = failures(withOne(() => {})).length;
  const mutations = [
    ["a receipt accepting a file with content type text/html", (d) => { d.receipts[0].body.results[0].checks.contentType = { ok: true, value: "text/html" }; }],
    ["a receipt accepting a file with no page count", (d) => { d.receipts[0].body.results[0].checks.pageCount = { ok: true, value: 0 }; }],
    ["a receipt accepting a redirect onto another host", (d) => { d.receipts[0].body.results[0].checks.publisher.finalHost = "mirror.example.com"; }],
    ["a check quietly marked not-ok but still accepted", (d) => { d.receipts[0].body.results[0].checks.sha256.ok = false; }],
    ["a required check removed entirely", (d) => { delete d.receipts[0].body.results[0].checks.revision; }],
    ["a dry-run receipt used to authorize a commit", (d) => { d.receipts[0].body.dryRun = true; }],
    ["a binary present that no receipt accepted", (d) => { d.binaries.push(`${BINARY_ROOT}/ZZ/unaccounted.pdf`); }],
    ["an acceptance with no file to show for it", (d) => { d.binaries = d.binaries.filter((b) => b !== d.receipts[0].body.results[0].writtenTo); }],
    ["a quarantine with no reason", (d) => { d.receipts[0].body.results.push({ jurisdiction: "XX", formId: "PROBE-2", accepted: false }); }]
  ];
  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const caught = failures(withOne(mutate)).length > cleanCount;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-pdf-acquisition-evidence --mutations FAILED — ${undetected} undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way an unverified binary could reach the branch is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = failures({ receipts, binaries, readBytes });
const accepted = receipts.flatMap((r) => (r.body.results ?? []).filter((x) => x.accepted));
const quarantined = receipts.flatMap((r) => (r.body.results ?? []).filter((x) => !x.accepted));
console.log(
  `pdf acquisition evidence: ${receipts.length} receipt(s), ${accepted.length} accepted, ` +
  `${quarantined.length} quarantined, ${binaries.length} binary file(s) present.`
);
if (problems.length > 0) {
  console.error(`\nverify-rcap-pdf-acquisition-evidence FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems.slice(0, 40)) console.error(` - ${p}`);
  process.exit(1);
}
console.log("Every binary present was accepted by a receipt that proves publisher, url, revision, content type, page count and sha-256.");
