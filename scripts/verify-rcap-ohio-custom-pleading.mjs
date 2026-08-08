// Ohio custom pleading, clean tracks — packet verification.
//
// Proves what a rendered sample cannot prove by looking right: Ohio is not
// enabled and the shared surfaces are untouched; the assignment is exactly the
// four clean tracks and their four assigned custom-pleading components, with
// the sixteen process-guidance and official-PDF components excluded by strategy
// rather than forgotten; the split-out marijuana track appears nowhere; every
// document holds the design's boundaries on its face; every negative case fails
// closed with a typed stop naming a destination and a next step; and every
// rendered page is read line by line.
//
// Four boundaries carry most of section 2:
//
//   1. This is not a court form. Ohio publishes no statewide mandatory packet,
//      so every document says on its face that it is the statutory content for
//      the participant to put on their own court's application.
//   2. No waiting period is computed. The ORC 2953.32 felony expungement clock
//      is compound — ten years from the sealing eligibility date, not from
//      discharge — and it is stated as the rule the court applies.
//   3. The sealing-versus-expungement election is the participant's, and an
//      undecided answer stops rather than defaulting to either.
//   4. ORC 2953.35 is not a general firearm expungement, and the document says
//      so where a participant would otherwise assume it.
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
  OH_CUSTOM_PLEADING_TRACKS,
  OH_PLEADING_TEMPLATES,
  OH_DESIGN_ROLE_TO_ENGINE_ROLE,
  OH_EXCLUDED_COMPONENTS,
  OH_EXCLUDED_TRACK_ID,
  OH_ASSIGNED_TRACK_IDS,
  OH_SEALING_TRACK,
  OH_EXPUNGEMENT_TRACK,
  OH_NONCONVICTION_TRACK,
  OH_FIREARM_TRACK,
  OH_YES_NO,
  OH_YES_NO_UNSURE,
  OH_DISPOSITION_TYPES,
  OH_DISMISSAL_PREJUDICE,
  OH_REMEDY_CHOICES,
  OH_TRACK_INPUT_KEYS,
  OH_REFERRALS,
  deriveOhioFacts,
  OhioBranchError,
  OhioEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/ohio/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// ---------------------------------------------------------------------------
// 0. Ohio is not enabled, and the shared surfaces are intact
// ---------------------------------------------------------------------------

const assignedIds = new Set(OH_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Ohio track is wired into the shared relief-track registry."
);
ok(
  Object.keys(OH_PLEADING_TEMPLATES).every(
    (id) => !Object.prototype.hasOwnProperty.call(PLEADING_TEMPLATES, id)
  ),
  "An Ohio template is registered in the shared template pack."
);
ok(
  OH_CUSTOM_PLEADING_TRACKS.every((t) => t.runtimeDisabled === true),
  "An Ohio track is not runtime-disabled."
);
note(
  `0. Enablement: all ${OH_CUSTOM_PLEADING_TRACKS.length} assigned tracks and all ${Object.keys(OH_PLEADING_TEMPLATES).length} templates are absent from the shared registry and template pack, and every track is runtime-disabled.`
);

for (const track of OH_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, OH_PLEADING_TEMPLATES);

// ---------------------------------------------------------------------------
// 1. The clean split, pinned
// ---------------------------------------------------------------------------

const EXPECTED_TRACKS = [OH_SEALING_TRACK, OH_EXPUNGEMENT_TRACK, OH_NONCONVICTION_TRACK, OH_FIREARM_TRACK];

ok(
  OH_ASSIGNED_TRACK_IDS.length === 4 && EXPECTED_TRACKS.every((id) => OH_ASSIGNED_TRACK_IDS.includes(id)),
  `The assignment is ${OH_ASSIGNED_TRACK_IDS.join(", ")} rather than the four clean tracks.`
);
ok(
  !OH_ASSIGNED_TRACK_IDS.includes(OH_EXCLUDED_TRACK_ID),
  `The split-out track ${OH_EXCLUDED_TRACK_ID} is in the assignment.`
);
ok(
  OH_CUSTOM_PLEADING_TRACKS.every((t) => t.trackId !== OH_EXCLUDED_TRACK_ID),
  `The split-out track ${OH_EXCLUDED_TRACK_ID} is implemented.`
);

