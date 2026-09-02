#!/usr/bin/env node
/*
 * The acceptance contract for the terminal treatments of the families the
 * decision owner placed in WRONG_DELIVERY_TYPE.
 *
 * It is written for a reader who does not trust the record. Every claim the
 * record makes is re-derived here from the file it names — the quote is
 * compared byte for byte against the source, the treatment word is recomputed
 * from the ratified status without reading the record's answer, and the runtime
 * posture is measured by calling the authoritative resolver rather than by
 * reading a field that says what it would have returned.
 *
 * Three things this verifier is deliberately strict about:
 *
 *   * a quote that no longer matches its source is a failure, not a drift. The
 *     whole value of the record is that its participant-facing facts were not
 *     composed, and a stale quote is a composed one.
 *   * a packet the owner ordered kept as an internal review fixture must still
 *     be on disk with the hash the record carries. Removing a family from
 *     participant delivery is a binding change; deleting its bytes is not the
 *     same act and is not authorised.
 *   * no route in scope may be sellable or credit-consumable, whatever else is
 *     true of it.
 *
 * This verifier does NOT accept the treatments. The lane that wrote a treatment
 * may not be the lane that verifies it; this checks that the record says what
 * its sources say, and an independent reader still has to agree that the
 * treatment is right.
 *
 *   node scripts/grade-a-terminal-treatments/verify-terminal-treatments.mjs
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
register("../lib/ts-esm-loader.mjs", import.meta.url);

const RECORD = "data/rcap-grade-a/legal-decisions/TERMINAL_TREATMENTS_WRONG_DELIVERY_TYPE.json";
const OWNER_DECISIONS = "data/rcap-grade-a/legal-decisions/OWNER_DELIVERY_TYPE_DECISIONS.json";
const RATIFICATION = "data/record-clearing/legal-decisions/route-ratification-registry.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const sha = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const failures = [];
let checks = 0;
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};

const record = read(RECORD);
const owner = read(OWNER_DECISIONS);
const ratification = read(RATIFICATION);
const trackRegistry = read(TRACK_REGISTRY);
const trackById = new Map(trackRegistry.tracks.map((t) => [t.trackId, t]));
const ownerByFamily = new Map(owner.decisions.map((d) => [d.familyId, d]));

/* ── 1. the record grants nothing ────────────────────────────────────────── */

check(record.schemaVersion === "rcap-terminal-treatments-wrong-delivery-type/v1", "the record carries an unexpected schema version");
check(record.createsApproval === false, "the record claims to create an approval");
check(record.opensNoRoute === true, "the record does not state that it opens no route");
check(record.restoresNoPacket === true, "the record does not state that it restores no packet");
check(record.deletesNoPacket === true, "the record does not state that it deletes no packet");
check(record.grantsNoCommercialAuthority === true, "the record does not state that it grants no commercial authority");

/* ── 2. coverage is exactly the owner's refusals, less South Carolina ────── */

const refused = owner.decisions.filter((d) => d.refused === true).map((d) => d.familyId);
const inScope = refused.filter((f) => f !== "rcap-sc-custom-pleading");
const covered = new Set(record.families.map((f) => f.familyId));
for (const familyId of inScope) {
  check(covered.has(familyId), `${familyId}: refused by the owner and carries no terminal treatment`);
}
for (const family of record.families) {
  check(inScope.includes(family.familyId), `${family.familyId}: a treatment exists for a family the owner did not place in WRONG_DELIVERY_TYPE`);
  check(family.familyId !== "rcap-sc-custom-pleading", "South Carolina belongs to another lane and must not appear here");
}
check(record.counts.families === record.families.length, "the family count disagrees with the families listed");

/* ── 3. every named source still hashes to what the record recorded ──────── */

const declaredSources = [
  record.sources.ownerDeliveryTypeDecisions,
  record.sources.provenFamilyLegalDelta,
  record.sources.routeRatificationRegistry,
  record.sources.legalDesignTrackRegistry,
  ...record.sources.legalAuthorityRouteContracts
];
for (const source of declaredSources) {
  check(exists(source.path), `${source.path}: a declared source is missing`);
  if (exists(source.path)) {
    check(sha(source.path) === source.sha256, `${source.path}: the source has changed since the record was generated; regenerate it`);
  }
}

/* ── 4. the treatment is a lookup, recomputed here without reading it ────── */

