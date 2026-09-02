#!/usr/bin/env node
/**
 * The first Grade-A route cohort: which routes qualify, and what each still owes.
 *
 * The cohort is an INTERSECTION, not a pick. A route enters only when all eight
 * owner conditions hold, and the interesting result is how small that makes it:
 * 112 families are COMPLETE_PACKET_PROVEN and 57 are inside the decision owner's
 * completed-output legal approval, but only THREE are in both. The 57 approved
 * families are largely the older guidance-implementation wave; the 112 proven
 * ones are largely the newer census-v1 packet families. The overlap is the
 * cohort, and the gap is the honest answer to "why not more".
 *
 * WHAT THIS RECORD DOES NOT DO. It creates no fulfilment record, opens no route
 * and sets no price. It names the routes that could become sellable once the one
 * genuinely human proof -- a page-by-page visual review by a named reviewer --
 * is returned, and it records exactly which conditions each route already meets.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-first-cohort-selection.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const OUT = "data/rcap-grade-a/FIRST_ROUTE_COHORT.json";

const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const returns = read("data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json");
const raster = read("data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json");
const counsel = read("data/rcap-ledger/completed-output-counsel-manifest.json");
/*
 * Condition seven, decided by reading and recorded where it can be checked.
 *
 * Whether a post-approval change was substantive is a reading of diffs against
 * the decision record's own two lists, so no script can compute it -- but a
 * script must not therefore ignore it, which would let a family into the cohort
 * on the strength of an approval that does not reach its current output. The
 * reading lives in POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json, and a family
 * with no entry there is NOT covered: silence is a missing reading, never a
 * pass. That default is what keeps a newly proven family from drifting into a
 * cohort behind an old approval nobody re-read it against.
 */
const postApprovalAudit = (() => {
  try { return read("data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json"); }
  catch { return { families: [] }; }
})();
const auditVerdict = new Map((postApprovalAudit.families ?? []).map((r) => [r.familyId, r]));
/*
 * THE BUNDLE INDEX LIVES IN /tmp, SO ITS ABSENCE MUST SAY WHICH ABSENCE IT IS.
 *
 * This read used to collapse to `null`, and `null` rendered as `bundles: []`
 * with `totalPages: null` -- indistinguishable from a cohort that genuinely has
 * no review bundles. /tmp does not survive the session, so the record would
 * have quietly reported "no visual review material" for a cohort whose bundles
 * were simply somewhere this run could not see. That is the same shape as the
 * condition-seven defect: silence read as a finding rather than as a missing
 * reading, and it is worse here because visual review is the one condition
 * nothing in this repository may satisfy on its own.
 */
const bundleIndex = (() => {
  try { return JSON.parse(fs.readFileSync("/tmp/vrb-html/INDEX.json", "utf8")); }
  catch (e) { return { unreadableHere: e.code === "ENOENT" ? "absent" : String(e.code ?? e.message) }; }
})();

/*
 * A ROUTE KEY IS NOT A REACHABLE ROUTE.
 *
 * The eight conditions are measured per FAMILY, so the cohort's route figure
 * was simply the sum of the members' route keys: thirteen. Only five of those
 * thirteen can be reached by the runtime. Kansas contributes two municipal
 * pathways compiled under the owner's standing authorisation; Tennessee
 * contributes three of its eleven, and its remaining eight are track-only --
 * they carry no compiled pathway, so packet-route-resolver.ts can form no
 * `${jurisdiction}:${pathwayId}` for them and screening cannot address them at
 * all. Reporting thirteen invites the reading that thirteen routes are one
 * visual review away from sellable, and eight of them are not.
 *
 * Two independent records must agree before a route is counted addressable:
 * the key itself must be a track-pathway key, and FIRST_COHORT_RUNTIME_IDENTITY
 * must name its runtime route id. Either one alone is a single record vouching
 * for itself. A disagreement is reported rather than resolved -- silently
 * preferring one would hide exactly the drift this cross-check exists to find.
 */
