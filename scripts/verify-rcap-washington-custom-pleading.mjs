// Washington custom pleading, clean tracks — packet verification.
//
// Proves what a rendered sample cannot prove by looking right: Washington is
// not enabled and the shared surfaces are untouched; the assignment is exactly
// the two clean tracks and their three assigned custom-pleading components,
// with the five process-guidance components excluded by strategy rather than
// forgotten; the split-out certificate track appears nowhere; every document
// holds the design's boundaries on its face; every negative case fails closed
// with a typed stop naming a destination and a next step; and every rendered
// page is read line by line.
//
// Four boundaries carry most of section 2:
//
//   1. The deletion request is not a court filing. No cause number, no venue,
//      no hearing, no order — the agency decides, and the document says so.
//   2. The three common WSP refusal grounds are screened before anything is
//      drafted AND stated on the face of the request, because a participant
//      who walks into one of them should know before they pay.
//   3. RCW 9.95.240 has no pattern form. The motion says so rather than
//      implying it is one, and it says the relief is discretionary.
//   4. No amount is printed anywhere: the WSP fee is to be checked live and
//      Washington court fees and county local requirements were not
//      established.
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
  WA_CUSTOM_PLEADING_TRACKS,
  WA_PLEADING_TEMPLATES,
  WA_DESIGN_ROLE_TO_ENGINE_ROLE,
  WA_EXCLUDED_COMPONENTS,
  WA_EXCLUDED_TRACK_ID,
  WA_ASSIGNED_TRACK_IDS,
  WA_DELETION_TRACK,
  WA_VACATION_TRACK,
  WA_YES_NO,
  WA_YES_NO_UNSURE,
  WA_VACATION_LIMBS,
  WA_PLEA_OR_VERDICT,
  WA_TRACK_INPUT_KEYS,
  WA_REFERRALS,
  deriveWashingtonFacts,
  WashingtonBranchError,
  WashingtonEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/washington/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// ---------------------------------------------------------------------------
// 0. Washington is not enabled, and the shared surfaces are intact
// ---------------------------------------------------------------------------

const assignedIds = new Set(WA_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Washington track is wired into the shared relief-track registry."
);
ok(
  Object.keys(WA_PLEADING_TEMPLATES).every((id) => !Object.prototype.hasOwnProperty.call(PLEADING_TEMPLATES, id)),
  "A Washington template is registered in the shared template pack."
);
ok(WA_CUSTOM_PLEADING_TRACKS.every((t) => t.runtimeDisabled === true), "A Washington track is not runtime-disabled.");
note(
  `0. Enablement: all ${WA_CUSTOM_PLEADING_TRACKS.length} assigned tracks and all ${Object.keys(WA_PLEADING_TEMPLATES).length} templates are absent from the shared registry and template pack, and every track is runtime-disabled.`
);

for (const track of WA_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, WA_PLEADING_TEMPLATES);

// ---------------------------------------------------------------------------
// 1. The clean split, pinned
// ---------------------------------------------------------------------------

ok(
  WA_ASSIGNED_TRACK_IDS.length === 2 &&
    WA_ASSIGNED_TRACK_IDS.includes(WA_DELETION_TRACK) &&
    WA_ASSIGNED_TRACK_IDS.includes(WA_VACATION_TRACK),
  `The assignment is ${WA_ASSIGNED_TRACK_IDS.join(", ")} rather than the two clean tracks.`
);
ok(!WA_ASSIGNED_TRACK_IDS.includes(WA_EXCLUDED_TRACK_ID), `The split-out track ${WA_EXCLUDED_TRACK_ID} is in the assignment.`);
ok(
  WA_CUSTOM_PLEADING_TRACKS.every((t) => t.trackId !== WA_EXCLUDED_TRACK_ID),
  `The split-out track ${WA_EXCLUDED_TRACK_ID} is implemented.`
);

