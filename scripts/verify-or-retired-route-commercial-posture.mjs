#!/usr/bin/env node
/**
 * #60 acceptance: the retired Oregon route's CURRENT commercial authority.
 *
 * OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c
 * was retired by the legal owner on 2026-08-29 and superseded by three governed
 * configurations. #59 already stopped the factory building it. What remains is
 * that the commercial authority chain still treats it as current.
 *
 * WHAT THIS VERIFIER TESTS, AND WHAT IT DELIBERATELY DOES NOT
 *
 * It tests current-authority semantics, not cosmetic normalisation of
 * historical fields. An earlier revision of this file demanded that
 * serviceDisposition stop saying "paid_packet_intended" and that
 * outputLegalApproval.state stop saying "pending". Both demands were wrong.
 * Those fields record what was true of the record while it was live, and
 * rewriting them would falsify history to achieve an operational result the
 * authority contract already reaches a better way.
 *
 * The contract's own mechanism is supersession. grade-a-authority.ts checks
 * `record.supersededBy` and denies with state SUPERSEDED *before*
 * collectMissingProof runs, so a superseded record cannot produce active
 * missing-proof work at all. grade-a-registry.ts keeps only
 * `ordered.filter((record) => !record.supersededBy)` as live. Binding the
 * supersession therefore closes the route, empties its blockers and removes it
 * from current authority without touching a single historical claim.
 *
 * THE DURABLE WRITE BOUNDARY
 *
 * Both data files in this chain are generated:
 *   fulfillment-authority-registry.json   <- generate-rcap-grade-a-fulfillment-authority.mjs
 *   fulfillment-authority-projection.json <- derived from the registry
 * so a hand-patch of either is erased by the next regeneration. The correction
 * belongs in the generator's authority derivation, or in an authoritative input
 * the generator consumes. This verifier proves that by requiring the generator's
 * own --check to pass: if the committed files disagree with what the generator
 * would produce, the fix was written at the wrong level.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

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
const GENERATOR = "scripts/generate-rcap-grade-a-fulfillment-authority.mjs";

/** Oregon legal substance, pinned at Captain e3ba81908 (JSON.stringify form). */
const LEGAL_SUBSTANCE_SHA = "c7796943fe397f8216b0e7ae8a76ed583f0370049e3c626945f3253b634a2f74";
/** The historical ratification that must survive untouched. */
const HISTORICAL_AUTH = { recordId: "auth-2026-08-19-owner-legal-approval-completed-output", effectiveDate: "2026-08-19" };

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

/**
 * Transcribed from grade-a-registry.ts: only records with no supersededBy are
 * current. Transcribed rather than imported because the module is server-only;
 * kept to one line so it cannot drift meaningfully.
 */
const currentRecordsFor = (records, routeId) =>
  records.filter((r) => r.routeId === routeId && !r.supersededBy);

console.log("#60 — the retired Oregon route's current commercial authority\n");

const registry = json(REGISTRY);
const projection = json(PROJECTION);
const factory = json(FACTORY);
const retiredSpec = json(RETIRED_SPEC);
const successorSpec = json(SUCCESSOR_SPEC);

const allForRoute = registry.records.filter((r) => r.routeId === RETIRED);
const current = currentRecordsFor(registry.records, RETIRED);
const projected = (projection.routes ?? []).find((r) => r.routeId === RETIRED);
const factoryRow = (factory.routes ?? factory.rows ?? []).find((r) => r.pathwayKey === RETIRED);

// ---------------------------------------------------------------------------
console.log("1. the route is still discoverable as history and identity");
ok("the route still has at least one Grade-A record", allForRoute.length >= 1, allForRoute.length);
ok("the factory row still exists", Boolean(factoryRow));
ok("the retired specification still exists", Boolean(retiredSpec.specificationId));
ok("the controlling determination record still exists", fs.existsSync(DETERMINATION));
ok("the 2026-08-19 ratification is preserved on the record, not erased",
  allForRoute.some((r) => r.legalAuthority?.recordId === HISTORICAL_AUTH.recordId
    && r.legalAuthority?.effectiveDate === HISTORICAL_AUTH.effectiveDate),
  allForRoute.map((r) => r.legalAuthority?.recordId));

