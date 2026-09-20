#!/usr/bin/env node
// One current disposition for every document obligation across the 166 rows the
// census flagged SOURCE_IDENTITY_UNRESOLVED.
//
//   node scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs
//   node scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs --check
//
// WHY THIS EXISTS
//
// The reconciliation counted 166 rows whose source identity it could not settle.
// Two batches then worked them, independently and in different weeks, and they
// answer in different vocabularies: batch 1 assigns each obligation a
// resolutionStatus enum, batch 2 records field-level flags -- identityResolved,
// heldInCorpus, notHeldBecause, partOfAnotherDocument -- and leaves the
// conclusion implicit. Neither is wrong; they are just not comparable, and an
// acquisition queue built from either alone would be built from half the answer.
//
// So this maps both into ONE vocabulary of nine dispositions, and every
// obligation gets exactly one. An obligation that matches no rule is a failure,
// not a default: a silent fallthrough into "unresolved" would quietly commission
// research on a document somebody already found.
//
// WHAT A DISPOSITION IS NOT
//
// It says what to DO about a document. It does not approve the document, prove a
// packet, open a route, or establish that a held file is the current official
// edition. ALREADY_HELD_VERIFIED_CORPUS means the bytes are in the corpus and
// nothing needs acquiring -- not that the form is current or approved for use.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const V1 = "data/rcap-grade-a/route-obligation-census-v1";
const OUT = `${V1}/source-queue-reconciliation.json`;
const CHECK = process.argv.includes("--check");

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const batch1 = read(`${V1}/identity-resolution/batch-1/resolved.json`);
const batch2 = read(`${V1}/identity-resolution/batch-2/resolved.json`);
const custody = read(`${V1}/source-custody-reconciliation.json`);

const DISPOSITIONS = {
  ALREADY_HELD_VERIFIED_CORPUS: "The verified corpus holds this document. Commission nothing. This is a statement about custody, not about currency or approval.",
  PROMOTE_FROM_NATIONWIDE_INVENTORY: "The committed nationwide inventory records an acquired file for this document, but the verified corpus does not carry it. The work is promotion and verification, not acquisition.",
  ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE: "The document is identified, nothing holds it, and its official source URL is known. This is a real acquisition with a known target. It cannot run until egress to issuing authorities is permitted.",
  RESOLVE_OFFICIAL_URL: "The document is identified but no official source URL is recorded. Find the issuing authority's own published location before commissioning acquisition; acquiring from anywhere else is not acquisition.",
  NO_OFFICIAL_FORM_COMPOSE_OUTPUT: "No official form is issued for this step. The output is composed, not filled. There is nothing to acquire and nothing to overlay.",
  NO_PARTICIPANT_DOCUMENT: "There is no document the participant obtains or files at this step.",
  NOT_A_SEPARATE_DOCUMENT: "The obligation is a section or location inside another document, not a document of its own. It is discharged by the document that contains it.",
  LEGAL_DESIGN_DECISION_REQUIRED: "No document can be named until a legal-design question is answered: the route's output vehicle is unresolved, or it carries no design track and no form assignment. This is not a source question and no amount of searching answers it.",
  UNRESOLVED_IDENTITY: "The document is described but not located, and what would resolve it is recorded. Deliberately not guessed: a wrong resolution sends someone to acquire the wrong document."
};

const rows = [];
const unmapped = [];

// ---- batch 1: a resolutionStatus enum per need --------------------------------
for (const row of batch1.rows) {
  for (const need of row.needs ?? []) {
    const status = need.resolutionStatus;
    const reason = need.unresolvedReason ?? row.unresolvedReason ?? null;
    let disposition = null;

    if (status === "RESOLVED_NOT_A_SEPARATE_DOCUMENT") disposition = "NOT_A_SEPARATE_DOCUMENT";
    else if (status === "RESOLVED_NO_DOCUMENT_TO_ACQUIRE") disposition = "NO_PARTICIPANT_DOCUMENT";
    else if (status === "RESOLVED_NO_OFFICIAL_FORM") disposition = "NO_OFFICIAL_FORM_COMPOSE_OUTPUT";
    else if (status === "RESOLVED_HELD") disposition = "ALREADY_HELD_VERIFIED_CORPUS";
    else if (status === "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS") disposition = "PROMOTE_FROM_NATIONWIDE_INVENTORY";
    else if (status === "RESOLVED_NOT_HELD") {
      // An acquisition without a known official location is not yet an
      // acquisition; it is a question about where the issuing authority
      // publishes. Separating them stops a worker being sent to fetch from
      // wherever a search engine offers first.
      disposition = need.officialSourceUrl ? "ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE" : "RESOLVE_OFFICIAL_URL";
    } else if (status === "UNRESOLVED") {
      disposition = (reason === "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN" || reason === "NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT")
        ? "LEGAL_DESIGN_DECISION_REQUIRED"
        : "UNRESOLVED_IDENTITY";
    }

    if (!disposition) { unmapped.push({ batch: 1, worklistGroupId: row.worklistGroupId, status, reason }); continue; }
    rows.push({
      batch: 1,
      worklistGroupId: row.worklistGroupId,
      jurisdictions: row.jurisdictions ?? [],
      obligation: need.documentTheRouteNeeds ?? need.censusSourceId ?? null,
      censusSourceId: need.censusSourceId ?? null,
      role: need.role ?? null,
      disposition,
      basis: status,
      basisDetail: reason,
      issuingAuthority: need.identity?.issuingAuthority ?? null,
      formNumber: need.identity?.formNumber ?? null,
      officialTitle: need.identity?.officialTitle ?? null,
      officialSourceUrl: need.officialSourceUrl ?? null,
      heldAs: need.heldInVerifiedCorpus ?? need.alsoHeldInVerifiedCorpus ?? null,
      whatWouldResolveIt: need.whatWouldResolveIt ?? null
    });
  }
}

