// New Mexico guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: New Mexico is not enabled, both
// assigned tracks have a governing specification and match the adopted packet
// set and manifest in component identity, order and requirement, both routes
// render deterministically with no blank page and no detached heading, the
// design's one conditional component gates on a fact and renders when it is on,
// every typed stop and closed list fails closed with a reason, a destination and
// a next step, no stop routes back to its own node, no artifact claims relief
// occurred, and what the design leaves unresolved is stated as unresolved.
//
// Three rules here are New Mexico's own:
//
//   - **The application belongs to the Administrative Office of the Courts.**
//     The design's `manualCompletionItems` put completing and submitting it, and
//     supplying the picture ID, on the participant, and say in terms that it is
//     "the AOC's own online application, not a LegalEase output". So the packet
//     explains the form and must never produce, complete, sign or send it. The
//     statement that it is the AOC's own is required; any claim that LegalEase
//     prepared it is prohibited.
//   - **There is no court petition any more.** Rule 1-077.1(A) NMRA excepts
//     cannabis records, the former Rule 1-077.1(B)(4) action was deleted and
//     Form 4-954 NMRA was withdrawn, all effective 31 December 2025. The
//     withdrawal must be stated wherever the form is named, and no sheet may
//     tell a participant to file a petition.
//   - **This expungement is destruction, not sealing.** New Mexico normally
//     seals; cannabis is one of the two exceptions. The packet says so, because
//     it changes what "I cannot find my case" means.
//
// The one regression variant here is justified: `nm_cannabis-mixed-case-
// routing-3` is `conditional` in the adopted packet set, so the mixed-case
// sheet is an assigned deliverable that the canonical fixture never renders. It
// gets its own fixture rather than being asserted about in the abstract.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production.");
  process.exit(1);
}
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const pg = await import("@/lib/rcap/packets/engines/process-guidance");
const { resolvePacket, PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const {
  NEW_MEXICO_GUIDANCE_TRACKS,
  NEW_MEXICO_GUIDANCE_TEMPLATES,
  NM_RECORD_JURISDICTIONS,
  NM_CUSTODY_STATUS,
  NM_AOC_OUTCOME,
  NewMexicoGuidanceStopError,
  NewMexicoRouteMismatchError,
  NewMexicoBranchError,
  deriveNewMexicoGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/new-mexico/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/new-mexico-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["nm_cannabis", "nm_cannabis_sentence"];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "NM" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real New Mexico track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("nm-")).length === 0,
  "New Mexico templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real New Mexico track in the shared registry, no New Mexico template in the shared guidance pack.");

