// Hawaii stage-one custom pleading — packet verification.
//
// Proves what a rendered sample cannot prove by looking right: Hawaii is not
// enabled and the shared surfaces are untouched; the assignment is exactly the
// five assigned tracks and their ten assigned custom-pleading components, with
// the five stage-two HCJDC components excluded by strategy rather than
// forgotten; every document holds the design's boundaries on its face; every
// negative case fails closed with a typed stop naming a destination and a next
// step; and every rendered page is read line by line.
//
// Four boundaries carry most of section 2:
//
//   1. Stage one is not stage two. The court order is the precondition for the
//      HCJDC 159(b) application, not a substitute for it, and no document here
//      fills that form, describes it as filled, or says the Judiciary publishes
//      a statewide stage-one form. None exists.
//   2. The court level is a participant answer, not a track constant, so an
//      unanswered or unsure level stops rather than guessing a caption.
//   3. HRS 291E-64(e) is the one of the five where the relief is not
//      established as mandatory, and its motion must not say the court shall
//      grant it while the other four may.
//   4. Clerk cost practice is an open release-level question, so no document
//      prints an amount and none says the filing is free.
//
// Runs offline against the real renderer, resolver and assembler. No network,
// no database, no promotion.

import { register } from "node:module";
import crypto from "node:crypto";
import zlib from "node:zlib";

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
  HI_CUSTOM_PLEADING_TRACKS,
  HI_PLEADING_TEMPLATES,
  HI_DESIGN_ROLE_TO_ENGINE_ROLE,
  HI_EXCLUDED_COMPONENTS,
  HI_ASSIGNED_TRACK_IDS,
  HI_DRUG_TRACK,
  HI_MARIJUANA_TRACK,
  HI_PRE_2004_TRACK,
  HI_PROPERTY_TRACK,
  HI_DUI_TRACK,
  HI_YES_NO,
  HI_YES_NO_UNSURE,
  HI_COURT_LEVELS,
  HI_CIRCUITS,
  HI_PROPERTY_SUBSECTIONS,
  HI_COMMON_INPUT_KEYS,
  HI_TRACK_INPUT_KEYS,
  HI_REFERRALS,
  deriveHawaiiFacts,
  HawaiiBranchError,
  HawaiiEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/hawaii/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// ---------------------------------------------------------------------------
// 0. Hawaii is not enabled, and the shared surfaces are intact
// ---------------------------------------------------------------------------

const assignedIds = new Set(HI_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Hawaii track is wired into the shared relief-track registry."
);
ok(
  Object.keys(HI_PLEADING_TEMPLATES).every(
    (id) => !Object.prototype.hasOwnProperty.call(PLEADING_TEMPLATES, id)
  ),
  "A Hawaii template is registered in the shared template pack."
);
ok(
  HI_CUSTOM_PLEADING_TRACKS.every((t) => t.runtimeDisabled === true),
  "A Hawaii track is not runtime-disabled."
);
note(
  `0. Enablement: all ${HI_CUSTOM_PLEADING_TRACKS.length} assigned tracks and all ${Object.keys(HI_PLEADING_TEMPLATES).length} templates are absent from the shared registry and template pack, and every track is runtime-disabled.`
);

// Injected for verification only. The committed shared files stay untouched.
for (const track of HI_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, HI_PLEADING_TEMPLATES);

// ---------------------------------------------------------------------------
// 1. The assignment, pinned
// ---------------------------------------------------------------------------

const EXPECTED_TRACKS = [
  HI_DRUG_TRACK,
  HI_MARIJUANA_TRACK,
  HI_PRE_2004_TRACK,
  HI_PROPERTY_TRACK,
  HI_DUI_TRACK
];

ok(
  HI_ASSIGNED_TRACK_IDS.length === 5 &&
    EXPECTED_TRACKS.every((id) => HI_ASSIGNED_TRACK_IDS.includes(id)),
  `The assignment is ${HI_ASSIGNED_TRACK_IDS.join(", ")} rather than the five assigned stage-one tracks.`
);

// Component IDs, roles and order are pinned from the packet-set manifest, not
// read back out of the module.
const EXPECTED_COMPONENTS = Object.fromEntries(
  EXPECTED_TRACKS.map((trackId) => [
    trackId,
    [
      { componentId: `${trackId}-primary-filing-1`, role: "primary_filing", order: 1 },
      { componentId: `${trackId}-proposed-order-2`, role: "proposed_order", order: 2 }
    ]
  ])
);

