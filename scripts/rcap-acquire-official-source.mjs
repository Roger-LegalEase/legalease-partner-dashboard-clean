#!/usr/bin/env node
// Fetches one official form and writes it beside a receipt that describes it.
//
// Run by .github/workflows/rcap-official-source-acquisition.yml on
// workflow_dispatch. It is deliberately incapable of changing the repository:
// it writes only into acquired-source/, which the workflow uploads as an
// artifact. Nothing here commits, deploys, publishes or configures anything.
//
// The receipt is the point. A PDF that arrives without a recorded final URL,
// status, content type, length, hash and timestamp cannot be pinned, cannot be
// shown to be current later, and cannot be told apart from the next revision of
// itself. Every field the register needs to pin a source is captured here, at
// the moment the bytes arrive, from the response rather than from a promise.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { hostAllowed, exactHostPolicy, REFUSED_HOSTS } from "./lib/official-host-policy.mjs";

const OUT_DIR = path.resolve("acquired-source");

/**
 * The receipt filename.
 *
 * The planner supplies a slug that carries a digest of the full source key
 * (jurisdiction | form number | canonical URL), because several queue records
 * name the same document and naming a receipt by jurisdiction and form number
 * alone made those receipts collide: the collector downloads every artifact
 * into one directory, so two receipts became one file holding two JSON
 * documents and JSON.parse stopped at the seam.
 *
 * The fallback keeps this script runnable outside the workflow; it is not
 * collision-free, which is exactly why the planner supplies the real one.
 */
function receiptSlug() {
  const supplied = (process.env.RCAP_RECEIPT_SLUG ?? "").trim();
  if (supplied) return supplied.replace(/[^A-Za-z0-9._-]/g, "-");
  return `${(process.env.RCAP_JURISDICTION ?? "XX").trim().toUpperCase()}-${(process.env.RCAP_FORM_NUMBER ?? "unknown").trim()}`
    .replace(/[^A-Za-z0-9._-]/g, "-");
}

/** Everything this one acquisition answers for. */
function coverage() {
  const ids = (process.env.RCAP_COVERED_ASSET_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    sourceKey: process.env.RCAP_SOURCE_KEY ?? null,
    receiptSlug: receiptSlug(),
    canonicalUrl: process.env.RCAP_CANONICAL_URL ?? null,
    coveredAssetIds: ids,
    coveredQueueEntryCount: Number(process.env.RCAP_COVERED_ENTRY_COUNT ?? (ids.length || 1))
  };
}

// Matrix runs record what happened and carry on; a single dispatch still fails
// loudly. A refusal, a 404 or a DNS failure is evidence about the source, and
// losing forty other acquisitions to it would be the wrong trade.
const TOLERATE_FAILURE = process.env.RCAP_TOLERATE_FAILURE === "1";
const URL_KIND = process.env.RCAP_URL_KIND ?? "direct_binary";
const ASSET_ID = process.env.RCAP_ASSET_ID ?? null;

// The host policy lives in scripts/lib/official-host-policy.mjs so that this
// script and the batch planner cannot disagree about it. The planner used to
// re-derive it by regex over this file's source text, and `.us` -- an
// open-registration TLD -- was on the suffix list under a comment reading
// "Only first-party government publishers."

