// Kentucky KRS 218A.276 void-and-seal route — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Kentucky is not enabled and its shared surfaces are untouched, the assignment
// is exactly one track and its two assigned custom-pleading components, every
// component has a governing legal-design specification, and the design's
// boundaries hold on the face of both documents.
//
// Two of those boundaries are the reason this job exists as a split:
//
//   - `ky_void_seal_controlled_substance` is a separate, blocked assignment.
//     Section 1 proves it is absent from the implemented track set, from the
//     module's closed list and from every rendered byte, and that its own
//     KRS 218A.275 mechanism is never recited here.
//   - The design's middle component, AOC-334, is `official_pdf_fill` and
//     belongs to another lane. Section 1 proves this module does not produce
//     it, and section 2b proves the motion names it, says where it comes from
//     and says the packet is incomplete without it.
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
  KENTUCKY_CUSTOM_PLEADING_TRACKS,
  KENTUCKY_PLEADING_TEMPLATES,
  KY_DESIGN_ROLE_TO_ENGINE_ROLE,
  KY_ASSIGNED_TRACK_IDS,
  KY_EXCLUDED_TRACK_IDS,
  KY_EXCLUDED_OFFICIAL_FORM_COMPONENTS,
  KY_COURT_LEVELS,
  KY_OFFENCE_GROUPS,
  KY_COMPLETION_TYPES,
  KY_PROSECUTOR_OFFICES,
  KY_YES_NO_UNSURE,
  KY_OUTSIDE_PARTY_KEYS,
  KY_REFERRAL,
  KY_RECORD_REFERRAL,
  KY_CLERK_REFERRAL,
  deriveKentuckyFacts,
  KentuckyBranchError,
  KentuckyEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/kentucky/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const TRACK = "ky_void_seal_marijuana_synthetic_salvia";
const ASSIGNED = [TRACK];
const BLOCKED_SIBLING = "ky_void_seal_controlled_substance";
const OFFICIAL_PDF_COMPONENT = `${TRACK}-proposed-order-2`;

// ---------------------------------------------------------------------------
// 0. Kentucky is not enabled, and the shared surfaces are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(KENTUCKY_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "The assigned Kentucky track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("ky-")).length === 0,
  "Kentucky templates are wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of KENTUCKY_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, KENTUCKY_PLEADING_TEMPLATES);

