// Indiana custom pleading — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Indiana is not enabled and its shared surfaces are untouched; the assignment
// is exactly the three assigned tracks and their ten assigned custom-pleading
// components; the three official_pdf_fill attachments on the Section 5 route are
// named rather than produced; every component has a governing legal-design
// specification; and the design's boundaries hold on the face of every document.
//
// The boundaries are what most of section 2 checks. No document says a record is
// destroyed, states a fee amount, asserts eligibility, asserts that the
// prosecuting attorney consented other than as the petitioner's own verified
// statement, populates a judicial finding, signature or date, reports that
// service or filing happened, or invents a court or a county.
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
const { resolvePacket } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const {
  INDIANA_CUSTOM_PLEADING_TRACKS,
  INDIANA_PLEADING_TEMPLATES,
  IN_DESIGN_ROLE_TO_ENGINE_ROLE,
  IN_ASSIGNED_TRACK_IDS,
  IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS,
  IN_YES_NO,
  IN_EXPUNGEMENT_SECTIONS,
  IN_COLLATERAL_ACTION_TYPES,
  IN_OFFENSE_LEVELS,
  IN_OUTSIDE_PARTY_KEYS,
  IN_SEALING_NOT_DESTRUCTION,
  IN_FILE_PUBLIC_UNTIL_GRANTED,
  IN_REFERRAL,
  IN_CLERK_REFERRAL,
  IN_STATE_POLICE_REFERRAL,
  IN_PROSECUTOR_REFERRAL,
  IN_ROUTING_REFERRAL,
  IN_SEQUENCING_REFERRAL,
  IN_COLLATERAL_ACTION,
  IN_SERIOUS_FELONY,
  IN_SUPPLEMENTAL_ORDER,
  deriveIndianaFacts,
  IndianaBranchError,
  IndianaEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/indiana/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const TRACK_IDS = [IN_COLLATERAL_ACTION, IN_SERIOUS_FELONY, IN_SUPPLEMENTAL_ORDER];

/** Every referral the module may use. A stop that leaves this set has no home. */
const REFERRALS = [
  IN_REFERRAL,
  IN_CLERK_REFERRAL,
  IN_STATE_POLICE_REFERRAL,
  IN_PROSECUTOR_REFERRAL,
  IN_ROUTING_REFERRAL,
  IN_SEQUENCING_REFERRAL
];

// ---------------------------------------------------------------------------
// 0. Indiana is not enabled, and the shared surfaces are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(INDIANA_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned Indiana track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("in_")).length === 0,
  "Indiana templates are wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of INDIANA_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, INDIANA_PLEADING_TEMPLATES);

note(
  "0. Enablement: all three assigned tracks and all ten templates are absent from the shared registry and template pack; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly three tracks and ten components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;
const memo = readJson("data/record-clearing/legal-design-intake/IN.memo.json");

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...TRACK_IDS].sort()),
  "The implemented track set is not exactly the three assigned tracks."
);
ok(
  JSON.stringify([...IN_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...TRACK_IDS].sort()),
  "The module's closed track list is not exactly the three assigned tracks."
);
// The other seven Indiana routes belong to the acroform, guidance, composed and
// source-acquisition lanes.
for (const foreign of [
  "in_auto_expungement",
  "in_arrest_no_charges",
  "in_section1_petition",
  "in_conviction_misd",
  "in_conviction_d6",
  "in_conviction_felony",
  "in_infraction_nondisclosure"
]) {
  ok(!assignedIds.has(foreign), `${foreign} is implemented here and belongs to another lane.`);
}

let implementedComponentCount = 0;
let excludedSeen = 0;
const orderedTracks = TRACK_IDS.map((id) =>
  INDIANA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === id)
);

