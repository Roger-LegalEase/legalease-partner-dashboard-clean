// Wisconsin certificate-of-discharge follow-up — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// Wisconsin is not enabled and its shared surfaces are untouched, the assignment
// is exactly the one assigned track and its two assigned custom-pleading
// components, both have a governing legal-design specification, and the design's
// boundaries hold on the face of both letters.
//
// The boundaries are what most of section 2 checks. Neither letter is a court
// filing, states a fee, alleges fault, asserts entitlement, certifies that
// completion was successful, contains or promises the certificate of discharge,
// or says what follows a refusal — because the statute sets no deadline and
// names no remedy, and the design records that as an open release blocker.
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
  WISCONSIN_CUSTOM_PLEADING_TRACKS,
  WISCONSIN_PLEADING_TEMPLATES,
  WI_DESIGN_ROLE_TO_ENGINE_ROLE,
  WI_ASSIGNED_TRACK_IDS,
  WI_STATUS_REQUEST_CONDITION_KEY,
  WI_YES_NO,
  WI_REQUEST_TYPES,
  WI_CLERK_ANSWERS,
  WI_OUTSIDE_PARTY_KEYS,
  WI_REFERRAL,
  WI_CLERK_REFERRAL,
  WI_SENTENCING_RECORD_REFERRAL,
  WI_CR266_ROUTE_REFERRAL,
  deriveWisconsinFacts,
  WisconsinBranchError,
  WisconsinEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/wisconsin/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const TRACK_ID = "wi_exp_certificate_of_discharge_followup";

// ---------------------------------------------------------------------------
// 0. Wisconsin is not enabled, and the shared surfaces are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(WISCONSIN_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "The assigned Wisconsin track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("wi_")).length === 0,
  "Wisconsin templates are wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of WISCONSIN_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, WISCONSIN_PLEADING_TEMPLATES);

note(
  "0. Enablement: the assigned track and both templates are absent from the shared registry and template pack; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly the one track and its two components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;

ok(
  JSON.stringify([...assignedIds]) === JSON.stringify([TRACK_ID]),
  "The implemented track set is not exactly the assigned track."
);
ok(
  JSON.stringify([...WI_ASSIGNED_TRACK_IDS]) === JSON.stringify([TRACK_ID]),
  "The module's closed track list is not exactly the assigned track."
);
// The other Wisconsin routes belong to the guidance and official-PDF lanes.
for (const foreign of [
  "wi_exp_certificate_of_discharge",
  "wi_exp_cr266",
  "wi_exp_942_08_mandatory",
  "wi_exp_trafficking_2m",
  "wi_nc_doj_fingerprint_removal",
  "wi_nc_doj_challenge",
  "wi_def_961_47",
  "wi_def_prosecution_agreement"
]) {
  ok(!assignedIds.has(foreign), `${foreign} is implemented here and belongs to another lane.`);
}

const track = WISCONSIN_CUSTOM_PLEADING_TRACKS[0];
const manifest = manifests.find((m) => m.trackId === TRACK_ID);
ok(Boolean(manifest), "No packet-set manifest in the adopted legal design.");

const designCp = manifest.components
  .filter((c) => c.outputStrategy === "custom_pleading")
  .map((c) => c.componentId)
  .sort();
const implemented = track.packetSet.components.map((c) => c.componentId).sort();
ok(
  JSON.stringify(designCp) === JSON.stringify(implemented),
  `Implemented components ${JSON.stringify(implemented)} do not match the assigned custom-pleading components ${JSON.stringify(designCp)}.`
);
ok(implemented.length === 2, `Implemented ${implemented.length} components rather than the two assigned.`);

for (const other of manifest.components.filter((c) => c.outputStrategy !== "custom_pleading")) {
  ok(
    !implemented.includes(other.componentId),
    `${other.componentId} is ${other.outputStrategy} and must not be implemented by the custom-pleading job.`
  );
  ok(
    other.outputStrategy !== "official_pdf_fill",
    "The design assigns an official_pdf_fill component to this route, which would make the packet depend on a binary this job cannot produce."
  );
}

let conditionalCount = 0;
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
  if (component.requirement === "conditional") {
    conditionalCount += 1;
    ok(
      component.conditionKey === WI_STATUS_REQUEST_CONDITION_KEY,
      `${component.componentId}: a conditional component carries no condition key, so it could never render.`
    );
  }

  const spec = specs.find((s) => s.componentId === component.componentId);
  ok(Boolean(spec), `${component.componentId}: no governing custom-pleading specification.`);
  if (spec) {
    ok(
      WI_DESIGN_ROLE_TO_ENGINE_ROLE[spec.role] === component.role,
      `${component.componentId}: design role ${spec.role} is not mapped to engine role ${component.role}.`
    );
    for (const requirement of spec.generationRequirements) {
      ok(
        track.requiredInputs.some((input) => input.key === requirement.key),
        `The design asks for ${requirement.key} and the track declares no such input.`
      );
    }
  }
  ok(
    Boolean(pleadingTemplate(component.templateId)),
    `${component.componentId}: template ${component.templateId} is not registered.`
  );
  ok(
    component.sourcePath === null && component.sourceSha256 === null,
    `${component.componentId}: claims an official source. Wisconsin publishes no form for this request.`
  );
  ok(
    component.approval.legal === "not_submitted" && component.approval.visual === "not_reviewed",
    `${component.componentId}: claims an approval this job cannot give.`
  );
}
ok(conditionalCount === 1, `Implemented ${conditionalCount} conditional components rather than the one the design marks conditional.`);

