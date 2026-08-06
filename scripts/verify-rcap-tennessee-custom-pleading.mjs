// Tennessee Title 40, chapter 32 custom-pleading routes — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Tennessee is not enabled and its shared surfaces are untouched, the
// assignment is exactly the eleven assigned tracks and their eighteen assigned
// custom-pleading components, every component has a governing legal-design
// specification, the § 40-32-108(e) actor boundary holds on the face of every
// document, the closed lists and the typed stops fail closed, participant
// values land in the rendered bytes, and every outside-party instrument — the
// clerk's § 40-32-109(c) certification, the TBI certificate, the district
// attorney general's petition and proposed order — is named and never
// generated.
//
// Runs offline against the real renderer, resolver and assembler. No network,
// no database, no promotion.
//
// Deterministic fixtures are defined here rather than in a data file because
// this job owns exactly two paths: the implementation module and this verifier.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { PLEADING_TEMPLATES, pleadingTemplate } = await import(
  "@/lib/rcap/packets/engines/pleading-templates"
);
const { resolvePacket } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const {
  TENNESSEE_CUSTOM_PLEADING_TRACKS,
  TENNESSEE_PLEADING_TEMPLATES,
  TN_DESIGN_ROLE_TO_ENGINE_ROLE,
  deriveTennesseeFacts,
  TennesseeBranchError,
  TennesseeEligibilityStopError,
  TN_DISPOSITION_GROUNDS,
  TN_DIVERSION_KINDS,
  TN_OFFENCE_COMBINATIONS,
  TN_PARDON_EXCLUDED_FELONIES,
  TN_INCHOATE_FORMS,
  TN_REFERRAL
} = await import("@/lib/rcap/packets/jurisdictions/tennessee/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const ASSIGNED = [
  "tn_arrest_no_court_record",
  "tn_eligible_conviction",
  "tn_illegal_voting",
  "tn_judicial_diversion",
  "tn_mistaken_identity",
  "tn_nonconviction_petition",
  "tn_post_pardon",
  "tn_pretrial_diversion",
  "tn_recovery_court",
  "tn_redaction",
  "tn_two_offense"
];

/** The five routes that run through T.C.A. § 40-32-108(e). */
const DA_PREPARED_TRACKS = new Set([
  "tn_eligible_conviction",
  "tn_two_offense",
  "tn_illegal_voting",
  "tn_post_pardon",
  "tn_recovery_court"
]);

// ---------------------------------------------------------------------------
// 0. Tennessee is not enabled, and the shared surfaces are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(TENNESSEE_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Tennessee track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("tn_")).length === 0,
  "Tennessee templates are wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of TENNESSEE_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, TENNESSEE_PLEADING_TEMPLATES);

note(
  "0. Enablement: all eleven assigned tracks and all templates are absent from the shared registry and template pack; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly the eleven assigned tracks and their components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The implemented track set is not exactly the assigned track set."
);

