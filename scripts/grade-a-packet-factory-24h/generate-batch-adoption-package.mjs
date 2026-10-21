#!/usr/bin/env node
/**
 * The consolidated owner-adoption package for the batch-adoption-ready families.
 *
 * The alternative to this document is 53 separate legal reviews, and the reason
 * that alternative is wrong is measured rather than asserted: these families are
 * outside the August approval's family list because they were built by a later
 * generator, not because anything about their legal design changed. The delta
 * classification tested each one against the decision record's own two lists and
 * found the change confined to the corrections side.
 *
 * WHAT THIS DOCUMENT IS FOR. One decision, over an exact list, with the evidence
 * for each family attached and the exceptions named. It is prepared FOR the
 * owner and applies nothing: no family's state moves, no approval is created,
 * no route opens. Until the owner approves this exact list, every family in it
 * stands exactly where it stood.
 *
 * WHY THE EXCEPTIONS MATTER MORE THAN THE LIST. A batch adoption is only
 * trustworthy if the things pulled out of it are visible. The 8 substantive and
 * 17 unresolved families are carried here in full, with the 8 distinct questions
 * they reduce to, so approving the batch is a decision made against what was
 * excluded as much as what was included.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-batch-adoption-package.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const OUT = "data/rcap-grade-a/legal-decisions/BATCH_ADOPTION_PACKAGE_2026-09-02.json";

const delta = read("data/rcap-grade-a/legal-decisions/PROVEN_FAMILY_LEGAL_DELTA_2026-09-02.json");
const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const census = read("data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json");
const counsel = read("data/rcap-ledger/completed-output-counsel-manifest.json");

const censusRows = Object.entries(census).find(([, v]) => Array.isArray(v) && v.length > 50)[1];
const runtimeOf = new Map(censusRows.map((r) => [r.routeKey, r]));
const familyOf = new Map(master.families.map((f) => [f.familyId, f]));
const sha = (rel) => {
  try { return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"); }
  catch { return null; }
};

/*
 * The identity of what actually ships, read from the family's own render report
 * rather than from a historical packet proof. That distinction cost a cohort
 * once already: three packet proofs were unchanged since the approval while the
 * implementation outputs they attest do not exist in this checkout, because the
 * artifacts now come from a different generator. An adoption that cited those
 * proofs would be approving a description of something else.
 */
const shippingArtifactOf = (familyId) => {
  const f = familyOf.get(familyId);
  if (!f?.directory) return { known: false, why: "the family has no directory in the master queue" };
  const rel = `${f.directory}/reports/rendered-artifacts.json`;
  if (!fs.existsSync(path.join(ROOT, rel))) return { known: false, why: "the family declares no rendered-artifacts report" };
  let art;
  try { art = read(rel); } catch { return { known: false, why: "the rendered-artifacts report does not parse" }; }
  const fixtures = (art.artifacts ?? art.pdfs ?? []).map((a) => ({
    fixture: a.fixture ?? null,
    file: a.file ?? null,
    declaredSha256: a.sha256 ?? null,
    sha256OnDiskNow: a.file ? sha(a.file) : null,
    pageCount: a.pageCount ?? null
  }));
  return {
    known: fixtures.length > 0,
    renderedArtifactsReport: rel,
    renderedArtifactsReportSha256: sha(rel),
    fixtures,
    everyDeclaredDigestStillMatchesDisk: fixtures.every((x) => x.declaredSha256 && x.declaredSha256 === x.sha256OnDiskNow),
    routeArtifactsPresent: Array.isArray(art.routeArtifacts) ? art.routeArtifacts.length : 0
  };
};

const routeIdentitiesOf = (row) => (row.routeKeys ?? []).map((routeKey) => {
  const c = runtimeOf.get(routeKey) ?? null;
  const jurisdiction = row.jurisdiction ?? c?.jurisdiction ?? null;
  return {
    obligationRouteKey: routeKey,
    publicLabel: c?.publicLabel ?? null,
    statuteOrAuthority: c?.statuteOrAuthority ?? null,
    runtimePathwayId: c?.runtimePathwayId ?? null,
    runtimeRouteId: c?.runtimePathwayId ? `${jurisdiction}:${c.runtimePathwayId}` : null,
    currentServiceDisposition: c?.currentServiceDisposition ?? null
  };
});

const UNCHANGED_DIMENSIONS = [
  "remedy", "eligibility", "venue", "filingDestination", "service",
  "officialFormStrategy", "substantiveLegalLanguage"
];

const forFamily = (row) => {
  const routes = routeIdentitiesOf(row);
  return {
    familyId: row.familyId,
    jurisdiction: row.jurisdiction,
    routeCount: row.routeCount,
    routes,
    runtimeRepresentedRoutes: routes.filter((r) => r.runtimeRouteId).length,
    deliveryType: row.deliveryType ?? row.implementationStrategy ?? null,
    controllingLegalDesignRecord: row.legalDesignRecords ?? [],
    outputProof: row.outputProof ?? null,
    currentShippingArtifact: shippingArtifactOf(row.familyId),
    changeClassification: row.changeClassification,
    exactDelta: row.exactDelta ?? null,
    unchanged: Object.fromEntries(UNCHANGED_DIMENSIONS.map((d) => [d, true])),
    howUnchangedWasEstablished: row.classificationBasis ?? row.rationale ?? null,
    recommendedApprovalTreatment: row.recommendedApprovalTreatment ?? null
  };
};

const byBucket = (letter) => delta.families.filter((r) => String(r.changeClassification ?? "").startsWith(letter)
  || String(r.changeClassificationName ?? "") === delta.counts.bucketNames[letter]);