let componentCount = 0;
for (const track of OH_CUSTOM_PLEADING_TRACKS) {
  const actual = track.packetSet.components;
  ok(actual.length === 1, `${track.trackId}: declares ${actual.length} components rather than the 1 assigned to this lane.`);
  const got = actual[0];
  ok(got.componentId === `${track.trackId}-primary-filing-1`, `${track.trackId}: component id is ${got.componentId}.`);
  ok(got.role === "primary_filing", `${got.componentId}: role is ${got.role}.`);
  ok(got.order === 1, `${got.componentId}: order is ${got.order}.`);
  ok(got.outputStrategy === "custom_pleading", `${got.componentId}: output strategy is not custom_pleading.`);
  ok(got.rendererStrategy === "custom_pleading", `${got.componentId}: renderer strategy is not custom_pleading.`);
  ok(got.sourcePath === null && got.sourceSha256 === null, `${got.componentId}: claims an official source.`);
  ok(
    Object.values(OH_DESIGN_ROLE_TO_ENGINE_ROLE).includes(got.role),
    `${got.componentId}: role is outside the declared design-role mapping.`
  );
  for (const excluded of OH_EXCLUDED_COMPONENTS) {
    ok(
      actual.every((c) => c.componentId !== `${track.trackId}${excluded.componentIdSuffix}`),
      `${track.trackId}: implements ${excluded.componentIdSuffix}, which is ${excluded.strategy}.`
    );
  }
  componentCount += actual.length;
}
ok(componentCount === 4, `The assignment implements ${componentCount} components rather than 4.`);
ok(
  OH_EXCLUDED_COMPONENTS.length === 4 &&
    OH_EXCLUDED_COMPONENTS.filter((c) => c.strategy === "process_guidance").length === 3 &&
    OH_EXCLUDED_COMPONENTS.filter((c) => c.strategy === "official_pdf_fill").length === 1,
  "The excluded components are not recorded as three process-guidance and one official-PDF."
);
note(
  "1. Assignment: exactly the 4 clean tracks and their 4 assigned custom-pleading components, each pinned to the packet-set manifest's component id, role and order; the 12 process-guidance and 4 official-PDF components on those tracks are recorded as excluded by strategy and none is implemented; oh_marijuana_expungement is neither assigned nor implemented."
);

// ---------------------------------------------------------------------------
// 2. Design boundaries on the face of every document
// ---------------------------------------------------------------------------

const templateSource = (id) => JSON.stringify(pleadingTemplate(id));
const allSource = EXPECTED_TRACKS.map((t) => templateSource(`${t}-application`)).join("");

for (const trackId of EXPECTED_TRACKS) {
  const source = templateSource(`${trackId}-application`);
  ok(/\{\{ohContentNotAForm\}\}/.test(source), `${trackId}: no statement that this is content rather than the court's form.`);
  ok(/\{\{ohNotAssertedStatement\}\}/.test(source), `${trackId}: no statement of what the application does not say.`);
  ok(/\{\{ohNoPeriodStatement\}\}/.test(source), `${trackId}: no statement that no period is computed.`);
  ok(/\{\{ohFeeStatement\}\}/.test(source), `${trackId}: no fee boundary.`);
  ok(/\{\{ohSplitNote\}\}/.test(source), `${trackId}: no statement of the sealing-versus-expungement split.`);
  ok(/ORC 2953\.61/.test(source), `${trackId}: never names ORC 2953.61, which governs a multi-charge incident.`);
  const template = pleadingTemplate(`${trackId}-application`);
  ok(
    typeof template.verification === "string" && template.verification.length > 40,
    `${trackId}: the participant's document carries no verification.`
  );
  ok(
    typeof template.signatureLabel === "string" && template.signatureLabel.length > 0,
    `${trackId}: the participant's document carries no signature rule.`
  );
  // Nothing on these routes is signed, certified or approved by an outside party.
  ok(
    !/JUDGE|Prosecutor:|Approved by|Clerk of Court:/i.test(source),
    `${trackId}: the application carries an outside party's execution block.`
  );
}

