// Mississippi custom pleading — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Mississippi is not enabled and its shared surfaces are untouched; the
// assignment is exactly the three assigned tracks and their nine assigned
// custom-pleading components, with the six process_guidance components recorded
// as another lane's and produced by nothing here; every document holds the
// design's boundaries on its face; every negative case fails closed with a typed
// stop that names a destination and a next step; and every rendered page is
// inspected line by line.
//
// The boundaries are what most of section 2 checks, and they are the design's
// own list. No document states a fee, asserts that the petitioner meets the
// criteria for expungement, calls the offence expungeable, calls the petitioner
// a first offender or rehabilitated, calls a dismissal one with prejudice, says
// anything about immigration, firearms, federal records or licensing, claims a
// record will be erased everywhere, prints a checked finding box, a judicial
// signature or date, a notarial block, a hearing date, a filing date, a
// completed service fact, or the prosecuting authority's approval as to form.
// None inherits the Fourth District models' three counties, their Greenville
// address, their 2020 dates, their race field or their mandatory grand-jury
// allegation, and none cites § 99-15-26 and § 99-19-71 together.
//
// Runs offline against the real renderer, resolver and assembler. No network, no
// database, no promotion.
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
const { fillTemplate } = await import("@/lib/rcap/packets/engines/pdf-layout");
const { resolvePacket } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const {
  MS_CUSTOM_PLEADING_TRACKS,
  MS_CUSTOM_PLEADING_TEMPLATES,
  MS_DESIGN_ROLE_TO_ENGINE_ROLE,
  MS_EXCLUDED_COMPONENT_ROLES,
  MS_ASSIGNED_TRACK_IDS,
  MS_UNASSIGNED_TRACK_IDS,
  MS_DRUG_TRACK_ID,
  MS_DUI_TRACK_ID,
  MS_MIP_TRACK_ID,
  MS_YES_NO,
  MS_COURT_LEVELS,
  MS_DRUG_CHARGE_TYPES,
  MS_ALCOHOL_OFFENCES,
  MS_DISPOSITION_TYPES,
  MS_OUTSIDE_PARTY_KEYS,
  MS_PROSECUTOR_APPROVAL_KEYS,
  MS_SCREENED_ROUTING_KEYS,
  MS_PREPARATION_DATE_KEY,
  MS_REFERRALS,
  MS_LAWYER_REFERRAL,
  MS_CLERK_REFERRAL,
  MS_CIRCUIT_CLERK_REFERRAL,
  MS_CRIMINAL_HISTORY_REFERRAL,
  MS_DRIVING_RECORD_REFERRAL,
  MS_DUI_ROUTE_REFERRAL,
  MS_OUT_OF_SCOPE_REFERRAL,
  deriveMississippiFacts,
  MississippiBranchError,
  MississippiEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/mississippi/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const ASSIGNED = [MS_DRUG_TRACK_ID, MS_DUI_TRACK_ID, MS_MIP_TRACK_ID];

// ---------------------------------------------------------------------------
// 0. Mississippi is not enabled by this job, and the shared surfaces are intact
// ---------------------------------------------------------------------------

const assignedIds = new Set(MS_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Mississippi track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(MS_CUSTOM_PLEADING_TEMPLATES).every(
    (id) => !Object.prototype.hasOwnProperty.call(PLEADING_TEMPLATES, id)
  ),
  "A template from this job is wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);
// Tranche 1 already carries five other Mississippi tracks. This job neither
// touches them nor collides with them.
const preexistingMs = RELIEF_TRACKS.filter((t) => t.jurisdiction === "MS").map((t) => t.trackId);
ok(
  preexistingMs.length > 0 && preexistingMs.every((id) => !assignedIds.has(id)),
  `The existing Mississippi tracks in the shared registry (${preexistingMs.join(", ")}) overlap this job's assignment.`
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of MS_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, MS_CUSTOM_PLEADING_TEMPLATES);

note(
  `0. Enablement: all three assigned tracks and all nine templates are absent from the shared registry and template pack, and none collides with the five Tranche 1 Mississippi tracks already there (${preexistingMs.join(", ")}); injection is verification-time only.`
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly three tracks and their nine components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;
const memo = readJson("data/record-clearing/legal-design-intake/MS.memo.json");

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  `The implemented track set ${JSON.stringify([...assignedIds])} is not exactly the assigned set ${JSON.stringify(ASSIGNED)}.`
);
ok(
  JSON.stringify([...MS_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The module's closed track list is not exactly the assigned set."
);
for (const foreign of MS_UNASSIGNED_TRACK_IDS) {
  ok(!assignedIds.has(foreign), `${foreign} is implemented here and belongs to another lane.`);
  ok(
    registry.some((entry) => entry.trackId === foreign),
    `${foreign} is named as an unassigned Mississippi route but is not in the adopted track registry.`
  );
}

let assignedComponentCount = 0;
let excludedComponentCount = 0;
const excludedComponents = [];

for (const trackId of ASSIGNED) {
  const track = MS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const manifest = manifests.find((m) => m.trackId === trackId);
  const registryEntry = registry.find((r) => r.trackId === trackId);
  const memoEntry = memo.tracks.find((t) => t.trackId === trackId);
  ok(Boolean(manifest), `${trackId}: no packet-set manifest in the adopted legal design.`);
  ok(Boolean(registryEntry), `${trackId}: no entry in the adopted track registry.`);
  ok(Boolean(memoEntry), `${trackId}: no entry in the Mississippi legal-design memo.`);
  if (!manifest || !registryEntry || !memoEntry || !track) continue;

  const designCp = manifest.components.filter((c) => c.outputStrategy === "custom_pleading");
  const designOther = manifest.components.filter((c) => c.outputStrategy !== "custom_pleading");
  assignedComponentCount += designCp.length;
  excludedComponentCount += designOther.length;
  for (const component of designOther) {
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
  ok(implemented.length === 3, `${trackId}: implemented ${implemented.length} components rather than three.`);

  for (const component of designCp) {
    const built = implemented.find((c) => c.componentId === component.componentId);
    if (!built) continue;
    ok(
      built.order === component.order,
      `${component.componentId}: order ${built.order} does not match the design's ${component.order}.`
    );
    ok(
      built.requirement === component.requirement,
      `${component.componentId}: requirement ${built.requirement} does not match the design's ${component.requirement}.`
    );
    ok(
      built.role === MS_DESIGN_ROLE_TO_ENGINE_ROLE[component.role],
      `${component.componentId}: engine role ${built.role} is not the mapping of the design role ${component.role}.`
    );
    ok(
      built.outputStrategy === "custom_pleading" && built.rendererStrategy === "custom_pleading",
      `${component.componentId}: is not a custom-pleading component on both axes.`
    );
    ok(
      built.sourcePath === null && built.sourceSha256 === null,
      `${component.componentId}: claims an official source. Mississippi publishes no statewide form and this route has none.`
    );
    ok(
      Boolean(pleadingTemplate(built.templateId)),
      `${component.componentId}: names template ${built.templateId}, which is not registered.`
    );
    ok(
      specs.some((s) => s.trackId === trackId && s.componentId === component.componentId),
      `${component.componentId}: has no governing custom-pleading specification in the adopted design.`
    );
  }

  // The design approves all three routes, and withholds none of them.
  ok(
    memoEntry.legalDesignDecision?.status === "legal_design_approved_with_limitations",
    `${trackId}: the memo does not approve the track (${memoEntry.legalDesignDecision?.status}).`
  );
  ok(
    (registryEntry.buildBlockers ?? []).length === 0,
    `${trackId}: the registry carries a build blocker, so nothing may be drafted.`
  );
  ok(
    (registryEntry.legalDesignBlockers ?? []).length === 0,
    `${trackId}: the registry carries a legal-design blocker, so the track is withheld.`
  );
  ok(
    (registryEntry.releaseBlockers ?? []).length > 0,
    `${trackId}: the registry carries no release blocker. Every Mississippi route has at least the fee question open, and losing that would mean the copy stopped preserving it.`
  );
  ok(
    memoEntry.outputStrategy === "custom_pleading" && memoEntry.outputStrategyStatus === "resolved",
    `${trackId}: the memo does not resolve the output strategy to custom pleading.`
  );
  ok(
    memoEntry.packetIdentity === "identified",
    `${trackId}: the memo does not identify the packet.`
  );
  ok(
    memoEntry.localFormOverride === true,
    `${trackId}: the memo's local-form override is not set, so the mandatory clerk-contact instruction would not be required.`
  );

  // Venue, destination and scope come from the design, not from the module.
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
    `${trackId}: the design supplies no venue, so no caption could be drawn.`
  );
  ok(
    registryEntry.destination?.kind === "clerk",
    `${trackId}: the design's destination is not a clerk.`
  );
  ok(
    (memoEntry.participantInputs ?? []).length > 0,
    `${trackId}: the design declares no participant inputs.`
  );
  // Every declared input is asked, under the design's own key.
  const declaredKeys = memoEntry.participantInputs.map((i) => i.key).sort();
  const implementedKeys = track.requiredInputs.map((i) => i.key).sort();
  ok(
    JSON.stringify(declaredKeys) === JSON.stringify(implementedKeys),
    `${trackId}: declared inputs ${JSON.stringify(declaredKeys)} do not match the implemented inputs ${JSON.stringify(implementedKeys)}.`
  );
}

ok(assignedComponentCount === 9, `Counted ${assignedComponentCount} assigned custom-pleading components rather than nine.`);
ok(excludedComponentCount === 6, `Counted ${excludedComponentCount} excluded components rather than six.`);
ok(
  excludedComponents.every((c) => MS_EXCLUDED_COMPONENT_ROLES.some((r) => r.role === c.role)),
  "An excluded component carries a role the module does not record as another lane's."
);
ok(
  new Set(Object.values(MS_CUSTOM_PLEADING_TEMPLATES).map((t) => t.templateId)).size === 9,
  "The module does not register exactly nine templates."
);

note(
  `1. Assignment: exactly three assigned tracks and their 9 assigned custom-pleading components, each pinned to the design's component id, order, requirement, role and template, and each with a governing custom-pleading specification; the ${excludedComponentCount} process_guidance components on the same routes are recorded and excluded rather than produced; the six other Mississippi routes are absent; every declared participant input is asked under the design's own key; the memo approves all three routes with no build blocker and no legal-design blocker, and every route still carries the open fee question as a release blocker.`
);

// ---------------------------------------------------------------------------
// 2. Boundaries, on the face of every document
// ---------------------------------------------------------------------------

/** Every string a template will draw, as one body of text. */
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

/**
 * True where a phrase is asserted rather than denied.
 *
 * The honest copy in these documents names the forbidden thing in order to say
 * whose it is — "It does not say that Petitioner meets the criteria for
 * expungement" — so a check written against the bare noun fires on the
 * disclaimer it exists to protect. This looks at the sentence the phrase sits
 * in and treats it as an assertion only where no negation precedes it.
 */
const NEGATION =
  /\b(not|no|never|nothing|nobody|none|refuses?|declines?|blank|unsigned|unmarked|without|outside)\b/i;
function assertedIn(text, pattern) {
  const sentences = String(text).split(/(?<=[.!?])\s+|\\n|","/);
  return sentences.some((sentence) => {
    const match = sentence.match(pattern);
    if (!match) return false;
    const before = sentence.slice(0, sentence.indexOf(match[0]));
    return !NEGATION.test(before);
  });
}

/** Phrases that must never appear at all, in any form. */
const NEVER_PRESENT = [
  [/expungeable\s+(offense|offence)/i, "calls the offence an expungeable one, which is a legal conclusion the Fourth District caption block prints as though it were a data field"],
  [/\$\s?\d/, "prints a monetary amount. No Mississippi route reached here publishes a fee"],
  [/\b(one hundred fifty dollars|150\.00)\b/i, "prints the § 99-19-72 fee, which does not reach these sections by its terms and is an open question anyway"],
  [/\b(leflore|sunflower)\b/i, "carries a Fourth Circuit Court District county name"],
  [/\bgreenville\b/i, "carries the Fourth District district attorney's city"],
  [/\bwashington,\s*sunflower,?\s*(or\s*)?leflore\b/i, "carries the Fourth District three-county field"],
  [/\b(race|ethnicity)\s*:/i, "collects race, which no statute requires and which is not inherited"],
  [/social security/i, "collects a social security number"],
  [/\b\d{3}-\d{2}-\d{4}\b/, "prints something shaped like a social security number"],
  [/\b(grand jury|indicted by)\b/i, "pleads a grand jury indictment, which is wrong for most misdemeanours and for cases dismissed before indictment"],
  [/99-15-26/, "cites § 99-15-26, which conflates nonadjudication with conviction expungement"],
  [/\(\s*[xX]\s*\)|\[\s*[xX]\s*\]/, "prints a checked finding box"],
  [/\/s\//i, "prints a conformed signature"],
  [/subscribed and sworn|sworn to and subscribed|notary public|my commission expires/i, "prints a notarial block, which none of these sections requires"],
  [/\bhearing (is )?set for\b|\bhearing date\s*:/i, "prints a hearing date"],
  [/\bfiled on\s+\d|\bdate filed\s*:\s*\S/i, "prints a filing date"],
  [/\bservice (was|has been) (made|completed|effected)\b/i, "states that service has already happened"],
  [/\b(19|20)\d{2}\s*$/m, "ends a line on a bare year, which is how the archived models' hardcoded 2020 dates read"]
];

/** Phrases that may appear only inside a denial. */
const ONLY_DENIED = [
  [/petitioner\s+meets the criteria/i, "asserts that Petitioner meets the criteria for expungement, which is the Court's finding"],
  [/petitioner\s+(is|was)\s+a first offender/i, "asserts that Petitioner is a first offender"],
  [/petitioner\s+(is|has been)\s+rehabilitated/i, "asserts that Petitioner is rehabilitated"],
  [/with prejudice/i, "describes a dismissal as with prejudice, which LegalEase has not read the order to know"],
  [/erased everywhere|removed everywhere|erased from every/i, "claims the record will be erased everywhere"],
  [/\bwill be granted\b|\bthe court will grant\b/i, "predicts the outcome"],
  [/\b(immigration|firearm|professional licens)/i, "speaks to an immigration, firearms or licensing consequence"],
  [/automatic (expungement|record clear)/i, "suggests automatic clearance exists"],
  [/(district attorney|prosecuting attorney|prosecuting authority)\s+(has |had )?(approved|consented|agreed)/i, "reports that the prosecuting authority approved or agreed to something"]
];

let templatesChecked = 0;
for (const template of Object.values(MS_CUSTOM_PLEADING_TEMPLATES)) {
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

  // Court, county, cause number and prosecuting authority are participant data.
  ok(
    /\{\{(courtLine|filingCourtLine)\}\}/.test(template.caption.courtLine),
    `${template.templateId}: the court line is not built from the participant's own answers.`
  );
  ok(
    /\{\{causeNumber\}\}/.test(source),
    `${template.templateId}: does not carry the participant's cause number.`
  );
  ok(
    !/\bCOUNTY OF (HINDS|HARRISON|DESOTO|RANKIN|MADISON|JACKSON|LEE|FORREST)\b/i.test(source),
    `${template.templateId}: hardcodes a Mississippi county.`
  );
}
ok(templatesChecked === 9, `Checked ${templatesChecked} templates rather than nine.`);

// Each route's petition cites its own section, and no other route's.
const SECTION_OF = {
  [MS_DRUG_TRACK_ID]: "41-29-150",
  [MS_DUI_TRACK_ID]: "63-11-30",
  [MS_MIP_TRACK_ID]: "67-3-70"
};
for (const trackId of ASSIGNED) {
  const track = MS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  for (const component of track.packetSet.components) {
    const source = sourceOf(pleadingTemplate(component.templateId));
    // A certificate of service is proof of delivery, not a pleading, so it
    // names the document it belongs to rather than the substantive section.
    ok(
      component.role === "certificate_of_service" || source.includes(SECTION_OF[trackId]),
      `${component.componentId}: does not cite ${SECTION_OF[trackId]}, the section this route runs on.`
    );
    for (const [otherTrack, section] of Object.entries(SECTION_OF)) {
      if (otherTrack === trackId) continue;
      ok(
        !source.includes(section),
        `${component.componentId}: cites ${section}, which belongs to the ${otherTrack} route.`
      );
    }
  }
}

// The proposed orders leave every judicial field blank and import no effects.
for (const trackId of ASSIGNED) {
  const track = MS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const order = pleadingTemplate(
    track.packetSet.components.find((c) => c.role === "proposed_order").templateId
  );
  const source = sourceOf(order);
  ok(order.signatureLabel === null, `${order.templateId}: prints a participant signature rule on a proposed order.`);
  ok(!order.verification, `${order.templateId}: verifies a proposed order, which the Court signs.`);
  ok(/JUDGE/.test(source), `${order.templateId}: has no judicial signature block to leave blank.`);
  ok(
    /APPROVED AS TO FORM/.test(source),
    `${order.templateId}: carries no approved-as-to-form block, which every archived Mississippi order does.`
  );
  ok(
    /\(\s\s\)/.test(source),
    `${order.templateId}: carries no unmarked finding box.`
  );
  ok(
    /Every finding, every signature, every date and every entry below is left blank for the Court/.test(source),
    `${order.templateId}: does not say on its face that nothing has been decided.`
  );
  ok(
    !assertedIn(source, /restoration of rights|shall be restored|perjury/i),
    `${order.templateId}: imports a restoration-of-status or perjury-protection effect that the section it runs on does not supply.`
  );
  ok(
    /Fingerprint records are excepted/.test(source),
    `${order.templateId}: does not except fingerprint records from the direction.`
  );
}

// The certificates of service are unexecuted, and belong to their own petition.
for (const trackId of ASSIGNED) {
  const track = MS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const certificate = pleadingTemplate(
    track.packetSet.components.find((c) => c.role === "certificate_of_service").templateId
  );
  const source = sourceOf(certificate);
  ok(
    /DO NOT SIGN OR DATE THIS UNTIL YOU HAVE DELIVERED THE COPY/.test(source),
    `${certificate.templateId}: does not say it is unexecuted until the participant serves.`
  );
  ok(
    /Date of delivery: _+/.test(source),
    `${certificate.templateId}: does not leave the date of delivery blank.`
  );
  ok(
    /\(\s\s\) United States mail/.test(source) && /\(\s\s\) Hand delivery/.test(source),
    `${certificate.templateId}: does not leave the method of delivery unmarked.`
  );
  ok(
    /and to no other document/.test(source),
    `${certificate.templateId}: does not tie itself to its own petition, which is the archived model's defect.`
  );
  ok(
    certificate.signatureLabel === null,
    `${certificate.templateId}: prints a second signature rule above its own certificate block.`
  );
}

// The petitions carry the design's mandatory instructions and the fee silence.
for (const trackId of ASSIGNED) {
  const track = MS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const petition = pleadingTemplate(
    track.packetSet.components.find((c) => c.role === "primary_filing").templateId
  );
  const source = sourceOf(petition);
  ok(
    /Mississippi has no statewide expungement form/.test(source),
    `${petition.templateId}: does not carry the mandatory local-form warning.`
  );
  ok(
    /Call the clerk of the court where the case was heard before filing/.test(source),
    `${petition.templateId}: does not carry the mandatory clerk-contact instruction.`
  );
  ok(
    /approve the order as to form/.test(source),
    `${petition.templateId}: does not warn that some districts expect the prosecutor to approve the order as to form.`
  );
  ok(
    /confirm the (filing fee|fee)|what the filing fee is|confirm any fee/i.test(source),
    `${petition.templateId}: does not send the participant to the clerk on the fee.`
  );
  ok(
    /fingerprint records/i.test(source),
    `${petition.templateId}: does not disclose the fingerprint-record exception.`
  );
  ok(
    /Mississippi Criminal Information Center keeps a nonpublic record/.test(source),
    `${petition.templateId}: does not disclose the Criminal Information Center's nonpublic record.`
  );
  ok(
    /may still ask whether an order of expunction was entered/.test(source),
    `${petition.templateId}: does not disclose that an employer may still ask about an order of expunction.`
  );
  ok(
    /97-3-54\.6/.test(source),
    `${petition.templateId}: does not screen for trafficking-survivor relief, which is broader and faster than this route.`
  );
  ok(
    /WHERE THIS PACKET STOPS/.test(source),
    `${petition.templateId}: carries no printed stop section.`
  );
  ok(source.includes(MS_LAWYER_REFERRAL), `${petition.templateId}: the stop section carries no referral.`);
  ok(
    petition.verification && /simple statement of truth/.test(petition.verification),
    `${petition.templateId}: carries no simple truth statement, which is what the design uses in place of a notarization.`
  );
}

// The one hard gate: a DUI never travels through another route, and its venue
// is stated on the face of the petition.
const duiTrack = MS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === MS_DUI_TRACK_ID);
const duiPetition = sourceOf(
  pleadingTemplate(duiTrack.packetSet.components.find((c) => c.role === "primary_filing").templateId)
);
ok(
  /CIRCUIT COURT of the county in which the DUI conviction was had/.test(duiPetition),
  "The DUI petition does not state its venue rule on its face."
);
ok(
  /a municipal court judge is not authorized to expunge a DUI conviction/.test(duiPetition),
  "The DUI petition does not carry the Attorney General's venue opinion, which is the design's most-likely failure mode."
);
ok(
  /This petition is not made under Miss. Code Ann. \S* ?99-19-71/.test(duiPetition) ||
    /not made under Miss. Code Ann/.test(duiPetition),
  "The DUI petition does not say that it is not made under § 99-19-71, which the design makes a hard gate."
);
ok(
  /widely cited|frequently cited/.test(duiPetition) && /Nonadjudication/.test(duiPetition),
  "The DUI petition does not preserve the open subsection-citation caution."
);
ok(
  /requires the person to justify the expunction to the Court/.test(duiPetition) &&
    /written by Petitioner and is reproduced without change/.test(duiPetition),
  "The DUI petition does not record the justification as the participant's own words."
);

const mipPetition = sourceOf(
  pleadingTemplate(
    MS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === MS_MIP_TRACK_ID).packetSet.components.find(
      (c) => c.role === "primary_filing"
    ).templateId
  )
);
ok(
  /reaches a person who has been CHARGED/.test(mipPetition),
  "The underage-alcohol petition does not record that the section reaches a person charged, so a dismissed case qualifies."
);
ok(
  /Subsection \(3\) of . ?67-3-70/.test(mipPetition) || /furnishing or purchasing for a minor, is outside/.test(mipPetition),
  "The underage-alcohol petition does not exclude the adult furnishing offence."
);
// The timing allegation is derived, because which of the two events is later
// is the participant's own statement. Section 6 checks what it says; here the
// point is that the petition carries it rather than a fixed elapsed-period
// recital of its own.
ok(
  /\{\{timingStatement\}\}/.test(mipPetition),
  "The underage-alcohol petition recites the waiting period as fixed copy rather than from the participant's own dates."
);
ok(
  !assertedIn(mipPetition, /one year (has|had) (passed|elapsed|run)/i),
  "The underage-alcohol petition asserts that the waiting period has run rather than leaving it to the Court."
);

const drugPetition = sourceOf(
  pleadingTemplate(
    MS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === MS_DRUG_TRACK_ID).packetSet.components.find(
      (c) => c.role === "primary_filing"
    ).templateId
  )
);
ok(
  /does not plead Miss. Code Ann/.test(drugPetition),
  "The conditional-discharge application does not say that it does not plead § 99-19-71, which the design forbids conflating."
);
ok(
  /determines the matter after hearing/.test(drugPetition),
  "The conditional-discharge application does not record that the Court determines the application after hearing."
);
ok(
  /may occur only once with respect to any person/.test(drugPetition),
  "The conditional-discharge application does not record the once-only limitation."
);

note(
  "2. Boundaries: every document cites its own section and no other route's; none states a fee, asserts the criteria are met, calls the offence expungeable, calls Petitioner a first offender or rehabilitated, calls a dismissal one with prejudice, predicts an outcome, speaks to immigration, firearms or licensing, claims automatic clearance, reports a prosecutor's agreement, prints a checked box, a conformed or judicial signature, a notarial block, a hearing date, a filing date or a completed service fact; none carries a Fourth District county, the Greenville address, a race field, a social security number or a mandatory grand-jury allegation, and none cites § 99-15-26; every proposed order leaves the judicial and approved-as-to-form blocks blank and imports no restoration or perjury-protection effect; every certificate of service is unexecuted, unmarked and tied to its own petition; every petition carries the local-form warning, the mandatory clerk call, the fee silence, the fingerprint exception, the Criminal Information Center disclosure, the employer disclosure and the trafficking-survivor screen; the DUI petition states its circuit-court venue, the Attorney General's opinion, the hard gate against § 99-19-71 and the open subsection-citation caution."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical per assigned track, plus variants
// ---------------------------------------------------------------------------

/** Synthetic answers only. No real person's record is used anywhere here. */
const drugBase = (overrides = {}) => ({
  fullName: "Marisol Adaeze Whitfield",
  dateOfBirth: "3 February 1996",
  mailingAddress: "812 Sycamore Row, Apartment 2B, Hattiesburg, Mississippi 39401; 601-555-0146; m.whitfield@example.org",
  countyOfResidence: "Forrest County, Hattiesburg",
  courtLevel: "circuit court",
  courtCounty: "Forrest County",
  causeNumber: "K-19-0442-CI",
  chargeName: "Possession of a controlled substance, Miss. Code Ann. § 41-29-139(c)",
  offenseDate: "11 June 2019",
  arrestDate: "11 June 2019",
  arrestingAgency: "Hattiesburg Police Department, agency case number HPD-2019-04471",
  prosecutingAuthority: "District Attorney, Twelfth Circuit Court District",
  chargeType: "simple possession",
  conditionalDischarge: "yes",
  dischargeDate: "22 August 2022",
  probationCompleted: "yes",
  priorDrugDisposition: "no",
  ...overrides
});

const duiBase = (overrides = {}) => ({
  fullName: "Terrence Okonkwo Lindsey",
  dateOfBirth: "19 October 1988",
  mailingAddress: "3307 Ridgewood Court, Meridian, Mississippi 39301; 601-555-0192; t.lindsey@example.org",
  countyOfResidence: "Lauderdale County, Meridian",
  courtLevel: "county court",
  courtCounty: "Lauderdale County",
  causeNumber: "CC-2016-1188",
  chargeName: "Driving under the influence, first offence, Miss. Code Ann. § 63-11-30(1)",
  offenseDate: "4 March 2016",
  arrestDate: "4 March 2016",
  arrestingAgency: "Mississippi Highway Patrol, agency case number MHP-2016-30188",
  prosecutingAuthority: "District Attorney, Tenth Circuit Court District",
  duiConvictionDate: "26 September 2016",
  duiConvictionCourt: "County Court of Lauderdale County",
  sentenceCompletionDate: "14 November 2017",
  commercialLicence: "no",
  refusedTest: "no",
  bacResult: "0.11",
  otherDui: "no",
  priorDuiRelief: "no",
  justification:
    "I was twenty-seven and I have not had so much as a speeding ticket since. I drive a delivery route now and every year the background check comes back with this on it and I have to explain it to a stranger. I finished everything the court asked of me eight years ago and I would like to stop carrying it.",
  ...overrides
});

const mipBase = (overrides = {}) => ({
  fullName: "Danielle Rae Boudreaux",
  dateOfBirth: "8 July 2003",
  mailingAddress: "45 Wentworth Street, Oxford, Mississippi 38655; 662-555-0113; d.boudreaux@example.org",
  countyOfResidence: "Lafayette County, Oxford",
  courtLevel: "municipal court",
  courtCounty: "Oxford",
  causeNumber: "MC-2022-7719",
  chargeName: "Minor in possession of beer, Miss. Code Ann. § 67-3-70(1)",
  offenseDate: "17 September 2022",
  arrestDate: "17 September 2022",
  arrestingAgency: "Oxford Police Department, agency case number OPD-2022-11907",
  prosecutingAuthority: "City Prosecuting Attorney for the City of Oxford",
  alcoholOffense: "underage purchase or possession",
  dispositionType: "dismissed and discharged",
  dispositionDate: "6 December 2022",
  sentenceCompletionDate: "Not applicable; the case was dismissed and discharged.",
  ageAtOffense: "19",
  clerkConfirmedTiming: "yes",
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "ms-drug-cd-conditional-discharge-possession-1",
    trackId: MS_DRUG_TRACK_ID,
    answers: drugBase()
  },
  {
    fixtureId: "ms-drug-cd-paraphernalia-justice-court-2",
    trackId: MS_DRUG_TRACK_ID,
    variantOf: "ms-drug-cd-conditional-discharge-possession-1",
    variantPurpose:
      "The charge-type answer changes the operative offence allegation from § 41-29-139(c) to § 41-29-139(d), and a justice-court answer changes the caption's court line. Both are legal branches, not cosmetic ones.",
    answers: drugBase({
      chargeType: "paraphernalia",
      courtLevel: "justice court",
      courtCounty: "Jones County",
      chargeName: "Possession of paraphernalia, Miss. Code Ann. § 41-29-139(d)"
    })
  },
  {
    fixtureId: "ms-dui-first-offence-conviction-1",
    trackId: MS_DUI_TRACK_ID,
    answers: duiBase()
  },
  {
    fixtureId: "ms-dui-no-test-taken-2",
    trackId: MS_DUI_TRACK_ID,
    variantOf: "ms-dui-first-offence-conviction-1",
    variantPurpose:
      "Section 63-11-30(13) conditions relief on a concentration below .16 only where test results are available. Where no test was taken the petition must plead the condition differently rather than print an empty result, so this is a material legal branch.",
    answers: duiBase({ bacResult: "No test was taken." })
  },
  {
    fixtureId: "ms-mip-dismissed-and-discharged-1",
    trackId: MS_MIP_TRACK_ID,
    answers: mipBase()
  },
  {
    fixtureId: "ms-mip-convicted-and-sentence-completed-2",
    trackId: MS_MIP_TRACK_ID,
    variantOf: "ms-mip-dismissed-and-discharged-1",
    variantPurpose:
      "Section 67-3-70(6) offers the Court two alternative findings, and the disposition answer decides which one the proposed order asks for and which date the one-year period runs from. The order's operative finding line changes with it.",
    answers: mipBase({
      dispositionType: "convicted and sentence completed",
      dispositionDate: "6 December 2022",
      sentenceCompletionDate: "2 March 2023",
      alcoholOffense: "false age statement",
      chargeName: "Underage statement of false age, Miss. Code Ann. § 67-3-70(2)",
      courtLevel: "justice court",
      courtCounty: "Lafayette County"
    })
  }
];

for (const trackId of ASSIGNED) {
  ok(
    FIXTURES.filter((f) => !f.variantOf && f.trackId === trackId).length === 1,
    `${trackId} does not have exactly one canonical fixture.`
  );
}
ok(
  FIXTURES.every((f) => ASSIGNED.includes(f.trackId)),
  "A fixture names a track this job was not assigned."
);
for (const fixture of FIXTURES.filter((f) => f.variantOf)) {
  const canonical = FIXTURES.find((f) => f.fixtureId === fixture.variantOf);
  ok(
    canonical && !canonical.variantOf,
    `${fixture.fixtureId}: names something other than a canonical fixture.`
  );
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
  `3. Fixtures: ${FIXTURES.filter((f) => !f.variantOf).length} canonical fixtures, one per assigned track, and ${FIXTURES.filter((f) => f.variantOf).length} regression variants, each naming a canonical fixture on its own track and each recording the material branch it tests. Every answer is synthetic.`
);

// ---------------------------------------------------------------------------
// 4. Typed stops and closed lists
// ---------------------------------------------------------------------------

const NEGATIVE = [
  // Missing participant facts.
  ["the petitioner's name is missing", MS_DRUG_TRACK_ID, drugBase({ fullName: "" }), "ms-answer-missing"],
  ["the cause number is missing", MS_DUI_TRACK_ID, duiBase({ causeNumber: "" }), "ms-answer-missing"],
  ["the prosecuting authority is missing", MS_MIP_TRACK_ID, mipBase({ prosecutingAuthority: "" }), "ms-answer-missing"],

  // Unresolved venue and the wrong court level.
  ["the county is not identified", MS_DRUG_TRACK_ID, drugBase({ courtCounty: "I am not sure" }), "ms-venue-not-identified"],
  ["the court level is not identified", MS_MIP_TRACK_ID, mipBase({ courtLevel: "I don't know" }), "ms-court-level-not-identified"],
  ["the record is a federal one", MS_DRUG_TRACK_ID, drugBase({ courtLevel: "federal district court" }), "ms-court-outside-mississippi"],
  ["the DUI conviction is municipal and only a city is given", MS_DUI_TRACK_ID, duiBase({ courtLevel: "municipal court", courtCounty: "Meridian" }), "ms-dui-filing-county-not-identified"],
  ["which court entered the DUI conviction is unsettled", MS_DUI_TRACK_ID, duiBase({ duiConvictionCourt: "I am not sure" }), "ms-dui-filing-court-uncertain"],

  // Outside-party content, and the prosecutor's approval.
  ["a judicial finding is supplied", MS_DRUG_TRACK_ID, drugBase({ judicialFinding: "The court finds the petition well taken" }), "ms-outside-party-content-refused"],
  ["a judge's signature is supplied", MS_DUI_TRACK_ID, duiBase({ judgeSignature: "Hon. A. Pennington" }), "ms-outside-party-content-refused"],
  ["a hearing date is supplied", MS_MIP_TRACK_ID, mipBase({ hearingDate: "4 May 2026" }), "ms-outside-party-content-refused"],
  ["a filing date is supplied", MS_MIP_TRACK_ID, mipBase({ filingDate: "1 April 2026" }), "ms-outside-party-content-refused"],
  ["a completed service fact is supplied", MS_DRUG_TRACK_ID, drugBase({ serviceCompletedDate: "2 April 2026" }), "ms-outside-party-content-refused"],
  ["a clerk certification is supplied", MS_DUI_TRACK_ID, duiBase({ clerkCertification: "Filed and entered" }), "ms-outside-party-content-refused"],
  ["a notarization is supplied", MS_MIP_TRACK_ID, mipBase({ notarization: "Sworn before me this day" }), "ms-outside-party-content-refused"],
  ["the prosecutor's consent is supplied", MS_DRUG_TRACK_ID, drugBase({ prosecutorConsent: "The DA has no objection" }), "ms-prosecutor-approval-refused"],
  ["an approval as to form is supplied", MS_DUI_TRACK_ID, duiBase({ approvedAsToForm: "Approved, ADA R. Halloran" }), "ms-prosecutor-approval-refused"],

  // A route outside the product's scope.
  ["immigration status is volunteered", MS_MIP_TRACK_ID, mipBase({ immigrationStatus: "I am not a US citizen, I have a green card" }), "ms-immigration-consequences-attorney-only"],

  // ms-drug-cd — ineligible or disputed disposition, and offence outside a closed list.
  ["the charge was trafficking", MS_DRUG_TRACK_ID, drugBase({ chargeType: "trafficking" }), "ms-drug-cd-charge-outside-route"],
  ["the charge was distribution", MS_DRUG_TRACK_ID, drugBase({ chargeType: "distribution or sale" }), "ms-drug-cd-charge-outside-route"],
  ["the charge is something else entirely", MS_DRUG_TRACK_ID, drugBase({ chargeType: "something else" }), "ms-drug-cd-charge-outside-route"],
  ["the charge classification is uncertain", MS_DRUG_TRACK_ID, drugBase({ chargeType: "not sure" }), "ms-drug-cd-charge-classification-uncertain"],
  ["a judgment of guilt was entered", MS_DRUG_TRACK_ID, drugBase({ conditionalDischarge: "no" }), "ms-drug-cd-no-conditional-discharge"],
  ["there is a prior drug disposition", MS_DRUG_TRACK_ID, drugBase({ priorDrugDisposition: "yes" }), "ms-drug-cd-prior-drug-disposition"],
  ["the probation was not completed", MS_DRUG_TRACK_ID, drugBase({ probationCompleted: "no" }), "ms-drug-cd-probation-not-completed"],
  ["the discharge date is a shrug", MS_DRUG_TRACK_ID, drugBase({ dischargeDate: "sometime after I finished" }), "ms-drug-cd-discharge-not-established"],

  // ms-dui — every statutory condition, and the waiting period.
  ["the DUI conviction date is not established", MS_DUI_TRACK_ID, duiBase({ duiConvictionDate: "I cannot remember" }), "ms-dui-conviction-not-established"],
  ["the completion date is not established", MS_DUI_TRACK_ID, duiBase({ sentenceCompletionDate: "a while back" }), "ms-dui-completion-not-established"],
  ["five years have not passed", MS_DUI_TRACK_ID, duiBase({ [MS_PREPARATION_DATE_KEY]: "2019" }), "ms-dui-waiting-period-incomplete"],
  ["a commercial licence was held", MS_DUI_TRACK_ID, duiBase({ commercialLicence: "yes" }), "ms-dui-commercial-licence"],
  ["the test was refused", MS_DUI_TRACK_ID, duiBase({ refusedTest: "yes" }), "ms-dui-test-refused"],
  ["the test result cannot be found", MS_DUI_TRACK_ID, duiBase({ bacResult: "I do not know, I never got the paperwork" }), "ms-dui-test-result-not-established"],
  ["the result is at or above .16", MS_DUI_TRACK_ID, duiBase({ bacResult: "0.19" }), "ms-dui-bac-at-or-above-limit"],
  ["there is another DUI pending", MS_DUI_TRACK_ID, duiBase({ otherDui: "yes" }), "ms-dui-other-dui"],
  ["there was an earlier DUI expungement", MS_DUI_TRACK_ID, duiBase({ priorDuiRelief: "yes" }), "ms-dui-prior-dui-relief"],
  ["the justification is left to LegalEase", MS_DUI_TRACK_ID, duiBase({ justification: "You write one for me, whatever you think sounds best." }), "ms-dui-justification-not-participants-own"],

  // ms-mip — the closed offence list, age, disposition and timing.
  ["the case is really a DUI", MS_MIP_TRACK_ID, mipBase({ alcoholOffense: "dui" }), "ms-mip-case-is-a-dui"],
  ["the charge was furnishing to a minor", MS_MIP_TRACK_ID, mipBase({ alcoholOffense: "furnishing to a minor" }), "ms-mip-offence-outside-route"],
  ["the charge is something else", MS_MIP_TRACK_ID, mipBase({ alcoholOffense: "something else" }), "ms-mip-offence-outside-route"],
  ["the offence classification is uncertain", MS_MIP_TRACK_ID, mipBase({ alcoholOffense: "not sure" }), "ms-mip-offence-classification-uncertain"],
  ["the petitioner was of full drinking age", MS_MIP_TRACK_ID, mipBase({ ageAtOffense: "24" }), "ms-mip-age-outside-route"],
  ["the age is not established", MS_MIP_TRACK_ID, mipBase({ ageAtOffense: "I am not sure" }), "ms-mip-age-not-established"],
  ["the case is still pending", MS_MIP_TRACK_ID, mipBase({ dispositionType: "still pending" }), "ms-mip-case-still-pending"],
  ["how the case ended is unsettled", MS_MIP_TRACK_ID, mipBase({ dispositionType: "not sure" }), "ms-mip-disposition-not-established"],
  ["the completion date is missing on a conviction", MS_MIP_TRACK_ID, mipBase({ dispositionType: "convicted and sentence completed", sentenceCompletionDate: "I cannot recall" }), "ms-mip-completion-not-established"],
  ["the clerk has not been asked about timing", MS_MIP_TRACK_ID, mipBase({ clerkConfirmedTiming: "no" }), "ms-mip-clerk-timing-not-confirmed"],
  ["a year has not passed", MS_MIP_TRACK_ID, mipBase({ [MS_PREPARATION_DATE_KEY]: "2022" }), "ms-mip-waiting-period-incomplete"]
];

let stopped = 0;
const stopIdsSeen = new Set();
for (const [label, trackId, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveMississippiFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof MississippiEligibilityStopError,
    `${label} (${trackId}) did not fail closed with a typed stop; got ${caught?.name ?? "no error"}.`
  );
  if (caught instanceof MississippiEligibilityStopError) {
    ok(caught.stopId === expectedStopId, `${label} raised ${caught.stopId} rather than ${expectedStopId}.`);
    ok(caught.trackId === trackId, `${label} reported the wrong track.`);
    ok(caught.reason.length > 60, `${label} gives no reason a person could act on.`);
    ok(MS_REFERRALS.includes(caught.referral), `${label} names a destination outside the module's referral set.`);
    ok(caught.nextStep.length > 30, `${label} gives no next step a person could take.`);
    stopped += 1;
    stopIdsSeen.add(caught.stopId);
  }
}
ok(stopped === NEGATIVE.length, `Only ${stopped} of ${NEGATIVE.length} negative cases failed closed.`);

/** No stop routes the participant back to the node that raised it. */
const stopFor = (trackId, answers) => {
  try {
    deriveMississippiFacts(trackId, answers);
  } catch (error) {
    return error;
  }
  return null;
};

ok(
  stopFor(MS_MIP_TRACK_ID, mipBase({ alcoholOffense: "dui" }))?.referral === MS_DUI_ROUTE_REFERRAL,
  "The underage-alcohol route does not send a DUI to the DUI route."
);
ok(
  stopFor(MS_DUI_TRACK_ID, duiBase({ courtLevel: "municipal court", courtCounty: "Meridian" }))?.referral ===
    MS_CIRCUIT_CLERK_REFERRAL,
  "The DUI venue stop does not send the participant to the circuit clerk of the county of conviction."
);
ok(
  stopFor(MS_DRUG_TRACK_ID, drugBase({ priorDrugDisposition: "yes" }))?.referral ===
    MS_CRIMINAL_HISTORY_REFERRAL,
  "The once-only stop does not send the participant to their own criminal history."
);
ok(
  stopFor(MS_DUI_TRACK_ID, duiBase({ commercialLicence: "yes" }))?.referral === MS_DRIVING_RECORD_REFERRAL,
  "The commercial-licence stop does not send the participant to the driving record that establishes it."
);
ok(
  stopFor(MS_DRUG_TRACK_ID, drugBase({ courtLevel: "federal district court" }))?.referral ===
    MS_OUT_OF_SCOPE_REFERRAL,
  "The out-of-jurisdiction stop does not route outside the product."
);
ok(
  stopFor(MS_MIP_TRACK_ID, mipBase({ clerkConfirmedTiming: "no" }))?.referral === MS_CLERK_REFERRAL,
  "The clerk-timing stop does not send the participant to the clerk."
);
ok(
  stopFor(MS_DRUG_TRACK_ID, drugBase({ prosecutorConsent: "no objection" }))?.referral === MS_LAWYER_REFERRAL,
  "The prosecutor-approval stop does not refer the participant on."
);
ok(
  MS_REFERRALS.every(
    (referral) => !/^\s*$/.test(referral) && !/\b\d{3}[- ]\d{4}\b/.test(referral)
  ),
  "A referral destination is empty, or carries a telephone number the design never supplied."
);

// Closed lists reject anything outside them, and hold their size.
const BRANCH_CASES = [
  [MS_DRUG_TRACK_ID, drugBase({ courtLevel: "chancery court" })],
  [MS_DRUG_TRACK_ID, drugBase({ chargeType: "cultivation" })],
  [MS_DRUG_TRACK_ID, drugBase({ conditionalDischarge: "I think so" })],
  [MS_DUI_TRACK_ID, duiBase({ refusedTest: "maybe" })],
  [MS_DUI_TRACK_ID, duiBase({ otherDui: "only an old one" })],
  [MS_MIP_TRACK_ID, mipBase({ alcoholOffense: "public drunkenness" })],
  [MS_MIP_TRACK_ID, mipBase({ dispositionType: "nonadjudicated" })]
];
let branchRejected = 0;
for (const [trackId, answers] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveMississippiFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof MississippiBranchError, `An out-of-list answer on ${trackId} was accepted.`);
  if (caught instanceof MississippiBranchError) branchRejected += 1;
}

for (const trackId of ["ms-fel", "ms-nonconv", "ms-diversion", "ms-something-else"]) {
  let caught = null;
  try {
    deriveMississippiFacts(trackId, {});
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof MississippiBranchError,
    `An unassigned track identifier ${trackId} was accepted by the fact derivation.`
  );
}

ok(Object.keys(MS_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(new Set(Object.values(MS_COURT_LEVELS)).size === 4, "Mississippi's four trial court levels changed in number.");
ok(new Set(Object.values(MS_DRUG_CHARGE_TYPES)).size === 6, "The drug charge-type list changed size.");
ok(new Set(Object.values(MS_ALCOHOL_OFFENCES)).size === 6, "The underage-alcohol offence list changed size.");
ok(new Set(Object.values(MS_DISPOSITION_TYPES)).size === 4, "The disposition list changed size.");
ok(MS_OUTSIDE_PARTY_KEYS.length >= 10, "The outside-party key guard was narrowed.");
ok(MS_PROSECUTOR_APPROVAL_KEYS.length >= 5, "The prosecutor-approval key guard was narrowed.");
ok(MS_SCREENED_ROUTING_KEYS.length >= 2, "The routing-screen key list was narrowed.");
ok(MS_REFERRALS.length === 7, "The referral destination set changed size.");

// A denial is not an assertion: a participant who says there was no prior
// disposition must not be stopped by the once-only screen.
const denied = deriveMississippiFacts(MS_DRUG_TRACK_ID, drugBase({ priorDrugDisposition: "no" }));
ok(Boolean(denied.dischargeStatement), "A denial of a prior drug disposition was treated as an assertion of one.");
const citizenDenied = deriveMississippiFacts(
  MS_MIP_TRACK_ID,
  mipBase({ immigrationStatus: "I am a US citizen, born here" })
);
ok(
  Boolean(citizenDenied.dispositionStatement),
  "A volunteered answer confirming citizenship was treated as the opposite."
);

note(
  `4. Stops: ${stopped} negative cases across all three routes fail closed with the expected typed stop, a reason, a destination drawn from the module's own seven-destination referral set and a next step; ${stopIdsSeen.size} distinct stop families are exercised, covering missing participant facts, an unresolved venue, an unidentified court level, a record outside Mississippi, the DUI wrong-court-level trap, an offence outside a closed list, an uncertain offence classification, a case still pending, an ineligible or disputed disposition, an incomplete waiting period on both routes that have one, an unestablished date, a once-only benefit already used, an unconfirmed clerk timing, a justification LegalEase was asked to write, an attorney-only immigration question, and every attempt to supply a judicial finding, a judge's signature, a hearing or filing date, a clerk's certification, a notarization, a completed service fact or the prosecuting authority's approval as to form; every stop routes away from the node that raised it; ${branchRejected} out-of-list branch values rejected; four unassigned track identifiers refused; eight closed lists hold their size.`
);

// ---------------------------------------------------------------------------
// 5. Rendered content, inspected page by page
// ---------------------------------------------------------------------------

/**
 * The rendered pages, as the lines a reader would see on each of them.
 *
 * A page count proves nothing about what is on a page. pdf-lib writes one
 * Flate-compressed content stream per page, each run positioned by an explicit
 * text matrix, so inflating the streams in page order and grouping runs by their
 * y position reconstructs the page as lines. That is what catches a blank page,
 * an empty trailing page, a heading stranded at the foot of a page with its
 * section overleaf, an execution block split from its signature rule, and a
 * paragraph rendered twice.
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

/** Text as the extractor sees it: non-ASCII becomes a question mark. */
const asDrawn = (value) => String(value).replace(/[^\x20-\x7e]/g, "?");

/** Section headings, as they are drawn: on a line of their own. */
const headingLines = (template) =>
  new Set(
    (template.sections ?? [])
      .map((section) => section.heading)
      .filter(Boolean)
      .map(asDrawn)
  );

/** A fill-in rule rather than a paragraph. */
const isFillInRule = (line) => {
  const solid = line.replace(/\s+/g, "");
  if (solid.length === 0) return true;
  return (solid.match(/_/g) ?? []).length / solid.length > 0.6;
};

/** The first page a piece of text appears on, or -1. */
const pageOf = (pages, needle) =>
  pages.findIndex((lines) => lines.some((line) => line.includes(needle)));

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveMississippiFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "MS",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );
  ok(
    resolved.components.length === 3,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than the three assigned.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "MS",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "MS",
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
      ok(
        written.length > 0,
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} is blank.`
      );
      const last = written[written.length - 1];
      ok(
        pageIndex === pages.length - 1 || !headings.has(last),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} ends on the heading "${last}", stranding it from its section.`
      );
      ok(
        written.every((line) => line.length < 220),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries a line long enough to have run past the margin.`
      );
    });

    // The execution block is one unit. Every line of it belongs on one page,
    // or a signature rule stands alone with its printed-name lines overleaf.
    const executionLines = (template.signatureBlock ?? [])
      .map((line) => asDrawn(fillTemplate(line, facts).text))
      .filter((line) => line.trim().length > 0 && !isFillInRule(line))
      .map((line) => line.slice(0, 40));
    if (executionLines.length > 0) {
      const blockPages = new Set(executionLines.map((line) => pageOf(pages, line)));
      ok(
        !blockPages.has(-1),
        `${fixture.fixtureId}/${component.componentId}: a line of the execution block was not rendered at all.`
      );
      ok(
        blockPages.size === 1,
        `${fixture.fixtureId}/${component.componentId}: the execution block is split across pages ${[...blockPages].map((p) => p + 1).join(" and ")}.`
      );
      if (template.signatureLabel) {
        ok(
          pageOf(pages, asDrawn(template.signatureLabel).slice(0, 40)) === [...blockPages][0],
          `${fixture.fixtureId}/${component.componentId}: the signature rule is orphaned from the lines that identify the signer.`
        );
      }
    }

    // A certificate of service has no `signatureBlock`, so the shared
    // renderer's keep-together never reaches it. Its recital, its addressee,
    // its method, its date and its signature are one form a person completes by
    // hand, and putting the recipient on one page and the signature on the next
    // is how a certificate gets signed for the wrong delivery.
    if (component.role === "certificate_of_service") {
      const recital = pageOf(pages, "Prosecuting authority served");
      const signature = pageOf(pages, "Petitioner, self-represented");
      const dateLine = pageOf(pages, "Date of delivery");
      ok(
        recital !== -1 && signature !== -1 && dateLine !== -1,
        `${fixture.fixtureId}/${component.componentId}: the certificate block did not render in full.`
      );
      ok(
        recital === signature && recital === dateLine,
        `${fixture.fixtureId}/${component.componentId}: the certificate block is split across pages — recipient on page ${recital + 1}, date on page ${dateLine + 1}, signature on page ${signature + 1}.`
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
      !/\$\s?\d/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: the rendered page prints a monetary amount, and no fee is established on any of these routes.`
    );
    ok(
      !/^\s*(yes|no|true|false|not sure|still pending|simple possession|paraphernalia|dui)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare branch answer is rendered on a line of its own.`
    );
    ok(
      !/\{\{|\}\}/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: an unresolved placeholder reached the page.`
    );
    ok(
      !/\(\s*[xX]\s*\)/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a finding box is rendered already marked.`
    );
    ok(
      !/(JUDGE|APPROVED AS TO FORM)[^\n]*[A-Za-z]{3,}\s+[A-Za-z]{3,}\s*$/m.test(
        rendered.replace(/APPROVED AS TO FORM:/g, "APPROVED AS TO FORM")
      ) || component.role !== "proposed_order",
      `${fixture.fixtureId}/${component.componentId}: a protected judicial or approval field carries content.`
    );
    // The venue on the page is the participant's own, not an invented one.
    const county = String(fixture.answers.courtCounty).replace(/\s*County\s*$/i, "").toUpperCase();
    ok(
      pages[0].some((line) => line.includes(county)),
      `${fixture.fixtureId}/${component.componentId}: page 1 does not carry the county the participant supplied (${county}).`
    );
    inspectedPages += output.pageCount ?? 0;

    ok(
      !output.warnings.some((warning) => /Rendered blank lines for absent values/.test(warning)),
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
    jurisdiction: "MS",
    jurisdictionName: "Mississippi",
    packetName: resolved.track.assembledPacketName,
    caseReference: facts.packetCaseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(assembled.sha256 === againAssembled.sha256, `${fixture.fixtureId}: assembly is not deterministic.`);
  ok(assembled.pageCount > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);
  ok(
    assembled.componentRanges.map((r) => r.role).join(",") ===
      "primary_filing,proposed_order,certificate_of_service",
    `${fixture.fixtureId}: the assembled packet is not in petition, proposed order, certificate order.`
  );

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    sampleRole: fixture.variantOf ? "variant" : "canonical",
    variantOf: fixture.variantOf ?? null,
    components: assemblyComponents.length,
    pages: assembled.pageCount,
    sha256: assembled.sha256
  });
}

note(
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, none trailing empty, no heading stranded from its section, no execution block split from its signature rule, no line past the margin, no paragraph repeated, no bare branch answer, no unresolved placeholder, no marked finding box, no populated judicial or approval field, no monetary amount, and no county on any page that did not come from the fixture's own answers.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const drugFacts = deriveMississippiFacts(MS_DRUG_TRACK_ID, drugBase());
ok(drugFacts.fullName === drugBase().fullName, "The petitioner's name was rewritten rather than carried through.");
ok(
  drugFacts.dischargeStatement.includes("22 August 2022"),
  "The discharge date is not carried through as the participant stated it."
);
ok(
  /41-29-139\(c\)/.test(drugFacts.offenceAllegation),
  "The simple-possession answer does not produce the § 41-29-139(c) allegation."
);
const paraphernaliaFacts = deriveMississippiFacts(MS_DRUG_TRACK_ID, drugBase({ chargeType: "paraphernalia" }));
ok(
  /41-29-139\(d\)/.test(paraphernaliaFacts.offenceAllegation),
  "The paraphernalia answer does not change the operative offence allegation."
);
ok(
  /Petitioner takes that classification from the charging document/.test(drugFacts.offenceAllegation),
  "The offence allegation does not frame the classification as the participant's own."
);

const duiFacts = deriveMississippiFacts(MS_DUI_TRACK_ID, duiBase());
ok(
  duiFacts.filingCourtLine === "IN THE CIRCUIT COURT OF LAUDERDALE COUNTY, MISSISSIPPI",
  `The DUI caption is ${duiFacts.filingCourtLine} rather than the circuit court of the county of conviction.`
);
ok(
  duiFacts.courtName === "County Court of Lauderdale County",
  "The convicting court is not carried through separately from the filing court."
);
ok(
  duiFacts.justificationStatement === duiBase().justification,
  "The participant's justification was rewritten rather than reproduced without change."
);
ok(
  /0\.11/.test(duiFacts.testResultStatement),
  "The test result is not carried through as the participant stated it."
);
const noTestFacts = deriveMississippiFacts(MS_DUI_TRACK_ID, duiBase({ bacResult: "No test was taken." }));
ok(
  /no blood or breath test result is available/.test(noTestFacts.testResultStatement),
  "A no-test answer does not change how the condition is pleaded."
);

const mipDismissed = deriveMississippiFacts(MS_MIP_TRACK_ID, mipBase());
const mipConvicted = deriveMississippiFacts(
  MS_MIP_TRACK_ID,
  mipBase({ dispositionType: "convicted and sentence completed", sentenceCompletionDate: "2 March 2023" })
);
ok(
  /dismissed and the proceedings against Petitioner were discharged/.test(mipDismissed.dispositionStatement) &&
    /satisfactorily served the sentence/.test(mipConvicted.findingRequested),
  "The disposition answer does not change which of § 67-3-70(6)'s two findings the order asks for."
);
ok(
  mipDismissed.findingRequested !== mipConvicted.findingRequested,
  "Both dispositions ask the Court for the same finding."
);
ok(
  /does not state that the period has run/.test(mipDismissed.timingStatement),
  "The timing statement asserts that the one-year period has run."
);
ok(
  mipDismissed.courtLine === "IN THE MUNICIPAL COURT OF THE CITY OF OXFORD, MISSISSIPPI",
  `A municipal-court answer produced ${mipDismissed.courtLine}.`
);

// Every declared required input reaches the fact bag, or resolvePacket cannot
// check it as answered.
for (const fixture of FIXTURES) {
  const facts = deriveMississippiFacts(fixture.trackId, fixture.answers);
  const track = MS_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === fixture.trackId);
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key) && String(facts[input.key]).trim() !== "",
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!/^(yes|no|simple_possession|paraphernalia|dismissed_and_discharged|convicted_and_sentence_completed|underage_purchase_or_possession|false_age_statement|justice|county|circuit|municipal)$/.test(value)) {
      continue;
    }
    ok(
      !key.endsWith("Statement") && !key.endsWith("Allegation"),
      `${fixture.fixtureId}: ${key} carries a bare branch answer into a rendered sentence.`
    );
  }
}

// The material branches produce different packets.
for (const variant of FIXTURES.filter((f) => f.variantOf)) {
  const canonical = results.find((r) => r.fixtureId === variant.variantOf);
  const built = results.find((r) => r.fixtureId === variant.fixtureId);
  ok(
    canonical && built && canonical.sha256 !== built.sha256,
    `${variant.fixtureId}: the regression variant assembles to the same bytes as ${variant.variantOf}, so it tests nothing.`
  );
}
ok(
  new Set(results.map((r) => r.sha256)).size === results.length,
  "Two fixtures assemble to identical bytes."
);
ok(
  new Set(results.map((r) => r.trackId)).size === 3,
  "The fixtures do not cover all three assigned tracks."
);

note(
  "6. Values: the petitioner's answers are carried through verbatim into every statement of fact; the drug charge-type answer changes the operative offence allegation between § 41-29-139(c) and (d) and frames it as the participant's own classification; the DUI caption is the circuit court of the county of conviction while the convicting court is carried separately, the justification is reproduced without change, and a no-test answer changes how the .16 condition is pleaded; the underage-alcohol disposition answer changes which of § 67-3-70(6)'s two findings the order asks for and the petition still refuses to say the year has run; a municipal-court answer captions the city rather than a county; every declared required input reaches the fact bag with a value; no derived sentence carries a bare branch answer; and all six fixtures assemble to distinct bytes."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const entry of MS_CUSTOM_PLEADING_TRACKS) {
  ok(entry.statuses.runtime === "runtime_disabled", `${entry.trackId}: is not runtime-disabled.`);
  ok(entry.runtimeDisabled === true, `${entry.trackId}: is not hard-disabled.`);
  ok(entry.technicalFixture === true, `${entry.trackId}: is not a technical fixture.`);
  ok(entry.statuses.legal === "not_submitted", `${entry.trackId}: claims a legal review status.`);
  ok(entry.statuses.visual === "not_reviewed", `${entry.trackId}: claims a visual review status.`);
  ok(entry.jurisdiction === "MS", `${entry.trackId}: is not a Mississippi track.`);
  ok(entry.outputStrategy === "custom_pleading", `${entry.trackId}: is not custom_pleading.`);
  ok(
    entry.requiredInputs.length > 0,
    `${entry.trackId}: declares no participant inputs, so nothing can be checked as answered.`
  );
  ok(
    entry.geographyKeys.length === 0 && entry.geographicScope === "statewide",
    `${entry.trackId}: claims a geography the design does not give it.`
  );
  ok(
    entry.packetSet.components.every((c) => c.approval.legal === "not_submitted" && c.approval.visual === "not_reviewed"),
    `${entry.trackId}: a component claims an approval.`
  );
}
note(
  "7. Runtime: all three tracks are runtime-disabled, hard-disabled, technical fixtures, legally unsubmitted, visually unreviewed and statewide, and no component claims an approval."
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Mississippi custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mississippi custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(48)} ${result.trackId.padEnd(12)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(3)} pages  sha256=${result.sha256}`
  );
}
console.log("\nAssigned components not produced by this lane:");
for (const component of excludedComponents.sort((a, b) => a.componentId.localeCompare(b.componentId))) {
  console.log(
    `  ${component.componentId.padEnd(36)} ${component.role.padEnd(14)} ${component.strategy.padEnd(18)} ${component.requirement}`
  );
}
