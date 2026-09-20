#!/usr/bin/env node
/**
 * Explaining why approved bytes moved must never be a way of approving them.
 *
 * THE INTERVAL THIS IS ABOUT
 *
 * The shared §7 Fees & costs correction moved the Mississippi non-conviction
 * artifacts Roger approved on 2026-09-20, which refused that approval and left
 * the route with no paid consumer authority. The repository still had to be
 * buildable enough to put the new digests in front of the owner, so a MOVE
 * RECORD accounted for the mismatch artifact by artifact and the generator
 * produced the route without its authority instead of halting.
 *
 * On 2026-09-20 the owner approved the moved bytes. The v3 successor decision
 * names them, the route's authority comes from that decision, and the interval
 * is over.
 *
 * WHY THE CONTROL IS NOT OVER
 *
 * The move record is still on disk. It is a readable document that explains why
 * approved bytes and composed bytes disagreed, and anything readable can be
 * mistaken for consent -- which is exactly what the owner named as the thing to
 * avoid: "do not create any state where 'expected renderer change' or
 * 'explained mismatch' counts as approval."
 *
 * So the question this file asks has inverted along with the world. It is no
 * longer "the explanation did not approve these bytes"; the owner since did. It
 * is now the harder one:
 *
 *   - the route's authority comes from the OWNER DECISION and from nothing else;
 *   - withdraw that decision and the route closes again, with the move record
 *     sitting right there, unable to substitute for it;
 *   - the explained-move path cannot even fire against the current decision,
 *     because a record accounting for one decision's digests cannot account for
 *     another's -- so it is structurally unreachable, not merely unused;
 *   - every superseded approval in the chain is preserved byte-for-byte;
 *   - and a move record edited to claim approval is still refused.
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
const { loadMsPaidConsumerSuccessor, MS_PAID_SUCCESSOR_DECISION_PATH, MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH,
  MS_PAID_SUCCESSOR_FIRST_DECISION_PATH } =
  await import("../src/lib/rcap/fulfillment/paid-consumer-successor.ts");
const { evaluateFulfillmentAuthority } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { msNonconvictionArtifactMove, MS_NONCONVICTION_ARTIFACT_MOVE_PATH } =
  await import("./lib/ms-nonconviction-artifact-move.mjs");

const ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";
const PROJECTION = "data/rcap-grade-a/fulfillment-authority-projection.json";

const failures = [];
// Counted rather than written down: a hard-coded total drifts the moment a
// control is added, and then the summary line is quietly wrong about how much
// was checked.
let ran = 0;
const check = (passed, message) => {
  ran += 1;
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};
const read = (rel) => fs.readFileSync(path.join(rootDir, rel));
const json = (rel) => JSON.parse(read(rel).toString("utf8"));
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// ------------------------------- the authority comes from the owner decision

const approval = loadMsPaidConsumerSuccessor(rootDir);
check(Boolean(approval) && approval.decisionId === "MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920-V3",
  `the route's paid consumer authority is the v3 owner decision (${approval?.decisionId ?? "none"})`);

const onDisk = {
  "full-en": digest(read("data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-en.pdf")),
  "full-es": digest(read("data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf")),
  "court-only": digest(read("data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-court-only.pdf"))
};
check(approval?.approvedArtifacts.every((entry) => onDisk[entry.id] === entry.sha256),
  "and it names the bytes that are actually on disk, artifact by artifact");

const record = json(REGISTRY).records.find((entry) => entry.routeId === ROUTE && !entry.supersededBy);
check(record?.evidenceBindings?.paidConsumerSuccessor?.decisionId === "MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920-V3",
  "the registry record binds that decision, not the move record");
check(!record?.evidenceBindings?.paidConsumerSuccessorAwaitingOwnerDecision,
  "the awaiting-owner-decision binding is gone, because the owner decided");
check(!record?.ownerDecisionPendingOnComposedArtifact,
  "and no pending-owner-decision refusal is left on the record");

const projected = json(PROJECTION).routes.find((entry) => entry.routeId === ROUTE);
check(!(projected?.missingProof ?? []).some((gap) => gap.startsWith("owner_decision:")),
  "the projection no longer reports an owner-decision gap");

// ------------------ withdraw the decision and the move record cannot stand in

/*
 * The core of it. The route is evaluated against a fully current observation --
 * the world after publication -- with the owner decision's binding removed and
 * NOTHING else changed. The move record is still on disk, still readable, still
 * explaining precisely why the bytes moved. If an explanation could substitute
 * for consent, this is where it would.
 */
const snapshot = json("data/rcap-grade-a/fulfillment-observation-snapshot.json");
const observed = snapshot.routes?.[ROUTE] ?? {};
const currentWorld = (rec) => ({
  ...observed,
  legalAuthority: {
    version: rec.legalAuthority?.version, status: rec.legalAuthority?.status,
    scopeSha256: rec.legalAuthority?.scopeSha256
  },
  packetSpecificationSha256: rec.packetSpecification?.sha256,
  officialSourceSha256ById: Object.fromEntries((rec.officialSources ?? []).map((s) => [s.sourceId, s.sha256])),
  provider: rec.provider,
  fixtureSha256: rec.fixture?.sha256,
  artifactSha256: rec.artifactValidation?.artifactSha256,
  visualReviewEvidenceSha256: rec.visualReview?.evidenceSha256,
  outputLegalApprovalScopeSha256: rec.outputLegalApproval?.scopeSha256,
  finalVerificationBoundInputsSha256: rec.finalVerification?.boundInputsSha256
});

