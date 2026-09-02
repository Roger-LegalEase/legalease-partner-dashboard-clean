#!/usr/bin/env node
/**
 * POST-WAVE-2 CLOSURE — the three dispatches the ledger implies, and the R4 install.
 *
 *   node scripts/grade-a-launch-control/generate-post-wave-2-closure.mjs
 *
 * Forty-three families were verified. Four passed, twenty-two need a named
 * repair, and seventeen are blocked on an input. The seventeen are not one
 * queue: thirteen are waiting on a filing fee somebody must look up, one on a
 * state legal-design review that does not exist, two on a family that is not
 * bound to a filing route, and exactly one on a question only counsel can
 * answer. Sending all seventeen to Lawrence would bury the one that is real.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`); };

const ledger = read("data/rcap-grade-a/launch-control/WAVE_2_VERIFICATION_LEDGER.json");
const LC = "data/rcap-grade-a/launch-control";

/* Raw returns, for the hashes a review batch has to carry verbatim. */
const raw = {};
for (const v of ["v1", "v2", "v3", "v4", "v5", "v6", "v7"]) {
  for (const row of read(`data/rcap-grade-a/wave-2/verification/${v}/rows.json`).rows) raw[row.itemId] = { shard: v.toUpperCase(), row };
}
const obligationValue = (familyId, namePattern) => {
  const po = raw[familyId].row.proofObligations;
  const entries = Array.isArray(po)
    ? po.map((e) => [e.obligation, e.value ?? e.observed, e.where ?? e.readFrom])
    : Object.entries(po).map(([k, v]) => [k, v.observed ?? v.value, v.readFrom ?? v.where]);
  const hit = entries.find(([n]) => namePattern.test(n));
  return hit ? { observed: hit[1], readFrom: hit[2] } : null;
};

/* ---- Lawrence exact-hash review batch 1: the four that passed ------------- */
const passRows = ledger.rows.filter((r) => r.verdict === "PASS");
const batch1 = {
  schemaVersion: "rcap-grade-a-lawrence-review-batch/v1",
  batch: 1,
  generatedBy: "scripts/grade-a-launch-control/generate-post-wave-2-closure.mjs",
  reviewer: "Lawrence (counsel)",
  reviewKind: "EXACT_HASH_OUTPUT_REVIEW",
  what: "The four packet families that passed independent verification, each with the exact source and artifact hashes the verifier independently recomputed. The review is against these hashes: an artifact whose hash differs is a different artifact and is outside this batch.",
  whatApprovalHereDoes: "An approval closes the output-approval gate for the exact hashes named. It opens no commercial route by itself: COMPLETE_PACKET_PROVEN additionally requires product-path proof, which no family has.",
  whatApprovalHereDoesNotDo: [
    "It does not approve any other hash, fixture or revision of the same family.",
    "It does not approve the other thirty-nine families, none of which passed.",
    "It creates no fulfillment record and opens no checkout."
  ],
  families: passRows.map((r) => ({
    family: r.family,
    shard: r.shard,
    returnCommit: r.returnCommit,
    verdict: r.verdict,
    obligationsEvaluated: r.exactEvidence.obligationsEvaluated,
    obligationsPassed: r.exactEvidence.obligationsPassed,
    preflight: r.exactEvidence.preflight,
    sourceIdentitiesAndHashes: obligationValue(r.family, /source identit/i),
    canonicalAndBoundaryArtifactHashes: obligationValue(r.family, /canonical and boundary/i),
    routeIdentity: obligationValue(r.family, /exact route identity/i),
    packetFamilyIdentity: obligationValue(r.family, /exact packet-family identity/i)
  })),
  count: passRows.length
};
writeJson(`${LC}/LAWRENCE_REVIEW_BATCH_1.json`, batch1);

/* ---- Repair assignments: twenty-two, each with its own decisive defect ---- */
const repairRows = ledger.rows.filter((r) => r.verdict === "FAIL_REPAIR_REQUIRED");
const repairs = {
  schemaVersion: "rcap-grade-a-wave-2-repair-assignments/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-post-wave-2-closure.mjs",
  what: "One repair assignment per failing family, scoped to the obligation the verification actually turned on. A repair lane that is handed a whole family instead of a defect rebuilds what already passed.",
  rule: "Repair only the decisive defect and anything it strictly requires. Re-verify on the same shard against the same obligations. A repair that changes a hash a review batch already carries must say so.",
  commercialRule: "No repair opens a commercial route, and none may set generationAllowed or runtimeSelectable.",
  byDecisiveObligation: repairRows.reduce((acc, r) => ({ ...acc, [r.decisiveObligation]: (acc[r.decisiveObligation] ?? 0) + 1 }), {}),
  count: repairRows.length,
  assignments: repairRows.map((r) => ({
    family: r.family,
    shard: r.shard,
    returnCommit: r.returnCommit,
    decisiveObligation: r.decisiveObligation,
    defect: r.exactBlockerOrDefect,
    evidence: r.exactEvidence,
    owner: r.requiredNextOwner,
    action: r.requiredNextAction,
    reverifyOn: r.shard,
    ownedPath: `data/rcap-all50/overlays/census-v1/**/${r.family.replace(/_/g, "-").replace(/-set$/, "-set")}*`
  }))
};
writeJson(`${LC}/WAVE_2_REPAIR_ASSIGNMENTS.json`, repairs);