for (const t of NEW_MEXICO_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, NEW_MEXICO_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(NEW_MEXICO_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of NEW_MEXICO_GUIDANCE_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(track.outputStrategy === "process_guidance", `${track.trackId} is not process guidance.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.statuses.visual !== "visual_review_passed", `${track.trackId} claims visual approval.`);
  ok(
    computeRuntimeStatus({
      statuses: track.statuses,
      sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled,
      outputStrategy: track.outputStrategy
    }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`
  );
}
note(`2. Scope: exactly ${ASSIGNED.length} assigned tracks, all runtime_disabled and awaiting counsel.`);

// 3. Every component specified and matching the adopted packet set.
const spec = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8")
);
const design = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8")
);
const manifests = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-packet-set-manifests.json"), "utf8")
);
const pgTracks = new Set(spec.processGuidanceSpecs.map((s) => s.trackId));
let componentCount = 0;
let conditionalCount = 0;
for (const track of NEW_MEXICO_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(
    designed?.outputStrategy === "process_guidance",
    `${track.trackId}: the adopted design does not make this guidance.`
  );
  const manifest = manifests.packetSets.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no adopted packet-set manifest.`);
  ok(
    manifest?.packetSetId === track.packetSet.packetSetId,
    `${track.trackId}: packet set id differs from the adopted manifest.`
  );

  const designedComponents = designed?.packetSet?.components ?? [];
  ok(
    designedComponents.length === track.packetSet.components.length,
    `${track.trackId}: component count differs from the design.`
  );
  ok(
    JSON.stringify((manifest?.components ?? []).map((c) => c.componentId)) ===
      JSON.stringify(track.packetSet.components.map((c) => c.componentId)),
    `${track.trackId}: component identity or order differs from the adopted manifest.`
  );
  for (const [index, c] of track.packetSet.components.entries()) {
    const match = designedComponents[index];
    ok(match?.componentId === c.componentId, `${c.componentId}: out of the design's component identity or order.`);
    ok(
      match?.requirement === c.requirement,
      `${c.componentId}: requirement differs from the design (${match?.requirement} vs ${c.requirement}).`
    );
    if (c.requirement === "conditional") {
      conditionalCount += 1;
      ok(Boolean(c.conditionKey), `${c.componentId}: conditional component carries no condition key.`);
    }
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
    componentCount += 1;
  }
  // No assigned component may be source-bound or official-form-bound. The AOC
  // application is reached by instruction only and never as a component.
  for (const c of designedComponents) {
    ok(!c.officialFormId, `${track.trackId}: the design attaches official form ${c.officialFormId} to a guidance route.`);
    ok(
      c.outputStrategy === "process_guidance",
      `${track.trackId}/${c.componentId}: the design gives this component a non-guidance output strategy.`
    );
  }
}
ok(componentCount === 10, `expected the design's 10 components, found ${componentCount}.`);
ok(conditionalCount === 1, `expected the design's one conditional component, found ${conditionalCount}.`);
const used = new Set(NEW_MEXICO_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(NEW_MEXICO_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound, none official-form-bound.`
);

for (const [id, template] of Object.entries(NEW_MEXICO_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder.`);
}

// 4. Closed lists and typed stops.
//
// The base fixture is a Bernalillo County participant with a cannabis-only case,
// never in custody, who has not yet asked the Administrative Office of the
// Courts and wants the mechanism explained rather than an eligibility opinion.
const BASE = {
  wantsOffenceClassificationAdvice: "no",
  recordJurisdiction: "new_mexico",
  isNotAUnitedStatesCitizen: "no",
  custodyOnThisCharge: "never",
  // nm_cannabis
  fullLegalName: "R. Mondragon",
  otherNames: "none",
  dateOfBirth: "4 February 1994",
  caseNumber: "D-202-CR-2019-01188",
  courtAndCounty: "Second Judicial District Court, Bernalillo County",
  arrestOrConvictionDate: "arrested 3 May 2019, convicted 12 August 2019",
  underEighteenAtTheTime: "no",
  chargeDescription: "possession of marijuana, one ounce or less",
  mixedCannabisAndOtherCharges: "no",
  administrativeOfficeOutcome: "not_asked_yet",
  agencyStillShowingAfterConfirmation: "no",
  replyLocation: "a postal address in Albuquerque",
  // nm_cannabis_sentence
  convictionDetails: "possession of marijuana, Second Judicial District Court, 12 August 2019",
  sentenceStatus: "finished in 2020",
  prosecutorChallenge: "no",
  counselOfRecord: "the public defender who appeared at sentencing"
};

/** The sentence track needs a sentence; the base fixture has none. */
const TRACK_FIXTURE = {
  nm_cannabis: {},
  nm_cannabis_sentence: { custodyOnThisCharge: "formerly" }
};

const G = [
  ["wantsOffenceClassificationAdvice", "yes", "stop", "offence_classification_judgment_requested"],
  ["recordJurisdiction", "federal", "mismatch", "record_is_not_a_new_mexico_record"],
  ["isNotAUnitedStatesCitizen", "yes", "stop", "non_citizen_directed_to_legal_advice_first"]
];