// Component ids, roles and order pinned from the packet-set manifest.
const EXPECTED_COMPONENTS = {
  [WA_DELETION_TRACK]: [{ componentId: `${WA_DELETION_TRACK}-primary-filing-1`, role: "primary_filing", order: 1 }],
  [WA_VACATION_TRACK]: [
    { componentId: `${WA_VACATION_TRACK}-primary-filing-1`, role: "primary_filing", order: 1 },
    { componentId: `${WA_VACATION_TRACK}-proposed-order-2`, role: "proposed_order", order: 2 }
  ]
};

let componentCount = 0;
for (const track of WA_CUSTOM_PLEADING_TRACKS) {
  const expected = EXPECTED_COMPONENTS[track.trackId];
  const actual = track.packetSet.components;
  ok(actual.length === expected.length, `${track.trackId}: declares ${actual.length} components rather than ${expected.length}.`);
  expected.forEach((want, index) => {
    const got = actual[index];
    ok(got?.componentId === want.componentId, `${track.trackId}: component ${index + 1} is ${got?.componentId}.`);
    ok(got?.role === want.role, `${want.componentId}: role is ${got?.role}.`);
    ok(got?.order === want.order, `${want.componentId}: order is ${got?.order}.`);
    ok(got?.outputStrategy === "custom_pleading", `${want.componentId}: output strategy is not custom_pleading.`);
    ok(got?.rendererStrategy === "custom_pleading", `${want.componentId}: renderer strategy is not custom_pleading.`);
    ok(got?.sourcePath === null && got?.sourceSha256 === null, `${want.componentId}: claims an official source.`);
    ok(
      Object.values(WA_DESIGN_ROLE_TO_ENGINE_ROLE).includes(got?.role),
      `${want.componentId}: role is outside the declared design-role mapping.`
    );
  });
  componentCount += actual.length;
  for (const excluded of WA_EXCLUDED_COMPONENTS.filter((c) => c.trackId === track.trackId)) {
    ok(
      actual.every((c) => c.componentId !== `${track.trackId}${excluded.componentIdSuffix}`),
      `${track.trackId}: implements ${excluded.componentIdSuffix}, which is ${excluded.strategy}.`
    );
  }
}
ok(componentCount === 3, `The assignment implements ${componentCount} components rather than 3.`);
ok(
  WA_EXCLUDED_COMPONENTS.length === 5 && WA_EXCLUDED_COMPONENTS.every((c) => c.strategy === "process_guidance"),
  "The five excluded components are not recorded as process guidance."
);
note(
  "1. Assignment: exactly the 2 clean tracks and their 3 assigned custom-pleading components, each pinned to the packet-set manifest's component id, role and order; the 5 process-guidance components on those tracks are recorded as excluded by strategy and none is implemented; wa_crop_certificate_of_restoration is neither assigned nor implemented."
);

// ---------------------------------------------------------------------------
// 2. Design boundaries on the face of every document
// ---------------------------------------------------------------------------

const templateSource = (id) => JSON.stringify(pleadingTemplate(id));
const requestSource = templateSource(`${WA_DELETION_TRACK}-request`);
const motionSource = templateSource(`${WA_VACATION_TRACK}-motion`);
const orderSource = templateSource(`${WA_VACATION_TRACK}-order`);
const allSource = requestSource + motionSource + orderSource;

// The deletion request is not a court filing, and it says so.
ok(/THIS IS NOT A COURT FILING/.test(requestSource), "The deletion request does not say on its face that it is not a court filing.");
ok(/\{\{waNotAFilingStatement\}\}/.test(requestSource), "The deletion request carries no not-a-filing statement.");
ok(!/Case No\.|Cause No\.|No\. \{\{waCauseNumber\}\}/.test(requestSource), "The deletion request carries a cause number.");
ok(/\{\{waFingerprintCardStatement\}\}/.test(requestSource), "The deletion request does not distinguish itself from the fingerprint-card review.");
ok(/\{\{waConditionsStatement\}\}/.test(requestSource), "The deletion request does not state the refusal-ground conditions on its face.");
ok(/RCW 10\.97\.110/.test(requestSource), "The deletion request never names the RCW 10.97.110 challenge route.");
const requestTemplate = pleadingTemplate(`${WA_DELETION_TRACK}-request`);
ok(
  typeof requestTemplate.verification === "string" && requestTemplate.verification.length > 40,
  "The deletion request carries no verification."
);
ok(
  !/notariz/i.test(requestTemplate.verification) || /if the office you send it to asks/.test(requestTemplate.verification),
  "The deletion request's verification asserts a notarization requirement the section does not impose."
);