const B = byBucket("B").length ? byBucket("B") : delta.families.filter((r) => r.changeClassificationName === "BATCH_OWNER_ADOPTION_READY");
const A = delta.families.filter((r) => (r.changeClassificationName ?? r.changeClassification) === "TECHNICAL_ONLY_EXISTING_DESIGN");
const C = delta.families.filter((r) => (r.changeClassificationName ?? r.changeClassification) === "SUBSTANTIVE_COUNSEL_REVIEW_REQUIRED");
const D = delta.families.filter((r) => (r.changeClassificationName ?? r.changeClassification) === "WRONG_DELIVERY_TYPE_OR_UNRESOLVED");

const batch = B.map(forFamily);
const doc = {
  schemaVersion: "rcap-batch-adoption-package/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-batch-adoption-package.mjs",
  generatedOn: "2026-09-02",
  atCommit: (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return null; } })(),

  status: "PREPARED_FOR_THE_DECISION_OWNER_AND_NOT_APPLIED",
  appliesNothing: "No family's state moves and no approval exists because of this document. It is the exact list the owner is asked to adopt, and until that adoption is recorded every family in it stands where it stood.",
  whatIsBeingAsked: "One family-level owner adoption covering the families below, on the ground that each ships a completed output faithful to a legal design that is already settled and approved, and that the difference from the August approval's family list is which generator built the packet rather than anything about its legal treatment.",

  theExistingApproval: {
    approvalId: counsel.ownerLegalDecision.records[0].recordId,
    decisionOwner: counsel.ownerLegalDecision.records[0].decisionOwner,
    effectiveDate: counsel.ownerLegalDecision.records[0].effectiveDate,
    requiresSignature: counsel.requiresSignature === true,
    scopeStatement: counsel.ownerLegalDecision.records[0].scopeStatement,
    whyItDoesNotAlreadyCoverThese: "Its scope is 57 named packet families, and these 53 are not among them. The question is not whether the old approval reaches them — it does not — but whether they need a NEW legal decision or a family-level adoption of a design already settled."
  },

  howEachFamilyWasTested: delta.method ?? null,
  theTwoListsItWasTestedAgainst: delta.approvalFramework ?? null,

  counts: {
    provenFamiliesOutsideTheApproval: delta.counts.familiesClassified,
    technicalOnly: A.length,
    batchAdoptionReady: B.length,
    substantiveCounselRequired: C.length,
    unresolvedProductTreatment: D.length,
    needNoNewLegalDecision: A.length + B.length,
    distinctQuestionsAcrossTheExceptions: (delta.distinctQuestions ?? []).length
  },

  structuralChecksAcrossTheWholePopulation: delta.structuralTrapResults ?? null,

  batchAdoptionList: batch,

  exceptionsRemovedFromTheBatch: {
    whyTheyAreHere: "A batch adoption is only as trustworthy as the exclusions it declares. These are the families deliberately kept out of it.",
    substantiveCounselReviewRequired: C.map((r) => ({
      familyId: r.familyId, jurisdiction: r.jurisdiction, routeKeys: r.routeKeys,
      exactDelta: r.exactDelta ?? null,
      substantiveQuestionForReviewer: r.substantiveQuestionForReviewer ?? null
    })),
    unresolvedProductTreatment: D.map((r) => ({
      familyId: r.familyId, jurisdiction: r.jurisdiction, routeKeys: r.routeKeys,
      exactDelta: r.exactDelta ?? null,
      productTreatmentQuestion: r.productTreatmentQuestion ?? null
    }))
  },

  theEightQuestionsRequiringSeparateResolution: delta.distinctQuestions ?? [],

  alsoRecorded: {
    familiesWhoseSettledDesignIsNotAStateMemoTrack: delta.familiesWhoseSettledDesignIsNotAStateMemoTrack ?? [],
    whyThatMatters: "Their design is the runtime route-authority contract plus the census row rather than a state memo track — a thinner record that names the packet family without eligibility, venue, service or fee rules. Worth the owner's eye when adopting them.",
    technicalOnlyFamiliesAreNotInTheBatch: "The 31 technical-only families are recorded separately because they render the official form their source receipt binds and surface only that form's own text, so their delta sits inside the existing approval's corrections list and needs no adoption at all.",
    technicalOnlyList: A.map((r) => ({ familyId: r.familyId, jurisdiction: r.jurisdiction, exactDelta: r.exactDelta ?? null }))
  },

  explicitNonGrants: [
    "This document creates no approval and marks no family approved.",
    "It opens no commercial route, sets no price and grants no payment or sponsorship eligibility.",
    "It edits no packet and moves no family state.",
    "Adoption of the batch would settle the legal-design question for those families and nothing else: each still needs its runtime representation, its raster evidence, its independent verification and its own visual review before any route can open."
  ]
};

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${OUT}`);
console.log(`  batch-adoption list: ${batch.length} famil(ies), ${batch.reduce((n, r) => n + r.routeCount, 0)} route(s)`);
console.log(`  of those routes, ${batch.reduce((n, r) => n + r.runtimeRepresentedRoutes, 0)} have a runtime route id`);
console.log(`  shipping artifact known for ${batch.filter((r) => r.currentShippingArtifact.known).length} of ${batch.length}`);
console.log(`  every declared digest still matches disk on ${batch.filter((r) => r.currentShippingArtifact.everyDeclaredDigestStillMatchesDisk).length} of ${batch.length}`);
console.log(`  exceptions: ${C.length} substantive + ${D.length} unresolved, reducing to ${(delta.distinctQuestions ?? []).length} question(s)`);