let componentCount = 0;
for (const track of TENNESSEE_CUSTOM_PLEADING_TRACKS) {
  const manifest = manifests.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no packet-set manifest in the adopted legal design.`);
  if (!manifest) continue;

  // Every custom_pleading component in the design must be implemented, and
  // nothing else may be. Tennessee's process_guidance components — the no-cost
  // statement, the filing instructions, the fee disclosure, the alternative
  // route screening — belong to the guidance lane.
  const designCp = manifest.components
    .filter((c) => c.outputStrategy === "custom_pleading")
    .map((c) => c.componentId)
    .sort();
  const implemented = track.packetSet.components.map((c) => c.componentId).sort();
  ok(
    JSON.stringify(designCp) === JSON.stringify(implemented),
    `${track.trackId}: implemented components ${JSON.stringify(implemented)} do not match the assigned custom-pleading components ${JSON.stringify(designCp)}.`
  );
  componentCount += implemented.length;

  for (const other of manifest.components.filter((c) => c.outputStrategy !== "custom_pleading")) {
    ok(
      !implemented.includes(other.componentId),
      `${track.trackId}: ${other.componentId} is ${other.outputStrategy} and must not be implemented by the custom-pleading job.`
    );
  }

  for (const component of track.packetSet.components) {
    const spec = specs.find((s) => s.componentId === component.componentId);
    ok(Boolean(spec), `${component.componentId}: no governing custom-pleading specification.`);
    if (spec) {
      ok(
        TN_DESIGN_ROLE_TO_ENGINE_ROLE[spec.role] === component.role,
        `${component.componentId}: design role ${spec.role} is not mapped to engine role ${component.role}.`
      );
    }
    ok(
      Boolean(pleadingTemplate(component.templateId)),
      `${component.componentId}: template ${component.templateId} is not registered.`
    );
    ok(
      component.sourcePath === null && component.sourceSha256 === null,
      `${component.componentId}: a custom pleading claims an official source.`
    );
    ok(
      component.approval.legal === "not_submitted" && component.approval.visual === "not_reviewed",
      `${component.componentId}: claims an approval this job cannot give.`
    );
  }

  const designTrack = registry.find((t) => t.trackId === track.trackId);
  ok(Boolean(designTrack), `${track.trackId}: not in the normalized track registry.`);
  if (designTrack) {
    ok(
      designTrack.outputStrategy === "custom_pleading",
      `${track.trackId}: the design does not classify this as custom_pleading.`
    );
  }
  ok(track.runtimeDisabled === true, `${track.trackId}: is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId}: is not a technical fixture.`);
}
note(
  `1. Assignment: exactly ${ASSIGNED.length} assigned tracks and ${componentCount} assigned custom-pleading components, each with a governing specification and a registered template; no process_guidance component was implemented.`
);

// ---------------------------------------------------------------------------
// 2. The § 40-32-108(e) actor boundary, on the face of the templates
// ---------------------------------------------------------------------------

const PETITION_WORDS = /\bpetition\b/i;

for (const track of TENNESSEE_CUSTOM_PLEADING_TRACKS.filter((t) => DA_PREPARED_TRACKS.has(t.trackId))) {
  for (const component of track.packetSet.components) {
    const template = pleadingTemplate(component.templateId);
    const source = JSON.stringify(template);

    // The document must never be titled as the petition or the order the
    // office prepares.
    ok(
      !/^PETITION\b/i.test(template.title) && !/^ORDER\b/i.test(template.title),
      `${component.componentId}: a § 40-32-108(e) route document is titled as the petition or the order that the district attorney general prepares.`
    );
    ok(
      component.role !== "primary_filing" && component.role !== "proposed_order",
      `${component.componentId}: a § 40-32-108(e) route document carries the role of a filing or an order.`
    );
    // And it must say, in terms, who prepares them.
    ok(
      /prepared by the office of the district attorney general/i.test(source),
      `${component.componentId}: does not state that the office of the district attorney general prepares the petition and the proposed order.`
    );
    ok(
      /LegalEase does not prepare either one/i.test(source) ||
        /is not that petition/i.test(source),
      `${component.componentId}: does not disclaim being the petition the office prepares.`
    );
    ok(
      PETITION_WORDS.test(source),
      `${component.componentId}: never mentions the petition at all, so the participant cannot know what comes next.`
    );
  }
}
note(
  `2. Actor boundary: on all ${DA_PREPARED_TRACKS.size} § 40-32-108(e) routes, no document is titled or roled as the petition or the proposed order, and each states that the office of the district attorney general prepares them.`
);

// The § 40-32-109 route is the one where the participant does write the
// petition — and the one where the clerk's certification must stay the clerk's.
const noCourtRecord = TENNESSEE_CUSTOM_PLEADING_TRACKS.find(
  (t) => t.trackId === "tn_arrest_no_court_record"
);
const noCourtRecordTemplate = pleadingTemplate(noCourtRecord.packetSet.components[0].templateId);
const noCourtRecordSource = JSON.stringify(noCourtRecordTemplate);
ok(
  noCourtRecord.packetSet.components[0].role === "primary_filing",
  "tn_arrest_no_court_record: the § 40-32-109 petition is not the participant's operative filing."
);
ok(
  /the clerk of this court searches the court's records and certifies/i.test(noCourtRecordSource),
  "tn_arrest_no_court_record: the petition does not name the clerk's § 40-32-109(c) search and certification."
);
ok(
  /it has not been prepared here, and what it will say is not predicted here/i.test(noCourtRecordSource),
  "tn_arrest_no_court_record: the petition does not disclaim generating or predicting the clerk's certification."
);
ok(
  /contains no cross-reference to . 40-32-108/i.test(noCourtRecordSource),
  "tn_arrest_no_court_record: the petition does not record that § 40-32-109 carries no cross-reference to § 40-32-108."
);
// Every mention of § 40-32-108 must be the disclaiming one. An invocation would
// import the 61-day clock, the presumption and the DA-prepared petition, none of
// which reach this route.
ok(
  (noCourtRecordSource.match(/40-32-108/g) ?? []).length === 1,
  "tn_arrest_no_court_record: the petition mentions § 40-32-108 somewhere other than the sentence disclaiming it."
);
ok(
  /mandatory/i.test(noCourtRecordSource) && /8-21-401/.test(noCourtRecordSource),
  "tn_arrest_no_court_record: the petition does not state that the § 8-21-401 clerk's fee is mandatory on this route."
);
note(
  "2b. Section 40-32-109: the petition is the participant's operative filing, names the clerk's certification without generating or predicting it, invokes no part of § 40-32-108, and states the mandatory fee."
);

// The TBI certificate is a court instrument wherever it is required.
for (const trackId of ["tn_pretrial_diversion", "tn_judicial_diversion"]) {
  const track = TENNESSEE_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const source = JSON.stringify(pleadingTemplate(track.packetSet.components[0].templateId));
  ok(
    /certificate is a court instrument completed by court staff/i.test(source),
    `${trackId}: does not state that the TBI certificate is a court instrument.`
  );
  ok(
    /Nothing in this packet is that certificate/i.test(source),
    `${trackId}: does not disclaim generating the TBI certificate.`
  );
  ok(
    /8-21-401/.test(source) && /not free/i.test(source),
    `${trackId}: does not state that the diversion route carries the clerk's fee.`
  );
}
note(
  "2c. Diversion routes: both state that the TBI certificate is a court instrument this packet does not prepare, and that the route is not free."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one positive fixture per assigned track
// ---------------------------------------------------------------------------

const COMMON = {
  stateControlNumber: "TN0099887766",
  otherConvictions: [],
  outOfStateOrFederalRecords: "no",
  citizenshipOrClearance: "no",
  daOpposition: "no"
};

const COURT_CASE = {
  originatingCourt: "General Sessions Court for Davidson County, Tennessee",
  docketNumber: "GS-2019-004417",
  offenceAndDisposition: "Theft of property under $1,000; the charge was dismissed on the State's motion",
  dispositionDate: "11 September 2021"
};

const DA_CASE = {
  convictingCourtAndDistrict:
    "Criminal Court for Davidson County, Tennessee, Twentieth Judicial District",
  docketNumber: "2013-C-2210",
  exactStatutorySection: "T.C.A. § 39-14-105(a)(2)",
  priorExpunction: "none"
};

const SENTENCE = {
  sentenceCompletionDate: "3 February 2015",
  allMoneyPaid: "yes",
  otherIneligibleConviction: "no",
  sectionMatchedToList: "yes"
};

const FIXTURES = [
  {
    fixtureId: "tn-nonconviction-positive-1",
    trackId: "tn_nonconviction_petition",
    answers: {
      ...COMMON,
      ...COURT_CASE,
      dispositionGround: "dismissed",
      cameThroughDiversion: "no",
      anyCountConvicted: "no",
      otherCounties: ["Rutherford County — one open traffic citation"],
      courtFileEverExisted: "yes"
    }
  },
  {
    fixtureId: "tn-mistaken-identity-positive-1",
    trackId: "tn_mistaken_identity",
    answers: {
      ...COMMON,
      ...COURT_CASE,
      mistakenIdentityAccount:
        "The person arrested gave my brother's name and my date of birth. I was at work in Memphis that day and my employer has the timesheet.",
      identityEvidence: [
        "Employer timesheet for the day of the arrest",
        "My own fingerprints, which do not match the booking card"
      ],
      expeditedNeeded: "yes",
      expeditedGround: "A conditional job offer is open until the end of next month."
    }
  },
  {
    fixtureId: "tn-redaction-positive-1",
    trackId: "tn_redaction",
    answers: {
      ...COMMON,
      ...COURT_CASE,
      countByCountDisposition: [
        "Count 1 — theft of property under $1,000 — dismissed",
        "Count 2 — criminal trespass — dismissed",
        "Count 3 — vandalism under $1,000 — guilty plea, convicted"
      ],
      convictedCounts: ["Count 3 — vandalism under $1,000"],
      understandsPartial: "yes"
    }
  },
  {
    fixtureId: "tn-arrest-no-court-record-positive-1",
    trackId: "tn_arrest_no_court_record",
    answers: {
      ...COMMON,
      arrestOffenceAndAgency: "Disorderly conduct; Metropolitan Nashville Police Department",
      arrestDate: "2 June 2018",
      countyAndCourt: "General Sessions Court for Davidson County, Tennessee",
      everArraignedOrAppeared: "no",
      courtFileExists: "no",
      dispositionThatCourtRecorded: "no",
      arrestRecordEstablished: "yes",
      evidenceOfAbsence: ["Letter from the General Sessions clerk stating no case was found under my name"]
    }
  },
  {
    fixtureId: "tn-pretrial-diversion-positive-1",
    trackId: "tn_pretrial_diversion",
    answers: {
      ...COMMON,
      ...COURT_CASE,
      diversionKind: "pretrial",
      successfullyCompleted: "yes",
      sexualOffence: "no",
      petitionFiledBefore: "no",
      mouWithDa: "yes",
      conditionalPlea: "no"
    }
  },
  {
    fixtureId: "tn-judicial-diversion-positive-1",
    trackId: "tn_judicial_diversion",
    answers: {
      ...COMMON,
      ...COURT_CASE,
      diversionKind: "judicial",
      successfullyCompleted: "yes",
      sexualOffence: "no",
      petitionFiledBefore: "no",
      mouWithDa: "no",
      conditionalPlea: "yes"
    }
  },
  {
    fixtureId: "tn-eligible-conviction-positive-1",
    trackId: "tn_eligible_conviction",
    answers: {
      ...COMMON,
      ...DA_CASE,
      ...SENTENCE,
      originatingCourt: "Criminal Court for Davidson County, Tennessee",
      offenceAndDisposition: "Theft of property $1,000 to $2,500; guilty plea, convicted",
      dispositionDate: "14 August 2013",
      offenceDate: "9 March 2013",
      convictionOnOrAfter1989: "yes",
      commercialDriverLicence: "no",
      sobrietyCondition: "no",
      burglaryOffence: "no",
      pardonReceived: "no",
      recoveryCourtCompleted: "no"
    }
  },
  {
    fixtureId: "tn-two-offense-positive-1",
    trackId: "tn_two_offense",
    answers: {
      ...COMMON,
      ...DA_CASE,
      ...SENTENCE,
      originatingCourt: "Criminal Court for Davidson County, Tennessee",
      offenceAndDisposition: "Theft of property $1,000 to $2,500, and simple possession; both convicted",
      dispositionDate: "14 August 2013",
      offenceDate: "9 March 2013",
      convictionOnOrAfter1989: "yes",
      commercialDriverLicence: "no",
      sobrietyCondition: "no",
      howManyOffences: "2",
      offenceCombination: "one_felony_one_misdemeanour",
      sameEpisode: "yes",
      understandsOnceOnly: "yes",
      pardonReceived: "no",
      recoveryCourtCompleted: "no"
    }
  },
  {
    fixtureId: "tn-illegal-voting-positive-1",
    trackId: "tn_illegal_voting",
    answers: {
      ...COMMON,
      ...DA_CASE,
      ...SENTENCE,
      exactStatutorySection: "T.C.A. § 2-19-107",
      confirmedTwoNineteenOhSeven: "yes",
      offenceDate: "4 November 2008",
      convictionDate: "22 June 2009",
      releaseConditionsMet: "yes",
      offencePredatesIneligible: "yes",
      votingRightsGoal: "yes"
    }
  },
  {
    fixtureId: "tn-post-pardon-positive-1",
    trackId: "tn_post_pardon",
    answers: {
      ...COMMON,
      ...DA_CASE,
      exactStatutorySection: "T.C.A. § 39-14-103",
      pardonReceived: "yes",
      pardonDate: "19 December 2024",
      boardOfParoleVote: "yes",
      boardVoteDate: "7 October 2024",
      inchoateForm: "no",
      sexualOffenceRegistration: "no",
      withinExclusionList: "no",
      violenceContested: "no",
      violenceAccount:
        "No one was hurt and no one was threatened. The property was returned the same week."
    }
  },
  {
    fixtureId: "tn-recovery-court-positive-1",
    trackId: "tn_recovery_court",
    answers: {
      ...COMMON,
      ...DA_CASE,
      ...SENTENCE,
      exactStatutorySection: "T.C.A. § 39-14-105(a)(2)",
      offenceInvolvesVehicleAndSubstance: "no",
      duiConvictionCount: "1",
      duiConvictionDate: "8 May 2010",
      offenceDate: "17 September 2021",
      recoveryCourtCompleted: "yes",
      recoveryCourtCompletionDate: "30 April 2021",
      tenYearIntervalEstablished: "yes",
      releaseConditionsMet: "yes",
      wantsDuiCleared: "no"
    }
  }
];

ok(
  new Set(FIXTURES.map((f) => f.trackId)).size === ASSIGNED.length,
  "Fixture coverage is not one positive fixture per assigned track."
);

// ---------------------------------------------------------------------------
// 4. Stops and closed lists fail closed
// ---------------------------------------------------------------------------

const fixtureFor = (trackId) => FIXTURES.find((f) => f.trackId === trackId).answers;

const NEGATIVE = [
  // Common bars.
  [
    "federal or out-of-state records",
    "tn_nonconviction_petition",
    { ...fixtureFor("tn_nonconviction_petition"), outOfStateOrFederalRecords: "yes" }
  ],
  [
    "immigration or clearance question",
    "tn_nonconviction_petition",
    { ...fixtureFor("tn_nonconviction_petition"), citizenshipOrClearance: "yes" }
  ],
  [
    "district attorney general opposition",
    "tn_eligible_conviction",
    { ...fixtureFor("tn_eligible_conviction"), daOpposition: "yes" }
  ],
  // Routing stops: the free route must not swallow the paid ones, and vice versa.
  [
    "dismissal after diversion routed off the free route",
    "tn_nonconviction_petition",
    { ...fixtureFor("tn_nonconviction_petition"), cameThroughDiversion: "yes" }
  ],
  [
    "mixed disposition routed off the free route",
    "tn_nonconviction_petition",
    { ...fixtureFor("tn_nonconviction_petition"), anyCountConvicted: "yes" }
  ],
  [
    "no court file ever existed",
    "tn_nonconviction_petition",
    { ...fixtureFor("tn_nonconviction_petition"), courtFileEverExisted: "no" }
  ],
  [
    "court file history disputed",
    "tn_nonconviction_petition",
    { ...fixtureFor("tn_nonconviction_petition"), courtFileEverExisted: "unknown" }
  ],
  [
    "arraignment history sends the paid route back to the free one",
    "tn_arrest_no_court_record",
    { ...fixtureFor("tn_arrest_no_court_record"), everArraignedOrAppeared: "yes" }
  ],
  [
    "court file exists",
    "tn_arrest_no_court_record",
    { ...fixtureFor("tn_arrest_no_court_record"), courtFileExists: "yes" }
  ],
  [
    "recorded disposition belongs to the free route",
    "tn_arrest_no_court_record",
    { ...fixtureFor("tn_arrest_no_court_record"), dispositionThatCourtRecorded: "yes" }
  ],
  [
    "no arrest record established",
    "tn_arrest_no_court_record",
    { ...fixtureFor("tn_arrest_no_court_record"), arrestRecordEstablished: "no" }
  ],
  // Mistaken identity.
  [
    "nothing offered on the mistaken-identity showing",
    "tn_mistaken_identity",
    { ...fixtureFor("tn_mistaken_identity"), identityEvidence: [] }
  ],
  // Redaction.
  [
    "partial relief is not what the participant wants",
    "tn_redaction",
    { ...fixtureFor("tn_redaction"), understandsPartial: "no" }
  ],
  [
    "no convicted count means the free route",
    "tn_redaction",
    { ...fixtureFor("tn_redaction"), convictedCounts: [] }
  ],
  [
    "no count schedule",
    "tn_redaction",
    { ...fixtureFor("tn_redaction"), countByCountDisposition: [] }
  ],
  // Diversion.
  [
    "judicial diversion on the pretrial route",
    "tn_pretrial_diversion",
    { ...fixtureFor("tn_pretrial_diversion"), diversionKind: "judicial" }
  ],
  [
    "sexual offence bar under § 40-32-106(d)(2)",
    "tn_judicial_diversion",
    { ...fixtureFor("tn_judicial_diversion"), sexualOffence: "yes" }
  ],
  [
    "diversion not completed",
    "tn_judicial_diversion",
    { ...fixtureFor("tn_judicial_diversion"), successfullyCompleted: "no" }
  ],
  [
    "petition already filed",
    "tn_pretrial_diversion",
    { ...fixtureFor("tn_pretrial_diversion"), petitionFiledBefore: "yes" }
  ],
  [
    "pretrial mechanics unconfirmed",
    "tn_pretrial_diversion",
    { ...fixtureFor("tn_pretrial_diversion"), mouWithDa: "no" }
  ],
  // § 40-32-107 conviction routes.
  [
    "sentence not complete",
    "tn_eligible_conviction",
    { ...fixtureFor("tn_eligible_conviction"), allMoneyPaid: "no" }
  ],
  [
    "other ineligible conviction",
    "tn_eligible_conviction",
    { ...fixtureFor("tn_eligible_conviction"), otherIneligibleConviction: "yes" }
  ],
  [
    "section not matched against the eligible lists",
    "tn_eligible_conviction",
    { ...fixtureFor("tn_eligible_conviction"), sectionMatchedToList: "no" }
  ],
  [
    "lifetime prior-expunction bar under subsection (a)",
    "tn_eligible_conviction",
    { ...fixtureFor("tn_eligible_conviction"), priorExpunction: "a" }
  ],
  [
    "more than two offences",
    "tn_two_offense",
    { ...fixtureFor("tn_two_offense"), howManyOffences: "3" }
  ],
  [
    "lifetime use not understood",
    "tn_two_offense",
    { ...fixtureFor("tn_two_offense"), understandsOnceOnly: "no" }
  ],
  [
    "single-episode question unresolved",
    "tn_two_offense",
    { ...fixtureFor("tn_two_offense"), sameEpisode: "unknown" }
  ],
  // Illegal voting.
  [
    "judgment does not name § 2-19-107",
    "tn_illegal_voting",
    { ...fixtureFor("tn_illegal_voting"), confirmedTwoNineteenOhSeven: "no" }
  ],
  [
    "release conditions outstanding",
    "tn_illegal_voting",
    { ...fixtureFor("tn_illegal_voting"), releaseConditionsMet: "no" }
  ],
  [
    "offence does not predate an ineligible conviction",
    "tn_illegal_voting",
    { ...fixtureFor("tn_illegal_voting"), offencePredatesIneligible: "no" }
  ],
  // Post-pardon.
  [
    "no pardon held",
    "tn_post_pardon",
    { ...fixtureFor("tn_post_pardon"), pardonReceived: "no" }
  ],
  [
    "no board of parole vote",
    "tn_post_pardon",
    { ...fixtureFor("tn_post_pardon"), boardOfParoleVote: "no" }
  ],
  [
    "registrable sexual offence excluded",
    "tn_post_pardon",
    { ...fixtureFor("tn_post_pardon"), sexualOffenceRegistration: "yes" }
  ],
  [
    "possibly within the seven excluded felonies",
    "tn_post_pardon",
    { ...fixtureFor("tn_post_pardon"), withinExclusionList: "yes" }
  ],
  [
    "violence genuinely contested",
    "tn_post_pardon",
    { ...fixtureFor("tn_post_pardon"), violenceContested: "yes" }
  ],
  // Recovery court.
  [
    "participant wants the DUI itself cleared",
    "tn_recovery_court",
    { ...fixtureFor("tn_recovery_court"), wantsDuiCleared: "yes" }
  ],
  [
    "offence involves a vehicle and a substance",
    "tn_recovery_court",
    { ...fixtureFor("tn_recovery_court"), offenceInvolvesVehicleAndSubstance: "yes" }
  ],
  [
    "more than one DUI conviction",
    "tn_recovery_court",
    { ...fixtureFor("tn_recovery_court"), duiConvictionCount: "2" }
  ],
  [
    "recovery court not completed",
    "tn_recovery_court",
    { ...fixtureFor("tn_recovery_court"), recoveryCourtCompleted: "no" }
  ],
  [
    "ten-year interval not established",
    "tn_recovery_court",
    { ...fixtureFor("tn_recovery_court"), tenYearIntervalEstablished: "no" }
  ]
];

let stopped = 0;
for (const [label, trackId, answers] of NEGATIVE) {
  let caught = null;
  try {
    deriveTennesseeFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof TennesseeEligibilityStopError,
    `${trackId}: ${label} did not fail closed with a typed stop.`
  );
  if (caught instanceof TennesseeEligibilityStopError) {
    ok(caught.referral.length > 20, `${trackId}: ${label} lost its referral.`);
    ok(caught.stopId.length > 0, `${trackId}: ${label} carries no stop identifier.`);
    ok(caught.reason.length > 40, `${trackId}: ${label} gives no reason a participant could act on.`);
    stopped += 1;
  }
}

// Post-pardon must NOT import the conditions subsection (d) does not state.
// This is the one place where a stop firing would be the bug.
for (const [label, key, value] of [
  ["a sentence-completion checklist", "allMoneyPaid", "no"],
  ["a prior-expunction bar", "priorExpunction", "a"],
  ["an other-conviction condition", "otherIneligibleConviction", "yes"]
]) {
  let threw = null;
  try {
    deriveTennesseeFacts("tn_post_pardon", { ...fixtureFor("tn_post_pardon"), [key]: value });
  } catch (error) {
    threw = error;
  }
  ok(
    threw === null,
    `tn_post_pardon: ${label} was applied. Subsection (d) states three cumulative requirements and none of these, and importing one refuses a petitioner the statute admits.`
  );
}

// Closed lists reject anything outside them.
const BRANCH_CASES = [
  ["tn_nonconviction_petition", "dispositionGround", "charges_just_went_away"],
  ["tn_pretrial_diversion", "diversionKind", "informal_agreement"],
  ["tn_two_offense", "offenceCombination", "two_felonies"],
  ["tn_eligible_conviction", "priorExpunction", "maybe"],
  ["tn_nonconviction_petition", "cameThroughDiversion", "sort_of"]
];
let branchRejected = 0;
for (const [trackId, key, value] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveTennesseeFacts(trackId, { ...fixtureFor(trackId), [key]: value });
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof TennesseeBranchError,
    `${trackId}: "${value}" for ${key} was not rejected as outside the approved list.`
  );
  if (caught instanceof TennesseeBranchError) branchRejected += 1;
}