/* ---- Legal-input assignments: seventeen, routed by what is actually missing */
const legalRows = ledger.rows.filter((r) => r.verdict === "BLOCKED_LEGAL_APPROVAL_INPUT");
const OWNERS = {
  MISSING_LEGAL_REVIEW_RECORD: { owner: "state legal-design review lane", lawrence: false },
  MISSING_ARTIFACT_SPECIFIC_APPROVAL_INPUT: { owner: "source and operations: current fee schedule for the exact court", lawrence: false },
  MISSING_ROUTE_FAMILY_BINDING: { owner: "Captain route/family binding", lawrence: false },
  GENUINE_NARROW_LEGAL_QUESTION: { owner: "Lawrence (counsel)", lawrence: true }
};
const legal = {
  schemaVersion: "rcap-grade-a-wave-2-legal-input-assignments/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-post-wave-2-closure.mjs",
  what: "The seventeen families blocked on an input, split by what the input actually is.",
  whyNotOneQueue: ledger.doNotSendAllSeventeen,
  count: legalRows.length,
  toLawrence: legalRows.filter((r) => r.sendToLawrence).length,
  notToLawrence: legalRows.filter((r) => !r.sendToLawrence).length,
  groups: Object.entries(OWNERS).map(([cls, meta]) => ({
    class: cls,
    owner: meta.owner,
    sendToLawrence: meta.lawrence,
    count: legalRows.filter((r) => r.legalInputClass === cls).length,
    families: legalRows.filter((r) => r.legalInputClass === cls).map((r) => ({
      family: r.family, shard: r.shard, decisiveObligation: r.decisiveObligation,
      blocker: r.exactBlockerOrDefect, evidence: r.exactEvidence.readFrom,
      why: r.legalInputWhy, action: r.requiredNextAction
    }))
  }))
};
writeJson(`${LC}/WAVE_2_LEGAL_INPUT_ASSIGNMENTS.json`, legal);

/* ---- R4: install the acquisition receipts as a controlling wave-2 record --- */
const r4acq = read("data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/acquired.json");
const r4rows = read("data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/rows.json").rows;
const install = {
  schemaVersion: "rcap-grade-a-source-acquisition-receipt/v2",
  assignmentId: "R4_SOURCE_IDENTITY_AND_ACQUISITION",
  installedBy: "the Wave 2 closure integration",
  what: "The Wave 2 acquisition receipts, installed as the controlling wave-2 acquisition record.",
  custodyTruth:
    "These are receipts, not custody. Each body was retrieved and hashed by the worker and none was committed; the private inventory was not mounted, so nothing was promoted into the corpus. They are therefore NOT counted as held sources and must not be cited as corpus custody.",
  documentsAcquired: r4acq.acquired.length,
  records: r4acq.acquired.map((a) => ({ ...a, bodyCommitted: false, promotedToCorpus: false, custodyClass: "RECEIPT_ONLY_BODY_NOT_HELD" })),
  escalations: r4acq.stopped,
  inventoryPromotion: r4acq.inventoryPromotion,
  identitiesResolved: {
    count: r4rows.filter((r) => r.status === "COMPLETED").length,
    finding: "Every resolved identity claimed RESOLVED_FROM_COMMITTED_RECORD and each was checked against the committed record during the Wave 2 integration; twelve of twelve resolve, so no controlling file needed changing.",
    verifiedIn: "data/rcap-grade-a/wave-2/integration/applied.json alreadyCorrect[] lane=R4"
  },
  grantsNothing: "An acquisition receipt proves a document was retrieved and hashed. It approves no artifact, binds no source to a route and opens no commercial route.",
  commercialRoutesOpened: 0,
  productionTouched: false
};
writeJson("data/rcap-grade-a/source-acquisition/wave-2/acquired.json", install);

console.log(`Lawrence batch 1: ${batch1.count} families`);
console.log(`repair assignments: ${repairs.count} — ${JSON.stringify(repairs.byDecisiveObligation)}`);
console.log(`legal-input assignments: ${legal.count} (${legal.toLawrence} to Lawrence, ${legal.notToLawrence} elsewhere)`);
console.log(`R4 acquisition receipts installed: ${install.documentsAcquired}; identities verified: ${install.identitiesResolved.count}`);
