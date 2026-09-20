#!/usr/bin/env node
/**
 * Explaining why approved bytes moved must never be a way of approving them.
 *
 * The Fees & Costs slot correction is shared-renderer work, so it moved the
 * Mississippi non-conviction artifacts Roger approved on 2026-09-20. The
 * approval is untouched and now simply does not describe what the product
 * composes; `loadMsPaidConsumerSuccessor` refuses it for exactly that reason.
 *
 * The authority generator used to die on that refusal, which is safe and
 * unusable: the repository has to be buildable enough to put the new digests in
 * front of the owner. So a MOVE RECORD accounts for the mismatch artifact by
 * artifact and the generator produces the route without its paid consumer
 * authority instead of halting.
 *
 * That record is the dangerous object in this change. It exists to be read, and
 * anything readable can be mistaken for consent. This control holds the
 * boundary:
 *
 *   - the move does not restore the approval;
 *   - the route carries no paid consumer authority and is not commercially
 *     eligible;
 *   - the refusal is stated on the record, ahead of any observation, so
 *     publication cannot clear it;
 *   - a fresh, fully current observation does not clear it either;
 *   - the record itself disclaims approval in terms;
 *   - and a mismatch the record does NOT account for still halts the build.
 *
 *   node scripts/test-explained-artifact-move-is-not-approval.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { loadMsPaidConsumerSuccessor } = await import("../src/lib/rcap/fulfillment/paid-consumer-successor.ts");
const { evaluateFulfillmentAuthority } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { msNonconvictionArtifactMove, MS_NONCONVICTION_ARTIFACT_MOVE_PATH } =
  await import("./lib/ms-nonconviction-artifact-move.mjs");

const ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const DECISION = "data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json";
const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";
const PROJECTION = "data/rcap-grade-a/fulfillment-authority-projection.json";

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};
const read = (rel) => fs.readFileSync(path.join(rootDir, rel));
const json = (rel) => JSON.parse(read(rel).toString("utf8"));
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const decision = json(DECISION);
const move = msNonconvictionArtifactMove(rootDir, decision);
check(Boolean(move), "the move record accounts for the mismatch that is actually on disk");
if (!move) {
  console.log("\nFAIL — the rest of this control has nothing to measure");
  process.exit(1);
}

// ----------------------------------------------- the move restores nothing

check(loadMsPaidConsumerSuccessor(rootDir) === null,
  "the owner approval is still refused: recording why the bytes moved does not un-move them");

check(move.createsApproval === false && move.approvesMovedBytes === false
  && move.opensAnyRoute === false && move.productionAuthorized === false
  && move.awaitingOwnerDecision === true,
  "the move record disclaims approval in terms, and says it is waiting on one");

check(move.supersedes.decisionMutated === false
  && digest(read(DECISION)) === move.supersedes.sha256,
  "the superseded approval is preserved byte-for-byte, not edited into agreement");

const stillApproved = decision.approvedArtifacts.every((entry) => {
  const moved = move.artifacts.find((row) => row.id === entry.id);
  return moved && moved.from === entry.sha256;
});
check(stillApproved, "and it still names the bytes Roger actually approved");

// ------------------------------------------- the route holds, and says why

const record = json(REGISTRY).records.find((entry) => entry.routeId === ROUTE);
check(Boolean(record), "the registry still carries a record for the route");
check(!record.evidenceBindings?.paidConsumerSuccessor,
  "the record carries no paid consumer successor binding");
check(record.evidenceBindings?.paidConsumerSuccessorAwaitingOwnerDecision?.consumerPaidAuthorized === false,
  "what it carries instead says the paid consumer authority is not granted");
check(record.ownerDecisionPendingOnComposedArtifact?.recordPath === MS_NONCONVICTION_ARTIFACT_MOVE_PATH,
  "and the pending owner decision is on the record the authority reads, not only in a document beside it");

const projected = json(PROJECTION).routes.find((entry) => entry.routeId === ROUTE);
check(projected?.commercialStatus === "not_commercially_eligible",
  `the route is not commercially eligible (${projected?.commercialStatus})`);
check((projected?.missingProof ?? []).some((gap) => gap.startsWith("owner_decision:")),
  "and the projection says the owner decision is what is missing, rather than leaving it to be inferred");

// ------------------------- a current world does not turn the hold into a yes

/*
 * The state the repository will be in after the next publication: every
 * provider and observation input current. If the hold were an observation-time
 * concern this is where it would evaporate.
 */
const snapshot = json("data/rcap-grade-a/fulfillment-observation-snapshot.json");
const observed = snapshot.routes?.[ROUTE] ?? {};
const published = { ...record, provider: { ...record.provider, imageDigest: `sha256:${"a".repeat(64)}` } };
const observation = {
  ...observed,
  legalAuthority: {
    version: published.legalAuthority?.version,
    status: published.legalAuthority?.status,
    scopeSha256: published.legalAuthority?.scopeSha256
  },
  packetSpecificationSha256: published.packetSpecification?.sha256,
  officialSourceSha256ById: Object.fromEntries(
    (published.officialSources ?? []).map((source) => [source.sourceId, source.sha256])),
  provider: published.provider,
  fixtureSha256: published.fixture?.sha256,
  artifactSha256: published.artifactValidation?.artifactSha256,
  visualReviewEvidenceSha256: published.visualReview?.evidenceSha256,
  outputLegalApprovalScopeSha256: published.outputLegalApproval?.scopeSha256,
  finalVerificationBoundInputsSha256: published.finalVerification?.boundInputsSha256
};
const decided = evaluateFulfillmentAuthority(published, observation, ROUTE);
check(decided.state !== "COMPLETE_PACKET_PROVEN" && decided.commercialStatus === "not_commercially_eligible",
  `a fully current observation does not open the route (${decided.state})`);
check((decided.missingProof ?? []).some((gap) => gap.startsWith("owner_decision:")),
  "and the owner decision is still what it is waiting for");

// ---------------------------- an unexplained mismatch is still unexplained

const tampered = JSON.parse(JSON.stringify(move));
tampered.artifacts[0].to = "0".repeat(64);
const tamperedPath = path.join(rootDir, MS_NONCONVICTION_ARTIFACT_MOVE_PATH);
const original = fs.readFileSync(tamperedPath);
try {
  fs.writeFileSync(tamperedPath, `${JSON.stringify(tampered, null, 2)}\n`);
  check(msNonconvictionArtifactMove(rootDir, decision) === null,
    "a record naming bytes that are not the bytes on disk explains nothing, and is refused");
} finally {
  fs.writeFileSync(tamperedPath, original);
}

const claimsApproval = JSON.parse(JSON.stringify(move));
claimsApproval.approvesMovedBytes = true;
try {
  fs.writeFileSync(tamperedPath, `${JSON.stringify(claimsApproval, null, 2)}\n`);
  check(msNonconvictionArtifactMove(rootDir, decision) === null,
    "a move record that tries to approve its own bytes is refused rather than believed");
} finally {
  fs.writeFileSync(tamperedPath, original);
}

check(digest(fs.readFileSync(tamperedPath)) === digest(original),
  "the move record is left exactly as it was found");

console.log(`\n${failures.length === 0
  ? `PASS — ${11 + 4} controls; an explanation is not an approval`
  : `FAIL — ${failures.length} failing check(s)`}`);
for (const failure of failures) console.error(` - ${failure}`);
process.exit(failures.length === 0 ? 0 : 1);
