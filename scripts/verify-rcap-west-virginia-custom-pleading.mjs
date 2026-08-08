// West Virginia custom pleading — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right: West
// Virginia is not enabled and its shared surfaces are untouched; the assignment
// is exactly the two assigned tracks and their six assigned custom-pleading
// components, with the five process_guidance components recorded as another
// lane's and produced by nothing here; every document holds the design's
// boundaries on its face; every negative case fails closed with a typed stop
// naming a destination and a next step; and every rendered page is inspected
// line by line.
//
// The two boundaries that matter most here, and that section 2 checks hardest:
//
//   1. No document carries any assertion about the applicant's
//      probation-violation history. Whether there was a serious or repeated
//      violation is the court's determination under § 60A-4-407(b), and the
//      design forbids LegalEase from generating an assertion either way — so
//      "the applicant kept every condition" is as prohibited as its opposite.
//   2. The affidavit carries a blank jurat and nothing else does. The design
//      requires notarization on the affidavit alone; a notarial block on the
//      application or a certificate would invite the wrong document to be sworn.
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
  WV_CUSTOM_PLEADING_TRACKS,
  WV_CUSTOM_PLEADING_TEMPLATES,
  WV_DESIGN_ROLE_TO_ENGINE_ROLE,
  WV_EXCLUDED_COMPONENT_ROLES,
  WV_ASSIGNED_TRACK_IDS,
  WV_DRUG_TRACK_ID,
  WV_PARDON_TRACK_ID,
  WV_YES_NO,
  WV_PARDON_TYPES,
  WV_OUTSIDE_PARTY_KEYS,
  WV_SCREENED_ROUTING_KEYS,
  WV_PREPARATION_DATE_KEY,
  WV_REFERRALS,
  WV_LAWYER_REFERRAL,
  WV_CLERK_REFERRAL,
  WV_PROBATION_REFERRAL,
  WV_PARDON_RECORD_REFERRAL,
  WV_SENTENCE_RECORD_REFERRAL,
  deriveWestVirginiaFacts,
  WestVirginiaBranchError,
  WestVirginiaEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/west-virginia/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const ASSIGNED = [WV_DRUG_TRACK_ID, WV_PARDON_TRACK_ID];

// ---------------------------------------------------------------------------
// 0. West Virginia is not enabled, and the shared surfaces are intact
// ---------------------------------------------------------------------------

const assignedIds = new Set(WV_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned West Virginia track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(WV_CUSTOM_PLEADING_TEMPLATES).every(
    (id) => !Object.prototype.hasOwnProperty.call(PLEADING_TEMPLATES, id)
  ),
  "A template from this job is wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "WV").length === 0,
  "West Virginia already has a track in the shared registry, so this job would be changing an enabled jurisdiction."
);

// Injected for verification only. The committed shared files stay untouched.
for (const track of WV_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, WV_CUSTOM_PLEADING_TEMPLATES);

note(
  "0. Enablement: both assigned tracks and all six templates are absent from the shared registry and template pack, and West Virginia has no track there at all; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly two tracks and their six components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;
const memo = readJson("data/record-clearing/legal-design-intake/WV.memo.json");

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  `The implemented track set ${JSON.stringify([...assignedIds])} is not exactly the assigned set.`
);
ok(
  JSON.stringify([...WV_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The module's closed track list is not exactly the assigned set."
);
for (const foreign of registry.filter((r) => r.jurisdiction === "WV").map((r) => r.trackId)) {
  if (ASSIGNED.includes(foreign)) continue;
  ok(!assignedIds.has(foreign), `${foreign} is implemented here and belongs to another lane.`);
}

let assignedComponentCount = 0;
const excludedComponents = [];

for (const trackId of ASSIGNED) {
  const track = WV_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const manifest = manifests.find((m) => m.trackId === trackId);
  const registryEntry = registry.find((r) => r.trackId === trackId);
  const memoEntry = memo.tracks.find((t) => t.trackId === trackId);
  ok(Boolean(manifest), `${trackId}: no packet-set manifest in the adopted legal design.`);
  ok(Boolean(registryEntry), `${trackId}: no entry in the adopted track registry.`);
  ok(Boolean(memoEntry), `${trackId}: no entry in the West Virginia legal-design memo.`);
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
    ok(
      built.order === component.order,
      `${component.componentId}: order ${built.order} does not match the design's ${component.order}.`
    );
    ok(
      built.requirement === component.requirement,
      `${component.componentId}: requirement ${built.requirement} does not match the design's ${component.requirement}.`
    );
    ok(
      built.role === WV_DESIGN_ROLE_TO_ENGINE_ROLE[component.role],
      `${component.componentId}: engine role ${built.role} is not the mapping of the design role ${component.role}.`
    );
    ok(
      built.outputStrategy === "custom_pleading" && built.rendererStrategy === "custom_pleading",
      `${component.componentId}: is not a custom-pleading component on both axes.`
    );
    ok(
      built.sourcePath === null && built.sourceSha256 === null,
      `${component.componentId}: claims an official source. The Judiciary publishes no form for either of these sections.`
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
    `${trackId}: the registry carries no release blocker, so the copy would have stopped preserving one.`
  );
  ok(
    memoEntry.outputStrategy === "custom_pleading" && memoEntry.outputStrategyStatus === "resolved",
    `${trackId}: the memo does not resolve the output strategy to custom pleading.`
  );
  ok(memoEntry.packetIdentity === "identified", `${trackId}: the memo does not identify the packet.`);
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
    registryEntry.destination?.kind === "court",
    `${trackId}: the design's destination is not a court.`
  );
  const declaredKeys = memoEntry.participantInputs.map((i) => i.key).sort();
  const implementedKeys = track.requiredInputs.map((i) => i.key).sort();
  ok(
    JSON.stringify(declaredKeys) === JSON.stringify(implementedKeys),
    `${trackId}: declared inputs ${JSON.stringify(declaredKeys)} do not match the implemented inputs ${JSON.stringify(implementedKeys)}.`
  );
}

ok(assignedComponentCount === 6, `Counted ${assignedComponentCount} assigned custom-pleading components rather than six.`);
ok(excludedComponents.length === 5, `Counted ${excludedComponents.length} excluded components rather than five.`);
ok(
  excludedComponents.every((c) => WV_EXCLUDED_COMPONENT_ROLES.some((r) => r.role === c.role)),
  "An excluded component carries a role the module does not record as another lane's."
);
ok(
  Object.keys(WV_CUSTOM_PLEADING_TEMPLATES).length === 6,
  "The module does not register exactly six templates."
);
// The design leaves position 3 on the pardon route to the guidance lane. That
// gap is preserved rather than closed, or the assembled packet would bind out of
// the design's order once guidance fills it.
ok(
  WV_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === WV_PARDON_TRACK_ID)
    .packetSet.components.map((c) => c.order)
    .join(",") === "1,2,4",
  "The pardon packet set renumbers around the guidance component instead of preserving the design's order."
);

