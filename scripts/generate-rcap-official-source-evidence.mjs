#!/usr/bin/env node
// Recovers what the official-source acquisition actually established, and
// reconciles it against the queue that asked for it.
//
//   node scripts/generate-rcap-official-source-evidence.mjs
//
// The acquisition ran. Fourteen legs reached the issuing bodies and hashed what
// came back. Then the evidence was unreadable: workflow artifacts are served
// from a storage host this session's egress policy refuses with a 403, so the
// run log recorded that the SHA-256, content type and edition of every acquired
// file "cannot be read" from here, and the work stalled on bytes that existed
// and nobody could see.
//
// That turned out to be false. The acquirer prints the final URL, status,
// content type, byte length and SHA-256 to stdout, and job logs come back
// through the GitHub API itself — the same host this session already reaches.
// Every fact the register needs to pin a source was recoverable, and the
// OBSERVATIONS table below is that recovery, transcribed from the job logs of
// run 32251630850, one entry per acquisition leg that was given a runner.
//
// The observations are recorded verbatim and never computed. What IS computed
// is the reconciliation against the committed queue: which queue URLs the
// publisher has moved, which pinned hashes the publisher no longer serves, and
// which sources answer for more than one asset. Those are derivations, so they
// are derived here rather than typed, and they follow the queue when it changes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE = path.join(rootDir, "data/rcap-all50/source-acquisition-queue.json");
const OUT = path.join(rootDir, "data/rcap-all50/official-source-acquisition-evidence.json");

const RUN = {
  runId: "32251630850",
  runUrl: "https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/32251630850",
  workflow: ".github/workflows/rcap-source-acquisition-branch.yml",
  headSha: "c2c30fa4a0dc2daece1cc5f15a210b94d0d05fe5",
  branch: "claude/rcap-problematic-pdf-full-remediation",
  ranAt: "2026-08-19T12:14:31Z"
};

/**
 * One entry per acquisition leg that was given a runner, transcribed from that
 * leg's job log.
 *
 * `jobId` is what makes each row checkable: the log is still there, and the
 * lines these came from are `  final URL`, `  status`, `  bytes`, `  sha256`
 * and `  structure` under `OK acquired`.
 *
 * The 30 legs that were never given a runner are not here. The account refused
 * to allocate runners partway through the matrix, and a leg that never ran
 * established nothing — listing it would turn an absence of evidence into
 * evidence of absence.
 */
