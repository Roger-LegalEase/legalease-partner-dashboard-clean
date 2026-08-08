// Minnesota custom pleading — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Minnesota is not enabled and its shared surfaces are untouched; the assignment
// is exactly the one assigned track and its three assigned custom-pleading
// components; every document holds the design's boundaries on its face; every
// negative case fails closed with a typed stop naming a destination and a next
// step; and every rendered page is inspected line by line.
//
// Three boundaries carry most of section 2:
//
//   1. Nothing on this route is a court filing. There is no venue, no case
//      number, no fee, no service requirement and no hearing, and no document
//      may print one.
//   2. The § 299C.11, subd. 3(1) list — a chapter 609A sealing, a diversion
//      programme, a § 609.165 discharge and a chapter 638 pardon are each NOT a
//      determination in the person's favour — is printed in full, because a
//      person whose case ended one of those ways will reasonably think it ended
//      in their favour.
//   3. The design declares eight participant inputs and not one is an identity
//      question, so every letter prints the writer's name, date of birth and
//      return address as fields to complete rather than inventing a question.
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
  MN_CUSTOM_PLEADING_TRACKS,
  MN_CUSTOM_PLEADING_TEMPLATES,
  MN_DESIGN_ROLE_TO_ENGINE_ROLE,
  MN_EXCLUDED_COMPONENT_ROLES,
  MN_ASSIGNED_TRACK_IDS,
  MN_TRACK_ID,
  MN_YES_NO,
  MN_YES_NO_UNSURE,
  MN_CUSTODIANS,
  MN_SECONDARY_CUSTODIANS,
  MN_OUTSIDE_PARTY_KEYS,
  MN_SCREENED_ROUTING_KEYS,
  MN_SECONDARY_LETTERS_CONDITION_KEY,
  MN_REFERRALS,
  MN_LAWYER_REFERRAL,
  MN_RECORD_REFERRAL,
  MN_COURT_RECORD_REFERRAL,
  MN_EXPUNGEMENT_ROUTE_REFERRAL,
  deriveMinnesotaFacts,
  MinnesotaBranchError,
  MinnesotaEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/minnesota/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

// ---------------------------------------------------------------------------
// 0. Minnesota is not enabled, and the shared surfaces are intact
// ---------------------------------------------------------------------------

const assignedIds = new Set(MN_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "The assigned Minnesota track is wired into the shared relief-track registry."
);
ok(
  Object.keys(MN_CUSTOM_PLEADING_TEMPLATES).every(
    (id) => !Object.prototype.hasOwnProperty.call(PLEADING_TEMPLATES, id)
  ),
  "A template from this job is wired into the shared pleading-template pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "MN").length === 0,
  "Minnesota already has a track in the shared registry, so this job would be changing an enabled jurisdiction."
);

for (const track of MN_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, MN_CUSTOM_PLEADING_TEMPLATES);

