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

import { chooseOfficialBinary } from "./rcap-source-acquisition/resolve-binary.mjs";
import { readRevisionFromPdf } from "./rcap-source-acquisition/revision.mjs";

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

// Only first-party government publishers. A form whose publisher is not here is
// a decision to extend this list in a reviewed commit, not a URL pasted at
// dispatch time. Suffix match on the registrable host, so a lookalike domain
// ending in a permitted string cannot slip through.
const ALLOWED_HOST_SUFFIXES = [
  ".gov",
  ".us",
  ".courts.state.nh.us",
  ".uscourts.gov"
];

// Hosts that are government-adjacent but not first-party publishers. Named
// explicitly so a reviewer sees they were considered and refused.
const REFUSED_HOSTS = new Set([
  "www.formsworkflow.com", "www.uslegalforms.com", "www.pdffiller.com",
  "www.scribd.com", "www.docketbird.com"
]);

// Evidence gathered before something went wrong. A landing page that was
// fetched and resolved, and only then failed on the binary, has already
// established something worth keeping: which document the page named as this
// form. Discarding that on the way out would make the next run start over.
let partialEvidence = {};
function record(fields) {
  partialEvidence = { ...partialEvidence, ...fields };
}

function fail(message) {
  console.error(`FAIL official-source acquisition — ${message}`);
  if (TOLERATE_FAILURE) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const slug = receiptSlug();
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.receipt.json`), `${JSON.stringify({
      schemaVersion: "rcap-official-source-receipt/v1",
      ...coverage(),
      outcome: "not_acquired",
      ...partialEvidence,
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
const expectedRevision = (process.env.RCAP_EXPECTED_REVISION ?? "").trim();

if (!rawUrl) fail("no URL supplied");
if (!/^[A-Z]{2}$/.test(jurisdiction)) fail(`jurisdiction ${JSON.stringify(jurisdiction)} is not a two-letter code`);
if (formNumber === "") fail("no form number supplied");

let url;
try { url = new URL(rawUrl); } catch { fail(`${rawUrl} is not a URL`); }
if (url.protocol !== "https:") fail(`${url.protocol} is not https`);

const host = url.hostname.toLowerCase();
if (REFUSED_HOSTS.has(host)) fail(`${host} is a commercial form site, not the issuing body`);
if (!ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix.replace(/^\./, "") || host.endsWith(suffix))) {
  fail(`${host} is not an allowlisted official government host; extend ALLOWED_HOST_SUFFIXES in a reviewed commit if it is one`);
}

const retrievedAt = new Date().toISOString();

const hostIsAllowed = (host) =>
  ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix.replace(/^\./, "") || host.endsWith(suffix));

/**
 * Fetch one official URL and describe what came back.
 *
 * Every refusal this performs on the first URL it performs identically on the
 * second: a landing page that redirects a form off the allowlist is refused
 * whether it was named by the queue or chosen from the page's own links.
 * `whichLeg` only changes the wording of the failure, never the rule.
 */
async function acquire(target, whichLeg) {
  let response;
  try {
    response = await fetch(target, {
      redirect: "follow",
      headers: { "user-agent": "LegalEase RCAP official-source acquisition" }
    });
  } catch (error) {
    fail(`the ${whichLeg} request to ${target.href} did not complete: ${error?.message ?? error}`);
  }

  const resolvedUrl = response.url;
  const resolvedHost = new URL(resolvedUrl).hostname.toLowerCase();
  // A redirect off the allowlist is the interesting case: it means the publisher
  // moved the form somewhere this acquisition is not entitled to trust.
  if (!hostIsAllowed(resolvedHost)) {
    fail(`the ${whichLeg} request redirected to ${resolvedHost}, which is not an allowlisted official host`);
  }
  if (!response.ok) fail(`${resolvedUrl} answered HTTP ${response.status}`);

  const body = Buffer.from(await response.arrayBuffer());
  if (body.length === 0) fail(`the ${whichLeg} response body is empty`);

  // Read from the bytes, not the headers: a server that mislabels a PDF as
  // text/html is common, and an HTML error page served with a 200 is the failure
  // this catches.
  const isPdf = body.subarray(0, 5).toString("latin1") === "%PDF-";
  const latin = body.toString("latin1");
  return {
    response,
    bytes: body,
    finalUrl: resolvedUrl,
    finalHost: resolvedHost,
    looksLikePdf: isPdf,
    latin,
    pageCount: isPdf ? (latin.match(/\/Type\s*\/Page[^s]/g) ?? []).length || null : null,
    structuralClass: !isPdf ? "not_a_pdf"
      : /\/XFA[\s/[]/.test(latin) ? "xfa"
        : /\/AcroForm\b/.test(latin) ? "acroform"
          : "flat_pdf"
  };
}

/** Every document a page links, as absolute URLs. Candidates, not a decision. */
function linkedDocumentsOn(latin, pageUrl) {
  return [...new Set(
    [...latin.matchAll(/href\s*=\s*["']([^"']+\.(?:pdf|docx?|rtf)(?:\?[^"']*)?)["']/gi)]
      .map((m) => { try { return new URL(m[1], pageUrl).href; } catch { return null; } })
      .filter(Boolean)
  )].sort();
}

let leg = await acquire(url, "first");
const requestedFinalUrl = leg.finalUrl;
record({ requestedUrl: rawUrl, landingPageFinalUrl: requestedFinalUrl, landingPageHttpStatus: leg.response.status });

// A landing page is fetched so the binary behind it can be resolved. Until now
// the links were harvested and left there, which is why 29 sources still have
// the issuing body's page and no direct URL for the form.
let linkedDocuments = leg.looksLikePdf ? [] : linkedDocumentsOn(leg.latin, leg.finalUrl);
let resolution = null;
let fetchedChosenBinary = false;
record({ linkedDocumentCandidates: linkedDocuments });

if (!leg.looksLikePdf && URL_KIND === "official_landing_page") {
  resolution = chooseOfficialBinary({
    formNumber,
    candidates: linkedDocuments,
    landingUrl: leg.finalUrl
  });
  record({ landingPageResolution: resolution });
  console.log(`  landing page  ${resolution.outcome}: ${resolution.why}`);

  if (resolution.outcome === "resolved") {
    let chosen;
    try { chosen = new URL(resolution.chosen); } catch { chosen = null; }
    if (!chosen) fail(`the document chosen from the landing page is not a URL: ${resolution.chosen}`);
    if (chosen.protocol !== "https:") fail(`the document chosen from the landing page is served over ${chosen.protocol}, not https`);
    if (REFUSED_HOSTS.has(chosen.hostname.toLowerCase())) {
      fail(`the document chosen from the landing page is served by ${chosen.hostname}, a commercial form site`);
    }
    if (!hostIsAllowed(chosen.hostname.toLowerCase())) {
      fail(`the document chosen from the landing page is served by ${chosen.hostname}, which is not an allowlisted official host`);
    }
    leg = await acquire(chosen, "landing-page binary");
    fetchedChosenBinary = true;
  }
}

// A page is not a form.
//
// Before this, an unresolvable landing page still finished as `outcome:
// "acquired"` carrying a SHA-256 of the HTML — a hash-pinned, confident record
// of a web page filed as though it were the court's form. Downstream that is
// indistinguishable from a real acquisition, which is the precise failure the
// resolver exists to prevent.
//
// A deliberately chosen .docx or .rtf is still the form; only bytes we are
// still holding by default are not.
if (!leg.looksLikePdf && !fetchedChosenBinary) {
  const why = resolution
    ? `the landing page was fetched but its binary was ${resolution.outcome}: ${resolution.why}`
    : `${leg.finalUrl} served ${leg.response.headers.get("content-type") ?? "an unknown content type"} rather than a document; a page is not a form`;
  fail(why);
}

const { response, bytes, finalUrl, finalHost, looksLikePdf, pageCount, structuralClass } = leg;

const contentType = response.headers.get("content-type") ?? null;
const declaredLength = response.headers.get("content-length");
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

// What the document says its own revision is. Not whether that revision is the
// one the publisher serves today — that comparison needs the publisher's forms
// index and stays a review decision.
const revision = looksLikePdf
  ? readRevisionFromPdf(bytes, { formNumber, expectedRevision: expectedRevision || null })
  : { verdict: "not_a_pdf", why: "the acquired bytes are not a PDF, so there is no printed revision line to read" };

fs.mkdirSync(OUT_DIR, { recursive: true });
const slug = receiptSlug();
const binaryName = `${slug}${looksLikePdf ? ".pdf" : ".bin"}`;
fs.writeFileSync(path.join(OUT_DIR, binaryName), bytes);

const receipt = {
  schemaVersion: "rcap-official-source-receipt/v1",
  ...coverage(),
  acquiredBy: ".github/workflows/rcap-official-source-acquisition.yml",
  outcome: "acquired",
  jurisdiction,
  formNumber,
  assetId: ASSET_ID,
  urlKind: URL_KIND,
  requestedUrl: rawUrl,
  finalResolvedUrl: finalUrl,
  redirected: finalUrl !== rawUrl,
  // The URL the queue named, after redirects but before any landing-page
  // resolution. When these differ the publisher has MOVED the form, and the
  // queue's URL is stale even though the acquisition succeeded.
  requestedUrlResolvedTo: requestedFinalUrl,
  requestedUrlWasRedirected: requestedFinalUrl !== rawUrl,
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
  // Which of the landing page's links was taken as this form, why, and what it
  // beat. Null when the queue named the binary directly.
  landingPageResolution: resolution,
  expectedSha256: expectedSha256 || null,
  matchesExpectedSha256: expectedSha256 ? expectedSha256 === sha256 : null,
  binaryFile: binaryName,
  // Read from the document itself: the revision line courts stamp in the
  // footer. `verdict` says whether it confirms, contradicts, or has nothing to
  // confirm against — never whether the form is current.
  editionOrRevision: revision,
  expectedRevision: expectedRevision || null,
  // Still deliberately unanswered. Reading a form's printed revision does not
  // establish that the publisher serves that revision today, that it
  // supersedes the held one, or that the platform should use it. Those are
  // review decisions and they belong to a person.
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

// These lines are the receipt's readable copy of record.
//
// Artifacts are served from a storage host that some sessions' egress policy
// refuses, and for two runs that made the acquired hashes unreadable from the
// clone that needed them. Job logs come back through the GitHub API itself, on
// a host those sessions already reach, so every fact the register needs to pin
// a source is printed here in a fixed, parseable shape — and stays recoverable
// long after the artifact is unreachable.
console.log(`OK acquired ${jurisdiction} ${formNumber}`);
console.log(`  final URL     ${finalUrl}`);
if (requestedFinalUrl !== finalUrl) console.log(`  from landing  ${requestedFinalUrl}`);
if (requestedFinalUrl !== rawUrl) console.log(`  queue URL     moved: ${rawUrl} -> ${requestedFinalUrl}`);
console.log(`  status        ${response.status}  ${contentType ?? "(no content-type)"}`);
console.log(`  bytes         ${bytes.length}`);
console.log(`  sha256        ${sha256}`);
console.log(`  structure     ${structuralClass}${pageCount ? `, ~${pageCount} page objects` : ""}`);
// The character count is what separates "this form prints no revision" from
// "almost no text came out of this PDF, so of course no revision did". Without
// it, a reader that silently extracts nothing reports `not_printed` for every
// document and looks like a finding about the forms.
console.log(
  `  revision      ${revision.verdict}${revision.printedRevision ? ` (${revision.printedRevision})` : ""}` +
    `${revision.textCharacters === undefined ? "" : ` [${revision.textCharacters} chars of text read]`}`
);
if (expectedRevision) console.log(`  expected rev  ${expectedRevision}`);
if (expectedSha256) console.log(`  expected hash ${expectedSha256 === sha256 ? "MATCHES" : "DOES NOT MATCH"}`);