ok(Object.keys(TN_DISPOSITION_GROUNDS).length === 5, "The § 40-32-106(a)(1) ground list changed size.");
ok(Object.keys(TN_DIVERSION_KINDS).length === 2, "The diversion-kind list changed size.");
ok(
  Object.keys(TN_OFFENCE_COMBINATIONS).length === 2,
  "The § 40-32-107(b)(1) combination list changed size."
);
ok(
  !Object.keys(TN_OFFENCE_COMBINATIONS).some((key) => /two_felon/i.test(key)),
  "Two felonies appear as an available combination, which § 40-32-107(b)(1) does not permit."
);
ok(
  TN_PARDON_EXCLUDED_FELONIES.length === 7,
  "The § 40-32-107(d)(1)(A) exclusion list is not the seven felonies Public Chapter 719 named."
);
ok(TN_INCHOATE_FORMS.length === 4, "The inchoate-form list changed size.");
ok(TN_REFERRAL.length > 20, "The default referral destination is empty.");

note(
  `4. Stops: ${stopped} negative cases fail closed with a typed stop carrying a referral; the § 40-32-107(d) route refuses to import the (a) and (c) conditions; ${branchRejected} out-of-list branch values rejected; six closed lists hold their size.`
);

// ---------------------------------------------------------------------------
// 5. Rendered content
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/will be granted|you will succeed|you are eligible/i, "a prediction or an eligibility assertion"],
  [/we have (reviewed|verified|confirmed)/i, "a claim that LegalEase reviewed or verified records"],
  [/on your behalf we (filed|served)/i, "a claim that LegalEase filed or served"],
  [/the district attorney (has consented|consents|agreed|will prepare)/i, "an assertion about what the district attorney general has done or will do"],
  [/official (state|statewide) form|AOC form/i, "a claim that an official Tennessee form exists"],
  [/your record (is|will be) clear/i, "a promise about the result"]
];