// The vacation motion says it is not a pattern form, and that relief is discretionary.
ok(/\{\{waNoPatternFormStatement\}\}/.test(motionSource), "The vacation motion carries no pattern-form statement.");
ok(/\{\{waDiscretionStatement\}\}/.test(motionSource), "The vacation motion does not record that relief is discretionary.");
ok(/\{\{waLocalRuleStatement\}\}/.test(motionSource), "The vacation motion does not send the participant to their own clerk on local requirements.");
ok(/\{\{waFirearmStatement\}\}/.test(motionSource) && /\{\{waFirearmStatement\}\}/.test(requestSource), "A document omits the firearm-rights boundary.");

// The proposed order is proposed, unmarked and unsigned.
ok(/proposed order/i.test(orderSource), "The order does not say it is proposed.");
ok(/granted by nobody and signed by nobody/.test(orderSource), "The order does not say it has been granted and signed by nobody.");
ok(/\(  \)/.test(orderSource), "The order has no unmarked finding box.");
ok(!/\(x\)|\(X\)|\[x\]|\[X\]/.test(orderSource), "The order carries a marked finding box.");
ok(/JUDGE \/ COURT COMMISSIONER/.test(orderSource) && /Dated: _/.test(orderSource), "The order does not leave the judicial signature and date blank.");
ok(pleadingTemplate(`${WA_VACATION_TRACK}-order`).signatureLabel === null, "The proposed order carries a participant signature rule.");
ok(
  (pleadingTemplate(`${WA_VACATION_TRACK}-order`).verification ?? "") === "",
  "The proposed order carries a verification, which belongs to a document the participant signs."
);
ok(/RCW 9\.95\.240\(2\)\(b\)/.test(orderSource), "The proposed order carries no subsection (2)(b) transmittal direction.");
ok(
  /Washington State Patrol identification section/.test(orderSource) && /local police agency/.test(orderSource),
  "The proposed order's transmittal direction does not name both recipients the subsection names."
);

// No amount anywhere, and no claim the split-out route exists here.
ok(!/\$\s?\d/.test(allSource), "A Washington document prints a money amount.");
ok(
  !/certificate of restoration|RCW 9\.97/i.test(allSource),
  "A document mentions the split-out certificate-of-restoration route."
);
note(
  "2. Design boundaries: the deletion request says on its face that it is not a court filing, carries no cause number, states the three common refusal grounds, distinguishes itself from the fingerprint-card review and names the RCW 10.97.110 challenge route; the vacation motion says no pattern form exists, that relief is discretionary, and sends the participant to their own clerk on county requirements; the proposed order is marked proposed, carries only unmarked boxes, leaves the judicial signature and date blank and carries the subsection (2)(b) transmittal direction to both named recipients; no document prints an amount or mentions the split-out certificate route."
);

// ---------------------------------------------------------------------------
// 3. Fixtures
// ---------------------------------------------------------------------------

const deletionBase = (overrides = {}) => ({
  applicantName: "Perpetua Nakamura-Oyelowo",
  dateOfBirth: "22 October 1990",
  arrestDetails: "Seattle Police Department, arrested 3 March 2021, incident number 2021-084417",
  dispositionDetail: "All charges dismissed on 19 August 2021",
  deferredProsecution: "no",
  priorConvictions: "no",
  interveningArrests: "no",
  fugitiveOrActive: "no",
  ...overrides
});

