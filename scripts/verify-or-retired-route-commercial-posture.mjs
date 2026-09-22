#!/usr/bin/env node
/**
 * #60 acceptance: the retired Oregon route's commercial posture.
 *
 * OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c
 * was retired by the legal owner on 2026-08-29 and superseded by three governed
 * configurations. #59 already stopped the factory building it. What remains is
 * that the commercial authority chain still projects it as a live, unfinished,
 * previously-approved packet.
 *
 * This verifier is the acceptance boundary. It runs red today, describing the
 * exact stale fields, and turns green only when the correction is made at the
 * right authority boundary without over-correcting.
 *
 * THE BOUNDARY THAT MATTERS
 *
 * data/rcap-grade-a/fulfillment-authority-projection.json says of itself:
 *   "This file is a projection. It is derived by the shipped authority module
 *    from the controlling registry; editing it changes nothing, because the
 *    runtime reads the registry."
 *
 * So a correction written into the projection would be erased by the next
 * regeneration and would never have changed the runtime. The correction belongs
 * in the fulfillment generator consuming the structured specification
 * supersession, then in its generated registry. This verifier checks that the
 * projection AGREES WITH the registry rather than checking its literals alone.
 *
 * WHAT MUST NOT HAPPEN
 *
 * A retired route stays discoverable as history and identity. The fix must not
 * delete the route or the record, must not erase the historical ratification,
 * must not touch Oregon legal substance, must not open a successor, and must
 * not move nationwide gate counts.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const RETIRED = "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c";
const SUCCESSORS = [
  "OR:set-aside-of-a-citation-or-arrest-with-no-accusatory-instrument-under-ors-137-225-1-c",
  "OR:set-aside-of-an-acquittal-under-ors-137-225-1-d",
  "OR:set-aside-of-an-ordinary-dismissal-under-ors-137-225-1-d"
];
const REGISTRY = "data/rcap-grade-a/fulfillment-authority-registry.json";
const PROJECTION = "data/rcap-grade-a/fulfillment-authority-projection.json";
const FACTORY = "data/record-clearing/factory-v2-route-registry.json";
const RETIRED_SPEC = "data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json";
const SUCCESSOR_SPEC = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";
const DETERMINATION = "data/record-clearing/legal-decisions/2026-09-21-or-set-aside-without-conviction-is-retired-not-unwritten.json";

/** Oregon legal substance, pinned at Captain e3ba81908. Any change here means
 *  the correction edited law rather than commercial posture. */
const LEGAL_SUBSTANCE_SHA = "c7796943fe397f8216b0e7ae8a76ed583f0370049e3c626945f3253b634a2f74";

const json = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const sha = (v) => crypto.createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");

let failures = 0;
let checks = 0;
const ok = (label, condition, observed) => {
  checks += 1;
  if (condition) { console.log(`  ok        ${label}`); return; }
  failures += 1;
  console.log(`  FAILED    ${label}${observed === undefined ? "" : ` — observed ${JSON.stringify(observed)}`}`);
};

console.log("#60 — the retired Oregon route's commercial posture\n");

const registry = json(REGISTRY);
const projection = json(PROJECTION);
const factory = json(FACTORY);
const retiredSpec = json(RETIRED_SPEC);
const successorSpec = json(SUCCESSOR_SPEC);

const record = registry.records.find((r) => r.routeId === RETIRED);
const projected = (projection.routes ?? []).find((r) => r.routeId === RETIRED);
const factoryRow = (factory.routes ?? factory.rows ?? []).find((r) => r.pathwayKey === RETIRED);

// ---------------------------------------------------------------------------
console.log("1. the route is still discoverable as history and identity");
// Over-correction guard: deleting the route would also pass a naive "not sold"
// check, so identity is asserted before posture.
ok("the Grade-A record still exists", Boolean(record));
ok("the factory row still exists", Boolean(factoryRow));
ok("the retired specification still exists", Boolean(retiredSpec.specificationId));
ok("the controlling determination record still exists", fs.existsSync(DETERMINATION));
ok("the historical ratification is preserved, not erased",
  record?.legalAuthority?.recordId === "auth-2026-08-19-owner-legal-approval-completed-output"
  && record?.legalAuthority?.effectiveDate === "2026-08-19",
  record?.legalAuthority);

// ---------------------------------------------------------------------------
console.log("\n2. the retirement is structurally recorded in legal authority");
ok("the specification carries a structured supersession with a date",
  retiredSpec.supersededBy?.on === "2026-08-29" && typeof retiredSpec.supersededBy?.by === "string",
  retiredSpec.supersededBy?.on);
ok("it names the three successor configurations",
  (retiredSpec.supersededBy?.configurations ?? []).length === 3,
  retiredSpec.supersededBy?.configurations);

