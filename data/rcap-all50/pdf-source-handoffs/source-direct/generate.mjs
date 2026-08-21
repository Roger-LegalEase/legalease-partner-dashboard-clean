#!/usr/bin/env node
// What is known about the publisher of record for the eighteen source-direct
// assets, and what was actually searched for each.
//
//   node data/rcap-all50/pdf-source-handoffs/source-direct/generate.mjs
//
// This generator lives inside the handoff directory rather than under scripts/
// because the source-direct assignment's allowedPaths are exactly
// `data/rcap-all50/pdf-source-handoffs/source-direct/**` and the eighteen
// source-record.json files. A committed data file with no committed generator
// would be typed rather than derived, and this repository does not accept that.
//
// The assignment's expected output is "the official binary acquired and its
// SHA-256 recorded against the publisher of record, OR a recorded finding that
// no official source exists". Nothing here acquires anything. Both of the
// inputs the assignment names as required are absent from this clone:
//
//   - publisher-of-record access. Court hosts answer 403 CONNECT through this
//     session's egress proxy, and `.github/workflows/**` is prohibited to this
//     assignment, so the Actions acquisition route cannot be driven either.
//   - the Master Library corpus. The lane's own focused verifier,
//     generate-rcap-source-resolution.mjs, exits immediately unless the Edition
//     1 extract is mounted under private/source-imports/, and it is not.
//
// So this records the second arm honestly: for each asset, what the register
// actually holds as its publisher of record, what was searched and what came
// back, and what remains to probe. It records no URL as official that was not
// observed serving the form.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "../../../..");
const ASSIGNMENT_ASSETS = [
  "KY|496.2.pdf|5d1ca608d94911a3f2fa0ed168ea43da2d72e685b85c48b3c220ed5ea6896bde",
  "KY|496.3.pdf|3225f34ea85bb9e4649e41257530d40e9565a4a7b95628148ee115edced47eaa",
  "KY|497.2.pdf|080acd68f99ff84afb9b1d08721b5dbff516b8531f0ce53ca7ffc030e80f19e4",
  "KY|JV-29.1.pdf|5dacccad4cc01732bc8b25f7b2bce14f26003c24c05913e22500c4f373b8d477",
  "KY|JV-29.pdf|557f0e5567d4a79c0d037ae1e38d7683153b32abdaa17f68511327bd0644ff45",
  "KY|JV-30.pdf|c1ca3e80cd7cb7afc8cec7b2922691895e5c6f8d761c052bbdc98ff317d1e5ee",
  "KY|Kentucky-Expungement-Forms.html|c144558f1a2e7745631fbfc599744a4e0c8a3099d905eaed6258fed342858dc8",
  "AL|al-expungement-petition.html|fbeb00bc41b8ed948fbbaa31276216849bef70c4cb9cf55e197a414e5725e8b4",
  "AL|cr-65-expunge-petition-10-2024.pdf|c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39",
  "AL|cr-65a-order-on-petition-for-expungement-10-2024.pdf|7bae84d50ef27e30458048805e996654736af561db4e0ca3acae250a6fe50a12",
  "AL|criminal-forms.html|55acbbbee2554b6c57dbae84ad13c7aaa78545521cba341499d1c21c07a9e666",
  "AL|criminal-record-expungement.html|021c264e33e7b124273795c68c62b3f5e24d82c28326ed69cb2ebeb4320726bf",
  "AR|3-Misdemeanor-Petition-8_01_2023.pdf|63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23",
  "AR|7_Nolle_Prosequi_Dismissed_Acquittal_Petition_2020_F.pdf|09f323174881934239734e3a418eb4fec0b4bd0f7e199e8698c3af95a659fa61",
  "AR|Arkansas-Petition-Order-Forms.html|f47ff079d70a3973ecbdd32c524f373af88801fe8cd3e91b7a6f090f825f8d42",
  "AR|Felony-Petition-Form-f.pdf|6065fe0248e9022c866ac2506c02df35b533439f6d15fc40843b709eea375d9b",
  "AK|ak-record-relief-forms.html|e85e1adc3462452fe4dbe83ffc28de8cef7528e2f6cb2771e4412abf3aa656f0",
  "AK|RequestToSealCrimInfo.pdf|1fb64733f46c397beb69d1da8d72a1f1462669f8dfb7611e86a833c45aa5c80a"
];