const vacationBase = (overrides = {}) => ({
  applicantName: "Cornelius Baptiste-Yarwood",
  dateOfBirth: "8 April 1958",
  convictionIdentity: "Second degree burglary, RCW 9A.52.030",
  sentencingCourt: "Superior Court of Washington for Pierce County",
  causeNumber: "82-1-00417-3",
  sentencingDates: "Sentenced 14 September 1982",
  pendingCharges: "no",
  newConvictions: "no",
  probationFulfilled: "yes",
  probationEndDate: "14 September 1987",
  offenseBefore1984: "no",
  maximumPunishmentPeriod: "yes",
  pleaOrVerdict: "plea",
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "wa-deletion-dismissed-1",
    trackId: WA_DELETION_TRACK,
    expectedComponents: 1,
    expectedRoles: "primary_filing",
    answers: deletionBase()
  },
  {
    fixtureId: "wa-vacation-subsection-one-1",
    trackId: WA_VACATION_TRACK,
    expectedComponents: 2,
    expectedRoles: "primary_filing,proposed_order",
    expectedLimb: "subsection_one",
    answers: vacationBase()
  },
  {
    fixtureId: "wa-vacation-subsection-two-pre-1984-2",
    trackId: WA_VACATION_TRACK,
    variantOf: "wa-vacation-subsection-one-1",
    variantPurpose:
      "The two limbs of RCW 9.95.240 ask the Court for different things and produce different orders: subsection (1) asks leave to withdraw a plea and to dismiss the information, while subsection (2)(a) applies for vacation under RCW 9.94A.640 by the pre-1 July 1984 equivalence. The limb statement, the probation paragraph and the prayer all change, and the limb is derived from the answers rather than asked.",
    materialBranch: "which limb of RCW 9.95.240 the answers put the case on",
    expectedComponents: 2,
    expectedRoles: "primary_filing,proposed_order",
    expectedLimb: "subsection_two",
    answers: vacationBase({
      offenseBefore1984: "yes",
      maximumPunishmentPeriod: "no",
      probationFulfilled: "yes",
      sentencingDates: "Sentenced 2 February 1983"
    })
  },
  {
    fixtureId: "wa-vacation-verdict-2",
    trackId: WA_VACATION_TRACK,
    variantOf: "wa-vacation-subsection-one-1",
    variantPurpose:
      "Subsection (1) asks leave to withdraw a plea of guilty, or to set aside a verdict. Which of the two the motion asks for is operative text in both the limb statement and the prayer, and asking to withdraw a plea in a case tried to verdict would ask the Court to undo something that never happened.",
    materialBranch: "plea versus verdict, in the subsection (1) prayer",
    expectedComponents: 2,
    expectedRoles: "primary_filing,proposed_order",
    expectedLimb: "subsection_one",
    answers: vacationBase({ pleaOrVerdict: "verdict" })
  }
];

function fixtureFor(trackId) {
  return FIXTURES.find((f) => f.trackId === trackId && !f.variantOf).answers;
}

const canonicalCount = FIXTURES.filter((f) => !f.variantOf).length;
ok(canonicalCount === 2, `There are ${canonicalCount} canonical fixtures rather than one per assigned track.`);
for (const fixture of FIXTURES.filter((f) => f.variantOf)) {
  ok(
    typeof fixture.variantPurpose === "string" && fixture.variantPurpose.length > 80,
    `${fixture.fixtureId}: the variant does not state its purpose.`
  );
  ok(typeof fixture.materialBranch === "string" && fixture.materialBranch.length > 0, `${fixture.fixtureId}: no material branch named.`);
  ok(FIXTURES.some((f) => f.fixtureId === fixture.variantOf), `${fixture.fixtureId}: names a canonical fixture that does not exist.`);
}

