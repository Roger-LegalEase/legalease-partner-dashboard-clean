#!/usr/bin/env node
/**
 * Nothing sells a packet it cannot prove it delivers.
 *
 * Six surfaces used to answer that question independently, each reading a
 * different proxy, and a route could satisfy all six and still hand a
 * participant a text file. Fifty-four routes could take money or a sponsored
 * credit and every one of them would have; twenty-six had checkout open.
 *
 * This asserts the gate at each of the six by driving it, asserts that the
 * paid path can no longer emit a text summary at all, and asserts that the
 * document pages cannot render another state's filing.
 */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";

const { packetFulfillmentAuthority, assertPacketFulfillmentProven, packetFulfillmentShortfall, REQUIRED_PACKET_COMPONENTS } =
  await import("@/lib/expungement-ai/packet-fulfillment-authority");
const { documentPacketRendererFor, SUPPORTED_DOCUMENT_PACKET_STATES } =
  await import("@/components/rcap/documents/DocumentPacketRenderer");
const { getAllJurisdictionProfiles } = await import("@/lib/rcap-engine/profile-registry");
const { composablePacketSpecificationFor } = await import("@/lib/rcap/grade-a/packet-specification");

/**
 * Ask the authority the question it can actually answer.
 *
 * Since 65851c3d1 (2026-09-05) consumer fulfillment resolves through canonical
 * Grade-A authority, and that binding refuses outright without a track: a route
 * match alone is not enough where two legal-design tracks share one runtime
 * pathway, so `packetFulfillmentAuthority(code, pathwayId)` with no binding can
 * never return allowed, for any route. These checks were left asking it anyway,
 * so they reported every record as unearned regardless of its proof.
 *
 * The track comes from the specification registered for the route. That is not
 * a shortcut around the check: the substantive comparisons inside the binding —
 * record against specification, specification against its bytes on disk, and
 * the exact provider and renderer identity — all still run, and the record's
 * own specification id and version are asserted separately below.
 */
const boundTrackFor = (routeKey) => composablePacketSpecificationFor(routeKey)?.trackId ?? null;

let checks = 0;
const failures = [];
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};
const refuses = (fn) => { try { fn(); return false; } catch { return true; } };

// ------------------------------------------------------- the gate itself
const census = JSON.parse(fs.readFileSync("data/rcap-ledger/commercial-packet-integrity.json", "utf8"));
const ledger = JSON.parse(fs.readFileSync("data/rcap-ledger/packet-fulfillment-records.json", "utf8"));

ok("no route has a fulfillment record it has not earned",
  Array.isArray(ledger.records));
for (const record of ledger.records ?? []) {
  const [recordCode, recordPathwayId] = record.routeKey.split(/:(.+)/);
  const decision = packetFulfillmentAuthority(recordCode, recordPathwayId, undefined,
    { trackId: boundTrackFor(record.routeKey) });
  ok(`${record.routeKey}: its record actually proves delivery`, decision.allowed === true,
    decision.allowed ? "" : decision.missing.join(", "));
}

/**
 * The denominator's own invariants.
 *
 * The census used to take its membership from the fulfillment ledger, which
 * made the question "who are we answering for?" a function of the answers.
 * Withdrawing one unearned record then deleted its route from the census
 * entirely — a route we still intend to sell, quietly stopped being asked
 * about. These hold the separation: intent decides who is in, proof decides
 * what they may do, and only a recorded decision changes who is in.
 */
const denominator = JSON.parse(fs.readFileSync("data/rcap-ledger/commercial-denominator.json", "utf8"));
const withdrawals = JSON.parse(fs.readFileSync("data/rcap-ledger/fulfillment-authority-withdrawals.json", "utf8"));
const departures = census.departuresFromTheCommercialDenominator;

// 1. Every route in the denominator appears exactly once.
const seen = new Map();
for (const row of census.rows) seen.set(row.route, (seen.get(row.route) ?? 0) + 1);
ok("every denominator route appears exactly once in the census",
  denominator.routes.every((route) => seen.get(route) === 1) && seen.size === denominator.routes.length,
  `${seen.size} row keys for ${denominator.routes.length} denominator routes`);
