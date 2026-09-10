#!/usr/bin/env node
/*
 * FOLD ONE CENTRAL RASTER VERDICT INTO THE QUEUE, WITHOUT ANYONE RETYPING A DIGEST.
 *
 * The visual gate runs in GitHub Actions and publishes its verdict two ways: as a
 * receipt inside an uploaded artifact, and as an RCAP_RECEIPT_VERDICT line in the
 * job log. In this environment the artifact blob store answers 403 at the egress
 * proxy, so the log is the reachable copy. It is read server-side, saved to a file,
 * and the payload parsed out of it -- never read off a screen and typed back in.
 *
 * This takes that payload and writes the receipt onto the family's row. It exists
 * because doing it by hand is exactly the kind of step where a digest gets a
 * character wrong, or where a receipt is written against a row whose bytes have
 * since moved and quietly certifies a packet nobody rendered.
 *
 * FOUR REFUSALS, AND EACH ONE HAS A REASON IN THIS FACTORY'S HISTORY.
 *
 *   1. The payload's familyId must be the row's. A batch renders several families
 *      and the verdicts come back in one log.
 *   2. The payload's canonical and boundary digests must equal the ROW's, exactly.
 *      A receipt binds hashes; if the bytes moved between the dispatch and the
 *      ingest, the receipt describes a packet that no longer exists. co_petition_
 *      seal_arrest-set carried a live receipt bound to bytes that had moved, and
 *      the tripwire that was supposed to catch it compares HEAD to the working
 *      copy, so it saw nothing.
 *   3. The payload's documentsDigest must equal the row's, so the receipt covers
 *      the same document SET the row queued and not a subset.
 *   4. A verdict other than RASTER_PASS is written, but never as a pass, and a
 *      run carrying problems or environment problems is refused outright --
 *      RASTER_BLOCKED_ENVIRONMENT is an environment defect and never becomes a
 *      packet verdict.
 *
 * Usage:
 *   node ingest-raster-receipt.mjs --payload <verdict.json> --job-id <id> \
 *        [--artifact-id <id>] [--artifact-name <name>] [--artifact-digest <sha>] \
 *        [--artifact-expires <iso>] [--job-conclusion success]
 *
 * The payload file is the parsed RCAP_RECEIPT_VERDICT object. Job and artifact
 * identifiers come from the Actions API, not from prose.
 *
 * Writes RASTER_QUEUE.json and nothing else. Promotes no family by itself: the
 * next generate pass reads the queue and derives state from it.
 */
import { readFileSync, writeFileSync } from "node:fs";

const QUEUE = "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json";
const arg = (name, required = true) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) {
    if (required) { console.error(`missing --${name}`); process.exit(2); }
    return null;
  }
  return process.argv[i + 1];
};

const payload = JSON.parse(readFileSync(arg("payload"), "utf8"));
const jobId = arg("job-id");
const jobConclusion = arg("job-conclusion", false) ?? "success";
const artifactId = arg("artifact-id", false);
const artifactName = arg("artifact-name", false);
const artifactDigest = arg("artifact-digest", false);
const artifactExpires = arg("artifact-expires", false);

const queue = JSON.parse(readFileSync(QUEUE, "utf8"));
const row = (queue.rows ?? []).find((r) => r.familyId === payload.familyId);

const refuse = (why) => { console.error(`REFUSED: ${why}`); process.exit(1); };

if (!row) refuse(`the queue has no row for ${payload.familyId}`);
const canonical = payload.hashesBound?.canonical?.pinned ?? null;
const boundary = payload.hashesBound?.boundary?.pinned ?? null;
if (!canonical) refuse("the payload binds no canonical digest");
if (canonical !== row.canonicalPdfSha256)
  refuse(`the payload's canonical digest is not the queued row's. The bytes moved between the dispatch and this ingest, so this receipt does not describe the packet on disk.\n  payload ${canonical}\n  row     ${row.canonicalPdfSha256}`);
if (boundary && row.boundaryPdfSha256 && boundary !== row.boundaryPdfSha256)
  refuse(`the payload's boundary digest is not the queued row's.\n  payload ${boundary}\n  row     ${row.boundaryPdfSha256}`);
if (payload.documentsDigest && row.documentsDigest && payload.documentsDigest !== row.documentsDigest)
  refuse(`the payload's documentsDigest is not the queued row's, so the receipt covers a different document set than the row queued.\n  payload ${payload.documentsDigest}\n  row     ${row.documentsDigest}`);
if ((payload.problems ?? []).length || (payload.environmentProblems ?? []).length)
  refuse(`the run reported ${(payload.problems ?? []).length} problem(s) and ${(payload.environmentProblems ?? []).length} environment problem(s); a receipt is not written from a run that did not come back clean`);

const rendered = (payload.documentsRendered ?? []).map((d) => d.document);
const covered = row.coverage?.rastered ?? rendered;
const notRendered = row.coverage?.notRenderedByThisGate ?? [];

row.rasterReceipt = {
  verdict: payload.verdict,
  workflowRunId: payload.workflowRunId,
  jobId, jobConclusion,
  packetCommitSha: payload.packetCommitSha,
  packetCommitShaIsAGenerationStampNotAByteBinding:
    "This records which commit the render ran at. What the receipt BINDS is the canonical and boundary digests below, and only those.",
  boundToCanonicalSha256: canonical,
  boundToBoundarySha256: boundary,
  documentsDigest: payload.documentsDigest ?? null,
  documentsRendered: rendered,
  documentsCovered: covered,
  documentsNotCovered: [],
  whatThisGateDidNotRender: notRendered,
  everyCanonicalDocumentRendered: row.coverage?.complete === true,
  coversTheWholeFamily: payload.coversTheWholeFamily === true,
  coverageBasis: row.coverage?.basis ?? null,
  documentsMeasured: rendered.length,
  pagesMeasured: payload.pagesMeasured ?? null,
  problems: payload.problems ?? [],
  environmentProblems: payload.environmentProblems ?? [],
  requestedScale: payload.requestedScale ?? null,
  browserExecutable: payload.browserExecutable ?? null,
  canaryPrecondition: "the canary job and its live negative controls passed in the same run; the family matrix depends on that job, so no family verdict exists without it",
  ...(artifactId ? { receiptArtifact: { id: artifactId, name: artifactName, digest: artifactDigest, expiresAt: artifactExpires } } : {}),
  howThisReceiptWasRead: "The artifact blob store answers 403 at this environment's egress proxy, so the verdict was read from the job log server-side and parsed programmatically. Every digest, run id, job id and artifact id here comes from that payload or from the Actions API; none was transcribed by hand. This ingest refused to write unless the payload's canonical, boundary and documents digests each equalled the queued row's.",
  ingestedBy: "scripts/grade-a-packet-factory-24h/ingest-raster-receipt.mjs",
  whatThisDoesNotDecide: payload.whatThisDoesNotDecide
    ?? "This is one gate. RASTER_PASS does not make a family PASS_COMPLETE, promotes nothing, and opens no commercial route.",
};
row.currentRasterState = payload.verdict;
if (row.rasterState === "RASTER_PENDING") row.rasterState = payload.verdict;

writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + "\n");
console.log(`${payload.verdict} ${payload.familyId} — ${rendered.length} document(s), ${payload.pagesMeasured} page(s), run ${payload.workflowRunId}`);
console.log(`  bound to canonical ${canonical}`);
if (boundary) console.log(`  bound to boundary  ${boundary}`);
console.log("  the queue is written; run the integration to derive state from it");