// The split-out track must not be mentioned anywhere in participant content.
ok(
  !new RegExp(OH_EXCLUDED_TRACK_ID.replace(/_/g, "[ _]"), "i").test(allSource) &&
    !/marijuana|2953\.321/i.test(allSource),
  "A document mentions the split-out marijuana route, which this packet cannot take the participant down."
);

ok(!/\$\s?\d/.test(allSource), "An Ohio document prints a money amount.");
ok(
  !/fifty dollars|\$50/i.test(allSource),
  "An Ohio document prints the application fee, which is stated by the clerk rather than by this packet."
);
note(
  "2. Design boundaries: every application states on its face that it is the statutory content and not the court's own form and sends the participant to their clerk for that form; each carries the not-asserted section, the no-period statement, the fee boundary and the sealing-versus-expungement split; each names ORC 2953.61; each carries the applicant's verification and signature rule and no outside party's execution block; none prints an amount; and no document mentions the split-out marijuana route."
);

// ---------------------------------------------------------------------------
// 3. Fixtures
// ---------------------------------------------------------------------------

const convictionBase = (prefix, overrides = {}) => ({
  [`${prefix}FullLegalName`]: "Rosalind Achebe-Marchetti",
  [`${prefix}DateOfBirth`]: "3 February 1988",
  [`${prefix}Court`]: "Franklin County Court of Common Pleas",
  [`${prefix}CaseNumber`]: "16CR-004821",
  [`${prefix}OffenceDetails`]: "Receiving stolen property, ORC 2913.51, a felony of the fifth degree",
  [`${prefix}FinalDischarge`]: "Sentence completed and all fines and restitution paid by 12 September 2019",
  [`${prefix}CourtCostsOnly`]: "no",
  [`${prefix}AllChargesFromIncident`]: "One charge only, and it ended in this conviction",
  [`${prefix}OtherConvictions`]: "None",
  [`${prefix}RegistrationHistory`]: "no",
  [`${prefix}ExclusionScreen`]: "no",
  [`${prefix}PendingProceedings`]: "no",
  [`${prefix}OutOfState`]: "no",
  [`${prefix}Indigent`]: "no",
  ...overrides
});

const nonconvictionBase = (overrides = {}) => ({
  ncvFullLegalName: "Thaddeus Oyelaran-Whitcombe",
  ncvDateOfBirth: "28 July 1994",
  ncvCourt: "Hamilton County Municipal Court",
  ncvCaseNumber: "21CRB-11934",
  ncvOffenceDetails: "Criminal trespass, ORC 2911.21, alleged to have occurred on 4 April 2021",
  ncvAllChargesFromIncident: "One charge only, and it was dismissed",
  ncvPendingProceedings: "no",
  ncvOtherOhioCases: "None",
  ncvDispositionType: "dismissed",
  ncvDismissalPrejudice: "with_prejudice",
  ncvNoBillDate: "",
  ncvRemedyChoice: "sealing",
  ...overrides
});

const firearmBase = (overrides = {}) => ({
  frmFullLegalName: "Ignatius Ferreira-Blackwood",
  frmDateOfBirth: "11 January 1979",
  frmCourt: "Cuyahoga County Court of Common Pleas",
  frmCaseNumber: "CR-09-528114",
  frmOffenceDetails: "ORC 2923.16 as it then stood, convicted on 6 October 2009",
  frmConduct:
    "I was stopped while carrying under my licence and was charged with failing to notify the officer promptly that I was carrying",
  frmLicensee: "yes",
  frmAllChargesFromIncident: "One charge only, and it ended in this conviction",
  frmIndigent: "no",
  ...overrides
});