note(
  "0. Enablement: the assigned track and both templates are absent from the shared registry and template pack; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly one track and its two custom-pleading components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specsFile = readJson("data/record-clearing/legal-design-specifications.json");
const specs = specsFile.customPleadingSpecs;
const officialAssignments = specsFile.officialFormAssignments ?? [];
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The implemented track set is not exactly the assigned track set."
);
ok(
  JSON.stringify([...KY_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The module's closed track list is not exactly the assigned track set."
);

// The blocked sibling and the other Kentucky routes belong elsewhere and must
// not arrive here by any path.
ok(
  KY_EXCLUDED_TRACK_IDS.includes(BLOCKED_SIBLING),
  "The module does not record the blocked KRS 218A.275 sibling as excluded, so its absence reads as an oversight."
);
for (const foreign of [
  BLOCKED_SIBLING,
  "ky_misdemeanor_expungement",
  "ky_felony_vacatur_expungement",
  "ky_expungement_certification",
  "ky_criminal_record_segregation",
  "ky_automatic_nonconviction_expungement_verification",
  "ky_diversion_disposition_routing"
]) {
  ok(!assignedIds.has(foreign), `${foreign} is implemented here and belongs to another assignment or lane.`);
  ok(
    !KY_ASSIGNED_TRACK_IDS.includes(foreign),
    `${foreign} appears in the module's closed track list.`
  );
  let derived = null;
  try {
    derived = deriveKentuckyFacts(foreign, {});
  } catch (error) {
    derived = error;
  }
  ok(
    derived instanceof Error && !(derived instanceof KentuckyEligibilityStopError),
    `${foreign}: the module derived facts for an unassigned track rather than refusing it outright.`
  );
}

const designSet = manifests.find((m) => m.trackId === TRACK);
ok(Boolean(designSet), "The design has no packet set for the assigned track.");

const designCustomPleading = designSet.components.filter((c) => c.outputStrategy === "custom_pleading");
const designOfficialPdf = designSet.components.filter((c) => c.outputStrategy === "official_pdf_fill");
ok(
  designCustomPleading.length === 2 && designOfficialPdf.length === 1,
  `The design's packet set is no longer two custom-pleading components and one official-PDF component: got ${designCustomPleading.length} and ${designOfficialPdf.length}.`
);

const track = KENTUCKY_CUSTOM_PLEADING_TRACKS[0];
const implemented = track.packetSet.components;
ok(implemented.length === 2, `Implemented ${implemented.length} components rather than the two assigned.`);
ok(
  implemented.every((c) => c.outputStrategy === "custom_pleading" && c.rendererStrategy === "custom_pleading"),
  "A component in the implemented packet set is not a custom pleading."
);
ok(
  implemented.every((c) => c.componentId !== OFFICIAL_PDF_COMPONENT),
  "The official-PDF proposed order is implemented here. AOC-334 belongs to the official-PDF lane."
);
ok(
  !JSON.stringify(implemented).includes("official_pdf_fill"),
  "An implemented component claims the official_pdf_fill strategy."
);

// Every implemented component matches the design's own id, role, order and
// requirement, and every design custom-pleading component is implemented.
for (const designComponent of designCustomPleading) {
  const mine = implemented.find((c) => c.componentId === designComponent.componentId);
  ok(Boolean(mine), `${designComponent.componentId}: the design assigns it and it is not implemented.`);
  if (!mine) continue;
  ok(
    mine.role === KY_DESIGN_ROLE_TO_ENGINE_ROLE[designComponent.role],
    `${mine.componentId}: role ${mine.role} does not map from the design's ${designComponent.role}.`
  );
  ok(
    mine.order === designComponent.order,
    `${mine.componentId}: order ${mine.order} is not the design's ${designComponent.order}.`
  );
  ok(
    mine.requirement === designComponent.requirement,
    `${mine.componentId}: requirement ${mine.requirement} is not the design's ${designComponent.requirement}.`
  );
  ok(
    specs.some((s) => s.trackId === TRACK && s.componentId === designComponent.componentId),
    `${designComponent.componentId}: no custom-pleading specification governs it.`
  );
}
// The design's order numbers are kept, so the gap at 2 stays visible.
ok(
  JSON.stringify(implemented.map((c) => c.order)) === "[1,3]",
  "The implemented component order was renumbered around the excluded official-PDF component instead of leaving its gap."
);

// The excluded component is recorded, and recorded accurately.
ok(
  KY_EXCLUDED_OFFICIAL_FORM_COMPONENTS.length === 1 &&
    KY_EXCLUDED_OFFICIAL_FORM_COMPONENTS[0].componentId === OFFICIAL_PDF_COMPONENT,
  "The module does not record the excluded official-PDF component."
);
const officialAssignment = officialAssignments.find((a) => a.componentId === OFFICIAL_PDF_COMPONENT);
ok(Boolean(officialAssignment), "The design has no official-form assignment for the excluded component.");
ok(
  officialAssignment &&
    KY_EXCLUDED_OFFICIAL_FORM_COMPONENTS[0].officialFormId === officialAssignment.officialFormId,
  "The recorded excluded form id does not match the design's official-form assignment."
);

const registryTrack = registry.find((t) => t.trackId === TRACK);
ok(Boolean(registryTrack), "The assigned track is absent from the legal-design track registry.");
ok(
  registryTrack && registryTrack.outputStrategy === "custom_pleading",
  "The registry no longer resolves this track to custom_pleading."
);
ok(
  registryTrack && (registryTrack.buildBlockers ?? []).length === 0,
  "The registry now records a build blocker on this track, so the assignment is no longer deliverable."
);
ok(
  registryTrack && (registryTrack.legalDesignBlockers ?? []).length === 0,
  "The registry now records a legal-design blocker on this track."
);
// The sibling's blocker is the reason for the split and must still be there.
const blockedRegistryTrack = registry.find((t) => t.trackId === BLOCKED_SIBLING);
ok(
  blockedRegistryTrack && (blockedRegistryTrack.legalDesignBlockers ?? []).length > 0,
  "The blocked sibling no longer carries a legal-design blocker. If its question closed, the split assignment needs revisiting rather than silently widening this one."
);

// Declared inputs are the design's, by key and by count.
const designInputs = specs
  .filter((s) => s.trackId === TRACK)
  .flatMap((s) => s.generationRequirements.map((g) => g.key));
const designInputKeys = [...new Set(designInputs)].sort();
ok(
  JSON.stringify(track.requiredInputs.map((i) => i.key).sort()) === JSON.stringify(designInputKeys),
  "The declared participant inputs are not exactly the design's generation requirements."
);
ok(track.requiredInputs.length === 11, `Declared ${track.requiredInputs.length} inputs rather than eleven.`);

note(
  `1. Assignment: exactly 1 assigned track and its 2 assigned custom-pleading components — a motion and a certificate of service — each pinned to the design's component id, role, order and requirement, with the design's eleven participant input keys. The design's third component, AOC-334, is official_pdf_fill and is not produced here; its order number 2 is left as a gap. ${BLOCKED_SIBLING} is absent from the implemented set, from the module's closed list and from derivation, and still carries its own legal-design blocker in the registry.`
);

// ---------------------------------------------------------------------------
// 2. The design's boundaries, on the face of both templates
// ---------------------------------------------------------------------------

const sourceOf = (component) => JSON.stringify(pleadingTemplate(component.templateId));
const filingOf = (t) => t.packetSet.components.find((c) => c.role === "primary_filing");
const certificateOf = (t) => t.packetSet.components.find((c) => c.role === "certificate_of_service");

/**
 * Content neither document may carry.
 *
 * Each pattern matches an assertion rather than a mention, because the honest
 * copy here names findings, service and voiding in order to say who they belong
 * to or that they have not happened. A blunter check would fire on the
 * disclaimers it exists to protect.
 */
const PROHIBITED = [
  [/\$\s?\d/, "a monetary amount, where the design establishes that there is no fee"],
  [/\b(is|are|were|will be|would be) eligible\b/i, "an eligibility assertion, which KRS 218A.276(8) leaves to the court"],
  [/\bwill be (granted|voided|sealed|expunged|cleared)\b/i, "a promise about the result"],
  [/\byour record will be clear\b|\bguaranteed\b/i, "a promise about the result"],
  [/\bthe (court|judge) (finds|has found|found)\b/i, "a judicial finding written as though already made"],
  [/\bthe court has (granted|signed|ordered|voided|sealed)\b/i, "a claim that the court has acted"],
  [/\bservice (was|has been) (made|completed|effected)\b/i, "a claim that service has already happened"],
  [/\bhas been (filed|served|entered)\b/i, "a claim that a filing, a service or an entry has happened"],
  [/\bthe (county attorney|commonwealth's attorney|prosecuting attorney) (agrees|consents|does not object|has no objection)\b/i, "a claim about the prosecuting attorney's position"],
  [/\bthe (waiting period|time) has (run|passed|elapsed)\b/i, "a claim that a period has run"],
  [/\bnotar(y|ial|ized)\b(?!.*\bnot\b)/i, "a notarial requirement the design does not impose"],
  [/\bsworn\b(?!.*\b(ask|if)\b)/i, "a sworn form the design does not impose"]
];

const templateIds = Object.keys(KENTUCKY_PLEADING_TEMPLATES);
ok(templateIds.length === 2, `Registered ${templateIds.length} templates rather than two.`);
for (const templateId of templateIds) {
  const template = KENTUCKY_PLEADING_TEMPLATES[templateId];
  const text = JSON.stringify(template);
  for (const [pattern, description] of PROHIBITED) {
    ok(!pattern.test(text), `${templateId}: carries ${description}.`);
  }
  ok(template.technicalFixture === true, `${templateId}: is not marked a technical fixture.`);
  ok(
    typeof template.fixtureBanner === "string" && /DRAFT PENDING LEGAL REVIEW/.test(template.fixtureBanner),
    `${templateId}: does not carry the draft banner.`
  );
  ok(template.version === "1.0.0", `${templateId}: version drifted from the module's.`);
  // The design says in terms that this motion is not verified. A verification
  // line would assert a form the design does not impose.
  ok(
    template.verification === undefined,
    `${templateId}: carries a verification line, and the design records that the motion is not verified.`
  );
  ok(
    template.signatureLabel === "Movant, self-represented",
    `${templateId}: does not name the movant as the signer, and both documents are the movant's own.`
  );
  ok(
    template.signatureBlock.length > 0,
    `${templateId}: has an empty signature block, so nothing holds its execution block together across a page break.`
  );
  // No judicial or clerk execution block belongs on either of these documents:
  // the only order in this packet is AOC-334 and this job does not produce it.
  //
  // Targeted at the execution block rather than at the word. The motion has to
  // be able to say that the clerk delivers the filing to the judge who decided
  // the case, which is the Clerks' Manual fact the design records, and a check
  // keyed on "judge" would fire on that.
  ok(
    !/judge|clerk/i.test(String(template.signatureLabel ?? "")),
    `${templateId}: names a judge or a clerk as the signer, and both documents are the movant's own.`
  );
  ok(
    !template.signatureBlock.some((line) => /^\s*(judge|deputy clerk|clerk of)\b/i.test(line)),
    `${templateId}: carries a judicial or clerk execution line in its signature block.`
  );
  ok(
    !/\bjudge\b\s*$/im.test(
      (template.sections ?? []).flatMap((s) => s.paragraphs ?? []).join("\n")
    ),
    `${templateId}: carries a bare judicial title on a line of its own, which is an execution block.`
  );
}

const motion = sourceOf(filingOf(track));
const certificate = sourceOf(certificateOf(track));

// The ground, recited from the design's own controlling authority.
for (const [pattern, what] of [
  [/KRS 218A\.276\(1\)/, "the fixed offence list"],
  [/KRS 218A\.276\(8\)/, "the voiding authority"],
  [/KRS 218A\.276\(9\)/, "the sealing duty"],
  [/KRS 218A\.276\(10\)/, "the non-use and non-disclosure rule"],
  [/KRS 27A\.099/, "the exception to sealing"],
  [/KRS 431\.078/, "the expungement that follows a voided conviction"],
  [/KRS 218A\.1422/, "the marijuana possession section"],
  [/KRS 218A\.1430/, "the synthetic-drug section"],
  [/KRS 218A\.1451/, "the salvia section"]
]) {
  ok(pattern.test(motion), `The motion does not cite ${what}.`);
}
ok(
  /\bmay void\b/.test(motion) && /the word is may/i.test(motion),
  "The motion does not carry the discretion KRS 218A.276(8) gives the court."
);
ok(
  /except as provided in KRS 27A\.099/.test(motion),
  "The motion does not carry the KRS 27A.099 exception to the sealing order."
);
ok(
  /open question in the adopted design and is not described here/.test(motion),
  "The motion describes the scope of the KRS 27A.099 exception, which the design carries as an open research note."
);
ok(
  /has not yet ratified/.test(motion),
  "The motion does not record that the statements of legal effect await counsel ratification, which the design carries as a release blocker."
);
ok(
  /no filing fee for this proceeding/i.test(motion) && !/\$/.test(motion),
  "The motion does not state that there is no filing fee, or prints an amount."
);
ok(
  /No summons issues/i.test(motion) && /motion type SA/i.test(motion),
  "The motion does not record that no summons issues and that the filing is motion type SA."
);
ok(
  /not verified/i.test(motion) && /no notarial block is printed/i.test(motion),
  "The motion does not record that it is unverified and carries no notarial block."
);

// The blocked sibling's own mechanism is never recited here.
for (const [pattern, what] of [
  [/KRS 218A\.275/, "the KRS 218A.275 controlled-substance route"],
  [/KRS 218A\.14151/, "the deferred-prosecution bar that blocks the sibling"],
  [/deferred prosecution/i, "the deferred-prosecution question"]
]) {
  ok(!pattern.test(motion), `The motion recites ${what}, which belongs to the blocked sibling assignment.`);
  ok(!pattern.test(certificate), `The certificate recites ${what}, which belongs to the blocked sibling assignment.`);
}

// The identity gap is disclosed rather than filled.
ok(
  /LegalEase did not ask for the movant's name/.test(motion),
  "The motion does not disclose that LegalEase never asked for the movant's identity."
);
ok(
  /_{10,}/.test(JSON.stringify(filingOf(track) && KENTUCKY_PLEADING_TEMPLATES["ky-void-seal-marijuana-motion"].caption)),
  "The caption does not leave a rule for the movant's own name."
);

// 2b. The excluded official form.
ok(/AOC-334/.test(motion), "The motion does not name AOC-334, which is tendered with it.");
ok(
  /kycourts\.gov/.test(motion),
  "The motion does not say where AOC-334 comes from."
);
ok(
  /this packet does not contain it/i.test(motion) && /not a complete filing/i.test(motion),
  "The motion does not say that the packet is incomplete without AOC-334."
);
ok(
  /Leave it unsigned and undated/i.test(motion),
  "The motion does not tell the movant to leave the tendered order unsigned."
);
ok(!/AOC-334/.test(certificate) === false, "The certificate does not mention the order it is served with.");

// The certificate reports nothing and leaves every service fact blank.
ok(
  /reports nothing/i.test(certificate) &&
    /serves nobody/i.test(certificate) &&
    /holds no proof of service/i.test(certificate),
  "The certificate does not disclaim reporting service, serving anybody or holding proof."
);
for (const label of ["Date of service", "Manner of service", "Name and address of the office served"]) {
  ok(certificate.includes(label), `The certificate has no blank for "${label}".`);
}
ok(
  /AFTER service, not before/i.test(certificate) && /after service and not before/i.test(certificate),
  "The certificate does not tell the movant to serve before signing it, in both its opening and its execution instruction."
);
ok(
  !/I served|I delivered a copy of the Motion[^_]*on \d/.test(certificate.replace(/On the date and in the manner written below, I delivered[\s\S]*?named above\./, "")),
  "The certificate reports a completed delivery outside the sentence its own blanks govern."
);

note(
  "2. Prohibited content: 2 templates print no monetary amount, assert no eligibility, promise no result, write no judicial finding as made, report no completed service, claim nothing about the prosecuting attorney's position, state no period as run and carry no notarial or sworn requirement; neither carries a judicial or clerk execution block, and neither recites KRS 218A.275, KRS 218A.14151 or deferred prosecution."
);
note(
  "2b. Route boundaries: the motion recites all nine controlling citations the design records, carries the KRS 218A.276(8) discretion as discretion, carries the KRS 27A.099 exception without describing its scope, records that the statements of legal effect await counsel ratification, states that there is no filing fee without printing an amount, records that no summons issues and the filing is motion type SA, records that it is unverified, discloses that LegalEase never asked for the movant's identity and leaves a caption rule for it, and names AOC-334 with its source and the statement that the packet is not complete without it."
);

// ---------------------------------------------------------------------------
// 3. Fixtures
// ---------------------------------------------------------------------------

const base = (overrides = {}) => ({
  vmjCounty: "Fayette County",
  vmjCourtLevel: "district",
  vmjCaseNumber: "18-M-00742",
  vmjOffenceOnList: "marijuana",
  vmjConvictionDate: "14 March 2018",
  vmjCompletionType: "probation",
  vmjCompletionDate: "22 September 2019",
  vmjFirstOffence: "yes",
  vmjPriorVoid: "no",
  vmjAgencies:
    "The Fayette County Sheriff's Office, the Lexington Police Department, the Circuit Court Clerk and the Administrative Office of the Courts",
  vmjProsecutorOffice: "county attorney",
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "ky-void-seal-marijuana-district-1",
    trackId: TRACK,
    expectedComponents: 2,
    expectedCourtLine: "IN THE FAYETTE DISTRICT COURT, COMMONWEALTH OF KENTUCKY",
    expectedProsecutor: "the Fayette County Attorney",
    answers: base()
  },
  {
    fixtureId: "ky-void-seal-marijuana-circuit-commonwealth-2",
    trackId: TRACK,
    variantOf: "ky-void-seal-marijuana-district-1",
    variantPurpose:
      "A circuit court case changes the caption the clerk files it under and changes the office served: the design routes service to the county attorney or to the Commonwealth's attorney according to which prosecuted, and the certificate names that office. Exercises vmjCourtLevel=circuit with vmjProsecutorOffice=Commonwealth's attorney.",
    expectedComponents: 2,
    expectedCourtLine: "IN THE JEFFERSON CIRCUIT COURT, COMMONWEALTH OF KENTUCKY",
    expectedProsecutor: "the Commonwealth's Attorney for the circuit that includes Jefferson County",
    answers: base({
      vmjCounty: "Jefferson",
      vmjCourtLevel: "circuit",
      vmjCaseNumber: "17-CR-01188",
      vmjProsecutorOffice: "Commonwealth's attorney"
    })
  },
  {
    fixtureId: "ky-void-seal-marijuana-salvia-3",
    trackId: TRACK,
    variantOf: "ky-void-seal-marijuana-district-1",
    variantPurpose:
      "KRS 218A.276(1) reaches three separate offence groups by three separate sections, and the motion recites which one the conviction was for and the section it comes in under. Exercises vmjOffenceOnList=salvia, which recites KRS 218A.1451 rather than KRS 218A.1422.",
    expectedComponents: 2,
    expectedCourtLine: "IN THE FAYETTE DISTRICT COURT, COMMONWEALTH OF KENTUCKY",
    expectedProsecutor: "the Fayette County Attorney",
    answers: base({ vmjOffenceOnList: "salvia", vmjCompletionType: "treatment" })
  }
];

const canonicalFixtures = FIXTURES.filter((f) => !f.variantOf);
ok(
  new Set(canonicalFixtures.map((f) => f.trackId)).size === ASSIGNED.length &&
    canonicalFixtures.length === ASSIGNED.length,
  "There is not exactly one canonical fixture per assigned track."
);
for (const fixture of FIXTURES.filter((f) => f.variantOf)) {
  const canonical = FIXTURES.find((f) => f.fixtureId === fixture.variantOf);
  ok(
    canonical && canonical.trackId === fixture.trackId,
    `${fixture.fixtureId}: names a canonical fixture on a different track, so it would be counted as a new legal track.`
  );
  ok(
    typeof fixture.variantPurpose === "string" && fixture.variantPurpose.length > 40,
    `${fixture.fixtureId}: records no purpose, so it cannot be justified as a material branch.`
  );
}
note(
  `3. Fixtures: ${canonicalFixtures.length} canonical fixture, exactly one per assigned track, and ${FIXTURES.length - canonicalFixtures.length} regression variants, each naming the canonical fixture on its own track and each recording the material branch it tests. Every answer is synthetic.`
);

// ---------------------------------------------------------------------------
// 4. Every material stop family fails closed
// ---------------------------------------------------------------------------

const fixtureAnswers = () => base();

const NEGATIVE = [
  ...[
    "vmjCounty",
    "vmjCourtLevel",
    "vmjCaseNumber",
    "vmjOffenceOnList",
    "vmjConvictionDate",
    "vmjCompletionType",
    "vmjCompletionDate",
    "vmjFirstOffence",
    "vmjPriorVoid",
    "vmjAgencies",
    "vmjProsecutorOffice"
  ].map((key) => [`the required answer ${key} is missing`, { ...fixtureAnswers(), [key]: "" }, "ky-answer-missing"]),
  ...KY_OUTSIDE_PARTY_KEYS.map((key) => [
    `outside-party content is supplied as ${key}`,
    { ...fixtureAnswers(), [key]: "The court finds the movant has completed treatment" },
    "ky-outside-party-content-refused"
  ]),
  [
    "the offence is not one of the three the subsection reaches",
    { ...fixtureAnswers(), vmjOffenceOnList: "none of these" },
    "ky-offence-not-on-276-list"
  ],
  [
    "the movant is unsure which offence the conviction was for",
    { ...fixtureAnswers(), vmjOffenceOnList: "unsure" },
    "ky-offence-not-established"
  ],
  [
    "the conviction date is not stated as a date",
    { ...fixtureAnswers(), vmjConvictionDate: "some time a few years ago" },
    "ky-conviction-date-not-established"
  ],
  [
    "the completion date is not stated as a date",
    { ...fixtureAnswers(), vmjCompletionDate: "I am not sure" },
    "ky-completion-date-not-established"
  ],
  [
    "the conviction was not a first offence of this kind",
    { ...fixtureAnswers(), vmjFirstOffence: "no" },
    "ky-not-a-first-offence"
  ],
  [
    "first-offence status is disputed",
    { ...fixtureAnswers(), vmjFirstOffence: "unsure" },
    "ky-first-offence-not-established"
  ],
  [
    "a conviction has already been voided under this section",
    { ...fixtureAnswers(), vmjPriorVoid: "yes" },
    "ky-prior-void-under-this-section"
  ],
  [
    "whether a conviction has already been voided is not established",
    { ...fixtureAnswers(), vmjPriorVoid: "unsure" },
    "ky-prior-void-not-established"
  ]
];

const stopIdsSeen = new Set();
let stopped = 0;
for (const [label, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveKentuckyFacts(TRACK, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof KentuckyEligibilityStopError,
    `${label}: did not raise a typed Kentucky stop.`
  );
  if (!(caught instanceof KentuckyEligibilityStopError)) continue;
  ok(caught.stopId === expectedStopId, `${label}: raised ${caught.stopId} rather than ${expectedStopId}.`);
  ok(caught.reason.length > 60, `${caught.stopId}: gives no usable reason.`);
  ok(
    [KY_REFERRAL, KY_RECORD_REFERRAL, KY_CLERK_REFERRAL].includes(caught.referral),
    `${caught.stopId}: routes somewhere that is not one of the design's destinations.`
  );
  ok(caught.nextStep.length > 30, `${caught.stopId}: gives no next step.`);
  // A stop may not send the movant back to the thing that stopped them.
  ok(
    !/file this motion|use this packet/i.test(caught.nextStep),
    `${caught.stopId}: routes back to the same route as its own solution.`
  );
  stopIdsSeen.add(caught.stopId);
  stopped += 1;
}

// Every closed list refuses a value outside it, as a branch error rather than
// as a silent default.
let branchRejected = 0;
for (const [key, bad] of [
  ["vmjCourtLevel", "family court"],
  ["vmjOffenceOnList", "cocaine"],
  ["vmjCompletionType", "diversion"],
  ["vmjProsecutorOffice", "attorney general"],
  ["vmjFirstOffence", "probably"],
  ["vmjPriorVoid", "maybe"]
]) {
  let caught = null;
  try {
    deriveKentuckyFacts(TRACK, { ...fixtureAnswers(), [key]: bad });
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof KentuckyBranchError, `${key}="${bad}": was accepted rather than refused.`);
  if (caught instanceof KentuckyBranchError) branchRejected += 1;
}

for (const [list, name, size] of [
  [KY_COURT_LEVELS, "KY_COURT_LEVELS", 4],
  [KY_OFFENCE_GROUPS, "KY_OFFENCE_GROUPS", 11],
  [KY_COMPLETION_TYPES, "KY_COMPLETION_TYPES", 4],
  [KY_PROSECUTOR_OFFICES, "KY_PROSECUTOR_OFFICES", 5],
  [KY_YES_NO_UNSURE, "KY_YES_NO_UNSURE", 5]
]) {
  ok(Object.keys(list).length === size, `${name} holds ${Object.keys(list).length} entries rather than ${size}.`);
}
ok(
  KY_OUTSIDE_PARTY_KEYS.length === 14,
  `KY_OUTSIDE_PARTY_KEYS holds ${KY_OUTSIDE_PARTY_KEYS.length} keys rather than fourteen.`
);
// No declared input may also be an outside-party key, or a legitimate answer
// would be refused.
for (const input of track.requiredInputs) {
  ok(
    !KY_OUTSIDE_PARTY_KEYS.includes(input.key),
    `${input.key}: is both a declared input and a refused outside-party key.`
  );
}

note(
  `4. Stops: ${stopped} negative cases fail closed with the expected typed stop, a reason, a destination and a next step that does not route back to this route; ${stopIdsSeen.size} distinct stop families are exercised, covering every missing declared answer, every refused outside-party key, an offence off the KRS 218A.276(1) list, an unestablished offence, both unestablished dates, a second offence, a disputed first-offence status, a prior voiding and an unestablished prior voiding; ${branchRejected} out-of-list branch values rejected; six unassigned track identifiers refused; five closed lists hold their size.`
);

// ---------------------------------------------------------------------------
// 5. Rendering, page by page
// ---------------------------------------------------------------------------

/**
 * The drawn lines of each page, reconstructed from the content streams.
 *
 * pdf-lib writes one positioned run per `Tm`/`Tj` pair, so grouping runs by
 * y position reconstructs the page as lines. That is what catches a blank page,
 * an empty trailing page, a heading stranded at the foot of a page with its
 * section overleaf, and a paragraph rendered twice — none of which a page count
 * or a byte length shows.
 *
 * Em dashes and section marks decode to a replacement character under latin1.
 * That is an artefact of reading the stream, not of the render.
 */
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
        .sort((left, right) => right[0] - left[0])
        .map(([, group]) =>
          group
            .sort((left, right) => left.x - right.x)
            .map((run) => run.text)
            .join("   ")
            .trim()
        )
    );
  }
  return pages;
}

/** Section headings, as they are drawn: uppercase, on a line of their own. */
function headingLines(template) {
  return new Set(
    (template.sections ?? [])
      .map((section) => section.heading)
      .filter(Boolean)
      .map((heading) => heading.replace(/[^\x20-\x7e]/g, "?"))
  );
}

/**
 * A fill-in rule rather than a paragraph.
 *
 * The certificate repeats rules of underscores deliberately, and a
 * duplicate-paragraph check that could not tell those apart from repeated copy
 * would have to be weakened rather than kept honest.
 */
const isFillInRule = (line) => {
  const solid = line.replace(/\s+/g, "");
  if (solid.length === 0) return true;
  return (solid.match(/_/g) ?? []).length / solid.length > 0.6;
};

/** Looked up from the back, on collapsed whitespace: FlowWriter re-wraps runs. */
const pageOf = (pages, needle) => {
  const wanted = needle.replace(/\s+/g, " ").trim();
  for (let i = pages.length - 1; i >= 0; i -= 1) {
    if (pages[i].some((line) => line.replace(/\s+/g, " ").includes(wanted))) return i;
  }
  return -1;
};

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveKentuckyFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "KY",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);
  // Pinned on the fixture literal from the design, never read back out of the
  // facts under test: a count derived from the result agrees with itself.
  ok(
    resolved.components.length === fixture.expectedComponents,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than the ${fixture.expectedComponents} the design assigns.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "KY",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "KY",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(output.bytes) === sha(again.bytes), `${component.componentId}: rendering is not deterministic.`);

    const pages = renderedPages(output.bytes);
    const template = pleadingTemplate(component.templateId);
    const headings = headingLines(template);
    ok(
      pages.length === output.pageCount,
      `${fixture.fixtureId}/${component.componentId}: ${pages.length} content streams for ${output.pageCount} pages, so a page carries nothing.`
    );

    const allLines = [];
    pages.forEach((lines, pageIndex) => {
      const nonEmpty = lines.filter((line) => line.trim().length > 0);
      ok(
        nonEmpty.length > 0,
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} is blank.`
      );
      if (pageIndex < pages.length - 1 && nonEmpty.length > 0) {
        const last = nonEmpty[nonEmpty.length - 1];
        ok(
          !headings.has(last),
          `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} ends on the heading "${last}", stranding it from its section.`
        );
      }
      for (const line of nonEmpty) {
        ok(
          line.length < 200,
          `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries a line long enough to have run past the margin.`
        );
        allLines.push(line);
      }
      inspectedPages += 1;
    });

    for (let i = 1; i < allLines.length; i += 1) {
      if (isFillInRule(allLines[i])) continue;
      ok(
        allLines[i] !== allLines[i - 1],
        `${fixture.fixtureId}/${component.componentId}: the line "${allLines[i].slice(0, 60)}..." is rendered twice in succession.`
      );
    }

    const rendered = allLines.join("\n");
    ok(
      !/\bundefined\b|\bNaN\b|\[object Object\]|\{\{|\}\}/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a placeholder, an undefined, a NaN or an object reached the page.`
    );
    ok(
      !/^\s*(yes|no|unsure|district|circuit|marijuana|salvia|synthetic|county_attorney|commonwealths_attorney)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare branch answer is rendered on a line of its own.`
    );
    ok(
      !/\$\s?\d/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: the rendered page prints a monetary amount, and the design establishes none.`
    );
    // A drawn judicial signature line, not a mention of the judge: the motion
    // legitimately says the clerk delivers the filing to the judge who decided
    // the case.
    ok(
      !allLines.some((line) => /^(judge|deputy clerk|clerk of court)\b/i.test(line.trim())),
      `${fixture.fixtureId}/${component.componentId}: the rendered page carries a judicial or clerk execution line.`
    );
    // The caption and the served office follow the movant's own answers.
    ok(
      rendered.replace(/\s+/g, " ").includes(fixture.expectedCourtLine),
      `${fixture.fixtureId}/${component.componentId}: the caption is not "${fixture.expectedCourtLine}".`
    );
    ok(
      !/COUNTY COUNTY|County County/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: the county name was doubled.`
    );
    ok(
      output.warnings === undefined || output.warnings.length === 0,
      `${fixture.fixtureId}/${component.componentId}: a declared value was absent and rendered as a blank line: ${(output.warnings ?? []).join(" ")}`
    );

    // The certificate has to fit its fill-in block and its execution block on
    // one page: the renderer reserves keep-together for headings and the
    // signature block, and a certificate that splits leaves a movant signing a
    // page whose blanks are overleaf.
    if (component.role === "certificate_of_service") {
      const dateLine = pageOf(pages, "Date of service");
      const printedName = pageOf(pages, "Printed name");
      ok(
        dateLine >= 0 && printedName >= 0 && dateLine === printedName,
        `${fixture.fixtureId}: the certificate's service blanks and its signature block are on different pages.`
      );
      ok(
        rendered.replace(/\s+/g, " ").includes(fixture.expectedProsecutor),
        `${fixture.fixtureId}: the certificate does not name "${fixture.expectedProsecutor}" as the office served.`
      );
    }

    renderedComponents += 1;
    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
  }

  const assemblyRequest = {
    jurisdiction: "KY",
    jurisdictionName: "Kentucky",
    packetName: track.assembledPacketName,
    caseReference: fixture.answers.vmjCaseNumber,
    title: track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(sha(assembled.bytes) === sha(againAssembled.bytes), `${fixture.fixtureId}: assembly is not deterministic.`);
  ok(assembled.pageCount > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);
  ok(
    assemblyComponents[0].role === "primary_filing",
    `${fixture.fixtureId}: the assembled packet does not open with the motion.`
  );

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    sampleRole: fixture.variantOf ? "variant" : "canonical",
    components: assemblyComponents.length,
    pages: assembled.pageCount,
    sha256: sha(assembled.bytes)
  });
}