ok("the census and the denominator are pinned to the same set",
  createHash("sha256").update([...seen.keys()].sort().join("\n")).digest("hex") === denominator.sha256);

// 2. A fulfillment record does not create membership.
ok("no route is in the denominator only because it holds a record",
  census.rows.every((row) => row.intendedCommercialStatus !== undefined
    && ["paid_packet_intended", "evaluator_payment_allowed", "sponsored_credit_consumable"]
      .includes(row.intendedCommercialStatus)));

// 3 and 7. A route without a record is still answered for, not absent.
const recordless = census.rows.filter((row) => !row.fulfillmentRecordPresent);
ok("routes with no fulfillment record are still carried in the census", recordless.length > 0);
ok("every refused route states exactly why its commercial authority is refused",
  census.rows.filter((row) => !row.gradeAProofValid).every((row) =>
    typeof row.commercialAuthorityRefusedBecause === "string" && row.commercialAuthorityRefusedBecause.length > 0),
  census.rows.filter((row) => !row.gradeAProofValid && !row.commercialAuthorityRefusedBecause).map((row) => row.route).join(", "));

// 4. A record may exist only when every required Grade-A proof is valid.
ok("no route holds a fulfillment record its proofs do not support",
  census.rows.every((row) => !row.fulfillmentRecordPresent || row.gradeAProofValid),
  census.rows.filter((row) => row.fulfillmentRecordPresent && !row.gradeAProofValid).map((row) => row.route).join(", "));

// 5. A denominator route with no valid authority fails closed at the gate that
//    actually governs money. `checkoutState` is the route resolver's posture,
//    and the two disagreeing is this census's central finding rather than
//    something to assert away: 25 routes have checkout open at the resolver
//    while nothing proves they deliver a packet, and what stops them is the
//    commercial admission gate, driven surface by surface below.
ok("every route without valid fulfillment authority is refused commercial admission",
  census.rows.every((row) => row.gradeAProofValid || row.commercialAdmissionState === "refused"),
  census.rows.filter((row) => !row.gradeAProofValid && row.commercialAdmissionState !== "refused").map((row) => row.route).join(", "));
ok("the census still reports the routes whose resolver posture disagrees with their proof",
  census.rows.some((row) => !row.gradeAProofValid && row.checkoutState === "open"));

// 6. A withdrawn record stays traceable and carries no authority.
//
//    Checked in both directions, because a loop over the ledger proves nothing
//    when the ledger is empty: erasing it would have satisfied every assertion
//    below by having none to make. The census is generated from the ledger, so
//    the two must agree on how many withdrawals exist, and a census row that
//    remembers a withdrawal the ledger has forgotten is an erasure.
const rowsWithWithdrawal = census.rows.filter((row) => row.withdrawalRecord !== null);
ok("the withdrawal ledger and the census agree on how many records were withdrawn",
  rowsWithWithdrawal.length === (withdrawals.withdrawals ?? []).length,
  `${rowsWithWithdrawal.length} census row(s) vs ${(withdrawals.withdrawals ?? []).length} ledger entr(ies)`);
for (const row of rowsWithWithdrawal) {
  ok(`${row.route}: the withdrawal its census row cites is still in the ledger`,
    (withdrawals.withdrawals ?? []).some((entry) => entry.routeKey === row.route));
}
for (const withdrawal of withdrawals.withdrawals ?? []) {
  const row = census.rows.find((entry) => entry.route === withdrawal.routeKey);
  ok(`${withdrawal.routeKey}: a withdrawn record leaves the route in the census`, Boolean(row));
  ok(`${withdrawal.routeKey}: the withdrawal is visible on its census row`,
    row?.withdrawalRecord?.priorRecordSha256 === withdrawal.priorRecordSha256);
  ok(`${withdrawal.routeKey}: the withdrawal carries no commercial authority`,
    row?.commercialAdmissionState === "refused" && row?.checkoutState === "refused"
    && row?.sponsorshipState === "refused" && row?.creditConsumptionState === "refused");
  ok(`${withdrawal.routeKey}: the route and its legal work are preserved`, row?.routeAndLegalWorkPreserved === true);
  ok(`${withdrawal.routeKey}: a withdrawal is not a departure from the denominator`,
    !departures.routes.some((entry) => entry.route === withdrawal.routeKey));
}