note(
  "0. Enablement: the assigned track and all three templates are absent from the shared registry and template pack, and Minnesota has no track there at all; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly one track and its three components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;
const memo = readJson("data/record-clearing/legal-design-intake/MN.memo.json");

ok(
  JSON.stringify([...assignedIds]) === JSON.stringify([MN_TRACK_ID]),
  `The implemented track set ${JSON.stringify([...assignedIds])} is not exactly the assigned track.`
);
ok(
  JSON.stringify([...MN_ASSIGNED_TRACK_IDS]) === JSON.stringify([MN_TRACK_ID]),
  "The module's closed track list is not exactly the assigned track."
);
for (const foreign of registry.filter((r) => r.jurisdiction === "MN").map((r) => r.trackId)) {
  if (foreign === MN_TRACK_ID) continue;
  ok(!assignedIds.has(foreign), `${foreign} is implemented here and belongs to another lane.`);
}

const track = MN_CUSTOM_PLEADING_TRACKS[0];
const manifest = manifests.find((m) => m.trackId === MN_TRACK_ID);
const registryEntry = registry.find((r) => r.trackId === MN_TRACK_ID);
const memoEntry = memo.tracks.find((t) => t.trackId === MN_TRACK_ID);
ok(Boolean(manifest), "No packet-set manifest in the adopted legal design.");
ok(Boolean(registryEntry), "No entry in the adopted track registry.");
ok(Boolean(memoEntry), "No entry in the Minnesota legal-design memo.");

const designCp = manifest.components.filter((c) => c.outputStrategy === "custom_pleading");
const excludedComponents = manifest.components.filter((c) => c.outputStrategy !== "custom_pleading");
ok(designCp.length === 3, `The design assigns ${designCp.length} custom-pleading components rather than three.`);
ok(
  excludedComponents.length === 0,
  `The design assigns ${excludedComponents.length} components to another lane on this route; the module records none.`
);
ok(
  MN_EXCLUDED_COMPONENT_ROLES.length === 0,
  "The module records an excluded role, but every component on this route is custom pleading."
);
ok(
  JSON.stringify(track.packetSet.components.map((c) => c.componentId)) ===
    JSON.stringify(designCp.map((c) => c.componentId)),
  `Implemented components ${JSON.stringify(track.packetSet.components.map((c) => c.componentId))} do not match ${JSON.stringify(designCp.map((c) => c.componentId))}.`
);

for (const component of designCp) {
  const built = track.packetSet.components.find((c) => c.componentId === component.componentId);
  if (!built) continue;
  ok(built.order === component.order, `${component.componentId}: order does not match the design.`);
  ok(
    built.requirement === component.requirement,
    `${component.componentId}: requirement ${built.requirement} does not match the design's ${component.requirement}.`
  );
  ok(
    built.role === MN_DESIGN_ROLE_TO_ENGINE_ROLE[component.role],
    `${component.componentId}: engine role ${built.role} is not the mapping of the design role ${component.role}.`
  );
  ok(
    built.outputStrategy === "custom_pleading" && built.rendererStrategy === "custom_pleading",
    `${component.componentId}: is not a custom-pleading component on both axes.`
  );
  ok(
    built.sourcePath === null && built.sourceSha256 === null,
    `${component.componentId}: claims an official source. The Judicial Branch's sample letters are references, not forms.`
  );
  ok(Boolean(pleadingTemplate(built.templateId)), `${component.componentId}: template not registered.`);
  ok(
    specs.some((s) => s.trackId === MN_TRACK_ID && s.componentId === component.componentId),
    `${component.componentId}: has no governing custom-pleading specification in the adopted design.`
  );
  if (built.requirement === "conditional") {
    ok(
      built.conditionKey === MN_SECONDARY_LETTERS_CONDITION_KEY,
      `${component.componentId}: is conditional but carries no condition key the fact bag supplies.`
    );
    ok(
      typeof component.conditionDescription === "string" &&
        /custodian may hold/i.test(component.conditionDescription),
      `${component.componentId}: the design's condition is not the custodian condition this implements.`
    );
  }
}

ok(
  memoEntry.legalDesignDecision?.status === "legal_design_approved_with_limitations",
  `The memo does not approve the track (${memoEntry.legalDesignDecision?.status}).`
);
ok((registryEntry.buildBlockers ?? []).length === 0, "The registry carries a build blocker.");
ok((registryEntry.legalDesignBlockers ?? []).length === 0, "The registry carries a legal-design blocker.");
ok((registryEntry.releaseBlockers ?? []).length > 0, "The registry carries no release blocker.");
ok(memoEntry.outputStrategy === "custom_pleading", "The memo strategy is not custom pleading.");
ok(
  registryEntry.geographicScope === "statewide" && (registryEntry.geographyKeys ?? []).length === 0,
  "The design's geographic scope is not statewide."
);
ok(
  track.geographicScope === "statewide" && track.geographyKeys.length === 0,
  "The implemented track claims a geography the design does not give it."
);
ok(
  registryEntry.destination?.kind === "agency",
  `The design's destination is ${registryEntry.destination?.kind}, not an agency; this route has no court.`
);
ok(
  /No court/i.test(String(registryEntry.venue ?? "")),
  "The design's venue does not record that there is no court on this route."
);
const declaredKeys = memoEntry.participantInputs.map((i) => i.key).sort();
const implementedKeys = track.requiredInputs.map((i) => i.key).sort();
ok(
  JSON.stringify(declaredKeys) === JSON.stringify(implementedKeys),
  `Declared inputs ${JSON.stringify(declaredKeys)} do not match the implemented inputs ${JSON.stringify(implementedKeys)}.`
);
for (const declared of memoEntry.participantInputs) {
  const built = track.requiredInputs.find((i) => i.key === declared.key);
  ok(
    built && built.required === (declared.requirement === "required"),
    `Input ${declared.key} is ${built?.required ? "required" : "optional"} but the design marks it ${declared.requirement}.`
  );
}
// The design asks no identity question, which is why the letters print the
// fields blank rather than inventing one.
ok(
  !declaredKeys.some((k) => /name|address|birth|dob/i.test(k)),
  "The design now declares an identity input, so the letters should carry it rather than printing a blank field."
);

note(
  "1. Assignment: exactly the one assigned track and its 3 assigned custom-pleading components, each pinned to the design's component id, order, requirement, role and template, and each with a governing custom-pleading specification; the design assigns nothing on this route to another lane, so nothing is excluded; the conditional secondary-custodian letter carries a condition key the fact bag supplies; every declared participant input is asked under the design's own key and with the design's own optionality, and none of the eight is an identity question; the memo approves the track with no build blocker and no legal-design blocker, the destination is an agency and the design records that there is no court."
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

const NEGATION =
  /\(\s\s\)|\b(not|no|never|nothing|nobody|none|refuses?|declines?|blank|unsigned|unmarked|without|outside|neither)\b/i;
function assertedIn(text, pattern) {
  const sentences = String(text).split(/(?<=[a-z0-9)])[.!?]\s+|\\n|","/);
  return sentences.some((sentence) => {
    const match = sentence.match(pattern);
    if (!match) return false;
    return !NEGATION.test(sentence.slice(0, sentence.indexOf(match[0])));
  });
}

const NEVER_PRESENT = [
  [/\$\s?\d/, "prints a monetary amount, and no fee attaches to a written demand"],
  [/\bcase no\.|\bcase number\b/i, "prints a case number, though nothing on this route is filed in a court"],
  [/\bcertificate of service\b/i, "prints a certificate of service, though no service is required"],
  [/\bfiling fee|\bfee waiver\b/i, "mentions a fee, though there is none"],
  [/\bpetition(er)?\b/i, "calls the writer a petitioner, though this is correspondence and not a petition"],
  [/\bIN THE .* COURT\b/, "carries a court caption"],
  [/\/s\//i, "prints a conformed signature"],
  [/\b\d{3}-\d{2}-\d{4}\b/, "prints something shaped like a social security number"]
];

const ONLY_DENIED = [
  [/\bdata (has|have) been destroyed\b|\brecords were destroyed\b/i, "reports that the data has been destroyed"],
  [/\bthe (bureau|agency|custodian) (has|had) (confirmed|agreed|complied)/i, "reports that a custodian has acted"],
  [/\bwill be destroyed\b|\bmust destroy your\b/i, "predicts what the custodian will do"],
  [/\b(immigration)/i, "speaks to an immigration consequence"],
  [/\bthe conditions (in subdivision 1\(b\) )?(are|have been) (met|satisfied|made out) (in this case|here)\b/i, "asserts that the statutory conditions are met, which is the custodian's check"],
  [/\b(this|the) demand (was|has been) (sent|mailed) on\b/i, "reports that the demand has already been sent"],
  [/\bhearing\b/i, "mentions a hearing, though the subdivision provides for none"]
];

let templatesChecked = 0;
for (const template of Object.values(MN_CUSTOM_PLEADING_TEMPLATES)) {
  const source = sourceOf(template);
  templatesChecked += 1;
  ok(template.technicalFixture === true, `${template.templateId}: is not marked a technical fixture.`);
  ok(
    typeof template.fixtureBanner === "string" && /DRAFT PENDING LEGAL REVIEW/.test(template.fixtureBanner),
    `${template.templateId}: carries no draft-pending-review banner.`
  );
  for (const [pattern, why] of NEVER_PRESENT) ok(!pattern.test(source), `${template.templateId}: ${why}.`);
  for (const [pattern, why] of ONLY_DENIED) ok(!assertedIn(source, pattern), `${template.templateId}: ${why}.`);
  ok(
    /299C\.11/.test(source),
    `${template.templateId}: does not cite § 299C.11, the subdivision this route runs on.`
  );
  ok(!template.verification, `${template.templateId}: carries a verification, though nothing here is sworn.`);
}
ok(templatesChecked === 3, `Checked ${templatesChecked} templates rather than three.`);

// Both letters — but not the writer's own mailing sheet — are addressed to an
// office, state the conditions and print the subdivision 3(1) list.
for (const templateId of [
  "mn-299c11-demand-bureau-of-criminal-apprehension",
  "mn-299c11-demand-other-custodians"
]) {
  const template = pleadingTemplate(templateId);
  const source = sourceOf(template);
  ok(
    /THIS IS A LETTER, NOT A COURT FILING/.test(template.caption.courtLine),
    `${templateId}: does not say on its face that it is not a court filing.`
  );
  ok(
    /on WRITTEN DEMAND the law enforcement agency and the Bureau of Criminal Apprehension shall destroy/.test(source),
    `${templateId}: does not state the duty the subdivision imposes.`
  );
  ok(
    /fingerprints and thumbprints, the photographs, the distinctive physical mark identification data, the known aliases and street names, and all copies and duplicates/.test(source),
    `${templateId}: does not name the data the subdivision reaches.`
  );
  ok(
    /a sealing under . ?152\.18, subd\. 1, . ?242\.31 or chapter 609A; successful completion of a diversion programme; an order of discharge under . ?609\.165; and a pardon under chapter 638/.test(source),
    `${templateId}: does not print the § 299C.11, subd. 3(1) list of things that are not a determination in the person's favour.`
  );
  ok(
    /\{\{arrestStatement\}\}/.test(source) &&
      /\{\{groundStatement\}\}/.test(source) &&
      /\{\{lookbackStatement\}\}/.test(source) &&
      /\{\{diversionStatement\}\}/.test(source),
    `${templateId}: does not carry all four of the writer's own statements.`
  );
  ok(
    /full legal name: _+/i.test(source) && /Date of birth: _+/.test(source) && /Return address: _+/.test(source),
    `${templateId}: does not leave the writer's identity fields blank, though the design asks no identity question.`
  );
  ok(
    /Write the office's current name and postal address here/.test(source),
    `${templateId}: does not leave the office's address blank for the writer to look up.`
  );
  ok(
    template.caption.partyBlockLeft.every((cell) => cell.length < 40) &&
      template.caption.partyBlockRight.every((cell) => cell.length < 40),
    `${templateId}: a caption cell is wide enough to wrap inside its column, which drifts the other column's rows down past it.`
  );
  ok(
    /certified mail/i.test(source),
    `${templateId}: does not tell the writer to send it in a way that evidences the demand.`
  );
  ok(
    /WHERE THIS PACKET STOPS/.test(source) && source.includes(MN_LAWYER_REFERRAL),
    `${templateId}: carries no printed stop section with a referral.`
  );
  ok(template.signatureLabel !== null, `${templateId}: prints no signature rule, though the writer signs it.`);
}

const secondary = sourceOf(pleadingTemplate("mn-299c11-demand-other-custodians"));
ok(
  /\{\{secondaryCustodianList\}\}/.test(secondary),
  "The secondary letter does not carry the list of offices the writer identified."
);
ok(
  /Print one copy for each office/.test(secondary) && /A demand is made of one office at a time/.test(secondary),
  "The secondary letter does not tell the writer to send one copy per office."
);

const instructions = pleadingTemplate("mn-299c11-mailing-instructions");
const instructionsSource = sourceOf(instructions);
ok(
  /FOR THE WRITER, NOT FOR ANY OFFICE/.test(instructions.caption.courtLine),
  "The mailing sheet does not say it is not for an office."
);
ok(
  instructions.signatureLabel === null,
  "The mailing sheet prints a signature rule, though nobody signs a working sheet."
);
ok(
  /Do not send it to anybody/.test(instructionsSource),
  "The mailing sheet does not tell the writer to keep it."
);
ok(
  /Bureau of Criminal Apprehension, the police department, the county sheriff, the city attorney, the county attorney and the county department of corrections/.test(instructionsSource),
  "The mailing sheet does not name the six custodians the design contemplates."
);
ok(
  /no timescale is promised here because the subdivision sets none/.test(instructionsSource),
  "The mailing sheet promises a timescale the subdivision does not set."
);

note(
  "2. Boundaries: every document cites § 299C.11 and none prints a case number, a court caption, a fee, a certificate of service, a hearing, a conformed signature or a monetary amount; none reports that data has been destroyed, that a custodian has acted or that the demand has been sent, predicts what a custodian will do, asserts that the statutory conditions are met, or speaks to immigration; both letters say on their face that they are not court filings, state the duty and the data the subdivision reaches, print the subdivision 3(1) list in full, carry all four of the writer's own statements, leave the writer's name, date of birth, return address and the office's address blank, and tell the writer to send by certified mail; the mailing sheet says it is not for any office, is unsigned, names the six custodians and promises no timescale."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical, plus material variants
// ---------------------------------------------------------------------------

const base = (overrides = {}) => ({
  arrestingAgency: "Saint Cloud Police Department, Stearns County, City of Saint Cloud",
  arrestDate: "18 March 2021",
  dismissedBeforeProbableCause: "yes",
  prosecutorDeclined: "no",
  grandJuryIndictment: "",
  diversionParticipation: "no",
  tenYearLookback: "no",
  custodiansHoldingRecord: ["bca", "police department", "county attorney"],
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "mn-299c11-dismissed-before-probable-cause-1",
    trackId: MN_TRACK_ID,
    answers: base()
  },
  {
    fixtureId: "mn-299c11-prosecutor-declined-bca-only-2",
    trackId: MN_TRACK_ID,
    variantOf: "mn-299c11-dismissed-before-probable-cause-1",
    variantPurpose:
      "Two material branches at once. Subdivision 1(b) gives two alternative grounds and the answer decides which one the letter states, so the operative recital changes outright; and a writer who identifies only the Bureau of Criminal Apprehension gets no secondary letter at all, which changes the packet from three components to two.",
    answers: base({
      dismissedBeforeProbableCause: "no",
      prosecutorDeclined: "yes",
      grandJuryIndictment: "no",
      custodiansHoldingRecord: ["bca"]
    })
  },
  {
    fixtureId: "mn-299c11-all-six-custodians-3",
    trackId: MN_TRACK_ID,
    variantOf: "mn-299c11-dismissed-before-probable-cause-1",
    variantPurpose:
      "The design directs that a letter be generated only for a custodian that may actually hold the record, so the custodian list is the operative content of the secondary letter and of the mailing sheet. All six named offices is the widest case and the one that proves the list is built from the writer's own answer rather than from a fixed set.",
    answers: base({
      custodiansHoldingRecord: [
        "bca",
        "police department",
        "county sheriff",
        "city attorney",
        "county attorney",
        "county department of corrections"
      ]
    })
  }
];

ok(
  FIXTURES.filter((f) => !f.variantOf).length === 1,
  "The assigned track does not have exactly one canonical fixture."
);
ok(FIXTURES.every((f) => f.trackId === MN_TRACK_ID), "A fixture names a track this job was not assigned.");
for (const fixture of FIXTURES.filter((f) => f.variantOf)) {
  const canonical = FIXTURES.find((f) => f.fixtureId === fixture.variantOf);
  ok(canonical && !canonical.variantOf, `${fixture.fixtureId}: names something other than a canonical fixture.`);
  ok(canonical && canonical.trackId === fixture.trackId, `${fixture.fixtureId}: names a canonical fixture on a different track.`);
  ok(
    typeof fixture.variantPurpose === "string" && fixture.variantPurpose.length > 40,
    `${fixture.fixtureId}: records no purpose.`
  );
}
note(
  `3. Fixtures: 1 canonical fixture on the single assigned track and ${FIXTURES.filter((f) => f.variantOf).length} regression variants, each naming that canonical fixture and each recording the material branch it tests. Every answer is synthetic.`
);

// ---------------------------------------------------------------------------
// 4. Typed stops and closed lists
// ---------------------------------------------------------------------------

const NEGATIVE = [
  ["the arresting agency is missing", base({ arrestingAgency: "" }), "mn-answer-missing"],
  ["the arrest date is missing", base({ arrestDate: "" }), "mn-answer-missing"],
  ["the arresting agency is not identified", base({ arrestingAgency: "I do not know" }), "mn-arresting-agency-not-identified"],
  ["the arrest date is a shrug", base({ arrestDate: "some time that spring" }), "mn-arrest-date-not-established"],
  ["the probable-cause question is unsettled", base({ dismissedBeforeProbableCause: "unsure" }), "mn-probable-cause-not-established"],
  ["neither statutory ground is made out", base({ dismissedBeforeProbableCause: "no", prosecutorDeclined: "no" }), "mn-no-qualifying-determination"],
  ["a grand jury indicted after a declination", base({ dismissedBeforeProbableCause: "no", prosecutorDeclined: "yes", grandJuryIndictment: "yes" }), "mn-grand-jury-indicted"],
  ["there was a diversion programme", base({ diversionParticipation: "yes" }), "mn-diversion-not-a-determination"],
  ["there is a conviction in the lookback", base({ tenYearLookback: "yes" }), "mn-ten-year-lookback-conviction"],
  ["the lookback has not been checked", base({ tenYearLookback: "unsure" }), "mn-ten-year-lookback-not-established"],
  ["no custodian is identified", base({ custodiansHoldingRecord: [] }), "mn-no-custodian-identified"],
  ["the Bureau is left off the list", base({ custodiansHoldingRecord: ["police department", "county attorney"] }), "mn-bca-not-included"],
  ["a chapter 609A sealing is volunteered", base({ chapter609aPetition: "yes, my case was sealed under chapter 609A" }), "mn-chapter-609a-not-a-determination"],
  ["an immigration question is raised", base({ immigrationStatus: "I am not a US citizen" }), "mn-immigration-consequences-attorney-only"],
  ["a destruction confirmation is supplied", base({ destructionConfirmation: "The BCA says it destroyed the prints" }), "mn-outside-party-content-refused"],
  ["an agency response is supplied", base({ agencyResponse: "They wrote back on 3 March" }), "mn-outside-party-content-refused"],
  ["a demand-sent date is supplied", base({ demandSentDate: "2 April 2026" }), "mn-outside-party-content-refused"],
  ["a court order is supplied", base({ courtOrder: "Order sealing the file" }), "mn-outside-party-content-refused"]
];

let stopped = 0;
const stopIdsSeen = new Set();
for (const [label, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveMinnesotaFacts(MN_TRACK_ID, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof MinnesotaEligibilityStopError,
    `${label} did not fail closed with a typed stop; got ${caught?.name ?? "no error"}.`
  );
  if (caught instanceof MinnesotaEligibilityStopError) {
    ok(caught.stopId === expectedStopId, `${label} raised ${caught.stopId} rather than ${expectedStopId}.`);
    ok(caught.trackId === MN_TRACK_ID, `${label} reported the wrong track.`);
    ok(caught.reason.length > 60, `${label} gives no reason a person could act on.`);
    ok(MN_REFERRALS.includes(caught.referral), `${label} names a destination outside the module's referral set.`);
    ok(caught.nextStep.length > 30, `${label} gives no next step a person could take.`);
    stopped += 1;
    stopIdsSeen.add(caught.stopId);
  }
}
ok(stopped === NEGATIVE.length, `Only ${stopped} of ${NEGATIVE.length} negative cases failed closed.`);

const stopFor = (answers) => {
  try {
    deriveMinnesotaFacts(MN_TRACK_ID, answers);
  } catch (error) {
    return error;
  }
  return null;
};
ok(
  stopFor(base({ dismissedBeforeProbableCause: "unsure" }))?.referral === MN_COURT_RECORD_REFERRAL,
  "The probable-cause stop does not send the writer to the disposition record that settles it."
);
ok(
  stopFor(base({ diversionParticipation: "yes" }))?.referral === MN_LAWYER_REFERRAL,
  "The diversion stop does not refer the writer on."
);
ok(
  stopFor(base({ tenYearLookback: "unsure" }))?.referral === MN_RECORD_REFERRAL,
  "The lookback stop does not send the writer to their own criminal history."
);
ok(
  stopFor(base({ chapter609aPetition: "yes, it was sealed" }))?.referral === MN_EXPUNGEMENT_ROUTE_REFERRAL,
  "The chapter 609A stop does not route the writer to the separate court remedy."
);
ok(
  MN_REFERRALS.every((r) => r.length > 40 && !/\b\d{3}[- ]\d{4}\b/.test(r)),
  "A referral destination is empty, or carries a telephone number the design never supplied."
);

const BRANCH_CASES = [
  base({ dismissedBeforeProbableCause: "probably" }),
  base({ prosecutorDeclined: "they never said" }),
  base({ diversionParticipation: "a continuance for dismissal" }),
  base({ custodiansHoldingRecord: ["bca", "the FBI"] })
];
let branchRejected = 0;
for (const answers of BRANCH_CASES) {
  let caught = null;
  try {
    deriveMinnesotaFacts(MN_TRACK_ID, answers);
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof MinnesotaBranchError, "An out-of-list answer was accepted.");
  if (caught instanceof MinnesotaBranchError) branchRejected += 1;
}
for (const trackId of ["mn_609a_petition", "mn-something-else"]) {
  let caught = null;
  try {
    deriveMinnesotaFacts(trackId, {});
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof MinnesotaBranchError, `An unassigned track identifier ${trackId} was accepted.`);
}

ok(Object.keys(MN_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(new Set(Object.values(MN_YES_NO_UNSURE)).size === 3, "The yes-no-unsure list changed size.");
ok(new Set(Object.values(MN_CUSTODIANS)).size === 6, "The custodian list is not the six the design names.");
ok(MN_SECONDARY_CUSTODIANS.length === 5, "The secondary-custodian list is not the five other offices.");
ok(MN_OUTSIDE_PARTY_KEYS.length >= 6, "The outside-party key guard was narrowed.");
ok(MN_SCREENED_ROUTING_KEYS.length >= 2, "The routing-screen key list was narrowed.");
ok(MN_REFERRALS.length === 4, "The referral destination set changed size.");

// A denial is not an assertion.
const denied = deriveMinnesotaFacts(MN_TRACK_ID, base({ chapter609aPetition: "no, nothing was ever sealed" }));
ok(Boolean(denied.groundStatement), "A denial of a chapter 609A sealing was treated as an assertion of one.");

note(
  `4. Stops: ${stopped} negative cases fail closed with the expected typed stop, a reason, a destination drawn from the module's own four-destination referral set and a next step; ${stopIdsSeen.size} distinct stop families are exercised, covering missing participant facts, an unidentified arresting agency, an unestablished arrest date, an unsettled probable-cause question, neither statutory ground being made out, a grand jury indicting after a declination, a diversion programme, a conviction in the nationwide ten-year lookback and a lookback nobody has checked, no custodian identified, the Bureau left off the list, a chapter 609A sealing, an attorney-only immigration question, and every attempt to supply a destruction confirmation, an agency response, a demand-sent date or a court order; every stop routes away from the node that raised it; ${branchRejected} out-of-list branch values rejected; two unassigned track identifiers refused; seven closed lists hold their size.`
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
const flat = (value) => String(value).replace(/\s+/g, " ").trim();
const headingLines = (template) =>
  new Set((template.sections ?? []).map((s) => s.heading).filter(Boolean).map(asDrawn));
const isFillInRule = (line) => {
  const solid = line.replace(/\s+/g, "");
  if (solid.length === 0) return true;
  return (solid.match(/_/g) ?? []).length / solid.length > 0.6;
};
const lastPageOf = (pages, needle) => {
  for (let i = pages.length - 1; i >= 0; i -= 1) {
    if (pages[i].some((l) => flat(l).includes(flat(needle)))) return i;
  }
  return -1;
};

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveMinnesotaFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "MN",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);
  const wantsSecondary = Boolean(facts[MN_SECONDARY_LETTERS_CONDITION_KEY]);
  ok(
    resolved.components.length === (wantsSecondary ? 3 : 2),
    `${fixture.fixtureId}: resolved ${resolved.components.length} components; the secondary letter is conditional on the custodians the writer named.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "MN",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);
    const again = await renderPacketComponent({
      component,
      jurisdiction: "MN",
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
      .map((line) => flat(asDrawn(fillTemplate(line, facts).text)))
      .filter((line) => line.length > 0 && !isFillInRule(line))
      .map((line) => line.slice(0, 40));
    if (executionLines.length > 0 && template.signatureLabel !== null) {
      const blockPages = new Set(executionLines.map((line) => lastPageOf(pages, line)));
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
    ok(!/\$\s?\d/.test(rendered), `${fixture.fixtureId}/${component.componentId}: prints a monetary amount.`);
    ok(
      !/^\s*(yes|no|unsure|bca|police department|county attorney)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare branch answer is rendered on a line of its own.`
    );
    ok(!/\{\{|\}\}/.test(rendered), `${fixture.fixtureId}/${component.componentId}: an unresolved placeholder reached the page.`);
    ok(
      !/\bcase no\.|\bIN THE .* COURT\b/i.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: the rendered page carries a court caption or case number.`
    );
    ok(
      flat(rendered).includes(flat(fixture.answers.arrestDate)),
      `${fixture.fixtureId}/${component.componentId}: page does not carry the arrest date the writer supplied.`
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
    jurisdiction: "MN",
    jurisdictionName: "Minnesota",
    packetName: resolved.track.assembledPacketName,
    caseReference: facts.packetCaseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(assembled.sha256 === againAssembled.sha256, `${fixture.fixtureId}: assembly is not deterministic.`);
  ok(
    assembled.componentRanges[0].role === "primary_filing",
    `${fixture.fixtureId}: the packet does not open with the Bureau letter.`
  );
  ok(
    assembled.componentRanges[assembled.componentRanges.length - 1].role === "instructions",
    `${fixture.fixtureId}: the writer's mailing sheet is not bound last.`
  );

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
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, none trailing empty, no heading stranded from its section, no execution block split across pages, no line past the margin, no paragraph repeated, no bare branch answer, no unresolved placeholder, no court caption or case number, no monetary amount, and the writer's own arrest date on every page set.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const dismissedFacts = deriveMinnesotaFacts(MN_TRACK_ID, base());
ok(
  dismissedFacts.arrestStatement.includes("Saint Cloud Police Department") &&
    dismissedFacts.arrestStatement.includes("18 March 2021"),
  "The arrest is not carried through as the writer stated it."
);
ok(
  /dismissed before the court made a determination of probable cause/.test(dismissedFacts.groundStatement),
  "The dismissed-before-probable-cause answer does not produce its own ground recital."
);
const declinedFacts = deriveMinnesotaFacts(
  MN_TRACK_ID,
  base({ dismissedBeforeProbableCause: "no", prosecutorDeclined: "yes", grandJuryIndictment: "no" })
);
ok(
  /declined to file charges/.test(declinedFacts.groundStatement) &&
    /a grand jury did not return an indictment/.test(declinedFacts.groundStatement),
  "The declined-to-file answer does not produce its own ground recital with the grand-jury limb."
);
ok(
  declinedFacts.groundStatement !== dismissedFacts.groundStatement,
  "Both statutory grounds produce the same recital."
);
ok(
  /nationwide|any other state/.test(dismissedFacts.lookbackStatement),
  "The lookback recital does not record that the ten years run nationwide."
);
ok(
  /299C\.11, subd\. 3\(1\)/.test(dismissedFacts.diversionStatement),
  "The diversion recital does not cite the subdivision that makes it relevant."
);
ok(
  dismissedFacts[MN_SECONDARY_LETTERS_CONDITION_KEY] === "yes" &&
    deriveMinnesotaFacts(MN_TRACK_ID, base({ custodiansHoldingRecord: ["bca"] }))[
      MN_SECONDARY_LETTERS_CONDITION_KEY
    ] === "",
  "The custodian answer does not drive whether the secondary letter renders."
);
const allSix = deriveMinnesotaFacts(
  MN_TRACK_ID,
  base({
    custodiansHoldingRecord: [
      "bca",
      "police department",
      "county sheriff",
      "city attorney",
      "county attorney",
      "county department of corrections"
    ]
  })
);
ok(
  allSix.secondaryCustodianList.split("\n").length === 5,
  "Six named custodians do not produce five secondary offices."
);
ok(
  /only custodian the writer identified/.test(
    deriveMinnesotaFacts(MN_TRACK_ID, base({ custodiansHoldingRecord: ["bca"] })).custodianCountStatement
  ),
  "A Bureau-only answer does not say that it is the only custodian identified."
);

for (const fixture of FIXTURES) {
  const facts = deriveMinnesotaFacts(fixture.trackId, fixture.answers);
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key) && String(facts[input.key]).trim() !== "",
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!/^(yes|no|unsure|bca)$/.test(value)) continue;
    ok(
      !key.endsWith("Statement") && !key.endsWith("List"),
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
}
ok(new Set(results.map((r) => r.sha256)).size === results.length, "Two fixtures assemble to identical bytes.");

note(
  "6. Values: the writer's arrest and agency are carried through verbatim; the two statutory grounds produce different operative recitals and the declined-to-file recital carries the grand-jury limb; the lookback recital records that the ten years run nationwide and the diversion recital cites the subdivision that makes it relevant; the custodian answer drives whether the secondary letter renders, how many offices it names and what the Bureau letter says about the shape of the packet; every declared required input reaches the fact bag with a value; no derived sentence carries a bare branch answer; and all three fixtures assemble to distinct bytes."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const entry of MN_CUSTOM_PLEADING_TRACKS) {
  ok(entry.statuses.runtime === "runtime_disabled", `${entry.trackId}: is not runtime-disabled.`);
  ok(entry.runtimeDisabled === true, `${entry.trackId}: is not hard-disabled.`);
  ok(entry.technicalFixture === true, `${entry.trackId}: is not a technical fixture.`);
  ok(entry.statuses.legal === "not_submitted", `${entry.trackId}: claims a legal review status.`);
  ok(entry.statuses.visual === "not_reviewed", `${entry.trackId}: claims a visual review status.`);
  ok(entry.jurisdiction === "MN", `${entry.trackId}: is not a Minnesota track.`);
  ok(entry.outputStrategy === "custom_pleading", `${entry.trackId}: is not custom_pleading.`);
  ok(entry.requiredInputs.length === 8, `${entry.trackId}: does not ask the design's eight questions.`);
  ok(
    entry.geographyKeys.length === 0 && entry.geographicScope === "statewide",
    `${entry.trackId}: claims a geography the design does not give it.`
  );
  ok(
    entry.packetSet.components.every((c) => c.approval.legal === "not_submitted" && c.approval.visual === "not_reviewed"),
    `${entry.trackId}: a component claims an approval.`
  );
}
note("7. Runtime: the track is runtime-disabled, hard-disabled, a technical fixture, legally unsubmitted, visually unreviewed and statewide, and no component claims an approval.");

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Minnesota custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Minnesota custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(46)} ${result.trackId.padEnd(26)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(3)} pages  sha256=${result.sha256}`
  );
}
