#!/usr/bin/env node
// One terminal disposition per source-direct asset, in batches.
//
//   node data/rcap-all50/pdf-source-handoffs/source-direct/batches.mjs
//
// The assignment's stop condition is that every assigned asset carries either
// an acquired source with a receipt, or a recorded finding naming what was
// searched. Nothing here is acquired: all seven publisher hosts these eighteen
// assets sit on answer 403 CONNECT through this session's egress proxy, and
// `.github/workflows/**` is prohibited to this assignment, so the Actions
// acquisition route cannot be driven from it either.
//
// What every asset gets instead is the terminal state this lane can actually
// reach, honestly, plus exactly one named next action. Sixteen were never
// searched, and none of them is recorded as having no official source — that
// would be a finding nobody earned.
//
// These dispositions are NOT written into the assets' source-record.json.
// scripts/build-rcap-official-forms-d1-packages.mjs rewrites those records
// wholesale from a fresh object literal — it would drop any key added here on
// its next run, along with the bundleReconciliation block already in them. A
// finding recorded somewhere that silently discards it is worse than one
// recorded here, in a directory only this assignment writes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "../../../..");
const AGGREGATE = path.join(here, "publisher-of-record.json");

/**
 * The batches, cut by jurisdiction so a commit is reviewable as one
 * publisher's problem rather than a slice across four.
 */
const BATCHES = [
  { batch: 1, jurisdictions: ["KY"], label: "Kentucky" },
  { batch: 2, jurisdictions: ["AL"], label: "Alabama" },
  { batch: 3, jurisdictions: ["AR", "AK"], label: "Arkansas and Alaska" }
];

/**
 * The publisher index each jurisdiction's forms are listed on, where this
 * repository already records one, with the file that records it.
 *
 * These are index pages, not form URLs. They are where a search STARTS, and
 * naming one is not a claim that the asset is on it.
 */
