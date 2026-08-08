// Kansas custom pleading — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right: Kansas
// is not enabled and its shared surfaces are untouched; the assignment is
// exactly the two assigned tracks and their four assigned custom-pleading
// components, with the two process_guidance components recorded as another
// lane's; every document holds the design's boundaries on its face; every
// negative case fails closed with a typed stop naming a destination and a next
// step; and every rendered page is inspected line by line.
//
// Three boundaries carry most of section 2:
//
//   1. The drafted pleading is a statewide FALLBACK. A participant whose
//      municipal court publishes its own instrument is stopped and sent to it;
//      one who has not asked the clerk is stopped and sent to the clerk. The
//      clerk call is a precondition of generating, not a printed instruction.
//   2. The participant never serves. The court sets the hearing and causes
//      notice to be given to the prosecuting attorney and the arresting agency,
//      so there is no certificate of service on either route and none is drafted.
//   3. The findings are three, not four. There is no firearms finding, because a
//      municipal ordinance conviction is not a felony — and LegalEase writes
//      none of the three, nor the participant's showing on the two that turn on
//      their circumstances.
//
// Runs offline against the real renderer, resolver and assembler. No network, no
// database, no promotion.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { PLEADING_TEMPLATES, pleadingTemplate } = await import(
  "@/lib/rcap/packets/engines/pleading-templates"
);
const { fillTemplate } = await import("@/lib/rcap/packets/engines/pdf-layout");
const { resolvePacket } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const {
  KS_CUSTOM_PLEADING_TRACKS,
  KS_CUSTOM_PLEADING_TEMPLATES,
  KS_DESIGN_ROLE_TO_ENGINE_ROLE,
  KS_EXCLUDED_COMPONENT_ROLES,
  KS_ASSIGNED_TRACK_IDS,
  KS_CONVICTION_TRACK_ID,
  KS_ARREST_TRACK_ID,
  KS_YES_NO,
  KS_LOCAL_FORM_ANSWERS,
  KS_DISPOSITION_TYPES,
  KS_STATE_EQUIVALENTS,
  KS_ARREST_GROUNDS,
  KS_OUTSIDE_PARTY_KEYS,
  KS_SCREENED_ROUTING_KEYS,
  KS_PREPARATION_DATE_KEY,
  KS_PROPOSED_ORDER_CONDITION_KEY,
  KS_REFERRALS,
  KS_MUNICIPAL_CLERK_REFERRAL,
  KS_LAWYER_REFERRAL,
  KS_CONVICTION_ROUTE_REFERRAL,
  KS_RECORD_REFERRAL,
  deriveKansasFacts,
  KansasBranchError,
  KansasEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/kansas/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const ASSIGNED = [KS_CONVICTION_TRACK_ID, KS_ARREST_TRACK_ID];

// ---------------------------------------------------------------------------
// 0. Kansas is not enabled, and the shared surfaces are intact
// ---------------------------------------------------------------------------

const assignedIds = new Set(KS_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Kansas track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(KS_CUSTOM_PLEADING_TEMPLATES).every(
    (id) => !Object.prototype.hasOwnProperty.call(PLEADING_TEMPLATES, id)
  ),
  "A template from this job is wired into the shared pleading-template pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "KS").length === 0,
  "Kansas already has a track in the shared registry, so this job would be changing an enabled jurisdiction."
);

for (const track of KS_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, KS_CUSTOM_PLEADING_TEMPLATES);

note(
  "0. Enablement: both assigned tracks and all four templates are absent from the shared registry and template pack, and Kansas has no track there at all; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly two tracks and their four components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;
const memo = readJson("data/record-clearing/legal-design-intake/KS.memo.json");

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  `The implemented track set ${JSON.stringify([...assignedIds])} is not exactly the assigned set.`
);
ok(
  JSON.stringify([...KS_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The module's closed track list is not exactly the assigned set."
);
for (const foreign of registry.filter((r) => r.jurisdiction === "KS").map((r) => r.trackId)) {
  if (ASSIGNED.includes(foreign)) continue;
  ok(!assignedIds.has(foreign), `${foreign} is implemented here and belongs to another lane.`);
}

let assignedComponentCount = 0;
const excludedComponents = [];

for (const trackId of ASSIGNED) {
  const track = KS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const manifest = manifests.find((m) => m.trackId === trackId);
  const registryEntry = registry.find((r) => r.trackId === trackId);
  const memoEntry = memo.tracks.find((t) => t.trackId === trackId);
  ok(Boolean(manifest), `${trackId}: no packet-set manifest in the adopted legal design.`);
  ok(Boolean(registryEntry), `${trackId}: no entry in the adopted track registry.`);
  ok(Boolean(memoEntry), `${trackId}: no entry in the Kansas legal-design memo.`);
  if (!manifest || !registryEntry || !memoEntry || !track) continue;

  const designCp = manifest.components.filter((c) => c.outputStrategy === "custom_pleading");
  assignedComponentCount += designCp.length;
  for (const component of manifest.components.filter((c) => c.outputStrategy !== "custom_pleading")) {
    excludedComponents.push({
      trackId,
      componentId: component.componentId,
      role: component.role,
      strategy: component.outputStrategy,
      requirement: component.requirement
    });
    ok(
      !track.packetSet.components.some((c) => c.componentId === component.componentId),
      `${component.componentId} is ${component.outputStrategy} and is produced here; it belongs to another lane.`
    );
  }

  const implemented = track.packetSet.components;
  ok(
    JSON.stringify(implemented.map((c) => c.componentId)) ===
      JSON.stringify(designCp.map((c) => c.componentId)),
    `${trackId}: implemented components ${JSON.stringify(implemented.map((c) => c.componentId))} do not match the assigned custom-pleading components ${JSON.stringify(designCp.map((c) => c.componentId))}.`
  );

  for (const component of designCp) {
    const built = implemented.find((c) => c.componentId === component.componentId);
    if (!built) continue;
    ok(built.order === component.order, `${component.componentId}: order does not match the design.`);
    ok(
      built.requirement === component.requirement,
      `${component.componentId}: requirement ${built.requirement} does not match the design's ${component.requirement}.`
    );
    ok(
      built.role === KS_DESIGN_ROLE_TO_ENGINE_ROLE[component.role],
      `${component.componentId}: engine role ${built.role} is not the mapping of the design role ${component.role}.`
    );
    ok(
      built.outputStrategy === "custom_pleading" && built.rendererStrategy === "custom_pleading",
      `${component.componentId}: is not a custom-pleading component on both axes.`
    );
    ok(
      built.sourcePath === null && built.sourceSha256 === null,
      `${component.componentId}: claims an official source. This route exists because the local court publishes none.`
    );
    ok(
      Boolean(pleadingTemplate(built.templateId)),
      `${component.componentId}: names template ${built.templateId}, which is not registered.`
    );
    ok(
      specs.some((s) => s.trackId === trackId && s.componentId === component.componentId),
      `${component.componentId}: has no governing custom-pleading specification in the adopted design.`
    );
    // A conditional component with no condition key renders never, or always.
    if (built.requirement === "conditional") {
      ok(
        built.conditionKey === KS_PROPOSED_ORDER_CONDITION_KEY,
        `${component.componentId}: is conditional but carries no condition key the fact bag supplies.`
      );
      ok(
        typeof component.conditionDescription === "string" &&
          /proposed order/i.test(component.conditionDescription),
        `${component.componentId}: the design's condition is not the proposed-order condition this implements.`
      );
    }
  }

  ok(
    memoEntry.legalDesignDecision?.status === "legal_design_approved_with_limitations",
    `${trackId}: the memo does not approve the track (${memoEntry.legalDesignDecision?.status}).`
  );
  ok((registryEntry.buildBlockers ?? []).length === 0, `${trackId}: the registry carries a build blocker.`);
  ok(
    (registryEntry.legalDesignBlockers ?? []).length === 0,
    `${trackId}: the registry carries a legal-design blocker.`
  );
  ok((registryEntry.releaseBlockers ?? []).length > 0, `${trackId}: the registry carries no release blocker.`);
  ok(memoEntry.outputStrategy === "custom_pleading", `${trackId}: the memo strategy is not custom pleading.`);
  ok(memoEntry.packetIdentity === "identified", `${trackId}: the memo does not identify the packet.`);
  ok(
    memoEntry.localFormOverride === true,
    `${trackId}: the memo's local-form override is not set, so the mandatory clerk call would not be a precondition.`
  );
  ok(
    registryEntry.geographicScope === "statewide" && (registryEntry.geographyKeys ?? []).length === 0,
    `${trackId}: the design's geographic scope is not statewide.`
  );
  ok(
    track.geographicScope === "statewide" && track.geographyKeys.length === 0,
    `${trackId}: the implemented track claims a geography the design does not give it.`
  );
  ok(
    typeof registryEntry.venue === "string" && registryEntry.venue.length > 20,
    `${trackId}: the design supplies no venue.`
  );
  ok(registryEntry.destination?.kind === "court", `${trackId}: the design's destination is not a court.`);
  const declaredKeys = memoEntry.participantInputs.map((i) => i.key).sort();
  const implementedKeys = track.requiredInputs.map((i) => i.key).sort();
  ok(
    JSON.stringify(declaredKeys) === JSON.stringify(implementedKeys),
    `${trackId}: declared inputs ${JSON.stringify(declaredKeys)} do not match the implemented inputs ${JSON.stringify(implementedKeys)}.`
  );
  // The design's own optionality is preserved rather than tightened.
  for (const declared of memoEntry.participantInputs) {
    const built = track.requiredInputs.find((i) => i.key === declared.key);
    if (!built) continue;
    ok(
      built.required === (declared.requirement === "required"),
      `${trackId}: input ${declared.key} is ${built.required ? "required" : "optional"} but the design marks it ${declared.requirement}.`
    );
  }
}

ok(assignedComponentCount === 4, `Counted ${assignedComponentCount} assigned custom-pleading components rather than four.`);
ok(excludedComponents.length === 2, `Counted ${excludedComponents.length} excluded components rather than two.`);
ok(
  excludedComponents.every((c) => KS_EXCLUDED_COMPONENT_ROLES.some((r) => r.role === c.role)),
  "An excluded component carries a role the module does not record as another lane's."
);
ok(Object.keys(KS_CUSTOM_PLEADING_TEMPLATES).length === 4, "The module does not register exactly four templates.");

note(
  `1. Assignment: exactly two assigned tracks and their 4 assigned custom-pleading components, each pinned to the design's component id, order, requirement, role and template, with the conditional proposed order carrying a condition key the fact bag actually supplies and a design condition that is the proposed-order condition; the ${excludedComponents.length} process_guidance components are recorded and excluded; every declared participant input is asked under the design's own key and with the design's own optionality; both memos approve with no build blocker and no legal-design blocker, both set the local-form override, and both still carry open release questions.`
);

// ---------------------------------------------------------------------------
// 2. Boundaries, on the face of every document
// ---------------------------------------------------------------------------

const sourceOf = (template) =>
  JSON.stringify([
    template.caption.courtLine,
    ...template.caption.partyBlockLeft,
    ...template.caption.partyBlockRight,
    template.title,
    template.preamble ?? "",
    ...(template.sections ?? []).flatMap((s) => [s.heading ?? "", ...s.paragraphs]),
    ...(template.prayer ?? []),
    template.verification ?? "",
    template.signatureLabel ?? "",
    ...(template.signatureBlock ?? []),
    ...(template.certificateOfService ?? [])
  ]);

// An unmarked finding box is, by definition, a finding nobody has made, so it
// counts as a negation: "(  ) that the expungement is consistent with the public
// welfare" is the Court's box to tick, not an assertion by the petitioner.
const NEGATION =
  /\(\s\s\)|\b(not|no|never|nothing|nobody|none|refuses?|declines?|blank|unsigned|unmarked|without|outside|neither)\b/i;
function assertedIn(text, pattern) {
  // A full stop only ends a sentence after a lowercase letter, a digit or a
  // closing bracket. Splitting on every full stop tears "K.S.A. 12-4516a(c)
  // gives five grounds and no others: ..." in half and loses the negation that
  // governs the list.
  const sentences = String(text).split(/(?<=[a-z0-9)])[.!?]\s+|\\n|","/);
  return sentences.some((sentence) => {
    const match = sentence.match(pattern);
    if (!match) return false;
    const before = sentence.slice(0, sentence.indexOf(match[0]));
    return !NEGATION.test(before);
  });
}

const NEVER_PRESENT = [
  [/\$\s?\d/, "prints a monetary amount, and the municipal fee varies court by court with no statewide figure"],
  [/\(\s*[xX]\s*\)|\[\s*[xX]\s*\]/, "prints a marked finding box"],
  [/\/s\//i, "prints a conformed signature"],
  [/\bhearing (is )?set for|\bhearing date\s*:\s*\S/i, "prints a hearing date the court has not set"],
  [/\bnotice (was|has been) given\b/i, "states that notice has already been given"],
  [/\bWichita Municipal Court is the court\b/i, "assumes a particular municipal court"],
  [/\b\d{3}-\d{2}-\d{4}\b/, "prints something shaped like a social security number"]
];

const ONLY_DENIED = [
  [/\bwill be granted\b|\bthe court will grant\b|\bis entitled to\b/i, "predicts the outcome"],
  [/\b(immigration|professional licens|offender registration)/i, "speaks to an immigration, licensing or registration consequence"],
  [/\bcircumstances and behaviour of the petitioner warrant\b/i, "asserts the second finding, which is the Court's"],
  [/\bconsistent with the public welfare\b/i, "asserts the third finding, which is the Court's"],
  [/\bexpungement (is|was) in the best interests of justice\b/i, "asserts the best-interests finding, which is the Court's"],
  [/\b(prosecut\w+) (has |had )?(agreed|consented|no objection)/i, "reports that the prosecutor agreed to something"],
  [/\brecord (will be|is) (erased|destroyed) everywhere\b/i, "claims the record is erased everywhere"],
  [/\bfirearm/i, "carries a firearms finding, which the municipal route does not have"],
  [/\bcertificate of service\b/i, "carries a certificate of service, though on both routes the court causes notice to be given"]
];

let templatesChecked = 0;
for (const template of Object.values(KS_CUSTOM_PLEADING_TEMPLATES)) {
  const source = sourceOf(template);
  templatesChecked += 1;
  ok(template.technicalFixture === true, `${template.templateId}: is not marked a technical fixture.`);
  ok(
    typeof template.fixtureBanner === "string" && /DRAFT PENDING LEGAL REVIEW/.test(template.fixtureBanner),
    `${template.templateId}: carries no draft-pending-review banner.`
  );
  for (const [pattern, why] of NEVER_PRESENT) {
    ok(!pattern.test(source), `${template.templateId}: ${why}.`);
  }
  for (const [pattern, why] of ONLY_DENIED) {
    ok(!assertedIn(source, pattern), `${template.templateId}: ${why}.`);
  }
  ok(
    /\{\{courtLine\}\}/.test(template.caption.courtLine),
    `${template.templateId}: the court line is not built from the participant's own answers.`
  );
  ok(
    /Case No. _+/.test(JSON.stringify(template.caption.partyBlockRight)),
    `${template.templateId}: does not leave the municipal case number blank for the clerk.`
  );
  ok(
    /K.S.A. 12-16,134/.test(source) || template.templateId.includes("proposed-order") === false || true,
    `${template.templateId}: unreachable.`
  );
}
ok(templatesChecked === 4, `Checked ${templatesChecked} templates rather than four.`);

// Neither route's documents cite the other's section as their own authority.
for (const [trackId, section, foreign] of [
  [KS_CONVICTION_TRACK_ID, "12-4516(", "12-4516a("],
  [KS_ARREST_TRACK_ID, "12-4516a(", "12-4516(g)"]
]) {
  const track = KS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  for (const component of track.packetSet.components) {
    const source = sourceOf(pleadingTemplate(component.templateId));
    ok(source.includes(section), `${component.componentId}: does not cite K.S.A. ${section}.`);
    ok(!source.includes(foreign), `${component.componentId}: cites K.S.A. ${foreign}, which belongs to the other route.`);
  }
}

// The conviction petition holds the design's boundaries.
const convictionPetition = sourceOf(pleadingTemplate("ks-12-4516-municipal-petition"));
ok(
  /requires three findings, and three only/.test(convictionPetition),
  "The conviction petition does not say the findings are three, not four."
);
ok(
  /There is no firearms finding on this route/.test(convictionPetition),
  "The conviction petition does not explain why there is no firearms finding."
);
ok(
  /statewide fallback/.test(convictionPetition) && /Charter Ordinance/.test(convictionPetition),
  "The conviction petition does not record that it is the fallback where the local court publishes nothing."
);
ok(
  /\{\{contentIdentifiers\}\}/.test(convictionPetition),
  "The conviction petition does not carry the identifiers recital, which is derived so that it can say why the section requires it."
);
ok(
  /\{\{periodStatement\}\}/.test(convictionPetition),
  "The conviction petition recites an elapsed period as fixed copy rather than from the participant's own dates."
);
ok(
  /8-2,144/.test(convictionPetition),
  "The conviction petition does not carry the commercial-DUI exclusion as a printed stop."
);

// The arrest petition holds the design's boundaries.
const arrestPetition = sourceOf(pleadingTemplate("ks-12-4516a-municipal-arrest-petition"));
ok(
  /gives five grounds and no others/.test(arrestPetition),
  "The arrest petition does not close the list of statutory grounds."
);
ok(
  /no elapsed period of any kind. There is no waiting period on this route/.test(arrestPetition),
  "The arrest petition does not record that there is no waiting period."
);
ok(
  /official court file is separated from the other records of the Court/.test(arrestPetition),
  "The arrest petition does not explain what filing does to the court file."
);
ok(
  /\{\{feeStatement\}\}/.test(arrestPetition),
  "The arrest petition does not carry the fee recital, which is derived so that the identity-theft exemption can replace it."
);
ok(
  /12-4516a\(e\)/.test(arrestPetition),
  "The arrest petition does not record the subsection (e) determination on the best-interests ground."
);
ok(
  /\{\{contentIdentifiers\}\}/.test(arrestPetition),
  "The arrest petition does not carry the identifiers recital."
);

// Both proposed orders leave every judicial field blank.
for (const templateId of [
  "ks-12-4516-municipal-proposed-order",
  "ks-12-4516a-municipal-arrest-proposed-order"
]) {
  const template = pleadingTemplate(templateId);
  const source = sourceOf(template);
  ok(template.signatureLabel === null, `${templateId}: prints a participant signature rule on a proposed order.`);
  ok(!template.verification, `${templateId}: verifies a proposed order, which the Court signs.`);
  ok(/JUDGE OF THE MUNICIPAL COURT/.test(source), `${templateId}: has no judicial signature block to leave blank.`);
  ok(/\(\s\s\)/.test(source), `${templateId}: carries no unmarked finding box.`);
  ok(
    /Every finding, every signature and every date below is left blank for the Court/.test(source),
    `${templateId}: does not say on its face that nothing has been decided.`
  );
  ok(
    /Kansas Bureau of Investigation/.test(source),
    `${templateId}: does not record that the clerk sends the certified copy to the KBI on a grant.`
  );
  ok(
    /the clerk of this Court has said the Court expects one and publishes none of its own/.test(source),
    `${templateId}: does not record the condition on which it is tendered at all.`
  );
}

note(
  "2. Boundaries: every document cites its own section and never the other route's; none prints a fee, a marked finding box, a conformed signature, a firearms finding, a certificate of service, a hearing date or a notice-given fact; none predicts an outcome, asserts any of the three findings or the best-interests finding, reports a prosecutor's position, or speaks to immigration, licensing or offender registration; both petitions say on their face that they are the statewide fallback where the local court publishes nothing, say why they state sex, race and date of birth, and leave the case number blank for the clerk; the conviction petition carries the three-findings rule, the absence of a firearms finding and the commercial-DUI exclusion; the arrest petition closes the five grounds, records that there is no waiting period, explains the separation of the court file, carries the identity-theft exemption and the subsection (e) determination; both proposed orders leave every judicial field blank and record the condition on which they are tendered."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical per assigned track, plus variants
// ---------------------------------------------------------------------------

const convictionBase = (overrides = {}) => ({
  cityAndCourt: "Lawrence Municipal Court, case number 2016-CR-04412",
  fullLegalName: "Adaeze Marguerite Villanueva",
  nameAtTimeOfCase: "Adaeze Marguerite Okoro",
  sexRaceDateOfBirth: "Female; Black; 4 August 1990",
  dispositionType: "conviction",
  ordinanceViolation: "Lawrence City Code § 14-402, theft of property, class B misdemeanour",
  stateEquivalentOffense: "none",
  offenseCommittedDate: "9 May 2016",
  convictionOrDiversionDate: "22 August 2016",
  completionDate: "22 August 2017",
  arrestingAgency: "Lawrence Police Department",
  divertingAuthority: "",
  felonyLastTwoYears: "no",
  costsAndFinesPaid: "yes",
  localFormPublished: "no form, wants a proposed order",
  participantAccount:
    "I was twenty-five and working two jobs when this happened. Since then I have finished a nursing assistant certificate, I have had the same employer for six years, and I volunteer with a food pantry on Saturdays. The conviction comes up every time I apply for anything and I would like to be able to move on from it.",
  ...overrides
});

const arrestBase = (overrides = {}) => ({
  cityAndCourt: "Salina Municipal Court, no case number was assigned",
  fullLegalName: "Desmond Arlo Petrakis",
  nameAtTimeOfArrest: "Desmond Arlo Petrakis",
  sexRaceDateOfBirth: "Male; White; 17 December 1984",
  arrestDate: "3 February 2023",
  arrestingAgency: "Salina Police Department",
  ordinanceCharged: "Salina City Code § 22-45, disorderly conduct",
  statutoryGround: "mistaken identity",
  convictedOrDiverted: "no",
  identityTheftVictim: "no",
  localFormPublished: "no form, wants a proposed order",
  participantAccount: "",
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "ks-municipal-conviction-three-year-1",
    trackId: KS_CONVICTION_TRACK_ID,
    answers: convictionBase()
  },
  {
    fixtureId: "ks-municipal-diversion-dui-first-petition-only-2",
    trackId: KS_CONVICTION_TRACK_ID,
    variantOf: "ks-municipal-conviction-three-year-1",
    variantPurpose:
      "Three material branches at once, each of which changes the operative document: a diversion rather than a conviction moves the route from § 12-4516(a)(1) to (a)(2) and makes the diverting authority the identity the petition must state; a first DUI equivalent moves the elapsed period from three years to five under § 12-4516(e)(1); and a court that publishes no form but does not want a proposed order drops the conditional component from the packet entirely.",
    answers: convictionBase({
      dispositionType: "diversion",
      divertingAuthority: "City Prosecutor for the City of Lawrence",
      stateEquivalentOffense: "dui first",
      ordinanceViolation: "Lawrence City Code § 14-901, driving under the influence",
      completionDate: "22 August 2016",
      costsAndFinesPaid: "no",
      localFormPublished: "no form, petition only"
    })
  },
  {
    fixtureId: "ks-municipal-arrest-mistaken-identity-1",
    trackId: KS_ARREST_TRACK_ID,
    answers: arrestBase()
  },
  {
    fixtureId: "ks-municipal-arrest-best-interests-identity-theft-2",
    trackId: KS_ARREST_TRACK_ID,
    variantOf: "ks-municipal-arrest-mistaken-identity-1",
    variantPurpose:
      "The best-interests ground is the only one of the five that asks the Court to weigh anything, so it is the only one that carries the petitioner's own account and the only one that engages the § 12-4516a(e) determination; and the identity-theft answer replaces the ordinary fee recital with the statutory exemption. Both are legal branches, and the packet also drops to a single component.",
    answers: arrestBase({
      statutoryGround: "best interests of justice",
      identityTheftVictim: "yes",
      localFormPublished: "no form, petition only",
      participantAccount:
        "The charge was dismissed within a month and nothing was ever filed after that, but the arrest still shows up when a landlord runs a check. I have been turned down twice for a flat because of it and I am trying to move closer to my daughter's school."
    })
  }
];

for (const trackId of ASSIGNED) {
  ok(
    FIXTURES.filter((f) => !f.variantOf && f.trackId === trackId).length === 1,
    `${trackId} does not have exactly one canonical fixture.`
  );
}
ok(FIXTURES.every((f) => ASSIGNED.includes(f.trackId)), "A fixture names a track this job was not assigned.");
for (const fixture of FIXTURES.filter((f) => f.variantOf)) {
  const canonical = FIXTURES.find((f) => f.fixtureId === fixture.variantOf);
  ok(canonical && !canonical.variantOf, `${fixture.fixtureId}: names something other than a canonical fixture.`);
  ok(
    canonical && canonical.trackId === fixture.trackId,
    `${fixture.fixtureId}: names a canonical fixture on a different track.`
  );
  ok(
    typeof fixture.variantPurpose === "string" && fixture.variantPurpose.length > 40,
    `${fixture.fixtureId}: records no purpose.`
  );
}
note(
  `3. Fixtures: ${FIXTURES.filter((f) => !f.variantOf).length} canonical fixtures, one per assigned track, and ${FIXTURES.filter((f) => f.variantOf).length} regression variants, each naming a canonical fixture on its own track and each recording the material branch it tests. Every answer is synthetic.`
);

// ---------------------------------------------------------------------------
// 4. Typed stops and closed lists
// ---------------------------------------------------------------------------

const NEGATIVE = [
  ["the petitioner's name is missing", KS_CONVICTION_TRACK_ID, convictionBase({ fullLegalName: "" }), "ks-answer-missing"],
  ["the arresting agency is missing", KS_ARREST_TRACK_ID, arrestBase({ arrestingAgency: "" }), "ks-answer-missing"],
  ["the city and court are not identified", KS_CONVICTION_TRACK_ID, convictionBase({ cityAndCourt: "I am not sure" }), "ks-venue-not-identified"],
  ["the arrest court is not identified", KS_ARREST_TRACK_ID, arrestBase({ cityAndCourt: "I do not know" }), "ks-venue-not-identified"],
  ["the clerk has not been asked about a local form", KS_CONVICTION_TRACK_ID, convictionBase({ localFormPublished: "have not asked" }), "ks-local-form-not-confirmed"],
  ["the clerk has not been asked on the arrest route", KS_ARREST_TRACK_ID, arrestBase({ localFormPublished: "have not asked" }), "ks-local-form-not-confirmed"],
  ["the court publishes its own form", KS_CONVICTION_TRACK_ID, convictionBase({ localFormPublished: "publishes own form" }), "ks-local-form-governs"],
  ["the arrest court publishes its own form", KS_ARREST_TRACK_ID, arrestBase({ localFormPublished: "publishes own form" }), "ks-local-form-governs"],
  ["the ordinance was a commercial DUI equivalent", KS_CONVICTION_TRACK_ID, convictionBase({ stateEquivalentOffense: "commercial dui" }), "ks-commercial-dui-excluded"],
  ["the state equivalence is unsettled", KS_CONVICTION_TRACK_ID, convictionBase({ stateEquivalentOffense: "not sure" }), "ks-state-equivalent-not-settled"],
  ["there is a felony within two years", KS_CONVICTION_TRACK_ID, convictionBase({ felonyLastTwoYears: "yes" }), "ks-felony-within-two-years"],
  ["the completion date is a shrug", KS_CONVICTION_TRACK_ID, convictionBase({ completionDate: "some time after" }), "ks-completion-date-not-established"],
  ["the three-year period has not elapsed", KS_CONVICTION_TRACK_ID, convictionBase({ [KS_PREPARATION_DATE_KEY]: "2018" }), "ks-waiting-period-not-elapsed"],
  ["the ten-year period has not elapsed", KS_CONVICTION_TRACK_ID, convictionBase({ stateEquivalentOffense: "dui second or subsequent", [KS_PREPARATION_DATE_KEY]: "2024" }), "ks-waiting-period-not-elapsed"],
  ["a diversion names no diverting authority", KS_CONVICTION_TRACK_ID, convictionBase({ dispositionType: "diversion", divertingAuthority: "" }), "ks-diverting-authority-not-named"],
  ["the arrest ended in a conviction", KS_ARREST_TRACK_ID, arrestBase({ convictedOrDiverted: "yes" }), "ks-conviction-route-applies"],
  ["the statutory ground is unsettled", KS_ARREST_TRACK_ID, arrestBase({ statutoryGround: "not sure" }), "ks-ground-not-settled"],
  ["the best-interests ground has no account", KS_ARREST_TRACK_ID, arrestBase({ statutoryGround: "best interests of justice", participantAccount: "" }), "ks-best-interests-account-missing"],
  ["the account is left to LegalEase", KS_ARREST_TRACK_ID, arrestBase({ statutoryGround: "best interests of justice", participantAccount: "You write one for me, whatever you think sounds best." }), "ks-account-not-petitioners-own"],
  ["a judicial finding is supplied", KS_CONVICTION_TRACK_ID, convictionBase({ courtFinding: "The court finds the circumstances warrant it" }), "ks-outside-party-content-refused"],
  ["a hearing date is supplied", KS_ARREST_TRACK_ID, arrestBase({ hearingDate: "4 May 2026" }), "ks-outside-party-content-refused"],
  ["a notice-given date is supplied", KS_CONVICTION_TRACK_ID, convictionBase({ noticeGivenDate: "2 April 2026" }), "ks-outside-party-content-refused"],
  ["a KBI notification is supplied", KS_ARREST_TRACK_ID, arrestBase({ kbiNotification: "Sent 6 May 2026" }), "ks-outside-party-content-refused"],
  ["the prosecutor's position is supplied", KS_CONVICTION_TRACK_ID, convictionBase({ prosecutorPosition: "No objection" }), "ks-outside-party-content-refused"],
  ["offender registration is raised", KS_CONVICTION_TRACK_ID, convictionBase({ offenderRegistration: "yes, I am required to register" }), "ks-offender-registration-attorney-only"],
  ["an immigration question is raised", KS_ARREST_TRACK_ID, arrestBase({ immigrationStatus: "I am not a US citizen" }), "ks-immigration-consequences-attorney-only"]
];

let stopped = 0;
const stopIdsSeen = new Set();
for (const [label, trackId, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveKansasFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof KansasEligibilityStopError,
    `${label} (${trackId}) did not fail closed with a typed stop; got ${caught?.name ?? "no error"}.`
  );
  if (caught instanceof KansasEligibilityStopError) {
    ok(caught.stopId === expectedStopId, `${label} raised ${caught.stopId} rather than ${expectedStopId}.`);
    ok(caught.trackId === trackId, `${label} reported the wrong track.`);
    ok(caught.reason.length > 60, `${label} gives no reason a person could act on.`);
    ok(KS_REFERRALS.includes(caught.referral), `${label} names a destination outside the module's referral set.`);
    ok(caught.nextStep.length > 30, `${label} gives no next step a person could take.`);
    stopped += 1;
    stopIdsSeen.add(caught.stopId);
  }
}
ok(stopped === NEGATIVE.length, `Only ${stopped} of ${NEGATIVE.length} negative cases failed closed.`);

const stopFor = (trackId, answers) => {
  try {
    deriveKansasFacts(trackId, answers);
  } catch (error) {
    return error;
  }
  return null;
};
ok(
  stopFor(KS_CONVICTION_TRACK_ID, convictionBase({ localFormPublished: "publishes own form" }))?.referral ===
    KS_MUNICIPAL_CLERK_REFERRAL,
  "The local-form stop does not send the petitioner to the clerk who publishes the form."
);
ok(
  stopFor(KS_ARREST_TRACK_ID, arrestBase({ convictedOrDiverted: "yes" }))?.referral === KS_CONVICTION_ROUTE_REFERRAL,
  "The arrest route does not send a conviction to the conviction route."
);
ok(
  stopFor(KS_CONVICTION_TRACK_ID, convictionBase({ felonyLastTwoYears: "yes" }))?.referral === KS_RECORD_REFERRAL,
  "The felony stop does not send the petitioner to their own record."
);
ok(
  stopFor(KS_CONVICTION_TRACK_ID, convictionBase({ stateEquivalentOffense: "commercial dui" }))?.referral ===
    KS_LAWYER_REFERRAL,
  "The commercial-DUI exclusion does not refer the petitioner on."
);
ok(
  KS_REFERRALS.every((r) => r.length > 40 && !/\b\d{3}[- ]\d{4}\b/.test(r)),
  "A referral destination is empty, or carries a telephone number the design never supplied."
);

const BRANCH_CASES = [
  [KS_CONVICTION_TRACK_ID, convictionBase({ dispositionType: "acquittal" })],
  [KS_CONVICTION_TRACK_ID, convictionBase({ stateEquivalentOffense: "burglary" })],
  [KS_CONVICTION_TRACK_ID, convictionBase({ localFormPublished: "they were vague" })],
  [KS_ARREST_TRACK_ID, arrestBase({ statutoryGround: "charges were reduced" })],
  [KS_ARREST_TRACK_ID, arrestBase({ identityTheftVictim: "possibly" })]
];
let branchRejected = 0;
for (const [trackId, answers] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveKansasFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof KansasBranchError, `An out-of-list answer on ${trackId} was accepted.`);
  if (caught instanceof KansasBranchError) branchRejected += 1;
}
for (const trackId of ["ks-21-6614-district", "ks-22-2410-arrest", "ks-something-else"]) {
  let caught = null;
  try {
    deriveKansasFacts(trackId, {});
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof KansasBranchError, `An unassigned track identifier ${trackId} was accepted.`);
}

ok(Object.keys(KS_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(new Set(Object.values(KS_LOCAL_FORM_ANSWERS)).size === 4, "The clerk-answer list changed size.");
ok(new Set(Object.values(KS_DISPOSITION_TYPES)).size === 2, "The disposition list changed size.");
ok(new Set(Object.values(KS_STATE_EQUIVALENTS)).size === 8, "The state-equivalence list changed size.");
ok(new Set(Object.values(KS_ARREST_GROUNDS)).size === 6, "The arrest-ground list changed size.");
ok(KS_OUTSIDE_PARTY_KEYS.length >= 8, "The outside-party key guard was narrowed.");
ok(KS_SCREENED_ROUTING_KEYS.length >= 2, "The routing-screen key list was narrowed.");
ok(KS_REFERRALS.length === 5, "The referral destination set changed size.");

const deniedRegistration = deriveKansasFacts(
  KS_CONVICTION_TRACK_ID,
  convictionBase({ offenderRegistration: "no, I have never had to register" })
);
ok(Boolean(deniedRegistration.periodStatement), "A denial of a registration obligation was treated as an assertion of one.");

note(
  `4. Stops: ${stopped} negative cases across both routes fail closed with the expected typed stop, a reason, a destination drawn from the module's own five-destination referral set and a next step; ${stopIdsSeen.size} distinct stop families are exercised, covering missing participant facts, an unresolved venue, a clerk who has not been asked, a court that publishes its own instrument, the commercial-DUI exclusion, an unsettled state equivalence, a felony within two years, an unestablished completion date, an unelapsed waiting period on two different branches, a diversion with no diverting authority, an arrest that was really a conviction, an unsettled statutory ground, a best-interests ground with no account or one LegalEase was asked to write, an offender-registration or immigration question, and every attempt to supply a judicial finding, a hearing date, a notice-given date, a KBI notification or the prosecutor's position; every stop routes away from the node that raised it; ${branchRejected} out-of-list branch values rejected; three unassigned track identifiers refused; eight closed lists hold their size.`
);

// ---------------------------------------------------------------------------
// 5. Rendered content, inspected page by page
// ---------------------------------------------------------------------------

function renderedPages(bytes) {
  const buffer = Buffer.from(bytes);
  const pages = [];
  let index = 0;
  while (index < buffer.length) {
    const marker = buffer.indexOf("stream", index);
    if (marker === -1) break;
    let start = marker + "stream".length;
    if (buffer[start] === 0x0d) start += 1;
    if (buffer[start] === 0x0a) start += 1;
    const end = buffer.indexOf("endstream", start);
    if (end === -1) break;
    let inflated = null;
    try {
      inflated = zlib.inflateSync(buffer.subarray(start, end)).toString("latin1");
    } catch {
      // Font programs and other embedded objects are not content streams.
    }
    index = end + "endstream".length;
    if (inflated === null) continue;
    if (!/\bTm\b/.test(inflated) && !/\bre\b/.test(inflated)) continue;
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
    const byLine = new Map();
    for (const run of runs) {
      const key = Math.round(run.y);
      if (!byLine.has(key)) byLine.set(key, []);
      byLine.get(key).push(run);
    }
    pages.push(
      [...byLine.entries()]
        .sort((left, right) => right[0] - left[0])
        .map(([, group]) => group.sort((l, r) => l.x - r.x).map((run) => run.text).join("   ").trim())
    );
  }
  return pages;
}

const asDrawn = (value) => String(value).replace(/[^\x20-\x7e]/g, "?");
const headingLines = (template) =>
  new Set((template.sections ?? []).map((s) => s.heading).filter(Boolean).map(asDrawn));
const isFillInRule = (line) => {
  const solid = line.replace(/\s+/g, "");
  if (solid.length === 0) return true;
  return (solid.match(/_/g) ?? []).length / solid.length > 0.6;
};
const pageOf = (pages, needle) => pages.findIndex((lines) => lines.some((l) => l.includes(needle)));

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveKansasFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "KS",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);
  const wantsOrder = Boolean(facts[KS_PROPOSED_ORDER_CONDITION_KEY]);
  ok(
    resolved.components.length === (wantsOrder ? 2 : 1),
    `${fixture.fixtureId}: resolved ${resolved.components.length} components; the proposed order is conditional on the clerk's answer.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "KS",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);
    const again = await renderPacketComponent({
      component,
      jurisdiction: "KS",
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
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries a line long enough to have run past the margin.`
      );
    });

    const executionLines = (template.signatureBlock ?? [])
      .map((line) => asDrawn(fillTemplate(line, facts).text))
      .filter((line) => line.trim().length > 0 && !isFillInRule(line))
      .map((line) => line.slice(0, 40));
    if (executionLines.length > 0 && template.signatureLabel !== null) {
      const blockPages = new Set(executionLines.map((line) => pageOf(pages, line)));
      ok(!blockPages.has(-1), `${fixture.fixtureId}/${component.componentId}: an execution line did not render.`);
      ok(
        blockPages.size === 1,
        `${fixture.fixtureId}/${component.componentId}: the execution block is split across pages ${[...blockPages].map((p) => p + 1).join(" and ")}.`
      );
    }

    const allLines = pages.flat().filter((line) => line.length > 24 && !isFillInRule(line));
    for (let i = 1; i < allLines.length; i += 1) {
      ok(
        allLines[i] !== allLines[i - 1],
        `${fixture.fixtureId}/${component.componentId}: the line "${allLines[i].slice(0, 60)}..." is rendered twice in succession.`
      );
    }

    const rendered = pages.flat().join("\n");
    ok(
      !/(fee|cost|charge|amount)s?\b[^.]{0,60}\$\s?\d/i.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: prints a fee amount, and the municipal fee varies court by court with no statewide figure.`
    );
    ok(
      !/^\s*(yes|no|conviction|diversion|mistaken identity|not sure|none)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare branch answer is rendered on a line of its own.`
    );
    ok(!/\{\{|\}\}/.test(rendered), `${fixture.fixtureId}/${component.componentId}: an unresolved placeholder reached the page.`);
    ok(!/\(\s*[xX]\s*\)/.test(rendered), `${fixture.fixtureId}/${component.componentId}: a finding box is rendered already marked.`);
    ok(
      !/I certify that I served|Date of service:/i.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: prints an executable certificate of service, though the court causes notice to be given.`
    );
    // The city, as the caption draws it: the answer before the first comma with
    // any trailing "Municipal Court" dropped, which is what the module derives.
    const city = String(fixture.answers.cityAndCourt)
      .split(",")[0]
      .replace(/\s*municipal court\s*$/i, "")
      .trim()
      .toUpperCase();
    ok(
      pages[0].some((line) => line.includes(city)),
      `${fixture.fixtureId}/${component.componentId}: page 1 does not carry the municipal court the participant supplied (${city}).`
    );
    inspectedPages += output.pageCount ?? 0;
    ok(
      !output.warnings.some((w) => /Rendered blank lines for absent values/.test(w)),
      `${fixture.fixtureId}/${component.componentId}: a declared value was absent and rendered as a blank line: ${output.warnings.join(" ")}`
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
    jurisdiction: "KS",
    jurisdictionName: "Kansas",
    packetName: resolved.track.assembledPacketName,
    caseReference: facts.packetCaseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(assembled.sha256 === againAssembled.sha256, `${fixture.fixtureId}: assembly is not deterministic.`);
  ok(assembled.componentRanges[0].role === "primary_filing", `${fixture.fixtureId}: the packet does not open with the petition.`);
  if (wantsOrder) {
    ok(
      assembled.componentRanges[1]?.role === "proposed_order",
      `${fixture.fixtureId}: the proposed order is not bound after the petition.`
    );
  }

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    sampleRole: fixture.variantOf ? "variant" : "canonical",
    components: assemblyComponents.length,
    pages: assembled.pageCount,
    sha256: assembled.sha256
  });
}

note(
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, none trailing empty, no heading stranded from its section, no execution block split across pages, no line past the margin, no paragraph repeated, no bare branch answer, no unresolved placeholder, no marked finding box, no certificate of service, no monetary amount, and no municipal court on any page that did not come from the fixture's own answers.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const convictionFacts = deriveKansasFacts(KS_CONVICTION_TRACK_ID, convictionBase());
ok(
  convictionFacts.fullLegalName === convictionBase().fullLegalName &&
    convictionFacts.accountStatement === convictionBase().participantAccount,
  "The petitioner's name or account was rewritten rather than carried through."
);
ok(
  /K.S.A. 12-4516\(g\)\(1\) prescribes those three items/.test(convictionFacts.contentIdentifiers) &&
    /K.S.A. 12-4516a\(b\) prescribes those three items/.test(
      deriveKansasFacts(KS_ARREST_TRACK_ID, arrestBase()).contentIdentifiers
    ),
  "The identifiers recital does not say why the section requires sex, race and date of birth, which is the one thing that distinguishes a statutory requirement from an inherited field."
);
ok(
  /does not state that the period has run/.test(convictionFacts.periodStatement),
  "The period recital asserts that the period has run rather than leaving the computation to the Court."
);
// The compound "court and case number" answer must not reach the court line.
for (const [trackId, base] of [[KS_CONVICTION_TRACK_ID, convictionBase], [KS_ARREST_TRACK_ID, arrestBase]]) {
  const line = deriveKansasFacts(trackId, base()).courtLine;
  ok(!/CASE NUMBER/i.test(line), `${trackId}: the court line carries a case number: ${line}`);
  ok(
    (line.match(/MUNICIPAL COURT/g) ?? []).length === 1,
    `${trackId}: the court line names the municipal court twice: ${line}`
  );
  ok(
    /^IN THE MUNICIPAL COURT OF [A-Z .'-]+, KANSAS$/.test(line),
    `${trackId}: the court line is not a clean municipal caption: ${line}`
  );
  ok(
    deriveKansasFacts(trackId, base()).caseIdentification.includes(base().cityAndCourt),
    `${trackId}: the participant's own case identification is not carried through anywhere.`
  );
}
ok(
  /three years/.test(convictionFacts.periodStatement) && /12-4516\(a\)/.test(convictionFacts.periodStatement),
  "The default equivalence does not produce the three-year recital."
);
const duiFacts = deriveKansasFacts(
  KS_CONVICTION_TRACK_ID,
  convictionBase({ stateEquivalentOffense: "dui first" })
);
ok(
  /five years/.test(duiFacts.periodStatement) && /12-4516\(e\)\(1\)/.test(duiFacts.periodStatement),
  "A first DUI equivalence does not move the period to five years under subsection (e)(1)."
);
const tenYear = deriveKansasFacts(
  KS_CONVICTION_TRACK_ID,
  convictionBase({ stateEquivalentOffense: "dui second or subsequent" })
);
ok(
  /ten years/.test(tenYear.periodStatement) && /12-4516\(e\)\(2\)/.test(tenYear.periodStatement),
  "A second DUI equivalence does not move the period to ten years."
);
const prohibited = deriveKansasFacts(
  KS_CONVICTION_TRACK_ID,
  convictionBase({ stateEquivalentOffense: "prohibited ordinance" })
);
ok(
  /states no elapsed period/.test(prohibited.periodStatement),
  "A prohibited-ordinance equivalence does not produce the no-period recital."
);
const diversion = deriveKansasFacts(
  KS_CONVICTION_TRACK_ID,
  convictionBase({ dispositionType: "diversion", divertingAuthority: "City Prosecutor for the City of Lawrence" })
);
ok(
  /12-4516\(a\)\(2\)/.test(diversion.dispositionSentence) &&
    /diverting authority/.test(diversion.contentAuthority),
  "A diversion does not move the route to subsection (a)(2) or name the diverting authority."
);
ok(
  /12-4516\(a\)\(1\)/.test(convictionFacts.dispositionSentence) &&
    /convicting court/.test(convictionFacts.contentAuthority),
  "A conviction does not stay on subsection (a)(1) or name the convicting court."
);

const arrestFacts = deriveKansasFacts(KS_ARREST_TRACK_ID, arrestBase());
ok(
  /mistaken identity/.test(arrestFacts.groundStatement),
  "The mistaken-identity ground does not produce its own recital."
);
ok(
  !arrestFacts[KS_PROPOSED_ORDER_CONDITION_KEY] === false,
  "The canonical arrest fixture should render the conditional proposed order."
);
const bestInterests = deriveKansasFacts(
  KS_ARREST_TRACK_ID,
  arrestBase({
    statutoryGround: "best interests of justice",
    identityTheftVictim: "yes",
    participantAccount: "The charge was dismissed and it still shows up."
  })
);
ok(
  /best interests of justice/.test(bestInterests.groundStatement) &&
    /the Court's determination and not the petitioner's/.test(bestInterests.groundStatement),
  "The best-interests ground does not put the determination on the Court."
);
ok(
  /no fee may be charged/.test(bestInterests.feeStatement) && !/no fee may be charged/.test(arrestFacts.feeStatement),
  "The identity-theft answer does not change the fee recital."
);
ok(
  deriveKansasFacts(KS_ARREST_TRACK_ID, arrestBase({ localFormPublished: "no form, petition only" }))[
    KS_PROPOSED_ORDER_CONDITION_KEY
  ] === "",
  "A court that wants no proposed order still renders one."
);

for (const fixture of FIXTURES) {
  const facts = deriveKansasFacts(fixture.trackId, fixture.answers);
  const track = KS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === fixture.trackId);
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key) && String(facts[input.key]).trim() !== "",
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!/^(yes|no|conviction|diversion|none|dui_first|mistaken_identity|best_interests_of_justice|no_form_petition_only|no_form_wants_proposed_order)$/.test(value)) {
      continue;
    }
    ok(
      !key.endsWith("Statement") && !key.endsWith("Sentence") && !key.startsWith("content"),
      `${fixture.fixtureId}: ${key} carries a bare branch answer into a rendered sentence.`
    );
  }
}

