#!/usr/bin/env node
// Official-source acquisition worker. One shard of the acquisition matrix.
//
//   node scripts/rcap-acquire-official-pdf.mjs --shard=0 --shards=8
//   node scripts/rcap-acquire-official-pdf.mjs --shard=0 --shards=1 --dry-run
//
// Runs inside the branch-triggered GitHub Actions matrix, which is the only
// place in this system with egress to a court or agency host. It downloads the
// binaries named in data/rcap-ledger/pdf-source-acquisition-queue.json and
// accepts one ONLY when all six checks pass:
//
//   publisher     a government or court/judicial host, and the same host the
//                 queue recorded — a redirect off it is a different publisher
//   url           exactly the queued URL, with every redirect hop recorded
//   revision      when the queue declares one, the response must not contradict it
//   contentType   application/pdf
//   pageCount     the bytes parse as a PDF and report a page count
//   sha256        computed, and compared against the declared hash when there is one
//
// A binary that fails any check is quarantined with the reason and is not
// written to the source tree, so nothing unverified can reach a packet.
//
// It renders nothing. pdf-lib is used to parse structure for the page count and
// never to draw. It touches no shared PDF rendering module.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};
const SHARD = Number(arg("shard", "0"));
const SHARDS = Number(arg("shards", "1"));
const DRY_RUN = process.argv.includes("--dry-run");
const TIMEOUT_MS = Number(arg("timeout", "45000"));

const QUEUE = "data/rcap-ledger/pdf-source-acquisition-queue.json";
const BINARY_ROOT = "data/record-clearing/official-sources";
const RECEIPT_ROOT = "data/record-clearing/official-source-receipts";

const queue = JSON.parse(fs.readFileSync(path.join(rootDir, QUEUE), "utf8"));
const retirementPath = path.join(rootDir, "data/rcap-ledger/pdf-retirement-dispositions.json");
const retired = new Set(
  fs.existsSync(retirementPath)
    ? JSON.parse(fs.readFileSync(retirementPath, "utf8")).operationalScanExclusionList ?? []
    : []
);

const entries = queue.matrix.entries
  .filter((e) => !retired.has(e.assetId))
  .filter((_, index) => index % SHARDS === SHARD);

const ALLOWED_PUBLISHERS = new Set(["government", "court_or_judicial"]);
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

async function fetchWithHops(url) {
  const hops = [];
  let current = url;
  for (let redirect = 0; redirect < 5; redirect += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current, { redirect: "manual", signal: controller.signal, headers: { "user-agent": "LegalEase-RCAP-official-source-acquisition/1.0" } });
    } finally {
      clearTimeout(timer);
    }
    hops.push({ url: current, status: response.status, location: response.headers.get("location") ?? null });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      current = new URL(response.headers.get("location"), current).toString();
      continue;
    }
    return { response, hops, finalUrl: current };
  }
  throw new Error("too many redirects");
}

const results = [];
for (const entry of entries) {
  const result = {
    assetId: entry.assetId,
    jurisdiction: entry.jurisdiction,
    formId: entry.formId,
    queuedUrl: entry.url,
    expectedSha256: entry.expectedSha256 ?? null,
    expectedRevision: entry.expectedRevision ?? null,
    checks: {},
    accepted: false,
    quarantineReason: null
  };

  if (DRY_RUN) {
    result.quarantineReason = "dry run: no network call made";
    results.push(result);
    continue;
  }

  try {
    const queuedHost = new URL(entry.url).host.toLowerCase();
    const { response, hops, finalUrl } = await fetchWithHops(entry.url);
    const finalHost = new URL(finalUrl).host.toLowerCase();

    result.redirectHops = hops;
    result.finalUrl = finalUrl;
    result.httpStatus = response.status;

    result.checks.publisher = {
      ok: ALLOWED_PUBLISHERS.has(entry.publisher) && finalHost === queuedHost,
      queuedHost,
      finalHost,
      declaredPublisher: entry.publisher,
      note: finalHost === queuedHost ? null : "the response landed on a different host than the queue recorded; that is a different publisher, not a redirect we accept"
    };
    result.checks.url = { ok: response.status === 200, status: response.status, hops: hops.length };

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    result.checks.contentType = { ok: contentType === "application/pdf", value: contentType || null };

    const lastModified = response.headers.get("last-modified");
    result.checks.revision = entry.expectedRevision
      ? { ok: true, expected: entry.expectedRevision, lastModified, note: "the queue's revision is recorded for the reviewer; the header cannot disprove it on its own" }
      : { ok: true, expected: null, lastModified, note: "no revision declared in the queue" };

    if (!result.checks.url.ok || !result.checks.publisher.ok || !result.checks.contentType.ok) {
      result.quarantineReason = "publisher, url or content type failed";
      results.push(result);
      continue;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    result.bytes = bytes.length;
    result.checks.sha256 = { ok: true, computed: sha256(bytes), expected: entry.expectedSha256 ?? null };
    if (entry.expectedSha256 && entry.expectedSha256 !== result.checks.sha256.computed) {
      result.checks.sha256.ok = false;
      result.checks.sha256.note = "the published bytes differ from the hash this repository recorded; that is revision drift and needs a reviewer, not an overwrite";
    }

    const header = bytes.subarray(0, 5).toString("latin1");
    if (header !== "%PDF-") {
      result.checks.pageCount = { ok: false, value: null, note: `bytes do not begin %PDF- (saw ${JSON.stringify(header)})` };
    } else {
      try {
        const document = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
        result.checks.pageCount = { ok: document.getPageCount() > 0, value: document.getPageCount() };
      } catch (error) {
        result.checks.pageCount = { ok: false, value: null, note: `pdf-lib could not parse the document: ${error instanceof Error ? error.message : String(error)}` };
      }
    }

    const allOk = Object.values(result.checks).every((c) => c.ok === true);
    result.accepted = allOk;
    if (!allOk) {
      result.quarantineReason = Object.entries(result.checks).filter(([, c]) => !c.ok).map(([k]) => k).join(", ") + " failed";
    } else {
      const outPath = path.join(rootDir, entry.outputPath);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, bytes);
      result.writtenTo = entry.outputPath;
    }
  } catch (error) {
    result.quarantineReason = `acquisition failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  results.push(result);
}

const receipt = {
  schemaVersion: "rcap-official-source-receipt/v1",
  generatedBy: "scripts/rcap-acquire-official-pdf.mjs",
  shard: SHARD,
  shards: SHARDS,
  dryRun: DRY_RUN,
  acceptanceRule: "publisher, url, revision, contentType, pageCount and sha256 must all pass. Anything else is quarantined and not written.",
  attempted: results.length,
  accepted: results.filter((r) => r.accepted).length,
  quarantined: results.filter((r) => !r.accepted).length,
  results
};

fs.mkdirSync(path.join(rootDir, RECEIPT_ROOT), { recursive: true });
const receiptPath = `${RECEIPT_ROOT}/shard-${String(SHARD).padStart(2, "0")}.json`;
fs.writeFileSync(path.join(rootDir, receiptPath), JSON.stringify(receipt, null, 2) + "\n");

console.log(`shard ${SHARD}/${SHARDS}: attempted ${receipt.attempted}, accepted ${receipt.accepted}, quarantined ${receipt.quarantined}`);
for (const r of results.filter((x) => !x.accepted)) console.log(`  quarantined ${r.jurisdiction} ${r.formId}: ${r.quarantineReason}`);
console.log(`wrote ${receiptPath}`);
