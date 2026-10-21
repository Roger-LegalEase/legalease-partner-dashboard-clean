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

// ---- the six legal sections ------------------------------------------------
//
// Bound on 2026-08-29 by the legal owner, from the packet's own numbered
// instructions and ORS 137.225. Every statement below is either something the
// court's own instruction pages say, or the statute the decision names. Where a
// section differs between the (1)(c) and (1)(d) routes it is written per route
// rather than generalised, because "the circuit court where the case happened"
// is not an instruction that can be given to a participant who never had one.
//
// The instruction pages this reads are pages 1 to 3 of the pinned packet
// b22cc346, revision January 2026.

/** Where the motion is filed, in the words the route can actually use. */
function filingDestination(t) {
  const neverCharged = t.formOption === "Option 3";
  return {
    section: "filingDestination",
    statement: neverCharged
      ? "File the motion and the proposed order in the Oregon circuit court for the county where the arrest or citation happened, which is the county where charges could have been filed."
      : "File the motion and the proposed order in the Oregon circuit court where the case happened.",
    court: "Oregon circuit court",
    countyRule: neverCharged
      ? "the county of the arrest or citation, being the county where charges could have been filed"
      : "the county of the court that heard the case",
    basis: [
      "The packet's step 6: \"File your forms in the circuit court where the case happened or would have happened.\"",
      "ORS 137.225(1)(c) and (1)(d)"
    ],
    routeSpecific: true
  };
}

/** What it costs to file, and what there is to waive. */
function feeAndWaiver() {
  return {
    section: "feeAndWaiver",
    courtFilingFee: "none",
    statement:
      "There is no court filing fee for this motion. The motion itself prints \"No Filing Fee\", and ORS 137.225(1)(g) provides that a person filing a motion under the section is not required to pay the filing fee established under ORS 21.135.",
    feeWaiver: "not applicable",
    feeWaiverBecause: "A fee waiver waives a filing fee. There is no filing fee on this motion to waive.",
    separateCost:
      "The Department of State Police charges a record-check fee not exceeding its actual cost. That is paid to the department rather than to the court, and it is not a filing fee.",
    basis: ["The motion's printed \"No Filing Fee\"", "ORS 137.225(1)(g)", "ORS 137.225(2)(d)"]
  };
}

/** Who gets served, how, and when the certificate may be completed. */
function serviceAndNotice(t) {
  const neverCharged = t.formOption === "Option 3";
  return {
    section: "serviceAndNotice",
    statement:
      "Mail a copy of the motion and declaration to the prosecuting attorney "
      + (neverCharged
        ? "for the county where charges could have been filed, or where the arrest occurred."
        : "for the county where the charges were filed."),
    method: "mail",
    servedParty: "the prosecuting attorney with authority to prosecute the charge",
    certificateOfMailing: {
      rule: "The certificate of mailing at the bottom of the form is completed only after the copy has actually been mailed.",
      prefilledByThePlatform: false,
      why:
        "The certificate is a statement that the participant did something, on a date they did it. Nothing can complete it in advance without asserting a mailing that has not happened."
    },
    basis: [
      "The packet's step 4: mail a copy to the Prosecuting Attorney in the county where charges were or could have been filed, or arrest occurred.",
      "The packet's step 5: fill out the certificate of mailing at the bottom of the form.",
      "ORS 137.225(1)(c) and (1)(d)"
    ],
    routeSpecific: true
  };
}

/** How many copies, and who each one is for. */
function copyRequirements() {
  return {
    section: "copyRequirements",
    copies: 2,
    statement: "Make two copies of the motion and declaration: one for the participant's own records, and one to send to the district attorney.",
    allocation: [
      { copy: 1, forWhom: "the participant", purpose: "their own records" },
      { copy: 2, forWhom: "the district attorney", purpose: "the copy mailed under the service rule" }
    ],
    basis: ["The packet's step 3: \"Make 2 copies of the Motion and Declaration: One for your records; One to send to the District Attorney.\""]
  };
}