// A variant that renders the same bytes as its canonical fixture is not a
// variant.
for (const result of results.filter((r) => r.sampleRole === "variant")) {
  const canonicalId = FIXTURES.find((f) => f.fixtureId === result.fixtureId).variantOf;
  const canonical = results.find((r) => r.fixtureId === canonicalId);
  ok(
    canonical && canonical.sha256 !== result.sha256,
    `${result.fixtureId}: assembles to the same bytes as ${canonicalId}, so it exercises nothing.`
  );
}

note(
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, no heading stranded from its section, no line past the margin, no paragraph repeated, no bare branch answer, no monetary amount, no unresolved placeholder, no judicial or clerk line, and every caption built from the movant's own county and court answers; the certificate's service blanks and signature block share a page on every fixture; all three packets assemble to different bytes.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const districtFacts = deriveKentuckyFacts(TRACK, base());
ok(districtFacts.countyName === "Fayette", `The county name was not reduced: got "${districtFacts.countyName}".`);
ok(
  districtFacts.courtLine === "IN THE FAYETTE DISTRICT COURT, COMMONWEALTH OF KENTUCKY",
  `The district caption is wrong: got "${districtFacts.courtLine}".`
);
ok(
  districtFacts.prosecutorOfficeName === "the Fayette County Attorney",
  `The county-attorney office name is wrong: got "${districtFacts.prosecutorOfficeName}".`
);
ok(
  /KRS 218A\.1422/.test(districtFacts.offenceStatement),
  "A marijuana conviction does not recite KRS 218A.1422."
);

const circuitFacts = deriveKentuckyFacts(TRACK, base({
  vmjCounty: "Jefferson",
  vmjCourtLevel: "circuit",
  vmjProsecutorOffice: "Commonwealth's attorney"
}));
ok(
  circuitFacts.courtLine === "IN THE JEFFERSON CIRCUIT COURT, COMMONWEALTH OF KENTUCKY",
  `The circuit caption is wrong: got "${circuitFacts.courtLine}".`
);
ok(
  circuitFacts.prosecutorOfficeName ===
    "the Commonwealth's Attorney for the circuit that includes Jefferson County",
  `The Commonwealth's-attorney office name is wrong: got "${circuitFacts.prosecutorOfficeName}".`
);

for (const [answer, citation] of [
  ["marijuana", "KRS 218A.1422"],
  ["synthetic drug", "KRS 218A.1430"],
  ["salvia", "KRS 218A.1451"]
]) {
  const facts = deriveKentuckyFacts(TRACK, base({ vmjOffenceOnList: answer }));
  ok(
    facts.offenceCitation === citation && facts.offenceStatement.includes(citation),
    `An offence answered as "${answer}" recites ${facts.offenceCitation} rather than ${citation}.`
  );
}

// No branch answer reaches a rendered sentence as a bare word, and every
// declared input is carried through to the fact bag under its own key.
for (const fixture of FIXTURES) {
  const facts = deriveKentuckyFacts(fixture.trackId, fixture.answers);
  for (const [key, value] of Object.entries(facts)) {
    if (!["yes", "no", "unsure", "district", "circuit", "marijuana", "salvia", "synthetic"].includes(value)) {
      continue;
    }
    ok(
      !key.endsWith("Statement") && !key.endsWith("Line") && !key.endsWith("Name"),
      `${fixture.fixtureId}: ${key} carries a bare branch answer into a rendered sentence.`
    );
  }
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key),
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
  ok(
    !/\bundefined\b|\bNaN\b|\[object Object\]|\{\{/.test(JSON.stringify(facts)),
    `${fixture.fixtureId}: a derived fact carries undefined, NaN, an object or an unresolved placeholder.`
  );
}

note(
  "6. Values: the caption, the served office and the offence citation all follow the movant's own answers — district and circuit produce different captions, county attorney and Commonwealth's attorney different offices, and each of the three offence groups its own KRS section; no branch answer reaches a sentence as a bare word; every declared required input reaches the fact bag; and all three offence branches were exercised."
);

// ---------------------------------------------------------------------------
// 7. Runtime
// ---------------------------------------------------------------------------

for (const t of KENTUCKY_CUSTOM_PLEADING_TRACKS) {
  ok(t.runtimeDisabled === true, `${t.trackId}: is not runtime-disabled.`);
  ok(t.technicalFixture === true, `${t.trackId}: is not a technical fixture.`);
  ok(t.statuses.runtime === "runtime_disabled", `${t.trackId}: computes ${t.statuses.runtime}.`);
  ok(t.statuses.legal === "not_submitted", `${t.trackId}: claims a legal review status.`);
  ok(t.statuses.visual === "not_reviewed", `${t.trackId}: claims a visual review status.`);
  ok(t.jurisdiction === "KY", `${t.trackId}: is not a Kentucky track.`);
  ok(t.outputStrategy === "custom_pleading", `${t.trackId}: is not custom_pleading.`);
  ok(t.requiredInputs.length > 0, `${t.trackId}: declares no participant inputs.`);
  ok(
    t.geographyKeys.length === 0 && t.geographicScope === "statewide",
    `${t.trackId}: claims a geography the design does not give it.`
  );
}
note(
  "7. Runtime: the track is runtime-disabled, legally unsubmitted, visually unreviewed and statewide, and it stays runtime-disabled on its own open release blocker as well as on the switch."
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Kentucky custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Kentucky custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(44)} ${result.trackId.padEnd(40)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(3)} pages  sha256=${result.sha256}`
  );
}
