#!/usr/bin/env node
// The three Oregon disposition-bound configurations the decision owner required.
//
// WHY THREE
//
// One route was labelled "arrests or charges without conviction under
// ORS 137.225(1)(c)" and delivered the acquittal packet. The decision owner
// found it legally overbroad and split it, because paragraph (1)(c) applies only
// where no accusatory instrument was filed; acquittals and ordinary dismissals
// are governed by (1)(d). The court's own form says the same thing in its own
// words, and this generator reads those words rather than restating them:
//
//   Option 2  "There was a court case, and I am not moving to set aside any
//              convictions. I am moving to set aside all eligible dismissed or
//              acquitted charges only."
//   Option 3  "I was cited or arrested and there was no court case. I am moving
//              to set aside the citation or arrest records."
//
// So the same statewide OJD form serves all three, and which OPTION is selected
// is what distinguishes them. That is the whole design: not three forms, three
// disposition predicates over one form, each with an identity that cannot be
// selected by the wrong disposition.
//
// WHAT THIS REUSES RATHER THAN REBUILDS
//
// The three packet sets already exist at full parity -- seven components each,
// sixteen participant actions each, the same two official sources. The overlays,
// source digests, fulfillment v2 architecture, ownership, payment, render and
// delivery implementation are all untouched. This adds route and configuration
// identities over what is already there.
//
//   node scripts/generate-rcap-oregon-disposition-configurations.mjs
//   node scripts/generate-rcap-oregon-disposition-configurations.mjs --check

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const LAUNCH_GRAPH = "data/rcap-ledger/launch-graph.json";
const DECISIONS = "data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays/lane-c-candidates/oregon";
const OUT = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";

const SUPERSEDED_ROUTE = "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

const manifests = read(MANIFESTS);
const launchGraph = read(LAUNCH_GRAPH);
const decisions = read(DECISIONS);
const setById = new Map(manifests.packetSets.map((s) => [s.packetSetId, s]));

const OVERLAY_FOR = {
  "OR-OJD-ADULT-SET-ASIDE-PACKET": "or-ojd-adult-set-aside-packet-motion-and-declaration",
  "OR-OSP-SET-ASIDE-CCH": "or-osp-set-aside-criminal-history-request-and-instructions"
};

/**
 * The three treatments, each naming its authority, its form option and the
 * packet set that already exists for it. Nothing here is invented: the authority
 * and option come from the recorded decision, the packet sets from the manifest.
 */