/** What happens after filing, and what is deliberately not promised. */
function postFilingTimeline(t) {
  return {
    section: "postFilingTimeline",
    statement:
      "The court reviews the motion. Where the requirements of paragraph "
      + (t.authority.includes("(1)(c)") ? "(1)(c)" : "(1)(d)")
      + " are met, ORS 137.225(3)(b) provides that the court shall enter an order sealing the record. The participant receives a copy of the judicial document sealing the case.",
    courtProcessingDeadlinePromised: false,
    whyNoDeadlineIsPromised:
      "No deadline is stated to the participant because none is owed to them. The court's own processing time is not fixed by the statute, and a promised date the court is not bound by is a date the platform would be breaking rather than the court.",
    participantReceives: "a copy of the judicial document sealing the case",
    basis: ["ORS 137.225(3)(b)", "The packet's \"What happens next?\": \"You will receive a copy of the judicial document sealing your case.\""],
    routeSpecific: true
  };
}

/** Where the platform stops and a person takes over. */
function hearingAndObjectionStops() {
  return {
    section: "hearingAndObjectionStops",
    statement:
      "The 120-day objection period is not applied as the ordinary rule for a motion under paragraph (1)(c) or (1)(d). It is the rule ORS 137.225(1)(a) sets for the conviction set-aside track, and these two routes are not that track.",
    ordinaryRuleForTheseRoutes: "no 120-day objection period is stated to the participant",
    handoffTriggers: [
      "the prosecuting attorney objects",
      "the court sets a hearing",
      "the court or the prosecuting attorney requests proof",
      "any fact in the motion is disputed"
    ],
    onTrigger: "attorney or partner handoff",
    whyHandoff:
      "Each trigger turns a form-completion task into a contested proceeding. Nothing here drafts a response, argues eligibility, or appears at a hearing.",
    basis: ["ORS 137.225(1)(a)", "ORS 137.225(1)(c)", "ORS 137.225(1)(d)"]
  };
}

/**
 * Cautions for output-level review. Neither is a defect in this build: each is
 * a place where the court's printed packet and the statute do not line up, and
 * a reviewer needs to see them rather than discover them in a participant's
 * hands.
 */
const OUTPUT_REVIEW_CAUTIONS = [
  {
    cautionId: "ojd-120-day-language-is-generic",
    what:
      "The packet's instruction page states, without qualifying it by subsection: \"The District Attorney typically has 120 days to object.\"",
    against: "ORS 137.225(1)(a), which is where the 120-day objection period is set, and which governs the conviction track rather than (1)(c) or (1)(d).",
    consequenceIfFollowedLiterally:
      "A never-charged or acquittal participant would be told to expect a 120-day objection window that their own subsection does not set, and would wait on a date that is not theirs.",
    handling: "The packet's generic sentence is not restated to the participant. The decision's rule governs: no 120-day period for these routes, and any actual objection is a handoff.",
    forOutputReview: true
  },
  {
    cautionId: "packet-cites-ors-137-255-for-the-sealing-effect",
    what: "The packet's \"What happens next?\" section cites ORS 137.255(4) for the effect of the sealing order.",
    against: "ORS 137.225(4), which is the set-aside statute this packet is built on and which carries that effect.",
    consequenceIfFollowedLiterally: "A citation a participant or a clerk looked up would land on the wrong statute.",
    handling: "Recorded as a source observation. Nothing here reproduces the citation, and the court's own page is not altered.",
    forOutputReview: true
  }
];

function legalSectionsFor(t) {
  return {
    boundOn: "2026-08-29",
    boundBy: "Lawrence (counsel)",
    decisionRecord: DECISIONS,
    readFrom: "the pinned packet's own instruction pages 1 to 3, and ORS 137.225",
    filingDestination: filingDestination(t),
    feeAndWaiver: feeAndWaiver(),
    serviceAndNotice: serviceAndNotice(t),
    copyRequirements: copyRequirements(),
    postFilingTimeline: postFilingTimeline(t),
    hearingAndObjectionStops: hearingAndObjectionStops(),
    outputReviewCautions: OUTPUT_REVIEW_CAUTIONS
  };
}

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
    // All six sections are bound. Binding them is a legal-design decision and
    // not an output-level approval: what a packet may SAY about Oregon law is
    // settled here, and whether the exact artifact that says it may be
    // delivered is a separate question this record does not answer.
    legalSectionsBound: true,
    unboundLegalSections: [],
    legalSections: legalSectionsFor(t),
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
