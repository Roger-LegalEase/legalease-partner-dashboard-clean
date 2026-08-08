// Missouri custom pleading — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Missouri is not enabled and its shared surfaces are untouched; the assignment
// is exactly the two assigned tracks and their four assigned custom-pleading
// components, with the two official_pdf_fill components and the one
// process_guidance component on each route recorded as other lanes' work; every
// document holds the design's boundaries on its face; every negative case fails
// closed with a typed stop naming a destination and a next step; and every
// rendered page is inspected line by line.
//
// Four boundaries carry most of section 2:
//
//   1. The § 302.525.3 definition of an alcohol-related enforcement contact is
//      printed VERBATIM on both routes, because an applicant asked whether they
//      have had one will otherwise think only of convictions and miss an
//      administrative suspension. And no document ever says whether a
//      particular driver-record entry is one.
//   2. Firstness is the applicant's own sworn allegation and never a machine
//      guess, because both sections give one expungement for life.
//   3. Relief is mandatory on the conditions — "shall enter an order of
//      expungement" — so no document may describe it as discretionary.
//   4. The FI-05 case type code is left blank rather than guessed, because the
//      official Case Types List publishes no code naming either section.
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
  MO_CUSTOM_PLEADING_TRACKS,
  MO_CUSTOM_PLEADING_TEMPLATES,
  MO_DESIGN_ROLE_TO_ENGINE_ROLE,
  MO_EXCLUDED_COMPONENT_ROLES,
  MO_ASSIGNED_TRACK_IDS,
  MO_MIP_TRACK_ID,
  MO_DWI_TRACK_ID,
  MO_YES_NO,
  MO_YES_NO_UNSURE,
  MO_MIP_CHARGE_BASIS,
  MO_OFFENSE_LEVELS,
  MO_OUTSIDE_PARTY_KEYS,
  MO_SCREENED_ROUTING_KEYS,
  MO_PREPARATION_DATE_KEY,
  MO_ENFORCEMENT_CONTACT_DEFINITION,
  MO_REFERRALS,
  MO_LAWYER_REFERRAL,
  MO_CLERK_REFERRAL,
  MO_DRIVER_RECORD_REFERRAL,
  MO_COURT_RECORD_REFERRAL,
  MO_INTOXICATION_ROUTE_REFERRAL,
  deriveMissouriFacts,
  MissouriBranchError,
  MissouriEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/missouri/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const ASSIGNED = [MO_MIP_TRACK_ID, MO_DWI_TRACK_ID];

// ---------------------------------------------------------------------------
// 0. Missouri is not enabled by this job, and the shared surfaces are intact
// ---------------------------------------------------------------------------