// ---------------------------------------------------------------------------
console.log("\n2. the retirement is structurally recorded in legal authority");
ok("the specification carries a structured supersession dated 2026-08-29",
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
for (const s of SUCCESSORS) ok(`${s.slice(3, 44)}… has no Grade-A record`, !registryIds.has(s));
ok("the successor specification claims no commercial eligibility",
  successorSpec.commerciallyEligible === 0 && successorSpec.completePacketProven === 0,
  { commerciallyEligible: successorSpec.commerciallyEligible, completePacketProven: successorSpec.completePacketProven });

// ---------------------------------------------------------------------------
console.log("\n5. CURRENT AUTHORITY: the route is superseded, not merely unfinished");
ok("no record for this route is current authority any more", current.length === 0,
  current.map((r) => r.recordId));
ok("the superseded record binds supersededBy and supersededAt",
  allForRoute.every((r) => r.supersededBy) && allForRoute.every((r) => r.supersededAt),
  allForRoute.map((r) => ({ by: r.supersededBy, at: r.supersededAt })));
ok("the projected authority state is SUPERSEDED", projected?.state === "SUPERSEDED", projected?.state);
ok("commercial status is closed", projected?.commercialStatus === "not_commercially_eligible",
  projected?.commercialStatus);
ok("there is no active missing proof", (projected?.missingProof ?? []).length === 0,
  (projected?.missingProof ?? []).length);
ok("the projection counts the supersession", (projection.counters?.superseded ?? 0) >= 1,
  projection.counters?.superseded);
ok("the route is not counted among incomplete packets awaiting work",
  (projection.counters?.incomplete ?? 0) < 8, projection.counters?.incomplete);

// ---------------------------------------------------------------------------
console.log("\n6. the supersession history is hash-chained and attributed");
const superseded = allForRoute.filter((r) => r.supersededBy);
const entry = superseded.flatMap((r) => r.history ?? []).find((h) => h.changeKind === "superseded");
ok("a superseded history entry exists", Boolean(entry), entry?.changeKind);
ok("it is attributed and reasoned",
  Boolean(entry?.changedBy) && Boolean(entry?.changedAt) && Boolean(entry?.reason));
ok("it carries its own record digest", /^[0-9a-f]{64}$/.test(entry?.recordSha256 ?? ""), entry?.recordSha256);
for (const record of superseded) {
  const chain = record.history ?? [];
  const linked = chain.every((h, i) => i === 0 || h.supersedesRecordSha256 === chain[i - 1].recordSha256);
  ok(`${record.recordId?.slice(0, 40)}… history chain links every entry to its predecessor`, linked);
}

// ---------------------------------------------------------------------------
console.log("\n7. history was NOT falsified to achieve closure");
// Pinned to exact values. "nonempty" and "not approved" were too weak: they
// would have let a correction quietly rewrite the record's historical claims
// while still passing. If supersession is the only intended semantic change,
// every historical field must survive byte-for-byte.
const HISTORICAL = {
  serviceDisposition: "paid_packet_intended",
  outputLegalApprovalState: "pending",
  legalAuthorityStatus: "approved_by_decision_owner",
  packetFamilyId: "rcap-or-official-pdf-fill",
  packetSpecificationSpecId: "or_acquittal-set",
  packetSpecificationSha256: "cee130aae71f9282e0a88f7d8940a6d4d586482ed04a3d83d1be20fb4ac26c24",
  finalVerificationState: "unbound"
};
ok(`serviceDisposition stays exactly "${HISTORICAL.serviceDisposition}"`,
  allForRoute.every((r) => r.serviceDisposition === HISTORICAL.serviceDisposition),
  allForRoute.map((r) => r.serviceDisposition));
ok(`outputLegalApproval.state stays exactly "${HISTORICAL.outputLegalApprovalState}"`,
  allForRoute.every((r) => r.outputLegalApproval?.state === HISTORICAL.outputLegalApprovalState),
  allForRoute.map((r) => r.outputLegalApproval?.state));
ok(`legalAuthority.status stays exactly "${HISTORICAL.legalAuthorityStatus}"`,
  allForRoute.every((r) => r.legalAuthority?.status === HISTORICAL.legalAuthorityStatus),
  allForRoute.map((r) => r.legalAuthority?.status));
ok(`packetFamilyId stays exactly "${HISTORICAL.packetFamilyId}"`,
  allForRoute.every((r) => r.packetFamilyId === HISTORICAL.packetFamilyId),
  allForRoute.map((r) => r.packetFamilyId));
ok("the historical packet-specification binding is unchanged",
  allForRoute.every((r) => r.packetSpecification?.specId === HISTORICAL.packetSpecificationSpecId
    && r.packetSpecification?.sha256 === HISTORICAL.packetSpecificationSha256
    && r.packetSpecification?.complete === true),
  allForRoute.map((r) => r.packetSpecification?.specId));
ok(`finalVerification.state stays exactly "${HISTORICAL.finalVerificationState}"`,
  allForRoute.every((r) => r.finalVerification?.state === HISTORICAL.finalVerificationState),
  allForRoute.map((r) => r.finalVerification?.state));

// ---------------------------------------------------------------------------
console.log("\n8. the correction is durable: the generator itself derives it");
// The earlier version of this section was VACUOUS and is replaced.
//
// The full generator throws at mississippiPaidConsumerSuccessorRecord(), which
// sits INSIDE the `records` array literal. Oregon's candidateRecord derivation
// runs before it, but the supersession loop and every comparison against
// committed bytes are downstream of that throw and never execute. So accepting
// the known MS exit and then asserting "the output names no Oregon
// disagreement" proved only that execution stopped before it could report one.
//
// What is required instead is a generator-owned, NONMUTATING, route-scoped
// check that runs the same authority derivation for this record despite the
// unrelated MS failure. It must use the generator's own logic -- not a second
// hand-coded interpretation of it -- and must prove, for the target route:
//   the generator derives the supersession itself;
//   committed registry and projection bytes agree with that derivation;
//   no non-target authority record changes;
//   the three successor routes remain absent;
//   a second generation is byte-identical (idempotent).
//
// The full generator must KEEP failing on MS exactly as it does now. This
// section does not suppress that; it refuses to accept it as proof.
const SCOPED_ENV = "RCAP_AUTHORITY_SCOPED_CHECK_ROUTE";
let scopedExit = null;
let scopedOutput = "";
try {
  scopedOutput = execFileSync("node", [GENERATOR, "--check", "--scope", RETIRED],
    { stdio: "pipe", encoding: "utf8", env: { ...process.env, [SCOPED_ENV]: RETIRED } });
  scopedExit = 0;
} catch (error) {
  scopedExit = error.status ?? 1;
  scopedOutput = `${error.stdout ?? ""}${error.stderr ?? ""}`;
}
const scopedModeExists = scopedExit === 0 && !/loadMsPaidPacketProof/.test(scopedOutput);
ok("the generator offers a nonmutating route-scoped authority check that survives the MS baseline",
  scopedModeExists,
  { exit: scopedExit, stoppedAtMsBaseline: /loadMsPaidPacketProof/.test(scopedOutput) });
ok("the scoped check reports agreement for this route",
  scopedModeExists && /\bagree|match|identical|OK|PASS/i.test(scopedOutput),
  scopedOutput.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 100));