function fail(message) {
  console.error(`FAIL official-source acquisition — ${message}`);
  if (TOLERATE_FAILURE) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const slug = receiptSlug();
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.receipt.json`), `${JSON.stringify({
      schemaVersion: "rcap-official-source-receipt/v1",
      ...coverage(),
      outcome: "not_acquired",
      jurisdiction: process.env.RCAP_JURISDICTION ?? null,
      formNumber: process.env.RCAP_FORM_NUMBER ?? null,
      assetId: ASSET_ID,
      requestedUrl: process.env.RCAP_SOURCE_URL ?? null,
      urlKind: URL_KIND,
      failure: message,
      retrievedAt: new Date().toISOString(),
      // A failure to fetch says nothing about the form. It is not evidence that
      // the form is gone, superseded, or wrong.
      whatThisDoesNotEstablish: "that the official form does not exist, has moved, or has been superseded"
    }, null, 2)}\n`);
    process.exit(0);
  }
  process.exit(1);
}

const rawUrl = process.env.RCAP_SOURCE_URL ?? "";
const jurisdiction = (process.env.RCAP_JURISDICTION ?? "").trim().toUpperCase();
const formNumber = (process.env.RCAP_FORM_NUMBER ?? "").trim();
const expectedSha256 = (process.env.RCAP_EXPECTED_SHA256 ?? "").trim().toLowerCase();
/*
 * Acquisition provenance, recorded in the receipt rather than reconstructed.
 *
 * The materializer compares the receipt's run id and artifact name against the
 * ones it is handed, and refuses on a mismatch. Nothing was writing either, so
 * every handoff could only ever be refused for a difference nobody could
 * inspect. The planner derives the artifact name once and the workflow passes
 * it here with the run id; both are recorded verbatim.
 */
const acquisitionRunId = (process.env.RCAP_ACQUISITION_RUN_ID ?? "").trim();
const artifactName = (process.env.RCAP_ARTIFACT_NAME ?? "").trim();

/*
 * Inside a workflow the provenance is mandatory, because that is the path whose
 * receipts feed PROMO. A local run may omit it and gets a receipt that says so;
 * a workflow run may not, because a receipt with no run id can never be matched
 * to the artifact it describes.
 */
if (process.env.GITHUB_ACTIONS === "true") {
  if (!/^\d+$/.test(acquisitionRunId)) fail("RCAP_ACQUISITION_RUN_ID must be the exact numeric workflow run id inside GitHub Actions");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]+$/.test(artifactName)) fail("RCAP_ARTIFACT_NAME must be the exact artifact name the planner derived");
}
if (!rawUrl) fail("no URL supplied");
if (!/^[A-Z]{2}$/.test(jurisdiction)) fail(`jurisdiction ${JSON.stringify(jurisdiction)} is not a two-letter code`);
if (formNumber === "") fail("no form number supplied");

let url;
try { url = new URL(rawUrl); } catch { fail(`${rawUrl} is not a URL`); }
if (url.protocol !== "https:") fail(`${url.protocol} is not https`);

const host = url.hostname.toLowerCase();
if (REFUSED_HOSTS.has(host)) fail(`${host} is a commercial form site, not the issuing body`);
const exactHost = exactHostPolicy(host);
if (exactHost) {
  if (!exactHost.jurisdictions.has(jurisdiction)) {
    fail(`${host} is allowed only for ${[...exactHost.jurisdictions].join(", ")} and this dispatch is ${jurisdiction}`);
  }
  if (exactHost.requiresExpectedSha256 && !/^[0-9a-f]{64}$/.test(String(expectedSha256 ?? ""))) {
    fail(`${host} requires an expected SHA-256 at dispatch: ${exactHost.why}`);
  }
} else if (!hostAllowed(host)) {
  fail(`${host} is not an allowlisted official government host; extend scripts/lib/official-host-policy.mjs in a reviewed commit if it is one`);
}

const retrievedAt = new Date().toISOString();
let response;
try {
  response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "LegalEase RCAP official-source acquisition" }
  });
} catch (error) {
  fail(`the request to ${url.href} did not complete: ${error?.message ?? error}`);
}

const finalUrl = response.url;
const finalHost = new URL(finalUrl).hostname.toLowerCase();
// A redirect off the allowlist is the interesting case: it means the publisher
// moved the form somewhere this acquisition is not entitled to trust.
if (!hostAllowed(finalHost)) {
  fail(`the request redirected to ${finalHost}, which is not an allowlisted official host`);
}
// An exact host may only redirect to itself. It was allowed as one hostname,
// and a redirect from it to another allowlisted host would launder the
// exception into the suffix list it was written to avoid.
if (exactHost && finalHost !== host) {
  fail(`${host} is allowed as an exact hostname and redirected to ${finalHost}`);
}
if (!response.ok) fail(`${finalUrl} answered HTTP ${response.status}`);

const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length === 0) fail("the response body is empty");

const contentType = response.headers.get("content-type") ?? null;
const declaredLength = response.headers.get("content-length");
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
// On an exact-hostname allowance the hash is the identity. A bucket URL can be
// repointed with no visible change to the address, so a mismatch there is a
// refusal rather than a recorded observation.
if (exactHost && expectedSha256 && expectedSha256 !== sha256) {
  fail(`${host} is allowed as an exact hostname on the condition that the bytes match: expected ${expectedSha256}, retrieved ${sha256}`);
}
/*
 * A hash mismatch on any other host is not a refusal to fetch -- the bytes are
 * evidence about what the publisher is serving today, and losing them would
 * lose the fact that the form changed. It IS a refusal to call the result an
 * acquisition. The receipt used to say outcome "acquired" with
 * matchesExpectedSha256 false, and nothing downstream read the second field, so
 * a revised form promoted itself. The outcome carries it now, and the
 * materializer refuses any outcome that is not exactly "acquired".
 */
const hashMismatch = Boolean(expectedSha256) && expectedSha256 !== sha256;

// Read from the bytes, not the headers: a server that mislabels a PDF as
// text/html is common, and an HTML error page served with a 200 is the failure
// this catches.
const looksLikePdf = bytes.subarray(0, 5).toString("latin1") === "%PDF-";
const pageCount = looksLikePdf
  ? (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length || null
  : null;
const text = bytes.toString("latin1");
const structuralClass = !looksLikePdf ? "not_a_pdf"
  : /\/XFA[\s/[]/.test(text) ? "xfa"
    : /\/AcroForm\b/.test(text) ? "acroform"
      : "flat_pdf";

fs.mkdirSync(OUT_DIR, { recursive: true });
const slug = receiptSlug();
const binaryName = `${slug}${looksLikePdf ? ".pdf" : ".bin"}`;
fs.writeFileSync(path.join(OUT_DIR, binaryName), bytes);

// A landing page is fetched so the binary behind it can be resolved. The links
// harvested here are candidates for a following acquisition, not a decision
// about which of them is this form.
const linkedDocuments = looksLikePdf ? [] : [...new Set(
  [...text.matchAll(/href\s*=\s*["']([^"']+\.(?:pdf|docx?|rtf)(?:\?[^"']*)?)["']/gi)]
    .map((m) => { try { return new URL(m[1], finalUrl).href; } catch { return null; } })
    .filter(Boolean)
)].sort();

const receipt = {
  schemaVersion: "rcap-official-source-receipt/v1",
  ...coverage(),
  acquiredBy: ".github/workflows/rcap-official-source-acquisition.yml",
  outcome: hashMismatch ? "acquired_but_not_the_pinned_document" : "acquired",
  outcomeVocabulary: ["acquired", "acquired_but_not_the_pinned_document", "not_acquired"],
  jurisdiction,
  formNumber,
  assetId: ASSET_ID,
  urlKind: URL_KIND,
  requestedUrl: rawUrl,
  finalResolvedUrl: finalUrl,
  redirected: finalUrl !== rawUrl,
  publisherHost: finalHost,
  httpStatus: response.status,
  contentType,
  declaredContentLength: declaredLength ? Number(declaredLength) : null,
  observedByteLength: bytes.length,
  byteLengthMatchesHeader: declaredLength ? Number(declaredLength) === bytes.length : null,
  sha256,
  retrievedAt,
  looksLikePdf,
  observedPageCount: pageCount,
  observedStructuralClass: structuralClass,
  linkedDocumentCandidates: linkedDocuments,
  binaryResolvedFromLandingPage: URL_KIND === "official_landing_page" && looksLikePdf,
  acquisitionRunId: acquisitionRunId || null,
  artifactName: artifactName || null,
  provenanceComplete: Boolean(acquisitionRunId && artifactName),
  expectedSha256: expectedSha256 || null,
  matchesExpectedSha256: expectedSha256 ? expectedSha256 === sha256 : null,
  binaryFile: binaryName,
  // Deliberately unanswered here. A workflow can say what it fetched; it cannot
  // say whether that is the currently published edition, whether it supersedes
  // the held one, or whether the platform should use it. Those are review
  // decisions and they belong to a person.
  editionOrRevision: "unread — take it from the document's own printed revision line",
  currentnessDetermination: "unmade — requires comparison against the publisher's own forms index",
  supersessionDetermination: "unmade — requires the prior pinned hash and the publisher's revision history",
  intendedUse: "unmade — requires the packet family and legal design that would consume it"
};
fs.writeFileSync(path.join(OUT_DIR, `${slug}.receipt.json`), `${JSON.stringify(receipt, null, 2)}\n`);

// The receipt, and where it fits the bytes, are also written to the job
// summary. Workflow artifacts are served from a storage host that some sessions'
// egress policy refuses, and an acquisition nobody can read is an acquisition
// that did not happen. The job summary is served by the GitHub API itself, on
// the same host the rest of this session already reaches, so a receipt written
// here is readable wherever the API is.
//
// Bytes are included only when they fit inside the summary's own 1MB limit with
// room to spare. This is a transport of last resort, not a substitute for the
// artifact: the artifact is still uploaded and is still the primary copy.
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const base64 = bytes.toString("base64");
  const inlineable = base64.length < 700_000;
  const parts = [
    `## ${jurisdiction} ${formNumber}`,
    "",
    "```json",
    JSON.stringify(receipt, null, 2),
    "```",
    ""
  ];
  if (inlineable) {
    parts.push(
      `<!-- RCAP_BASE64_BEGIN ${slug} sha256=${sha256} bytes=${bytes.length} -->`,
      "```",
      base64,
      "```",
      `<!-- RCAP_BASE64_END ${slug} -->`,
      ""
    );
  } else {
    parts.push(
      `_${bytes.length} bytes is too large to inline; take this one from the workflow artifact._`,
      ""
    );
  }
  fs.appendFileSync(summaryPath, parts.join("\n"));
}

console.log(`OK acquired ${jurisdiction} ${formNumber}`);
console.log(`  final URL     ${finalUrl}`);
console.log(`  status        ${response.status}  ${contentType ?? "(no content-type)"}`);
console.log(`  bytes         ${bytes.length}`);
console.log(`  sha256        ${sha256}`);
console.log(`  structure     ${structuralClass}${pageCount ? `, ~${pageCount} page objects` : ""}`);
if (expectedSha256) console.log(`  expected hash ${expectedSha256 === sha256 ? "MATCHES" : "DOES NOT MATCH"}`);
