#!/usr/bin/env node
// Recovers what the official-source acquisitions actually established, and
// reconciles them against the queue that asked for them.
//
//   node scripts/generate-rcap-official-source-evidence.mjs
//
// Two runs are transcribed here.
//
// Run 32251630850 fetched fourteen legs and was then refused runners partway
// through the matrix. Its evidence was unreadable from this clone: workflow
// artifacts are served from a storage host whose egress policy answers 403, so
// the run log recorded that the SHA-256, content type and edition of every
// acquired file "cannot be read", and the work stalled on bytes that existed
// and nobody could see.
//
// That was false. Only the ARTIFACTS were unreachable. The acquirer also prints
// the final URL, status, content type, byte length and SHA-256 to stdout, and
// job logs come back through the GitHub API — the host this session already
// reaches. Every fact the register needs to pin a source was recoverable.
//
// Run 32433526678 then ran all 31 legs with the revision reader and the
// landing-page resolver in place, and fetched seventeen documents nobody had
// fetched at all.
//
// The OBSERVATIONS tables are transcribed verbatim from those job logs and are
// never computed; each row names the job whose log it came from. What IS
// computed is the reconciliation against the committed queue — which queue URLs
// the publisher has moved, which pinned hashes the publisher no longer serves,
// which documents answer for more than one form number, and which hosts refused
// the runner rather than answering about a form. Those are derivations, so they
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