const PUBLISHER_INDEXES = {
  KY: { url: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx", body: "Kentucky Court of Justice" },
  AL: { url: "https://judicial.alabama.gov/library/criminal_forms", body: "Alabama Unified Judicial System" },
  AR: { url: "https://dps.arkansas.gov/crime-info-support/arkansas-crime-information-center/forms/criminal-history/", body: "Arkansas Crime Information Center" },
  AK: { url: "https://public.courts.alaska.gov/web/forms/docs/", body: "Alaska Court System" }
};

// A form published by one of these is not served by the court system, so a
// court forms index is the wrong place to search for it.
const NON_COURT_ISSUER_INDEX = {
  "DPS-SEAL-REQ": { body: "Alaska Department of Public Safety", url: null }
};

const aggregate = JSON.parse(fs.readFileSync(AGGREGATE, "utf8"));

function dispositionFor(asset) {
  // A captured index page is not a form. The register carries these under
  // kind `official_form_or_packet`, but the artefact is an .html capture of a
  // publisher's forms list — there is no official binary to acquire for it,
  // and acquiring the page it was captured from would produce a page, not a
  // form. This is the one refusal this lane's own rules name explicitly.
  if (!asset.isPdf && /\.html?$/i.test(asset.fileName)) {
    return {
      disposition: "captured_index_page_not_an_official_form",
      why: "the asset is an HTML capture of a publisher's forms list, not a form; no official binary exists for it to be acquired",
      nextAction: "decide whether this asset is retired or repointed to the forms the captured page lists; that is a retirement-lane decision, not a source acquisition",
      ownedByThisLane: false
    };
  }
  if ((asset.whatWasSearched ?? []).length > 0) {
    const searched = asset.whatWasSearched[0];
    return {
      disposition: "publisher_of_record_searched_no_binary_returned",
      why: `the recorded page was requested ${searched.attempts} time(s) across ${searched.runIds.length} run(s) and answered ${Object.entries(searched.statusCounts).map(([s, n]) => `${s}×${n}`).join(", ")}`,
      notEstablished: searched.stableAnswer
        ? null
        : "the host did not answer the same way twice, so this is a host filtering automated requests rather than a settled answer about the form",
      nextAction: asset.unverifiedProbeCandidate
        ? `probe ${asset.unverifiedProbeCandidate} from a client this publisher does not refuse`
        : "search this publisher's forms index from a client it does not refuse",
      ownedByThisLane: true
    };
  }
  return {
    disposition: "publisher_access_required_never_searched",
    why: "no publisher-of-record URL is recorded for this asset and this session cannot reach its publisher, so nothing has been searched",
    notEstablished: "that this asset has no official source; nothing was searched, and an unsearched asset is not a missing one",
    nextAction: asset.unverifiedProbeCandidate
      ? `probe ${asset.unverifiedProbeCandidate} from a client this publisher does not refuse`
      : "search this publisher's forms index for this document and record the URL that serves it",
    ownedByThisLane: true
  };
}

const written = [];
for (const { batch, jurisdictions, label } of BATCHES) {
  const assets = aggregate.assets
    .filter((a) => jurisdictions.includes(a.jurisdiction))
    .map((a) => {
      const d = dispositionFor(a);
      const issuerKey = Object.keys(NON_COURT_ISSUER_INDEX).find((k) => String(a.documentId ?? "").startsWith(k));
      const index = issuerKey ? NON_COURT_ISSUER_INDEX[issuerKey] : PUBLISHER_INDEXES[a.jurisdiction] ?? null;
      return {
        assetId: a.assetId,
        jurisdiction: a.jurisdiction,
        fileName: a.fileName,
        documentId: a.documentId,
        expectedSha256: a.expectedSha256,
        expectedSizeBytes: a.expectedSizeBytes,
        isPdf: a.isPdf,
        sourceRecordPath: a.sourceRecordPath,
        ...d,
        publisherOfRecordInRegister: a.publisherOfRecordInRegister,
        searchStartsAt: index,
        unverifiedProbeCandidate: a.unverifiedProbeCandidate,
        probeCandidateWithheld: a.probeCandidateWithheld,
        whatWasSearched: a.whatWasSearched,
        // What to check the bytes against the moment they exist. Four of the
        // eighteen carry a revision from the bundle, which is the first thing
        // this work has had to CONFIRM a document against rather than read one
        // from; the acquisition queue never carried a revision at all.
        confirmOnAcquisition: {
          expectedSha256: a.expectedSha256,
          expectedRevision: a.expectedRevision && a.expectedRevision !== "REV-UNKNOWN" ? a.expectedRevision : null,
          howToConfirm: a.expectedRevision && a.expectedRevision !== "REV-UNKNOWN"
            ? "pass RCAP_EXPECTED_REVISION to the acquirer; it reads the document's own printed revision line and reports confirmed or contradicted"
            : "no revision is recorded for this asset, so a read revision will come back no_expectation_recorded"
        }
      };
    });

  const byDisposition = {};
  for (const a of assets) byDisposition[a.disposition] = (byDisposition[a.disposition] ?? 0) + 1;

  const record = {
    schemaVersion: "rcap-source-direct-batch/v1",
    generatedBy: "data/rcap-all50/pdf-source-handoffs/source-direct/batches.mjs",
    assignment: "data/rcap-all50/gate-b-assignments/source-direct.json",
    assignmentSha: "fdc08321",
    batch,
    label,
    jurisdictions,
    purpose: `Terminal source-direct disposition for the ${assets.length} assigned ${label} asset(s), with one named next action each.`,
    acquired: 0,
    whyNothingWasAcquired:
      "every publisher host these assets sit on answers 403 CONNECT through this session's egress proxy, and .github/workflows/** is prohibited to this assignment, so the Actions acquisition route cannot be driven from it",
    whatThisDoesNotEstablish: [
      "that any asset here has no official source",
      "the SHA-256 of any official binary; none was fetched",
      "that a probe candidate is an asset's official URL"
    ],
    totals: { assets: assets.length, acquired: 0, byDisposition },
    assets
  };

  const out = path.join(here, `batch-${batch}-${jurisdictions.join("-").toLowerCase()}.json`);
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  written.push({ out: path.relative(rootDir, out), batch, count: assets.length, byDisposition });
}

for (const w of written) {
  console.log(`batch ${w.batch}: ${w.count} asset(s) -> ${w.out}`);
  for (const [d, n] of Object.entries(w.byDisposition)) console.log(`    ${n} ${d}`);
}
const total = written.reduce((n, w) => n + w.count, 0);
console.log(`\n${total} of ${aggregate.assets.length} assigned assets dispositioned; 0 acquired.`);