const FIXTURES = [
  { fixtureId: "oh-sealing-f5-1", trackId: OH_SEALING_TRACK, expectedComponents: 1, answers: convictionBase("sls") },
  {
    fixtureId: "oh-expungement-f5-1",
    trackId: OH_EXPUNGEMENT_TRACK,
    expectedComponents: 1,
    answers: convictionBase("exp")
  },
  {
    fixtureId: "oh-nonconviction-dismissed-1",
    trackId: OH_NONCONVICTION_TRACK,
    expectedComponents: 1,
    answers: nonconvictionBase()
  },
  { fixtureId: "oh-firearm-notification-1", trackId: OH_FIREARM_TRACK, expectedComponents: 1, answers: firearmBase() },
  {
    fixtureId: "oh-sealing-court-costs-outstanding-2",
    trackId: OH_SEALING_TRACK,
    variantOf: "oh-sealing-f5-1",
    variantPurpose:
      "Outstanding court costs, as opposed to unpaid fines or restitution, put a different operative recital on the face of the application: the applicant states the costs are outstanding and the question is left to the court on this record rather than argued. Senate Bill 288 reorganized the section and whether costs alone prevent an application is not settled, so the two branches must read differently.",
    materialBranch: "financial-obligation recital",
    expectedComponents: 1,
    answers: convictionBase("sls", { slsCourtCostsOnly: "yes", slsIndigent: "yes" })
  },
  {
    fixtureId: "oh-nonconviction-no-bill-2",
    trackId: OH_NONCONVICTION_TRACK,
    variantOf: "oh-nonconviction-dismissed-1",
    variantPurpose:
      "Each ORC 2953.33 disposition carries its own timing rule, and the no-bill rule is the only one of the four with a period: two years from the date the foreperson reported it. The recital, the prejudice paragraph and the requested remedy all change, and the no-bill date becomes a required answer that the dismissed branch does not ask for.",
    materialBranch: "disposition type and its timing rule",
    expectedComponents: 1,
    answers: nonconvictionBase({
      ncvDispositionType: "no_bill",
      ncvDismissalPrejudice: "not_a_dismissal",
      ncvNoBillDate: "19 May 2022",
      ncvRemedyChoice: "expungement",
      ncvAllChargesFromIncident: "One charge only, and the grand jury returned a no bill"
    })
  }
];

function fixtureFor(trackId) {
  return FIXTURES.find((f) => f.trackId === trackId && !f.variantOf).answers;
}

const canonicalCount = FIXTURES.filter((f) => !f.variantOf).length;
ok(canonicalCount === 4, `There are ${canonicalCount} canonical fixtures rather than one per assigned track.`);
for (const fixture of FIXTURES.filter((f) => f.variantOf)) {
  ok(
    typeof fixture.variantPurpose === "string" && fixture.variantPurpose.length > 80,
    `${fixture.fixtureId}: the variant does not state its purpose.`
  );
  ok(typeof fixture.materialBranch === "string" && fixture.materialBranch.length > 0, `${fixture.fixtureId}: no material branch named.`);
  ok(FIXTURES.some((f) => f.fixtureId === fixture.variantOf), `${fixture.fixtureId}: names a canonical fixture that does not exist.`);
}