const results = [];
let renderedComponents = 0;

for (const fixture of FIXTURES) {
  const facts = deriveTennesseeFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "TN",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "TN",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    // Rendering the same facts twice must produce the same bytes.
    const again = await renderPacketComponent({
      component,
      jurisdiction: "TN",
      geography: null,
      facts,
      rootDir: root
    });
    ok(
      sha(output.bytes) === sha(again.bytes),
      `${component.componentId}: rendering is not deterministic.`
    );

    const template = pleadingTemplate(component.templateId);
    ok(template.technicalFixture === true, `${component.templateId}: is not marked a technical fixture.`);
    ok(
      template.fixtureBanner && /DRAFT PENDING LEGAL REVIEW/.test(template.fixtureBanner),
      `${component.templateId}: carries no draft banner.`
    );
    const source = JSON.stringify(template);
    for (const [pattern, description] of PROHIBITED) {
      ok(!pattern.test(source), `${component.templateId}: contains ${description}.`);
    }
    // Unresolved placeholders would print as literal braces.
    ok(
      !/\{\{/.test(source.replace(/\{\{[a-zA-Z0-9]+\}\}/g, "")),
      `${component.templateId}: malformed placeholder.`
    );

    // Signature rules by role.
    // A continuation is filed with and signed with the primary filing; an
    // attachment is not executed at all.
    if (component.role === "attachment") {
      ok(
        template.signatureLabel === null,
        `${component.componentId}: an attachment carries a signature rule as though it were executed.`
      );
      ok(
        /not a pleading/i.test(String(template.preamble ?? "")),
        `${component.componentId}: the attachment does not say that it is not a pleading.`
      );
    } else {
      ok(
        typeof template.signatureLabel === "string" && template.signatureLabel.length > 0,
        `${component.componentId}: a document the participant signs carries no signature rule.`
      );
      // Chapter 32 does not prescribe notarization. Printing a notarial block
      // would invite an oath the statute does not ask for.
      ok(
        !template.signatureBlock.some((line) => /Notary Public|sworn to before me/i.test(line)),
        `${component.componentId}: carries a notarial block, which chapter 32 does not prescribe.`
      );
      ok(
        template.signatureBlock.some((line) => /[Nn]otariz/.test(line)),
        `${component.componentId}: does not tell the participant what to do about notarization.`
      );
    }

    // No template signs for anybody but the participant.
    ok(
      !template.signatureBlock.some((line) => /JUDGE|District Attorney General$|Clerk$/.test(line)),
      `${component.componentId}: carries a signature line for an outside party.`
    );

    renderedComponents += 1;
    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
  }

  const assemblyRequest = {
    jurisdiction: "TN",
    jurisdictionName: "Tennessee",
    packetName: resolved.track.assembledPacketName,
    caseReference: fixture.answers.docketNumber ?? fixture.answers.countyAndCourt,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(
    assembled.sha256 === againAssembled.sha256,
    `${fixture.fixtureId}: assembly is not deterministic.`
  );
  ok(assembled.pageCount > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);

  results.push({
    trackId: fixture.trackId,
    components: assemblyComponents.length,
    pages: assembled.pageCount,
    sha256: assembled.sha256
  });
}

note(
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; no prohibited content; no notarial block where chapter 32 prescribes none; no outside-party signature line.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes
// ---------------------------------------------------------------------------

const valueFixture = FIXTURES.find((f) => f.trackId === "tn_post_pardon");
const valueFacts = deriveTennesseeFacts(valueFixture.trackId, valueFixture.answers);
const valueResolved = resolvePacket({
  jurisdiction: "TN",
  trackId: valueFixture.trackId,
  facts: valueFacts,
  allowTechnicalFixtures: true
});
const valueRecord = valueResolved.components.find((c) => c.role === "attachment");
const valueOutput = await renderPacketComponent({
  component: valueRecord,
  jurisdiction: "TN",
  geography: null,
  facts: valueFacts,
  rootDir: root
});
ok(valueOutput.pageCount >= 1, "The post-pardon eligibility record rendered no pages.");
ok(
  valueFacts.violenceAccount === valueFixture.answers.violenceAccount,
  "The participant's own account of violence was rewritten rather than carried through."
);
ok(
  valueFacts.exclusionList.split("\n").length === 7,
  "The seven excluded felonies did not all reach the fact bag."
);
ok(
  /recorded here rather than applied/i.test(valueFacts.priorExpunctionNote),
  "The post-pardon record does not say that a prior expunction is recorded rather than applied."
);

// The recovery-court packet must say what it cannot do.
const recoveryFacts = deriveTennesseeFacts("tn_recovery_court", fixtureFor("tn_recovery_court"));
const recoveryTemplates = TENNESSEE_CUSTOM_PLEADING_TRACKS.find(
  (t) => t.trackId === "tn_recovery_court"
).packetSet.components.map((c) => JSON.stringify(pleadingTemplate(c.templateId)));
ok(
  recoveryTemplates.every((source) => /does not expunge a DUI|cannot be cleared on this route/i.test(source)),
  "A recovery-court document does not say that the DUI itself cannot be cleared."
);
ok(recoveryFacts.duiConvictionCount === "1", "The DUI conviction count did not carry through.");

note(
  `6. Values: the post-pardon eligibility record carries the participant's own violence account verbatim and all seven excluded felonies; both recovery-court documents state that the DUI cannot be cleared.`
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const track of TENNESSEE_CUSTOM_PLEADING_TRACKS) {
  ok(track.statuses.runtime === "runtime_disabled", `${track.trackId}: is not runtime-disabled.`);
  ok(track.statuses.legal === "not_submitted", `${track.trackId}: claims a legal review status.`);
  ok(track.statuses.visual === "not_reviewed", `${track.trackId}: claims a visual review status.`);
  ok(track.jurisdiction === "TN", `${track.trackId}: is not a Tennessee track.`);
  ok(track.outputStrategy === "custom_pleading", `${track.trackId}: is not custom_pleading.`);
  ok(
    track.requiredInputs.length > 0,
    `${track.trackId}: declares no participant inputs, so nothing can be checked as answered.`
  );
}
note(
  `7. Runtime: every track is runtime-disabled, legally unsubmitted and visually unreviewed.`
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Tennessee custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Tennessee custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-track packets:");
for (const result of results.sort((a, b) => a.trackId.localeCompare(b.trackId))) {
  console.log(
    `  ${result.trackId.padEnd(28)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(2)} pages  sha256=${result.sha256}`
  );
}