// 2b. The limb is derived from the declared answers, never asked.
const declaredVacationInputs = WA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === WA_VACATION_TRACK).requiredInputs.map(
  (i) => i.key
);
ok(
  !declaredVacationInputs.includes("vacationLimb"),
  "The module declares a which-limb input the design does not ask for."
);
ok(
  declaredVacationInputs.length === WA_TRACK_INPUT_KEYS[WA_VACATION_TRACK].length &&
    WA_TRACK_INPUT_KEYS[WA_VACATION_TRACK].every((k) => declaredVacationInputs.includes(k)),
  "The declared vacation inputs and the echoed keys have drifted apart."
);
for (const fixture of FIXTURES.filter((f) => f.expectedLimb)) {
  const facts = deriveWashingtonFacts(fixture.trackId, fixture.answers);
  ok(
    facts.waLimb === fixture.expectedLimb,
    `${fixture.fixtureId}: the module derived ${facts.waLimb} where the design's tests give ${fixture.expectedLimb}.`
  );
}
note(
  "2b. Route boundaries: the RCW 9.95.240 limb is derived from the answers the design declares rather than added as a question of its own, and each fixture lands on the limb the section's own tests give it."
);

// ---------------------------------------------------------------------------
// 4. Negative cases
// ---------------------------------------------------------------------------

const NEGATIVE_CASES = [
  [WA_DELETION_TRACK, { deferredProsecution: "yes" }, "wa-10-97-060-deferred-prosecution"],
  [WA_DELETION_TRACK, { priorConvictions: "yes" }, "wa-10-97-060-prior-conviction"],
  [WA_DELETION_TRACK, { interveningArrests: "yes" }, "wa-10-97-060-intervening-arrest"],
  [WA_DELETION_TRACK, { fugitiveOrActive: "yes" }, "wa-10-97-060-fugitive-or-active"],
  [WA_DELETION_TRACK, { arrestDetails: "" }, "wa-answer-missing"],
  [WA_VACATION_TRACK, { pendingCharges: "yes" }, "wa-9-95-240-pending-charge"],
  [WA_VACATION_TRACK, { newConvictions: "yes" }, "wa-9-95-240-new-conviction"],
  // Both limbs open: a legal choice the packet does not make.
  [WA_VACATION_TRACK, { offenseBefore1984: "yes" }, "wa-9-95-240-limb-not-established"],
  // Neither limb open.
  [WA_VACATION_TRACK, { maximumPunishmentPeriod: "no" }, "wa-9-95-240-limb-not-established"],
  [WA_VACATION_TRACK, { probationFulfilled: "unsure" }, "wa-9-95-240-limb-not-established"],
  // The limb stated explicitly, then contradicted by the answers.
  [
    WA_VACATION_TRACK,
    { vacationLimb: "subsection_two", offenseBefore1984: "no" },
    "wa-9-95-240-offence-date-not-established"
  ],
  [
    WA_VACATION_TRACK,
    { vacationLimb: "subsection_one", probationFulfilled: "no" },
    "wa-9-95-240-probation-not-fulfilled"
  ],
  [
    WA_VACATION_TRACK,
    { vacationLimb: "subsection_one", maximumPunishmentPeriod: "no" },
    "wa-9-95-240-maximum-period-expired"
  ],
  [
    WA_VACATION_TRACK,
    { vacationLimb: "subsection_one", pleaOrVerdict: "unsure" },
    "wa-9-95-240-plea-or-verdict-not-established"
  ],
  [WA_VACATION_TRACK, { causeNumber: "" }, "wa-answer-missing"]
];