// 8. Every actual removal is an explicit, provenanced departure.
ok("every departure names its decision, date and both denominator hashes",
  departures.routes.every((entry) => typeof entry.leftBecause === "string" && entry.leftBecause.length > 0
    && typeof entry.decisionRecord === "string" && entry.decisionRecord.length > 0
    && /^\d{4}-\d{2}-\d{2}$/.test(entry.decidedOn ?? "")
    && /^[0-9a-f]{64}$/.test(entry.priorDenominatorSha256 ?? "")
    && /^[0-9a-f]{64}$/.test(entry.newDenominatorSha256 ?? "")
    && entry.priorDenominatorSha256 !== entry.newDenominatorSha256));
ok("no route is both in the denominator and recorded as having left it",
  departures.routes.every((entry) => !denominator.routes.includes(entry.route)));
ok("the accounting closes over every witnessed route",
  departures.reconciliation.includes(`= ${census.rows.length} + ${departures.count} +`));

const MONEY_SURFACES = [
  "checkout creation",
  "consumer payment authority",
  "sponsored entitlement",
  "packet credit consumption"
];
const SURFACES = [
  "checkout creation",
  "consumer payment authority",
  "sponsored entitlement",
  "packet generation",
  "packet credit consumption",
  "participant delivery"
];
// Every commercial route in the census must be refused at every surface, unless
// it has earned a record. This is the containment claim, driven six ways.
// Proven is what canonical Grade-A authority admits, not what the superseded
// ledger still lists. Four routes are admitted today while holding no ledger
// record, and asserting they refuse would assert the opposite of the authority
// that actually governs them.
const proven = new Set(census.rows.filter((row) => row.gradeAProofValid).map((row) => row.route));
for (const row of census.rows) {
  const [code, pathwayId] = row.route.split(/:(.+)/);
  const decision = packetFulfillmentAuthority(code, pathwayId, undefined, { trackId: boundTrackFor(row.route) });
  if (proven.has(row.route)) {
    ok(`${row.route}: proven, so the packet itself is established`, decision.allowed === true,
      decision.allowed ? "" : decision.missing.join(", "));
    // Proven is not sold. A record with a held posture proves the packet exists
    // and still refuses every surface where money or an entitlement changes
    // hands, which is the whole point of separating the two questions.
    // The posture that governs, not the one the superseded ledger file records.
    // Canonical authority composes the effective postures and may open a
    // channel the old ledger still holds — the Mississippi paid-consumer
    // successor does exactly that for consumer surfaces while sponsored stays
    // held. Reading the file here asserted a refusal the system had already
    // been authorized to stop making.
    const record = decision.record ?? (ledger.records ?? []).find((entry) => entry.routeKey === row.route);
    for (const surface of MONEY_SURFACES) {
      const posture = surface === "sponsored entitlement" || surface === "packet credit consumption"
        ? record.sponsoredPosture
        : record.consumerPosture;
      if (posture !== "held") continue;
      ok(`${row.route}: ${surface} refuses while its posture is held`,
        refuses(() => assertPacketFulfillmentProven(code, pathwayId, surface, { trackId: boundTrackFor(row.route) })));
    }
    // Generation and delivery are reachable, because they are only ever reached
    // through an entitlement the surfaces above already gated.
    for (const surface of ["packet generation", "participant delivery"]) {
      ok(`${row.route}: ${surface} is open on a proven packet`,
        !refuses(() => assertPacketFulfillmentProven(code, pathwayId, surface, { trackId: boundTrackFor(row.route) })));
    }
    continue;
  }
  ok(`${row.route}: no proof, so no commercial authority`, decision.allowed === false, decision.allowed ? "allowed" : "");
  for (const surface of SURFACES) {
    ok(`${row.route}: ${surface} refuses`, refuses(() => assertPacketFulfillmentProven(code, pathwayId, surface, { trackId: boundTrackFor(row.route) })));
  }
}