const STATUS_TO_TREATMENT = {
  intentional_unsupported: "OUT_OF_SCOPE",
  held_guidance: "GUIDANCE_READY",
  approved_release_guidance: "GUIDANCE_READY"
};
const QUESTION_TO_TREATMENT = {
  "Q2-composed-petition-or-attorney-referral": "HANDOFF_READY",
  "Q8-records-disagree-on-whether-this-family-carries-a-filing-instrument": "GUIDANCE_READY"
};

for (const family of record.families) {
  const decision = ownerByFamily.get(family.familyId);
  check(Boolean(decision), `${family.familyId}: no owner decision found`);
  if (!decision) continue;

  /* The owner's words are reproduced exactly. */
  check(family.ownerDecision.decision === decision.decision, `${family.familyId}: the quoted owner decision does not match ${OWNER_DECISIONS}`);
  check(family.ownerDecision.decisionId === decision.decisionId, `${family.familyId}: the decision id does not match`);
  check(family.ownerDecision.theQuestionAsked === decision.theQuestionAsked, `${family.familyId}: the quoted question does not match`);
  check(family.ownerDecision.whatWouldReopenIt === decision.whatWouldReopenIt, `${family.familyId}: the quoted reopening condition does not match`);

  /* The treatment word, recomputed. */
  const statuses = [...new Set(family.routes.map((r) => r.ratification.status).filter(Boolean))];
  check(statuses.length <= 1, `${family.familyId}: routes carry different ratified statuses, so no family-level treatment can be read`);
  const expected = statuses.length === 1 ? STATUS_TO_TREATMENT[statuses[0]] : QUESTION_TO_TREATMENT[decision.fromQuestion];
  check(
    family.terminalTreatment === expected,
    `${family.familyId}: treatment ${family.terminalTreatment} is not what the controlling record yields (${expected ?? "nothing"})`
  );

  /* The ratified status and its vocabulary sentence are the registry's own. */
  for (const route of family.routes) {
    if (!route.ratification.routeKey) continue;
    const row = ratification.routes.find((r) => r.routeKey === route.ratification.routeKey);
    check(Boolean(row), `${family.familyId}: ${route.ratification.routeKey} is not in the ratification registry`);
    if (row) {
      check(row.status === route.ratification.status, `${family.familyId}: ${route.ratification.routeKey} status drifted from the registry`);
    }
  }
  if (statuses.length === 1) {
    check(
      family.authorizingRecord.statusVocabularyQuote === ratification.statusVocabulary[statuses[0]],
      `${family.familyId}: the quoted status vocabulary does not match the registry's own`
    );
    check(family.authorizingRecord.path === RATIFICATION, `${family.familyId}: the authorizing record should be the ratification registry`);
  } else {
    check(
      family.authorizingRecord.statusVocabularyQuote === decision.decision,
      `${family.familyId}: with no registry row the authorizing quote must be the owner's own answer`
    );
  }

  /* No family may carry the one packet-bearing treatment. */
  check(
    family.terminalTreatment !== "AGENCY_APPLICATION_READY",
    `${family.familyId}: AGENCY_APPLICATION_READY is packet-bearing and every decision in scope keeps checkout closed`
  );
  const vocabulary = record.treatmentVocabulary[family.terminalTreatment];
  check(Boolean(vocabulary), `${family.familyId}: ${family.terminalTreatment} is not in the treatment vocabulary`);
  if (vocabulary) {
    check(vocabulary.paymentAuthority === "closed", `${family.familyId}: the treatment's payment authority is not closed`);
  }
  check(family.checkout.packetCheckout === "closed", `${family.familyId}: checkout is not recorded closed`);
  check(family.checkout.packetCreditConsumption === "none", `${family.familyId}: packet credit consumption is not recorded none`);
  check(family.checkout.partnerCreditConsumption === "none", `${family.familyId}: partner credit consumption is not recorded none`);
  check(family.checkout.renderJobAllowed === false, `${family.familyId}: a render job is not recorded closed`);
}

/* ── 5. every participant-facing quote still matches its source ──────────── */

const sameList = (a, b) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