const seenStops = new Set();
for (const [trackId, override, expectedStop] of NEGATIVE_CASES) {
  let thrown = null;
  try {
    deriveWashingtonFacts(trackId, { ...fixtureFor(trackId), ...override });
  } catch (error) {
    thrown = error;
  }
  ok(thrown instanceof WashingtonEligibilityStopError, `${trackId} ${JSON.stringify(override)}: did not fail closed.`);
  if (!(thrown instanceof WashingtonEligibilityStopError)) continue;
  ok(thrown.stopId === expectedStop, `${trackId} ${JSON.stringify(override)}: stopped as ${thrown.stopId} rather than ${expectedStop}.`);
  ok(thrown.message.length > 80, `${thrown.stopId}: the stop gives no reason.`);
  ok(typeof thrown.destination === "string" && thrown.destination.length > 20, `${thrown.stopId}: no destination.`);
  ok(typeof thrown.nextStep === "string" && thrown.nextStep.length > 20, `${thrown.stopId}: no next step.`);
  ok(WA_REFERRALS.includes(thrown.destination), `${thrown.stopId}: the destination is not a declared referral.`);
  ok(
    !thrown.destination.includes(trackId) && !thrown.nextStep.includes(trackId),
    `${thrown.stopId}: routes back to its own track as the solution.`
  );
  seenStops.add(thrown.stopId);
}
// 12 = 4 WSP refusal grounds + the missing-answer stop + 2 shared vacation
// screens (pending charge, new conviction) + the limb stop + the offence-date,
// probation, maximum-period and plea-or-verdict stops.
ok(seenStops.size === 12, `${seenStops.size} distinct typed stops fired rather than the 12 the design declares.`);

let branchRejections = 0;
for (const [trackId, key] of [
  [WA_DELETION_TRACK, "deferredProsecution"],
  [WA_VACATION_TRACK, "pendingCharges"],
  [WA_VACATION_TRACK, "probationFulfilled"],
  [WA_VACATION_TRACK, "pleaOrVerdict"],
  [WA_VACATION_TRACK, "vacationLimb"]
]) {
  try {
    deriveWashingtonFacts(trackId, { ...fixtureFor(trackId), [key]: "possibly" });
    ok(false, `${key}: an out-of-list answer was accepted.`);
  } catch (error) {
    ok(error instanceof WashingtonBranchError, `${key}: an out-of-list answer produced ${error?.name}.`);
    branchRejections += 1;
  }
}
ok(
  Object.keys(WA_YES_NO).length === 2 &&
    Object.keys(WA_YES_NO_UNSURE).length === 3 &&
    Object.keys(WA_VACATION_LIMBS).length === 3 &&
    Object.keys(WA_PLEA_OR_VERDICT).length === 3,
  "A closed list changed size."
);

try {
  deriveWashingtonFacts(WA_EXCLUDED_TRACK_ID, {});
  ok(false, "The split-out certificate track was accepted by the fact deriver.");
} catch (error) {
  ok(error instanceof WashingtonBranchError, "The split-out track produced the wrong error.");
}

note(
  `4. Stops: ${NEGATIVE_CASES.length} negative cases fail closed across ${seenStops.size} typed-stop families, each carrying a reason, a named destination and a next step, and none routing back to its own track; ${branchRejections} out-of-list branch values rejected; four closed lists hold their size; and the split-out certificate track is refused outright.`
);

