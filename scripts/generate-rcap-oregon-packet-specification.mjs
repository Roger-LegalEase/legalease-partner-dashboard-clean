#!/usr/bin/env node
// The Oregon packet specification, derived rather than authored.
//
// WHY THIS EXISTS
//
// A Grade-A record vouches that a route delivers an exact document set, and the
// thing it vouches for has to be pinned to something. Until now the Oregon
// record pinned nothing: packetFamilyId was null, and resolvePacketFamilyId --
// which the runtime treats as an independent server-side statement of the same
// fact -- also returned null, because exactly one specification was registered
// and it was North Dakota's. The cross-check passed as null === null. It agreed
// for the wrong reason, which is the failure mode a cross-check exists to catch.
//
// WHAT THIS DERIVES, AND WHAT IT REFUSES TO INVENT
//
// Everything here is copied from a record that already controls it:
//
//   the packet set, its components, roles, requirements and participant actions
//     <- data/record-clearing/legal-design-packet-set-manifests.json, which
//        carries the owner-approved legal design for or_acquittal-set
//   the route, track, profile version and packet-set binding
//     <- data/rcap-ledger/launch-graph.json
//   the packet family label
//     <- data/rcap-ledger/packet-family-build-status.json, which already names
//        this route's family
//   source identities, content digests, field-map identity, renderer identity
//     <- the Lane C overlay's own source-record, overlay-profile, field-census
//        and rendered-artifacts reports
//
// What it does NOT do is write Oregon law. North Dakota's specification carries
// a statutory authority, a rule statement, a filing destination, a fee-and-
// waiver rule, a service rule, copy requirements, a post-filing timeline and
// hearing stops. Each of those is a legal statement, and no lane and no captain
// gets to author one: the file's own rule is that everything a document says
// about the law comes from the specification, precisely so that legal review can
// see it. Inventing plausible Oregon equivalents here would put statements
// nobody approved into a packet, wearing the authority of a versioned record.
//
// So those sections are written as explicitly UNBOUND, each naming the decision
// that would bind it. That is not a formality: `legalSectionsBound` is false,
// the composer refuses to compose from a specification whose legal sections are
// unbound, and the Grade-A record built on it stays INCOMPLETE. The
// specification becomes real when a legal-design owner decides those sections,
// not when someone fills them in.
//
//   node scripts/generate-rcap-oregon-packet-specification.mjs
//   node scripts/generate-rcap-oregon-packet-specification.mjs --check

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const LAUNCH_GRAPH = "data/rcap-ledger/launch-graph.json";
const FAMILY_STATUS = "data/rcap-ledger/packet-family-build-status.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays/lane-c-candidates/oregon";
const OUT = "data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json";

const ROUTE_KEY = "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c";
const PACKET_SET_ID = "or_acquittal-set";

// The overlay directory that implements each official form this packet binds.
const OVERLAY_FOR = {
  "OR-OJD-ADULT-SET-ASIDE-PACKET": "or-ojd-adult-set-aside-packet-motion-and-declaration",
  "OR-OSP-SET-ASIDE-CCH": "or-osp-set-aside-criminal-history-request-and-instructions"
};

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");

// Key-sorted at every depth, so a hash over this is a hash over content and not
// over the order a generator happened to build an object in.
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

const manifests = read(MANIFESTS);
const launchGraph = read(LAUNCH_GRAPH);
const familyStatus = read(FAMILY_STATUS);

const set = (manifests.packetSets ?? []).find((s) => s.packetSetId === PACKET_SET_ID);
if (!set) throw new Error(`${PACKET_SET_ID} is not in ${MANIFESTS}`);
const row = (launchGraph.rows ?? []).find((r) => r.pathwayKey === ROUTE_KEY);
if (!row) throw new Error(`${ROUTE_KEY} is not in ${LAUNCH_GRAPH}`);
const familyRow = (familyStatus.rows ?? []).find((r) => r.routeKey === ROUTE_KEY);
if (!familyRow) throw new Error(`${ROUTE_KEY} is not in ${FAMILY_STATUS}`);