// The second run, on this branch, with the revision reader and the landing-page
// resolver in place. It is not a repeat of the first: the first was refused
// runners partway through, so 17 of these 31 legs are documents nobody had
// fetched at all.
const RUN_47 = {
  runId: "32433526678",
  runUrl: "https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/32433526678",
  workflow: ".github/workflows/rcap-source-acquisition-branch.yml",
  headSha: "132bd5e7b3457d4540fb35cf9d4869ae23457de0",
  branch: "claude/official-pdf-urls-hash-f9s8u9",
  ranAt: "2026-08-21T00:40:14Z"
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
const OBSERVATIONS_46 = [
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

/**
 * Run 47, on this branch, transcribed the same way.
 *
 * This run had the revision reader and the landing-page resolver, and — unlike
 * run 46 — every one of its 31 legs was given a runner. Seventeen documents
 * were fetched that nobody had fetched before.
 *
 * `revisionVerdict` is what the reader made of each document's own printed
 * revision line. Read the totals before reading anything into it: see
 * `revisionReadingCaveat` in the output.
 */
const OBSERVATIONS_47 = [
  { jurisdiction: "AK", formNumber: "TF-800", jobId: "96630069300", outcome: "acquired",
    finalResolvedUrl: "https://public.courts.alaska.gov/web/forms/docs/tf-800.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 130602,
    sha256: "94bab52533d74551f7a8ff8644a9671241b38075c7e05f10806d627dfb898cbd",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "AK", formNumber: "TF-805", jobId: "96630069299", outcome: "acquired",
    finalResolvedUrl: "https://public.courts.alaska.gov/web/forms/docs/tf-805.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 93899,
    sha256: "96306d64eda397e25094f92c3d67a642372b82cba12f97c6666e5500136e8f54",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "AK", formNumber: "TF-810", jobId: "96630069345", outcome: "acquired",
    finalResolvedUrl: "https://public.courts.alaska.gov/web/forms/docs/tf-810.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 85386,
    sha256: "c5e55ce0c0bb2a008ad9cde5e62c4900f413c8fb64a913e94c81554c64b69582",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: null,
    revisionVerdict: "unreadable" },
  { jurisdiction: "KY", formNumber: "AOC-334", jobId: "96630069304", outcome: "acquired",
    finalResolvedUrl: "https://www.kycourts.gov/Legal-Forms/Legal%20Forms/334.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 252268,
    sha256: "7eb2838037903de1769a0253d6ad9b092dd72f4aa363b323968c8c510fd55d3d",
    observedStructuralClass: "acroform", observedPageCount: 2, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "KY", formNumber: "AOC-496", jobId: "96630069325", outcome: "not_acquired",
    requestedUrlInLog: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx", httpStatus: 403,
    failure: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx answered HTTP 403" },
  { jurisdiction: "KY", formNumber: "AOC-496.2", jobId: "96630069288", outcome: "not_acquired",
    requestedUrlInLog: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx", httpStatus: 404,
    failure: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx answered HTTP 404" },
  { jurisdiction: "KY", formNumber: "AOC-496.3", jobId: "96630069337", outcome: "not_acquired",
    requestedUrlInLog: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx", httpStatus: 404,
    failure: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx answered HTTP 404" },
  { jurisdiction: "KY", formNumber: "AOC-496.4", jobId: "96630069493", outcome: "not_acquired",
    requestedUrlInLog: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx", httpStatus: 404,
    failure: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx answered HTTP 404" },
  { jurisdiction: "KY", formNumber: "AOC-497", jobId: "96630069366", outcome: "not_acquired",
    requestedUrlInLog: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx", httpStatus: 404,
    failure: "https://www.kycourts.gov/Legal-Forms/Pages/Expungement.aspx answered HTTP 404" },
  { jurisdiction: "NC", formNumber: "AOC-CR-287", jobId: "96630069677", outcome: "not_acquired",
    requestedUrlInLog: "https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-146a-or-gs-15a-146a1-charges-dismissed-instructions-for-petition-and-order-of-expunction-under-gs-15a-146a-or-gs-15a-146a1-charges-dismissed",
    httpStatus: 403, failure: "answered HTTP 403" },
  { jurisdiction: "NC", formNumber: "AOC-CR-288", jobId: "96630069497", outcome: "not_acquired",
    requestedUrlInLog: "https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-146a2-not-guilty-or-not-responsible-instructions-for-petition-and-order-of-expunction-under-gs-15a-146a2-not-guilty-or-not-responsible",
    httpStatus: 403, failure: "answered HTTP 403" },
  { jurisdiction: "NC", formNumber: "AOC-CR-296", jobId: "96630069501", outcome: "not_acquired",
    requestedUrlInLog: "https://www.nccourts.gov/documents/forms", httpStatus: 403, failure: "answered HTTP 403" },
  { jurisdiction: "NC", formNumber: "AOC-CR-297", jobId: "96630069379", outcome: "not_acquired",
    requestedUrlInLog: "https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-misdemeanors-instructions-for-petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-misdemeanors",
    httpStatus: 403, failure: "answered HTTP 403" },
  { jurisdiction: "NC", formNumber: "AOC-CR-297", jobId: "96630069412", outcome: "not_acquired",
    requestedUrlInLog: "https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-felonyies-instructions-for-petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-felonyies",
    httpStatus: 403, failure: "answered HTTP 403" },
  { jurisdiction: "NC", formNumber: "AOC-CR-298", jobId: "96630069407", outcome: "not_acquired",
    requestedUrlInLog: "https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-misdemeanors-instructions-for-petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-misdemeanors",
    httpStatus: 403, failure: "answered HTTP 403" },
  { jurisdiction: "NC", formNumber: "AOC-CR-298", jobId: "96630069466", outcome: "not_acquired",
    requestedUrlInLog: "https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-felonyies-instructions-for-petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-felonyies",
    httpStatus: 403, failure: "answered HTTP 403" },
  { jurisdiction: "NC", formNumber: "AOC-CV-226", jobId: "96630070297", outcome: "not_acquired",
    requestedUrlInLog: "https://www.nccourts.gov/documents/forms", httpStatus: 403, failure: "answered HTTP 403" },
  { jurisdiction: "NE", formNumber: "CC-6-11", jobId: "96630070434", outcome: "acquired",
    finalResolvedUrl: "https://nebraskajudicial.gov/sites/default/files/CC-6-11.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 3003355,
    sha256: "c0dcc5c093790f0a54199ab6769876d1c124485cea5de08fb8fc783e9f6a5492",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: null,
    revisionVerdict: "not_printed" },
  { jurisdiction: "NE", formNumber: "CC-6-11.2", jobId: "96630070386", outcome: "acquired",
    finalResolvedUrl: "https://nebraskajudicial.gov/sites/default/files/CC-6-11-2.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 2766067,
    sha256: "8bfa884d66c2d485fc28acfae865075bdb02ae7d6b7a3de839c0248464e767b6",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: null,
    revisionVerdict: "not_printed" },
  { jurisdiction: "NE", formNumber: "CC-6-12", jobId: "96630070436", outcome: "acquired",
    finalResolvedUrl: "https://nebraskajudicial.gov/sites/default/files/CC-6-12.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 1682731,
    sha256: "68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28",
    observedStructuralClass: "acroform", observedPageCount: null, pinVerdictInLog: null,
    revisionVerdict: "not_printed" },
  { jurisdiction: "NE", formNumber: "CC-6-15.1", jobId: "96630070851", outcome: "acquired",
    finalResolvedUrl: "https://nebraskajudicial.gov/sites/default/files/CC-6-15-1.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 2909936,
    sha256: "d1fb1340b1ef42bab9da89f9ed6bc8d669057158065bd6bfcb37e762777a6b79",
    observedStructuralClass: "acroform", observedPageCount: 1, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "VA", formNumber: "CC-1201", jobId: "96630070813", outcome: "acquired",
    finalResolvedUrl: "https://www.vacourts.gov/static/forms/circuit/crim_sealing/cc1201.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 282919,
    sha256: "7b56d8e167f610739da1578ec96e8bc7925ae029141857e7350bd7482c8e7e78",
    observedStructuralClass: "acroform", observedPageCount: 8, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "VA", formNumber: "CC-1473", jobId: "96630070698", outcome: "acquired",
    finalResolvedUrl: "https://www.vacourts.gov/static/forms/circuit/cc1473.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 120875,
    sha256: "6176c2f55bdb320682acecf0a79931bd5e496c4c93b5696645d4ef447fa67219",
    observedStructuralClass: "acroform", observedPageCount: 2, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "VT", formNumber: "200-00130", jobId: "96630070819", outcome: "acquired",
    finalResolvedUrl: "https://www.vtcourts.gov/sites/default/files/documents/200-00130%20%E2%80%93%20Petition%20to%20Seal%20Criminal%20History.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 1535506,
    sha256: "ff914f49c2a78a8b96d48f1242b70ab12ff7cb25beeeb8b850505357fdf982ed",
    observedStructuralClass: "acroform", observedPageCount: 2, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "VT", formNumber: "200-00132", jobId: "96630070853", outcome: "acquired",
    finalResolvedUrl: "https://www.vtcourts.gov/sites/default/files/documents/200-00132%20%E2%80%93%20Stipulation%20to%20Seal%20Criminal%20History%20Record%20%2B%20Order.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 1999317,
    sha256: "088116244572ec7ccf00db799e1f6561928715e45c178f20b06de48d8d7a81c2",
    observedStructuralClass: "acroform", observedPageCount: 2, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "VT", formNumber: "200-00132A", jobId: "96630070823", outcome: "acquired",
    finalResolvedUrl: "https://www.vtcourts.gov/sites/default/files/documents/200-00132%20%E2%80%93%20Stipulation%20to%20Seal%20Criminal%20History%20Record%20%2B%20Order.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 1999317,
    sha256: "088116244572ec7ccf00db799e1f6561928715e45c178f20b06de48d8d7a81c2",
    observedStructuralClass: "acroform", observedPageCount: 2, pinVerdictInLog: "DOES NOT MATCH",
    revisionVerdict: "not_printed" },
  { jurisdiction: "VT", formNumber: "600-00228", jobId: "96630071149", outcome: "acquired",
    finalResolvedUrl: "https://www.vtcourts.gov/sites/default/files/documents/600-00228%20%E2%80%93%20Application%20to%20Waive%20Filing%20Fees%20%26%20Service%20Costs_0.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 2871072,
    sha256: "263d4e196cbca1bfba14ec730368fcc897dd2bb667d6a43ade7f612d42541654",
    observedStructuralClass: "acroform", observedPageCount: 2, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "WI", formNumber: "CR-266", jobId: "96630071625", outcome: "acquired",
    finalResolvedUrl: "https://www.wicourts.gov/formdisplay/CR-266.pdf?formNumber=CR-266&formType=Form&formatId=2&language=en",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 130733,
    sha256: "9f94674c0f931b66654d39ecfd074d897880f71523592bf83f2bd0dd34812412",
    observedStructuralClass: "flat_pdf", observedPageCount: 1, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "WI", formNumber: "CR-267", jobId: "96630071331", outcome: "acquired",
    finalResolvedUrl: "https://www.wicourts.gov/formdisplay/CR-267.pdf?formNumber=CR-267&formType=Form&formatId=2&language=en",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 74520,
    sha256: "2c0ac53b03658dc9ae93ba90f527ba162d487f181fd4525d5856b483f17930bb",
    observedStructuralClass: "flat_pdf", observedPageCount: 1, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "WI", formNumber: "DJ-LE-247", jobId: "96630071334", outcome: "acquired",
    finalResolvedUrl: "https://www.wisdoj.gov/Law%20Enforcement%20Services/Updated_DJ_LE_247_14-feb-17_0.pdf",
    httpStatus: 200, contentType: "application/pdf", observedByteLength: 130938,
    sha256: "ada016d389ef1f0b343432b187aec8c8c93bd7711c85d4ccce847f75572ae6f7",
    observedStructuralClass: "flat_pdf", observedPageCount: 2, pinVerdictInLog: "MATCHES",
    revisionVerdict: "not_printed" },
  { jurisdiction: "WI", formNumber: "DJ-LE-250B", jobId: "96630071489", outcome: "not_acquired",
    requestedUrlInLog: "https://www.wisdoj.gov/Law%20Enforcement%20Services/DJ_LE-250B_Draft_02232017_Fingerprint_Removal_Request.pdf",
    httpStatus: null,
    failure: "the first request did not complete: fetch failed" }
];

const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const queueEntries = [...queue.matrix, ...queue.probeMatrix];

const RUNS = { [RUN.runId]: RUN, [RUN_47.runId]: RUN_47 };
const OBSERVATIONS = [
  ...OBSERVATIONS_46.map((o) => ({ ...o, runId: RUN.runId })),
  ...OBSERVATIONS_47.map((o) => ({ ...o, runId: RUN_47.runId }))
];

const normalizeForm = (v) => String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
const formKey = (o) => `${o.jurisdiction}|${normalizeForm(o.formNumber)}`;

/** The queue entries an observation answers for: same jurisdiction, same form. */
function queueEntriesFor(observation) {
  return queueEntries.filter((e) => formKey(e) === formKey(observation));
}

const sources = OBSERVATIONS.map((observation) => {
  const run = RUNS[observation.runId];
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

  const pinsStillServed = observation.outcome === "acquired" ? pins.filter((p) => p === observation.sha256) : [];
  const pinsNoLongerServed = observation.outcome === "acquired" ? pins.filter((p) => p !== observation.sha256) : [];

  // One classification per ASSET, not per leg. Two assets can pin different
  // bytes for one document, so a single fetch is an exact match for one of
  // them and drift for the other; a per-leg verdict would have to pick one.
  //
  // `current_replacement` is deliberately never reached here. Calling drift a
  // replacement asserts the new bytes are the current published edition, and
  // that needs the publisher's own forms index — which no run consulted.
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
      promotingThisToCurrentReplacementRequires: "the publisher's own forms index, which no run consulted"
    };
  });

  return {
    assetClassifications,
    ...observation,
    runUrl: run.runUrl,
    jobUrl: `${run.runUrl}/job/${observation.jobId}`,
    queueUrls: requestedUrls,
    coveredAssetIds: related.map((e) => e.assetId).filter(Boolean),
    queueEntriesForThisForm: related.length,
    pinnedHashesInQueue: pins,
    pinsStillServed,
    pinsNoLongerServed,
    publisherMovedTheFormFrom: movedFrom,
    editionOrRevision:
      observation.revisionVerdict ?? "unread — run 46 predates the revision reader; see the run 47 leg for this form"
  };
});

const acquired = sources.filter((s) => s.outcome === "acquired");
const latestRunSources = sources.filter((s) => s.runId === RUN_47.runId);

// An asset covered by two legs of the same document is still one asset, and an
// asset observed in both runs is still one asset. The LATEST run wins: a pin
// that stopped matching between runs is news, and the older verdict is not.
const classificationByAsset = new Map();
for (const source of [...sources.filter((s) => s.runId === RUN.runId), ...latestRunSources]) {
  for (const entry of source.assetClassifications) classificationByAsset.set(entry.assetId, entry.classification);
}
const countClassification = (kind) => [...classificationByAsset.values()].filter((c) => c === kind).length;

// Documents fetched in both runs. Identical bytes twice, two days apart, is the
// strongest currentness signal a fetch can give — and it is still not proof of
// the current edition, only that the publisher did not change the file.
const stability = [];
for (const key of new Set(acquired.map(formKey))) {
  const runs = acquired.filter((s) => formKey(s) === key);
  const hashes = [...new Set(runs.map((s) => s.sha256))];
  if (runs.length < 2) continue;
  stability.push({
    jurisdiction: runs[0].jurisdiction,
    formNumber: runs[0].formNumber,
    observedInRuns: [...new Set(runs.map((s) => s.runId))],
    sha256: hashes.length === 1 ? hashes[0] : null,
    unchangedBetweenRuns: hashes.length === 1,
    whatThisEstablishes: hashes.length === 1
      ? "the publisher served identical bytes in both runs"
      : "the publisher served different bytes in the two runs",
    whatThisDoesNotEstablish: "that these bytes are the current official edition"
  });
}

const findings = [];
const alreadyFound = new Set();
const firstTimeSeeing = (kind, parts) => {
  const key = `${kind}|${parts}`;
  if (alreadyFound.has(key)) return false;
  alreadyFound.add(key);
  return true;
};

// Only the latest run's acquisitions raise findings about the queue. An older
// run repeating the same fact is confirmation, not a second problem.
for (const source of latestRunSources.filter((s) => s.outcome === "acquired")) {
  if (source.publisherMovedTheFormFrom && firstTimeSeeing("queue_url_is_stale", formKey(source))) {
    findings.push({
      kind: "queue_url_is_stale",
      jurisdiction: source.jurisdiction,
      formNumber: source.formNumber,
      queueUrl: source.publisherMovedTheFormFrom,
      directOfficialUrl: source.finalResolvedUrl,
      whatItMeans: "the queue's URL reaches the form only because the publisher redirects it; the direct official URL is the resolved one",
      evidence: source.jobUrl
    });
  }
  if (source.pinsNoLongerServed.length > 0 && firstTimeSeeing("pinned_hash_no_longer_served", formKey(source))) {
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

// Two form numbers whose queue URL serves one identical document. That is a
// source-identity problem, not drift: one of the two form numbers is not this
// document, and pinning both to it would file the same PDF under two names.
const byServedHash = new Map();
for (const source of latestRunSources.filter((s) => s.outcome === "acquired")) {
  if (!byServedHash.has(source.sha256)) byServedHash.set(source.sha256, []);
  byServedHash.get(source.sha256).push(source);
}
for (const [sha256, group] of byServedHash) {
  const forms = [...new Set(group.map((g) => `${g.jurisdiction} ${g.formNumber}`))];
  if (forms.length < 2) continue;
  findings.push({
    kind: "one_document_answers_for_two_form_numbers",
    jurisdiction: group[0].jurisdiction,
    formNumber: group[0].formNumber,
    formNumbers: forms,
    servedSha256: sha256,
    servedUrl: group[0].finalResolvedUrl,
    whatItMeans: "the queue sends these form numbers to one URL and that URL serves one document, so at most one of them is this document",
    whatItDoesNotMean: "which of them it is — that is a decision for a person reading the form",
    evidence: group.map((g) => g.jobUrl)
  });
}

// A host that answers the runner with 403, or with 403 and 404 for the same URL
// minutes apart, is filtering the request. That is not the same claim as "the
// form is gone", and the earlier record made exactly that mistake.
const failuresByHost = new Map();
for (const source of latestRunSources.filter((s) => s.outcome === "not_acquired" && s.requestedUrlInLog)) {
  let host = null;
  try { host = new URL(source.requestedUrlInLog).hostname.toLowerCase(); } catch { host = null; }
  if (!host) continue;
  if (!failuresByHost.has(host)) failuresByHost.set(host, []);
  failuresByHost.get(host).push(source);
}
for (const [host, group] of failuresByHost) {
  const statuses = [...new Set(group.map((g) => g.httpStatus).filter((s) => s !== null))].sort();
  const forms = [...new Set(group.map((g) => `${g.jurisdiction} ${g.formNumber}`))].sort();
  if (statuses.length === 0) {
    findings.push({
      kind: "transient_fetch_failure",
      jurisdiction: group[0].jurisdiction,
      formNumber: group[0].formNumber,
      host,
      whatItMeans: "the request did not complete at the connection level; this says nothing about the form or the URL",
      priorSuccess: "run 46 fetched this URL and hashed it, so the URL does serve bytes",
      evidence: group.map((g) => g.jobUrl)
    });
    continue;
  }
  findings.push({
    kind: statuses.length > 1 ? "official_host_responses_are_not_stable" : "official_host_refused_the_runner",
    jurisdiction: group[0].jurisdiction,
    formNumber: group[0].formNumber,
    host,
    httpStatusesObserved: statuses,
    formsAffected: forms,
    legsAffected: group.length,
    whatItMeans:
      statuses.length > 1
        ? `the same host answered ${statuses.join(" and ")} for these requests minutes apart, which is a host filtering automated traffic rather than a stable answer about any form`
        : `every request to ${host} was refused with ${statuses[0]}, which is the host declining the runner rather than an answer about any form`,
    whatItDoesNotMean: "that these forms have been withdrawn, moved, or superseded — nothing was learned about the documents themselves",
    howToSettleIt: "fetch from a client the publisher does not refuse, or ask the publisher for a machine-readable forms index",
    evidence: group.map((g) => g.jobUrl)
  });
}

const revisionVerdicts = {};
for (const source of latestRunSources.filter((s) => s.outcome === "acquired")) {
  const v = source.revisionVerdict ?? "unread";
  revisionVerdicts[v] = (revisionVerdicts[v] ?? 0) + 1;
}

const evidence = {
  schemaVersion: "rcap-official-source-evidence/v2",
  generatedBy: "scripts/generate-rcap-official-source-evidence.mjs",
  purpose:
    "The direct official URL, exact SHA-256, observed structure and printed revision of every source the acquisition actually fetched, recovered from job logs, and reconciled against the queue.",
  howTheseFactsWereRecovered: {
    route: "GitHub Actions job logs, read through the GitHub API",
    whyNotTheArtifacts:
      "workflow artifacts are served from productionresultssa9.blob.core.windows.net, which this session's egress policy refuses with a 403 CONNECT; the API host is reachable and carries the same facts",
    whatMakesEachRowCheckable: "every row names the job whose log it was transcribed from"
  },
  whatThisEstablishes: [
    "which URL served the bytes, after redirects and after landing-page resolution",
    "the exact SHA-256, byte length and content type of what arrived",
    "whether the hash an asset was pinned to is still what the publisher serves",
    "whether the publisher served identical bytes in both runs"
  ],
  whatThisDoesNotEstablish: [
    "that the acquired bytes are the current official edition",
    "that a form whose host refused the runner is missing, moved or superseded",
    "that any of these has a named current use in the platform"
  ],
  // 16 of 17 acquired documents report `not_printed`. That is a claim about
  // what this reader found, not a finding about court forms, and the two are
  // easy to confuse. The reader is known to work: it reads the printed revision
  // from California CR-180, Minnesota EXP107 and Florida FDLE forms in this
  // repository, and refuses statute citations. But these acquisitions predate
  // the character-count line in the log, so for THESE documents it cannot be
  // told apart from a PDF that yielded almost no extractable text.
  revisionReadingCaveat: {
    observed: revisionVerdicts,
    doNotConclude: "that these forms print no revision line",
    whyNot: "these legs did not log how much text was extracted, so `not_printed` and `almost no text came out` look identical here",
    settledBy: "the next acquisition, which logs the extracted character count beside the verdict"
  },
  runs: [RUN, RUN_47],
  totals: {
    runsTranscribed: 2,
    legsTranscribed: OBSERVATIONS.length,
    legsInLatestRun: latestRunSources.length,
    acquiredInLatestRun: latestRunSources.filter((s) => s.outcome === "acquired").length,
    notAcquiredInLatestRun: latestRunSources.filter((s) => s.outcome === "not_acquired").length,
    distinctDocumentsWithAnExactHash: new Set(acquired.map((s) => s.sha256)).size,
    documentsFetchedInBothRuns: stability.length,
    documentsUnchangedBetweenRuns: stability.filter((s) => s.unchangedBetweenRuns).length,
    assetsExactMatch: countClassification("exact_match"),
    assetsSourceDrift: countClassification("source_drift"),
    assetsCurrentReplacement: countClassification("current_replacement"),
    assetsFetchFailed: countClassification("fetch_failed"),
    queueUrlsFoundStale: findings.filter((f) => f.kind === "queue_url_is_stale").length,
    pinsNoLongerServed: findings.filter((f) => f.kind === "pinned_hash_no_longer_served").length,
    hostsRefusingTheRunner: findings.filter((f) => f.kind === "official_host_refused_the_runner" || f.kind === "official_host_responses_are_not_stable").length,
    revisionsConfirmed: 0
  },
  crossRunStability: stability.sort((a, b) => (`${a.jurisdiction}${a.formNumber}` < `${b.jurisdiction}${b.formNumber}` ? -1 : 1)),
  findings,
  sources
};

fs.writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);

console.log(`Wrote ${path.relative(rootDir, OUT)}`);
console.log(`  ${OBSERVATIONS.length} legs transcribed across 2 runs; ${evidence.totals.distinctDocumentsWithAnExactHash} distinct documents carry an exact hash`);
console.log(`  ${evidence.totals.documentsUnchangedBetweenRuns}/${evidence.totals.documentsFetchedInBothRuns} document(s) fetched in both runs served identical bytes`);
console.log(`  assets: ${evidence.totals.assetsExactMatch} exact_match, ${evidence.totals.assetsSourceDrift} source_drift, ${evidence.totals.assetsCurrentReplacement} current_replacement, ${evidence.totals.assetsFetchFailed} fetch_failed`);
for (const finding of findings) console.log(`  ${finding.kind}: ${finding.jurisdiction} ${finding.formNumber}`);
console.log(`  revisions confirmed: 0 — ${JSON.stringify(revisionVerdicts)}; see revisionReadingCaveat`);