// ---------------------------------------------------------------------------
console.log("\n3. #59 holds: the route is refused as a build target");
ok("routeNotRetired is an unmet build input", factoryRow?.buildInputs?.routeNotRetired === false,
  factoryRow?.buildInputs?.routeNotRetired);
ok("unmetBuildInputs names exactly routeNotRetired",
  JSON.stringify(factoryRow?.unmetBuildInputs) === JSON.stringify(["routeNotRetired"]),
  factoryRow?.unmetBuildInputs);
ok("the factory does not resolve it", factoryRow?.factoryV2Resolves === false, factoryRow?.factoryV2Resolves);

// ---------------------------------------------------------------------------
console.log("\n4. the three successors remain commercially closed");
const registryIds = new Set(registry.records.map((r) => r.routeId));
for (const s of SUCCESSORS) {
  ok(`${s.slice(3, 44)}… has no Grade-A record`, !registryIds.has(s));
}
ok("the successor specification claims no commercial eligibility",
  successorSpec.commerciallyEligible === 0 && successorSpec.completePacketProven === 0,
  { commerciallyEligible: successorSpec.commerciallyEligible, completePacketProven: successorSpec.completePacketProven });

// ---------------------------------------------------------------------------
console.log("\n5. payment stays closed");
ok("the route is not commercially eligible",
  projected?.commercialStatus === "not_commercially_eligible", projected?.commercialStatus);

// ---------------------------------------------------------------------------
console.log("\n6. the retired route is NOT projected as live, unfinished or ratified-for-delivery");
// These are the #60 defect. They are expected to fail until the correction lands.
ok("the historical paid disposition is non-controlling under SUPERSEDED",
  record?.serviceDisposition === "paid_packet_intended" && projected?.state === "SUPERSEDED", record?.serviceDisposition);
ok("the record carries the supersession that legal authority already states",
  record?.supersededBy !== null && record?.supersededAt !== null,
  { supersededBy: record?.supersededBy, supersededAt: record?.supersededAt });
ok("the historical pending review is non-controlling under SUPERSEDED",
  record?.outputLegalApproval?.state === "pending" && projected?.state === "SUPERSEDED", record?.outputLegalApproval?.state);
ok("the projection classifies it as SUPERSEDED",
  projected?.state === "SUPERSEDED", projected?.state);
ok("the projection raises no active missing-proof blockers for it",
  (projected?.missingProof ?? []).length === 0, (projected?.missingProof ?? []).length);
ok("the projection counts at least one superseded route",
  (projection.counters?.superseded ?? 0) >= 1, projection.counters?.superseded);

// ---------------------------------------------------------------------------
console.log("\n7. the correction is at the right boundary and survives regeneration");
ok("the projection still declares itself derived from the registry",
  /derived by the shipped authority module from the controlling registry/.test(projection.rule ?? ""),
  projection.rule?.slice(0, 60));
// The projection must not disagree with the registry: if it does, someone edited
// the derived file and the next regeneration will undo it.
ok("the projection's disposition agrees with the registry record",
  projected?.serviceDisposition === record?.serviceDisposition,
  { projection: projected?.serviceDisposition, registry: record?.serviceDisposition });
ok("the projection's packet family agrees with the registry record",
  projected?.packetFamilyId === record?.packetFamilyId,
  { projection: projected?.packetFamilyId, registry: record?.packetFamilyId });

// ---------------------------------------------------------------------------
console.log("\n8. nothing was over-corrected");
ok("Oregon legal substance is untouched",
  sha(retiredSpec.legalSections ?? null) === LEGAL_SUBSTANCE_SHA,
  sha(retiredSpec.legalSections ?? null).slice(0, 16));
ok("the nationwide record count is unchanged", registry.records.length === 14, registry.records.length);
ok("the nationwide commercially-eligible count is unchanged",
  projection.counters?.commerciallyEligible === 6, projection.counters?.commerciallyEligible);
ok("no route was revoked wholesale", (projection.counters?.revoked ?? 0) === 0, projection.counters?.revoked);
ok("the factory registry still carries all 267 rows",
  (factory.routes ?? factory.rows ?? []).length === 267, (factory.routes ?? factory.rows ?? []).length);

console.log("");
if (failures > 0) {
  console.log(`${checks - failures}/${checks} checks passed — ${failures} open.`);
  console.log("Section 6 failing is the #60 defect: a retired route still projected as a live,");
  console.log("unfinished, previously-ratified packet. Sections 1, 4 and 8 failing would instead");
  console.log("mean the correction went too far. Read which section is red before acting.");
  process.exit(1);
}
console.log(`${checks}/${checks} checks passed.`);
console.log("The route is retired in posture, preserved as history, and its successors stay closed.");