ok("the scoped check reports the three successors still absent",
  scopedModeExists && SUCCESSORS.every((route) => !new RegExp(`${route}\\b(?![^\\n]*absent)`).test(scopedOutput) || /absent/.test(scopedOutput)),
  scopedModeExists ? undefined : "scoped mode unavailable");
ok("the scoped check proves a second generation is idempotent",
  scopedModeExists && /idempotent|second generation|stable/i.test(scopedOutput),
  scopedModeExists ? undefined : "scoped mode unavailable");

// The unrelated baseline must remain exactly as red as it is today.
let fullExit = null;
let fullOutput = "";
try { execFileSync("node", [GENERATOR, "--check"], { stdio: "pipe", encoding: "utf8" }); fullExit = 0; }
catch (error) { fullExit = error.status ?? 1; fullOutput = `${error.stdout ?? ""}${error.stderr ?? ""}`; }
ok("the full generator check still fails on the MS baseline, unsuppressed",
  fullExit !== 0 && /loadMsPaidPacketProof/.test(fullOutput),
  { exit: fullExit });

ok("the projection still declares itself derived from the registry",
  /derived by the shipped authority module from the controlling registry/.test(projection.rule ?? ""),
  projection.rule?.slice(0, 50));

// ---------------------------------------------------------------------------
console.log("\n9. mutation control: removing the supersession must break this");
{
  const mutated = JSON.parse(JSON.stringify(registry));
  for (const r of mutated.records) if (r.routeId === RETIRED) { r.supersededBy = null; r.supersededAt = null; }
  const stillCurrent = currentRecordsFor(mutated.records, RETIRED);
  ok("with supersededBy stripped, the route reappears as current authority",
    stillCurrent.length > 0, stillCurrent.length);
  // And the reappearing record is exactly the one carrying unfinished proof,
  // which is what made this route read as active work in the first place.
  ok("and the reappearing record still carries its unfinished proof, so closure came from supersession alone",
    stillCurrent.some((r) => r.outputLegalApproval?.state === "pending" || r.finalVerification?.state === "unbound"),
    stillCurrent.map((r) => r.outputLegalApproval?.state));
}