const runtimeIdentity = (() => {
  try { return read("data/rcap-grade-a/FIRST_COHORT_RUNTIME_IDENTITY.json"); } catch { return null; }
})();
const runtimeRouteIds = new Set([
  ...(runtimeIdentity?.tennessee?.runtimeRouteIds ?? []).map((r) => r.obligationKey),
  ...(runtimeIdentity?.kansas?.runtimeRouteIds ?? []).map((r) => r.obligationKey)
].filter(Boolean));
/* Kansas records its two pathways as compiled profile ids rather than
 * obligation keys, so its keys are matched on the pathway segment they end
 * with -- the same segment the profile compiles. */
const kansasCompiled = new Set(runtimeIdentity?.kansas?.compiledPathwaysInTheKansasProfile ?? []);
const routeAddressability = (routeKey) => {
  const isTrackPathway = routeKey.startsWith("obligation:track-pathway:");
  const pathwaySegment = routeKey.split(":").slice(4).join(":");
  const namedByTheRuntimeRecord = runtimeRouteIds.has(routeKey)
    || (isTrackPathway && kansasCompiled.has(pathwaySegment));
  return {
    routeKey,
    isTrackPathway,
    namedByTheRuntimeRecord,
    addressable: isTrackPathway && namedByTheRuntimeRecord,
    recordsDisagree: isTrackPathway !== namedByTheRuntimeRecord
  };
};