// ---------------------------------------------------------------------------
// 5. Rendered content, read page by page
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/will be granted|you are eligible|you will succeed|is entitled to relief/i, "a prediction or an eligibility assertion"],
  [/we have (reviewed|verified|confirmed)/i, "a claim that LegalEase reviewed or verified records"],
  [/on your behalf we (filed|served|sent)/i, "a claim that LegalEase filed, served or sent"],
  [/the (prosecuting attorney|prosecutor) (has agreed|does not object|will not oppose)/i, "an assertion about the prosecuting attorney's position"],
  [/your record (is|will be) clear\b/i, "a promise about the result"],
  [/the (court|judge) (has )?(found|ordered|granted)/i, "a claim that the court has acted"],
  [/the (Patrol|State Patrol|agency) (has )?(deleted|removed|approved|processed)/i, "a claim that the agency has acted"],
  [/a hearing (was|has been) (held|scheduled)/i, "a claim about a hearing"]
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
  const facts = deriveWashingtonFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "WA",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);
  ok(
    resolved.components.length === fixture.expectedComponents,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than ${fixture.expectedComponents}.`
  );

  const echoedKeys = new Set(WA_TRACK_INPUT_KEYS[fixture.trackId] ?? []);
  for (const [key, value] of Object.entries(facts)) {
    if (typeof value !== "string" || echoedKeys.has(key) || key === "waLimb") continue;
    ok(
      !/\bundefined\b|\bNaN\b|\[object Object\]|\{\{|^\s*(true|false)\s*$/.test(value),
      `${fixture.fixtureId}: derived fact ${key} carries a leaked placeholder or a raw boolean: ${value}`
    );
  }

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "WA",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "WA",
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

    const allText = pages.flat().join(" ");
    ok(allText.includes(facts.waApplicantName), `${fixture.fixtureId}: the participant's name is not carried through.`);
    if (fixture.trackId === WA_VACATION_TRACK) {
      ok(allText.includes(facts.waCauseNumber), `${fixture.fixtureId}: the cause number is not carried through.`);
      ok(
        pages[0].join(" ").toUpperCase().includes(facts.waCourtName.toUpperCase().slice(0, 20)),
        `${fixture.fixtureId}: the caption does not name ${facts.waCourtName}.`
      );
    } else {
      ok(!/Cause No\.|Case No\./.test(allText), `${fixture.fixtureId}: the agency request prints a cause number.`);
    }

    renderedComponents += 1;
    inspectedPages += pages.length;
    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
  }

  ok(
    assemblyComponents.map((c) => c.role).join(",") === fixture.expectedRoles,
    `${fixture.fixtureId}: the assembled role order is ${assemblyComponents.map((c) => c.role).join(",")}.`
  );

  // The proposed order never carries the participant's execution block.
  const orderComponent = assemblyComponents.find((c) => c.role === "proposed_order");
  if (orderComponent) {
    const orderText = renderedPages(orderComponent.bytes).flat().join(" ");
    ok(!/Defendant, self-represented/.test(orderText), `${fixture.fixtureId}: the proposed order carries the participant's signature rule.`);
  }

  const assembled = await assemblePacketPdf({
    jurisdiction: "WA",
    jurisdictionName: "Washington",
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
  `5. Rendering: ${renderedComponents} components across ${results.length} packets render deterministically as PDFs; ${inspectedPages} pages read line by line with no blank page, no stranded heading, no paragraph rendered twice, no leaked placeholder and no prohibited content; the vacation packets carry the participant's own court and cause number and the agency request carries neither; and no proposed order carries a participant execution block.`
);

// ---------------------------------------------------------------------------
// 6. Values carried through
// ---------------------------------------------------------------------------

const canonicalVacation = results.find((r) => r.fixtureId === "wa-vacation-subsection-one-1");
for (const variantId of ["wa-vacation-subsection-two-pre-1984-2", "wa-vacation-verdict-2"]) {
  const variant = results.find((r) => r.fixtureId === variantId);
  ok(
    canonicalVacation.sha256 !== variant.sha256,
    `${variantId} assembles to the same bytes as its canonical fixture, so it tests nothing.`
  );
}

const subOne = deriveWashingtonFacts(WA_VACATION_TRACK, fixtureFor(WA_VACATION_TRACK));
const subTwo = deriveWashingtonFacts(
  WA_VACATION_TRACK,
  FIXTURES.find((f) => f.fixtureId === "wa-vacation-subsection-two-pre-1984-2").answers
);
ok(/withdraw the plea of guilty/.test(subOne.waReliefRequested), "The subsection (1) prayer does not ask to withdraw the plea.");
ok(/enter a plea of not guilty/.test(subOne.waReliefRequested), "The subsection (1) prayer does not ask to enter a plea of not guilty.");
ok(/dismissing the information or indictment/.test(subOne.waReliefRequested), "The subsection (1) prayer does not ask for dismissal.");
ok(/vacate the record of conviction/.test(subTwo.waReliefRequested), "The subsection (2)(a) prayer does not ask for vacation.");
ok(!/withdraw/.test(subTwo.waReliefRequested), "The subsection (2)(a) prayer asks to withdraw a plea, which is the other limb's relief.");
ok(
  /pleaded and proved in any subsequent prosecution/.test(subOne.waProvisoStatement),
  "The subsection (1) proviso preserving the conviction for pleading and proof is not stated."
);
ok(/before 1 July 1984/.test(subTwo.waLimbStatement), "The subsection (2)(a) limb statement does not state the pre-1984 equivalence.");

const verdictFacts = deriveWashingtonFacts(
  WA_VACATION_TRACK,
  FIXTURES.find((f) => f.fixtureId === "wa-vacation-verdict-2").answers
);
// A verdict is set aside; a plea is withdrawn. Asking to "withdraw a verdict"
// asks the Court to undo something that never happened.
ok(
  /set aside the verdict/.test(verdictFacts.waLimbStatement) && /set aside the verdict/.test(verdictFacts.waReliefRequested),
  "The verdict branch does not ask the Court to set aside the verdict."
);
ok(
  !/withdraw/.test(verdictFacts.waLimbStatement) && !/withdraw/.test(verdictFacts.waReliefRequested),
  "The verdict branch asks to withdraw something, which is what happens to a plea."
);
ok(
  !/enter a plea of not guilty/.test(verdictFacts.waReliefRequested),
  "The verdict branch asks to enter a plea of not guilty, which follows only a plea."
);
ok(
  /withdraw the plea of guilty/.test(subOne.waReliefRequested) && !/set aside/.test(subOne.waReliefRequested),
  "The plea branch does not ask to withdraw the plea, or wrongly asks to set aside a verdict."
);

// The participant's own account is carried through verbatim.
const delFacts = deriveWashingtonFacts(WA_DELETION_TRACK, fixtureFor(WA_DELETION_TRACK));
ok(
  delFacts.waArrestStatement.includes(fixtureFor(WA_DELETION_TRACK).arrestDetails),
  "The requester's account of the arrest is not carried through verbatim."
);
ok(
  delFacts.waDispositionStatement.includes(fixtureFor(WA_DELETION_TRACK).dispositionDetail),
  "The requester's account of the disposition is not carried through verbatim."
);

// No yes-or-no answer reaches a sentence as a bare word.
for (const trackId of WA_ASSIGNED_TRACK_IDS) {
  const facts = deriveWashingtonFacts(trackId, fixtureFor(trackId));
  const echoed = new Set(WA_TRACK_INPUT_KEYS[trackId] ?? []);
  for (const [key, value] of Object.entries(facts)) {
    if (echoed.has(key) || key === "waLimb") continue;
    ok(
      typeof value !== "string" || !/^\s*(yes|no|unsure|plea|verdict)\s*$/i.test(value),
      `${trackId}: an answer reached the fact ${key} as a bare word.`
    );
  }
}

note(
  "6. Values: each limb's prayer asks for its own relief and neither asks for the other's; the subsection (1) proviso preserving the conviction for pleading and proof is stated; the verdict branch does not ask to enter a plea of not guilty; the requester's account of the arrest and the disposition is carried through verbatim; both variants assemble to different bytes from their canonical fixture; and no answer reaches a sentence as a bare word."
);

// ---------------------------------------------------------------------------
// 7. Runtime
// ---------------------------------------------------------------------------

for (const track of WA_CUSTOM_PLEADING_TRACKS) {
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
  console.error("Washington custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Washington custom-pleading verification passed.");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
const width = Math.max(...results.map((r) => r.fixtureId.length));
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(width)}  ${result.trackId.padEnd(30)} ${result.sampleRole.padEnd(9)}  ${result.components} components  ${String(result.pages).padStart(2)} pages  sha256=${result.sha256}`
  );
}