// ---------------------------------------------------------------------------
console.log("\n10. supersededBy must not be overloaded");
// The loader validates nothing about this value: grade-a-registry.ts only tests
// truthiness (`ordered.filter((record) => !record.supersededBy)`), and the type
// is `string | null`. Its established MEANING comes from its only writer, which
// sets a successor record's recordId, and from the denial text "was superseded
// by X; only the current version decides". So a packet-spec filename, a route
// id or an invented record id would pass at runtime purely because it is
// truthy, while asserting a successor Grade-A record that does not exist.
//
// #60 is a terminal retirement: the three successors are closed BY ABSENCE and
// no successor Grade-A record exists to name. Whatever is bound here must
// therefore either name a record that really is in the registry, or be an
// explicit, fail-closed terminal-retirement representation -- not a string
// borrowed from another namespace.
const recordIds = new Set(registry.records.map((r) => r.recordId));
for (const r of allForRoute.filter((x) => x.supersededBy)) {
  const value = r.supersededBy;
  const namesRealRecord = recordIds.has(value);
  const looksBorrowed = /\.json$|^OR:|^data\//.test(value);
  ok("supersededBy is not a filename, route id or path borrowed from another namespace",
    !looksBorrowed, value);
  ok("supersededBy either names a record present in the registry, or the retirement is represented explicitly rather than by an invented id",
    namesRealRecord || (r.terminalRetirement ?? r.retirement ?? null) !== null,
    { supersededBy: value, namesRealRecord, explicitRetirement: r.terminalRetirement ?? r.retirement ?? null });
}
if (allForRoute.every((r) => !r.supersededBy)) {
  console.log("            (no supersession bound yet — this section binds once section 5 is addressed)");
}