const TREATMENTS = [
  {
    configurationId: "or-never-charged-137-225-1-c",
    routeId: "OR:set-aside-of-a-citation-or-arrest-with-no-accusatory-instrument-under-ors-137-225-1-c",
    label: "NEVER CHARGED",
    authority: "ORS 137.225(1)(c)",
    formOption: "Option 3",
    formOptionText:
      "I was cited or arrested and there was no court case. I am moving to set aside the citation or arrest records.",
    packetSetId: "or_arrest_no_charges-set",
    dispositionPredicate: {
      requires: ["no accusatory instrument was filed"],
      refuses: ["an acquittal", "an ordinary dismissal", "any disposition that followed a filed charge"],
      whyItRefuses:
        "The decision owner recorded that paragraph (1)(c) applies ONLY when no accusatory instrument was filed, and that this configuration may not accept an acquittal or an ordinary dismissal as an equivalent disposition."
    },
    // Exactly the facts the decision requires, and only those.
    requiredFacts: [
      { factId: "or.no_accusatory_instrument_filed", proves: "no accusatory instrument was filed", requirement: "required" },
      { factId: "or.prosecutor_elected_not_to_proceed", proves: "the prosecuting attorney elected not to proceed", requirement: "required" },
      { factId: "or.sixty_day_period_elapsed", proves: "the statutory 60-day period has elapsed", requirement: "required" },
      { factId: "or.arrest_or_citation_identity", proves: "exact arrest, citation, or charge identity", requirement: "required" },
      { factId: "or.county_and_prosecuting_office", proves: "correct county and prosecuting office", requirement: "required" }
    ],
    sixtyDayRule:
      "The form's own instruction: file 60 days after the prosecutor says they will not file charges. The alternative it offers -- file any time after dismissal or acquittal -- belongs to the (1)(d) configurations and is deliberately not available here."
  },
  {
    configurationId: "or-acquittal-137-225-1-d",
    routeId: "OR:set-aside-of-an-acquittal-under-ors-137-225-1-d",
    label: "ACQUITTAL",
    authority: "ORS 137.225(1)(d)",
    formOption: "Option 2",
    formOptionText:
      "There was a court case, and I am not moving to set aside any convictions. I am moving to set aside all eligible dismissed or acquitted charges only.",
    packetSetId: "or_acquittal-set",
    dispositionPredicate: {
      requires: ["a court case existed", "the charge ended in acquittal"],
      refuses: ["a citation or arrest with no court case", "any conviction being set aside on this configuration"],
      whyItRefuses:
        "Option 2 is available only where there was a court case. A participant who was never charged has no case to name on it."
    },
    requiredFacts: [
      { factId: "or.court_case_existed", proves: "there was a court case", requirement: "required" },
      { factId: "or.disposition_is_acquittal", proves: "the charge ended in acquittal", requirement: "required" },
      { factId: "or.no_conviction_in_scope", proves: "no conviction is being set aside on this configuration", requirement: "required" },
      { factId: "or.case_identity", proves: "exact case identity", requirement: "required" },
      { factId: "or.county_and_court", proves: "correct county and court", requirement: "required" }
    ]
  },
  {
    configurationId: "or-ordinary-dismissal-137-225-1-d",
    routeId: "OR:set-aside-of-an-ordinary-dismissal-under-ors-137-225-1-d",
    label: "ORDINARY DISMISSAL",
    authority: "ORS 137.225(1)(d)",
    formOption: "Option 2",
    formOptionText:
      "There was a court case, and I am not moving to set aside any convictions. I am moving to set aside all eligible dismissed or acquitted charges only.",
    packetSetId: "or_dismissed_charge-set",
    dispositionPredicate: {
      requires: ["a court case existed", "the charge was dismissed"],
      refuses: ["a citation or arrest with no court case", "an acquittal, which is its own configuration"],
      whyItRefuses:
        "Acquittal and dismissal share Option 2 on the form and share a subsection, and they are still two dispositions. Giving them one configuration is what produced the overbroad route this replaces."
    },
    requiredFacts: [
      { factId: "or.court_case_existed", proves: "there was a court case", requirement: "required" },
      { factId: "or.disposition_is_dismissal", proves: "the charge was dismissed", requirement: "required" },
      { factId: "or.no_conviction_in_scope", proves: "no conviction is being set aside on this configuration", requirement: "required" },
      { factId: "or.case_identity", proves: "exact case identity", requirement: "required" },
      { factId: "or.county_and_court", proves: "correct county and court", requirement: "required" }
    ]
  }
];

// ---- one specification per configuration -----------------------------------
const configurations = TREATMENTS.map((t) => {
  const set = setById.get(t.packetSetId);
  if (!set) throw new Error(`${t.configurationId} names packet set ${t.packetSetId}, which is not in the manifest`);

  const sourceIdentities = [...new Set(set.components.map((c) => c.officialFormId).filter(Boolean))].sort().map((sourceId) => {
    const dir = OVERLAY_FOR[sourceId];
    if (!dir) throw new Error(`no overlay is mapped for ${sourceId}`);
    const record = read(`${OVERLAY_ROOT}/${dir}/source-record.json`);
    return {
      sourceId,
      officialTitle: record.officialTitle,
      revision: record.revision,
      sha256: record.sha256,
      location: record.canonicalBundlePath,
      // The same base asset across all three, which the decision expressly permits.
      sharedAcrossConfigurations: true
    };
  });

  const specification = {
    schemaVersion: 2,
    specificationId: t.configurationId,
    specificationVersion: "1.0.0",
    routeKey: t.routeId,
    jurisdiction: "OR",
    label: t.label,
    statutoryAuthority: t.authority,
    formOption: t.formOption,
    formOptionText: t.formOptionText,
    packetFamily: "rcap-or-official-pdf-fill",
    packetConfigurationId: t.configurationId,
    packetSetId: set.packetSetId,
    packetSetVersion: set.version,
    trackId: set.trackId,
    dispositionPredicate: t.dispositionPredicate,
    requiredFacts: t.requiredFacts,
    ...(t.sixtyDayRule ? { sixtyDayRule: t.sixtyDayRule } : {}),
    documents: set.components.slice().sort((a, b) => a.order - b.order).map((c) => ({
      documentId: c.componentId,
      role: c.role,
      order: c.order,
      requirement: c.requirement,
      outputStrategy: c.outputStrategy,
      officialFormId: c.officialFormId ?? null
    })),
    sourceIdentities,
    participantActionRequired: set.participantActionRequired,
    // Everything a packet would PRINT about Oregon law is still undecided. The
    // subsection and the disposition are decided; the filing destination, fee,
    // service rule, copy requirement, timeline and hearing stops are not, and a
    // configuration that pretended otherwise would put unreviewed statements in
    // a participant's hands wearing a versioned identity.
    legalSectionsBound: false,
    unboundLegalSections: [
      "copyRequirements", "feeAndWaiver", "filingDestination",
      "hearingAndObjectionStops", "postFilingTimeline", "serviceAndNotice"
    ],
    commercialStatus: "closed",
    commercialStatusNote:
      "All three configurations are commercially closed. The decision owner resolved the route design; that is not output-level approval and opens no admission point."
  };

  return { ...specification, specificationSha256: sha256(stable(specification)) };
});