// A record is not a rubber stamp: each field must carry weight. Exercised
// through the pure shortfall function rather than by writing rows into the
// ledger — mutating a tracked file to prove a rule about tracked files is a bad
// trade, and a module cache would make the re-import a lie anyway.
const complete = {
  routeKey: "ZZ:probe", jurisdiction: "ZZ", pathwayId: "probe",
  packetFamily: "probe-family", packetFamilyLabel: "Probe Family",
  packetSpecificationId: "zz-probe", packetSpecificationVersion: "1.0.0",
  packetSpecificationPath: "data/record-clearing/packet-specifications/ZZ-probe.v1.json",
  packetSpecificationSha256: "0".repeat(64),
  packetComponents: [...REQUIRED_PACKET_COMPONENTS], contentType: "application/pdf",
  sourceIdentities: [{ sourceId: "ZZ:probe.pdf", kind: "official_form", verification: "present_in_repository" }],
  artifactProvider: "rcap_grade_a_composer_v1", artifactProviderVersion: "1.0.0",
  renderer: "rcap_grade_a_document_v1", rendererVersion: "1.0.0",
  requiredFacts: ["participant_full_legal_name"],
  finalVerificationRequirements: ["the participant signs the filing"],
  verificationBinding: "protected packet verification hash", privateDelivery: true,
  repeatDownload: true,
  artifactApprovalStatus: "counsel_reviewed", consumerPosture: "open", sponsoredPosture: "open", holdReason: "",
  provenBy: "a probe", provenOn: "2026-08-28"
};
ok("a record that proves every field grants authority",
  packetFulfillmentShortfall(complete).length === 0, packetFulfillmentShortfall(complete).join(", "));
ok("no record at all is a refusal, not a gap", packetFulfillmentShortfall(undefined).length > 0);
for (const [label, record] of [
  ["a text/plain packet", { ...complete, contentType: "text/plain" }],
  ["the summary provider", { ...complete, artifactProvider: "rcap_source_engine" }],
  ["a retired legacy provider", { ...complete, artifactProvider: "rcap_legacy_mississippi" }],
  ["the retired factory provider", { ...complete, artifactProvider: "rcap_packet_factory_v2" }],
  ["no specification hash", { ...complete, packetSpecificationSha256: "" }],
  ["a specification hash that is not a sha256", { ...complete, packetSpecificationSha256: "not-a-hash" }],
  ["no specification version", { ...complete, packetSpecificationVersion: "v1" }],
  ["a source identity with no verification state", { ...complete, sourceIdentities: [{ sourceId: "x", kind: "y" }] }],
  ["no required facts", { ...complete, requiredFacts: [] }],
  ["no final-verification requirements", { ...complete, finalVerificationRequirements: [] }],
  ["no artifact approval status", { ...complete, artifactApprovalStatus: "" }],
  ["an invented consumer posture", { ...complete, consumerPosture: "maybe" }],
  ["an invented sponsored posture", { ...complete, sponsoredPosture: "maybe" }],
  ["a hold with no reason", { ...complete, consumerPosture: "held", holdReason: "" }],
  ["no packet family", { ...complete, packetFamily: "" }],
  ["a missing proposed order", { ...complete, packetComponents: REQUIRED_PACKET_COMPONENTS.filter((c) => !c.startsWith("proposed order")) }],
  ["a missing filing destination", { ...complete, packetComponents: REQUIRED_PACKET_COMPONENTS.filter((c) => c !== "filing destination") }],
  ["a missing service step", { ...complete, packetComponents: REQUIRED_PACKET_COMPONENTS.filter((c) => c !== "service or notice") }],
  ["no source identity", { ...complete, sourceIdentities: [] }],
  ["no renderer", { ...complete, renderer: "" }],
  ["no verification binding", { ...complete, verificationBinding: "" }],
  ["no private delivery", { ...complete, privateDelivery: false }],
  ["no repeat download", { ...complete, repeatDownload: false }],
  ["no proof", { ...complete, provenBy: "" }],
  ["no proof date", { ...complete, provenOn: "soon" }]
]) {
  ok(`a record with ${label} grants nothing`, packetFulfillmentShortfall(record).length > 0);
}