console.log("\n11. nothing was over-corrected");
// Per-record digests, not a count. A population floor would have permitted a
// brand-new authority record to appear unnoticed.
const NON_TARGET_DIGESTS = {
  "grade-a-dc-dc_actual_innocence_expungement_16_803-v1": "812992ae1c87d04227942ff7da8b1cfa",
  "grade-a-il-felony-prostitution-relief-v1": "8d3f39300e459fd28d145c3eadf76152",
  "grade-a-ms-additional-justice-court-misdemeanor-relief-9-11-15-3-v1": "a3ec15b1d69516167ff42dbc65863b11",
  "grade-a-ms-additional-municipal-court-misdemeanor-relief-21-23-7-6-v1": "65275c4171901e6cdc27bf139d522b01",
  "grade-a-ms-nonconv-paid-consumer-successor-20260920": "761068c9e26df8362e276be6b986afcc",
  "grade-a-nd-deferred-imposition-dismissal-and-sealing-v1": "3fbb24731316790d530cc5d681d8beee",
  "grade-a-nd-dui-record-sealing-under-the-separate-dui-statute-v1": "0543dc950225d95c9330353eaaedcdff",
  "grade-a-nd-first-offense-possession-sealing-v1": "fa39fd9662d407bd39877eec81b8d2d2",
  "grade-a-nd-general-conviction-sealing-under-n-d-c-c-chapter-12-60-1-v1": "52103aab726d317eb131b304dcd75ba9",
  "grade-a-nd-marijuana-specific-summary-pardon-or-sealing-relief-v1": "acc83f061ad172d0860ed05f091fcb72",
  "grade-a-or-marijuana-specific-set-aside-redesignation-v1": "a697cf2b07514a84cd1dd8187c1e6636",
  "grade-a-or-set-aside-of-eligible-convictions-under-ors-137-225-1-a-v1": "674914a01ea32c10d180e2a788cd5102",
  "grade-a-wy-felony-conviction-expungement-w-s-7-13-1502-v1": "c45b7106c3baac36d5648d8709b168f5"
};
const ROUTE_POPULATION = ["DC:dc_actual_innocence_expungement_16_803","IL:felony-prostitution-relief","MS:additional-justice-court-misdemeanor-relief-9-11-15-3","MS:additional-municipal-court-misdemeanor-relief-21-23-7-6","MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal","ND:deferred-imposition-dismissal-and-sealing","ND:dui-record-sealing-under-the-separate-dui-statute","ND:first-offense-possession-sealing","ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1","ND:marijuana-specific-summary-pardon-or-sealing-relief","OR:marijuana-specific-set-aside-redesignation","OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c","OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a","WY:felony-conviction-expungement-w-s-7-13-1502"];

const nonTarget = registry.records.filter((r) => r.routeId !== RETIRED);
const changed = nonTarget.filter((r) => sha(r).slice(0, 32) !== NON_TARGET_DIGESTS[r.recordId]);
const appeared = nonTarget.filter((r) => !(r.recordId in NON_TARGET_DIGESTS));
const vanished = Object.keys(NON_TARGET_DIGESTS).filter((id) => !nonTarget.some((r) => r.recordId === id));
ok("every non-target authority record is byte-identical", changed.length === 0,
  changed.map((r) => r.recordId));
ok("no new non-target authority record appeared", appeared.length === 0, appeared.map((r) => r.recordId));
ok("no non-target authority record vanished", vanished.length === 0, vanished);
ok("the route population is exactly the same set",
  JSON.stringify([...new Set(registry.records.map((r) => r.routeId))].sort()) === JSON.stringify(ROUTE_POPULATION),
  [...new Set(registry.records.map((r) => r.routeId))].sort().filter((x) => !ROUTE_POPULATION.includes(x)));
ok("Oregon legal substance is untouched",
  sha(retiredSpec.legalSections ?? null) === LEGAL_SUBSTANCE_SHA,
  sha(retiredSpec.legalSections ?? null).slice(0, 16));
ok("the nationwide commercially-eligible count is unchanged",
  projection.counters?.commerciallyEligible === 6, projection.counters?.commerciallyEligible);
ok("no route was revoked wholesale", (projection.counters?.revoked ?? 0) === 0, projection.counters?.revoked);
ok("the factory registry still carries all 267 rows",
  (factory.routes ?? factory.rows ?? []).length === 267, (factory.routes ?? factory.rows ?? []).length);

console.log("");
if (failures > 0) {
  console.log(`${checks - failures}/${checks} checks passed — ${failures} open.`);
  console.log("Sections 5, 6 and 8 are the #60 work. Bind the supersession at the generator or");
  console.log("an authoritative input it consumes, so current authority reports SUPERSEDED with");
  console.log("no active proof and a hash-chained history entry records why; and add the");
  console.log("nonmutating route-scoped generator check that section 8 requires, because the");
  console.log("full run stops at the unrelated MS baseline before it can compare this route.");
  console.log("Section 10 binds only once a supersession value exists to inspect.");
  console.log("Sections 1, 4, 7, 10 and 11 failing would instead mean the correction overshot —");
  console.log("deleting the route, opening a successor, falsifying history, or moving gates.");
  process.exit(1);
}
console.log(`${checks}/${checks} checks passed.`);
console.log("Current authority reports the route superseded and closed; its history is intact and unrewritten.");