const OVERLAYS = path.join(rootDir, "data/rcap-all50/overlays/production");
const EVIDENCE = path.join(rootDir, "data/rcap-all50/official-source-acquisition-evidence.json");
const OUT = path.join(here, "publisher-of-record.json");

const evidence = JSON.parse(fs.readFileSync(EVIDENCE, "utf8"));

/** Every committed source-record, keyed by the assignment's asset identity. */
function sourceRecords() {
  const byAsset = new Map();
  for (const state of fs.readdirSync(OVERLAYS).sort()) {
    const stateDir = path.join(OVERLAYS, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const family of fs.readdirSync(stateDir).sort()) {
      const file = path.join(stateDir, family, "source-record.json");
      if (!fs.existsSync(file)) continue;
      const record = JSON.parse(fs.readFileSync(file, "utf8"));
      byAsset.set(`${record.jurisdiction}|${record.fileName}|${record.expectedSha256}`, {
        record,
        recordPath: path.relative(rootDir, file)
      });
    }
  }
  return byAsset;
}

/**
 * A URL this repository has OBSERVED serving a form on this jurisdiction's
 * publisher host, with the acquisition that proves it.
 *
 * Only acquisitions count. A URL that appears in an inventory is a link
 * somebody recorded; a URL that answered 200 with bytes whose hash matched the
 * pin is a publisher of record.
 */