let componentCount = 0;
for (const track of HI_CUSTOM_PLEADING_TRACKS) {
  const expected = EXPECTED_COMPONENTS[track.trackId];
  const actual = track.packetSet.components;
  ok(
    actual.length === expected.length,
    `${track.trackId}: declares ${actual.length} components rather than the ${expected.length} assigned to this lane.`
  );
  expected.forEach((want, index) => {
    const got = actual[index];
    ok(got?.componentId === want.componentId, `${track.trackId}: component ${index + 1} is ${got?.componentId} rather than ${want.componentId}.`);
    ok(got?.role === want.role, `${want.componentId}: role is ${got?.role} rather than ${want.role}.`);
    ok(got?.order === want.order, `${want.componentId}: order is ${got?.order} rather than ${want.order}.`);
    ok(got?.outputStrategy === "custom_pleading", `${want.componentId}: output strategy is not custom_pleading.`);
    ok(got?.rendererStrategy === "custom_pleading", `${want.componentId}: renderer strategy is not custom_pleading.`);
    ok(got?.sourcePath === null && got?.sourceSha256 === null, `${want.componentId}: claims an official source.`);
  });
  componentCount += actual.length;

  // The stage-two component must be excluded by strategy, not silently dropped.
  ok(
    actual.every((c) => c.componentId !== `${track.trackId}-primary-filing-3`),
    `${track.trackId}: implements the stage-two HCJDC component, which belongs to the official-PDF lane.`
  );
  ok(
    Object.values(HI_DESIGN_ROLE_TO_ENGINE_ROLE).includes(actual[0].role),
    `${track.trackId}: a component role is outside the declared design-role mapping.`
  );
}

ok(componentCount === 10, `The assignment implements ${componentCount} components rather than 10.`);
ok(
  HI_EXCLUDED_COMPONENTS.length === 1 &&
    HI_EXCLUDED_COMPONENTS[0].strategy === "official_pdf_fill" &&
    HI_EXCLUDED_COMPONENTS[0].componentIdSuffix === "-primary-filing-3",
  "The excluded stage-two component is not recorded with its strategy."
);
note(
  `1. Assignment: exactly 5 assigned tracks and 10 assigned custom-pleading components, each pinned to the packet-set manifest's component id, role and order; the 5 stage-two HCJDC 159(b) components are recorded as excluded by output strategy and none is implemented.`
);

// ---------------------------------------------------------------------------
// 2. Design boundaries on the face of every document
// ---------------------------------------------------------------------------

const templateSource = (id) => JSON.stringify(pleadingTemplate(id));
const allSource = EXPECTED_TRACKS.map((t) => templateSource(`${t}-motion`) + templateSource(`${t}-order`)).join("");

for (const trackId of EXPECTED_TRACKS) {
  const motion = templateSource(`${trackId}-motion`);
  const order = templateSource(`${trackId}-order`);

  // These three recitals are interpolated, so the template can only be asserted
  // to carry the placeholder. The wording itself is asserted in section 6
  // against the derived facts that supply it.
  ok(/\{\{hiRule47Basis\}\}/.test(motion), `${trackId}: the motion does not carry the Rule 47(a) basis placeholder.`);
  ok(/\{\{hiDeclarationBasis\}\}/.test(motion), `${trackId}: the motion does not carry the Rule 47(d) declaration placeholder.`);
  ok(/\{\{hiServiceBasis\}\}/.test(motion), `${trackId}: the motion does not carry the Rule 49 service placeholder.`);
  ok(/Haw\. R\. Penal P\. 47\(a\)/.test(motion), `${trackId}: the motion never names Rule 47(a) in its own static copy.`);
  // The heading is the renderer's, so the template is checked for the block
  // rather than for the word.
  ok(
    (pleadingTemplate(`${trackId}-motion`).certificateOfService ?? []).length > 5,
    `${trackId}: the motion carries no certificate of service.`
  );
  ok(
    /Complete and sign this only after you have served/.test(motion),
    `${trackId}: the certificate of service does not tell the participant it is completed after service.`
  );
  ok(
    !/I (have )?served the prosecuting attorney on/.test(motion),
    `${trackId}: the certificate of service asserts that service has already happened.`
  );

  // Stage two must be named as a separate step and never as done.
  ok(
    /Criminal Justice Data Center/.test(motion),
    `${trackId}: the motion never tells the participant that a second stage exists.`
  );
  ok(
    !/statewide (stage-one )?(expungement )?form (exists|is published)/i.test(motion + order),
    `${trackId}: a document claims a statewide Judiciary stage-one form exists.`
  );

  // The order is proposed, unmarked and unsigned.
  ok(/proposed order/i.test(order), `${trackId}: the order does not say it is proposed.`);
  ok(
    /granted by nobody and signed by nobody/.test(order),
    `${trackId}: the order does not say it has been granted and signed by nobody.`
  );
  ok(/\(  \)/.test(order), `${trackId}: the order has no unmarked finding box.`);
  ok(!/\(x\)|\(X\)|\[x\]|\[X\]/.test(order), `${trackId}: the order carries a marked finding box.`);
  ok(
    /JUDGE OF THE ABOVE-ENTITLED COURT/.test(order) && /Dated: _/.test(order),
    `${trackId}: the order does not leave the judicial signature and date blank.`
  );
  ok(
    pleadingTemplate(`${trackId}-order`).signatureLabel === null,
    `${trackId}: the proposed order carries a participant signature rule.`
  );
  ok(
    (pleadingTemplate(`${trackId}-order`).verification ?? "") === "",
    `${trackId}: the proposed order carries a verification, which belongs to a document the participant signs.`
  );

  // The motion is the participant's, and it is signed and declared by them.
  const motionTemplate = pleadingTemplate(`${trackId}-motion`);
  ok(
    typeof motionTemplate.signatureLabel === "string" && motionTemplate.signatureLabel.length > 0,
    `${trackId}: the motion carries no signature rule.`
  );
  ok(
    /Sign and date this by hand, in ink/.test(motion),
    `${trackId}: the motion does not require a handwritten signature.`
  );
  ok(
    /declare under penalty of law/.test(motion),
    `${trackId}: the motion's declaration carries no penalty-of-law statement.`
  );
}