const OBSERVATIONS = [
  {
    jurisdiction: "AK", formNumber: "TF-800", jobId: "96063906834", outcome: "acquired",
    finalResolvedUrl: "https://public.courts.alaska.gov/web/forms/docs/tf-800.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 130602,
    sha256: "94bab52533d74551f7a8ff8644a9671241b38075c7e05f10806d627dfb898cbd",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: "MATCHES"
  },
  {
    jurisdiction: "AK", formNumber: "TF-805", jobId: "96063906939", outcome: "acquired",
    finalResolvedUrl: "https://public.courts.alaska.gov/web/forms/docs/tf-805.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 93899,
    sha256: "96306d64eda397e25094f92c3d67a642372b82cba12f97c6666e5500136e8f54",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: "MATCHES"
  },
  {
    jurisdiction: "KY", formNumber: "AOC-334", jobId: "96063906811", outcome: "acquired",
    finalResolvedUrl: "https://www.kycourts.gov/Legal-Forms/Legal%20Forms/334.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 252268,
    sha256: "7eb2838037903de1769a0253d6ad9b092dd72f4aa363b323968c8c510fd55d3d",
    observedStructuralClass: "acroform", observedPageCount: 2, pinVerdictInLog: "MATCHES"
  },
  {
    jurisdiction: "KY", formNumber: "AOC-496.2", jobId: "96063906841", outcome: "not_acquired",
    requestedUrlInLog: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx",
    httpStatus: 404,
    failure: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx answered HTTP 404"
  },
  {
    jurisdiction: "KY", formNumber: "AOC-496.4", jobId: "96063906935", outcome: "not_acquired",
    requestedUrlInLog: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx",
    httpStatus: 404,
    failure: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx answered HTTP 404"
  },
  {
    jurisdiction: "NE", formNumber: "CC-6-12", jobId: "96063906813", outcome: "acquired",
    finalResolvedUrl: "https://nebraskajudicial.gov/sites/default/files/CC-6-12.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 1682731,
    sha256: "68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: "MATCHES"
  },
  {
    // The same document, fetched for a second asset that pins different bytes.
    jurisdiction: "NE", formNumber: "CC-6-12", jobId: "96063906846", outcome: "acquired",
    finalResolvedUrl: "https://nebraskajudicial.gov/sites/default/files/CC-6-12.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 1682731,
    sha256: "68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: "DOES NOT MATCH"
  },
  {
    jurisdiction: "NE", formNumber: "CC-6-15.1", jobId: "96063906993", outcome: "acquired",
    finalResolvedUrl: "https://nebraskajudicial.gov/sites/default/files/CC-6-15-1.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 2909936,
    sha256: "d1fb1340b1ef42bab9da89f9ed6bc8d669057158065bd6bfcb37e762777a6b79",
    observedStructuralClass: "acroform", observedPageCount: 1, pinVerdictInLog: "MATCHES"
  },
  {
    jurisdiction: "VA", formNumber: "CC-1201", jobId: "96063906932", outcome: "acquired",
    finalResolvedUrl: "https://www.vacourts.gov/static/forms/circuit/crim_sealing/cc1201.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 282919,
    sha256: "7b56d8e167f610739da1578ec96e8bc7925ae029141857e7350bd7482c8e7e78",
    observedStructuralClass: "acroform", observedPageCount: 8, pinVerdictInLog: "MATCHES"
  },
  {
    jurisdiction: "VA", formNumber: "CC-1473", jobId: "96063906835", outcome: "acquired",
    finalResolvedUrl: "https://www.vacourts.gov/static/forms/circuit/cc1473.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 120875,
    sha256: "6176c2f55bdb320682acecf0a79931bd5e496c4c93b5696645d4ef447fa67219",
    observedStructuralClass: "acroform", observedPageCount: 2, pinVerdictInLog: "MATCHES"
  },
  {
    jurisdiction: "WI", formNumber: "CR-266", jobId: "96063906815", outcome: "acquired",
    finalResolvedUrl: "https://www.wicourts.gov/formdisplay/CR-266.pdf?formNumber=CR-266&formType=Form&formatId=2&language=en",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 130733,
    sha256: "9f94674c0f931b66654d39ecfd074d897880f71523592bf83f2bd0dd34812412",
    observedStructuralClass: "flat_pdf", observedPageCount: 1, pinVerdictInLog: "MATCHES"
  },
  {
    jurisdiction: "WI", formNumber: "CR-267", jobId: "96063907012", outcome: "acquired",
    finalResolvedUrl: "https://www.wicourts.gov/formdisplay/CR-267.pdf?formNumber=CR-267&formType=Form&formatId=2&language=en",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 74520,
    sha256: "2c0ac53b03658dc9ae93ba90f527ba162d487f181fd4525d5856b483f17930bb",
    observedStructuralClass: "flat_pdf", observedPageCount: 1, pinVerdictInLog: "MATCHES"
  },
  {
    jurisdiction: "WI", formNumber: "DJ-LE-247", jobId: "96063906802", outcome: "acquired",
    finalResolvedUrl: "https://www.wisdoj.gov/Law%20Enforcement%20Services/Updated_DJ_LE_247_14-feb-17_0.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 130938,
    sha256: "ada016d389ef1f0b343432b187aec8c8c93bd7711c85d4ccce847f75572ae6f7",
    observedStructuralClass: "flat_pdf", observedPageCount: 2, pinVerdictInLog: "MATCHES"
  },
  {
    jurisdiction: "WI", formNumber: "DJ-LE-250B", jobId: "96063906901", outcome: "acquired",
    finalResolvedUrl: "https://www.wisdoj.gov/Law%20Enforcement%20Services/DJ_LE-250B_Draft_02232017_Fingerprint_Removal_Request.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 475556,
    sha256: "3c5d4806ff1061246ec06c93716cfa80ec3d61b9e21c5c79639114ab1e5454b6",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: "MATCHES"
  }
];

const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const queueEntries = [...queue.matrix, ...queue.probeMatrix];

const normalizeForm = (v) => String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");

/** The queue entries an observation answers for: same jurisdiction, same form. */
function queueEntriesFor(observation) {
  return queueEntries.filter(
    (e) => e.jurisdiction === observation.jurisdiction && normalizeForm(e.formNumber) === normalizeForm(observation.formNumber)
  );
}