const NEG = [
  ...ASSIGNED.flatMap((trackId) =>
    G.map(([key, value, expect, stopId]) => [trackId, { [key]: value }, expect, stopId])
  ),
  // nm_cannabis.
  [
    "nm_cannabis",
    { custodyOnThisCharge: "formerly" },
    "mismatch",
    "custody_on_the_cannabis_charge_belongs_to_the_sentence_route"
  ],
  [
    "nm_cannabis",
    { custodyOnThisCharge: "currently" },
    "mismatch",
    "custody_on_the_cannabis_charge_belongs_to_the_sentence_route"
  ],
  [
    "nm_cannabis",
    { administrativeOfficeOutcome: "not_expunged_and_not_eligible" },
    "stop",
    "the_administrative_office_reports_the_record_not_expunged_and_not_eligible"
  ],
  [
    "nm_cannabis",
    { administrativeOfficeOutcome: "already_expunged", agencyStillShowingAfterConfirmation: "yes" },
    "stop",
    "an_agency_still_shows_the_charge_after_expungement_was_confirmed"
  ],
  // nm_cannabis_sentence.
  [
    "nm_cannabis_sentence",
    { custodyOnThisCharge: "never" },
    "mismatch",
    "no_sentence_was_ever_served_on_this_charge"
  ],
  [
    "nm_cannabis_sentence",
    { custodyOnThisCharge: "currently" },
    "stop",
    "currently_in_custody_on_the_cannabis_charge"
  ],
  [
    "nm_cannabis_sentence",
    { prosecutorChallenge: "yes" },
    "stop",
    "a_prosecutor_is_challenging_the_dismissal_expungement_or_redesignation"
  ],
  // Closed lists fail closed rather than falling through.
  ["nm_cannabis", { wantsOffenceClassificationAdvice: "maybe" }, "branch"],
  ["nm_cannabis", { recordJurisdiction: "" }, "branch"],
  ["nm_cannabis", { isNotAUnitedStatesCitizen: "unsure" }, "branch"],
  ["nm_cannabis", { custodyOnThisCharge: "briefly" }, "branch"],
  ["nm_cannabis", { administrativeOfficeOutcome: "refused" }, "branch"],
  ["nm_cannabis", { mixedCannabisAndOtherCharges: "partly" }, "branch"],
  ["nm_cannabis", { agencyStillShowingAfterConfirmation: "" }, "branch"],
  ["nm_cannabis_sentence", { prosecutorChallenge: "unknown" }, "branch"],
  ["nm_cannabis_sentence", { custodyOnThisCharge: "maybe" }, "branch"]
];

const SELF_MARKERS = {
  nm_cannabis: /cannabis record clearing route under Section 29-3A-8/i,
  nm_cannabis_sentence: /cannabis sentence and vacatur route under Section 29-3A-9/i
};

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveNewMexicoGuidanceFacts(trackId, { ...BASE, ...TRACK_FIXTURE[trackId], ...override });
  } catch (e) {
    if (e instanceof NewMexicoGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof NewMexicoRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof NewMexicoBranchError) outcome = "branch";
    else outcome = `unexpected:${e.name}`;

    if (outcome === "stop" || outcome === "mismatch") {
      ok(Boolean(e.message), `${trackId}/${e.stopId}: lost its reason.`);
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: lost its next step.`);
      ok(
        !e.routeTo.includes(trackId) && !SELF_MARKERS[trackId].test(e.routeTo),
        `${trackId}/${e.stopId}: routes back to the node the participant is on.`
      );
      typedStops.set(`${trackId}/${e.stopId}`, e.routeTo);
    }
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected stop ${stopId}, got ${detail}.`);
}
ok(typedStops.size === 12, `expected 12 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} negative cases fail closed; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular.`
);