// No document prints an amount, and none says the filing is free.
ok(!/\$\s?\d/.test(allSource), "A Hawaii document prints a money amount.");
ok(
  !/no (filing )?fee (is|will be) (charged|due|payable)|free to file|there is no cost/i.test(allSource),
  "A Hawaii document says the filing is free, which the open clerk-cost question does not support."
);
ok(
  /\{\{hiNoFeeStatement\}\}/.test(allSource),
  "No Hawaii document carries the fee-boundary placeholder."
);
note(
  "2. Design boundaries: every motion states the Rule 47(a) basis for being a motion, carries the Rule 47(d) declaration and the Rule 49(c) certificate of service written wholly in the future, and names the HCJDC stage as a separate step; every proposed order is marked proposed, carries only unmarked finding boxes and leaves the judicial signature and date blank; and no document prints an amount, claims the filing is free, or claims a statewide Judiciary stage-one form exists."
);

// ---------------------------------------------------------------------------
// 3. Fixtures
// ---------------------------------------------------------------------------

const common = (overrides = {}) => ({
  courtLevel: "circuit",
  circuit: "first",
  offenceAndStatute: "Promoting a dangerous drug in the third degree, HRS 712-1243",
  judgmentDate: "17 March 2019",
  prosecutorOpposesOrContested: "no",
  priorExpungementGranted: "no",
  immigrationMatter: "no",
  attackingTheConviction: "no",
  ...overrides
});

function fixtureFor(trackId) {
  return FIXTURES.find((f) => f.trackId === trackId && !f.variantOf).answers;
}

const FIXTURES = [
  {
    fixtureId: "hi-drug-first-time-1",
    trackId: HI_DRUG_TRACK,
    expectedComponents: 2,
    answers: common({
      sentencedToProbationUnder6225: "yes",
      completedTreatmentProgramme: "yes",
      termsDisputed: "no",
      priorlySentencedUnder6225: "no"
    })
  },
  {
    fixtureId: "hi-marijuana-three-grams-1",
    trackId: HI_MARIJUANA_TRACK,
    expectedComponents: 2,
    answers: common({
      courtLevel: "district",
      circuit: "second",
      offenceAndStatute: "Promoting a detrimental drug in the third degree, HRS 712-1249",
      judgmentDate: "2 August 2021",
      threeGramsOrLess: "yes",
      otherChargeSameFacts: "no"
    })
  },
  {
    fixtureId: "hi-pre-2004-drug-1",
    trackId: HI_PRE_2004_TRACK,
    expectedComponents: 2,
    answers: common({
      circuit: "third",
      offenceAndStatute: "Promoting a dangerous drug in the third degree, HRS 712-1243",
      judgmentDate: "9 November 2001",
      sentencingDate: "9 November 2001",
      sentencedBeforeJuly2004: "yes",
      cannotObtainRecord: "no",
      priorlySentencedUnder6225: "no"
    })
  },
  {
    fixtureId: "hi-property-first-time-1",
    trackId: HI_PROPERTY_TRACK,
    expectedComponents: 2,
    answers: common({
      circuit: "fifth",
      offenceAndStatute: "Theft in the second degree, HRS 708-831",
      judgmentDate: "14 June 2018",
      propertySubsection: "mandatory",
      priorOrSubsequentFelony: "no",
      nonviolenceContested: "no",
      completedTreatmentProgramme: "yes"
    })
  },
  {
    fixtureId: "hi-under-21-dui-1",
    trackId: HI_DUI_TRACK,
    expectedComponents: 2,
    answers: common({
      courtLevel: "district",
      circuit: "first",
      offenceAndStatute:
        "Operating a vehicle after consuming a measurable amount of alcohol, HRS 291E-64",
      judgmentDate: "5 May 2020",
      commercialLicenceOrVehicle: "no",
      hasAttainedTwentyOne: "yes",
      priorAlcoholContact: "no",
      subsequentAlcoholOrDrugContact: "no"
    })
  },
  {
    fixtureId: "hi-drug-family-court-second-circuit-2",
    trackId: HI_DRUG_TRACK,
    variantOf: "hi-drug-first-time-1",
    variantPurpose:
      "The court level and the circuit are the two answers that build the caption, and the design makes both participant inputs rather than track constants. A family-court matter in the second circuit changes the court line on both the motion and the proposed order, which is operative text on the face of the filing: a motion captioned for the wrong court is filed in the wrong place.",
    materialBranch: "caption venue — court level and judicial circuit",
    expectedComponents: 2,
    answers: common({
      courtLevel: "family",
      circuit: "second",
      sentencedToProbationUnder6225: "yes",
      completedTreatmentProgramme: "yes",
      termsDisputed: "no",
      priorlySentencedUnder6225: "no"
    })
  }
];