const sources = OBSERVATIONS.map((observation) => {
  const related = queueEntriesFor(observation);
  const requestedUrls = [...new Set(related.map((e) => e.url))];
  const pins = [...new Set(related.map((e) => e.expectedSha256).filter(Boolean))];

  // The publisher moved the form: the URL the queue names is not the URL that
  // served the bytes. Only decidable when the queue names exactly one URL for
  // this form, and only for a leg that actually fetched something.
  const movedFrom =
    observation.outcome === "acquired" && requestedUrls.length === 1 && requestedUrls[0] !== observation.finalResolvedUrl
      ? requestedUrls[0]
      : null;

  // Which of this form's pinned hashes the publisher still serves, and which it
  // does not. A pin that no longer matches is not a fetch failure: it is an
  // asset pinned to bytes that are no longer published.
  const pinsStillServed = observation.outcome === "acquired" ? pins.filter((p) => p === observation.sha256) : [];
  const pinsNoLongerServed = observation.outcome === "acquired" ? pins.filter((p) => p !== observation.sha256) : [];

  // One classification per ASSET, not per leg. Two assets can pin different
  // bytes for one document, so a single fetch is an exact match for one of
  // them and drift for the other; a per-leg verdict would have to pick one.
  //
  // `current_replacement` is deliberately never reached here. Calling drift a
  // replacement asserts the new bytes are the current published edition, and
  // that needs the publisher's own forms index — which this run never consulted.
  // Drift is what was observed; replacement is a determination someone makes.
  const assetClassifications = related.map((entry) => {
    if (observation.outcome !== "acquired") {
      return { assetId: entry.assetId, classification: "fetch_failed", why: observation.failure };
    }
    if (entry.expectedSha256 === observation.sha256) {
      return {
        assetId: entry.assetId,
        classification: "exact_match",
        why: "the publisher still serves exactly the bytes this asset is pinned to"
      };
    }
    return {
      assetId: entry.assetId,
      classification: "source_drift",
      why: "the publisher serves different bytes from the ones this asset is pinned to",
      pinnedSha256: entry.expectedSha256,
      servedSha256: observation.sha256,
      promotingThisToCurrentReplacementRequires: "the publisher's own forms index, which this run did not consult"
    };
  });

  return {
    assetClassifications,
    ...observation,
    jobUrl: `${RUN.runUrl}/job/${observation.jobId}`,
    queueUrls: requestedUrls,
    coveredAssetIds: related.map((e) => e.assetId).filter(Boolean),
    queueEntriesForThisForm: related.length,
    pinnedHashesInQueue: pins,
    pinsStillServed,
    pinsNoLongerServed,
    publisherMovedTheFormFrom: movedFrom,
    // Read from the document itself. Nothing in this run read it: the acquirer
    // gained a revision reader after this run, so every acquired file here has
    // an exact hash and no confirmed edition.
    editionOrRevision: "unread — this run predates the revision reader; re-acquire to read it"
  };
});

const acquired = sources.filter((s) => s.outcome === "acquired");

// An asset covered by two legs of the same document is still one asset.
//
// Two legs that fetched the same URL should agree about it. If they ever do
// not — one served the pinned bytes and the other did not — that is the
// publisher changing the file mid-run, and collapsing it to whichever leg was
// seen first would hide exactly the fact worth knowing.
const observedPerAsset = new Map();
for (const source of sources) {
  for (const entry of source.assetClassifications) {
    if (!observedPerAsset.has(entry.assetId)) observedPerAsset.set(entry.assetId, new Set());
    observedPerAsset.get(entry.assetId).add(entry.classification);
  }
}
const classificationByAsset = new Map(
  [...observedPerAsset.entries()].map(([assetId, kinds]) => [
    assetId,
    kinds.size === 1 ? [...kinds][0] : "conflicting_observations"
  ])
);
const countClassification = (kind) => [...classificationByAsset.values()].filter((c) => c === kind).length;

const findings = [];

// A finding is a fact about a document, not about a leg. Two assets pinning
// different bytes for one form produce two legs that fetch the identical URL,
// and reporting the stale pin once per leg would double-count a single fact —
// and make the totals read as two forms in trouble instead of one.
const alreadyFound = new Set();
const firstTimeSeeing = (kind, source) => {
  const key = `${kind}|${source.jurisdiction}|${normalizeForm(source.formNumber)}|${source.sha256 ?? source.httpStatus}`;
  if (alreadyFound.has(key)) return false;
  alreadyFound.add(key);
  return true;
};