const assignedIds = new Set(MO_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Missouri track is wired into the shared relief-track registry."
);
ok(
  Object.keys(MO_CUSTOM_PLEADING_TEMPLATES).every(
    (id) => !Object.prototype.hasOwnProperty.call(PLEADING_TEMPLATES, id)
  ),
  "A template from this job is wired into the shared pleading-template pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);
const preexistingMo = RELIEF_TRACKS.filter((t) => t.jurisdiction === "MO").map((t) => t.trackId);
ok(
  preexistingMo.every((id) => !assignedIds.has(id)),
  `An existing Missouri track in the shared registry (${preexistingMo.join(", ")}) overlaps this job's assignment.`
);

for (const track of MO_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, MO_CUSTOM_PLEADING_TEMPLATES);

note(
  `0. Enablement: both assigned tracks and all four templates are absent from the shared registry and template pack, and neither collides with anything already there${preexistingMo.length ? ` (${preexistingMo.join(", ")})` : ""}; injection is verification-time only.`
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly two tracks and their four components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;
const memo = readJson("data/record-clearing/legal-design-intake/MO.memo.json");

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  `The implemented track set ${JSON.stringify([...assignedIds])} is not exactly the assigned set.`
);
ok(
  JSON.stringify([...MO_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The module's closed track list is not exactly the assigned set."
);
for (const foreign of registry.filter((r) => r.jurisdiction === "MO").map((r) => r.trackId)) {
  if (ASSIGNED.includes(foreign)) continue;
  ok(!assignedIds.has(foreign), `${foreign} is implemented here and belongs to another lane.`);
}

let assignedComponentCount = 0;
const excludedComponents = [];

for (const trackId of ASSIGNED) {
  const track = MO_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const manifest = manifests.find((m) => m.trackId === trackId);
  const registryEntry = registry.find((r) => r.trackId === trackId);
  const memoEntry = memo.tracks.find((t) => t.trackId === trackId);
  ok(Boolean(manifest), `${trackId}: no packet-set manifest in the adopted legal design.`);
  ok(Boolean(registryEntry), `${trackId}: no entry in the adopted track registry.`);
  ok(Boolean(memoEntry), `${trackId}: no entry in the Missouri legal-design memo.`);
  if (!manifest || !registryEntry || !memoEntry || !track) continue;

  const designCp = manifest.components.filter((c) => c.outputStrategy === "custom_pleading");
  assignedComponentCount += designCp.length;
  for (const component of manifest.components.filter((c) => c.outputStrategy !== "custom_pleading")) {
    excludedComponents.push({
      trackId,
      componentId: component.componentId,
      role: component.role,
      strategy: component.outputStrategy,
      requirement: component.requirement,
      officialFormId: component.officialFormId
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
    `${trackId}: implemented components ${JSON.stringify(implemented.map((c) => c.componentId))} do not match ${JSON.stringify(designCp.map((c) => c.componentId))}.`
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
      built.role === MO_DESIGN_ROLE_TO_ENGINE_ROLE[component.role],
      `${component.componentId}: engine role ${built.role} is not the mapping of the design role ${component.role}.`
    );
    ok(
      built.outputStrategy === "custom_pleading" && built.rendererStrategy === "custom_pleading",
      `${component.componentId}: is not a custom-pleading component on both axes.`
    );
    ok(
      built.sourcePath === null && built.sourceSha256 === null,
      `${component.componentId}: claims an official source. The State Courts Administrator publishes no form for either section.`
    );
    ok(Boolean(pleadingTemplate(built.templateId)), `${component.componentId}: template not registered.`);
    ok(
      specs.some((s) => s.trackId === trackId && s.componentId === component.componentId),
      `${component.componentId}: has no governing custom-pleading specification in the adopted design.`
    );
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
  ok(
    memoEntry.outputStrategy === "custom_pleading" && memoEntry.outputStrategyStatus === "resolved",
    `${trackId}: the memo does not resolve the output strategy to custom pleading.`
  );
  ok(memoEntry.packetIdentity === "identified", `${trackId}: the memo does not identify the packet.`);
  ok(memoEntry.localFormOverride === true, `${trackId}: the memo's local-form override is not set.`);
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
}

ok(assignedComponentCount === 4, `Counted ${assignedComponentCount} assigned custom-pleading components rather than four.`);
ok(excludedComponents.length === 6, `Counted ${excludedComponents.length} excluded components rather than six.`);
ok(
  excludedComponents.filter((c) => c.strategy === "official_pdf_fill").length === 4,
  "The four official_pdf_fill components are not all recorded as another lane's."
);
ok(
  excludedComponents.every((c) => MO_EXCLUDED_COMPONENT_ROLES.some((r) => r.role === c.role)),
  "An excluded component carries a role the module does not record as another lane's."
);
ok(Object.keys(MO_CUSTOM_PLEADING_TEMPLATES).length === 4, "The module does not register exactly four templates.");

note(
  `1. Assignment: exactly two assigned tracks and their 4 assigned custom-pleading components, each pinned to the design's component id, order, requirement, role and template, and each with a governing custom-pleading specification; the ${excludedComponents.length} components on the same routes that belong to other lanes — four official_pdf_fill (the FI-05 cover sheets and the GN10 fee waivers) and two process_guidance — are recorded and excluded rather than produced; every declared participant input is asked under the design's own key; both memos approve with no build blocker and no legal-design blocker, both set the local-form override, and both still carry open release questions.`
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

// An unmarked box is a finding nobody has made, so it counts as a negation.
const NEGATION =
  /\(\s\s\)|\b(not|no|never|nothing|nobody|none|refuses?|declines?|blank|unsigned|unmarked|without|outside|neither)\b/i;
function assertedIn(text, pattern) {
  // A full stop ends a sentence only after a lowercase letter, a digit or a
  // closing bracket; splitting on every full stop tears "Mo. Rev. Stat. § ..."
  // apart and loses the negation that governs the sentence.
  const sentences = String(text).split(/(?<=[a-z0-9)])[.!?]\s+|\\n|","/);
  return sentences.some((sentence) => {
    const match = sentence.match(pattern);
    if (!match) return false;
    return !NEGATION.test(sentence.slice(0, sentence.indexOf(match[0])));
  });
}

const NEVER_PRESENT = [
  [/\$\s?\d/, "prints a monetary amount, and neither section fixes a fee"],
  [/\(\s*[xX]\s*\)|\[\s*[xX]\s*\]/, "prints a marked finding box"],
  [/\/s\//i, "prints a conformed signature"],
  [/\bcase type code\s*:\s*[A-Z0-9]/i, "fills in an FI-05 case type code, which the Case Types List does not publish for either section"],
  [/\b(XG|X5)\b/, "guesses one of the published expungement case type codes for a section the list does not name"],
  [/\bhearing (is )?set for|\bhearing date\s*:\s*\S/i, "prints a hearing date the court has not set"],
  [/subscribed and sworn|notary public|my commission expires/i, "prints a notarial block, though both sections use a declaration under penalty of perjury"],
  [/\bservice (was|has been) (made|completed|effected)\b/i, "states that service has already happened"],
  [/\b\d{3}-\d{2}-\d{4}\b/, "prints something shaped like a social security number"]
];

const ONLY_DENIED = [
  [/\bwill be granted\b|\bthe court will grant\b|\bis entitled to\b/i, "predicts the outcome"],
  [/\b(immigration|firearm|professional licens|insurance)/i, "speaks to an immigration, firearms, licensing or insurance consequence"],
  [/\b(at the court's discretion|the court may in its discretion)\b/i, "describes the relief as discretionary, though both sections say the court SHALL enter the order"],
  [/\bis an alcohol-related enforcement contact\b/i, "decides whether an entry is an alcohol-related enforcement contact"],
  [/\b(prosecuting|city) attorney (has |had )?(agreed|consented|no objection)/i, "reports that the prosecutor agreed to something"],
  [/\bthe applicant'?s? (first|only) (violation|offence|offense) (is|was) established\b/i, "asserts firstness as established rather than as the applicant's own allegation"]
];

let templatesChecked = 0;
for (const template of Object.values(MO_CUSTOM_PLEADING_TEMPLATES)) {
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
    /\{\{courtLine\}\}/.test(template.caption.courtLine),
    `${template.templateId}: the court line is not built from the applicant's own answers.`
  );
  ok(
    /Case No. _+/.test(JSON.stringify(template.caption.partyBlockRight)),
    `${template.templateId}: does not leave the case number blank for the clerk.`
  );
}
ok(templatesChecked === 4, `Checked ${templatesChecked} templates rather than four.`);

// Each route cites its own section and never treats the other's as its authority.
for (const [trackId, section, foreign] of [
  [MO_MIP_TRACK_ID, "311.326", "610.130"],
  [MO_DWI_TRACK_ID, "610.130", "311.326"]
]) {
  const track = MO_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  for (const component of track.packetSet.components) {
    const source = sourceOf(pleadingTemplate(component.templateId));
    ok(source.includes(section), `${component.componentId}: does not cite § ${section}.`);
    ok(!source.includes(foreign), `${component.componentId}: cites § ${foreign}, which belongs to the other route.`);
  }
}

// Both applications carry the design's non-negotiables.
for (const applicationId of ["mo-311-326-application", "mo-610-130-application"]) {
  const template = pleadingTemplate(applicationId);
  const source = sourceOf(template);
  ok(
    source.includes(
      "any suspension or revocation under sections 302.500 to 302.540, any suspension or revocation entered in this state or any other state for a refusal to submit to chemical testing under an implied consent law, and any conviction in any state involving driving while intoxicated"
    ),
    `${applicationId}: does not reproduce the § 302.525.3 definition verbatim, which the design requires because an applicant will otherwise think only of convictions.`
  );
  ok(
    /makes no statement about whether any particular entry on any driver record is or is not such a contact/.test(source),
    `${applicationId}: does not disclaim deciding whether an entry is an enforcement contact.`
  );
  ok(
    /ONE expungement, for life|ONE EXPUNGEMENT, EVER/i.test(source),
    `${applicationId}: does not carry the once-in-a-lifetime warning.`
  );
  ok(
    /ONE EXPUNGEMENT, EVER/.test(JSON.stringify(template.signatureBlock)),
    `${applicationId}: the once-in-a-lifetime warning is not above the signature block, which is where the design puts it.`
  );
  ok(
    /SHALL enter an order of expungement/.test(source),
    `${applicationId}: does not record that the relief is mandatory on the conditions.`
  );
  ok(
    /the relief is mandatory on those (conditions|findings) and this application does not describe it as discretionary/i.test(source),
    `${applicationId}: does not say in terms that the relief is not discretionary.`
  );
  ok(
    /case type code on it is left blank/.test(source) && /will not guess one/.test(source),
    `${applicationId}: does not record that the FI-05 case type code is left blank rather than guessed.`
  );
  ok(
    /declares under penalty of perjury/.test(template.verification ?? ""),
    `${applicationId}: carries no declaration under penalty of perjury.`
  );
  // The certificate lives inside the signature block so that the engine's
  // keep-together reservation covers it; `certificateOfService` gets none.
  const execution = JSON.stringify(template.signatureBlock ?? []);
  ok(
    (template.certificateOfService ?? []).length === 0,
    `${applicationId}: puts the certificate in the field the renderer never reserves space for.`
  );
  ok(
    /CERTIFICATE OF SERVICE . OPTIONAL, AND UNEXECUTED/.test(execution),
    `${applicationId}: the certificate of service is not marked optional and unexecuted, though neither section prescribes service.`
  );
  ok(/Date of service: _+/.test(execution), `${applicationId}: the certificate of service does not leave the date blank.`);
  ok(
    /\(\s\s\) United States mail/.test(execution) && /\(\s\s\) Hand delivery/.test(execution),
    `${applicationId}: the method of service is not left unmarked.`
  );
  ok(
    /\{\{firstnessStatement\}\}/.test(source),
    `${applicationId}: does not carry the firstness recital, which is derived so that it reads as the applicant's own allegation.`
  );
  ok(
    /No Missouri court forms are prepared|no Missouri court forms are prepared|publishes no form for this section/.test(source),
    `${applicationId}: does not record that no statewide form exists, which is why this is a drafted pleading.`
  );
}

// Route-specific boundaries.
const mipApplication = sourceOf(pleadingTemplate("mo-311-326-application"));
ok(
  /runs its period from the applicant's twenty-first birthday and not from the offence or the conviction/.test(mipApplication),
  "The minor-in-possession application does not record that the period runs from the birthday."
);
ok(/UPON REVIEW/.test(mipApplication), "The minor-in-possession application does not record the upon-review wording.");
ok(
  /may not be given a hearing date at all/.test(mipApplication),
  "The minor-in-possession application does not preserve the open hearing question."
);
ok(
  /302\.700/.test(mipApplication),
  "The minor-in-possession application does not carry the commercial-motor-vehicle bar."
);

const dwiApplication = sourceOf(pleadingTemplate("mo-610-130-application"));
ok(
  /610\.140\.3\(7\)/.test(dwiApplication) && /610\.140\.3\(8\)/.test(dwiApplication),
  "The intoxication application does not record that § 610.140 excludes it twice over."
);
ok(
  /This application is made under . ?610\.130 alone/.test(dwiApplication) ||
    /is made under . ?610\.130 alone/.test(dwiApplication),
  "The intoxication application does not say it is not a § 610.140 application."
);
ok(
  /AFTER HEARING/.test(dwiApplication),
  "The intoxication application does not record that the findings are made after a hearing."
);
ok(
  /never been issued a commercial driver's licence in Missouri or in any other state/.test(dwiApplication),
  "The intoxication application does not plead the ever-held commercial-licence bar across every state."
);
ok(
  /prescribes no notice recipients and no service rule/.test(dwiApplication),
  "The intoxication application does not preserve the open notice question."
);
ok(
  /not less than ten years/.test(dwiApplication),
  "The intoxication application does not state the ten-year period."
);

// Both proposed orders leave every judicial field blank.
for (const templateId of ["mo-311-326-proposed-order", "mo-610-130-proposed-order"]) {
  const template = pleadingTemplate(templateId);
  const source = sourceOf(template);
  ok(template.signatureLabel === null, `${templateId}: prints an applicant signature rule on a proposed order.`);
  ok(!template.verification, `${templateId}: verifies a proposed order, which the Court signs.`);
  ok(/JUDGE/.test(source), `${templateId}: has no judicial signature block to leave blank.`);
  ok(/\(\s\s\)/.test(source), `${templateId}: carries no unmarked determination box.`);
  ok(
    /NOW on this ______ day of ____________________, 20____/.test(source),
    `${templateId}: does not leave the order's own date blank.`
  );
  ok(
    /left blank for the Court. Nothing on this page has been decided/.test(source),
    `${templateId}: does not say on its face that nothing has been decided.`
  );
  ok(
    /\{\{agencyDirective\}\}/.test(source),
    `${templateId}: does not direct the agencies the applicant named to expunge their records.`
  );
  ok(
    !/\{\{agencyStatement\}\}/.test(source),
    `${templateId}: reuses the application's "the applicant believes" sentence as an order, which is not what an order says.`
  );
}

note(
  "2. Boundaries: every document cites its own section and never the other route's; none prints a fee, a marked box, a conformed signature, an FI-05 case type code, a guessed expungement code, a hearing date, a notarial block or a completed service fact; none predicts an outcome, describes the relief as discretionary, decides whether an entry is an alcohol-related enforcement contact, asserts firstness as established, reports a prosecutor's position, or speaks to immigration, firearms, licensing or insurance; both applications reproduce the § 302.525.3 definition verbatim, disclaim deciding whether any entry is a contact, carry the once-in-a-lifetime warning above the signature block, record that the relief is mandatory, leave the case type code blank rather than guessing it, use a declaration under penalty of perjury, carry an optional unexecuted certificate of service and frame firstness as the applicant's own allegation; the minor-in-possession application records the birthday-based period, the upon-review wording, the open hearing question and the commercial-vehicle bar; the intoxication application records the § 610.140 non-overlap, the after-hearing findings, the ever-held commercial-licence bar, the ten-year period and the open notice question; both proposed orders leave every determination, date and signature blank."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical per assigned track, plus variants
// ---------------------------------------------------------------------------

const mipBase = (overrides = {}) => ({
  fullName: "Priya Elowen Nakashima",
  dateOfBirth: "6 March 1999",
  currentAddress: "2214 Rockhill Terrace, Apartment 3, Columbia, Missouri 65201",
  section311325Violation: "section 311.325",
  firstViolation: "yes",
  sentencingCourt: "Circuit Court of Boone County, Associate Division",
  sentencingDate: "14 November 2018, case number 18BA-CR03291",
  subsequentAlcoholOffense: "no",
  alcoholEnforcementContacts: "no",
  cdlStatus: "no",
  priorSection311326Expungement: "no",
  agencyList:
    "The Circuit Court of Boone County; the Columbia Police Department; the Boone County Prosecuting Attorney; and the Missouri State Highway Patrol Criminal Justice Information Services Division.",
  agencyListConfirmed: "yes",
  feeWaiverNeeded: "no",
  ...overrides
});

const dwiBase = (overrides = {}) => ({
  fullName: "Cormac Aurelio Bettencourt",
  dateOfBirth: "22 September 1978",
  currentAddress: "708 Wyandotte Street, Kansas City, Missouri 64105",
  offenseDescription: "Driving while intoxicated, first offence",
  offenseLevel: "state misdemeanor",
  pleaOrSentenceDate: "3 June 2012",
  courtOfPlea: "Circuit Court of Jackson County, Associate Division at Kansas City",
  caseNumber: "1216-CR02277",
  firstOffense: "yes",
  subsequentIntoxicationConviction: "no",
  alcoholEnforcementContacts: "no",
  pendingMatters: "no",
  cdlEverIssued: "no",
  commercialVehicle: "no",
  priorSection610130Expungement: "no",
  agencyList:
    "The Circuit Court of Jackson County; the Kansas City Police Department; the Jackson County Prosecuting Attorney; the Missouri State Highway Patrol; and the Missouri Department of Revenue.",
  agencyListConfirmed: "yes",
  feeWaiverNeeded: "no",
  ...overrides
});

const FIXTURES = [
  { fixtureId: "mo-311-326-first-violation-1", trackId: MO_MIP_TRACK_ID, answers: mipBase() },
  {
    fixtureId: "mo-311-326-fee-waiver-needed-2",
    trackId: MO_MIP_TRACK_ID,
    variantOf: "mo-311-326-first-violation-1",
    variantPurpose:
      "The fee-waiver answer changes the operative recital from a statement that the applicant will pay the clerk's fee to a statement that they will ask the Court to allow the filing without it, and it is the answer that engages the GN10 component this lane does not produce. It is a material branch on what the applicant is told to do next, not a wording change.",
    answers: mipBase({ feeWaiverNeeded: "yes" })
  },
  { fixtureId: "mo-610-130-state-misdemeanour-1", trackId: MO_DWI_TRACK_ID, answers: dwiBase() },
  {
    fixtureId: "mo-610-130-city-ordinance-fee-waiver-2",
    trackId: MO_DWI_TRACK_ID,
    variantOf: "mo-610-130-state-misdemeanour-1",
    variantPurpose:
      "Section 610.130.1 reaches a misdemeanour OR a county or city ordinance violation and excludes a felony, so the level answer changes the operative eligibility recital; and a municipal division is the other venue the section contemplates, which changes the caption. The fee-waiver branch rides along on the same fixture.",
    answers: dwiBase({
      offenseLevel: "county or city ordinance",
      offenseDescription: "Driving while intoxicated, city ordinance violation",
      courtOfPlea: "Municipal Division of the Circuit Court of Greene County, City of Springfield",
      caseNumber: "MC-2012-118842",
      feeWaiverNeeded: "yes"
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
  ok(canonical && canonical.trackId === fixture.trackId, `${fixture.fixtureId}: names a canonical fixture on a different track.`);
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
  ["the applicant's name is missing", MO_MIP_TRACK_ID, mipBase({ fullName: "" }), "mo-answer-missing"],
  ["the case number is missing", MO_DWI_TRACK_ID, dwiBase({ caseNumber: "" }), "mo-answer-missing"],
  ["the sentencing court is not identified", MO_MIP_TRACK_ID, mipBase({ sentencingCourt: "I am not sure" }), "mo-venue-not-identified"],
  ["the court of plea is not identified", MO_DWI_TRACK_ID, dwiBase({ courtOfPlea: "I do not know" }), "mo-venue-not-identified"],
  ["the charge was an ordinance, not the statute", MO_MIP_TRACK_ID, mipBase({ section311325Violation: "city or county ordinance" }), "mo-mip-ordinance-not-the-statute"],
  ["the charge basis is unsettled", MO_MIP_TRACK_ID, mipBase({ section311325Violation: "unsure" }), "mo-mip-charge-basis-not-established"],
  ["it was not the first violation", MO_MIP_TRACK_ID, mipBase({ firstViolation: "no" }), "mo-mip-not-first-violation"],
  ["firstness is unsettled on the MIP route", MO_MIP_TRACK_ID, mipBase({ firstViolation: "unsure" }), "mo-mip-firstness-not-established"],
  ["there is a later alcohol-related conviction", MO_MIP_TRACK_ID, mipBase({ subsequentAlcoholOffense: "yes" }), "mo-mip-subsequent-alcohol-offence"],
  ["an enforcement contact is reported", MO_MIP_TRACK_ID, mipBase({ alcoholEnforcementContacts: "yes" }), "mo-alcohol-enforcement-contact"],
  ["the driver record has not been read", MO_DWI_TRACK_ID, dwiBase({ alcoholEnforcementContacts: "unsure" }), "mo-alcohol-record-not-established"],
  ["a commercial licence or vehicle on the MIP route", MO_MIP_TRACK_ID, mipBase({ cdlStatus: "yes" }), "mo-mip-commercial-driver"],
  ["the MIP expungement is already used", MO_MIP_TRACK_ID, mipBase({ priorSection311326Expungement: "yes" }), "mo-mip-expungement-already-used"],
  ["the date of birth is a shrug", MO_MIP_TRACK_ID, mipBase({ dateOfBirth: "some time in the nineties" }), "mo-mip-age-not-established"],
  ["the applicant is not yet twenty-two", MO_MIP_TRACK_ID, mipBase({ [MO_PREPARATION_DATE_KEY]: "2019" }), "mo-mip-age-window-not-open"],
  ["the offence was a felony", MO_DWI_TRACK_ID, dwiBase({ offenseLevel: "felony" }), "mo-dwi-felony-not-eligible"],
  ["the offence level is unsettled", MO_DWI_TRACK_ID, dwiBase({ offenseLevel: "unsure" }), "mo-dwi-offence-level-not-established"],
  ["it was not the first intoxication offence", MO_DWI_TRACK_ID, dwiBase({ firstOffense: "no" }), "mo-dwi-not-first-offence"],
  ["firstness is unsettled on the DWI route", MO_DWI_TRACK_ID, dwiBase({ firstOffense: "unsure" }), "mo-dwi-firstness-not-established"],
  ["there is a later intoxication conviction", MO_DWI_TRACK_ID, dwiBase({ subsequentIntoxicationConviction: "yes" }), "mo-dwi-subsequent-conviction"],
  ["a matter is pending now", MO_DWI_TRACK_ID, dwiBase({ pendingMatters: "yes" }), "mo-dwi-matter-pending"],
  ["a commercial licence has ever been issued", MO_DWI_TRACK_ID, dwiBase({ cdlEverIssued: "yes" }), "mo-dwi-commercial-licence-ever-issued"],
  ["a commercial vehicle at the time of the offence", MO_DWI_TRACK_ID, dwiBase({ commercialVehicle: "yes" }), "mo-dwi-commercial-vehicle-offence"],
  ["the DWI expungement is already used", MO_DWI_TRACK_ID, dwiBase({ priorSection610130Expungement: "yes" }), "mo-dwi-expungement-already-used"],
  ["the plea date is not established", MO_DWI_TRACK_ID, dwiBase({ pleaOrSentenceDate: "I cannot recall" }), "mo-dwi-plea-date-not-established"],
  ["ten years have not passed", MO_DWI_TRACK_ID, dwiBase({ [MO_PREPARATION_DATE_KEY]: "2018" }), "mo-dwi-ten-year-period-not-elapsed"],
  ["an out-of-state matter is reported", MO_DWI_TRACK_ID, dwiBase({ alcoholEnforcementContacts: "no, but there was something in Illinois" }), "mo-out-of-state-record"],
  ["the agency list has not been checked", MO_MIP_TRACK_ID, mipBase({ agencyListConfirmed: "no" }), "mo-agency-list-not-confirmed"],
  ["the agency list has not been checked on the DWI route", MO_DWI_TRACK_ID, dwiBase({ agencyListConfirmed: "no" }), "mo-agency-list-not-confirmed"],
  ["a court determination is supplied", MO_MIP_TRACK_ID, mipBase({ courtDetermination: "The court determines the conditions are met" }), "mo-outside-party-content-refused"],
  ["a hearing date is supplied", MO_DWI_TRACK_ID, dwiBase({ hearingDate: "4 May 2026" }), "mo-outside-party-content-refused"],
  ["a case type code is supplied", MO_DWI_TRACK_ID, dwiBase({ caseTypeCode: "XG" }), "mo-outside-party-content-refused"],
  ["a completed service fact is supplied", MO_MIP_TRACK_ID, mipBase({ serviceCompletedDate: "2 April 2026" }), "mo-outside-party-content-refused"],
  ["the prosecutor's position is supplied", MO_DWI_TRACK_ID, dwiBase({ prosecutorPosition: "No objection" }), "mo-outside-party-content-refused"],
  ["an immigration question is raised", MO_MIP_TRACK_ID, mipBase({ immigrationStatus: "I am not a US citizen" }), "mo-immigration-consequences-attorney-only"],
  ["a professional licence is the reason", MO_DWI_TRACK_ID, dwiBase({ professionalLicence: "yes, I am applying for a nursing licence" }), "mo-collateral-purpose-attorney-only"],
  ["a firearms question is the reason", MO_MIP_TRACK_ID, mipBase({ firearmsQuestion: "yes, I want to buy a rifle" }), "mo-collateral-purpose-attorney-only"],
  ["federal employment is the reason", MO_DWI_TRACK_ID, dwiBase({ federalEmployment: "yes, a background investigation" }), "mo-collateral-purpose-attorney-only"]
];

let stopped = 0;
const stopIdsSeen = new Set();
for (const [label, trackId, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveMissouriFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof MissouriEligibilityStopError,
    `${label} (${trackId}) did not fail closed with a typed stop; got ${caught?.name ?? "no error"}.`
  );
  if (caught instanceof MissouriEligibilityStopError) {
    ok(caught.stopId === expectedStopId, `${label} raised ${caught.stopId} rather than ${expectedStopId}.`);
    ok(caught.trackId === trackId, `${label} reported the wrong track.`);
    ok(caught.reason.length > 60, `${label} gives no reason a person could act on.`);
    ok(MO_REFERRALS.includes(caught.referral), `${label} names a destination outside the module's referral set.`);
    ok(caught.nextStep.length > 30, `${label} gives no next step a person could take.`);
    stopped += 1;
    stopIdsSeen.add(caught.stopId);
  }
}
ok(stopped === NEGATIVE.length, `Only ${stopped} of ${NEGATIVE.length} negative cases failed closed.`);

const stopFor = (trackId, answers) => {
  try {
    deriveMissouriFacts(trackId, answers);
  } catch (error) {
    return error;
  }
  return null;
};
ok(
  stopFor(MO_DWI_TRACK_ID, dwiBase({ alcoholEnforcementContacts: "unsure" }))?.referral === MO_DRIVER_RECORD_REFERRAL,
  "The unread-driver-record stop does not send the applicant to the Department of Revenue."
);
ok(
  stopFor(MO_MIP_TRACK_ID, mipBase({ subsequentAlcoholOffense: "yes" }))?.referral === MO_INTOXICATION_ROUTE_REFERRAL,
  "A later alcohol conviction on the MIP route does not point at the section that reaches it."
);
ok(
  stopFor(MO_MIP_TRACK_ID, mipBase({ firstViolation: "unsure" }))?.referral === MO_COURT_RECORD_REFERRAL,
  "The unsettled-firstness stop does not send the applicant to the record that settles it."
);
ok(
  stopFor(MO_MIP_TRACK_ID, mipBase({ [MO_PREPARATION_DATE_KEY]: "2019" }))?.referral === MO_CLERK_REFERRAL,
  "The age-window stop does not route the applicant onward."
);
ok(
  stopFor(MO_DWI_TRACK_ID, dwiBase({ cdlEverIssued: "yes" }))?.referral === MO_LAWYER_REFERRAL,
  "The commercial-licence bar does not refer the applicant on."
);
ok(
  MO_REFERRALS.every((r) => r.length > 40 && !/\b\d{3}[- ]\d{4}\b/.test(r)),
  "A referral destination is empty, or carries a telephone number the design never supplied."
);

const BRANCH_CASES = [
  [MO_MIP_TRACK_ID, mipBase({ section311325Violation: "juvenile" })],
  [MO_MIP_TRACK_ID, mipBase({ firstViolation: "probably" })],
  [MO_MIP_TRACK_ID, mipBase({ cdlStatus: "expired" })],
  [MO_DWI_TRACK_ID, dwiBase({ offenseLevel: "infraction" })],
  [MO_DWI_TRACK_ID, dwiBase({ pendingMatters: "one is on appeal" })]
];
let branchRejected = 0;
for (const [trackId, answers] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveMissouriFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof MissouriBranchError, `An out-of-list answer on ${trackId} was accepted.`);
  if (caught instanceof MissouriBranchError) branchRejected += 1;
}
for (const trackId of ["mo-610-140-general", "mo-577-054", "mo-something-else"]) {
  let caught = null;
  try {
    deriveMissouriFacts(trackId, {});
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof MissouriBranchError, `An unassigned track identifier ${trackId} was accepted.`);
}

ok(Object.keys(MO_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(new Set(Object.values(MO_YES_NO_UNSURE)).size === 3, "The yes-no-unsure list changed size.");
ok(new Set(Object.values(MO_MIP_CHARGE_BASIS)).size === 3, "The charge-basis list changed size.");
ok(new Set(Object.values(MO_OFFENSE_LEVELS)).size === 4, "The offence-level list changed size.");
ok(MO_OUTSIDE_PARTY_KEYS.length >= 8, "The outside-party key guard was narrowed.");
ok(MO_SCREENED_ROUTING_KEYS.length >= 4, "The routing-screen key list was narrowed.");
ok(MO_REFERRALS.length === 5, "The referral destination set changed size.");
ok(
  MO_ENFORCEMENT_CONTACT_DEFINITION.includes("302.500 to 302.540") &&
    MO_ENFORCEMENT_CONTACT_DEFINITION.includes("implied consent law"),
  "The § 302.525.3 definition has been paraphrased rather than reproduced."
);

// A denial is not an assertion: a volunteered "no" must not stop the route.
const denied = deriveMissouriFacts(
  MO_MIP_TRACK_ID,
  mipBase({ professionalLicence: "no, I have never held one", firearmsQuestion: "no, none" })
);
ok(Boolean(denied.firstnessStatement), "A denial of a collateral purpose was treated as an assertion of one.");

note(
  `4. Stops: ${stopped} negative cases across both routes fail closed with the expected typed stop, a reason, a destination drawn from the module's own five-destination referral set and a next step; ${stopIdsSeen.size} distinct stop families are exercised, covering missing participant facts, an unresolved venue, an ordinance charge rather than the statute, an unsettled charge basis, a violation that was not the first and firstness that has not been checked on both routes, a later alcohol or intoxication conviction, a reported enforcement contact, a driver record nobody has read, an out-of-state matter, a commercial licence or vehicle on both routes, an expungement already used on both routes, an unestablished date of birth or plea date, an unopened age window, a ten-year period that has not run, a felony level, an unsettled level, a matter pending now, an unchecked agency list, an attorney-only immigration question, a collateral purpose, and every attempt to supply a court determination, a hearing date, an FI-05 case type code, a completed service fact or the prosecutor's position; every stop routes away from the node that raised it; ${branchRejected} out-of-list branch values rejected; three unassigned track identifiers refused; seven closed lists hold their size.`
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
// The writer re-wraps on whitespace, so "one:   (  ) United" is drawn as
// "one: ( ) United". Every page lookup compares on collapsed whitespace.
const flat = (value) => String(value).replace(/\s+/g, " ").trim();
// The applicant's address appears in the identification paragraph as well as in
// the execution block, so the block has to be located by its last occurrence or
// page 1 masks page 5 and every packet looks split.
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
  const facts = deriveMissouriFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "MO",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);
  ok(resolved.components.length === 2, `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than two.`);

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "MO",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);
    const again = await renderPacketComponent({
      component,
      jurisdiction: "MO",
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
    // The optional certificate is one block or it is not a form anyone can use.
    if (component.role === "primary_filing") {
      const recital = lastPageOf(pages, "certify that I served");
      const dateLine = lastPageOf(pages, "Date of service");
      const signature = lastPageOf(pages, "Signature: ");
      ok(
        recital !== -1 && dateLine !== -1 && signature !== -1,
        `${fixture.fixtureId}/${component.componentId}: the optional certificate block did not render in full.`
      );
      ok(
        recital === dateLine && recital === signature,
        `${fixture.fixtureId}/${component.componentId}: the optional certificate block is split across pages ${recital + 1}, ${dateLine + 1} and ${signature + 1}.`
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
      `${fixture.fixtureId}/${component.componentId}: prints a fee amount, and neither section fixes one.`
    );
    ok(
      !/^\s*(yes|no|unsure|felony|state misdemeanor|ordinance)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare branch answer is rendered on a line of its own.`
    );
    ok(!/\{\{|\}\}/.test(rendered), `${fixture.fixtureId}/${component.componentId}: an unresolved placeholder reached the page.`);
    ok(!/\(\s*[xX]\s*\)/.test(rendered), `${fixture.fixtureId}/${component.componentId}: a box is rendered already marked.`);
    ok(
      /302\.525/.test(rendered) || component.role === "proposed_order",
      `${fixture.fixtureId}/${component.componentId}: the rendered application does not carry the § 302.525 definition.`
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
    jurisdiction: "MO",
    jurisdictionName: "Missouri",
    packetName: resolved.track.assembledPacketName,
    caseReference: facts.packetCaseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(assembled.sha256 === againAssembled.sha256, `${fixture.fixtureId}: assembly is not deterministic.`);
  ok(
    assembled.componentRanges.map((r) => r.role).join(",") === "primary_filing,proposed_order",
    `${fixture.fixtureId}: the assembled packet is not in application, proposed order order.`
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
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, none trailing empty, no heading stranded from its section, no execution block or optional certificate block split across pages, no line past the margin, no paragraph repeated, no bare branch answer, no unresolved placeholder, no marked box, no fee amount, and the § 302.525 definition present on the face of every application.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const mipFacts = deriveMissouriFacts(MO_MIP_TRACK_ID, mipBase());
ok(mipFacts.fullName === mipBase().fullName, "The applicant's name was rewritten rather than carried through.");
ok(
  mipFacts.agencyStatement.includes(mipBase().agencyList) &&
    mipFacts.agencyDirective === mipBase().agencyList,
  "The applicant's agency list was rewritten rather than carried through, or the order's directive reuses the application's sentence."
);
ok(
  /own allegation under the declaration below/.test(mipFacts.firstnessStatement),
  "The firstness recital does not frame the allegation as the applicant's own."
);
ok(
  mipFacts.courtLine === "IN THE CIRCUIT COURT OF BOONE COUNTY, ASSOCIATE DIVISION, STATE OF MISSOURI",
  `The minor-in-possession caption is ${mipFacts.courtLine}.`
);
const mipWaiver = deriveMissouriFacts(MO_MIP_TRACK_ID, mipBase({ feeWaiverNeeded: "yes" }));
ok(
  /will pay the filing fee/.test(mipFacts.feeWaiverStatement) &&
    /cannot pay the filing fee/.test(mipWaiver.feeWaiverStatement),
  "The fee-waiver answer does not change the operative recital."
);
ok(
  /separate court form, which the clerk of this Court supplies and which is not part of this document/.test(
    mipWaiver.feeWaiverStatement
  ),
  "The fee-waiver recital does not record that the GN10 is another lane's document."
);

const dwiFacts = deriveMissouriFacts(MO_DWI_TRACK_ID, dwiBase());
ok(
  /state misdemeanour/.test(dwiFacts.levelStatement),
  "A state-misdemeanour answer does not produce its own level recital."
);
const ordinanceFacts = deriveMissouriFacts(
  MO_DWI_TRACK_ID,
  dwiBase({ offenseLevel: "county or city ordinance" })
);
ok(
  /county or city ordinance violation/.test(ordinanceFacts.levelStatement) &&
    ordinanceFacts.levelStatement !== dwiFacts.levelStatement,
  "The offence-level answer does not change the operative eligibility recital."
);
ok(
  /does not state that the period has run/.test(dwiFacts.periodStatement) &&
    dwiFacts.periodStatement.includes("3 June 2012"),
  "The ten-year recital asserts the period has run, or loses the applicant's own date."
);
ok(
  deriveMissouriFacts(
    MO_DWI_TRACK_ID,
    dwiBase({ courtOfPlea: "Municipal Division of the Circuit Court of Greene County, City of Springfield" })
  ).courtLine.startsWith("IN THE MUNICIPAL DIVISION"),
  "A municipal division answer does not produce a municipal caption."
);

for (const fixture of FIXTURES) {
  const facts = deriveMissouriFacts(fixture.trackId, fixture.answers);
  const track = MO_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === fixture.trackId);
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key) && String(facts[input.key]).trim() !== "",
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!/^(yes|no|unsure|state_misdemeanor|county_or_city_ordinance|felony|section_311_325|city_or_county_ordinance)$/.test(value)) {
      continue;
    }
    ok(
      !key.endsWith("Statement") && !key.endsWith("Line"),
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
ok(new Set(results.map((r) => r.trackId)).size === 2, "The fixtures do not cover both assigned tracks.");

note(
  "6. Values: the applicant's answers and agency list are carried through verbatim; firstness is framed as the applicant's own allegation under the declaration; the fee-waiver answer changes the operative recital and records that the GN10 is another lane's document; the offence-level answer changes the eligibility recital between a state misdemeanour and a county or city ordinance violation; the ten-year recital keeps the applicant's own date and refuses to say the period has run; an associate division and a municipal division each produce their own caption; every declared required input reaches the fact bag with a value; no derived sentence carries a bare branch answer; and all four fixtures assemble to distinct bytes."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const entry of MO_CUSTOM_PLEADING_TRACKS) {
  ok(entry.statuses.runtime === "runtime_disabled", `${entry.trackId}: is not runtime-disabled.`);
  ok(entry.runtimeDisabled === true, `${entry.trackId}: is not hard-disabled.`);
  ok(entry.technicalFixture === true, `${entry.trackId}: is not a technical fixture.`);
  ok(entry.statuses.legal === "not_submitted", `${entry.trackId}: claims a legal review status.`);
  ok(entry.statuses.visual === "not_reviewed", `${entry.trackId}: claims a visual review status.`);
  ok(entry.jurisdiction === "MO", `${entry.trackId}: is not a Missouri track.`);
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
  console.error("Missouri custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Missouri custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(44)} ${result.trackId.padEnd(32)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(3)} pages  sha256=${result.sha256}`
  );
}
console.log("\nAssigned components not produced by this lane:");
for (const component of excludedComponents.sort((a, b) => a.componentId.localeCompare(b.componentId))) {
  console.log(
    `  ${component.componentId.padEnd(48)} ${component.role.padEnd(14)} ${component.strategy.padEnd(18)} ${String(component.officialFormId ?? "").padEnd(6)} ${component.requirement}`
  );
}