// ---- batch 2: field-level flags, conclusion implicit --------------------------
// Precedence is deliberate and ordered from "there is nothing separate here" to
// "we do not know what this is". An obligation that is a location inside another
// document is never an acquisition, however unheld the containing document is.
for (const row of batch2.rows) {
  for (const doc of row.documentsTheRouteNeeds ?? []) {
    let disposition = null;
    let basis = null;

    if (doc.partOfAnotherDocument || doc.containedInDocument) {
      disposition = "NOT_A_SEPARATE_DOCUMENT";
      basis = "partOfAnotherDocument";
    } else if (row.resolution === "NO_OFFICIAL_DOCUMENT_REQUIRED") {
      disposition = "NO_OFFICIAL_FORM_COMPOSE_OUTPUT";
      basis = "row:NO_OFFICIAL_DOCUMENT_REQUIRED";
    } else if (doc.heldInCorpus) {
      disposition = "ALREADY_HELD_VERIFIED_CORPUS";
      basis = `heldInCorpus:${doc.heldBy ?? "unstated"}`;
    } else if (doc.labelIsAStatuteCitationNotAForm && !doc.theFormTheArticleImplies) {
      // A statute citation that implies no form names no document to acquire.
      // One that DOES imply a form falls through to the held/not-held rules,
      // because then there is a document and the question is where it is.
      disposition = "NO_OFFICIAL_FORM_COMPOSE_OUTPUT";
      basis = "labelIsAStatuteCitationNotAForm";
    } else if (doc.notHeldBecause === "PRESENT_IN_THE_NATIONWIDE_INVENTORY_AS_A_PDF_BUT_NOT_TAKEN_INTO_THE_VERIFIED_CORPUS") {
      disposition = "PROMOTE_FROM_NATIONWIDE_INVENTORY";
      basis = doc.notHeldBecause;
    } else if (doc.identityResolved) {
      disposition = doc.officialSourceUrl ? "ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE" : "RESOLVE_OFFICIAL_URL";
      basis = doc.notHeldBecause ?? "identityResolved_notHeld";
    } else if (doc.unresolvedBecause) {
      disposition = "UNRESOLVED_IDENTITY";
      basis = doc.unresolvedBecause;
    }

    if (!disposition) { unmapped.push({ batch: 2, worklistGroupId: row.worklistGroupId, obligation: doc.obligationLabel }); continue; }
    rows.push({
      batch: 2,
      worklistGroupId: row.worklistGroupId,
      jurisdictions: row.jurisdictions ?? [],
      obligation: doc.obligationLabel ?? null,
      censusSourceId: doc.namedInCensusAs ?? null,
      role: (doc.componentRoles ?? []).join("+") || null,
      disposition,
      basis,
      basisDetail: doc.resolutionCaveat ?? null,
      issuingAuthority: doc.issuingAuthority ?? null,
      formNumber: doc.formNumber ?? null,
      officialTitle: doc.officialTitle ?? null,
      officialSourceUrl: doc.officialSourceUrl ?? null,
      heldAs: doc.heldAs?.path ?? null,
      whatWouldResolveIt: doc.whatWouldResolveIt ?? null
    });
  }
}

if (unmapped.length) {
  console.error(`${unmapped.length} obligation(s) matched no disposition rule. A silent fallthrough would commission research on a document somebody already found, so this is a failure.`);
  for (const u of unmapped.slice(0, 10)) console.error(`  ${JSON.stringify(u)}`);
  process.exit(1);
}