for (const source of acquired) {
  if (source.publisherMovedTheFormFrom && firstTimeSeeing("queue_url_is_stale", source)) {
    findings.push({
      kind: "queue_url_is_stale",
      jurisdiction: source.jurisdiction,
      formNumber: source.formNumber,
      queueUrl: source.publisherMovedTheFormFrom,
      directOfficialUrl: source.finalResolvedUrl,
      whatItMeans: "the queue's URL still reaches the form only because the publisher redirects it; the direct official URL is the resolved one",
      evidence: source.jobUrl
    });
  }
  if (source.pinsNoLongerServed.length > 0 && firstTimeSeeing("pinned_hash_no_longer_served", source)) {
    findings.push({
      kind: "pinned_hash_no_longer_served",
      jurisdiction: source.jurisdiction,
      formNumber: source.formNumber,
      servedSha256: source.sha256,
      pinsNoLongerServed: source.pinsNoLongerServed,
      whatItMeans: "an asset is pinned to bytes this URL no longer serves; the publisher reissued the form, or the pin was never these bytes",
      whatItDoesNotMean: "that the served bytes are the current official edition — that needs the publisher's own forms index",
      evidence: source.jobUrl
    });
  }
}
const observedForms = new Set(OBSERVATIONS.map((o) => `${o.jurisdiction}|${normalizeForm(o.formNumber)}`));

for (const source of sources.filter((s) => s.outcome === "not_acquired")) {
  const alsoAffected = queueEntries
    .filter((e) => source.queueUrls.includes(e.url))
    // Forms with their own observation are not "not observed"; each carries
    // its own finding, and naming them here would double-count them.
    .filter((e) => !observedForms.has(`${e.jurisdiction}|${normalizeForm(e.formNumber)}`))
    .map((e) => `${e.jurisdiction} ${e.formNumber}`);
  findings.push({
    kind: "official_source_url_is_dead",
    jurisdiction: source.jurisdiction,
    formNumber: source.formNumber,
    url: source.requestedUrlInLog,
    httpStatus: source.httpStatus,
    whatItMeans: "the URL the queue records for this form is gone; a replacement has to be found on the publisher's site",
    whatItDoesNotMean: "that the form has been withdrawn — a moved page says nothing about the form",
    // Named, not asserted: these share the identical dead URL but their own
    // legs were never given a runner, so they were not separately observed.
    sameUrlNotSeparatelyObserved: [...new Set(alsoAffected)],
    evidence: source.jobUrl
  });
}

const evidence = {
  schemaVersion: "rcap-official-source-evidence/v1",
  generatedBy: "scripts/generate-rcap-official-source-evidence.mjs",
  purpose:
    "The direct official URL, exact SHA-256 and observed structure of every source the acquisition actually fetched, recovered from job logs, and reconciled against the queue.",
  howTheseFactsWereRecovered: {
    route: "GitHub Actions job logs, read through the GitHub API",
    whyNotTheArtifacts:
      "workflow artifacts are served from productionresultssa9.blob.core.windows.net, which this session's egress policy refuses with a 403 CONNECT; the API host is reachable and carries the same facts",
    whatMakesEachRowCheckable: "every row names the job whose log it was transcribed from"
  },
  whatThisEstablishes: [
    "which URL served the bytes, after redirects",
    "the exact SHA-256, byte length and content type of what arrived",
    "whether the hash an asset was pinned to is still what the publisher serves"
  ],
  whatThisDoesNotEstablish: [
    "that the acquired bytes are the current official edition",
    "the edition or revision printed on any of these documents — this run predates the revision reader",
    "that a form whose leg never ran is missing, moved or superseded",
    "that any of these has a named current use in the platform"
  ],
  run: RUN,
  totals: {
    legsPlanned: 44,
    legsGivenARunner: OBSERVATIONS.length,
    legsNeverGivenARunner: 44 - OBSERVATIONS.length,
    acquired: acquired.length,
    notAcquired: sources.length - acquired.length,
    exactHashesRecovered: acquired.length,
    directOfficialUrlsConfirmed: acquired.length,
    // Counted per asset: one fetch can settle one asset and unsettle another.
    assetsExactMatch: countClassification("exact_match"),
    assetsSourceDrift: countClassification("source_drift"),
    assetsCurrentReplacement: countClassification("current_replacement"),
    assetsFetchFailed: countClassification("fetch_failed"),
    queueUrlsFoundStale: findings.filter((f) => f.kind === "queue_url_is_stale").length,
    pinsNoLongerServed: findings.filter((f) => f.kind === "pinned_hash_no_longer_served").length,
    deadOfficialUrls: findings.filter((f) => f.kind === "official_source_url_is_dead").length,
    revisionsConfirmed: 0
  },
  findings,
  sources
};

fs.writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);

console.log(`Wrote ${path.relative(rootDir, OUT)}`);
console.log(`  ${acquired.length} source(s) with an exact hash and a direct official URL, from run ${RUN.runId}`);
for (const finding of findings) {
  console.log(`  ${finding.kind}: ${finding.jurisdiction} ${finding.formNumber}`);
}
console.log(`  edition/revision: unread for all ${acquired.length} — this run predates the revision reader`);