const designKeys = new Set(
  specs.filter((s) => s.trackId === TRACK_ID).flatMap((s) => s.generationRequirements.map((r) => r.key))
);
for (const input of track.requiredInputs) {
  ok(designKeys.has(input.key), `Declares input ${input.key}, which the design does not ask for.`);
}
for (const requirement of specs
  .filter((s) => s.trackId === TRACK_ID)
  .flatMap((s) => s.generationRequirements)) {
  const input = track.requiredInputs.find((i) => i.key === requirement.key);
  if (!input) continue;
  ok(
    input.required === (requirement.requirement === "required"),
    `${requirement.key} is declared ${input.required ? "required" : "optional"} and the design says ${requirement.requirement}.`
  );
}

const designTrack = registry.find((t) => t.trackId === TRACK_ID);
ok(Boolean(designTrack), "The track is not in the normalized track registry.");
if (designTrack) {
  ok(designTrack.outputStrategy === "custom_pleading", "The design does not classify this as custom_pleading.");
  ok(designTrack.geographicScope === track.geographicScope, "Geographic scope does not match the design.");
  ok(
    JSON.stringify(designTrack.dispositions) === JSON.stringify(track.dispositions),
    "Dispositions do not match the design."
  );
  ok(
    JSON.stringify(designTrack.recordTypes) === JSON.stringify(track.recordTypes),
    "Record types do not match the design."
  );
  ok(
    designTrack.destination?.kind === "agency",
    "The design does not send this route to an agency, which is the whole shape of it."
  );
}
ok(track.runtimeDisabled === true, "The track is not runtime-disabled.");
ok(track.technicalFixture === true, "The track is not a technical fixture.");

note(
  `1. Assignment: exactly one assigned track and its ${implemented.length} assigned custom-pleading components — the request letter and the conditional status enquiry — pinned to the design's component id, order, requirement, role and declared inputs; the process_guidance component was not implemented, no official_pdf_fill component exists on the route, and the eight other Wisconsin routes are absent.`
);

// ---------------------------------------------------------------------------
// 2. The design's boundaries, on the face of both letters
// ---------------------------------------------------------------------------

const sourceOf = (component) => JSON.stringify(pleadingTemplate(component.templateId));
const requestComponent = track.packetSet.components.find((c) => c.role === "primary_filing");
const statusComponent = track.packetSet.components.find((c) => c.role === "notice");

/**
 * Content neither letter may carry.
 *
 * Each pattern matches an assertion rather than a mention, because the honest
 * copy here names the certificate, the duty and the possibility of a refusal in
 * order to say who owns each. A blunter check would fire on the disclaimers it
 * exists to protect.
 */