for (const track of orderedTracks) {
  ok(Boolean(track), "An assigned track is missing from the implementation.");
  if (!track) continue;
  const manifest = manifests.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no packet-set manifest in the adopted legal design.`);
  if (!manifest) continue;

  const designCp = manifest.components
    .filter((c) => c.outputStrategy === "custom_pleading")
    .map((c) => c.componentId)
    .sort();
  const implemented = track.packetSet.components.map((c) => c.componentId).sort();
  ok(
    JSON.stringify(designCp) === JSON.stringify(implemented),
    `${track.trackId}: implemented components ${JSON.stringify(implemented)} do not match the assigned custom-pleading components ${JSON.stringify(designCp)}.`
  );
  implementedComponentCount += implemented.length;

  // Components in another lane are named, never produced.
  for (const other of manifest.components.filter((c) => c.outputStrategy !== "custom_pleading")) {
    excludedSeen += 1;
    ok(
      !implemented.includes(other.componentId),
      `${other.componentId} is ${other.outputStrategy} and must not be implemented by the custom-pleading job.`
    );
    const recorded = IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS.find(
      (e) => e.componentId === other.componentId
    );
    ok(
      Boolean(recorded),
      `${other.componentId} is assigned to ${other.outputStrategy} and is not recorded in IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS, so the packet would be silently incomplete.`
    );
    if (recorded) {
      ok(
        recorded.officialFormId === other.officialFormId,
        `${other.componentId}: recorded official form ${recorded.officialFormId} is not the design's ${other.officialFormId}.`
      );
      ok(
        recorded.requirement === other.requirement,
        `${other.componentId}: recorded requirement ${recorded.requirement} is not the design's ${other.requirement}.`
      );
    }
  }

  for (const component of track.packetSet.components) {
    const designComponent = manifest.components.find((c) => c.componentId === component.componentId);
    ok(
      designComponent && designComponent.order === component.order,
      `${component.componentId}: packet order ${component.order} is not the order the design assigns.`
    );
    ok(
      designComponent && designComponent.requirement === component.requirement,
      `${component.componentId}: requirement ${component.requirement} does not match the design.`
    );
    ok(
      component.requirement === "required" && component.conditionKey === undefined,
      `${component.componentId}: carries a condition the design does not give it.`
    );

    const spec = specs.find((s) => s.componentId === component.componentId);
    ok(Boolean(spec), `${component.componentId}: no governing custom-pleading specification.`);
    if (spec) {
      ok(
        IN_DESIGN_ROLE_TO_ENGINE_ROLE[spec.role] === component.role,
        `${component.componentId}: design role ${spec.role} is not mapped to engine role ${component.role}.`
      );
      for (const requirement of spec.generationRequirements) {
        ok(
          track.requiredInputs.some((input) => input.key === requirement.key),
          `${track.trackId}: the design asks for ${requirement.key} and the track declares no such input.`
        );
      }
    }
    ok(
      Boolean(pleadingTemplate(component.templateId)),
      `${component.componentId}: template ${component.templateId} is not registered.`
    );
    ok(
      component.sourcePath === null && component.sourceSha256 === null,
      `${component.componentId}: claims an official source. Indiana publishes no form for any of these three mechanisms.`
    );
    ok(
      component.approval.legal === "not_submitted" && component.approval.visual === "not_reviewed",
      `${component.componentId}: claims an approval this job cannot give.`
    );
    ok(
      component.outputStrategy === "custom_pleading" &&
        component.rendererStrategy === "custom_pleading",
      `${component.componentId}: is not a custom pleading.`
    );
  }

  // Declared inputs are the design's, and only the design's.
  const designKeys = new Set(
    specs
      .filter((s) => s.trackId === track.trackId)
      .flatMap((s) => s.generationRequirements.map((r) => r.key))
  );
  for (const input of track.requiredInputs) {
    ok(
      designKeys.has(input.key),
      `${track.trackId}: declares input ${input.key}, which the design does not ask for.`
    );
  }
  for (const requirement of specs
    .filter((s) => s.trackId === track.trackId)
    .flatMap((s) => s.generationRequirements)) {
    const input = track.requiredInputs.find((i) => i.key === requirement.key);
    if (!input) continue;
    ok(
      input.required === (requirement.requirement === "required"),
      `${track.trackId}: ${requirement.key} is declared ${input.required ? "required" : "optional"} and the design says ${requirement.requirement}.`
    );
  }

  // The normalized registry, memo and specification agree with the track.
  const designTrack = registry.find((t) => t.trackId === track.trackId);
  ok(Boolean(designTrack), `${track.trackId}: is not in the normalized track registry.`);
  if (designTrack) {
    ok(
      designTrack.outputStrategy === "custom_pleading",
      `${track.trackId}: the design does not classify this as custom_pleading.`
    );
    ok(
      designTrack.geographicScope === track.geographicScope,
      `${track.trackId}: geographic scope does not match the design.`
    );
    ok(
      JSON.stringify(designTrack.dispositions) === JSON.stringify(track.dispositions),
      `${track.trackId}: dispositions do not match the design.`
    );
    ok(
      JSON.stringify(designTrack.recordTypes) === JSON.stringify(track.recordTypes),
      `${track.trackId}: record types do not match the design.`
    );
    ok(
      designTrack.destination?.kind === "court",
      `${track.trackId}: the design does not send this route to a court.`
    );
  }
  const memoTrack = memo.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(memoTrack), `${track.trackId}: is not in the Indiana legal-design memo.`);
  if (memoTrack) {
    ok(
      memoTrack.legalDesignDecision.status === "legal_design_approved_with_limitations",
      `${track.trackId}: the memo does not approve this route.`
    );
    ok(
      memoTrack.authority === undefined || true,
      `${track.trackId}: unreachable.`
    );
    ok(
      memoTrack.controllingAuthority.citations.includes(track.authority),
      `${track.trackId}: the track cites ${track.authority}, which the memo's controlling authority does not list.`
    );
    ok(
      memoTrack.geography.scope === track.geographicScope &&
        memoTrack.geography.keys.length === track.geographyKeys.length,
      `${track.trackId}: the memo's geography does not match the track's.`
    );
    ok(
      (memoTrack.unresolvedQuestions ?? []).every((q) => q.impact !== "build_blocker"),
      `${track.trackId}: the memo carries a build blocker, so nothing should have been drafted.`
    );
    ok(
      (memoTrack.legalDesignDecision.limitations ?? []).every(
        (l) => l.classification !== "legal_design_blocker"
      ),
      `${track.trackId}: the memo carries a legal_design_blocker, so the route is withheld.`
    );
  }
  ok(track.runtimeDisabled === true, `${track.trackId}: is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId}: is not a technical fixture.`);
}

ok(
  implementedComponentCount === 10,
  `Implemented ${implementedComponentCount} custom-pleading components rather than the ten assigned.`
);
ok(
  excludedSeen === 3 && IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS.length === 3,
  `Saw ${excludedSeen} non-custom-pleading components in the assigned tracks and recorded ${IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS.length}; the design assigns three, all official_pdf_fill on the Section 5 route.`
);
ok(
  Object.keys(INDIANA_PLEADING_TEMPLATES).length === 10,
  `Registered ${Object.keys(INDIANA_PLEADING_TEMPLATES).length} templates rather than one per assigned component.`
);

note(
  `1. Assignment: exactly three assigned tracks and their ${implementedComponentCount} assigned custom-pleading components, each pinned to the design's component id, order, requirement, role, template and declared inputs; the three official_pdf_fill attachments on the Section 5 route are recorded and excluded rather than produced; the seven other Indiana routes are absent; the memo approves all three routes with no build blocker and no legal-design blocker.`
);

// ---------------------------------------------------------------------------
// 2. The design's boundaries, on the face of every document
// ---------------------------------------------------------------------------

const templatesById = new Map();
for (const track of orderedTracks) {
  for (const component of track.packetSet.components) {
    templatesById.set(component.componentId, {
      component,
      track,
      template: pleadingTemplate(component.templateId)
    });
  }
}

const sourceOf = (template) => JSON.stringify(template);

/**
 * Content no Indiana document may carry.
 *
 * Each pattern matches an assertion rather than a mention. The honest copy here
 * names destruction, consent, findings and service in order to say who owns each
 * and that none has happened, so a blunter check would fire on the disclaimer it
 * exists to protect.
 */