for (const family of record.families) {
  const trackId = family.destination?.quotedFrom?.field?.match(/trackId=([^\]]+)\]/)?.[1] ?? null;
  if (!trackId) continue; /* runtime-only families are checked below */
  const track = trackById.get(trackId);
  check(Boolean(track), `${family.familyId}: track ${trackId} is not in the track registry`);
  if (!track) continue;

  check(family.destination.kind === (track.destination?.kind ?? null), `${family.familyId}: destination kind does not match ${TRACK_REGISTRY}`);
  check(family.destination.name === (track.destination?.name ?? null), `${family.familyId}: destination name does not match ${TRACK_REGISTRY}`);
  check(family.destination.detail === (track.destination?.detail ?? null), `${family.familyId}: destination detail does not match ${TRACK_REGISTRY}`);
  check(family.destination.venue === (track.venue ?? null), `${family.familyId}: venue does not match ${TRACK_REGISTRY}`);

  const requirements = (track.participantFilingRequirements ?? []).map((r) => ({
    name: r.name,
    obtainedFrom: r.obtainedFrom,
    requirement: r.requirement,
    requiredBeforeFiling: r.requiredBeforeFiling,
    howToObtain: r.howToObtain
  }));
  check(
    sameList(family.participantNextStep.mustBringOrRequest, requirements),
    `${family.familyId}: what the participant must bring or request does not match ${TRACK_REGISTRY}`
  );
  check(
    sameList(family.participantNextStep.postGenerationHandoffs.quotes, track.postGenerationHandoffs ?? []),
    `${family.familyId}: the quoted post-generation handoffs do not match ${TRACK_REGISTRY}`
  );
  check(
    sameList(family.selfHelpStop.quotes, track.selfHelpStopConditions ?? []),
    `${family.familyId}: the quoted self-help stop conditions do not match ${TRACK_REGISTRY}`
  );
  check(
    sameList(family.selfHelpStop.scopeRestrictions.quotes, track.scopeRestrictions ?? []),
    `${family.familyId}: the quoted scope restrictions do not match ${TRACK_REGISTRY}`
  );
  check(
    sameList(family.selfHelpStop.legalDesignBlockers.quotes, track.legalDesignBlockers ?? []),
    `${family.familyId}: the quoted legal-design blockers do not match ${TRACK_REGISTRY}`
  );

  /*
   * A treatment with no self-help stop is not a treatment.
   *
   * Connecticut is the one track whose stop conditions are the whole product,
   * and every other track in scope carries them too. An empty list here means
   * the quote source moved, not that the design stopped having limits.
   */
  check((family.selfHelpStop.quotes ?? []).length > 0, `${family.familyId}: the treatment carries no self-help stop`);
  check(Boolean(family.destination.name), `${family.familyId}: the treatment names no destination`);
}

/* Runtime-only families quote their own committed build findings. */
for (const family of record.families) {
  const quotedFrom = family.selfHelpStop?.quotedFrom;
  if (!quotedFrom || !quotedFrom.path.endsWith("build-findings.json")) continue;
  check(exists(quotedFrom.path), `${family.familyId}: ${quotedFrom.path} is missing`);
  if (!exists(quotedFrom.path)) continue;
  check(sha(quotedFrom.path) === quotedFrom.sha256, `${family.familyId}: ${quotedFrom.path} changed since the record was generated`);
  const findings = read(quotedFrom.path);
  const expected = (findings.findings ?? []).flatMap((f) => [f.finding, f.consequence]);
  check(sameList(family.selfHelpStop.quotes, expected), `${family.familyId}: the quoted build findings do not match ${quotedFrom.path}`);
  check(family.selfHelpStop.quotes.length > 0, `${family.familyId}: the treatment carries no self-help stop`);

  const nextFrom = family.participantNextStep.quotedFrom;
  check(exists(nextFrom.path), `${family.familyId}: ${nextFrom.path} is missing`);
  if (exists(nextFrom.path)) {
    check(sha(nextFrom.path) === nextFrom.sha256, `${family.familyId}: ${nextFrom.path} changed since the record was generated`);
    const approval = read(nextFrom.path);
    check(
      sameList(family.participantNextStep.counselQuestionsRaised, approval.counselQuestionsRaised ?? []),
      `${family.familyId}: the quoted counsel questions do not match ${nextFrom.path}`
    );
    check(approval.approvedForLive === false, `${family.familyId}: ${nextFrom.path} records approvedForLive true`);
    check(approval.live === false, `${family.familyId}: ${nextFrom.path} records live true`);
    check(approval.commercialRoutesOpened === 0, `${family.familyId}: ${nextFrom.path} records an opened commercial route`);
  }
}

/* ── 6. the retired packet is preserved, not deleted and not moved ───────── */