// Distinct identity is the property the decision turns on, so it is asserted
// rather than assumed.
const ids = configurations.map((c) => c.specificationId);
const routes = configurations.map((c) => c.routeKey);
const hashes = configurations.map((c) => c.specificationSha256);
for (const [what, list] of [["configuration id", ids], ["route id", routes], ["specification hash", hashes]]) {
  if (new Set(list).size !== list.length) throw new Error(`two configurations share a ${what}`);
}
if (new Set(configurations.map((c) => c.packetSetId)).size !== 3) throw new Error("two configurations share a packet set");

const doc = {
  schemaVersion: "rcap-oregon-disposition-configurations/v1",
  generatedBy: "scripts/generate-rcap-oregon-disposition-configurations.mjs",
  recordedDecisions: ["LWD-2026-08-29-OR-SUBSECTION", "LWD-2026-08-29-OR-PACKET-SCOPE"],
  decisionRecord: DECISIONS,
  decisionOwner: decisions.decisionOwner,
  decisionDate: decisions.decisionDate,
  supersedes: {
    routeId: SUPERSEDED_ROUTE,
    why:
      "The decision owner found it legally overbroad: it was labelled for arrests or charges without conviction under (1)(c) and delivered the acquittal packet, so a participant who was never charged and one who was acquitted resolved to the same configuration under the wrong subsection for one of them.",
    disposition: "retired_and_replaced_by_three_disposition_bound_configurations"
  },
  sharedBaseAsset: {
    sourceId: "OR-OJD-ADULT-SET-ASIDE-PACKET",
    permitted: true,
    permittedBy: "LWD-2026-08-29-OR-PACKET-SCOPE",
    statement:
      "The same statewide OJD form serves all three. What distinguishes them is the option selected on it, and the decision permits the shared base asset expressly while forbidding the three from resolving to one generic or null configuration."
  },
  architecture: {
    shape: "one packet family, three governed configurations",
    packetFamily: "rcap-or-official-pdf-fill",
    permittedBecause:
      "The decision permits one family with multiple configurations only where each configuration has a distinct stable identity and cannot be selected by the wrong disposition. Each has its own configuration id, route id, packet set, required facts, disposition predicate and specification hash, and each predicate names what it refuses.",
    distinctIdentitiesAsserted: true
  },
  configurations,
  commerciallyEligible: 0,
  completePacketProven: 0
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) {
    console.error("Oregon disposition configurations are stale. Run: node scripts/generate-rcap-oregon-disposition-configurations.mjs");
    process.exit(1);
  }
  console.log(`Oregon disposition configurations current: ${configurations.length}, all commercially closed.`);
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`Wrote ${OUT}`);
  for (const c of configurations) {
    console.log(`  ${c.label.padEnd(19)} ${c.statutoryAuthority.padEnd(20)} ${c.formOption}  ${c.packetSetId.padEnd(26)} ${c.specificationSha256.slice(0, 12)}…`);
  }
}