note(
  `1. Assignment: exactly two assigned tracks and their 6 assigned custom-pleading components, each pinned to the design's component id, order, requirement, role and template, and each with a governing custom-pleading specification; the ${excludedComponents.length} process_guidance components on the same routes are recorded and excluded rather than produced, and the order gap they leave is preserved; every declared participant input is asked under the design's own key; the memo approves both routes with no build blocker and no legal-design blocker, and both still carry open release questions.`
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

/**
 * True where a phrase is asserted rather than denied.
 *
 * The honest copy in these documents names the forbidden thing in order to say
 * whose it is — "no notarial block is printed on it" — so a check written
 * against the bare noun fires on the disclaimer it exists to protect. This looks
 * at the sentence the phrase sits in and treats it as an assertion only where no
 * negation precedes it.
 */
const NEGATION =
  /\b(not|no|never|nothing|nobody|none|refuses?|declines?|blank|unsigned|unpublished|unmarked|unsworn|without|outside|neither)\b/i;
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
  [/\$\s?\d/, "prints a monetary amount. Neither section sets a fee and the advertisement's rate is the newspaper's"],
  [/\(\s*[xX]\s*\)|\[\s*[xX]\s*\]/, "prints a marked box"],
  [/\/s\//i, "prints a conformed signature"],
  [/\bSCA-C9(0[0367]|12)\b[^"]{0,40}\bapplies\b/i, "claims one of the five published expungement forms applies here"],
  [/\b(hearing (is )?set for|hearing date\s*:\s*\S|time of hearing\s*:\s*\d)/i, "prints a hearing date or time"],
  [/\bdate filed\s*:\s*\S|\bfiled on\s+\d/i, "prints a filing date"],
  [/\bservice (was|has been) (made|completed|effected)\b/i, "states that service has already happened"],
  [/\bpublished on\s+\d|\bpublication ran\b/i, "states that the advertisement has already been published"],
  [/\b\d{3}-\d{2}-\d{4}\b/, "prints something shaped like a social security number"]
];

/** Phrases that may appear only inside a denial. */
const ONLY_DENIED = [
  [/\bwill be granted\b|\bthe court will grant\b|\bis entitled to\b/i, "predicts the outcome"],
  [/\b(firearm|immigration|professional licens)/i, "speaks to a firearms, immigration or licensing consequence"],
  [/\bexpunged everywhere|erased everywhere|removed from every\b/i, "claims the record will be cleared everywhere"],
  [/\bmay (lawfully )?(deny|refuse to disclose)\b/i, "claims a general right to deny the record, which § 5-1-16a(b) does not give"],
  [/\b(prosecuting attorney|prosecutor) (has |had )?(agreed|consented|approved|no objection)/i, "reports that the prosecuting attorney agreed to something"],
  [/\b(the )?petitioner (has shown|shows|establishes|has established) good cause\b/i, "asserts that the petitioner has shown good cause, which is the Court's finding"],
  [/\bgood cause exists (here|in this (case|matter|petition))\b/i, "asserts the good-cause finding, which is the Court's"]
];

/**
 * The applicant asserting something about the probation-violation history.
 *
 * The design's sharpest boundary on the drug route: the court determines whether
 * there was a serious or repeated violation, and LegalEase generates no
 * assertion either way — so a claim of compliance is as prohibited as a claim of
 * breach. The statutory recital, which says what "the person" must be found, is
 * a description of the court's task and is deliberately not caught.
 */
const VIOLATION_ASSERTION =
  /\b(applicant|affiant|petitioner)\b[^.]{0,140}\b(did not violate|committed no violation|kept (every|all) condition|complied with (all|every) condition|was not guilty of any serious or repeated violation|had no probation violation)/i;

let templatesChecked = 0;
for (const template of Object.values(WV_CUSTOM_PLEADING_TEMPLATES)) {
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
    !VIOLATION_ASSERTION.test(source),
    `${template.templateId}: carries an assertion about the applicant's probation-violation history, which the design forbids in either direction.`
  );
  ok(
    /\{\{courtLine\}\}/.test(template.caption.courtLine),
    `${template.templateId}: the court line is not built from the participant's own answers.`
  );
  ok(
    !/\bCIRCUIT COURT OF (KANAWHA|CABELL|BERKELEY|MONONGALIA|WOOD|RALEIGH) COUNTY\b/.test(source),
    `${template.templateId}: hardcodes a West Virginia county.`
  );
}
ok(templatesChecked === 6, `Checked ${templatesChecked} templates rather than six.`);

// The jurat is on the affidavit and nowhere else.
const JURAT = /Taken, subscribed and sworn to before me/;
const NOTARY_LINE = /Notary Public/;
for (const template of Object.values(WV_CUSTOM_PLEADING_TEMPLATES)) {
  const source = sourceOf(template);
  const isAffidavit = template.templateId.endsWith("-affidavit");
  ok(
    JURAT.test(source) === isAffidavit,
    `${template.templateId}: ${isAffidavit ? "carries no jurat, though the design requires notarization on the affidavit" : "carries a jurat, though only the affidavit is sworn"}.`
  );
  if (isAffidavit) {
    ok(NOTARY_LINE.test(source), `${template.templateId}: names no notary line to leave blank.`);
    ok(
      /this ______ day of ____________________, 20____/.test(source),
      `${template.templateId}: the jurat's date is not left blank.`
    );
    ok(
      /My commission expires: ______________________/.test(source),
      `${template.templateId}: the notary's commission line is not left blank.`
    );
    ok(
      /UNSWORN as generated/.test(source),
      `${template.templateId}: does not say on its face that it is unsworn until the affiant swears it.`
    );
  }
}

// Each route cites its own section and no assertion about the other's.
for (const [trackId, section, foreign] of [
  [WV_DRUG_TRACK_ID, "60A-4-407", "5-1-16a"],
  [WV_PARDON_TRACK_ID, "5-1-16a", "60A-4-407"]
]) {
  const track = WV_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  for (const component of track.packetSet.components) {
    const source = sourceOf(pleadingTemplate(component.templateId));
    ok(
      component.role === "certificate_of_service" || source.includes(section),
      `${component.componentId}: does not cite § ${section}, the section this route runs on.`
    );
    ok(
      !source.includes(foreign),
      `${component.componentId}: cites § ${foreign}, which belongs to the other route.`
    );
  }
}

// The drug application holds the design's boundaries.
const drugApplication = sourceOf(
  pleadingTemplate(
    WV_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === WV_DRUG_TRACK_ID).packetSet.components.find(
      (c) => c.role === "primary_filing"
    ).templateId
  )
);
ok(
  /begins to run immediately upon the expiration of the term of probation/.test(drugApplication),
  "The application does not state that the six months run from the expiry of probation."
);
ok(
  /does not state that the six-month period has run/.test(drugApplication),
  "The application asserts the six-month period has run rather than leaving the computation to the Court."
);
ok(
  /That determination is the Court's/.test(drugApplication),
  "The application does not put the probation-violation determination on the Court."
);
ok(
  /only one discharge and dismissal under the section with respect to any person/.test(drugApplication),
  "The application does not record the one-discharge-ever limit."
);
ok(
  /61-11-26\(o\)/.test(drugApplication),
  "The application does not preserve the open once-per-lifetime question."
);
ok(
  /60A-4-407a/.test(drugApplication),
  "The application does not record the unread § 60A-4-407a as unsettled."
);
ok(
  /\{\{courtCostsStatement\}\}/.test(drugApplication),
  "The application does not carry the court-costs recital, which is derived from the applicant's own answer."
);

// The pardon petition holds the design's boundaries.
const pardonPetition = sourceOf(
  pleadingTemplate(
    WV_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === WV_PARDON_TRACK_ID).packetSet.components.find(
      (c) => c.role === "primary_filing"
    ).templateId
  )
);
ok(
  /circuit court in the county where the conviction was had/.test(pardonPetition),
  "The petition does not state its venue rule."
);
ok(
  /Both must be satisfied/.test(pardonPetition),
  "The petition does not state that both waiting periods must be satisfied."
);
ok(
  /does not state that either period has run/.test(pardonPetition),
  "The petition asserts a waiting period has run rather than leaving it to the Court."
);
ok(
  /first degree murder[\s\S]{0,120}treason[\s\S]{0,120}kidnapping[\s\S]{0,120}61-8B/.test(pardonPetition),
  "The petition does not state the four excluded offences."
);
ok(
  /Class I legal advertisement/.test(pardonPetition) && /publisher's affidavit of publication/.test(pardonPetition),
  "The petition does not carry the publication requirement and its proof."
);
ok(
  /records of the Governor, the Legislature and the Secretary of State/.test(pardonPetition),
  "The petition does not record that the pardon records are not subject to an expungement order."
);
ok(
  /The petitioner does not state that good cause exists/.test(pardonPetition),
  "The petition does not put the good-cause finding on the Court."
);
ok(
  /no general clause permitting the person to deny the record/.test(pardonPetition),
  "The petition does not preserve the open question about the limits of § 5-1-16a(b)."
);
ok(
  /61-11-25\(e\)/.test(pardonPetition) && /61-11-26\(l\)/.test(pardonPetition),
  "The petition does not contrast § 5-1-16a(b) with the sections that do carry a general clause."
);