const PROHIBITED = [
  // A money amount ends in a digit, or the comma after it is swallowed and every
  // established figure reads as unestablished. No Indiana fee is established.
  [/\$\s?[\d,]*\d/, "a monetary amount, and no Indiana filing fee has been established"],
  [
    /\brecords?\s+(?:will be|are|is)\s+(?:destroyed|deleted|erased|wiped)\b/i,
    "an assertion that records are destroyed, which I.C. 35-38-9-1(k) contradicts"
  ],
  [
    /\b(?:destroys|erases|deletes)\s+(?:the|your|all)\s+records?\b/i,
    "an assertion that the order destroys records"
  ],
  [
    /\b(?:you|the petitioner|petitioner)\s+(?:is|are)\s+eligible\b/i,
    "an eligibility determination, which is the court's"
  ],
  [/\byou qualify\b/i, "an eligibility determination"],
  [
    /\bwill be (?:granted|expunged|sealed|approved|cleared)\b/i,
    "a promise about what the court will do"
  ],
  [/\byour record will be clear\b|\bguaranteed\b/i, "a promise about the result"],
  [
    /\bthe prosecut(?:ing attorney|or)\s+(?:has\s+)?(?:consented|agreed|approved|stipulated)\b/i,
    "an assertion that the prosecuting attorney consented, other than as the petitioner's own verified statement"
  ],
  [
    /\bthe Court (?:finds|found|has found) that the petition(?:er)? (?:is|was|should)\b/i,
    "a populated judicial finding"
  ],
  [/\(\s*[xX]\s*\)/, "a checked box on a proposed order, which is the court's mark"],
  [/Notary Public|Sworn to before me|\/s\//i, "a notarial block or a populated execution"],
  [/\bDate:\s*\d/, "a populated date where a rule belongs"],
  [
    /\b(?:was|has been|have been) served (?:on|upon)\b/i,
    "a statement that service has already happened"
  ],
  [/\bwe (?:certify|verify|confirm)\b/i, "a certification by LegalEase"],
  [
    /\bLegalEase (?:has )?(?:filed|served|obtained|reviewed|checked) (?:the|your|this)\b/i,
    "a claim that LegalEase filed, served, obtained or reviewed something"
  ],
  [/\bhearing (?:is|has been) set for\b/i, "a hearing date, which the court sets"]
];

/** Indiana counties and courts that must never appear as fixed language. */
const HARDCODED_PLACES =
  /\b(Marion|Lake|Allen|Hamilton|St\.? Joseph|Elkhart|Vanderburgh|Tippecanoe|Porter|Hendricks|Johnson|Madison|Monroe|Vigo|Delaware|LaPorte)\s+(?:County|Circuit|Superior)\b/i;

const ORDER_TEMPLATE_IDS = new Set([
  "in_collateral_action-proposed-order",
  "in_conviction_serious_felony-proposed-order",
  "in_supplemental_order-proposed-order"
]);
const INSTRUCTION_TEMPLATE_IDS = new Set(["in_conviction_serious_felony-instructions"]);

for (const [componentId, { component, template }] of templatesById) {
  const source = sourceOf(template);

  for (const [pattern, description] of PROHIBITED) {
    ok(!pattern.test(source), `${componentId}: contains ${description}.`);
  }
  ok(!HARDCODED_PLACES.test(source), `${componentId}: hardcodes an Indiana county or court.`);

  ok(template.technicalFixture === true, `${component.templateId}: is not marked a technical fixture.`);
  ok(
    template.fixtureBanner && /DRAFT PENDING LEGAL REVIEW/.test(template.fixtureBanner),
    `${component.templateId}: carries no draft banner.`
  );
  ok(
    !/\{\{/.test(source.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")),
    `${component.templateId}: malformed placeholder.`
  );

  // Every document cites the mechanism it is drawn to.
  ok(
    /35-38-9/.test(source),
    `${componentId}: does not cite I.C. 35-38-9, which is the chapter the whole route runs on.`
  );

  if (ORDER_TEMPLATE_IDS.has(template.templateId)) {
    // A proposed order is the court's. Nothing on it is signed, decided or
    // filled in by LegalEase.
    ok(
      template.signatureLabel === null,
      `${componentId}: a proposed order carries a participant signature rule.`
    );
    ok(
      template.signatureBlock.some((line) => /^JUDGE$/.test(line.trim())),
      `${componentId}: a proposed order carries no judge's signature block.`
    );
    ok(
      template.verification === undefined,
      `${componentId}: a proposed order carries a verification, and the court does not verify.`
    );
    ok(
      /\(\s+\)/.test(source),
      `${componentId}: a proposed order carries no unchecked finding boxes for the court.`
    );
    ok(
      /Nothing in this order directs that any record be deleted or destroyed/.test(source),
      `${componentId}: a proposed order does not say that nothing is deleted or destroyed.`
    );
    // Notice and service are findings for the court. Recited in the preamble
    // they read as an assertion that either has already happened.
    for (const paragraph of template.sections.flatMap((section) => section.paragraphs)) {
      if (!/\b(notified|served|notice|service)\b/i.test(paragraph)) continue;
      ok(
        /^\(\s+\)/.test(paragraph),
        `${componentId}: a proposed order recites notice or service outside an unchecked finding box: "${paragraph.slice(0, 70)}..."`
      );
    }
    ok(
      /is the Court's\. Nothing on this page has been decided|blank above is the Court's/.test(source),
      `${componentId}: a proposed order does not say that every finding is the court's.`
    );
  } else {
    ok(
      source.includes(IN_SEALING_NOT_DESTRUCTION),
      `${componentId}: does not carry the design's sealing-not-destruction disclosure verbatim.`
    );
    ok(
      source.includes(IN_FILE_PUBLIC_UNTIL_GRANTED),
      `${componentId}: does not disclose that the expungement case file is public until the order is granted.`
    );
  }

  if (component.role === "primary_filing") {
    ok(
      typeof template.verification === "string" && /penalties for perjury/.test(template.verification),
      `${componentId}: a verified filing carries no verification.`
    );
    ok(
      typeof template.signatureLabel === "string" && /petitioner/i.test(template.signatureLabel),
      `${componentId}: a verified filing carries no petitioner signature rule.`
    );
    ok(
      template.signatureBlock.some((line) => /Date: _+/.test(line)),
      `${componentId}: the execution block carries no blank date rule.`
    );
    ok(
      template.signatureBlock.some((line) => /Confirm the court's own name/.test(line)),
      `${componentId}: does not tell the petitioner to confirm the court with the clerk.`
    );
    ok(
      !template.signatureBlock.some((line) => /^\s*(Judge|Clerk|Prosecut)/i.test(line)),
      `${componentId}: carries a signature line for an outside party.`
    );
    ok(/WHERE THIS PACKET STOPS/.test(source), `${componentId}: carries no printed stop section.`);
    ok(source.includes(IN_REFERRAL), `${componentId}: the stop section carries no referral.`);
    ok(
      /Chastain v\. State/.test(source),
      `${componentId}: does not print the Chastain gate, which the design makes a hard gate on every conviction filing.`
    );
  }

  if (component.role === "attachment") {
    ok(
      /This is a cover page, and nothing else/.test(source),
      `${componentId}: an exhibit cover does not say on its face that it is only a cover page.`
    );
    ok(
      /is not (?:the order it names|a consent)/.test(source),
      `${componentId}: an exhibit cover does not disclaim being the document it names.`
    );
    ok(
      template.signatureLabel === null && template.signatureBlock.length === 0,
      `${componentId}: an exhibit cover carries an execution block, and nobody signs a cover page.`
    );
    ok(
      /LegalEase has never seen this order|Nobody at LegalEase has seen it|LegalEase does not draft, sign, request or negotiate/.test(
        source
      ),
      `${componentId}: an exhibit cover does not disclaim having seen or obtained the document.`
    );
  }

  if (INSTRUCTION_TEMPLATE_IDS.has(template.templateId)) {
    ok(
      /KEEP THIS PAGE, DO NOT FILE IT/.test(source),
      `${componentId}: the instruction sheet does not say it is not filed.`
    );
    ok(
      template.signatureLabel === null && template.signatureBlock.length === 0,
      `${componentId}: the instruction sheet carries an execution block.`
    );
    ok(
      !/IN THE .{0,40}COURT OF/.test(template.caption.courtLine),
      `${componentId}: the instruction sheet is captioned in a court, and it is filed with nothing.`
    );
    ok(
      /LegalEase serves nothing and files nothing/.test(source),
      `${componentId}: the instruction sheet does not say that LegalEase neither serves nor files.`
    );
    // The three official forms this packet cannot produce are named, one by one.
    for (const excluded of IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS) {
      ok(
        source.includes(excluded.officialFormId) || source.includes(excluded.title),
        `${componentId}: does not name ${excluded.officialFormId}, an official form the packet does not contain.`
      );
    }
    ok(
      /A packet without them is incomplete/.test(source),
      `${componentId}: does not say that the packet is incomplete without the official forms.`
    );
  }
}

// The Section 5 documents carry the consent boundary, and only there.
const felonyPetition = pleadingTemplate("in_conviction_serious_felony-petition");
const felonyConsentExhibit = pleadingTemplate("in_conviction_serious_felony-consent-exhibit-cover");
const felonyInstructions = pleadingTemplate("in_conviction_serious_felony-instructions");
for (const [label, template] of [
  ["petition", felonyPetition],
  ["consent exhibit", felonyConsentExhibit],
  ["instructions", felonyInstructions]
]) {
  const source = sourceOf(template);
  ok(
    /35-38-9-5\(c\)\(5\)/.test(source),
    `Section 5 ${label}: does not cite the subsection that makes written prosecutor consent a condition of filing.`
  );
  ok(
    /Silence is not consent/.test(source),
    `Section 5 ${label}: does not say that silence is not consent.`
  );
}
ok(
  /LegalEase does not seek the consent, does not negotiate for it, and does not speak to the prosecuting attorney/.test(
    sourceOf(felonyPetition)
  ),
  "The Section 5 petition does not disclaim seeking or negotiating for the prosecutor's consent."
);
ok(
  /LegalEase does not draft, sign, request or negotiate this consent/.test(
    sourceOf(felonyConsentExhibit)
  ),
  "The consent exhibit does not disclaim drafting or signing the consent."
);
ok(
  /LAST FOUR DIGITS ONLY/.test(sourceOf(felonyPetition)) &&
    /never asks for the full number, never prints it and never keeps it/.test(sourceOf(felonyPetition)),
  "The Section 5 petition does not confine the Social Security number to its last four digits."
);
ok(
  !/\b\d{3}-\d{2}-\d{4}\b/.test(sourceOf(felonyPetition)),
  "The Section 5 petition prints something shaped like a Social Security number."
);
ok(
  /I\.C\. 35-38-9-8\(d\)/.test(sourceOf(felonyPetition)) &&
    /reduce or waive/.test(sourceOf(felonyPetition)),
  "The Section 5 petition does not surface the indigency fee waiver the design requires."
);
ok(
  /thirty days after receipt, and waives any objection by failing to respond/.test(
    sourceOf(felonyPetition)
  ),
  "The Section 5 petition does not state the prosecutor's thirty-day response and waiver under I.C. 35-38-9-8(g)."
);

// The supplemental petition refuses to decide which amendment gives more relief.
const supplementalPetition = pleadingTemplate("in_supplemental_order-petition");
ok(
  /LegalEase has not decided that the amendment named above provides greater relief/.test(
    sourceOf(supplementalPetition)
  ),
  "The supplemental petition does not refuse, in terms, to decide which amendment provides greater relief."
);
ok(
  /experience yearly modification|amended in most recent sessions/.test(sourceOf(supplementalPetition)),
  "The supplemental petition does not preserve the open question about the current amendment cycle."
);
ok(
  /Both findings are the Court's, and neither has been made/.test(sourceOf(supplementalPetition)),
  "The supplemental petition does not say that both I.C. 35-38-9-9(l) findings remain the court's and unmade."
);

// The collateral-action request keeps the no-fee rule and the notice rule.
const collateralRequest = pleadingTemplate("in_collateral_action-request");
ok(
  /There is no filing fee for this request/.test(sourceOf(collateralRequest)),
  "The collateral-action request does not state that there is no fee."
);
ok(
  /the Court notifies the prosecuting attorney of that county/i.test(sourceOf(collateralRequest)),
  "The collateral-action request does not state who gives notice."
);
ok(
  /do not assume no service is required/i.test(sourceOf(collateralRequest)),
  "The collateral-action request does not preserve the design's warning to confirm local service practice."
);

note(
  "2. Boundaries: every document cites I.C. 35-38-9 and carries the sealing-not-destruction and public-file disclosures the design requires; no document prints a fee amount, an eligibility determination, a promise of outcome, a checked finding box, a populated judicial date or signature, a notarial block, or a claim that service or filing happened; no county or court is hardcoded; every proposed order is unsigned, unverified and carries only unchecked boxes; every exhibit cover says it is only a cover page and disclaims being the document it names; the Section 5 documents carry the § 35-38-9-5(c)(5) consent condition, the silence-is-not-consent rule, the last-four-digits rule, the § 35-38-9-8(d) waiver and the § 35-38-9-8(g) thirty-day waiver; the supplemental petition refuses to decide which amendment gives greater relief."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical per assigned track, plus variants
// ---------------------------------------------------------------------------

/** Synthetic answers only. No real person's record is used anywhere here. */
const collateralBase = (overrides = {}) => ({
  originalExpungementCounty: "Bartholomew County, on 12 March 2021",
  originalExpungementSection: "2",
  collateralActionCounty: "Bartholomew County",
  collateralActionCauseNumber: "03C01-2104-MI-000517",
  collateralActionType: "civil forfeiture",
  relationshipToExpungedMatter:
    "The money and the car were taken from me during the same traffic stop that led to the charge in the case that was expunged. The forfeiture case was filed a few weeks later and it names the same stop and the same date.",
  ...overrides
});

const felonyBase = (overrides = {}) => ({
  countyOfConviction: "Wayne County",
  caseNumber: "89D02-2009-F5-000241",
  convictionDate: "4 November 2010",
  offenseLevel: "another felony",
  sentenceCompletionDate: "17 June 2014",
  allConvictionsAnyCounty:
    "One felony conviction in this cause. Nothing else on my record anywhere in Indiana, and everything I have is past its waiting period.",
  priorExpungementPetition: "no",
  financialObligationsPaid: "yes",
  pendingCharges: "no",
  convictedWithinPeriod: "no",
  prosecutorConsent: "yes",
  additionalInformation:
    "I have worked at the same warehouse for nine years and I am trying to move into a role that runs a background check. I finished everything the court ordered and have not been in any trouble since.",
  ...overrides
});

const supplementalBase = (overrides = {}) => ({
  originalExpungementCourt: "Vermillion Circuit Court, on 8 August 2019",
  originalExpungementSection: "3",
  amendmentRelieadOn:
    "I was told the legislature changed the section my expungement was granted under so that the records are restricted from more people than they were when my order was signed.",
  reliefSought:
    "I am asking the court to extend my existing order so that it covers everyone the changed law covers, rather than only what the original order said.",
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "in-collateral-action-forfeiture-section-2-1",
    trackId: IN_COLLATERAL_ACTION,
    answers: collateralBase()
  },
  {
    fixtureId: "in-collateral-action-section-4-marked-expunged-2",
    trackId: IN_COLLATERAL_ACTION,
    variantOf: "in-collateral-action-forfeiture-section-2-1",
    variantPurpose:
      "The section the original expungement was granted under changes the operative direction of the order: the design has the court expunge the related action after a Section 1 to 3 grant and mark it expunged after a Section 4 or 5 grant. That is a different order, not a different word.",
    answers: collateralBase({
      originalExpungementSection: "4",
      collateralActionType: "specialized driving privileges"
    })
  },
  {
    fixtureId: "in-section-5-consent-obtained-1",
    trackId: IN_SERIOUS_FELONY,
    answers: felonyBase()
  },
  {
    fixtureId: "in-section-5-consent-not-yet-obtained-2",
    trackId: IN_SERIOUS_FELONY,
    variantOf: "in-section-5-consent-obtained-1",
    variantPurpose:
      "Written prosecutor consent is a condition of filing a Section 5 petition at all, and the design says its absence is not a reason to withhold generation. Where it has not been obtained the exhibit headline, the exhibit body, the petition's consent recital and the filing warning all change to say the petition must not be filed.",
    answers: felonyBase({ prosecutorConsent: "no" })
  },
  {
    fixtureId: "in-section-5-serious-bodily-injury-3",
    trackId: IN_SERIOUS_FELONY,
    variantOf: "in-section-5-consent-obtained-1",
    variantPurpose:
      "A felony involving serious bodily injury is within Section 5 rather than excluded from it, and Allen v. State makes whether injury was an element of the offence the decisive question. The petition's offence recital changes to say that this petition does not decide it.",
    answers: felonyBase({ offenseLevel: "felony involving serious bodily injury" })
  },
  {
    fixtureId: "in-supplemental-petition-section-3-1",
    trackId: IN_SUPPLEMENTAL_ORDER,
    answers: supplementalBase()
  }
];

const canonicalFor = {
  [IN_COLLATERAL_ACTION]: collateralBase,
  [IN_SERIOUS_FELONY]: felonyBase,
  [IN_SUPPLEMENTAL_ORDER]: supplementalBase
};

for (const trackId of TRACK_IDS) {
  ok(
    FIXTURES.filter((f) => !f.variantOf && f.trackId === trackId).length === 1,
    `${trackId}: does not have exactly one canonical fixture.`
  );
}
ok(
  FIXTURES.filter((f) => !f.variantOf).length === TRACK_IDS.length,
  "There is a canonical fixture on a track this job was not assigned."
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
ok(
  new Set(FIXTURES.map((f) => f.trackId)).size === TRACK_IDS.length,
  "A variant introduced a track that is not one of the three assigned."
);

note(
  `3. Fixtures: ${TRACK_IDS.length} canonical fixtures, one per assigned track, and ${FIXTURES.filter((f) => f.variantOf).length} regression variants, each naming a canonical fixture on its own track and each recording the material branch it tests. Every answer is synthetic.`
);

// ---------------------------------------------------------------------------
// 4. Typed stops and closed lists
// ---------------------------------------------------------------------------

const NEGATIVE = [
  // Missing participant facts.
  [
    "the collateral action's cause number is missing",
    IN_COLLATERAL_ACTION,
    collateralBase({ collateralActionCauseNumber: "" }),
    "in-answer-missing"
  ],
  [
    "the Section 5 cause number is missing",
    IN_SERIOUS_FELONY,
    felonyBase({ caseNumber: "" }),
    "in-answer-missing"
  ],
  [
    "the supplemental petition's relief sought is missing",
    IN_SUPPLEMENTAL_ORDER,
    supplementalBase({ reliefSought: "" }),
    "in-answer-missing"
  ],
  // Unresolved venue and unidentified order.
  [
    "the original expungement cannot be identified",
    IN_COLLATERAL_ACTION,
    collateralBase({ originalExpungementCounty: "somewhere down south, I do not know when" }),
    "in-original-expungement-not-identified"
  ],
  [
    "the granting court cannot be identified",
    IN_SUPPLEMENTAL_ORDER,
    supplementalBase({ originalExpungementCourt: "I am not sure which court it was" }),
    "in-granting-court-not-identified"
  ],
  // Wrong court level and route outside scope.
  [
    "the offence is a misdemeanour, which is a different section",
    IN_SERIOUS_FELONY,
    felonyBase({ offenseLevel: "misdemeanor" }),
    "in-offense-level-not-section-five"
  ],
  [
    "the offence is a Class D or Level 6 felony, which is a different section",
    IN_SERIOUS_FELONY,
    felonyBase({ offenseLevel: "class d or level 6 felony" }),
    "in-offense-level-not-section-five"
  ],
  // Pending charges.
  [
    "charges are pending",
    IN_SERIOUS_FELONY,
    felonyBase({ pendingCharges: "yes" }),
    "in-charges-pending"
  ],
  // Incomplete waiting period.
  [
    "a conviction fell inside the waiting period",
    IN_SERIOUS_FELONY,
    felonyBase({ convictedWithinPeriod: "yes" }),
    "in-conviction-within-waiting-period"
  ],
  [
    "the conviction date is not established",
    IN_SERIOUS_FELONY,
    felonyBase({ convictionDate: "some time in the autumn" }),
    "in-conviction-date-not-established"
  ],
  [
    "the sentence completion date is not established",
    IN_SERIOUS_FELONY,
    felonyBase({ sentenceCompletionDate: "I do not remember" }),
    "in-sentence-completion-not-established"
  ],
  // Ineligible or disputed disposition.
  [
    "fines, fees or restitution are outstanding",
    IN_SERIOUS_FELONY,
    felonyBase({ financialObligationsPaid: "no" }),
    "in-financial-obligations-outstanding"
  ],
  [
    "a Sections 2 to 5 petition has already been filed",
    IN_SERIOUS_FELONY,
    felonyBase({ priorExpungementPetition: "yes" }),
    "in-prior-petition-filed"
  ],
  // Contested, attorney-only and sequencing questions.
  [
    "a conviction is not eligible yet, which is the Chastain trap",
    IN_SERIOUS_FELONY,
    felonyBase({
      allConvictionsAnyCounty:
        "This one, and a theft from 2022 that is not eligible yet, but I want to file now."
    }),
    "in-conviction-not-yet-eligible-chastain"
  ],
  [
    "convictions sit in more than one county",
    IN_SERIOUS_FELONY,
    felonyBase({
      allConvictionsAnyCounty: "This one, and one more in another county from a long time ago."
    }),
    "in-multi-county-365-day-window"
  ],
  [
    "the section classification is not settled",
    IN_SERIOUS_FELONY,
    felonyBase({ offenseLevel: "another felony, I think, but I am not sure" }),
    "in-section-classification-unclear"
  ],
  [
    "the amendment relied on is not identified",
    IN_SUPPLEMENTAL_ORDER,
    supplementalBase({ amendmentRelieadOn: "I do not know which change it was" }),
    "in-amendment-not-identified"
  ],
  // Outside-party content, including a request to populate consent or findings.
  [
    "the prosecutor's written consent is supplied",
    IN_SERIOUS_FELONY,
    felonyBase({ prosecutorConsentDocument: "The State consents to expungement. /s/ A. Prosecutor" }),
    "in-outside-party-content-refused"
  ],
  [
    "a judicial finding is supplied",
    IN_SERIOUS_FELONY,
    felonyBase({ courtFindings: "The Court finds the petitioner meets the criteria." }),
    "in-outside-party-content-refused"
  ],
  [
    "a judge's signature is supplied",
    IN_COLLATERAL_ACTION,
    collateralBase({ judgeSignature: "Hon. R. Whitcomb" }),
    "in-outside-party-content-refused"
  ],
  [
    "a hearing date is supplied",
    IN_COLLATERAL_ACTION,
    collateralBase({ hearingDate: "14 May 2026 at 9.00" }),
    "in-outside-party-content-refused"
  ],
  [
    "a filing date is supplied",
    IN_SUPPLEMENTAL_ORDER,
    supplementalBase({ filingDate: "2 February 2026" }),
    "in-outside-party-content-refused"
  ],
  [
    "a clerk's certification is supplied",
    IN_SUPPLEMENTAL_ORDER,
    supplementalBase({ clerkCertification: "Certified a true copy" }),
    "in-outside-party-content-refused"
  ],
  [
    "proof of completed service is supplied",
    IN_SERIOUS_FELONY,
    felonyBase({ proofOfService: "Served on the prosecutor 1 March 2026" }),
    "in-outside-party-content-refused"
  ],
  [
    "the original expungement order itself is supplied",
    IN_COLLATERAL_ACTION,
    collateralBase({ originalExpungementOrderDocument: "ORDER OF EXPUNGEMENT ..." }),
    "in-outside-party-content-refused"
  ]
];

let stopped = 0;
const stopIdsSeen = new Set();
for (const [label, trackId, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveIndianaFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(caught instanceof IndianaEligibilityStopError, `${label} did not fail closed with a typed stop.`);
  if (caught instanceof IndianaEligibilityStopError) {
    ok(caught.stopId === expectedStopId, `${label} raised ${caught.stopId} rather than ${expectedStopId}.`);
    ok(caught.trackId === trackId, `${label} reported the wrong track.`);
    ok(caught.reason.length > 60, `${label} gives no reason a person could act on.`);
    ok(caught.referral.length > 20, `${label} lost its destination.`);
    ok(caught.nextStep.length > 30, `${label} gives no next step a person could take.`);
    ok(
      REFERRALS.includes(caught.referral),
      `${label} routes to a destination the module does not define.`
    );
    // No stop routes the petitioner back into the thing that stopped them.
    ok(
      !/\bfile (this|the same) (petition|request)\b/i.test(`${caught.referral} ${caught.nextStep}`),
      `${label} sends the petitioner back to file the same document that was stopped.`
    );
    stopped += 1;
    stopIdsSeen.add(caught.stopId);
  }
}

/** The destination each stop family must reach, checked one by one. */
const ROUTING = [
  [IN_SERIOUS_FELONY, felonyBase({ offenseLevel: "misdemeanor" }), IN_ROUTING_REFERRAL],
  [
    IN_SERIOUS_FELONY,
    felonyBase({
      allConvictionsAnyCounty: "This one, and a theft from 2022 that is not eligible yet."
    }),
    IN_SEQUENCING_REFERRAL
  ],
  [IN_SERIOUS_FELONY, felonyBase({ financialObligationsPaid: "no" }), IN_CLERK_REFERRAL],
  [IN_SERIOUS_FELONY, felonyBase({ convictedWithinPeriod: "yes" }), IN_STATE_POLICE_REFERRAL],
  [IN_SERIOUS_FELONY, felonyBase({ pendingCharges: "yes" }), IN_REFERRAL],
  [IN_SERIOUS_FELONY, felonyBase({ priorExpungementPetition: "yes" }), IN_SEQUENCING_REFERRAL],
  [
    IN_COLLATERAL_ACTION,
    collateralBase({ judgeSignature: "Hon. R. Whitcomb" }),
    IN_CLERK_REFERRAL
  ],
  [
    IN_SUPPLEMENTAL_ORDER,
    supplementalBase({ amendmentRelieadOn: "I do not know which change it was" }),
    IN_REFERRAL
  ]
];
for (const [trackId, answers, expectedReferral] of ROUTING) {
  let caught = null;
  try {
    deriveIndianaFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught?.referral === expectedReferral,
    `${trackId}: a stop routed to ${String(caught?.referral).slice(0, 40)}... rather than the destination the design gives it.`
  );
}

// A denial is not an assertion, or the route would stop on its own disclaimer.
const allEligible = deriveIndianaFacts(
  IN_SERIOUS_FELONY,
  felonyBase({
    allConvictionsAnyCounty: "Just this one conviction, and every record I have is eligible."
  })
);
ok(
  Boolean(allEligible.priorConvictionsStatement),
  "An answer stating that every record is eligible was treated as asserting an ineligible one."
);

// Closed lists reject anything outside them.
const BRANCH_CASES = [
  [IN_COLLATERAL_ACTION, "originalExpungementSection", "6"],
  [IN_COLLATERAL_ACTION, "collateralActionType", "a tax lien"],
  [IN_SERIOUS_FELONY, "offenseLevel", "an infraction"],
  [IN_SERIOUS_FELONY, "pendingCharges", "probably not"],
  [IN_SERIOUS_FELONY, "prosecutorConsent", "they said they would think about it"],
  [IN_SUPPLEMENTAL_ORDER, "originalExpungementSection", "whichever one it was"]
];
let branchRejected = 0;
for (const [trackId, key, value] of BRANCH_CASES) {
  const base = canonicalFor[trackId];
  let caught = null;
  try {
    deriveIndianaFacts(trackId, base({ [key]: value }));
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof IndianaBranchError,
    `"${value}" for ${key} on ${trackId} was not rejected as outside the approved list.`
  );
  if (caught instanceof IndianaBranchError) branchRejected += 1;
}

// A track this job was not assigned cannot be derived for.
for (const trackId of ["in_conviction_misd", "in_auto_expungement", "in-something-else"]) {
  let caught = null;
  try {
    deriveIndianaFacts(trackId, {});
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof IndianaBranchError,
    `An unassigned track identifier ${trackId} was accepted by the fact derivation.`
  );
}

ok(Object.keys(IN_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(new Set(Object.values(IN_EXPUNGEMENT_SECTIONS)).size === 5, "The section list changed size.");
ok(
  new Set(Object.values(IN_COLLATERAL_ACTION_TYPES)).size === 4,
  "The collateral-action-type list changed size."
);
ok(new Set(Object.values(IN_OFFENSE_LEVELS)).size === 4, "The offence-level list changed size.");
ok(IN_OUTSIDE_PARTY_KEYS.length >= 12, "The outside-party key guard was narrowed.");
for (const referral of REFERRALS) ok(referral.length > 20, "A referral destination is empty.");

note(
  `4. Stops: ${stopped} negative cases across all three routes fail closed with the expected typed stop, a reason, a destination drawn from the module's own referral set and a next step; ${stopIdsSeen.size} distinct stop families are exercised, covering missing participant facts, an unidentified original order, an unidentified granting court, an offence outside this section, pending charges, a conviction inside the waiting period, unestablished conviction and completion dates, outstanding fines or restitution, a petition already filed, the Chastain not-yet-eligible trap, the multi-county 365-day window, an unsettled section classification, an unidentified amendment, and any attempt to supply the prosecutor's consent, a judicial finding or signature, a hearing or filing date, a clerk's certification, completed service or the expungement order itself; every stop routes away from the node that raised it; ${branchRejected} out-of-list branch values rejected; three unassigned track identifiers refused; four closed lists hold their size.`
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
 * section overleaf, a clipped line and a paragraph rendered twice.
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

/** Section headings, as they are drawn: on a line of their own. */
function headingLines(template) {
  return new Set(
    (template.sections ?? [])
      .map((section) => section.heading)
      .filter(Boolean)
      .map((heading) => heading.replace(/[^\x20-\x7e]/g, "?"))
  );
}

/** A fill-in rule rather than a paragraph. */
const isFillInRule = (line) => {
  const solid = line.replace(/\s+/g, "");
  if (solid.length === 0) return true;
  return (solid.match(/_/g) ?? []).length / solid.length > 0.6;
};

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveIndianaFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "IN",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );
  const expected = fixture.trackId === IN_SERIOUS_FELONY ? 4 : 3;
  ok(
    resolved.components.length === expected,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than ${expected}.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "IN",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "IN",
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

    // No paragraph rendered twice in succession. Deliberate blank fill-in rules
    // repeat by design and are excluded.
    const allLines = pages.flat().filter((line) => line.length > 24 && !isFillInRule(line));
    for (let i = 1; i < allLines.length; i += 1) {
      ok(
        allLines[i] !== allLines[i - 1],
        `${fixture.fixtureId}/${component.componentId}: the line "${allLines[i].slice(0, 60)}..." is rendered twice in succession.`
      );
    }

    const rendered = pages.flat().join("\n");
    ok(
      !/\{\{/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: an unresolved placeholder reached the page.`
    );
    ok(
      !/\$\s?[\d,]*\d/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: the rendered page prints a monetary amount, and no Indiana fee is established.`
    );
    ok(
      !/^\s*(yes|no|true|false|another felony|misdemeanor)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare branch answer is rendered on a line of its own.`
    );
    ok(
      !/\bDate:\s*\d/.test(rendered) && !/\/s\//.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a protected execution field is populated.`
    );
    ok(
      !/\(\s*[xX]\s*\)/.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a finding box is checked on a rendered page.`
    );
    // An outcome on THIS matter, not the prior expungement two of these routes
    // are premised on. "The case that was expunged" is the petitioner's own
    // stated premise and is the reason the route exists; a blunt check on
    // "was expunged" fires on it and would force the copy to stop saying the
    // one thing that makes the request coherent.
    for (const [pattern, description] of [
      [
        /\b(?:this|the) (?:petition|request|supplemental petition|cause) (?:has been|was) (?:granted|denied|filed)\b/i,
        "reports that this filing has been granted, denied or filed"
      ],
      [
        /\byour records?\b[^.]{0,30}\b(?:has|have) been (?:expunged|sealed|cleared)\b/i,
        "reports that the record in this matter has already been cleared"
      ],
      [
        /\b(?:has been|was|have been) served (?:on|upon)\b/i,
        "reports that service has already happened"
      ],
      [
        /\bthe Court (?:has )?(?:granted|entered|signed)\b/i,
        "reports that the court has acted"
      ]
    ]) {
      ok(
        !pattern.test(rendered),
        `${fixture.fixtureId}/${component.componentId}: the rendered page ${description}.`
      );
    }
    // Every county and court named on the page came from the fixture's own
    // answers, so nothing invents a venue.
    for (const match of rendered.matchAll(/\b([A-Z][a-zA-Z.]+)\s+County\b/g)) {
      const name = match[1];
      if (name === "COUNTY" || name === "The" || name === "This") continue;
      ok(
        Object.values(fixture.answers).some((value) => String(value).includes(name)),
        `${fixture.fixtureId}/${component.componentId}: names ${name} County, which is in no answer the fixture gave.`
      );
    }
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
    jurisdiction: "IN",
    jurisdictionName: "Indiana",
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
    assembled.componentRanges[0].role === "primary_filing",
    `${fixture.fixtureId}: the assembled packet does not open with the operative filing.`
  );
  ok(
    assembled.componentRanges[1].role === "proposed_order",
    `${fixture.fixtureId}: the proposed order is not bound behind the operative filing.`
  );
  if (fixture.trackId === IN_SERIOUS_FELONY) {
    ok(
      assembled.componentRanges[3]?.role === "instructions" &&
        assembled.componentRanges[3]?.order === 7,
      `${fixture.fixtureId}: the instruction sheet does not keep the design's order 7, which is what marks where the three official forms belong.`
    );
  }

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    sampleRole: fixture.variantOf ? "variant" : "canonical",
    variantOf: fixture.variantOf ?? null,
    variantPurpose: fixture.variantPurpose ?? null,
    components: assemblyComponents.length,
    pages: assembled.pageCount,
    sha256: assembled.sha256
  });
}

note(
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, none trailing empty, no heading stranded from its section, no line past the margin, no paragraph repeated, no bare branch answer, no unresolved placeholder, no populated execution field, no checked finding box, no monetary amount, no reported outcome and no county that did not come from the fixture's own answers.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const collateralFacts = deriveIndianaFacts(IN_COLLATERAL_ACTION, collateralBase());
ok(
  collateralFacts.relationshipStatement === collateralBase().relationshipToExpungedMatter,
  "The petitioner's own account of the relationship was rewritten rather than carried through."
);
ok(
  /be EXPUNGED,/.test(collateralFacts.orderOperativeDirection),
  "A Section 2 original grant does not produce an order expunging the related action."
);
const collateralSection4 = deriveIndianaFacts(
  IN_COLLATERAL_ACTION,
  collateralBase({ originalExpungementSection: "4" })
);
ok(
  /be MARKED AS EXPUNGED,/.test(collateralSection4.orderOperativeDirection),
  "A Section 4 original grant does not produce an order marking the related action expunged, which is the design's own mapping."
);
ok(
  collateralFacts.orderOperativeDirection !== collateralSection4.orderOperativeDirection,
  "The original-section answer does not change the operative direction of the order."
);

const felonyFacts = deriveIndianaFacts(IN_SERIOUS_FELONY, felonyBase());
const felonyNoConsent = deriveIndianaFacts(IN_SERIOUS_FELONY, felonyBase({ prosecutorConsent: "no" }));
ok(
  /has given written consent/.test(felonyFacts.consentStatement) &&
    /has NOT yet given/.test(felonyNoConsent.consentStatement),
  "The consent answer does not change what the petition says about consent."
);
ok(
  /DO NOT FILE THIS PETITION/.test(felonyNoConsent.consentFilingWarning),
  "A petition without the written consent does not tell the petitioner not to file it."
);
ok(
  !/DO NOT FILE THIS PETITION/.test(felonyFacts.consentFilingWarning),
  "A petition with the written consent still tells the petitioner not to file it."
);
ok(
  /DO NOT FILE/.test(felonyNoConsent.consentExhibitHeadline) &&
    !/DO NOT FILE/.test(felonyFacts.consentExhibitHeadline),
  "The consent exhibit headline does not change with the consent answer."
);
ok(
  felonyFacts.priorConvictionsStatement.includes(felonyBase().allConvictionsAnyCounty),
  "The petitioner's own list of convictions is not carried through verbatim."
);
ok(
  felonyFacts.additionalInformationStatement === felonyBase().additionalInformation,
  "The petitioner's own additional information is not carried through verbatim."
);
ok(
  /this petition does not decide/.test(felonyFacts.offenceStatement),
  "The offence recital does not refuse to decide the section classification."
);

const supplementalFacts = deriveIndianaFacts(IN_SUPPLEMENTAL_ORDER, supplementalBase());
ok(
  supplementalFacts.reliefSoughtStatement === supplementalBase().reliefSought,
  "The petitioner's own statement of relief sought is not carried through verbatim."
);
ok(
  supplementalFacts.amendmentStatement.includes(supplementalBase().amendmentRelieadOn),
  "The amendment the petitioner named is not carried through verbatim."
);
ok(
  supplementalFacts.amendmentRelieadOn === supplementalBase().amendmentRelieadOn,
  "The design's own declared key, misspelled in the memo, was renamed rather than carried through."
);

// Every declared required input reaches the fact bag, or resolvePacket cannot
// check it as answered, and no derived sentence carries a bare branch answer.
for (const fixture of FIXTURES) {
  const facts = deriveIndianaFacts(fixture.trackId, fixture.answers);
  const track = orderedTracks.find((t) => t.trackId === fixture.trackId);
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key) &&
        String(facts[input.key]).trim() !== "",
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!["yes", "no", "1", "2", "3", "4", "5"].includes(value)) continue;
    ok(
      !/Statement$|Recital$|Direction$/.test(key),
      `${fixture.fixtureId}: ${key} carries a bare branch answer into a rendered sentence.`
    );
  }
}

// The material branches produce different packets.
for (const [baseId, variantId] of [
  ["in-collateral-action-forfeiture-section-2-1", "in-collateral-action-section-4-marked-expunged-2"],
  ["in-section-5-consent-obtained-1", "in-section-5-consent-not-yet-obtained-2"],
  ["in-section-5-consent-obtained-1", "in-section-5-serious-bodily-injury-3"]
]) {
  const canonical = results.find((r) => r.fixtureId === baseId);
  const variant = results.find((r) => r.fixtureId === variantId);
  ok(
    canonical && variant && canonical.sha256 !== variant.sha256,
    `${variantId}: the regression variant assembles to the same bytes as ${baseId}, so it tests nothing.`
  );
}
ok(
  new Set(results.map((r) => r.sha256)).size === results.length,
  "Two fixtures assemble to identical bytes."
);

note(
  "6. Values: the petitioner's answers are carried through verbatim into every statement of fact, the original-section answer changes the operative direction of a collateral-action order from expunge to mark-expunged, the consent answer changes the petition's recital, the exhibit headline, the exhibit body and the filing warning together, the offence recital refuses to decide the section classification, the amendment caveat refuses to decide which amendment gives greater relief, every declared required input reaches the fact bag, no derived sentence carries a bare branch answer, and all six fixtures assemble to distinct bytes."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const entry of INDIANA_CUSTOM_PLEADING_TRACKS) {
  ok(entry.statuses.runtime === "runtime_disabled", `${entry.trackId}: is not runtime-disabled.`);
  ok(entry.statuses.legal === "not_submitted", `${entry.trackId}: claims a legal review status.`);
  ok(entry.statuses.visual === "not_reviewed", `${entry.trackId}: claims a visual review status.`);
  ok(entry.jurisdiction === "IN", `${entry.trackId}: is not an Indiana track.`);
  ok(entry.outputStrategy === "custom_pleading", `${entry.trackId}: is not custom_pleading.`);
  ok(
    entry.requiredInputs.length > 0,
    `${entry.trackId}: declares no participant inputs, so nothing can be checked as answered.`
  );
  ok(
    entry.geographyKeys.length === 0 && entry.geographicScope === "statewide",
    `${entry.trackId}: claims a geography the design does not give it.`
  );
}
note(
  "7. Runtime: all three tracks are runtime-disabled, legally unsubmitted, visually unreviewed and statewide."
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Indiana custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Indiana custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(48)} ${result.trackId.padEnd(30)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(3)} pages  sha256=${result.sha256}`
  );
}
console.log("\nAssigned components not produced by this lane:");
for (const excluded of IN_EXCLUDED_OFFICIAL_FORM_COMPONENTS) {
  console.log(
    `  ${excluded.componentId.padEnd(46)} ${excluded.officialFormId.padEnd(34)} ${excluded.requirement}`
  );
}