// ---- the family identity ----------------------------------------------------
// The label is not coined here; it is the one the controlling build-status
// record already carries for this exact route. The id follows the established
// rcap-<state>-<output kind> convention, and the output kind is read from the
// components rather than chosen: this packet fills official PDFs.
const outputStrategies = [...new Set(set.components.map((c) => c.outputStrategy))].sort();
const bindsOfficialPdf = outputStrategies.includes("official_pdf_fill");
const PACKET_FAMILY_ID = bindsOfficialPdf ? "rcap-or-official-pdf-fill" : "rcap-or-process-guidance";

// ---- source identities, from the overlays that implement them ---------------
const sourceIdentities = [];
for (const sourceId of [...new Set(set.components.map((c) => c.officialFormId).filter(Boolean))].sort()) {
  const dir = OVERLAY_FOR[sourceId];
  if (!dir) throw new Error(`no overlay is mapped for ${sourceId}`);
  const record = read(`${OVERLAY_ROOT}/${dir}/source-record.json`);
  // The two Oregon overlays carry their field map under different names because
  // one form is a flat document and the other is an AcroForm. Both are the same
  // thing for this purpose -- the map that decides where a fact lands -- and the
  // schema each declares is recorded rather than normalised away.
  const mapRel = ["overlay-profile.json", "production-field-map.json"]
    .map((name) => `${OVERLAY_ROOT}/${dir}/${name}`)
    .find((rel) => fs.existsSync(path.join(rootDir, rel)));
  if (!mapRel) throw new Error(`${sourceId}: no overlay profile or production field map`);
  const profile = read(mapRel);
  const census = read(`${OVERLAY_ROOT}/${dir}/field-census.json`);
  const rendered = read(`${OVERLAY_ROOT}/${dir}/reports/rendered-artifacts.json`);
  const filled = rendered.artifacts["fixtures/canonical-filled.pdf"];
  sourceIdentities.push({
    sourceId,
    kind: record.assetClass,
    officialTitle: record.officialTitle,
    revision: record.revision,
    verification: "asserted_by_ingestion",
    location: record.canonicalBundlePath,
    sha256: record.sha256,
    // The field map is part of what a specification pins: the same source bytes
    // filled through a different map produce a different document.
    fieldMap: {
      overlayFamily: profile.family,
      mapRecord: mapRel,
      mapSchemaVersion: profile.schemaVersion,
      overlayProfileSha256: sha256(stable(profile)),
      boundFields: (profile.bindings ?? []).length,
      censusFields: (census.fields ?? []).length,
      note: `${(profile.bindings ?? []).length} of ${(census.fields ?? []).length} census fields are bound by this overlay.`
    },
    renderedArtifact: {
      renderer: rendered.renderer,
      deterministicRenderVerified: Boolean(rendered.deterministicRenderVerified),
      canonicalFilledSha256: filled.sha256,
      canonicalFilledBytes: filled.bytes
    }
  });
}

// ---- documents, from the owner-approved manifest ----------------------------
const documents = set.components
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((component) => ({
    documentId: component.componentId,
    role: component.role,
    order: component.order,
    outputStrategy: component.outputStrategy,
    requirement: component.requirement,
    conditionDescription: component.conditionDescription ?? undefined,
    officialFormId: component.officialFormId ?? null,
    manifestComponentId: component.componentId,
    // Section text is a legal statement. The manifest does not carry one for
    // these components and this generator does not write one.
    sections: []
  }));