// 2b. The compound clock is stated and never applied; the election is never made.
const expFacts = deriveOhioFacts(OH_EXPUNGEMENT_TRACK, fixtureFor(OH_EXPUNGEMENT_TRACK));
ok(
  /ten years from the date the person first becomes eligible to apply for SEALING/.test(expFacts.ohWaitingRuleStatement),
  "The expungement application does not state the compound clock."
);
ok(
  /does not perform it/.test(expFacts.ohWaitingRuleStatement),
  "The expungement application does not say that it leaves the compound calculation to the court."
);
const slsFacts = deriveOhioFacts(OH_SEALING_TRACK, fixtureFor(OH_SEALING_TRACK));
ok(
  /measures the sealing wait from final discharge/.test(slsFacts.ohWaitingRuleStatement) &&
    /does not compute it/.test(slsFacts.ohWaitingRuleStatement),
  "The sealing application does not state its own timing rule as a rule."
);
ok(
  /Senate Bill 288/.test(slsFacts.ohStructuralNote) && /numeric cap/.test(slsFacts.ohStructuralNote),
  "The Senate Bill 288 reorganization is not recorded on the conviction routes."
);
const frmFacts = deriveOhioFacts(OH_FIREARM_TRACK, fixtureFor(OH_FIREARM_TRACK));
ok(
  /not a general firearm expungement/.test(frmFacts.ohNarrownessStatement),
  "The ORC 2953.35 application does not say it is not a general firearm expungement."
);
ok(
  /September 30, 2011/.test(frmFacts.ohVersionQuestionStatement) &&
    /rather than asserting that a cutoff is met/.test(frmFacts.ohVersionQuestionStatement),
  "The ORC 2953.35 application does not record the unsettled cutoff question."
);
const ncvFacts = deriveOhioFacts(OH_NONCONVICTION_TRACK, fixtureFor(OH_NONCONVICTION_TRACK));
ok(
  /division \(C\)/.test(ncvFacts.ohDivisionCNote) && /leaves the division \(C\) question to the court/.test(ncvFacts.ohDivisionCNote),
  "The ORC 2953.33 application does not record the division (C) limit as the court's question."
);
note(
  "2b. Route boundaries: the expungement route states the compound ten-years-from-sealing-eligibility clock and says it does not perform it; the sealing route states its own rule and does not compute it; both carry the Senate Bill 288 reorganization; ORC 2953.35 says it is not a general firearm expungement and records the unsettled cutoff; and ORC 2953.33 leaves the division (C) sealing-or-expungement limit to the court."
);

// ---------------------------------------------------------------------------
// 4. Negative cases — every typed-stop family
// ---------------------------------------------------------------------------

const NEGATIVE_CASES = [
  [OH_SEALING_TRACK, { slsPendingProceedings: "yes" }, "oh-pending-proceedings"],
  [OH_SEALING_TRACK, { slsAllChargesFromIncident: "Two charges, and one ended in a different disposition" }, "oh-2953-61-multiple-dispositions"],
  [OH_SEALING_TRACK, { slsExclusionScreen: "yes" }, "oh-2953-32-excluded-offence"],
  [OH_SEALING_TRACK, { slsExclusionScreen: "unsure" }, "oh-2953-32-excluded-offence"],
  [OH_SEALING_TRACK, { slsRegistrationHistory: "yes" }, "oh-2953-32-registration-history"],
  [OH_SEALING_TRACK, { slsOutOfState: "yes" }, "oh-2953-32-out-of-state-venue"],
  [OH_SEALING_TRACK, { slsOtherConvictions: "A felony of the third degree in 2011 and another in 2014" }, "oh-2953-32-third-degree-counting-rule"],
  [OH_SEALING_TRACK, { slsCaseNumber: "" }, "oh-answer-missing"],
  [OH_EXPUNGEMENT_TRACK, { expExclusionScreen: "yes" }, "oh-2953-32-excluded-offence"],
  [OH_EXPUNGEMENT_TRACK, { expPendingProceedings: "yes" }, "oh-pending-proceedings"],
  [OH_NONCONVICTION_TRACK, { ncvRemedyChoice: "undecided" }, "oh-remedy-election-not-made"],
  [OH_NONCONVICTION_TRACK, { ncvDispositionType: "unsure" }, "oh-2953-33-disposition-not-established"],
  [OH_NONCONVICTION_TRACK, { ncvDismissalPrejudice: "without_prejudice" }, "oh-2953-33-dismissal-without-prejudice"],
  [OH_NONCONVICTION_TRACK, { ncvDismissalPrejudice: "unsure" }, "oh-2953-33-dismissal-without-prejudice"],
  [
    OH_NONCONVICTION_TRACK,
    { ncvDispositionType: "no_bill", ncvDismissalPrejudice: "not_a_dismissal", ncvNoBillDate: "" },
    "oh-2953-33-no-bill-date-not-established"
  ],
  [OH_NONCONVICTION_TRACK, { ncvPendingProceedings: "yes" }, "oh-pending-proceedings"],
  [OH_FIREARM_TRACK, { frmLicensee: "no" }, "oh-2953-35-not-a-licensee"],
  [OH_FIREARM_TRACK, { frmLicensee: "unsure" }, "oh-2953-35-not-a-licensee"],
  [OH_FIREARM_TRACK, { frmConduct: "I was carrying a loaded firearm in a motor vehicle" }, "oh-2953-35-not-the-notification-offence"],
  [OH_FIREARM_TRACK, { frmPendingProceedings: "yes" }, "oh-pending-proceedings"]
];