for (const family of record.families) {
  const retired = family.retiredPacket;
  check(retired.disposition === "internal_review_fixture", `${family.familyId}: the retired packet is not recorded as an internal review fixture`);
  check(retired.bytesMoved === false, `${family.familyId}: the record claims packet bytes moved`);
  for (const pdf of retired.canonicalPdfs ?? []) {
    check(exists(pdf.path), `${family.familyId}: the retired canonical PDF ${pdf.path} is gone; the owner ordered it kept as a fixture`);
    if (exists(pdf.path)) {
      check(sha(pdf.path) === pdf.sha256, `${family.familyId}: ${pdf.path} no longer hashes to the recorded value`);
    }
  }
  for (const key of ["renderedArtifacts", "productionFieldMap", "participantInstructions"]) {
    const artifact = retired[key];
    if (!artifact?.path) continue;
    check(exists(artifact.path), `${family.familyId}: ${artifact.path} is gone; preservation means the bytes stay`);
    if (exists(artifact.path)) {
      check(sha(artifact.path) === artifact.sha256, `${family.familyId}: ${artifact.path} no longer hashes to the recorded value`);
    }
  }
}

/* ── 7. the runtime is measured, not asserted ────────────────────────────── */

const { resolvePacketRoute } = await import("../../src/lib/rcap/documents/packet-route-resolver.ts");
const { legalRouteContract, routePaymentAuthority } = await import("../../src/lib/legal-authority/index.ts");

for (const family of record.families) {
  for (const route of family.routes) {
    if (!route.routeKey) continue;
    const [jurisdiction, ...rest] = route.routeKey.split(":");
    const pathwayId = rest.join(":");
    const resolved = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId, trackId: route.trackId ?? undefined });

    check(resolved.sellable === false, `${route.routeKey}: the resolver reports the route sellable`);
    check(resolved.creditConsumable === false, `${route.routeKey}: the resolver reports the route credit-consumable`);
    check(
      resolved.availability !== "PACKET_READY" && resolved.availability !== "CUSTOM_PLEADING_READY",
      `${route.routeKey}: the resolver reports a packet-ready availability on a route the owner refused`
    );

    /* Where a contract carries the treatment, the contract must actually say so. */
    const contract = legalRouteContract(jurisdiction, pathwayId);
    if (route.boundBy?.surface === "legal_authority_route_contract") {
      check(Boolean(contract), `${route.routeKey}: the record binds the treatment in a route contract that does not load`);
      if (contract) {
        const expectedMode = record.treatmentVocabulary[family.terminalTreatment].runtimeOutcomeMode;
        check(contract.outcomeMode === expectedMode, `${route.routeKey}: contract outcomeMode is ${contract.outcomeMode}, not ${expectedMode}`);
        check(contract.packetFamily === null, `${route.routeKey}: the contract still binds a packet family`);
        check(routePaymentAuthority(contract) === "closed", `${route.routeKey}: derived payment authority is not closed`);
        const expectedKind = expectedMode === "referral" ? "handoff" : "guidance_only";
        check(resolved.routeKind === expectedKind, `${route.routeKey}: the resolver returns ${resolved.routeKind}, not ${expectedKind}`);
      }
    }

    /* Nothing in scope may carry an open checkout through a contract. */
    if (contract) {
      check(routePaymentAuthority(contract) === "closed", `${route.routeKey}: a route the owner refused carries open payment authority`);
    }

    /* The record's own claim about what still resolves is measured. */
    const stillPacket = resolved.routeKind === "factory_v2";
    check(
      stillPacket === Boolean(route.packetStillResolvesOnThisRoute),
      `${route.routeKey}: the record says packetStillResolvesOnThisRoute ${Boolean(route.packetStillResolvesOnThisRoute)} and the resolver returns ${resolved.routeKind}`
    );
  }
}

/* The open items are enumerated, not hidden. */
const measuredOpen = record.families
  .flatMap((f) => f.routes.filter((r) => r.packetStillResolvesOnThisRoute).map(() => f.familyId));
const declaredOpen = record.stillResolvingToTheRetiredPacket.map((f) => f.familyId);
check(
  JSON.stringify([...new Set(measuredOpen)].sort()) === JSON.stringify([...new Set(declaredOpen)].sort()),
  "the record's open-item list does not match the routes it marks as still resolving to the retired packet"
);

/* ── report ─────────────────────────────────────────────────────────────── */

if (failures.length > 0) {
  console.error(`Terminal treatments FAILED: ${failures.length} of ${checks} checks\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `Terminal treatments OK: ${checks} checks over ${record.families.length} families and ${record.counts.routes} routes ` +
    `(${JSON.stringify(record.counts.byTreatment)}); ${record.stillResolvingToTheRetiredPacket.length} family/families still resolve to the retired packet set in shadow.`
);