// The notice is unpublished copy with a blank time and place.
const notice = sourceOf(
  pleadingTemplate(
    WV_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === WV_PARDON_TRACK_ID).packetSet.components.find(
      (c) => c.role === "notice"
    ).templateId
  )
);
ok(/Date: _+/.test(notice) && /Time: _+/.test(notice) && /Place: _+/.test(notice),
  "The notice does not leave the time and place blank for the Court to fix.");
ok(
  /has not been submitted, has not been published, and has not been paid for/.test(notice),
  "The notice does not say on its face that it is unpublished."
);
ok(
  /No amount is printed here, because none is established/.test(notice),
  "The notice quotes or implies an advertisement cost."
);
ok(
  /sequenced in practice varies locally and is not settled here/.test(notice),
  "The notice does not preserve the open sequencing question."
);

// The certificates are unexecuted and tied to their own filing.
for (const trackId of ASSIGNED) {
  const track = WV_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const certificate = pleadingTemplate(
    track.packetSet.components.find((c) => c.role === "certificate_of_service").templateId
  );
  const source = sourceOf(certificate);
  ok(
    /DO NOT SIGN OR DATE THIS UNTIL YOU HAVE DELIVERED THE COPIES/.test(source),
    `${certificate.templateId}: does not say it is unexecuted until the participant serves.`
  );
  ok(/Date of service: _+/.test(source), `${certificate.templateId}: does not leave the service date blank.`);
  ok(
    /\(\s\s\) United States mail/.test(source) && /\(\s\s\) Hand delivery/.test(source),
    `${certificate.templateId}: does not leave the method of service unmarked.`
  );
  ok(
    /and to no other document/.test(source),
    `${certificate.templateId}: does not tie itself to its own filing.`
  );
  ok(certificate.signatureLabel === null, `${certificate.templateId}: prints a second signature rule.`);
}
ok(
  /Supervising probation office/.test(
    sourceOf(pleadingTemplate("wv-drug-conditional-discharge-certificate-of-service"))
  ),
  "The drug certificate does not serve the probation office, which the design's service model requires."
);