const seenStops = new Set();
for (const [trackId, override, expectedStop] of NEGATIVE_CASES) {
  let thrown = null;
  try {
    deriveOhioFacts(trackId, { ...fixtureFor(trackId), ...override });
  } catch (error) {
    thrown = error;
  }
  ok(thrown instanceof OhioEligibilityStopError, `${trackId} ${JSON.stringify(override)}: did not fail closed.`);
  if (!(thrown instanceof OhioEligibilityStopError)) continue;
  ok(thrown.stopId === expectedStop, `${trackId} ${JSON.stringify(override)}: stopped as ${thrown.stopId} rather than ${expectedStop}.`);
  ok(thrown.message.length > 80, `${thrown.stopId}: the stop gives no reason.`);
  ok(typeof thrown.destination === "string" && thrown.destination.length > 20, `${thrown.stopId}: no destination.`);
  ok(typeof thrown.nextStep === "string" && thrown.nextStep.length > 20, `${thrown.stopId}: no next step.`);
  ok(OH_REFERRALS.includes(thrown.destination), `${thrown.stopId}: the destination is not a declared referral.`);
  ok(
    !thrown.destination.includes(trackId) && !thrown.nextStep.includes(trackId),
    `${thrown.stopId}: routes back to its own track as the solution.`
  );
  seenStops.add(thrown.stopId);
}
// 13 = 2 shared screens (pending proceedings, ORC 2953.61) + the missing-answer
// stop + 4 on the ORC 2953.32 conviction screen + the remedy election + 3 on
// ORC 2953.33 + 2 on ORC 2953.35.
ok(seenStops.size === 13, `${seenStops.size} distinct typed stops fired rather than the 13 the design declares.`);

let branchRejections = 0;
for (const [trackId, key] of [
  [OH_SEALING_TRACK, "slsExclusionScreen"],
  [OH_SEALING_TRACK, "slsPendingProceedings"],
  [OH_NONCONVICTION_TRACK, "ncvDispositionType"],
  [OH_NONCONVICTION_TRACK, "ncvDismissalPrejudice"],
  [OH_NONCONVICTION_TRACK, "ncvRemedyChoice"],
  [OH_FIREARM_TRACK, "frmLicensee"]
]) {
  try {
    deriveOhioFacts(trackId, { ...fixtureFor(trackId), [key]: "perhaps" });
    ok(false, `${key}: an out-of-list answer was accepted.`);
  } catch (error) {
    ok(error instanceof OhioBranchError, `${key}: an out-of-list answer produced ${error?.name}.`);
    branchRejections += 1;
  }
}
ok(
  Object.keys(OH_YES_NO).length === 2 &&
    Object.keys(OH_YES_NO_UNSURE).length === 3 &&
    Object.keys(OH_DISPOSITION_TYPES).length === 5 &&
    Object.keys(OH_DISMISSAL_PREJUDICE).length === 4 &&
    Object.keys(OH_REMEDY_CHOICES).length === 3,
  "A closed list changed size."
);

try {
  deriveOhioFacts(OH_EXCLUDED_TRACK_ID, {});
  ok(false, "The split-out marijuana track was accepted by the fact deriver.");
} catch (error) {
  ok(error instanceof OhioBranchError, "The split-out track produced the wrong error.");
}

note(
  `4. Stops: ${NEGATIVE_CASES.length} negative cases fail closed across ${seenStops.size} typed-stop families, each carrying a reason, a named destination and a next step, and none routing back to its own track; ${branchRejections} out-of-list branch values rejected; five closed lists hold their size; and the split-out marijuana track is refused outright.`
);