const canonicalCount = FIXTURES.filter((f) => !f.variantOf).length;
ok(canonicalCount === 5, `There are ${canonicalCount} canonical fixtures rather than one per assigned track.`);
for (const fixture of FIXTURES.filter((f) => f.variantOf)) {
  ok(
    typeof fixture.variantPurpose === "string" && fixture.variantPurpose.length > 80,
    `${fixture.fixtureId}: the variant does not state its purpose.`
  );
  ok(
    typeof fixture.materialBranch === "string" && fixture.materialBranch.length > 0,
    `${fixture.fixtureId}: the variant does not name the material branch it exercises.`
  );
  ok(
    FIXTURES.some((f) => f.fixtureId === fixture.variantOf),
    `${fixture.fixtureId}: names a canonical fixture that does not exist.`
  );
}

// 2b. The one route where the relief is not established as mandatory.
for (const trackId of [HI_DRUG_TRACK, HI_MARIJUANA_TRACK, HI_PRE_2004_TRACK, HI_PROPERTY_TRACK]) {
  const facts = deriveHawaiiFacts(trackId, fixtureFor(trackId));
  ok(
    /mandatory/.test(facts.hiReliefStatement),
    `${trackId}: the relief statement does not record that the section's relief is mandatory.`
  );
  ok(
    /the Court's to decide|for the Court to decide/.test(facts.hiReliefStatement),
    `${trackId}: the relief statement asserts the outcome rather than leaving it to the Court.`
  );
}
const duiFacts = deriveHawaiiFacts(HI_DUI_TRACK, fixtureFor(HI_DUI_TRACK));
ok(
  /does not say that the order is mandatory/.test(duiFacts.hiReliefStatement),
  "The HRS 291E-64(e) motion does not record that the relief is not established as mandatory."
);
ok(
  !/shall (issue|grant)/.test(duiFacts.hiReliefStatement),
  "The HRS 291E-64(e) motion asserts a mandatory 'shall' the subsection does not supply."
);
ok(
  /asks the Court to grant it/.test(duiFacts.hiReliefStatement),
  "The HRS 291E-64(e) motion does not ask the Court to grant the order."
);
note(
  "2b. Route boundaries: the four mandatory provisions say so and still leave the finding to the Court, and HRS 291E-64(e), which is drafted differently, says the order is not established as mandatory and asks rather than asserts."
);

// ---------------------------------------------------------------------------
// 4. Negative cases — every typed-stop family
// ---------------------------------------------------------------------------

