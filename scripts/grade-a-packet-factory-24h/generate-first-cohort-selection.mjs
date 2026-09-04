#!/usr/bin/env node
/**
 * The first Grade-A route cohort: which routes qualify, and what each still owes.
 *
 * The cohort is an INTERSECTION, not a pick. A route enters only when all eight
 * owner conditions hold. Approval may come from the August completed-output
 * manifest or the September exact-digest batch adoption, but neither source is
 * enough on its own: the approval must still bind the family, the condition-seven
 * audit must name that same approval, and every other condition must also hold.
 *
 * WHAT THIS RECORD DOES NOT DO. It creates no fulfilment record, opens no route
 * and sets no price. It names the routes that could become sellable once the one
 * genuinely human proof -- a page-by-page visual review by a named reviewer --
 * is returned, and it records exactly which conditions each route already meets.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-first-cohort-selection.mjs
 */
import assert from "node:assert/strict";
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
const batchAdoption = read("data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json");
const masterFamilyOf = new Map(master.families.map((family) => [family.familyId, family]));
const sha = (rel) => { try { return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"); } catch { return null; } };
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
 * The eight conditions are measured per FAMILY, while screening and the
 * Briefcase address a `${jurisdiction}:${pathwayId}`. A family route key is
 * therefore counted separately from a runtime-addressable route: track-only
 * keys and track-pathway keys with no exact canonical census mapping remain
 * unreachable however complete the family packet may be.
 *
 * Two independent records must agree before a route is counted addressable:
 * the key itself must be a track-pathway key, and the canonical route census
 * must map that exact key to the pathway segment it names. Either one alone is
 * a single record vouching for itself. A missing, duplicated or mismatched
 * census row fails closed and is reported as disagreement rather than guessed.
 *
 * This deliberately consumes the existing crosswalk instead of restating a
 * jurisdiction list here. FIRST_COHORT_RUNTIME_IDENTITY is a dated KS/TN
 * investigation record, not the canonical population-wide route mapping; using
 * it as an allowlist made every later cohort jurisdiction falsely unreachable.
 */
const routeCensus = (() => {
  try { return read("data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json"); }
  catch { return { routes: [] }; }
})();
const censusRowsByRouteKey = new Map();
for (const row of routeCensus.routes ?? []) {
  if (typeof row?.routeKey !== "string" || !row.routeKey) continue;
  censusRowsByRouteKey.set(row.routeKey, [...(censusRowsByRouteKey.get(row.routeKey) ?? []), row]);
}
const routeAddressability = (routeKey) => {
  const segments = routeKey.split(":");
  const isTrackPathway = segments[0] === "obligation"
    && segments[1] === "track-pathway"
    && segments.length >= 5;
  const jurisdiction = segments[2] ?? null;
  const trackId = segments[3] ?? null;
  const pathwaySegment = segments.slice(4).join(":");
  const censusRows = censusRowsByRouteKey.get(routeKey) ?? [];
  const censusRow = censusRows.length === 1 ? censusRows[0] : null;
  const namedByTheRuntimeRecord = Boolean(
    isTrackPathway
    && censusRow
    && censusRow.jurisdiction === jurisdiction
    && censusRow.trackId === trackId
    && typeof censusRow.runtimePathwayId === "string"
    && censusRow.runtimePathwayId.length > 0
    && censusRow.runtimePathwayId === pathwaySegment
  );
  return {
    routeKey,
    isTrackPathway,
    namedByTheRuntimeRecord,
    addressable: isTrackPathway && namedByTheRuntimeRecord,
    recordsDisagree: isTrackPathway !== namedByTheRuntimeRecord,
    runtimePathwayId: namedByTheRuntimeRecord ? censusRow.runtimePathwayId : null,
    runtimeRouteId: namedByTheRuntimeRecord ? `${jurisdiction}:${censusRow.runtimePathwayId}` : null,
    mappingSource: namedByTheRuntimeRecord
      ? "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json"
      : null,
    mappingFailure: namedByTheRuntimeRecord ? null
      : !isTrackPathway ? "not_a_track_pathway_key"
      : censusRows.length === 0 ? "missing_census_mapping"
        : censusRows.length > 1 ? "duplicate_census_mapping"
          : "census_mapping_does_not_match_route_key"
  };
};

const augustDecision = counsel.ownerLegalDecision.records[0];
const approvalByFamily = new Map();
for (const counselRow of counsel.families) {
  assert.equal(approvalByFamily.has(counselRow.familyId), false,
    `${counselRow.familyId}: duplicated in the August completed-output approval`);
  approvalByFamily.set(counselRow.familyId, {
    source: "august_completed_output_approval",
    current: true,
    legalApprovalResult: augustDecision.legalApprovalResult,
    recordId: augustDecision.recordId,
    decisionOwner: augustDecision.decisionOwner,
    effectiveDate: augustDecision.effectiveDate,
    requiresSignature: counsel.requiresSignature === true,
    counselRow,
    ownerQualification: null,
    shippingArtifactDigestPins: null
  });
}

/*
 * The September owner adoption is conditional on the exact bytes it names.
 * Its family list therefore cannot simply be unioned with the August list:
 * malformed pins are an invalid authority record and reject generation, while
 * well-formed pins whose current bytes changed make that approval non-current.
 */
const EXPECTED_BATCH_FIXTURES = ["boundary", "canonical"];
const batchFamilyIds = new Set();
for (const qualification of batchAdoption.adoption?.qualifications ?? []) {
  assert.ok(Array.isArray(qualification.families), "September adoption qualification has no family list");
  assert.equal(qualification.familyCount, qualification.families.length,
    "September adoption qualification familyCount does not match its family list");
  for (const familyId of qualification.families) {
    assert.equal(batchFamilyIds.has(familyId), false,
      `${familyId}: duplicated inside the September owner adoption`);
    assert.equal(approvalByFamily.has(familyId), false,
      `${familyId}: appears in both August and September owner approvals`);
    batchFamilyIds.add(familyId);

    const family = masterFamilyOf.get(familyId);
    assert.ok(family?.directory, `${familyId}: September adoption family is absent from the master queue`);
    const pins = qualification.digestConditionRecordedPerFamily?.[familyId];
    assert.ok(Array.isArray(pins), `${familyId}: September adoption has no digest pins`);
    assert.deepEqual([...pins.map((pin) => pin.fixture)].sort(), EXPECTED_BATCH_FIXTURES,
      `${familyId}: September adoption must pin exactly canonical and boundary`);
    assert.equal(new Set(pins.map((pin) => pin.file)).size, pins.length,
      `${familyId}: September adoption repeats a shipping-artifact path`);

    const normalizedPins = pins.map((pin) => {
      assert.match(String(pin.sha256 ?? ""), /^[0-9a-f]{64}$/,
        `${familyId}/${pin.fixture}: invalid September adoption SHA-256`);
      const expectedFile = `${family.directory}/fixtures/${pin.fixture}.pdf`;
      assert.equal(pin.file, expectedFile,
        `${familyId}/${pin.fixture}: September adoption pin does not name this family's exact fixture`);
      const sha256Now = sha(pin.file);
      return { ...pin, sha256Now, current: sha256Now === pin.sha256 };
    });

    approvalByFamily.set(familyId, {
      source: "september_exact_digest_adoption",
      current: normalizedPins.every((pin) => pin.current),
      legalApprovalResult: "ADOPT",
      recordId: batchAdoption.recordId,
      decisionOwner: batchAdoption.decisionOwner,
      effectiveDate: batchAdoption.decidedOn,
      requiresSignature: batchAdoption.requiresSignature === true,
      counselRow: null,
      ownerQualification: qualification.ownerNote,
      shippingArtifactDigestPins: normalizedPins
    });
  }
}
assert.equal(batchFamilyIds.size, batchAdoption.adoption?.familiesAdopted,
  "September adoption familiesAdopted does not match its exact family lists");
const approvedFamilies = new Set([...approvalByFamily]
  .filter(([, approval]) => approval.current)
  .map(([familyId]) => familyId));
const verdictOf = new Map();
for (const r of returns.rows ?? []) if (r.isIndependentVerification && r.verdict && !r.superseded) verdictOf.set(r.familyId, r);
const rasterOf = new Map(raster.rows.map((r) => [r.familyId, r]));

const proven = master.families.filter((f) => f.state === "COMPLETE_PACKET_PROVEN");

const evaluate = (f) => {
  const v = verdictOf.get(f.familyId) ?? null;
  const r = rasterOf.get(f.familyId) ?? null;
  const approval = approvalByFamily.get(f.familyId) ?? null;
  const audit = auditVerdict.get(f.familyId) ?? null;
  const auditedApprovalRecordId = audit?.reviewedAgainstApprovalRecordId
    ?? postApprovalAudit.controllingRecord?.recordId
    ?? null;
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
    coveredByAnExistingOwnerApproval: approval?.current === true,
    noSubstantiveLegalChangeSinceThatApproval: audit?.verdict === "COVERED_BY_EXISTING_APPROVAL"
      && auditedApprovalRecordId === approval?.recordId,
    noHoldApplies: f.legalInputStatus !== "OPEN_LEGAL_INPUT" && (f.holds ?? []).length === 0 && !f.laneReturnLegalHold
  };
};

const rows = proven.map((f) => {
  const checks = evaluate(f);
  const unmet = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  const approval = approvalByFamily.get(f.familyId) ?? null;
  const row = approval?.counselRow ?? null;
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
    legalApproval: approval ? {
      legalApprovalResult: approval.legalApprovalResult,
      legalDecisionRecordId: approval.recordId,
      legalDecisionOwner: approval.decisionOwner,
      legalDecisionEffectiveDate: approval.effectiveDate,
      requiresSignature: approval.requiresSignature,
      approvalSource: approval.source,
      approvalCurrent: approval.current,
      ownerQualification: approval.ownerQualification,
      shippingArtifactDigestPins: approval.shippingArtifactDigestPins,
      adoptedLegalDesignRecord: row?.adoptedLegalDesignRecord ?? null,
      packetProofPath: row?.packetProofPath ?? null,
      packetProofSha256Recorded: row?.packetProofSha256 ?? null,
      packetProofSha256Now: row?.packetProofPath ? sha(row.packetProofPath) : null,
      legalDesignMemoSha256Recorded: row?.legalDesignMemoSha256 ?? null,
      legalDesignMemoSha256Now: row?.legalDesignMemoPath ? sha(row.legalDesignMemoPath) : null
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
  conditionSevenIsReadRatherThanComputed: "Whether a post-approval change was substantive is a reading of diffs against the selected decision record's own terms, not something this script can compute. The reading is recorded in data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json and consulted here. A family with no entry there fails the condition, and a reading against a different approval record also fails: silence or mismatched authority is never a pass.",
  whyAnUnchangedPacketProofIsNotEnough: "All three candidates' packetProofSha256 are unchanged, and that proves less than it appears to. The proofs attest implementation outputs under src/lib/rcap/packets/jurisdictions/ and scripts/verify-rcap-*-custom-pleading.mjs, and none of those paths exists in this checkout — the shipping artifacts come from the census-v1 generator. They are unchanged because nothing touched them. So a v2 record's packetSpecification must be bound to the census-v1 artifact that actually ships, never to the stale proof.",
  postApprovalAudit: (postApprovalAudit.families ?? []).map((r) => ({
    familyId: r.familyId,
    verdict: r.verdict,
    reviewedAgainstApprovalRecordId: r.reviewedAgainstApprovalRecordId
      ?? postApprovalAudit.controllingRecord?.recordId
      ?? null,
    mayEnterTheFirstCohort: r.mayEnterTheFirstCohort
  })),
  counts: {
    completePacketProven: proven.length,
    familiesInsideExistingApprovalScope: approvalByFamily.size,
    augustApprovalScope: counsel.families.length,
    septemberExactDigestApprovalScope: batchFamilyIds.size,
    septemberApprovalsWithCurrentDigests: [...approvalByFamily.values()]
      .filter((approval) => approval.source === "september_exact_digest_adoption" && approval.current).length,
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
  whyTheCohortIsSmall: `The August completed-output decision names ${counsel.families.length} families and the September exact-digest adoption names ${batchFamilyIds.size} disjoint families. ${approvedFamilies.size} families currently retain approval coverage after applying the September digest condition, while ${proven.length} are packet-proven; ${rows.filter((r) => r.checks.coveredByAnExistingOwnerApproval).length} are in both populations. Approval is still only one condition: each family also needs an audit explicitly bound to that selected approval and every other technical, source, raster, wiring, hold and independent-verification condition.`,
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
      runtimeMappings: all.filter((r) => r.addressable).map((r) => ({
        routeKey: r.routeKey,
        runtimePathwayId: r.runtimePathwayId,
        runtimeRouteId: r.runtimeRouteId,
        source: r.mappingSource
      })),
      notAddressable: all.filter((r) => !r.addressable).map((r) => r.routeKey),
      failedMappings: all.filter((r) => !r.addressable).map((r) => ({
        routeKey: r.routeKey,
        reason: r.mappingFailure
      })),
      recordsDisagreeOn: all.filter((r) => r.recordsDisagree).map((r) => r.routeKey),
      whenTheRecordsDisagree: "The route key's own shape and the canonical route-obligation census are read independently. A missing, duplicated or mismatched census mapping is counted NOT addressable and the disagreement is the finding; no jurisdiction allowlist or inferred pathway is substituted."
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