const published = { ...record, provider: { ...record.provider, imageDigest: `sha256:${"a".repeat(64)}` } };
const openDecision = evaluateFulfillmentAuthority(published, currentWorld(published), ROUTE);
check(openDecision.state === "COMPLETE_PACKET_PROVEN",
  `with the owner decision, a published world proves the packet (${openDecision.state})`);

const withdrawn = structuredClone(published);
withdrawn.ownerDecisionPendingOnComposedArtifact = {
  recordPath: MS_NONCONVICTION_ARTIFACT_MOVE_PATH,
  recordSha256: digest(read(MS_NONCONVICTION_ARTIFACT_MOVE_PATH)),
  supersedesDecisionId: "MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920",
  movedArtifacts: [{ id: "full-en", approved: "0".repeat(64), composedNow: onDisk["full-en"] }]
};
const withdrawnDecision = evaluateFulfillmentAuthority(withdrawn, currentWorld(withdrawn), ROUTE);
check(withdrawnDecision.state !== "COMPLETE_PACKET_PROVEN"
  && withdrawnDecision.commercialStatus === "not_commercially_eligible",
  `without it, the same published world does not open the route (${withdrawnDecision.state})`);
check((withdrawnDecision.missingProof ?? []).some((gap) => gap.startsWith("owner_decision:")),
  "and the move record, sitting on disk and readable, does not substitute for the decision");

// ------------- the explained-move path cannot fire against the current decision

/*
 * Structural, not incidental.
 *
 * `msNonconvictionArtifactMove` accepts a move record only if it accounts for
 * the mismatch between a decision's approved digests and the bytes on disk. The
 * record on disk accounts for the SUPERSEDED decision's digests. Handed the
 * current one, its "from" side matches nothing and its "moved" flags are wrong,
 * so it is refused.
 *
 * That is what makes the fallback unreachable rather than merely unused: there
 * is no state in which the current decision is refused AND this record explains
 * why, because a record explaining one decision's drift cannot explain another's.
 */
check(msNonconvictionArtifactMove(rootDir, json(MS_PAID_SUCCESSOR_DECISION_PATH)) === null,
  "the move record cannot account for the CURRENT decision, so the explained-move path cannot fire for it");
check(Boolean(msNonconvictionArtifactMove(rootDir, json(MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH))),
  "it still accounts for the superseded one, which is the only thing it ever claimed to do");

// ------------------------------------------- custody of the superseded chain

const v2 = json(MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH);
const v1 = json(MS_PAID_SUCCESSOR_FIRST_DECISION_PATH);
const v3 = json(MS_PAID_SUCCESSOR_DECISION_PATH);
check(v3.supersedes.sha256 === digest(read(MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH))
  && v3.supersedes.priorDecisionMutated === false,
  "v3 names the exact bytes of the decision it supersedes, and says it did not edit them");
check(v2.supersedes.sha256 === digest(read(MS_PAID_SUCCESSOR_FIRST_DECISION_PATH))
  && v2.decisionId === "MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920",
  "v2 is preserved exactly, and still names v1 exactly: the chain is intact two links back");
check(v2.approvedArtifacts.every((entry) => entry.sha256 !== onDisk[entry.id] || entry.id === "court-only"),
  "v2 still names the bytes Roger approved THEN, not the bytes on disk now");
check(v1.packetContentsChanged === false,
  "and v1 is untouched at the end of the chain");

const moveRecord = json(MS_NONCONVICTION_ARTIFACT_MOVE_PATH);
check(moveRecord.createsApproval === false && moveRecord.approvesMovedBytes === false
  && moveRecord.opensAnyRoute === false && moveRecord.productionAuthorized === false,
  "the move record still disclaims approval in terms, now that one exists beside it");

// --------------------------- and it still cannot be edited into an approval

const movePath = path.join(rootDir, MS_NONCONVICTION_ARTIFACT_MOVE_PATH);
const original = fs.readFileSync(movePath);
const refusesWhen = (mutate, message) => {
  const mutated = JSON.parse(original.toString("utf8"));
  mutate(mutated);
  try {
    fs.writeFileSync(movePath, `${JSON.stringify(mutated, null, 2)}\n`);
    check(msNonconvictionArtifactMove(rootDir, v2) === null, message);
  } finally { fs.writeFileSync(movePath, original); }
};
refusesWhen((r) => { r.artifacts[0].to = "0".repeat(64); },
  "a record naming bytes that are not the bytes on disk explains nothing, and is refused");
refusesWhen((r) => { r.approvesMovedBytes = true; },
  "a move record that tries to approve its own bytes is refused rather than believed");
refusesWhen((r) => { r.awaitingOwnerDecision = false; },
  "and one that quietly stops saying it is waiting on an owner is refused too");

check(digest(fs.readFileSync(movePath)) === digest(original),
  "the move record is left exactly as it was found");

console.log(`\n${failures.length === 0
  ? `PASS — ${ran} controls; the authority is the owner decision, and an explanation still is not one`
  : `FAIL — ${failures.length} failing check(s)`}`);
for (const failure of failures) console.error(` - ${failure}`);
process.exit(failures.length === 0 ? 0 : 1);