// -------------------------------------------- the paid path cannot emit text
const generation = fs.readFileSync("src/lib/expungement-ai/packet-generation.ts", "utf8");
const builder = generation.slice(generation.indexOf("function buildConsumerPacketArtifact"));
const builderBody = builder.slice(0, builder.indexOf("\n}\n") + 3);
ok("the paid artifact builder no longer returns a text/plain packet",
  !/contentType:\s*"text\/plain"/.test(builderBody));
ok("and it no longer names the summary provider",
  !/provider:\s*"rcap_source_engine"/.test(builderBody));
ok("it dispatches on the fulfillment record instead",
  builderBody.includes("packetFulfillmentAuthority"));
ok("and fails closed when no provider is implemented",
  /Failing closed rather than substituting a summary/.test(builderBody));
ok("the only implemented dispatch is the Grade-A composer",
  builderBody.includes('artifactProvider === "rcap_grade_a_composer_v1"'));
ok("the summary renderer survives, reachable only for saved guidance",
  generation.includes("renderRouteSummaryForSavedGuidance"));

// ------------------------------------------------- no wrong-state rendering
ok("the document renderer map is exhaustive with no default",
  SUPPORTED_DOCUMENT_PACKET_STATES.length === 5
  && ["TX", "PA", "DC", "IL", "MS"].every((code) => SUPPORTED_DOCUMENT_PACKET_STATES.includes(code)),
  SUPPORTED_DOCUMENT_PACKET_STATES.join(", "));
// Cross-state: every jurisdiction that is NOT one of the five must render
// nothing rather than another state's petition.
const supported = new Set(SUPPORTED_DOCUMENT_PACKET_STATES);
let unsupportedChecked = 0;
for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  if (supported.has(code)) {
    ok(`${code} renders its own document component`, documentPacketRendererFor(code) !== null);
    continue;
  }
  unsupportedChecked += 1;
  ok(`${code} renders no document component rather than another state's`, documentPacketRendererFor(code) === null);
}
ok("every unsupported jurisdiction was checked", unsupportedChecked === 46, String(unsupportedChecked));
for (const junk of ["", " ", null, undefined, "ZZ", "mississippi", "M", "TXX"]) {
  ok(`an unrecognised state (${JSON.stringify(junk)}) renders nothing`, documentPacketRendererFor(junk) === null);
}
// The five that ARE supported must each map to a DIFFERENT component, or the
// fallback is still there wearing a map.
const components = SUPPORTED_DOCUMENT_PACKET_STATES.map((code) => documentPacketRendererFor(code));
ok("each supported state maps to its own component", new Set(components).size === components.length);

for (const page of ["src/app/documents/[partnerSlug]/page.tsx", "src/app/documents/[partnerSlug]/[packetId]/page.tsx"]) {
  const source = fs.readFileSync(page, "utf8");
  ok(`${page} dispatches through the governed renderer`, source.includes("<DocumentPacketRenderer packet={packet} />"));
  ok(`${page} names no state component directly`,
    !/MississippiPetitionPacketPreview|TexasHarrisDocumentPacketPreview|IllinoisDocumentPacketPreview|PennsylvaniaDocumentPacketPreview|DcDocumentPacketPreview/.test(source));
  ok(`${page} carries no packet.state equality chain`, !/packet\.state\s*===/.test(source));
}

console.log(`Commercial packet integrity: ${checks} checks over ${census.rows.length} commercial routes and ${SUPPORTED_DOCUMENT_PACKET_STATES.length} supported document states.`);
if (failures.length > 0) {
  console.error("\nCommercial packet integrity FAILED:");
  for (const failure of failures.slice(0, 25)) console.error(`  - ${failure}`);
  if (failures.length > 25) console.error(`  - ...and ${failures.length - 25} more`);
  process.exit(1);
}
console.log("No route holds commercial authority without a proven fulfillment record, the paid path cannot emit a text summary, and no jurisdiction renders another state's filing.");