const NEGATIVE_CASES = [
  // Shared screens.
  [HI_DRUG_TRACK, { prosecutorOpposesOrContested: "yes" }, "hi-contested-matter"],
  [HI_DRUG_TRACK, { priorExpungementGranted: "yes" }, "hi-prior-expungement"],
  [HI_DRUG_TRACK, { immigrationMatter: "yes" }, "hi-immigration-matter"],
  [HI_DRUG_TRACK, { attackingTheConviction: "yes" }, "hi-collateral-attack"],
  // Caption.
  [HI_DRUG_TRACK, { courtLevel: "unsure" }, "hi-court-level-not-established"],
  [HI_DRUG_TRACK, { circuit: "unsure" }, "hi-circuit-not-established"],
  [HI_DRUG_TRACK, { offenceAndStatute: "" }, "hi-answer-missing"],
  // 706-622.5(4).
  [HI_DRUG_TRACK, { sentencedToProbationUnder6225: "no" }, "hi-6225-not-sentenced-under-the-section"],
  [HI_DRUG_TRACK, { completedTreatmentProgramme: "no" }, "hi-6225-treatment-not-completed"],
  [HI_DRUG_TRACK, { completedTreatmentProgramme: "unsure" }, "hi-6225-treatment-not-completed"],
  [HI_DRUG_TRACK, { termsDisputed: "yes" }, "hi-6225-compliance-disputed"],
  [HI_DRUG_TRACK, { priorlySentencedUnder6225: "yes" }, "hi-6225-not-first-sentence"],
  // 706-622.5(5).
  [HI_MARIJUANA_TRACK, { threeGramsOrLess: "no" }, "hi-marijuana-quantity-not-established"],
  [HI_MARIJUANA_TRACK, { threeGramsOrLess: "unsure" }, "hi-marijuana-quantity-not-established"],
  [HI_MARIJUANA_TRACK, { otherChargeSameFacts: "yes" }, "hi-marijuana-other-charge"],
  // 706-622.8.
  [HI_PRE_2004_TRACK, { sentencedBeforeJuly2004: "no" }, "hi-6228-not-pre-2004"],
  [HI_PRE_2004_TRACK, { sentencedBeforeJuly2004: "unsure" }, "hi-6228-not-pre-2004"],
  [HI_PRE_2004_TRACK, { cannotObtainRecord: "yes" }, "hi-6228-record-unobtainable"],
  [HI_PRE_2004_TRACK, { priorlySentencedUnder6225: "yes" }, "hi-6228-not-first-sentence"],
  // 706-622.9.
  [HI_PROPERTY_TRACK, { propertySubsection: "unsure" }, "hi-6229-subsection-not-established"],
  [HI_PROPERTY_TRACK, { propertySubsection: "discretionary" }, "hi-6229-discretionary-limb"],
  [HI_PROPERTY_TRACK, { priorOrSubsequentFelony: "yes" }, "hi-6229-felony-history"],
  [HI_PROPERTY_TRACK, { nonviolenceContested: "yes" }, "hi-6229-nonviolence-contested"],
  [HI_PROPERTY_TRACK, { completedTreatmentProgramme: "unsure" }, "hi-6229-programme-not-completed"],
  // 291E-64(e).
  [HI_DUI_TRACK, { commercialLicenceOrVehicle: "yes" }, "hi-291e64-commercial-exclusion"],
  [HI_DUI_TRACK, { hasAttainedTwentyOne: "no" }, "hi-291e64-under-twenty-one"],
  [HI_DUI_TRACK, { hasAttainedTwentyOne: "unsure" }, "hi-291e64-under-twenty-one"],
  [HI_DUI_TRACK, { priorAlcoholContact: "yes" }, "hi-291e64-prior-contact"],
  [HI_DUI_TRACK, { subsequentAlcoholOrDrugContact: "yes" }, "hi-291e64-subsequent-contact"]
];

const seenStops = new Set();
for (const [trackId, override, expectedStop] of NEGATIVE_CASES) {
  let thrown = null;
  try {
    deriveHawaiiFacts(trackId, { ...fixtureFor(trackId), ...override });
  } catch (error) {
    thrown = error;
  }
  ok(
    thrown instanceof HawaiiEligibilityStopError,
    `${trackId} ${JSON.stringify(override)}: did not fail closed; it produced a packet.`
  );
  if (!(thrown instanceof HawaiiEligibilityStopError)) continue;
  ok(
    thrown.stopId === expectedStop,
    `${trackId} ${JSON.stringify(override)}: stopped as ${thrown.stopId} rather than ${expectedStop}.`
  );
  ok(thrown.message.length > 80, `${thrown.stopId}: the stop gives no reason.`);
  ok(
    typeof thrown.destination === "string" && thrown.destination.length > 20,
    `${thrown.stopId}: the stop names no destination.`
  );
  ok(
    typeof thrown.nextStep === "string" && thrown.nextStep.length > 20,
    `${thrown.stopId}: the stop gives no next step.`
  );
  ok(
    HI_REFERRALS.includes(thrown.destination),
    `${thrown.stopId}: the destination is not one of the declared referrals.`
  );
  // No stop may route back to its own track as the answer.
  ok(
    !thrown.destination.includes(trackId) && !thrown.nextStep.includes(trackId),
    `${thrown.stopId}: routes back to its own track as the solution.`
  );
  seenStops.add(thrown.stopId);
}
// 25 = 4 shared screens + 3 caption + 4 on 706-622.5(4) + 2 on 706-622.5(5)
// + 3 on 706-622.8 + 5 on 706-622.9 + 4 on 291E-64(e).
ok(seenStops.size === 25, `${seenStops.size} distinct typed stops fired rather than the 25 the design declares.`);

// A vague "contact an attorney" is not acceptable where the design names an office.
for (const referral of HI_REFERRALS) {
  ok(
    !/^\s*(contact|speak to) an attorney\.?\s*$/i.test(referral),
    "A referral is a bare 'contact an attorney' rather than a named destination."
  );
}

// Out-of-list answers are refused rather than coerced.
let branchRejections = 0;
for (const [key, permitted] of [
  ["courtLevel", HI_COURT_LEVELS],
  ["circuit", HI_CIRCUITS],
  ["prosecutorOpposesOrContested", HI_YES_NO],
  ["completedTreatmentProgramme", HI_YES_NO_UNSURE],
  ["propertySubsection", HI_PROPERTY_SUBSECTIONS]
]) {
  const trackId = key === "propertySubsection" ? HI_PROPERTY_TRACK : HI_DRUG_TRACK;
  try {
    deriveHawaiiFacts(trackId, { ...fixtureFor(trackId), [key]: "maybe-later" });
    ok(false, `${key}: an answer outside ${Object.keys(permitted).join("/")} was accepted.`);
  } catch (error) {
    ok(error instanceof HawaiiBranchError, `${key}: an out-of-list answer produced ${error?.name}.`);
    branchRejections += 1;
  }
}

