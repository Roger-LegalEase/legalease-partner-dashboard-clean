#!/usr/bin/env node
/**
 * The batch acquisition result, in one file.
 *
 * Runs in .github/workflows/rcap-official-source-acquisition-batch.yml after
 * every matrix job, and it runs on failure too: a batch where nothing was
 * acquired must produce a result saying so, because an absent result is
 * indistinguishable from a batch nobody dispatched.
 *
 * Three verdicts, and the middle one is the important one:
 *
 *   COMPLETE  every planned URL produced a receipt with a SHA-256.
 *   PARTIAL   some did. The ones that did not are named with their reason, and
 *             the batch is not reported as a success because most of it worked.
 *   REFUSED   the manifest never validated, or nothing was acquired at all.
 *
 * It reads receipts, never bodies, and it commits nothing.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARTIFACTS = "batch-artifacts";
const OUT = "SOURCE_ACQUISITION_BATCH_RESULT.json";
const planned = Number.parseInt(process.env.RCAP_PLANNED ?? "0", 10) || 0;
const planResult = process.env.RCAP_PLAN_RESULT ?? "unknown";
const acquireResult = process.env.RCAP_ACQUIRE_RESULT ?? "unknown";

const receipts = [];
const unreadable = [];
const dir = path.join(ROOT, ARTIFACTS);
if (fs.existsSync(dir)) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const files = fs.readdirSync(path.join(dir, entry.name), { recursive: true })
      .filter((f) => String(f).endsWith(".json"));
    if (files.length === 0) { unreadable.push({ artifact: entry.name, why: "the artifact carries no receipt" }); continue; }
    for (const f of files) {
      try {
        const r = JSON.parse(fs.readFileSync(path.join(dir, entry.name, String(f)), "utf8"));
        receipts.push({ artifact: entry.name, receiptFile: String(f), ...r });
      } catch (e) { unreadable.push({ artifact: entry.name, receiptFile: String(f), why: `unreadable receipt: ${e.message}` }); }
    }
  }
}

const acquired = receipts.filter((r) => /^[0-9a-f]{64}$/.test(String(r.sha256 ?? "")));
const failed = receipts.filter((r) => !/^[0-9a-f]{64}$/.test(String(r.sha256 ?? "")))
  .map((r) => ({ artifact: r.artifact, jurisdiction: r.jurisdiction ?? null, formNumber: r.formNumber ?? null, why: r.failure ?? r.error ?? "the receipt carries no SHA-256" }));
const hashMismatches = acquired.filter((r) => r.matchesExpectedSha256 === false)
  .map((r) => ({ artifact: r.artifact, expected: r.expectedSha256, retrieved: r.sha256 }));

let verdict;
if (planResult !== "success") verdict = "REFUSED";
else if (planned === 0) verdict = "REFUSED";
else if (acquired.length === 0) verdict = "REFUSED";
else if (acquired.length === planned && failed.length === 0 && unreadable.length === 0 && hashMismatches.length === 0) verdict = "COMPLETE";
else verdict = "PARTIAL";

const result = {
  schemaVersion: "rcap-source-acquisition-batch-result/v1",
  verdict,
  verdictVocabulary: ["COMPLETE", "PARTIAL", "REFUSED"],
  verdictBasis: {
    COMPLETE: "every planned URL produced a receipt carrying a SHA-256, and no expected hash disagreed",
    PARTIAL: "some planned URLs produced a receipt and some did not; the failures are named below",
    REFUSED: "the manifest did not validate, nothing was planned, or nothing was acquired"
  }[verdict],
  planJobResult: planResult,
  acquireJobResult: acquireResult,
  counts: {
    planned,
    acquired: acquired.length,
    failed: failed.length,
    unreadableArtifacts: unreadable.length,
    expectedHashMismatches: hashMismatches.length
  },
  acquired: acquired.map((r) => ({
    jurisdiction: r.jurisdiction ?? null, formNumber: r.formNumber ?? null,
    officialUrl: r.officialUrl ?? r.url ?? null, sha256: r.sha256,
    byteLength: r.byteLength ?? null, mediaTypeObserved: r.mediaTypeObserved ?? null,
    pageCount: r.pageCount ?? null, technology: r.technology ?? null,
    bodyCommitted: false, promotedToCorpus: false, custodyClass: "RECEIPT_AND_ARTIFACT_ONLY_BODY_NOT_COMMITTED"
  })),
  failed, unreadable, hashMismatches,
  bodiesCommitted: 0,
  commercialRoutesOpened: 0,
  productionTouched: false,
  grantsNothing: "An acquired source is bytes with a receipt. It is not promoted custody, it builds no packet, and it opens no commercial route. A human promotes it in a reviewed commit or it stays outside the repository."
};

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(result, null, 2)}\n`);
console.log(`${verdict}: ${acquired.length}/${planned} acquired, ${failed.length} failed, ${hashMismatches.length} hash mismatch(es).`);
for (const f of failed.slice(0, 20)) console.log(`  FAILED ${f.jurisdiction ?? "??"} ${f.formNumber ?? f.artifact}: ${f.why}`);