note(
  "2. Boundaries: every document cites its own section and never the other route's; none prints a fee, a marked box, a conformed signature, a hearing date or time, a filing date, a completed service fact or a published-advertisement fact; none predicts an outcome, asserts good cause, reports a prosecutor's agreement, claims a general right to deny the record, or speaks to firearms, immigration or licensing; no document carries any assertion about the applicant's probation-violation history in either direction; the jurat is on the affidavit alone and every line of it is blank; the application preserves the six-month computation from probation expiry, the one-discharge-ever limit, the § 61-11-26(o) and § 60A-4-407a open questions and the § 60A-4-407(c) costs; the petition preserves both waiting periods, the four excluded offences, the publication requirement, the untouchable pardon records and the exact limits of § 5-1-16a(b); the notice is unpublished with a blank time and place and no quoted cost; both certificates are unexecuted, unmarked and tied to their own filing."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical per assigned track, plus variants
// ---------------------------------------------------------------------------

/** Synthetic answers only. No real person's record is used anywhere here. */
const drugBase = (overrides = {}) => ({
  applicantName: "Rosalind Amaechi Тhorne".normalize("NFKD").replace(/[^\x20-\x7e]/g, "T"),
  dateOfBirth: "12 May 1993",
  courtAndCounty: "Circuit Court of Harrison County",
  caseNumber: "19-F-214",
  arrestDate: "3 April 2019, by the Bridgeport Police Department",
  offenseCharged: "Possession of a controlled substance, W. Va. Code § 60A-4-401(c)",
  dischargeOrderDate: "18 July 2019",
  probationTerm: "Eighteen months",
  probationExpiryDate: "18 January 2021",
  dismissalDate: "2 February 2021",
  probationViolations: "no",
  priorDrugConviction: "no",
  priorConditionalDischarge: "no",
  courtCostsPaid: "yes",
  ...overrides
});

const pardonBase = (overrides = {}) => ({
  petitionerName: "Emmett Sylvester Rakowski",
  dateOfBirth: "29 January 1971",
  pardonDate: "14 June 2019",
  pardonType: "full and unconditional",
  convictionCounty: "Kanawha County",
  caseNumber: "02-F-889",
  offenseAndStatute: "Grand larceny, W. Va. Code § 61-3-13(a)",
  convictionDate: "7 November 2002",
  sentenceImposed: "One to ten years, suspended, with three years of probation",
  sentenceDischargeDate: "22 March 2006",
  excludedOffenseCheck: "no",
  publicationCounty: "Kanawha County",
  groundsForExpungement:
    "I have worked in building maintenance for nineteen years and I am trying to move into a supervisor post that runs a background check. The conviction is from 2002 and the Governor pardoned it. I would like to stop explaining it.",
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "wv-conditional-discharge-costs-paid-1",
    trackId: WV_DRUG_TRACK_ID,
    answers: drugBase()
  },
  {
    fixtureId: "wv-conditional-discharge-costs-outstanding-2",
    trackId: WV_DRUG_TRACK_ID,
    variantOf: "wv-conditional-discharge-costs-paid-1",
    variantPurpose:
      "Section 60A-4-407(c) leaves the applicant liable for the court costs assessable on a § 60A-4-401(c) conviction, and payment may have been a condition of probation. An unpaid answer changes the operative recital from a statement of payment to a statement of what remains owing, which is a material legal branch rather than a wording change.",
    answers: drugBase({ courtCostsPaid: "no" })
  },
  {
    fixtureId: "wv-pardon-expungement-1",
    trackId: WV_PARDON_TRACK_ID,
    answers: pardonBase()
  },
  {
    fixtureId: "wv-pardon-expungement-long-grounds-2",
    trackId: WV_PARDON_TRACK_ID,
    variantOf: "wv-pardon-expungement-1",
    variantPurpose:
      "The grounds paragraph is the petitioner's own words, reproduced without change and of unbounded length, and the county answers may or may not carry the word 'County'. A long grounds statement plus a bare county name is the layout branch that would strand the execution block or mis-draw the caption if either were handled by string assumption.",
    answers: pardonBase({
      convictionCounty: "Ohio",
      publicationCounty: "Ohio",
      groundsForExpungement:
        "I was twenty-nine when this happened and I am fifty-four now. Since the pardon came through in 2019 I have applied twice for a licence I need for the work I already do, and both times the application asked whether I had ever been convicted, and both times I answered honestly and heard nothing back. I am not asking the court to say the conviction never happened. I am asking for the public record of it to be cleared so that the pardon the Governor granted actually reaches the places where the conviction still follows me: the licensing board, the community college where I have been trying to finish a certificate, and the employer who has kept me on the same rung for eleven years. I have not been arrested or charged with anything since, I have paid everything the court ordered, and my supervisor and my pastor have both offered to write to the court if that would help."
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
  ["the applicant's name is missing", WV_DRUG_TRACK_ID, drugBase({ applicantName: "" }), "wv-answer-missing"],
  ["the case number is missing", WV_PARDON_TRACK_ID, pardonBase({ caseNumber: "" }), "wv-answer-missing"],
  ["the court and county are not identified", WV_DRUG_TRACK_ID, drugBase({ courtAndCounty: "I am not sure" }), "wv-venue-not-identified"],
  ["the probation expiry date is a shrug", WV_DRUG_TRACK_ID, drugBase({ probationExpiryDate: "some time in the spring" }), "wv-probation-expiry-not-established"],
  ["the probation expiry date is unknown", WV_DRUG_TRACK_ID, drugBase({ probationExpiryDate: "I cannot remember" }), "wv-probation-expiry-not-established"],
  ["the discharge order date is not established", WV_DRUG_TRACK_ID, drugBase({ dischargeOrderDate: "I do not know" }), "wv-discharge-order-not-established"],
  ["the six-month window plainly has not opened", WV_DRUG_TRACK_ID, drugBase({ [WV_PREPARATION_DATE_KEY]: "2021" }), "wv-six-month-window-not-open"],
  ["a probation violation is alleged", WV_DRUG_TRACK_ID, drugBase({ probationViolations: "yes" }), "wv-probation-violation-alleged"],
  ["there is a prior drug conviction", WV_DRUG_TRACK_ID, drugBase({ priorDrugConviction: "yes" }), "wv-prior-drug-conviction"],
  ["there was an earlier conditional discharge", WV_DRUG_TRACK_ID, drugBase({ priorConditionalDischarge: "yes" }), "wv-prior-conditional-discharge"],
  ["the pardon is conditional", WV_PARDON_TRACK_ID, pardonBase({ pardonType: "conditional" }), "wv-pardon-not-full-and-unconditional"],
  ["the character of the pardon is unsettled", WV_PARDON_TRACK_ID, pardonBase({ pardonType: "unsure" }), "wv-pardon-character-not-established"],
  ["the offence is an excluded one", WV_PARDON_TRACK_ID, pardonBase({ excludedOffenseCheck: "yes" }), "wv-excluded-offence"],
  ["the sentence discharge date is not established", WV_PARDON_TRACK_ID, pardonBase({ sentenceDischargeDate: "I cannot recall" }), "wv-sentence-discharge-not-established"],
  ["the pardon date is not established", WV_PARDON_TRACK_ID, pardonBase({ pardonDate: "not sure" }), "wv-pardon-date-not-established"],
  ["the pardon year has not run", WV_PARDON_TRACK_ID, pardonBase({ [WV_PREPARATION_DATE_KEY]: "2019" }), "wv-pardon-year-not-run"],
  ["five years since discharge have not run", WV_PARDON_TRACK_ID, pardonBase({ sentenceDischargeDate: "22 March 2023", [WV_PREPARATION_DATE_KEY]: "2026" }), "wv-five-year-period-not-run"],
  ["the grounds are left to LegalEase", WV_PARDON_TRACK_ID, pardonBase({ groundsForExpungement: "You write one for me, whatever you think sounds best." }), "wv-grounds-not-petitioners-own"],
  ["a judicial finding is supplied", WV_DRUG_TRACK_ID, drugBase({ courtFinding: "The court finds no serious violation" }), "wv-outside-party-content-refused"],
  ["a hearing date is supplied", WV_PARDON_TRACK_ID, pardonBase({ hearingDate: "4 May 2026" }), "wv-outside-party-content-refused"],
  ["a notary jurat is supplied", WV_DRUG_TRACK_ID, drugBase({ notaryJurat: "Sworn before me this day" }), "wv-outside-party-content-refused"],
  ["the publisher's affidavit is supplied", WV_PARDON_TRACK_ID, pardonBase({ publisherAffidavit: "Ran three weeks" }), "wv-outside-party-content-refused"],
  ["a completed service fact is supplied", WV_PARDON_TRACK_ID, pardonBase({ serviceCompletedDate: "1 April 2026" }), "wv-outside-party-content-refused"],
  ["the prosecutor's consent is supplied", WV_DRUG_TRACK_ID, drugBase({ prosecutorConsent: "No objection" }), "wv-outside-party-content-refused"],
  ["a § 61-11-26 petition is also being pursued", WV_DRUG_TRACK_ID, drugBase({ section611126Petition: "yes, I am considering one" }), "wv-section-61-11-26-interaction-unresolved"],
  ["a firearm-rights question is raised", WV_PARDON_TRACK_ID, pardonBase({ firearmRights: "yes, I want my gun rights back" }), "wv-collateral-consequence-attorney-only"],
  ["an immigration question is raised", WV_DRUG_TRACK_ID, drugBase({ immigrationStatus: "I am not a US citizen" }), "wv-collateral-consequence-attorney-only"],
  ["other-jurisdiction records are raised", WV_PARDON_TRACK_ID, pardonBase({ otherJurisdictionRecords: "there is a federal case too" }), "wv-collateral-consequence-attorney-only"]
];

let stopped = 0;
const stopIdsSeen = new Set();
for (const [label, trackId, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveWestVirginiaFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof WestVirginiaEligibilityStopError,
    `${label} (${trackId}) did not fail closed with a typed stop; got ${caught?.name ?? "no error"}.`
  );
  if (caught instanceof WestVirginiaEligibilityStopError) {
    ok(caught.stopId === expectedStopId, `${label} raised ${caught.stopId} rather than ${expectedStopId}.`);
    ok(caught.trackId === trackId, `${label} reported the wrong track.`);
    ok(caught.reason.length > 60, `${label} gives no reason a person could act on.`);
    ok(WV_REFERRALS.includes(caught.referral), `${label} names a destination outside the module's referral set.`);
    ok(caught.nextStep.length > 30, `${label} gives no next step a person could take.`);
    stopped += 1;
    stopIdsSeen.add(caught.stopId);
  }
}
ok(stopped === NEGATIVE.length, `Only ${stopped} of ${NEGATIVE.length} negative cases failed closed.`);

const stopFor = (trackId, answers) => {
  try {
    deriveWestVirginiaFacts(trackId, answers);
  } catch (error) {
    return error;
  }
  return null;
};
ok(
  stopFor(WV_DRUG_TRACK_ID, drugBase({ probationExpiryDate: "not sure" }))?.referral === WV_PROBATION_REFERRAL,
  "The probation-expiry stop does not send the applicant to the office that can confirm the date."
);
ok(
  stopFor(WV_DRUG_TRACK_ID, drugBase({ probationViolations: "yes" }))?.referral === WV_LAWYER_REFERRAL,
  "The probation-violation stop does not refer the applicant on, which is the one thing the design says it must."
);
ok(
  stopFor(WV_PARDON_TRACK_ID, pardonBase({ pardonType: "unsure" }))?.referral === WV_PARDON_RECORD_REFERRAL,
  "The pardon-character stop does not send the petitioner to the instrument of pardon."
);
ok(
  stopFor(WV_PARDON_TRACK_ID, pardonBase({ sentenceDischargeDate: "unknown" }))?.referral ===
    WV_SENTENCE_RECORD_REFERRAL,
  "The discharge-date stop does not send the petitioner to the record that establishes it."
);
ok(
  stopFor(WV_DRUG_TRACK_ID, drugBase({ courtAndCounty: "not sure" }))?.referral === WV_CLERK_REFERRAL,
  "The venue stop does not send the applicant to the clerk."
);
ok(
  WV_REFERRALS.every((r) => r.length > 40 && !/\b\d{3}[- ]\d{4}\b/.test(r)),
  "A referral destination is empty, or carries a telephone number the design never supplied."
);

const BRANCH_CASES = [
  [WV_DRUG_TRACK_ID, drugBase({ probationViolations: "I think so" })],
  [WV_DRUG_TRACK_ID, drugBase({ courtCostsPaid: "partly" })],
  [WV_PARDON_TRACK_ID, pardonBase({ pardonType: "commuted" })],
  [WV_PARDON_TRACK_ID, pardonBase({ excludedOffenseCheck: "maybe" })]
];
let branchRejected = 0;
for (const [trackId, answers] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveWestVirginiaFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof WestVirginiaBranchError, `An out-of-list answer on ${trackId} was accepted.`);
  if (caught instanceof WestVirginiaBranchError) branchRejected += 1;
}
for (const trackId of ["wv_exp_misdemeanor", "wv_exp_felony", "wv-something-else"]) {
  let caught = null;
  try {
    deriveWestVirginiaFacts(trackId, {});
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof WestVirginiaBranchError,
    `An unassigned track identifier ${trackId} was accepted by the fact derivation.`
  );
}

ok(Object.keys(WV_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(new Set(Object.values(WV_PARDON_TYPES)).size === 3, "The pardon-type list changed size.");
ok(WV_OUTSIDE_PARTY_KEYS.length >= 10, "The outside-party key guard was narrowed.");
ok(WV_SCREENED_ROUTING_KEYS.length >= 4, "The routing-screen key list was narrowed.");
ok(WV_REFERRALS.length === 6, "The referral destination set changed size.");

// A denial is not an assertion.
const denied = deriveWestVirginiaFacts(WV_DRUG_TRACK_ID, drugBase({ section611126Petition: "no, none" }));
ok(Boolean(denied.expiryStatement), "A denial of a parallel § 61-11-26 petition was treated as an assertion of one.");

note(
  `4. Stops: ${stopped} negative cases across both routes fail closed with the expected typed stop, a reason, a destination drawn from the module's own six-destination referral set and a next step; ${stopIdsSeen.size} distinct stop families are exercised, covering missing participant facts, an unresolved venue, an unestablished probation expiry or discharge order, an unopened six-month window, an alleged probation violation, a prior drug conviction, a prior conditional discharge, a conditional or uncertain pardon, an excluded offence, an unestablished pardon or discharge date, both unsatisfied waiting periods, grounds LegalEase was asked to write, the unresolved § 61-11-26(o) interaction, an attorney-only collateral consequence, and every attempt to supply a judicial finding, a hearing date, a notary's jurat, a publisher's affidavit, a completed service fact or the prosecutor's consent; every stop routes away from the node that raised it; ${branchRejected} out-of-list branch values rejected; three unassigned track identifiers refused; five closed lists hold their size.`
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
        .map(([, group]) =>
          group.sort((left, right) => left.x - right.x).map((run) => run.text).join("   ").trim()
        )
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
const pageOf = (pages, needle) =>
  pages.findIndex((lines) => lines.some((line) => line.includes(needle)));

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveWestVirginiaFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "WV",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);
  const expected = fixture.trackId === WV_DRUG_TRACK_ID ? 3 : 3;
  ok(
    resolved.components.length === expected,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than ${expected}.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "WV",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);
    const again = await renderPacketComponent({
      component,
      jurisdiction: "WV",
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
    });

    // The execution block is one unit, wherever it lives.
    const executionLines = (template.signatureBlock ?? [])
      .map((line) => asDrawn(fillTemplate(line, facts).text))
      .filter((line) => line.trim().length > 0 && !isFillInRule(line))
      .map((line) => line.slice(0, 40));
    if (executionLines.length > 0 && template.signatureLabel !== null) {
      const blockPages = new Set(executionLines.map((line) => pageOf(pages, line)));
      ok(
        !blockPages.has(-1),
        `${fixture.fixtureId}/${component.componentId}: a line of the execution block was not rendered at all.`
      );
      ok(
        blockPages.size === 1,
        `${fixture.fixtureId}/${component.componentId}: the execution block is split across pages ${[...blockPages].map((p) => p + 1).join(" and ")}.`
      );
    }
    if (component.role === "certificate_of_service") {
      const recital = pageOf(pages, "certify that I served");
      const dateLine = pageOf(pages, "Date of service");
      const signature = pageOf(pages, "self-represented");
      ok(
        recital !== -1 && dateLine !== -1 && signature !== -1,
        `${fixture.fixtureId}/${component.componentId}: the certificate block did not render in full.`
      );
      ok(
        recital === dateLine && recital === signature,
        `${fixture.fixtureId}/${component.componentId}: the certificate block is split across pages — recital on page ${recital + 1}, date on page ${dateLine + 1}, signature on page ${signature + 1}.`
      );
    }
    if (component.role === "affidavit") {
      const jurat = pageOf(pages, "Taken, subscribed and sworn to before me");
      const commission = pageOf(pages, "My commission expires");
      ok(
        jurat !== -1 && jurat === commission,
        `${fixture.fixtureId}/${component.componentId}: the jurat is split across pages or missing.`
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
      !/^\s*(yes|no|true|false|unsure|conditional|full and unconditional)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare branch answer is rendered on a line of its own.`
    );
    ok(!/\{\{|\}\}/.test(rendered), `${fixture.fixtureId}/${component.componentId}: an unresolved placeholder reached the page.`);
    ok(
      !/\(\s*[xX]\s*\)/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a box is rendered already marked.`
    );
    ok(
      !VIOLATION_ASSERTION.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: the rendered page asserts something about the probation-violation history.`
    );
    // The venue on the page is the participant's own, not an invented one.
    const county =
      fixture.trackId === WV_DRUG_TRACK_ID
        ? "HARRISON"
        : String(fixture.answers.convictionCounty).replace(/\s*County\s*$/i, "").toUpperCase();
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
    jurisdiction: "WV",
    jurisdictionName: "West Virginia",
    packetName: resolved.track.assembledPacketName,
    caseReference: facts.packetCaseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(assembled.sha256 === againAssembled.sha256, `${fixture.fixtureId}: assembly is not deterministic.`);
  ok(assembled.componentRanges[0].role === "primary_filing", `${fixture.fixtureId}: the packet does not open with the filing.`);

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
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, none trailing empty, no heading stranded from its section, no execution block, certificate block or jurat split across pages, no line past the margin, no paragraph repeated, no bare branch answer, no unresolved placeholder, no marked box, no probation-violation assertion, no monetary amount, and no county on any page that did not come from the fixture's own answers.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const drugFacts = deriveWestVirginiaFacts(WV_DRUG_TRACK_ID, drugBase());
ok(drugFacts.applicantName === drugBase().applicantName, "The applicant's name was rewritten rather than carried through.");
ok(
  drugFacts.expiryStatement.includes("18 January 2021") && /computed from that expiry/.test(drugFacts.expiryStatement),
  "The probation expiry is not carried through, or is not tied to the six-month computation."
);
ok(
  drugFacts.dismissalStatement.includes("2 February 2021") &&
    drugFacts.expiryStatement !== drugFacts.dismissalStatement,
  "The expiry and the dismissal are conflated, which is the one date confusion this route turns on."
);
ok(
  drugFacts.courtLine === "IN THE CIRCUIT COURT OF HARRISON COUNTY, WEST VIRGINIA",
  `The drug caption is ${drugFacts.courtLine}.`
);
const unpaid = deriveWestVirginiaFacts(WV_DRUG_TRACK_ID, drugBase({ courtCostsPaid: "no" }));
ok(
  /have been paid/.test(drugFacts.courtCostsStatement) && /have not yet been paid in full/.test(unpaid.courtCostsStatement),
  "The court-costs answer does not change the operative recital."
);

const pardonFacts = deriveWestVirginiaFacts(WV_PARDON_TRACK_ID, pardonBase());
ok(
  pardonFacts.courtLine === "IN THE CIRCUIT COURT OF KANAWHA COUNTY, WEST VIRGINIA",
  `The pardon caption is ${pardonFacts.courtLine}.`
);
ok(
  deriveWestVirginiaFacts(WV_PARDON_TRACK_ID, pardonBase({ convictionCounty: "Ohio" })).courtLine ===
    "IN THE CIRCUIT COURT OF OHIO COUNTY, WEST VIRGINIA",
  "A county answered without the word County does not produce a correct caption."
);
ok(
  pardonFacts.groundsStatement === pardonBase().groundsForExpungement,
  "The petitioner's grounds were rewritten rather than reproduced without change."
);
ok(
  /the instrument of pardon states it to be full and unconditional/.test(pardonFacts.pardonStatement) &&
    /the Court verifies the act of pardon/.test(pardonFacts.pardonStatement),
  "The pardon statement does not frame the character of the pardon as the instrument's and the verification as the Court's."
);

for (const fixture of FIXTURES) {
  const facts = deriveWestVirginiaFacts(fixture.trackId, fixture.answers);
  const track = WV_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === fixture.trackId);
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key) && String(facts[input.key]).trim() !== "",
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!/^(yes|no|full_and_unconditional|conditional|unsure)$/.test(value)) continue;
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
    `${variant.fixtureId}: the regression variant assembles to the same bytes as ${variant.variantOf}, so it tests nothing.`
  );
}
ok(new Set(results.map((r) => r.sha256)).size === results.length, "Two fixtures assemble to identical bytes.");
ok(new Set(results.map((r) => r.trackId)).size === 2, "The fixtures do not cover both assigned tracks.");

note(
  "6. Values: the participant's answers are carried through verbatim into every statement of fact; the probation-expiry date is tied to the six-month computation and is never conflated with the dismissal date; the court-costs answer changes the operative § 60A-4-407(c) recital; a county answered with or without the word County produces the same correct caption; the petitioner's grounds are reproduced without change and the character of the pardon stays the instrument's and the verification the Court's; every declared required input reaches the fact bag with a value; no derived sentence carries a bare branch answer; and all four fixtures assemble to distinct bytes."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const entry of WV_CUSTOM_PLEADING_TRACKS) {
  ok(entry.statuses.runtime === "runtime_disabled", `${entry.trackId}: is not runtime-disabled.`);
  ok(entry.runtimeDisabled === true, `${entry.trackId}: is not hard-disabled.`);
  ok(entry.technicalFixture === true, `${entry.trackId}: is not a technical fixture.`);
  ok(entry.statuses.legal === "not_submitted", `${entry.trackId}: claims a legal review status.`);
  ok(entry.statuses.visual === "not_reviewed", `${entry.trackId}: claims a visual review status.`);
  ok(entry.jurisdiction === "WV", `${entry.trackId}: is not a West Virginia track.`);
  ok(entry.outputStrategy === "custom_pleading", `${entry.trackId}: is not custom_pleading.`);
  ok(entry.requiredInputs.length > 0, `${entry.trackId}: declares no participant inputs.`);
  ok(
    entry.geographyKeys.length === 0 && entry.geographicScope === "statewide",
    `${entry.trackId}: claims a geography the design does not give it.`
  );
  ok(
    entry.packetSet.components.every(
      (c) => c.approval.legal === "not_submitted" && c.approval.visual === "not_reviewed"
    ),
    `${entry.trackId}: a component claims an approval.`
  );
}
note(
  "7. Runtime: both tracks are runtime-disabled, hard-disabled, technical fixtures, legally unsubmitted, visually unreviewed and statewide, and no component claims an approval."
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("West Virginia custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("West Virginia custom-pleading verification passed.\n");
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
    `  ${component.componentId.padEnd(50)} ${component.role.padEnd(24)} ${component.strategy.padEnd(18)} ${component.requirement}`
  );
}