const decision = counsel.ownerLegalDecision.records[0];
const approvedFamilies = new Set(counsel.families.map((r) => r.familyId));
const verdictOf = new Map();
for (const r of returns.rows ?? []) if (r.isIndependentVerification && r.verdict && !r.superseded) verdictOf.set(r.familyId, r);
const rasterOf = new Map(raster.rows.map((r) => [r.familyId, r]));
const sha = (rel) => { try { return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"); } catch { return null; } };

const proven = master.families.filter((f) => f.state === "COMPLETE_PACKET_PROVEN");

const evaluate = (f) => {
  const v = verdictOf.get(f.familyId) ?? null;
  const r = rasterOf.get(f.familyId) ?? null;
  return {
    packetProven: f.state === "COMPLETE_PACKET_PROVEN",
    verdictCurrentAndDeclaresItsBase: v?.verdict === "PASS_COMPLETE_INDEPENDENT"
      && /^[0-9a-f]{7,40}$/.test(String(v?.verifiedAtBase ?? "")),
    rasterReceiptStillBindsTheBytes: r?.currentRasterState === "RASTER_PASS"
      && r?.coverage?.complete === true
      && r?.rasterReceipt?.boundToCanonicalSha256 === r?.canonicalPdfSha256
      && r?.rasterReceipt?.boundToBoundarySha256 === r?.boundaryPdfSha256,
    routeToFamilyBindingExact: (f.routeKeys ?? []).length > 0 && fs.existsSync(path.join(ROOT, f.directory, "product-wiring.json")),
    sourceIdentityComplete: f.sourceBound === true || f.sourceReadiness?.ready === true,
    coveredByAnExistingOwnerApproval: approvedFamilies.has(f.familyId),
    noSubstantiveLegalChangeSinceThatApproval: auditVerdict.get(f.familyId)?.verdict === "COVERED_BY_EXISTING_APPROVAL",
    noHoldApplies: f.legalInputStatus !== "OPEN_LEGAL_INPUT" && (f.holds ?? []).length === 0 && !f.laneReturnLegalHold
  };
};

const rows = proven.map((f) => {
  const checks = evaluate(f);
  const unmet = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  const row = counsel.families.find((x) => x.familyId === f.familyId) ?? null;
  const v = verdictOf.get(f.familyId) ?? null;
  return {
    familyId: f.familyId,
    jurisdiction: f.jurisdiction,
    routeKeys: f.routeKeys ?? [],
    routeCount: (f.routeKeys ?? []).length,
    deliveryType: f.implementationStrategy ?? null,
    checks,
    unmetConditions: unmet,
    inCohort: unmet.length === 0,
    independentVerification: v ? { verdict: v.verdict, verifierId: v.lane, verifiedAtBase: v.verifiedAtBase } : null,
    legalApproval: row ? {
      legalApprovalResult: decision.legalApprovalResult,
      legalDecisionRecordId: decision.recordId,
      legalDecisionOwner: decision.decisionOwner,
      legalDecisionEffectiveDate: decision.effectiveDate,
      requiresSignature: counsel.requiresSignature === true,
      adoptedLegalDesignRecord: row.adoptedLegalDesignRecord ?? null,
      packetProofPath: row.packetProofPath ?? null,
      packetProofSha256Recorded: row.packetProofSha256 ?? null,
      packetProofSha256Now: row.packetProofPath ? sha(row.packetProofPath) : null,
      legalDesignMemoSha256Recorded: row.legalDesignMemoSha256 ?? null,
      legalDesignMemoSha256Now: row.legalDesignMemoPath ? sha(row.legalDesignMemoPath) : null
    } : null
  };
});

const cohort = rows.filter((r) => r.inCohort);
const outsideApproval = rows.filter((r) => !r.checks.coveredByAnExistingOwnerApproval);

const doc = {
  schemaVersion: "rcap-first-route-cohort/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-first-cohort-selection.mjs",
  atCommit: (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return null; } })(),
  createsCommercialAuthority: false,
  opensAnyRoute: false,
  paymentRemainsFailClosed: true,
  theEightConditions: [
    "the packet family is COMPLETE_PACKET_PROVEN",
    "its fifteen-obligation independent verdict is current and declares its review base",
    "its packet bytes and raster receipt remain current, canonical and boundary alike",
    "its route-to-family binding is exact and a wiring record exists",
    "its source identity and currentness are complete",
    "its legal design and output are covered by an existing decision-owner approval",
    "no substantive legal change occurred after that approval, read against the decision record's own two lists",
    "no repair, source, legal, problematic-PDF or maintenance hold applies"
  ],
  conditionSevenIsReadRatherThanComputed: "Whether a post-approval change was substantive is a reading of diffs against the decision record's own two lists, not something this script can compute. The reading is recorded in data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json and consulted here. A family with no entry there fails the condition: silence is a missing reading, never a pass.",
  whyAnUnchangedPacketProofIsNotEnough: "All three candidates' packetProofSha256 are unchanged, and that proves less than it appears to. The proofs attest implementation outputs under src/lib/rcap/packets/jurisdictions/ and scripts/verify-rcap-*-custom-pleading.mjs, and none of those paths exists in this checkout — the shipping artifacts come from the census-v1 generator. They are unchanged because nothing touched them. So a v2 record's packetSpecification must be bound to the census-v1 artifact that actually ships, never to the stale proof.",
  postApprovalAudit: (postApprovalAudit.families ?? []).map((r) => ({ familyId: r.familyId, verdict: r.verdict, mayEnterTheFirstCohort: r.mayEnterTheFirstCohort })),
  counts: {
    completePacketProven: proven.length,
    familiesInsideTheOwnerApproval: approvedFamilies.size,
    provenAndApproved: rows.filter((r) => r.checks.coveredByAnExistingOwnerApproval).length,
    inCohort: cohort.length,
    cohortRoutes: cohort.reduce((n, r) => n + r.routeCount, 0),
    provenButOutsideAnyExistingApproval: outsideApproval.length
  },
  /* Counted rather than narrated, because the prose went stale the first time
   * the population moved: it still said 112 proven after the owner's
   * withholdings had taken it to 85. A sentence that carries its own figures
   * cannot drift from the numbers beside it. */
  whyTheCohortIsSmall: `The decision owner's completed-output approval covers ${approvedFamilies.size} families and ${proven.length} families are packet-proven, but they are largely different populations: the approval covers the earlier guidance-implementation wave and the proof covers the later census-v1 packet wave, so only the ${rows.filter((r) => r.checks.coveredByAnExistingOwnerApproval).length} in both can enter a first cohort without a new legal decision. The proven figure is also lower than it was: the owner's batch adoption refused sixteen families as the wrong delivery type and withheld nine more pending named corrections, and those families are correctly not proven.`,
  cohort: cohort.map((r) => ({ ...r, checks: undefined, unmetConditions: undefined })),
  cohortRouteIds: cohort.flatMap((r) => r.routeKeys),
  routeReachability: (() => {
    const all = cohort.flatMap((r) => r.routeKeys).map(routeAddressability);
    return {
      whatThisSeparates: "A route key names work this factory did. A runtime route id is what screening and the Briefcase resolve. Only a route with both can be sold once a visual review returns; a track-only route cannot be addressed at all, however complete its packet.",
      routeKeysInTheCohort: all.length,
      addressableByTheRuntime: all.filter((r) => r.addressable).length,
      notAddressableByTheRuntime: all.filter((r) => !r.addressable).length,
      addressable: all.filter((r) => r.addressable).map((r) => r.routeKey),
      notAddressable: all.filter((r) => !r.addressable).map((r) => r.routeKey),
      recordsDisagreeOn: all.filter((r) => r.recordsDisagree).map((r) => r.routeKey),
      whenTheRecordsDisagree: "The route key's own shape and FIRST_COHORT_RUNTIME_IDENTITY.json are read independently. A route listed here is counted NOT addressable and the disagreement is the finding: one of the two records is stale."
    };
  })(),
  provenFamiliesNeedingANewLegalReview: outsideApproval.map((r) => ({
    familyId: r.familyId, jurisdiction: r.jurisdiction, routeCount: r.routeCount,
    whyNotInCohort: "packet-proven but not named in any existing decision-owner approval scope"
  })),
  visualReview: {
    state: "awaiting_a_named_reviewer",
    whyItCannotBeInferred: "Every other Grade-A condition is a measurement this factory can make. This one is not: it asks whether a human judges each rendered page fit to file. Nothing in the repository may set it to passed.",
    bundleIndexWasReadable: !bundleIndex.unreadableHere,
    whyThatFieldExists: "The bundle index is written to /tmp, which does not survive the session. An empty bundle list therefore has two meanings -- no bundles were built, or this run could not see the ones that were -- and only this field separates them. A record that cannot tell them apart reports the wrong one silently.",
    bundleIndexUnreadableBecause: bundleIndex.unreadableHere ?? null,
    bundles: bundleIndex.bundles?.map((b) => ({ familyId: b.familyId, fixture: b.fixtureKind, pages: b.pages, fixtureSha256: b.fixtureSha })) ?? null,
    totalPages: bundleIndex.totalPages ?? null,
    theseAreFamilyAssemblyBundles: "These bundles render the family ASSEMBLIES. The five routes the runtime can address are reviewed from their own route-scoped artifacts, delivered as the offline review packages, and a family bundle is not a substitute for one."
  },
  remainingOwnerAction: "One page-by-page visual review of the cohort bundles by a named reviewer, and then the owner-controlled nationwide delivery flip. Neither is performed here.",
  allRows: rows
};

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`wrote ${OUT}`);
console.log(`  proven ${doc.counts.completePacketProven} · approved ${doc.counts.familiesInsideTheOwnerApproval} · both ${doc.counts.provenAndApproved} · cohort ${doc.counts.inCohort} famil(ies) / ${doc.counts.cohortRoutes} route key(s), ${doc.routeReachability.addressableByTheRuntime} addressable by the runtime`);
for (const r of cohort) console.log(`    ${r.familyId.padEnd(28)} ${String(r.routeCount).padStart(2)} route(s)  verifier ${r.independentVerification.verifierId}`);
console.log(`  proven but outside any existing approval: ${doc.counts.provenButOutsideAnyExistingApproval}`);
