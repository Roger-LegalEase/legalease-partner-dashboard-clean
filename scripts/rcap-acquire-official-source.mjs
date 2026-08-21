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
//
// A landing-page leg gets a second hop. Fetching the issuing body's page and
// listing the documents it links was never the point; the point is the form,
// and until now a landing-page leg ended with an HTML file and no source. The
// resolver beside this script decides which linked document is this form, and
// refuses when it cannot tell. Both hops are recorded, so a reviewer can see
// the page the form was resolved FROM as well as the bytes that arrived.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  resolveFormBinaryFromLandingPage,
  RESOLUTION_DOES_NOT_ESTABLISH
} from "./rcap-source-acquisition/landing-page-resolution.mjs";
import { OFFICIAL_HOSTS_BY_JURISDICTION } from "./rcap-source-acquisition/official-hosts.mjs";

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

const isAllowlistedHost = (candidateHost) =>
  ALLOWED_HOST_SUFFIXES.some((suffix) => candidateHost === suffix.replace(/^\./, "") || candidateHost.endsWith(suffix));

/**
 * One gated GET, described from the response rather than from the request.
 *
 * Returns a refusal instead of throwing, so the caller decides whether a
 * refusal ends the run. It ends the run on the first hop, where there is
 * nothing yet to record; on the second hop the first hop's evidence still has
 * to be written, and exiting would throw it away.
 */