ok(
  JSON.stringify(Object.keys(NM_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "military", "new_mexico", "tribal"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(NM_CUSTODY_STATUS).sort()) === JSON.stringify(["currently", "formerly", "never"]),
  "the custody list is not three-valued."
);
ok(
  JSON.stringify(Object.keys(NM_AOC_OUTCOME).sort()) ===
    JSON.stringify(["already_expunged", "not_asked_yet", "not_expunged_and_not_eligible", "pending_or_no_answer"]),
  "the Administrative Office outcome list is not the design's list."
);

// The conditional component's gate turns on the mixed-case answer and nothing
// else, and a mixed case must not throw — the sheet exists for exactly it.
{
  const off = deriveNewMexicoGuidanceFacts("nm_cannabis", BASE);
  ok(off.mixedCaseRoutingApplies === false, "the mixed-case gate is on for a cannabis-only fixture.");
  let threw = null;
  let on = null;
  try {
    on = deriveNewMexicoGuidanceFacts("nm_cannabis", { ...BASE, mixedCannabisAndOtherCharges: "yes" });
  } catch (e) {
    threw = e.name;
  }
  ok(threw === null, `a mixed case throws ${threw}, so the sheet written for it never renders.`);
  ok(on?.mixedCaseRoutingApplies === true, "the mixed-case gate is off for a mixed case.");
}

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount on routes the design says carry none"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/\brace\b\s*:/i, "a race field"],
  [
    /your (record|conviction|charge|case) (has been|was) (expunged|destroyed|sealed|removed)/i,
    "a claim that relief occurred"
  ],
  [/is now (expunged|sealed|destroyed|removed)/i, "a claim that the record is already dealt with"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // The application is the Administrative Office of the Courts' own. LegalEase
  // must never appear to have produced, completed, signed or sent it.
  [
    /LegalEase (has )?(prepared|completed|filled|signed|submitted|sent) (the|this|your) application/i,
    "a claim that LegalEase produced or submitted the agency's application"
  ],
  [/\bthe attached application\b/i, "a reference to an application this packet does not produce"],
  [/\bsign (the|this) application\b/i, "an instruction to sign something this packet generated"],
  // There is no court petition on these sections any more.
  [/you (should|must|need to) file (a|the) petition/i, "an instruction to file a petition that no longer exists"],
  [/\bForm 4-954 NMRA is (the|your|a) (form|petition|route)\b/i, "the withdrawn form described as live"],
  [/you (must|have to) (file|apply|submit|respond) (by|within)/i, "a deadline the design does not state"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bNM\s+8\d{4}\b/, "a postal code"],
  // What is unresolved stays unresolved.
  [/the remedy (is|would be) to (file|apply|move)/i, "an invented remedy"],
  [
    /the Administrative Office of the Courts (will|usually) (respond|reply|answer) within/i,
    "a response time the design does not have"
  ],
  [
    /automatic expungement has (been|already been) (carried out|executed) at scale/i,
    "an answer to the preserved question about execution at scale"
  ],
  // Internal legal-design vocabulary must not reach participant copy.
  [
    /\b(adopted design|legal-design|release blocker|build blocker|output strategy|packet set|track id|trackId)\b/i,
    "internal legal-design jargon"
  ],
  [/\bthe design (records|says|treats|classifies|holds|leaves)\b/i, "internal legal-design jargon"],
  [/\b(in|by|for) (this|the) design\b/i, "internal legal-design jargon"],
  [/the list below/i, "a forward reference to a list that does not follow on every sheet"]
];

const REQUIRED_EVERYWHERE = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/LegalEase cannot/i, "a statement of what LegalEase cannot do"],
  [
    /has not contacted any court, clerk, agency or the Administrative Office of the Courts/i,
    "the disclaimer of having contacted anyone"
  ],
  [
    /LegalEase cannot tell you that a record has been expunged/i,
    "the refusal to report an outcome"
  ],
  [/Administrative Office of the Courts/, "the body the design puts at the centre of both routes"],
  [
    /LegalEase does not produce, complete, sign or submit/i,
    "the statement that the agency's application is not a LegalEase output"
  ],
  [/Cannabis Regulation Act/, "the Act the classification turns on"]
];