// ---------------------------------------------------------------------------
// 5. Rendered content, read page by page
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/will be granted|you are eligible|you will succeed|is entitled to relief/i, "a prediction or an eligibility assertion"],
  [/we have (reviewed|verified|confirmed)/i, "a claim that LegalEase reviewed or verified records"],
  [/on your behalf we (filed|served)/i, "a claim that LegalEase filed or served"],
  [/the prosecutor (has not objected|will not object|does not object|has agreed)/i, "an assertion about the prosecutor's position"],
  [/your record (is|will be) clear\b/i, "a promise about the result"],
  [/the (court|judge) (has )?(found|ordered|granted)/i, "a claim that the court has acted"],
  [/a hearing (was|has been) (held|scheduled)/i, "a claim about a hearing"],
  [/the waiting period (has|is) (run|expired|satisfied)/i, "a claim that a period has run"]
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
  for (const section of template.sections ?? []) if (section.heading) set.add(section.heading);
  return set;
}

const isFillInRule = (line) => /^_+$|^[_\s]+$/.test(line) || /_{10,}/.test(line);

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveOhioFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "OH",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);
  ok(
    resolved.components.length === fixture.expectedComponents,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than ${fixture.expectedComponents}.`
  );

  const echoedKeys = new Set(OH_TRACK_INPUT_KEYS[fixture.trackId] ?? []);
  for (const [key, value] of Object.entries(facts)) {
    if (typeof value !== "string" || echoedKeys.has(key)) continue;
    ok(
      !/\bundefined\b|\bNaN\b|\[object Object\]|\{\{|^\s*(true|false)\s*$/.test(value),
      `${fixture.fixtureId}: derived fact ${key} carries a leaked placeholder or a raw boolean: ${value}`
    );
  }

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "OH",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "OH",
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
      `${fixture.fixtureId}/${component.componentId}: ${pages.length} content streams for ${output.pageCount} pages.`
    );
    pages.forEach((lines, pageIndex) => {
      const written = lines.filter((line) => line.length > 0);
      ok(written.length > 0, `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} is blank.`);
      const last = written[written.length - 1];
      ok(
        pageIndex === pages.length - 1 || !headings.has(last),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} ends on the heading "${last}".`
      );
      ok(
        written.every((line) => line.length < 220),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries an over-long line.`
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

    // The caption must carry the participant's own court and case number, and
    // the applicant's own name, consistently.
    const firstPage = pages[0].join(" ");
    ok(firstPage.includes(facts.ohCaseNumber), `${fixture.fixtureId}: the caption omits the case number.`);
    ok(
      firstPage.toUpperCase().includes(facts.ohCourtName.toUpperCase().slice(0, 20)),
      `${fixture.fixtureId}: the caption does not name ${facts.ohCourtName}.`
    );
    const allText = pages.flat().join(" ");
    ok(allText.includes(facts.ohApplicantName), `${fixture.fixtureId}: the applicant's name is not carried through.`);

    renderedComponents += 1;
    inspectedPages += pages.length;
    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
  }

  const assembled = await assemblePacketPdf({
    jurisdiction: "OH",
    jurisdictionName: "Ohio",
    packetName: resolved.assembledPacketName ?? `${fixture.trackId}-packet`,
    caseReference: facts.packetCaseReference,
    title: resolved.assembledPacketTitle ?? fixture.trackId,
    components: assemblyComponents
  });
  ok((assembled.pageCount ?? 0) > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);

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
  `5. Rendering: ${renderedComponents} components across ${results.length} packets render deterministically as PDFs; ${inspectedPages} pages read line by line with no blank page, no stranded heading, no paragraph rendered twice, no leaked placeholder and no prohibited content; and every caption carries the participant's own court and case number.`
);

// ---------------------------------------------------------------------------
// 6. Values carried through
// ---------------------------------------------------------------------------

for (const [canonicalId, variantId] of [
  ["oh-sealing-f5-1", "oh-sealing-court-costs-outstanding-2"],
  ["oh-nonconviction-dismissed-1", "oh-nonconviction-no-bill-2"]
]) {
  const canonical = results.find((r) => r.fixtureId === canonicalId);
  const variant = results.find((r) => r.fixtureId === variantId);
  ok(canonical.sha256 !== variant.sha256, `${variantId} assembles to the same bytes as ${canonicalId}, so it tests nothing.`);
}