function provenPublisherUrls() {
  const out = new Map();
  const seen = new Set();
  for (const source of evidence.sources) {
    if (source.outcome !== "acquired" || !source.finalResolvedUrl) continue;
    // A document acquired in both runs is one proven URL, not two.
    const key = `${source.jurisdiction}|${source.formNumber}|${source.finalResolvedUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = out.get(source.jurisdiction) ?? [];
    list.push({
      formNumber: source.formNumber,
      url: source.finalResolvedUrl,
      sha256: source.sha256,
      pinVerdict: source.pinVerdictInLog,
      evidence: source.jobUrl
    });
    out.set(source.jurisdiction, list);
  }
  return out;
}

/**
 * Every recorded attempt against a URL, summarised per URL.
 *
 * Several Kentucky forms share one expungement page, so a per-attempt list
 * attached to each asset repeats its siblings' attempts and reads as though
 * this one asset was searched seven times. What is true of the URL is stated
 * once, with the form numbers that were the vehicle, so the count means what
 * it says.
 */
function searchesByUrl() {
  const grouped = new Map();
  for (const source of evidence.sources) {
    const url = source.requestedUrlInLog ?? null;
    if (source.outcome !== "not_acquired" || !url) continue;
    const entry = grouped.get(url) ?? { url, attempts: 0, statusCounts: {}, runIds: new Set(), viaFormNumbers: new Set(), evidence: [] };
    entry.attempts += 1;
    const status = String(source.httpStatus ?? "no_http_response");
    entry.statusCounts[status] = (entry.statusCounts[status] ?? 0) + 1;
    entry.runIds.add(source.runId);
    entry.viaFormNumbers.add(source.formNumber);
    entry.evidence.push(source.jobUrl);
    grouped.set(url, entry);
  }
  const out = new Map();
  for (const [url, e] of grouped) {
    out.set(url, {
      url,
      attempts: e.attempts,
      statusCounts: e.statusCounts,
      runIds: [...e.runIds],
      viaFormNumbers: [...e.viaFormNumbers].sort(),
      stableAnswer: Object.keys(e.statusCounts).length === 1,
      evidence: e.evidence
    });
  }
  return out;
}

// Issuing bodies that are not the court system. A form published by one of
// these is not served from the court forms directory, however well its
// filename fits the pattern there, and offering that candidate would send the
// next probe at the wrong publisher entirely.
const NON_COURT_ISSUERS = {
  DPS: "a state Department of Public Safety, not the court system",
  ACIC: "the Arkansas Crime Information Center, not the court system",
  FDLE: "the Florida Department of Law Enforcement, not the court system"
};

/** The issuing body a document id names, when it names one. */
function nonCourtIssuer(documentId) {
  const token = String(documentId ?? "").split(/[-|]/)[0].toUpperCase();
  return NON_COURT_ISSUERS[token] ? { token, why: NON_COURT_ISSUERS[token] } : null;
}

/**
 * The directory a jurisdiction's proven form URLs share, if they share one.
 *
 * This is the only basis on which a candidate URL is offered below, and it is
 * offered as a PROBE, never as the asset's official source. Kentucky AOC-334
 * was acquired twice from
 * `.../Legal-Forms/Legal Forms/334.pdf` with a matching hash, and the corpus
 * filenames of the other Kentucky assets sit in exactly that slot — which makes
 * the candidate worth one request, and nothing more until a request is made.
 */
function provenDirectory(urls) {
  const dirs = [...new Set(urls.map((u) => u.url.slice(0, u.url.lastIndexOf("/") + 1)))];
  return dirs.length === 1 ? dirs[0] : null;
}

const records = sourceRecords();
const proven = provenPublisherUrls();
const searches = searchesByUrl();

const assets = ASSIGNMENT_ASSETS.map((assetId) => {
  const [jurisdiction, fileName, expectedSha256] = assetId.split("|");
  const found = records.get(assetId);
  if (!found) return { assetId, jurisdiction, fileName, expectedSha256, error: "no committed source-record carries this asset identity" };
  const { record, recordPath } = found;
  const bundle = record.bundleReconciliation ?? {};

  // Anything in the register that even looks like a publisher URL. There is
  // none, in any of the eighteen — that absence is the finding, so it is
  // computed rather than asserted.
  const urlsInRecord = [...new Set(JSON.stringify(record).match(/https?:\/\/[^"\\ ]+/g) ?? [])];

  // Was this asset's own hash the subject of a recorded acquisition attempt?
  const attempted = evidence.sources.filter((s) =>
    (s.coveredAssetIds ?? []).some((covered) => covered.endsWith(`|${expectedSha256}`))
  );
  const searchedUrls = [...new Set(attempted.map((s) => s.requestedUrlInLog ?? s.queueUrls?.[0]).filter(Boolean))];
  const searchRecord = searchedUrls.map((url) => searches.get(url)).filter(Boolean);

  const provenForJurisdiction = proven.get(jurisdiction) ?? [];
  const directory = provenForJurisdiction.length > 0 ? provenDirectory(provenForJurisdiction) : null;
  const issuer = nonCourtIssuer(bundle.documentId);
  const candidate = directory && record.isPdf && !issuer
    ? `${directory}${encodeURIComponent(fileName)}`
    : null;

  const disposition = searchRecord.length > 0
    ? "publisher_of_record_searched_no_binary_returned"
    : "no_publisher_of_record_recorded_and_none_searched";

  return {
    assetId,
    jurisdiction,
    fileName,
    expectedSha256,
    expectedSizeBytes: record.expectedSizeBytes ?? null,
    kind: record.kind ?? null,
    isPdf: record.isPdf === true,
    sourceRecordPath: recordPath,
    documentId: bundle.documentId ?? null,
    expectedRevision: bundle.revision ?? null,
    bundlePath: bundle.bundlePath ?? null,
    sourcePresenceInClone: record.sourcePresenceInClone === true,
    publisherOfRecordInRegister: urlsInRecord.length > 0 ? urlsInRecord : null,
    whatWasSearched: searchRecord,
    disposition,
    // Never an official URL. A candidate is one request away from being either
    // a source or a 404, and until that request is made it is a guess with a
    // plausible shape.
    unverifiedProbeCandidate: candidate,
    probeCandidateBasis: candidate
      ? `the same directory served ${provenForJurisdiction.map((p) => p.formNumber).join(", ")} with a matching pinned hash; this asset's corpus filename occupies the same slot`
      : null,
    probeCandidateWithheld: issuer && directory && record.isPdf
      ? `${bundle.documentId} is published by ${issuer.why}, so the court forms directory that serves ${provenForJurisdiction.map((p) => p.formNumber).join(", ")} is the wrong publisher for it`
      : null
  };
});