async function fetchOfficial(target) {
  let parsed;
  try { parsed = new URL(target); } catch { return { refusal: `${target} is not a URL` }; }
  if (parsed.protocol !== "https:") return { refusal: `${parsed.protocol} is not https` };
  const requestedHost = parsed.hostname.toLowerCase();
  if (REFUSED_HOSTS.has(requestedHost)) return { refusal: `${requestedHost} is a commercial form site, not the issuing body` };
  if (!isAllowlistedHost(requestedHost)) {
    return { refusal: `${requestedHost} is not an allowlisted official government host; extend ALLOWED_HOST_SUFFIXES in a reviewed commit if it is one` };
  }

  let response;
  try {
    response = await fetch(parsed, {
      redirect: "follow",
      headers: { "user-agent": "LegalEase RCAP official-source acquisition" }
    });
  } catch (error) {
    return { refusal: `the request to ${parsed.href} did not complete: ${error?.message ?? error}` };
  }

  const resolvedUrl = response.url;
  const resolvedHost = new URL(resolvedUrl).hostname.toLowerCase();
  // A redirect off the allowlist is the interesting case: it means the publisher
  // moved the form somewhere this acquisition is not entitled to trust.
  if (!isAllowlistedHost(resolvedHost)) {
    return { refusal: `the request redirected to ${resolvedHost}, which is not an allowlisted official host` };
  }
  if (!response.ok) return { refusal: `${resolvedUrl} answered HTTP ${response.status}` };

  const body = Buffer.from(await response.arrayBuffer());
  if (body.length === 0) return { refusal: "the response body is empty" };

  // Read from the bytes, not the headers: a server that mislabels a PDF as
  // text/html is common, and an HTML error page served with a 200 is the failure
  // this catches.
  const asLatin1 = body.toString("latin1");
  const isPdf = body.subarray(0, 5).toString("latin1") === "%PDF-";
  const declared = response.headers.get("content-length");
  return {
    requestedUrl: parsed.href,
    finalUrl: resolvedUrl,
    finalHost: resolvedHost,
    httpStatus: response.status,
    contentType: response.headers.get("content-type") ?? null,
    declaredLength: declared ? Number(declared) : null,
    bytes: body,
    text: asLatin1,
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
    looksLikePdf: isPdf,
    pageCount: isPdf ? (asLatin1.match(/\/Type\s*\/Page[^s]/g) ?? []).length || null : null,
    structuralClass: !isPdf ? "not_a_pdf"
      : /\/XFA[\s/[]/.test(asLatin1) ? "xfa"
        : /\/AcroForm\b/.test(asLatin1) ? "acroform"
          : "flat_pdf"
  };
}

const retrievedAt = new Date().toISOString();
const firstHop = await fetchOfficial(url.href);
if (firstHop.refusal) fail(firstHop.refusal);

// A landing page is fetched so the binary behind it can be resolved. Every
// document it links is recorded whatever happens next, because a refusal that a
// person has to settle is only useful if it shows what was refused.
const linkedDocuments = firstHop.looksLikePdf ? [] : [...new Set(
  [...firstHop.text.matchAll(/href\s*=\s*["']([^"']+\.(?:pdf|docx?|rtf)(?:\?[^"']*)?)["']/gi)]
    .map((m) => { try { return new URL(m[1], firstHop.finalUrl).href; } catch { return null; } })
    .filter(Boolean)
)].sort();

// ---- the second hop ---------------------------------------------------------
// Only for a leg that asked for a landing page and got back something that is
// not a PDF. A landing-page URL that turns out to serve the form itself —
// Vermont publishes forms as /media/<id>, which redirects straight to the PDF —
// is already finished, and re-resolving it would replace a confirmed source
// with a choice nobody needed to make.
let resolution = null;
let secondHop = null;
if (URL_KIND === "official_landing_page" && !firstHop.looksLikePdf) {
  resolution = resolveFormBinaryFromLandingPage({
    html: firstHop.text,
    landingPageUrl: firstHop.finalUrl,
    formNumber,
    officialHosts: OFFICIAL_HOSTS_BY_JURISDICTION[jurisdiction] ?? []
  });
  if (resolution.verdict === "resolved") {
    secondHop = await fetchOfficial(resolution.resolvedUrl);
    if (!secondHop.refusal && !secondHop.looksLikePdf) {
      secondHop = { refusal: `${resolution.resolvedUrl} did not answer with a PDF; a page that links a page resolves nothing` };
    }
  }
}

// The source is whichever hop produced the form: hop 1 when the URL was already
// the binary, hop 2 when the page had to be resolved. When resolution was
// attempted and refused, hop 1's HTML is still written — it is the evidence of
// what the page offered — but it is not a source, and the receipt says so.
const source = secondHop && !secondHop.refusal ? secondHop : firstHop;
const resolvedFromLandingPage = Boolean(secondHop) && !secondHop.refusal;
const { finalUrl, finalHost, contentType, declaredLength, bytes, sha256, looksLikePdf, pageCount, structuralClass } = source;
const httpStatus = source.httpStatus;

fs.mkdirSync(OUT_DIR, { recursive: true });
const slug = receiptSlug();
const binaryName = `${slug}${looksLikePdf ? ".pdf" : ".bin"}`;
fs.writeFileSync(path.join(OUT_DIR, binaryName), bytes);

// A landing-page leg that could not be resolved did not acquire a source. It
// acquired a page. Calling that "acquired" is how a register ends up believing
// it holds a form it has never seen, so the outcome distinguishes them.
const outcome = looksLikePdf
  ? "acquired"
  : URL_KIND === "official_landing_page"
    ? "landing_page_unresolved"
    : "acquired_but_not_a_pdf";

const receipt = {
  schemaVersion: "rcap-official-source-receipt/v2",
  ...coverage(),
  acquiredBy: ".github/workflows/rcap-official-source-acquisition.yml",
  outcome,
  jurisdiction,
  formNumber,
  assetId: ASSET_ID,
  urlKind: URL_KIND,
  requestedUrl: rawUrl,
  finalResolvedUrl: finalUrl,
  redirected: finalUrl !== rawUrl,
  publisherHost: finalHost,
  httpStatus,
  contentType,
  declaredContentLength: declaredLength ?? null,
  observedByteLength: bytes.length,
  byteLengthMatchesHeader: declaredLength != null ? declaredLength === bytes.length : null,
  sha256,
  retrievedAt,
  looksLikePdf,
  observedPageCount: pageCount,
  observedStructuralClass: structuralClass,
  linkedDocumentCandidates: linkedDocuments,
  binaryResolvedFromLandingPage: resolvedFromLandingPage,
  // Both hops, always. The page a form was resolved from is part of the form's
  // provenance: without it, a reviewer asked to confirm the resolution has
  // nothing to confirm it against.
  landingPage: resolution
    ? {
        url: firstHop.finalUrl,
        httpStatus: firstHop.httpStatus,
        contentType: firstHop.contentType,
        sha256: firstHop.sha256,
        byteLength: firstHop.bytes.length,
        resolution: {
          verdict: resolution.verdict,
          reason: resolution.reason,
          resolvedUrl: resolution.resolvedUrl,
          matchTier: resolution.resolvedTier ?? null,
          candidates: resolution.candidates
        },
        secondHopRefusal: secondHop?.refusal ?? null,
        whatResolutionDoesNotEstablish: RESOLUTION_DOES_NOT_ESTABLISH
      }
    : null,
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

// The receipt is also printed here, in full, between markers.
//
// Three transports carry an acquisition out of a workflow run, and they do not
// have the same reach. The artifact is the primary copy and is served from
// productionresultssa*.blob.core.windows.net, which a restricted session's
// egress proxy refuses with 403 CONNECT. The job summary is written above and
// has the same problem. The job LOG is the one that survives, because it comes
// back through the GitHub API itself. So the receipt goes to stdout too: it
// costs a few hundred bytes and it is the difference between an acquisition
// anyone can verify and one that is stranded behind a proxy rule.
console.log(`--- RCAP_RECEIPT_BEGIN ${slug} ---`);
console.log(JSON.stringify(receipt));
console.log(`--- RCAP_RECEIPT_END ${slug} ---`);

console.log(`${outcome === "acquired" ? "OK acquired" : `INCOMPLETE ${outcome} —`} ${jurisdiction} ${formNumber}`);
if (resolution) {
  console.log(`  landing page  ${firstHop.finalUrl}`);
  console.log(`  resolution    ${resolution.verdict} — ${resolution.reason}`);
  for (const candidate of resolution.candidates) {
    console.log(`    ${candidate.tier === null ? "refused" : `tier ${candidate.tier}`}  ${candidate.url}${candidate.refusedBecause ? `  (${candidate.refusedBecause})` : ""}`);
  }
  if (secondHop?.refusal) console.log(`  second hop    refused: ${secondHop.refusal}`);
}
console.log(`  final URL     ${finalUrl}`);
console.log(`  status        ${httpStatus}  ${contentType ?? "(no content-type)"}`);
console.log(`  bytes         ${bytes.length}`);
console.log(`  sha256        ${sha256}`);
console.log(`  structure     ${structuralClass}${pageCount ? `, ~${pageCount} page objects` : ""}`);
if (expectedSha256) console.log(`  expected hash ${expectedSha256 === sha256 ? "MATCHES" : "DOES NOT MATCH"}`);