const PER_TRACK = {
  nm_cannabis: [
    [/29-3A-8/, "the governing section"],
    [/two years/i, "the automatic period"],
    [/under eighteen/i, "the different rule for a minor"],
    [/destroyed/i, "that this expungement is destruction rather than sealing"],
    [/Rule 1-077\.1/, "the rule that now excepts cannabis records"],
    [/Form 4-954/, "the withdrawn petition form"],
    [/withdrawn/i, "the fact of the withdrawal"],
    [/31 December 2025/, "the effective date of the removal"],
    [/rev\. 1\/28\/22|rev\. 7\/12\/22/, "the dated Judiciary packets still describing a petition"],
    [/29-3A-8\(D\)/, "the confidentiality provision"],
    [/confidential and not subject to disclosure/i, "what that provision says"],
    [/only cannabis and cannabis paraphernalia charges/i, "the limit that makes a mixed case different"],
    [/is the Administrative Office of the Courts' own application/i, "whose application it is"],
    [/not established|is not something this packet can tell you|no published/i, "the preserved unknowns"]
  ],
  nm_cannabis_sentence: [
    [/29-3A-9/, "the governing section"],
    [/no fee or cost may be imposed/i, "the fee rule the design gives its own component"],
    [/legally invalid/i, "the standard the court applies"],
    [/redesignat/i, "the penalty assessment citation outcome"],
    [/1 January 2022/, "the date the Department of Public Safety review was to be completed by"],
    [/1 July 2022/, "the date the prosecutor window closed"],
    [/no procedure or form is published/i, "the preserved gap left by the expired sweep"],
    [/counsel of record|represented you/i, "the first contact the section contemplates"],
    [/not settled|open question|is not settled/i, "the preserved question between the two sections"]
  ]
};

/** Copy that belongs to one route and must not leak onto the other. */
const FORBIDDEN_PER_TRACK = {
  nm_cannabis: [
    [/no fee or cost may be imposed for sentence review/i, "the sentence route's own fee rule"]
  ],
  nm_cannabis_sentence: [
    [
      /Application for Expungement of Court Records involving Cannabis/i,
      "the record-clearing route's agency application"
    ],
    [/29-3A-8\(D\)/, "the record-clearing route's confidentiality provision"]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveNewMexicoGuidanceFacts(track.trackId, {
    ...BASE,
    ...TRACK_FIXTURE[track.trackId],
    ...(extraFacts ?? {})
  });
  const resolved = resolvePacket({
    jurisdiction: "NM",
    trackId: track.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${label}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${label}: guidance resolved as a filing packet.`);
  if (expectedComponents !== undefined) {
    ok(
      resolved.components.length === expectedComponents,
      `${label}: resolved ${resolved.components.length} components, expected ${expectedComponents}.`
    );
  }

  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "NM",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "NM",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(rendered.bytes) === sha(again.bytes), `${component.componentId}: not deterministic.`);
    ok((rendered.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(rendered.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    ok(
      (rendered.warnings ?? []).length === 0,
      `${component.componentId}: rendered with warnings ${JSON.stringify(rendered.warnings)}.`
    );
    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
  }

  const assembleInput = {
    jurisdiction: "NM",
    jurisdictionName: "New Mexico",
    packetName: resolved.track.assembledPacketName,
    caseReference: "D-202-CR-2019-01188",
    title: resolved.track.assembledPacketTitle,
    components
  };
  const assembled = await assemblePacketPdf(assembleInput);
  const againAssembled = await assemblePacketPdf(assembleInput);
  ok(assembled.sha256 === againAssembled.sha256, `${label}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${label}: the deliverable is a ZIP.`);

  const dir = path.join(OUT, label.replace(/[^a-z0-9_]+/gi, "-"));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, assembled.fileName);
  fs.writeFileSync(file, assembled.bytes);

  const text = pdfText(file);
  for (const [pattern, why] of PROHIBITED) ok(!pattern.test(text), `${label}: contains ${why}.`);
  for (const [pattern, why] of REQUIRED_EVERYWHERE) ok(pattern.test(text), `${label}: missing ${why}.`);
  for (const [pattern, why] of PER_TRACK[track.trackId]) ok(pattern.test(text), `${label}: missing ${why}.`);
  for (const [pattern, why] of FORBIDDEN_PER_TRACK[track.trackId]) {
    ok(!pattern.test(text), `${label}: carries ${why}.`);
  }

  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries()) {
    ok(page.replace(/\s/g, "").length > 40, `${label}: page ${i + 1} is blank.`);
    const lastLine = page.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
    ok(!isSectionHeading(lastLine), `${label}: page ${i + 1} ends on the detached heading "${lastLine}".`);
  }
  ok(pages.length === assembled.pageCount, `${label}: page count disagrees with the assembler.`);

  samples.push({
    label,
    trackId: track.trackId,
    sampleRole,
    variantOfTrackId: sampleRole === "variant" ? track.trackId : null,
    variantPurpose: sampleRole === "variant" ? "the design's conditional mixed-case routing sheet" : null,
    fileName: assembled.fileName,
    sha256: assembled.sha256,
    pageCount: assembled.pageCount,
    byteSize: assembled.byteSize,
    components: components.length
  });
  return text;
}

for (const track of NEW_MEXICO_GUIDANCE_TRACKS) {
  const expected = track.packetSet.components.filter((c) => c.requirement === "required").length;
  const text = await renderTrack(track, undefined, track.trackId, expected);
  if (track.trackId === "nm_cannabis") {
    ok(
      !/Where the case had cannabis and non-cannabis charges together/i.test(text),
      "nm_cannabis: the conditional mixed-case sheet rendered without its condition."
    );
  }
}

// The design's one conditional component, exercised as its own fixture. A
// conditional sheet that is never rendered is a sheet nobody has looked at.
{
  const track = NEW_MEXICO_GUIDANCE_TRACKS.find((t) => t.trackId === "nm_cannabis");
  const text = await renderTrack(
    track,
    { mixedCannabisAndOtherCharges: "yes" },
    "nm_cannabis (mixed-case variant)",
    6,
    "variant"
  );
  ok(
    /Where the case had cannabis and non-cannabis charges together/i.test(text),
    "the mixed-case variant did not render the conditional sheet."
  );
  ok(
    /release-without-conviction|its own route/i.test(text),
    "the mixed-case variant does not route the non-cannabis charges anywhere."
  );
}

ok(samples.length === 3, `expected 3 samples, found ${samples.length}.`);
for (const trackId of ASSIGNED) {
  const canonical = samples.filter((s) => s.trackId === trackId && s.sampleRole === "canonical");
  ok(canonical.length === 1, `${trackId}: expected exactly one canonical sample, found ${canonical.length}.`);
}
ok(
  samples.filter((s) => s.sampleRole === "variant").every((s) => s.variantOfTrackId === "nm_cannabis"),
  "a variant does not reference an assigned track."
);

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE };
  delete facts.caseNumber;
  let outcome = "generated";
  try {
    const derived = deriveNewMexicoGuidanceFacts("nm_cannabis", facts);
    resolvePacket({ jurisdiction: "NM", trackId: "nm_cannabis", facts: derived, allowTechnicalFixtures: true });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing case number: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no generated agency application, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("New Mexico guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("New Mexico guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(22)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
  );
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

function sha(b) {
  return crypto.createHash("sha256").update(b).digest("hex");
}
function isSectionHeading(line) {
  return /^[A-Z][A-Z ,'()-]{3,60}$/.test(line) && line === line.toUpperCase();
}
function pdfText(f) {
  const r = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`pdftotext failed: ${r.stderr}`);
  return r.stdout.replace(/-\n\s*/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
}
function pdfPageTexts(f) {
  const n = Number((spawnSync("pdfinfo", [f], { encoding: "utf8" }).stdout.match(/^Pages:\s+(\d+)/m) ?? [])[1] ?? 0);
  const out = [];
  for (let p = 1; p <= n; p += 1) {
    out.push(
      spawnSync("pdftotext", ["-layout", "-f", String(p), "-l", String(p), f, "-"], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024
      }).stdout
    );
  }
  return out;
}