// An unassigned track identifier is refused outright.
try {
  deriveHawaiiFacts("hi_nonconviction_expungement", {});
  ok(false, "An unassigned Hawaii track identifier was accepted.");
} catch (error) {
  ok(error instanceof HawaiiBranchError, "An unassigned track identifier produced the wrong error.");
}

note(
  `4. Stops: ${NEGATIVE_CASES.length} negative cases fail closed across ${seenStops.size} typed-stop families, each carrying a reason, a named destination and a next step, and none routing back to its own track; ${branchRejections} out-of-list branch values rejected; an unassigned track identifier refused.`
);

// ---------------------------------------------------------------------------
// 5. Rendered content, read page by page
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/will be granted|you are eligible|you will succeed|is entitled to relief/i, "a prediction or an eligibility assertion"],
  [/we have (reviewed|verified|confirmed)/i, "a claim that LegalEase reviewed or verified records"],
  [/on your behalf we (filed|served)/i, "a claim that LegalEase filed or served"],
  [/the (prosecuting attorney|prosecutor) (has agreed|does not object to|will not oppose|has stipulated)/i, "an assertion about the prosecuting attorney's position"],
  [/your record (is|will be) clear\b/i, "a promise about the result"],
  [/the (court|judge) (has )?(found|ordered|granted)/i, "a claim that the court has acted"],
  [/a hearing (was|has been) (held|scheduled)/i, "a claim about a hearing"],
  [/the Data Center (has )?(expunged|processed|approved)/i, "a claim that the Data Center has acted"]
];

function renderedPages(bytes) {
  const buffer = Buffer.from(bytes);
  const pages = [];
  let cursor = 0;
  while (cursor < buffer.length) {
    const start = buffer.indexOf("stream", cursor);
    if (start === -1) break;
    let from = start + 6;
    if (buffer[from] === 13) from += 1;
    if (buffer[from] === 10) from += 1;
    const end = buffer.indexOf("endstream", from);
    if (end === -1) break;
    cursor = end + 9;
    let inflated = null;
    try {
      inflated = zlib.inflateSync(buffer.subarray(from, end)).toString("latin1");
    } catch {
      continue;
    }
    if (!/\bTm\b/.test(inflated)) continue;
    const runs = [];
    const pattern = /1 0 0 1 ([-\d.]+) ([-\d.]+) Tm[\s\S]*?<([0-9a-fA-F]*)>\s*Tj/g;
    let match;
    while ((match = pattern.exec(inflated))) {
      let text = "";
      const hex = match[3];
      for (let i = 0; i + 1 < hex.length; i += 2) {
        const code = parseInt(hex.slice(i, i + 2), 16);
        text += code >= 32 && code < 127 ? String.fromCharCode(code) : code === 0 ? "" : "?";
      }
      runs.push({ x: parseFloat(match[1]), y: parseFloat(match[2]), text });
    }
    if (runs.length === 0) continue;
    const byLine = new Map();
    for (const run of runs) {
      const key = Math.round(run.y);
      if (!byLine.has(key)) byLine.set(key, []);
      byLine.get(key).push(run);
    }
    pages.push(
      [...byLine.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, group]) => group.sort((a, b) => a.x - b.x).map((r) => r.text).join("   ").trim())
    );
  }
  return pages;
}

function headingLines(template) {
  const set = new Set();
  for (const section of template.sections ?? []) {
    if (section.heading) set.add(section.heading);
  }
  return set;
}