// The two ORC 2953.32 routes must not render identically: they ask for
// different remedies and state different clocks.
const sealingResult = results.find((r) => r.fixtureId === "oh-sealing-f5-1");
const expungementResult = results.find((r) => r.fixtureId === "oh-expungement-f5-1");
ok(
  sealingResult.sha256 !== expungementResult.sha256,
  "The sealing and expungement applications assemble to identical bytes, although they are different remedies."
);
ok(slsFacts.ohRemedy === "sealing" && expFacts.ohRemedy === "expungement", "A conviction route requests the wrong remedy.");
ok(
  /to seal the record/.test(slsFacts.ohReliefRequested) && /to expunge the record/.test(expFacts.ohReliefRequested),
  "A conviction route's prayer does not name its own remedy."
);

// Each disposition produces its own timing recital.
const noBillFacts = deriveOhioFacts(OH_NONCONVICTION_TRACK, FIXTURES.find((f) => f.fixtureId === "oh-nonconviction-no-bill-2").answers);
ok(/two years after the date the foreperson/.test(noBillFacts.ohTimingStatement), "The no-bill branch does not state its two-year rule.");
ok(!/two years/.test(ncvFacts.ohTimingStatement), "The dismissal branch states a two-year period that does not apply to it.");
ok(/19 May 2022/.test(noBillFacts.ohTimingStatement), "The no-bill branch does not carry the participant's own reported date.");

// The costs variant reads differently from its canonical.
const costsFacts = deriveOhioFacts(OH_SEALING_TRACK, FIXTURES.find((f) => f.fixtureId === "oh-sealing-court-costs-outstanding-2").answers);
ok(/court costs remain outstanding/.test(costsFacts.ohCostsStatement), "The costs variant does not state that costs are outstanding.");
ok(/no court costs, fine or restitution remain/.test(slsFacts.ohCostsStatement), "The canonical does not state that nothing is outstanding.");
ok(/asks the court to excuse the application fee/.test(costsFacts.ohIndigentStatement), "The indigency request is not carried.");

// The participant's own account is carried through verbatim.
ok(
  frmFacts.ohConductStatement.includes(fixtureFor(OH_FIREARM_TRACK).frmConduct),
  "The applicant's account of the conduct is not carried through verbatim."
);

// No yes-or-no answer reaches a sentence as a bare word.
for (const trackId of EXPECTED_TRACKS) {
  const facts = deriveOhioFacts(trackId, fixtureFor(trackId));
  const echoed = new Set(OH_TRACK_INPUT_KEYS[trackId] ?? []);
  for (const [key, value] of Object.entries(facts)) {
    if (echoed.has(key)) continue;
    ok(
      typeof value !== "string" || !/^\s*(yes|no|unsure|sealing|expungement)\s*$/i.test(value) || key === "ohRemedy",
      `${trackId}: an answer reached the fact ${key} as a bare word.`
    );
  }
}

note(
  "6. Values: the sealing and expungement applications assemble to different bytes and each names its own remedy in its prayer; each ORC 2953.33 disposition produces its own timing recital and only the no-bill branch states a period; the outstanding-costs variant reads differently from its canonical and carries the indigency request; the applicant's account of the conduct is carried through verbatim; and no answer reaches a sentence as a bare word."
);

// ---------------------------------------------------------------------------
// 7. Runtime
// ---------------------------------------------------------------------------

for (const track of OH_CUSTOM_PLEADING_TRACKS) {
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
  console.error("Ohio custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Ohio custom-pleading verification passed.");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
const width = Math.max(...results.map((r) => r.fixtureId.length));
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(width)}  ${result.trackId.padEnd(26)} ${result.sampleRole.padEnd(9)}  ${result.components} component  ${String(result.pages).padStart(2)} pages  sha256=${result.sha256}`
  );
}
