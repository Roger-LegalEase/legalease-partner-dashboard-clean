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
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";

const { packetFulfillmentAuthority, assertPacketFulfillmentProven, packetFulfillmentShortfall, REQUIRED_PACKET_COMPONENTS } =
  await import("@/lib/expungement-ai/packet-fulfillment-authority");
const { documentPacketRendererFor, SUPPORTED_DOCUMENT_PACKET_STATES } =
  await import("@/components/rcap/documents/DocumentPacketRenderer");
const { getAllJurisdictionProfiles } = await import("@/lib/rcap-engine/profile-registry");

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
  const decision = packetFulfillmentAuthority(...record.routeKey.split(/:(.+)/));
  ok(`${record.routeKey}: its record actually proves delivery`, decision.allowed === true,
    decision.allowed ? "" : decision.missing.join(", "));
}

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
const proven = new Set((ledger.records ?? []).map((record) => record.routeKey));
for (const row of census.rows) {
  const [code, pathwayId] = row.route.split(/:(.+)/);
  const decision = packetFulfillmentAuthority(code, pathwayId);
  if (proven.has(row.route)) {
    ok(`${row.route}: proven, so the packet itself is established`, decision.allowed === true,
      decision.allowed ? "" : decision.missing.join(", "));
    // Proven is not sold. A record with a held posture proves the packet exists
    // and still refuses every surface where money or an entitlement changes
    // hands, which is the whole point of separating the two questions.
    const record = (ledger.records ?? []).find((entry) => entry.routeKey === row.route);
    for (const surface of MONEY_SURFACES) {
      const posture = surface === "sponsored entitlement" || surface === "packet credit consumption"
        ? record.sponsoredPosture
        : record.consumerPosture;
      if (posture !== "held") continue;
      ok(`${row.route}: ${surface} refuses while its posture is held`,
        refuses(() => assertPacketFulfillmentProven(code, pathwayId, surface)));
    }
    // Generation and delivery are reachable, because they are only ever reached
    // through an entitlement the surfaces above already gated.
    for (const surface of ["packet generation", "participant delivery"]) {
      ok(`${row.route}: ${surface} is open on a proven packet`,
        !refuses(() => assertPacketFulfillmentProven(code, pathwayId, surface)));
    }
    continue;
  }
  ok(`${row.route}: no proof, so no commercial authority`, decision.allowed === false, decision.allowed ? "allowed" : "");
  for (const surface of SURFACES) {
    ok(`${row.route}: ${surface} refuses`, refuses(() => assertPacketFulfillmentProven(code, pathwayId, surface)));
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