const isFillInRule = (line) => /^_+$|^[_\s]+$/.test(line) || /_{10,}/.test(line);

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveHawaiiFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "HI",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );
  ok(
    resolved.components.length === fixture.expectedComponents,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than the ${fixture.expectedComponents} this branch assigns.`
  );

  // A closed-list answer looked up with the wrong kind of key prints
  // "undefined" into an operative sentence and reads as prose everywhere but
  // the one place it matters.
  const echoedKeys = new Set([...HI_COMMON_INPUT_KEYS, ...(HI_TRACK_INPUT_KEYS[fixture.trackId] ?? [])]);
  for (const [key, value] of Object.entries(facts)) {
    if (typeof value !== "string") continue;
    // The echoed inputs are the participant's own answers, carried so the
    // resolver's declared-input check sees them. They are not sentences.
    if (echoedKeys.has(key)) continue;
    ok(
      !/\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]|\{\{|\btrue\b|\bfalse\b/.test(value),
      `${fixture.fixtureId}: derived fact ${key} carries a leaked placeholder or a raw boolean: ${value}`
    );
  }

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "HI",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "HI",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(output.bytes) === sha(again.bytes), `${component.componentId}: rendering is not deterministic.`);

    const template = pleadingTemplate(component.templateId);
    const pages = renderedPages(output.bytes);
    const headings = headingLines(template);
    ok(
      pages.length === (output.pageCount ?? 0),
      `${fixture.fixtureId}/${component.componentId}: ${pages.length} content streams for ${output.pageCount} pages, so a page carries nothing.`
    );
    pages.forEach((lines, pageIndex) => {
      const written = lines.filter((line) => line.length > 0);
      ok(written.length > 0, `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} is blank.`);
      const last = written[written.length - 1];
      ok(
        pageIndex === pages.length - 1 || !headings.has(last),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} ends on the heading "${last}", stranding it from its section.`
      );
      ok(
        written.every((line) => line.length < 220),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries a line long enough to have run past the margin.`
      );
      written.forEach((line) => {
        ok(
          !/\bundefined\b|\bNaN\b|\[object Object\]|\{\{/.test(line),
          `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} prints a leaked placeholder: ${line}`
        );
        for (const [pattern, description] of PROHIBITED) {
          ok(
            !pattern.test(line),
            `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} contains ${description}: ${line}`
          );
        }
      });
    });

    const allLines = pages.flat().filter((line) => line.length > 12 && !isFillInRule(line));
    for (let i = 1; i < allLines.length; i += 1) {
      ok(
        allLines[i] !== allLines[i - 1],
        `${fixture.fixtureId}/${component.componentId}: the line "${allLines[i].slice(0, 60)}..." is rendered twice in succession.`
      );
    }

    // The caption on both documents must name the court the answers built.
    const firstPage = pages[0].join(" ");
    ok(
      firstPage.includes(facts.hiCourtName),
      `${fixture.fixtureId}/${component.componentId}: the caption does not name ${facts.hiCourtName}.`
    );

    renderedComponents += 1;
    inspectedPages += pages.length;
    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
  }

  // The proposed order must never carry the participant's execution block.
  const orderBytes = assemblyComponents.find((c) => c.role === "proposed_order");
  const orderText = renderedPages(orderBytes.bytes).flat().join(" ");
  ok(
    !/Defendant, self-represented/.test(orderText),
    `${fixture.fixtureId}: the proposed order carries the participant's signature rule.`
  );
  ok(
    !/Signature of Defendant/.test(orderText),
    `${fixture.fixtureId}: the proposed order carries a participant signature line.`
  );

  const assembled = await assemblePacketPdf({
    jurisdiction: "HI",
    jurisdictionName: "Hawaii",
    packetName: resolved.assembledPacketName ?? `${fixture.trackId}-packet`,
    caseReference: facts.packetCaseReference,
    title: resolved.assembledPacketTitle ?? fixture.trackId,
    components: assemblyComponents
  });
  ok((assembled.pageCount ?? 0) > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);
  ok(
    assemblyComponents.map((c) => c.role).join(",") === "primary_filing,proposed_order",
    `${fixture.fixtureId}: the assembled role order is ${assemblyComponents.map((c) => c.role).join(",")}.`
  );

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    sampleRole: fixture.variantOf ? "variant" : "canonical",
    components: assemblyComponents.length,
    pages: renderedPages(assembled.bytes).length,
    sha256: sha(assembled.bytes)
  });
}

note(
  `5. Rendering: ${renderedComponents} components across ${results.length} packets render deterministically as PDFs; ${inspectedPages} pages read line by line with no blank page, no stranded heading, no paragraph rendered twice, no leaked placeholder and no prohibited content; every caption names the court the participant's own answers built; and no proposed order carries a participant execution block.`
);

// ---------------------------------------------------------------------------
// 6. Values carried through
// ---------------------------------------------------------------------------

const canonicalDrug = results.find((r) => r.fixtureId === "hi-drug-first-time-1");
const variantDrug = results.find((r) => r.fixtureId === "hi-drug-family-court-second-circuit-2");
ok(
  canonicalDrug.sha256 !== variantDrug.sha256,
  "The caption variant assembles to the same bytes as its canonical fixture, so it tests nothing."
);

const drugFacts = deriveHawaiiFacts(HI_DRUG_TRACK, fixtureFor(HI_DRUG_TRACK));
ok(
  drugFacts.hiCourtLine === "IN THE CIRCUIT COURT OF THE FIRST CIRCUIT, STATE OF HAWAII",
  `The circuit caption is "${drugFacts.hiCourtLine}".`
);
const variantFacts = deriveHawaiiFacts(HI_DRUG_TRACK, {
  ...fixtureFor(HI_DRUG_TRACK),
  courtLevel: "family",
  circuit: "second"
});
ok(
  variantFacts.hiCourtLine === "IN THE FAMILY COURT OF THE SECOND CIRCUIT, STATE OF HAWAII",
  `The family-court caption is "${variantFacts.hiCourtLine}".`
);
const marijuanaFacts = deriveHawaiiFacts(HI_MARIJUANA_TRACK, fixtureFor(HI_MARIJUANA_TRACK));
ok(
  marijuanaFacts.hiCourtLine.startsWith("IN THE DISTRICT COURT"),
  "The three-grams route does not caption a district court, although the offence is a violation."
);