// ---- the legal sections nobody here may write -------------------------------
const UNBOUND = (decision) => ({ bound: false, boundBy: null, decisionRequired: decision });
const legalSections = {
  statutoryAuthority: UNBOUND(
    "The controlling ORS subsection for this route, and the rule statement a packet may print. The route id names ORS 137.225(1)(c); the legal-design track registry files or_acquittal under a different subsection; Oregon's committed legal review flags the same area as unsettled. Two committed records disagree and a generator does not pick one."
  ),
  filingDestination: UNBOUND("Which court and which case number an Oregon set-aside motion is filed in, and the rule that says so."),
  feeAndWaiver: UNBOUND("The Oregon filing fee for this motion, whether a waiver applies, and the rule for each."),
  serviceAndNotice: UNBOUND("Whether service on the district attorney is required, on whom, and whether a certificate of service is included."),
  copyRequirements: UNBOUND("How many copies a participant brings and what happens to each."),
  postFilingTimeline: UNBOUND("The steps and timings after filing that a packet may state as fact."),
  hearingAndObjectionStops: UNBOUND("The situations in which a participant must stop and get help.")
};
const unboundLegalSections = Object.keys(legalSections).filter((k) => !legalSections[k].bound).sort();

const specification = {
  schemaVersion: 2,
  specificationId: "or-set-aside-without-conviction",
  specificationVersion: "1.0.0",
  routeKey: ROUTE_KEY,
  jurisdiction: row.jurisdiction,
  pathwayId: row.pathwayId,
  pathwayLabel: row.pathwayLabel,
  packetFamily: PACKET_FAMILY_ID,
  packetFamilyLabel: familyRow.packetFamily,
  packetFamilyLabelSource: FAMILY_STATUS,
  trackId: set.trackId,
  packetSetId: set.packetSetId,
  packetSetVersion: set.version,
  profileId: row.jurisdiction,
  profileVersion: row.compiledPathway?.profileVersion ?? null,
  generatedBy: "scripts/generate-rcap-oregon-packet-specification.mjs",
  derivedFrom: [MANIFESTS, LAUNCH_GRAPH, FAMILY_STATUS, OVERLAY_ROOT],
  specificationNote:
    "Derived from the owner-approved legal design for or_acquittal-set. It carries no legal statement that was not already approved, and it carries no legal statement this generator would have had to write. The sections that would need one are declared unbound below.",
  legalSectionsBound: false,
  unboundLegalSections,
  legalSections,
  whyIncomplete:
    "A packet may not be composed from this specification and no route may be proven on it while legalSectionsBound is false. That is the point: the specification exists so the family binding is real and checkable, not so the route can advance without the decisions it is still missing.",
  sourceIdentities,
  requiredFacts: [],
  requiredFactsNote:
    "The manifest states participant actions rather than a fact schema, so no fact ids are derived here. Binding them is part of the same legal-design decision that binds the sections above.",
  finalVerificationRequirements: [],
  documents,
  participantActionRequired: set.participantActionRequired,
  requiredBeforeFiling: set.requiredBeforeFiling,
  attachments: [],
  participantChecklist: []
};

// ---- the canonical specification hash ---------------------------------------
// Over the whole content, not over a set id and two counts. Replacing a bound
// official form, a field map, a component role, a requirement or a participant
// action all move this value; the previous hash moved for none of them.
const specificationSha256 = sha256(stable(specification));
const doc = { ...specification, specificationSha256 };

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) {
    console.error(`Oregon packet specification is stale. Run: node scripts/generate-rcap-oregon-packet-specification.mjs`);
    process.exit(1);
  }
  console.log(`Oregon packet specification current. ${documents.length} document(s), specification ${specificationSha256.slice(0, 12)}…`);
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`Wrote ${OUT}`);
  console.log(`  family      ${PACKET_FAMILY_ID}  (${familyRow.packetFamily})`);
  console.log(`  documents   ${documents.length}   sources ${sourceIdentities.length}`);
  console.log(`  spec sha    ${specificationSha256}`);
  console.log(`  legal       UNBOUND: ${unboundLegalSections.join(", ")}`);
}