const PROHIBITED = [
  [/\$\s?\d/, "a monetary amount, and no fee attaches to this route at all"],
  [/\b(is|are|were|will be|would be) eligible\b/i, "an eligibility assertion"],
  [/\bwill be (issued|forwarded|expunged|granted|sealed)\b/i, "a promise about what the authority will do"],
  [/\byour record will be clear\b|\bguaranteed\b/i, "a promise about the result"],
  // Matched as an assertion, not as a phrase. The letters say in terms that they
  // do NOT say completion was successful, and a phrase-level check fires on that
  // denial — the one sentence the check exists to require.
  [/\b(successfully completed the sentence|has successfully completed)\b/i, "a certification that the writer successfully completed the sentence, which the design forbids"],
  [/\bcompletion (was|is) (hereby )?(certified|confirmed|verified)\b/i, "a certification that completion was successful"],
  [/\bwe certify\b/i, "a certification by LegalEase"],
  [/\bwe (have )?(reviewed|verified|confirmed|checked|obtained)\b/i, "a claim that LegalEase reviewed, verified or obtained a record"],
  [/\bon your behalf we (sent|wrote|filed|submitted)\b/i, "a claim that LegalEase sent the letter"],
  [/\b(failed|neglected|refused) (in its duty|to comply|to do its job)\b/i, "an allegation of agency fault, which the design forbids"],
  [/\byou are required to\b|\byou must issue\b|\bwe demand\b/i, "a demand, on a route the design confines to a neutral request"],
  [/\bthe (writer|participant) is entitled to\b/i, "an assertion of legal entitlement, which would need document review"],
  [/\bthe certificate (has been|was) issued\b/i, "an assertion that the certificate already issued"],
  [/\bfiled (in|with) the (circuit )?court\b/i, "a claim that something was filed, on a route where nothing is"],
  [/Notary Public|Sworn to before me|\/s\//i, "a notarial block or a populated execution"]
];

for (const component of track.packetSet.components) {
  const template = pleadingTemplate(component.templateId);
  const source = sourceOf(component);

  for (const [pattern, description] of PROHIBITED) {
    ok(!pattern.test(source), `${component.componentId}: contains ${description}.`);
  }
  ok(template.technicalFixture === true, `${component.templateId}: is not marked a technical fixture.`);
  ok(
    template.fixtureBanner && /DRAFT PENDING LEGAL REVIEW/.test(template.fixtureBanner),
    `${component.templateId}: carries no draft banner.`
  );
  ok(
    !/\{\{/.test(source.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")),
    `${component.templateId}: malformed placeholder.`
  );
  // Both letters are the writer's own and neither is sworn.
  ok(
    typeof template.signatureLabel === "string" && template.signatureLabel.length > 0,
    `${component.componentId}: carries no signature rule, and the writer sends it in their own name.`
  );
  ok(
    template.verification === undefined,
    `${component.componentId}: carries a sworn declaration, and nothing on this route requires one.`
  );
  ok(
    template.signatureBlock.some((line) => /no notarial block is printed here/.test(line)),
    `${component.componentId}: does not tell the writer what to do about notarization.`
  );
  ok(
    template.signatureBlock.some((line) => /Check the authority's current mailing address/.test(line)),
    `${component.componentId}: does not tell the writer to confirm the address, which the design makes a manual completion item.`
  );
  ok(
    !template.signatureBlock.some((line) => /^\s*(Judge|Clerk|Agent|Supervisor|Warden)/i.test(line)),
    `${component.componentId}: carries a signature line for an outside party.`
  );

  // Nothing on this route is a court document.
  ok(
    !/IN THE (CIRCUIT|DISTRICT|MUNICIPAL) COURT/i.test(source),
    `${component.componentId}: is captioned in a court, and nothing on this route is filed.`
  );
  ok(
    /THIS IS A LETTER, NOT A COURT FILING/.test(source),
    `${component.componentId}: does not say on its face that it is not a court filing.`
  );
  ok(
    /It is not filed in any court, there is no case pending on it, no fee attaches to it, no service of it is required and no hearing arises from it/.test(source),
    `${component.componentId}: does not state the absence of venue, fee, service and hearing.`
  );

  // The statutory basis, and whose duty it is.
  ok(
    /973\.015\(1m\)\(b\)/.test(source),
    `${component.componentId}: does not cite the subsection that creates the duty.`
  );
  ok(
    /Issuance is a duty rather than a discretion/.test(source),
    `${component.componentId}: does not say that issuance is mandatory rather than discretionary.`
  );
  ok(
    /It is not a certificate of discharge and it does not contain one/.test(source),
    `${component.componentId}: does not disclaim being or carrying the certificate.`
  );
  ok(
    /LegalEase neither produces it nor promises that it will issue/.test(source),
    `${component.componentId}: does not disclaim producing or promising the certificate.`
  );

  // Neutrality, which is the design's central constraint on this node.
  ok(
    /It is not a demand and it is not a complaint. It alleges no fault by any office and asserts no legal entitlement/.test(source),
    `${component.componentId}: does not state, in terms, that it alleges no fault and asserts no entitlement.`
  );

  // Completion is stated, never certified.
  ok(
    /It does not say that completion was successful within the meaning of the statute/.test(source),
    `${component.componentId}: does not refuse, in terms, to certify successful completion.`
  );
  ok(
    /turns on whether there was a revocation and whether there was a later conviction/.test(source),
    `${component.componentId}: does not name the two facts that decide whether completion was successful.`
  );
  ok(
    /Nobody at LegalEase has reviewed a discharge document, a judgment or a court file/.test(source),
    `${component.componentId}: does not disclaim having reviewed any record.`
  );

  // The open question stays open.
  ok(
    /sets no deadline and names no remedy/.test(source),
    `${component.componentId}: does not preserve the open question about what follows a refusal.`
  );
  ok(
    /This packet can ask; it cannot tell the writer what follows a refusal, and it does not pretend to/.test(source),
    `${component.componentId}: does not refuse, in terms, to invent a next step after a refusal.`
  );

  // The follow-up sequence the design prescribes.
  ok(
    /Wisconsin Circuit Court Access/.test(source),
    `${component.componentId}: does not tell the writer to re-check Wisconsin Circuit Court Access.`
  );
  ok(
    /The expungement follows from the certificate reaching the clerk, not from this letter/.test(source),
    `${component.componentId}: does not say what actually produces the expungement.`
  );

  // The stops are printed, not only enforced.
  ok(/WHERE THIS PACKET STOPS/.test(source), `${component.componentId}: carries no printed stop section.`);
  ok(source.includes(WI_REFERRAL), `${component.componentId}: the stop section carries no referral.`);
  ok(
    /Any request to argue entitlement, to allege that an office was at fault, or to press the authority beyond a neutral request/.test(source),
    `${component.componentId}: does not print the advocacy boundary as a stop.`
  );
  ok(
    /Federal, tribal and out-of-state records/.test(source),
    `${component.componentId}: does not print the reach boundary as a stop.`
  );

  // Both letters say which one to send, because both can be in one packet.
  ok(
    /WHICH OF THESE LETTERS TO SEND/.test(source),
    `${component.componentId}: does not tell the writer which of the two letters to send.`
  );
  ok(
    /\{\{(whichLetterStatement|statusOnlyLetterStatement)\}\}/.test(source),
    `${component.componentId}: does not carry the send-this-one instruction, which is the writer's own answer.`
  );
}

// The two letters ask different things, and each says so.
const request = sourceOf(requestComponent);
const status = sourceOf(statusComponent);
ok(
  /asks that the certificate of discharge under Wis. Stat. § 973.015\(1m\)\(b\) be issued in this case and forwarded to the clerk/.test(request),
  "The request letter does not make the request the design describes."
);
ok(
  /asks to be told the date it was sent and to whom/.test(request),
  "The request letter does not ask what to do where the authority says it already sent the certificate."
);
ok(
  /asks only to be told whether a certificate of discharge under Wis. Stat. § 973.015\(1m\)\(b\) has been issued/.test(status),
  "The status enquiry does not confine itself to the narrower question."
);
ok(
  /This letter asks for nothing else. It does not ask that a certificate be issued/.test(status),
  "The status enquiry does not disclaim asking for action, which is the only thing distinguishing it."
);
ok(
  !/asks that the certificate of discharge under Wis. Stat. § 973.015\(1m\)\(b\) be issued in this case and forwarded/.test(status),
  "The status enquiry carries the request letter's ask, so the two are not distinct documents."
);

note(
  "2. Boundaries: both letters say on their face that they are not court filings and carry no venue, fee, service or hearing; both cite § 973.015(1m)(b), state that issuance is a duty, and disclaim being or promising the certificate; both refuse to allege fault, assert entitlement or certify successful completion, and name the revocation and later-conviction facts that decide it; both preserve the open question about what follows a refusal, print the follow-up sequence and the stops, and say which of the two to send. Neither prints a monetary amount, a demand, a court caption or a notarial block, and the two asks are distinct."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical positive, plus the status variant
// ---------------------------------------------------------------------------

/** Synthetic answers only. No real person's record is used anywhere here. */
const base = (overrides = {}) => ({
  fullLegalName: "Devon Ray Kaczmarek",
  dateOfBirth: "27 April 1994",
  returnContactDetails: "1140 Sherman Avenue, Apartment 4, Madison, Wisconsin 53704; devon.k@example.org",
  caseNumberAndCounty: "2016CM001842, Dane County",
  supervisionIdentifier: "DOC 00412885",
  supervisingAuthority: "Wisconsin Department of Corrections, Division of Community Corrections, Dane County office",
  supervisingAgentName: "Agent M. Oyelaran",
  sentenceCompletionDate: "14 September 2019",
  expungementOrderedAtSentencing: "yes",
  clerkConfirmedNotReceived: "not received",
  requestType: "issue and forward",
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "wi-certificate-request-positive-1",
    trackId: TRACK_ID,
    answers: base()
  },
  {
    fixtureId: "wi-certificate-status-only-2",
    trackId: TRACK_ID,
    variantOf: "wi-certificate-request-positive-1",
    variantPurpose:
      "A status-only answer changes the packet's shape: the conditional status enquiry renders as a second component and both letters change which one they tell the writer to send.",
    answers: base({ requestType: "status only" })
  },
  {
    fixtureId: "wi-certificate-no-supervision-identifiers-3",
    trackId: TRACK_ID,
    variantOf: "wi-certificate-request-positive-1",
    variantPurpose:
      "Both supervision identifiers are conditional in the design. Where a writer has neither, the letter must say so rather than render an empty line, because the authority uses them to find the file.",
    answers: base({ supervisionIdentifier: "", supervisingAgentName: "" })
  }
];

const fixtureFor = () => FIXTURES[0].answers;

ok(
  FIXTURES.filter((f) => !f.variantOf).length === 1,
  "The assigned track does not have exactly one canonical fixture."
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
  `3. Fixtures: 1 canonical fixture on the single assigned track and ${FIXTURES.filter((f) => f.variantOf).length} regression variants, each naming that canonical fixture and each recording the material branch it tests. Every answer is synthetic.`
);

// ---------------------------------------------------------------------------
// 4. Typed stops and closed lists
// ---------------------------------------------------------------------------

const NEGATIVE = [
  ["a required fact is missing", { ...fixtureFor(), caseNumberAndCounty: "" }, "wi-answer-missing"],
  ["the writer's name is missing", { ...fixtureFor(), fullLegalName: "" }, "wi-answer-missing"],
  [
    "the sentencing court never ordered expungement",
    { ...fixtureFor(), expungementOrderedAtSentencing: "no" },
    "wi-expungement-not-ordered-at-sentencing"
  ],
  [
    "the completion date is not established",
    { ...fixtureFor(), sentenceCompletionDate: "some time after I got off paper" },
    "wi-completion-date-not-established"
  ],
  [
    "the completion date answer is a shrug",
    { ...fixtureFor(), sentenceCompletionDate: "I do not remember" },
    "wi-completion-date-not-established"
  ],
  [
    "the answer describes a revocation",
    { ...fixtureFor(), sentenceCompletionDate: "My probation was revoked in 2018 and I finished in 2020" },
    "wi-completion-disputed"
  ],
  [
    "the answer describes a later conviction",
    {
      ...fixtureFor(),
      sentenceCompletionDate: "14 September 2019, though I picked up a new conviction in 2018"
    },
    "wi-completion-disputed"
  ],
  [
    "the clerk has not been asked",
    { ...fixtureFor(), clerkConfirmedNotReceived: "have not asked" },
    "wi-clerk-not-yet-asked"
  ],
  [
    "the clerk says the certificate arrived",
    { ...fixtureFor(), clerkConfirmedNotReceived: "received" },
    "wi-certificate-already-received"
  ],
  [
    "a certificate of discharge is supplied",
    { ...fixtureFor(), certificateOfDischarge: "Certificate issued 3 March 2020" },
    "wi-outside-party-content-refused"
  ],
  [
    "an agency response is supplied",
    { ...fixtureFor(), agencyResponse: "The Department says it was mailed" },
    "wi-outside-party-content-refused"
  ],
  [
    "a clerk certification is supplied",
    { ...fixtureFor(), clerkCertification: "Received and filed" },
    "wi-outside-party-content-refused"
  ],
  [
    "an issuance date is supplied",
    { ...fixtureFor(), certificateIssuedDate: "3 March 2020" },
    "wi-outside-party-content-refused"
  ]
];

let stopped = 0;
const stopIdsSeen = new Set();
for (const [label, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveWisconsinFacts(TRACK_ID, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof WisconsinEligibilityStopError,
    `${label} did not fail closed with a typed stop.`
  );
  if (caught instanceof WisconsinEligibilityStopError) {
    ok(caught.stopId === expectedStopId, `${label} raised ${caught.stopId} rather than ${expectedStopId}.`);
    ok(caught.reason.length > 60, `${label} gives no reason a person could act on.`);
    ok(caught.referral.length > 20, `${label} lost its destination.`);
    ok(caught.nextStep.length > 30, `${label} gives no next step a person could take.`);
    stopped += 1;
    stopIdsSeen.add(caught.stopId);
  }
}

// No stop routes the writer back to the thing that stopped them.
const notOrderedStop = (() => {
  try {
    deriveWisconsinFacts(TRACK_ID, { ...fixtureFor(), expungementOrderedAtSentencing: "no" });
  } catch (error) {
    return error;
  }
  return null;
})();
ok(
  notOrderedStop?.referral === WI_CR266_ROUTE_REFERRAL,
  "The no-sentencing-order stop does not route the writer away from the certificate route."
);

const clerkStop = (() => {
  try {
    deriveWisconsinFacts(TRACK_ID, { ...fixtureFor(), clerkConfirmedNotReceived: "have not asked" });
  } catch (error) {
    return error;
  }
  return null;
})();
ok(
  clerkStop?.referral === WI_CLERK_REFERRAL,
  "The clerk-not-yet-asked stop does not send the writer to the clerk."
);
ok(
  /check Wisconsin Circuit Court Access/i.test(clerkStop?.nextStep ?? ""),
  "The clerk-not-yet-asked stop does not carry the design's own sequence into its next step."
);

const outsidePartyStop = (() => {
  try {
    deriveWisconsinFacts(TRACK_ID, { ...fixtureFor(), judgeSignature: "Hon. A. Remington" });
  } catch (error) {
    return error;
  }
  return null;
})();
ok(
  outsidePartyStop?.referral === WI_CLERK_REFERRAL,
  "The outside-party stop does not route the writer to the office that holds the record."
);

const missingFactStop = (() => {
  try {
    deriveWisconsinFacts(TRACK_ID, { ...fixtureFor(), supervisingAuthority: "" });
  } catch (error) {
    return error;
  }
  return null;
})();
ok(
  missingFactStop?.referral === WI_SENTENCING_RECORD_REFERRAL,
  "The missing-fact stop does not send the writer to the record."
);

const disputedStop = (() => {
  try {
    deriveWisconsinFacts(TRACK_ID, {
      ...fixtureFor(),
      sentenceCompletionDate: "My probation was revoked in 2018 and I finished in 2020"
    });
  } catch (error) {
    return error;
  }
  return null;
})();
ok(
  disputedStop?.referral === WI_REFERRAL,
  "The disputed-completion stop does not refer the writer to a lawyer, which is the one thing the design says it must."
);

// A negated mention is not an assertion, or the route would stop on its own
// disclaimer.
const negatedCompletion = deriveWisconsinFacts(TRACK_ID, {
  ...fixtureFor(),
  sentenceCompletionDate: "14 September 2019, with no revocation at any point"
});
ok(
  Boolean(negatedCompletion.completionStatement),
  "A completion answer that denies a revocation was treated as asserting one."
);

// Closed lists reject anything outside them.
const BRANCH_CASES = [
  ["expungementOrderedAtSentencing", "I think so"],
  ["clerkConfirmedNotReceived", "they were not sure"],
  ["requestType", "both"]
];
let branchRejected = 0;
for (const [key, value] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveWisconsinFacts(TRACK_ID, { ...fixtureFor(), [key]: value });
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof WisconsinBranchError,
    `"${value}" for ${key} was not rejected as outside the approved list.`
  );
  if (caught instanceof WisconsinBranchError) branchRejected += 1;
}

// A track this job was not assigned cannot be derived for.
for (const trackId of ["wi_exp_cr266", "wi_exp_certificate_of_discharge", "wi-something-else"]) {
  let caught = null;
  try {
    deriveWisconsinFacts(trackId, {});
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof WisconsinBranchError,
    `An unassigned track identifier ${trackId} was accepted by the fact derivation.`
  );
}

ok(Object.keys(WI_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(new Set(Object.values(WI_REQUEST_TYPES)).size === 2, "The request-type list changed size.");
ok(new Set(Object.values(WI_CLERK_ANSWERS)).size === 3, "The clerk-answer list changed size.");
ok(WI_OUTSIDE_PARTY_KEYS.length >= 6, "The outside-party key guard was narrowed.");
ok(WI_REFERRAL.length > 20, "The default referral destination is empty.");

note(
  `4. Stops: ${stopped} negative cases fail closed with the expected typed stop, a reason, a destination and a next step; ${stopIdsSeen.size} distinct stop families are exercised, covering missing participant facts, no expungement ordered at sentencing, an unestablished completion date, a revocation or later conviction surfacing in the completion answer, a clerk who has not been asked, a certificate that already arrived, and any request to supply the certificate, the agency's answer, a clerk certification or an issuance date; a completion answer that denies a revocation is not treated as asserting one; ${branchRejected} out-of-list branch values rejected; three unassigned track identifiers refused; three closed lists hold their size.`
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
 * section overleaf, and a paragraph rendered twice.
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

/** Section headings, as they are drawn: uppercase, on a line of their own. */
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
  const facts = deriveWisconsinFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "WI",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );
  const statusOnly = facts.requestType === "status_only";
  const expected = statusOnly ? 2 : 1;
  ok(
    resolved.components.length === expected,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than ${expected}. The status enquiry is conditional on the writer's own answer.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "WI",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "WI",
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
      `${fixture.fixtureId}/${component.componentId}: the rendered page prints a monetary amount, and no fee attaches to this route.`
    );
    ok(
      !/^\s*(yes|no|true|false|not received|status only|issue and forward)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare branch answer is rendered on a line of its own.`
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
    jurisdiction: "WI",
    jurisdictionName: "Wisconsin",
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
    `${fixture.fixtureId}: the assembled packet does not open with the request letter.`
  );
  if (statusOnly) {
    ok(
      assembled.componentRanges[1]?.role === "notice",
      `${fixture.fixtureId}: the status enquiry is not bound after the request letter.`
    );
  }

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    sampleRole: fixture.variantOf ? "variant" : "canonical",
    variantOfTrackId: fixture.variantOf ? fixture.trackId : null,
    variantPurpose: fixture.variantPurpose ?? null,
    components: assemblyComponents.length,
    pages: assembled.pageCount,
    sha256: assembled.sha256
  });
}

note(
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, none trailing empty, no heading stranded from its section, no line past the margin, no paragraph repeated, no bare branch answer, no monetary amount and no unresolved placeholder.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const canonicalFacts = deriveWisconsinFacts(TRACK_ID, fixtureFor());
ok(
  canonicalFacts.fullLegalName === fixtureFor().fullLegalName,
  "The writer's name was rewritten rather than carried through."
);
ok(
  canonicalFacts.completionStatement.includes("14 September 2019"),
  "The completion date is not carried through as the writer stated it."
);
ok(
  /The writer states that they completed the sentence/.test(canonicalFacts.completionStatement),
  "The completion sentence does not frame the date as the writer's own statement."
);

// The two conditional identifiers say so when absent, rather than rendering
// an empty line into a letter an agency has to route.
const withoutIdentifiers = deriveWisconsinFacts(TRACK_ID, {
  ...fixtureFor(),
  supervisionIdentifier: "",
  supervisingAgentName: ""
});
ok(
  /does not have a Department of Corrections or offender identification number/.test(
    withoutIdentifiers.supervisionIdentifierStatement
  ) && /does not recall the name of the agent/.test(withoutIdentifiers.supervisingAgentStatement),
  "An absent conditional identifier does not produce a sentence saying so."
);
ok(
  withoutIdentifiers.supervisionIdentifier === "" && withoutIdentifiers.supervisingAgentName === "",
  "An absent conditional identifier is not carried through as absent."
);

// The request type decides which letter the packet tells the writer to send.
const issueAndForward = deriveWisconsinFacts(TRACK_ID, fixtureFor());
const statusOnlyFacts = deriveWisconsinFacts(TRACK_ID, { ...fixtureFor(), requestType: "status only" });
ok(
  !issueAndForward[WI_STATUS_REQUEST_CONDITION_KEY] &&
    Boolean(statusOnlyFacts[WI_STATUS_REQUEST_CONDITION_KEY]),
  "The request-type answer does not drive whether the status enquiry renders."
);
ok(
  /This is the letter to send/.test(issueAndForward.whichLetterStatement) &&
    /The status enquiry that accompanies this letter is the one to send/.test(
      statusOnlyFacts.whichLetterStatement
    ),
  "The request letter does not change which document it tells the writer to send."
);

// The warning against sending both is only true where the packet holds both, so
// it lives in the derived sentence rather than in fixed copy.
const bothLettersFacts = deriveWisconsinFacts(TRACK_ID, { ...fixtureFor(), requestType: "status only" });
const oneLetterFacts = deriveWisconsinFacts(TRACK_ID, fixtureFor());
ok(
  /Send one of the two, not both/.test(bothLettersFacts.whichLetterStatement) &&
    /Send one of the two, not both/.test(bothLettersFacts.statusOnlyLetterStatement),
  "Where the packet holds both letters, neither warns against sending both."
);
ok(
  !/Send one of the two, not both/.test(oneLetterFacts.whichLetterStatement) &&
    /it is the only letter in this packet/.test(oneLetterFacts.whichLetterStatement),
  "Where the packet holds one letter, it still tells the writer to choose between two."
);

// Every declared required input reaches the fact bag, or resolvePacket cannot
// check it as answered.
for (const fixture of FIXTURES) {
  const facts = deriveWisconsinFacts(fixture.trackId, fixture.answers);
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key),
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
  for (const [key, value] of Object.entries(facts)) {
    if (!["yes", "no", "not_received", "status_only", "issue_and_forward"].includes(value)) continue;
    ok(
      !key.endsWith("Statement"),
      `${fixture.fixtureId}: ${key} carries a bare branch answer into a rendered sentence.`
    );
  }
}

// The material branches produce different packets.
for (const [baseId, variantId] of [
  ["wi-certificate-request-positive-1", "wi-certificate-status-only-2"],
  ["wi-certificate-request-positive-1", "wi-certificate-no-supervision-identifiers-3"]
]) {
  const canonical = results.find((r) => r.fixtureId === baseId);
  const variant = results.find((r) => r.fixtureId === variantId);
  ok(
    canonical && variant && canonical.sha256 !== variant.sha256,
    `${variantId}: the regression variant assembles to the same bytes as ${baseId}, so it tests nothing.`
  );
}
ok(
  results.find((r) => r.fixtureId === "wi-certificate-status-only-2")?.components === 2 &&
    results.find((r) => r.fixtureId === "wi-certificate-request-positive-1")?.components === 1,
  "The status-only variant does not change the number of components in the packet."
);

note(
  "6. Values: the writer's answers are carried through verbatim, the completion date is framed as the writer's own statement, an absent conditional identifier produces a sentence saying so rather than a blank line, the request-type answer drives both the conditional component and the send-this-one instruction, every declared required input reaches the fact bag, and both regression variants assemble to different bytes from the canonical fixture."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const entry of WISCONSIN_CUSTOM_PLEADING_TRACKS) {
  ok(entry.statuses.runtime === "runtime_disabled", `${entry.trackId}: is not runtime-disabled.`);
  ok(entry.statuses.legal === "not_submitted", `${entry.trackId}: claims a legal review status.`);
  ok(entry.statuses.visual === "not_reviewed", `${entry.trackId}: claims a visual review status.`);
  ok(entry.jurisdiction === "WI", `${entry.trackId}: is not a Wisconsin track.`);
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
note("7. Runtime: the track is runtime-disabled, legally unsubmitted, visually unreviewed and statewide.");

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("Wisconsin custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wisconsin custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(46)} ${result.trackId.padEnd(42)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(3)} pages  sha256=${result.sha256}`
  );
}