const searchedAssets = assets.filter((a) => a.disposition === "publisher_of_record_searched_no_binary_returned");

const handoff = {
  schemaVersion: "rcap-source-direct-publisher-of-record/v1",
  generatedBy: "data/rcap-all50/pdf-source-handoffs/source-direct/generate.mjs",
  assignment: "data/rcap-all50/gate-b-assignments/source-direct.json",
  assignmentSha: "fdc08321",
  purpose:
    "For each source-direct asset: what the register holds as its publisher of record, what was actually searched, and what remains to probe. No asset here is acquired.",
  requiredInputsAbsent: [
    {
      input: "publisher-of-record access for the assigned jurisdictions",
      why: "court hosts answer 403 CONNECT through this session's egress proxy, and .github/workflows/** is prohibited to this assignment, so the Actions acquisition route cannot be driven from it either"
    },
    {
      input: "the Edition 1 Master Library extract mounted under private/source-imports/",
      why: "the lane's own focused verifier, scripts/generate-rcap-source-resolution.mjs, exits before doing anything unless that corpus is mounted; it is not present in this clone"
    }
  ],
  whatThisEstablishes: [
    "that not one of the eighteen source-records names a publisher-of-record URL",
    "which assets have had their recorded URL searched, by which run, and what it answered",
    "the form number and expected revision each asset should be confirmed against once a binary is in hand"
  ],
  whatThisDoesNotEstablish: [
    "that any assigned asset has no official source — nothing here searched sixteen of them",
    "that a probe candidate is this asset's official URL",
    "the SHA-256 of any official binary; none was fetched"
  ],
  totals: {
    assetsAssigned: assets.length,
    acquired: 0,
    publisherOfRecordRecordedInRegister: assets.filter((a) => a.publisherOfRecordInRegister).length,
    searchedAndAnswered: searchedAssets.length,
    neverSearched: assets.length - searchedAssets.length,
    carryingAnExpectedRevision: assets.filter((a) => a.expectedRevision && a.expectedRevision !== "REV-UNKNOWN").length,
    unverifiedProbeCandidates: assets.filter((a) => a.unverifiedProbeCandidate).length,
    probeCandidatesWithheldAsWrongPublisher: assets.filter((a) => a.probeCandidateWithheld).length
  },
  provenPublisherUrlsByJurisdiction: Object.fromEntries([...proven.entries()]),
  assets
};

fs.writeFileSync(OUT, `${JSON.stringify(handoff, null, 2)}\n`);
console.log(`Wrote ${path.relative(rootDir, OUT)}`);
console.log(`  ${handoff.totals.assetsAssigned} assigned; ${handoff.totals.acquired} acquired`);
console.log(`  ${handoff.totals.publisherOfRecordRecordedInRegister} carry a publisher-of-record URL in the register`);
console.log(`  ${handoff.totals.searchedAndAnswered} searched and answered; ${handoff.totals.neverSearched} never searched`);
console.log(`  ${handoff.totals.unverifiedProbeCandidates} unverified probe candidate(s), none recorded as official`);