// ---- row-level status, kept in each batch's own vocabulary --------------------
const rowStatus = { fullyResolved: 0, partiallyResolved: 0, unresolved: 0 };
for (const r of batch1.rows) {
  if (r.resolution === "RESOLVED") rowStatus.fullyResolved += 1;
  else if (r.resolution === "PARTIALLY_RESOLVED") rowStatus.partiallyResolved += 1;
  else rowStatus.unresolved += 1;
}
for (const r of batch2.rows) {
  if (r.resolution === "RESOLVED" || r.resolution === "NO_OFFICIAL_DOCUMENT_REQUIRED") rowStatus.fullyResolved += 1;
  else if (r.resolution === "PARTIALLY_RESOLVED") rowStatus.partiallyResolved += 1;
  else rowStatus.unresolved += 1;
}

const byDisposition = rows.reduce((acc, r) => { acc[r.disposition] = (acc[r.disposition] ?? 0) + 1; return acc; }, {});
for (const k of Object.keys(DISPOSITIONS)) byDisposition[k] ??= 0;

const actionable = ["ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE", "RESOLVE_OFFICIAL_URL", "PROMOTE_FROM_NATIONWIDE_INVENTORY"];
const closed = ["ALREADY_HELD_VERIFIED_CORPUS", "NO_OFFICIAL_FORM_COMPOSE_OUTPUT", "NO_PARTICIPANT_DOCUMENT", "NOT_A_SEPARATE_DOCUMENT"];
const stillOpen = ["LEGAL_DESIGN_DECISION_REQUIRED", "UNRESOLVED_IDENTITY"];
const sum = (keys) => keys.reduce((n, k) => n + byDisposition[k], 0);

const doc = {
  schemaVersion: "rcap-census-source-queue-reconciliation/v1",
  generatedBy: "scripts/grade-a-route-obligation-census/reconcile-source-queue.mjs",
  question: "For every document obligation across the 166 rows the census could not settle, what is the current disposition, and what does it authorize?",
  supersedes: "any earlier acquisition queue built from one identity batch alone. The two batches answer in different vocabularies; a queue built from either is built from half the answer.",
  inputs: [
    `${V1}/identity-resolution/batch-1/resolved.json`,
    `${V1}/identity-resolution/batch-2/resolved.json`,
    `${V1}/source-custody-reconciliation.json`
  ],
  nothingWasFetched: "Both batches resolved against committed indexes only. Egress to court and agency hosts is refused, and no form number was guessed. This reconciliation adds no research; it only makes the two answers comparable.",
  dispositionVocabulary: DISPOSITIONS,
  everyObligationCarriesExactlyOne: "An obligation matching no rule fails the generator rather than falling through to unresolved.",

  rowsTheCensusFlagged: custody.counts.SOURCE_IDENTITY_UNRESOLVED,
  rowsWorked: batch1.rows.length + batch2.rows.length,
  rowStatus,

  documentObligations: rows.length,
  byDisposition,
  summary: {
    closedNoWorkRemains: sum(closed),
    actionableSourceWork: sum(actionable),
    stillOpenNotASourceQuestion: byDisposition.LEGAL_DESIGN_DECISION_REQUIRED,
    stillOpenIdentity: byDisposition.UNRESOLVED_IDENTITY,
    acquisitionBlockedOnEgress: byDisposition.ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE,
    acquisitionBlockedOnEgressNote: "These have a known official target and cannot run until egress to issuing authorities is permitted. See docs/rcap/grade-a/route-obligation-census/ACQUISITION_EGRESS_PROBE.md."
  },

  whatThisDoesNotEstablish: [
    "that any held document is the current official edition",
    "that any document is approved for use, or any packet proven",
    "that any route may open, or any output be delivered",
    "that a LEGAL_DESIGN_DECISION_REQUIRED row can be closed by searching harder -- it cannot; it needs a decision"
  ],

  rows: rows.sort((a, b) =>
    a.worklistGroupId.localeCompare(b.worklistGroupId) ||
    String(a.obligation).localeCompare(String(b.obligation)) ||
    a.disposition.localeCompare(b.disposition))
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale. Run the reconciler.`); process.exit(1); }
  console.log(`source queue reconciliation current: ${rows.length} obligation(s) across ${doc.rowsWorked} row(s).`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
console.log(`  rows ${doc.rowsWorked}: ${rowStatus.fullyResolved} fully resolved, ${rowStatus.partiallyResolved} partially, ${rowStatus.unresolved} unresolved`);
console.log(`  obligations ${rows.length}:`);
for (const [k, v] of Object.entries(byDisposition).sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(3)}  ${k}`);
console.log(`\n  closed ${sum(closed)}, actionable ${sum(actionable)}, still open ${sum(stillOpen)}`);