// The participant's own account of the offence is carried through verbatim.
ok(
  drugFacts.hiOffenceStatement.includes(fixtureFor(HI_DRUG_TRACK).offenceAndStatute),
  "The participant's statement of the offence is not carried through verbatim."
);

// No yes-or-no answer reaches a sentence as a bare word.
for (const trackId of EXPECTED_TRACKS) {
  const facts = deriveHawaiiFacts(trackId, fixtureFor(trackId));
  const echoed = new Set([...HI_COMMON_INPUT_KEYS, ...(HI_TRACK_INPUT_KEYS[trackId] ?? [])]);
  for (const [key, value] of Object.entries(facts)) {
    if (echoed.has(key)) continue;
    ok(
      typeof value !== "string" || !/^\s*(yes|no|unsure)\s*$/i.test(value),
      `${trackId}: a yes-or-no answer reached the fact ${key} as a bare word.`
    );
  }
}

// Each of the five sections cites itself and no other.
const CITATIONS = {
  [HI_DRUG_TRACK]: "HRS 706-622.5(4)",
  [HI_MARIJUANA_TRACK]: "HRS 706-622.5(5)",
  [HI_PRE_2004_TRACK]: "HRS 706-622.8",
  [HI_PROPERTY_TRACK]: "HRS 706-622.9",
  [HI_DUI_TRACK]: "HRS 291E-64(e)"
};
for (const [trackId, citation] of Object.entries(CITATIONS)) {
  const facts = deriveHawaiiFacts(trackId, fixtureFor(trackId));
  ok(facts.hiSectionCitation === citation, `${trackId}: cites ${facts.hiSectionCitation} rather than ${citation}.`);
}

// The three interpolated recitals and the fee boundary, asserted against the
// derived facts that supply them rather than against the template.
for (const trackId of EXPECTED_TRACKS) {
  const facts = deriveHawaiiFacts(trackId, fixtureFor(trackId));
  ok(
    /Haw\. R\. Penal P\. 47\(a\)/.test(facts.hiRule47Basis) && /shall be by motion/.test(facts.hiRule47Basis),
    `${trackId}: the Rule 47(a) recital does not state that an application for an order shall be by motion.`
  );
  ok(
    /Haw\. R\. Penal P\. 47\(d\)/.test(facts.hiDeclarationBasis),
    `${trackId}: the declaration recital does not cite Rule 47(d).`
  );
  ok(
    /Haw\. R\. Penal P\. 49\(a\)/.test(facts.hiServiceBasis) &&
      /prosecuting attorney receives this motion as a party/.test(facts.hiServiceBasis),
    `${trackId}: the service recital does not cite Rule 49(a) and name the prosecuting attorney as the party served.`
  );
  ok(
    /ask the clerk what, if anything, is charged/.test(facts.hiNoFeeStatement) &&
      !/no fee|free/i.test(facts.hiNoFeeStatement.replace(/prescribes a filing fee/, "")),
    `${trackId}: the fee boundary does not send the participant to the clerk, or asserts the filing is free.`
  );
  ok(
    /Criminal Justice Data Center/.test(facts.hiStageTwoStatement) &&
      /does not obtain the order/.test(facts.hiStageTwoStatement),
    `${trackId}: the stage-two recital does not keep LegalEase out of the Data Center step.`
  );
}

note(
  "6. Values: the participant's account of the offence is carried through verbatim, no yes-or-no answer reaches a sentence as a bare word, each of the five provisions cites itself and no other, the caption variant assembles to different bytes from its canonical fixture, and the violation route captions a district court while the felony routes caption a circuit court."
);

// ---------------------------------------------------------------------------
// 7. Runtime
// ---------------------------------------------------------------------------

for (const track of HI_CUSTOM_PLEADING_TRACKS) {
  ok(track.statuses.runtime === "runtime_disabled", `${track.trackId}: runtime status is ${track.statuses.runtime}.`);
  ok(track.statuses.legal === "not_submitted", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.statuses.visual === "not_reviewed", `${track.trackId}: visual status is ${track.statuses.visual}.`);
  for (const component of track.packetSet.components) {
    ok(
      component.approval.legal === "not_submitted" && component.approval.visual === "not_reviewed",
      `${component.componentId}: carries an approval it has not received.`
    );
  }
}
note("7. Runtime: every track is runtime-disabled, legally unsubmitted and visually unreviewed.");

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Hawaii custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Hawaii custom-pleading verification passed.");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
const width = Math.max(...results.map((r) => r.fixtureId.length));
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(width)}  ${result.trackId.padEnd(44)} ${result.sampleRole.padEnd(9)}  ${result.components} components  ${String(result.pages).padStart(2)} pages  sha256=${result.sha256}`
  );
}