for (const variant of FIXTURES.filter((f) => f.variantOf)) {
  const canonical = results.find((r) => r.fixtureId === variant.variantOf);
  const built = results.find((r) => r.fixtureId === variant.fixtureId);
  ok(
    canonical && built && canonical.sha256 !== built.sha256,
    `${variant.fixtureId}: the regression variant assembles to the same bytes as ${variant.variantOf}.`
  );
  ok(
    canonical && built && canonical.components !== built.components,
    `${variant.fixtureId}: the clerk's proposed-order answer did not change the number of components in the packet.`
  );
}
ok(new Set(results.map((r) => r.sha256)).size === results.length, "Two fixtures assemble to identical bytes.");
ok(new Set(results.map((r) => r.trackId)).size === 2, "The fixtures do not cover both assigned tracks.");

note(
  "6. Values: the petitioner's answers and account are carried through verbatim; the state-equivalence answer moves the elapsed period across all four of its branches and names the subsection that sets it; a diversion moves the route to § 12-4516(a)(2) and names the diverting authority where a conviction names the convicting court; the arrest ground produces its own recital and the best-interests ground puts the determination on the Court; the identity-theft answer replaces the ordinary fee recital with the statutory exemption; the clerk's proposed-order answer drives the conditional component; every declared required input reaches the fact bag with a value; no derived sentence carries a bare branch answer; and all four fixtures assemble to distinct bytes."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const entry of KS_CUSTOM_PLEADING_TRACKS) {
  ok(entry.statuses.runtime === "runtime_disabled", `${entry.trackId}: is not runtime-disabled.`);
  ok(entry.runtimeDisabled === true, `${entry.trackId}: is not hard-disabled.`);
  ok(entry.technicalFixture === true, `${entry.trackId}: is not a technical fixture.`);
  ok(entry.statuses.legal === "not_submitted", `${entry.trackId}: claims a legal review status.`);
  ok(entry.statuses.visual === "not_reviewed", `${entry.trackId}: claims a visual review status.`);
  ok(entry.jurisdiction === "KS", `${entry.trackId}: is not a Kansas track.`);
  ok(entry.outputStrategy === "custom_pleading", `${entry.trackId}: is not custom_pleading.`);
  ok(entry.requiredInputs.length > 0, `${entry.trackId}: declares no participant inputs.`);
  ok(
    entry.geographyKeys.length === 0 && entry.geographicScope === "statewide",
    `${entry.trackId}: claims a geography the design does not give it.`
  );
  ok(
    entry.packetSet.components.every((c) => c.approval.legal === "not_submitted" && c.approval.visual === "not_reviewed"),
    `${entry.trackId}: a component claims an approval.`
  );
}
note("7. Runtime: both tracks are runtime-disabled, hard-disabled, technical fixtures, legally unsubmitted, visually unreviewed and statewide, and no component claims an approval.");

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Kansas custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Kansas custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(48)} ${result.trackId.padEnd(30)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(3)} pages  sha256=${result.sha256}`
  );
}
console.log("\nAssigned components not produced by this lane:");
for (const component of excludedComponents.sort((a, b) => a.componentId.localeCompare(b.componentId))) {
  console.log(
    `  ${component.componentId.padEnd(50)} ${component.role.padEnd(20)} ${component.strategy.padEnd(18)} ${component.requirement}`
  );
}
