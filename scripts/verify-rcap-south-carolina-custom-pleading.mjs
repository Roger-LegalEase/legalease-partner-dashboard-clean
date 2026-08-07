// South Carolina solicitor-office expungement routes — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right: South
// Carolina is not enabled and its shared surfaces are untouched, the assignment
// is exactly the eleven assigned tracks and their sixteen assigned
// custom-pleading components, every component has a governing legal-design
// specification, and the determination recorded in
// sc-solicitor-route-participant-deliverable-resolution holds on the face of
// every document.
//
// That determination is what most of section 2 checks. Every generated document
// is the applicant's own application or request to the Solicitor's Office; none
// of them is, prefills, or portrays itself as the prescribed expungement order.
// SCCA 223A1 and SCCA 223C are named as the form that office supplies and are
// reproduced nowhere. SCCA 223D and SCCA 223E appear nowhere at all. No
// solicitor, attestor, clerk or judicial signature line exists in the module, no
// eligibility is asserted, no waiting period is computed, no judicial circuit is
// invented, and no monetary amount appears that the design does not establish
// for that route.
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
  SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS,
  SOUTH_CAROLINA_PLEADING_TEMPLATES,
  SC_DESIGN_ROLE_TO_ENGINE_ROLE,
  SC_ASSIGNED_TRACK_IDS,
  SC_YES_NO,
  SC_COURT_LEVELS,
  SC_DRUG_OFFENCE_TYPES,
  SC_SUBSTANCE_TYPES,
  SC_BLUE_LIGHT_SUBSECTIONS,
  SC_DISCHARGE_FEE_STATUS,
  SC_OUTSIDE_PARTY_KEYS,
  SC_REFERRAL,
  SC_SOLICITOR_REFERRAL,
  SC_SLED_REFERRAL,
  SC_SUMMARY_COURT_ROUTE_REFERRAL,
  deriveSouthCarolinaFacts,
  SouthCarolinaBranchError,
  SouthCarolinaEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/south-carolina/custom-pleading");

const root = process.cwd();
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const ASSIGNED = [
  "sc_17_1_40_general_sessions",
  "sc_17_1_65_handgun",
  "sc_22_5_910",
  "sc_22_5_920_yoa",
  "sc_22_5_930_drug",
  "sc_34_11_90e_check",
  "sc_56_5_750f",
  "sc_aep",
  "sc_conditional_discharge_44_53_450",
  "sc_pti_17_22_150",
  "sc_tep"
];

/** The five routes § 17-22-940(D) puts an attestor on. */
const ATTESTATION_TRACKS = [
  "sc_22_5_910",
  "sc_aep",
  "sc_conditional_discharge_44_53_450",
  "sc_pti_17_22_150",
  "sc_tep"
];

/** The two routes § 17-22-940(G) lets combine charges from a single incident. */
const AGGREGATION_TRACKS = ["sc_17_1_40_general_sessions", "sc_pti_17_22_150"];

// ---------------------------------------------------------------------------
// 0. South Carolina is not enabled, and the shared surfaces are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned South Carolina track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("sc_")).length === 0,
  "South Carolina templates are wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, SOUTH_CAROLINA_PLEADING_TEMPLATES);

note(
  "0. Enablement: all eleven assigned tracks and all sixteen templates are absent from the shared registry and template pack; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly the eleven tracks and their sixteen components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The implemented track set is not exactly the assigned track set."
);
ok(
  JSON.stringify([...SC_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The module's closed track list is not exactly the assigned track set."
);
ok(
  !assignedIds.has("sc_17_22_950_summary"),
  "The composed summary-court route is implemented here. It carries SCCA 223E, is not a solicitor route, and belongs to no part of this job."
);

/**
 * A stated money amount, which ends in a digit.
 *
 * A trailing-comma-tolerant pattern reads "$150, taken from Supreme Court
 * guidance" as the amount "$150," and then reports every established figure as
 * unestablished, because the design text it is compared against was scanned the
 * same way.
 */
const MONEY = /\$[\d,]*\d/g;
const RENDERED_MONEY = /\$\s?[\d,]*\d/g;

/** Monetary amounts the adopted design establishes for a route. */
const designAmounts = new Map();
for (const trackId of ASSIGNED) {
  const amounts = new Set();
  for (const spec of specs.filter((s) => s.trackId === trackId)) {
    for (const match of JSON.stringify(spec).matchAll(MONEY)) amounts.add(match[0]);
  }
  designAmounts.set(trackId, amounts);
}

let componentCount = 0;
let attestationComponentCount = 0;
for (const track of SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS) {
  const manifest = manifests.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no packet-set manifest in the adopted legal design.`);
  if (!manifest) continue;

  // Every custom_pleading component in the design must be implemented, and
  // nothing else may be. South Carolina's process_guidance components — the
  // official form reference, the records checklist, the fee instrument schedule
  // and the filing instructions — belong to the guidance lane and are not this
  // job's to build.
  const designCp = manifest.components
    .filter((c) => c.outputStrategy === "custom_pleading")
    .map((c) => c.componentId)
    .sort();
  const implemented = track.packetSet.components.map((c) => c.componentId).sort();
  ok(
    JSON.stringify(designCp) === JSON.stringify(implemented),
    `${track.trackId}: implemented components ${JSON.stringify(implemented)} do not match the assigned custom-pleading components ${JSON.stringify(designCp)}.`
  );
  componentCount += implemented.length;

  for (const other of manifest.components.filter((c) => c.outputStrategy !== "custom_pleading")) {
    ok(
      !implemented.includes(other.componentId),
      `${track.trackId}: ${other.componentId} is ${other.outputStrategy} and must not be implemented by the custom-pleading job.`
    );
    // An official_pdf_fill component would be SCCA 223E, which belongs to the
    // summary-court route alone. It must not arrive here by any path.
    ok(
      other.outputStrategy !== "official_pdf_fill",
      `${track.trackId}: the design assigns an official_pdf_fill component to a solicitor route, which the deliverable determination forecloses.`
    );
  }

  // Packet order, requirement and role are the design's, not this module's.
  for (const component of track.packetSet.components) {
    const designComponent = manifest.components.find((c) => c.componentId === component.componentId);
    ok(
      designComponent && designComponent.order === component.order,
      `${component.componentId}: packet order ${component.order} is not the order the design assigns.`
    );
    ok(
      designComponent && designComponent.requirement === component.requirement,
      `${component.componentId}: requirement does not match the design.`
    );

    const spec = specs.find((s) => s.componentId === component.componentId);
    ok(Boolean(spec), `${component.componentId}: no governing custom-pleading specification.`);
    if (spec) {
      ok(
        SC_DESIGN_ROLE_TO_ENGINE_ROLE[spec.role] === component.role,
        `${component.componentId}: design role ${spec.role} is not mapped to engine role ${component.role}.`
      );
      if (spec.role === "attestation_request") attestationComponentCount += 1;
      // Every generation requirement the design declares must be a declared
      // participant input, or nothing can be checked as answered.
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
      `${component.componentId}: a custom pleading claims an official source. No SCCA form is a source for anything in this module.`
    );
    ok(
      component.approval.legal === "not_submitted" && component.approval.visual === "not_reviewed",
      `${component.componentId}: claims an approval this job cannot give.`
    );
  }

  // And no input is declared that the design did not ask for.
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
  // A conditional design question must not become a hard requirement.
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

  const designTrack = registry.find((t) => t.trackId === track.trackId);
  ok(Boolean(designTrack), `${track.trackId}: not in the normalized track registry.`);
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
      designTrack.destination?.kind === "prosecutor",
      `${track.trackId}: the design does not send this route to a prosecuting office.`
    );
  }
  ok(track.runtimeDisabled === true, `${track.trackId}: is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId}: is not a technical fixture.`);
}
ok(componentCount === 16, `Implemented ${componentCount} components rather than the sixteen assigned.`);
ok(
  attestationComponentCount === 5,
  `Implemented ${attestationComponentCount} attestation requests rather than the five § 17-22-940(D) puts an attestor on.`
);
note(
  `1. Assignment: exactly ${ASSIGNED.length} assigned tracks and ${componentCount} assigned custom-pleading components — eleven applications and ${attestationComponentCount} attestation requests — each pinned to the design's component id, order, requirement, role and declared inputs; no process_guidance component was implemented and no route carries an official_pdf_fill component.`
);

// ---------------------------------------------------------------------------
// 2. The deliverable determination, on the face of every template
// ---------------------------------------------------------------------------

const applicationOf = (track) =>
  track.packetSet.components.find((c) => c.role === "primary_filing");
const attestationOf = (track) => track.packetSet.components.find((c) => c.role === "notice");
const sourceOf = (component) => JSON.stringify(pleadingTemplate(component.templateId));

/**
 * Content no document in this module may carry.
 *
 * Each pattern matches an assertion rather than a mention, because the honest
 * copy in these templates names the solicitor, names the order form and names
 * the attestation in order to say who they belong to. A blunter check would fire
 * on the disclaimers it exists to protect.
 */
const PROHIBITED = [
  [/\bSCCA\s?223E\b/i, "SCCA 223E, which is participant-facing only on the unfingerprinted § 17-22-950(B) branch and belongs to no solicitor route"],
  [/\bSCCA\s?223D/i, "SCCA 223D1, which is a summary court instrument completed by the summary court judge"],
  [/\b(is|are|were|will be|would be) eligible\b/i, "an eligibility assertion, which § 17-22-940(E) reserves to SLED"],
  [/\bwill be (granted|expunged|destroyed|cleared)\b/i, "a promise about the result"],
  [/\byour record will be clear\b|\bguaranteed\b/i, "a promise about the result"],
  [/destroyed everywhere|erased everywhere|completely (destroyed|erased|removed)|no record (of it )?(will )?remain/i, "a statement that the record is destroyed everywhere, which § 17-1-40(C) makes false"],
  [/we have (reviewed|verified|confirmed|checked)/i, "a claim that LegalEase reviewed or verified records"],
  [/on your behalf we (filed|sent|served|applied|submitted)/i, "a claim that LegalEase filed, sent or applied"],
  [/(the )?[Ss]olicitor(?:'s [Oo]ffice)? has (accepted|consented|agreed|approved|attested)\b/, "an assertion that the Solicitor's Office has acted"],
  [/\bthe attestation has been (given|obtained|signed)\b/i, "an assertion that an attestor has attested"],
  [/\bIT IS (SO |FURTHER |HEREBY )?ORDERED\b/, "the language of an order, which is the court's instrument and not the applicant's"],
  [/\bthe Court (finds|orders|has found|has ordered|hereby)\b/i, "a judicial finding written as though already made"],
  [/\/s\/|Sworn to before me|Notary Public|Attested by:/i, "a populated or invited outside-party execution"],
  [/\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth) Judicial Circuit\b/, "a named judicial circuit, which the adopted design supplies no county-to-circuit mapping for"]
];

let templatesChecked = 0;
for (const track of SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS) {
  const allowed = designAmounts.get(track.trackId);
  for (const component of track.packetSet.components) {
    const template = pleadingTemplate(component.templateId);
    const source = sourceOf(component);
    templatesChecked += 1;

    for (const [pattern, description] of PROHIBITED) {
      ok(!pattern.test(source), `${component.componentId}: contains ${description}.`);
    }

    // Every monetary amount must be one the adopted design establishes for this
    // route. That is what keeps the SLED verification fee off the four routes
    // § 17-22-940(E)(1) exempts, and keeps an invented figure out entirely.
    for (const match of source.matchAll(MONEY)) {
      ok(
        allowed.has(match[0]),
        `${component.componentId}: prints ${match[0]}, which the adopted design does not establish for this route. Established: ${[...allowed].sort().join(", ")}.`
      );
    }

    // Nothing here is an order, and nothing here invites an outside party to
    // sign. Every document in this module is signed by the applicant alone.
    ok(
      template.signatureLabel === "Applicant",
      `${component.componentId}: the signature rule is not the applicant's. No document in this module is signed by anyone else.`
    );
    ok(
      typeof template.verification === "string" && template.verification.length > 40,
      `${component.componentId}: carries no declaration by the applicant.`
    );
    ok(
      !/^ORDER\b|\bORDER FOR DESTRUCTION\b|\bPROPOSED ORDER\b/i.test(template.title),
      `${component.componentId}: is titled as an order.`
    );
    for (const line of template.signatureBlock) {
      ok(
        !/^\s*(Judge|Solicitor|Clerk|Director|Summary Court|Circuit Court)/i.test(line),
        `${component.componentId}: the execution block carries a line for an outside party: "${line}".`
      );
      ok(
        !/^\s*_{8,}\s*$/.test(line),
        `${component.componentId}: the execution block carries a bare signature rule with no owner: "${line}".`
      );
    }
    ok(
      template.technicalFixture === true,
      `${component.templateId}: is not marked a technical fixture.`
    );
    ok(
      template.fixtureBanner && /DRAFT PENDING LEGAL REVIEW/.test(template.fixtureBanner),
      `${component.templateId}: carries no draft banner.`
    );
    // Unresolved placeholders would print as literal braces.
    ok(
      !/\{\{/.test(source.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")),
      `${component.templateId}: malformed placeholder.`
    );
  }
}
note(
  `2. Prohibited content: ${templatesChecked} templates carry no SCCA 223D or 223E reference, no eligibility assertion, no promise of a result, no claim that any office has acted, no order language, no judicial finding, no outside-party execution, no invented judicial circuit and no monetary amount the design does not establish for the route; every one is signed by the applicant alone.`
);

// The application is an application, and says so.
for (const track of SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS) {
  const trackId = track.trackId;
  const application = sourceOf(applicationOf(track));

  ok(
    /This is the applicant's own application to the Solicitor's Office/.test(application),
    `${trackId}: the application does not say, in terms, that it is the applicant's own application to the Solicitor's Office.`
  );
  ok(
    /It is not the expungement order/.test(application),
    `${trackId}: the application does not say, in terms, that it is not the expungement order.`
  );
  ok(
    /17-22-930/.test(application) &&
      /mandatory and to the exclusion of all other expungement forms/.test(application),
    `${trackId}: the application does not recite the § 17-22-930 rule that the blank order form comes from the solicitor's office and excludes all others.`
  );
  ok(
    /17-22-940\(B\)\(1\)/.test(application) &&
      /that office's duty/.test(application),
    `${trackId}: the application does not put completion of the order form on the Solicitor's Office under § 17-22-940(B)(1).`
  );
  ok(
    /17-22-940\(E\)\(3\)/.test(application) &&
      /take possession of the application during the/.test(application),
    `${trackId}: the application does not recite § 17-22-940(E)(3), which is why the applicant signs the statutory form at that office.`
  );
  ok(
    /has not accepted this application, has not consented to an expungement and has attested to nothing/.test(
      application
    ),
    `${trackId}: the application does not state that outside-party approval has not been obtained.`
  );
  ok(
    /No attestor has signed\. No clerk has certified anything\. No judge has signed anything\./.test(
      application
    ),
    `${trackId}: the application does not name the outside-party acts that have not happened.`
  );
  ok(
    /LegalEase does not represent the applicant and is not the applicant's lawyer/.test(application),
    `${trackId}: the application does not disclaim representation.`
  );
  ok(
    /LegalEase has not sent this package to the Solicitor's Office or to anyone else/.test(application),
    `${trackId}: the application does not say that LegalEase has not sent it.`
  );
  ok(
    /does not promise that any office will act, or that any relief will follow/.test(application),
    `${trackId}: the application promises, or fails to disclaim, a result.`
  );

  // Eligibility belongs to SLED and the solicitor.
  ok(
    /This package makes no statement about whether the applicant qualifies/.test(application),
    `${trackId}: the application does not refuse, in terms, to say whether the applicant qualifies.`
  );
  ok(
    /No date here has been computed into a waiting period/.test(application),
    `${trackId}: the application does not say that no waiting period has been computed.`
  );
  ok(
    /17-22-940\(I\)/.test(application),
    `${trackId}: the application does not record what § 17-22-940(I) leaves the applicant where the solicitor does not consent.`
  );

  // The retentions, which are the reason nobody may be told the record is gone.
  ok(
    /does not wipe the record from every place it exists/.test(application),
    `${trackId}: the application does not disclose that an expungement is not a removal from everywhere.`
  );
  ok(
    /three years and one hundred twenty days/.test(application) && /17-1-40\(C\)/.test(application),
    `${trackId}: the application does not disclose the § 17-1-40(C) sealed retentions.`
  );
  ok(
    /does not reach federal, out-of-state, military or tribal records/.test(application),
    `${trackId}: the application does not disclose what a South Carolina order does not reach.`
  );

  // The preserved questions.
  ok(
    /The single-incident figure is not settled/.test(application) &&
      /\$150/.test(application) &&
      /\$250/.test(application),
    `${trackId}: the application does not preserve the § 17-22-940(G) single-incident fee question with both figures.`
  );
  ok(
    /H\.3730/.test(application) && /H\.428/.test(application),
    `${trackId}: the application does not carry the H.3730 and H.428 standing monitor.`
  );
  ok(
    /Whether charges from more than one judicial circuit can travel on one application/.test(
      application
    ),
    `${trackId}: the application does not preserve the multi-county venue question.`
  );
  ok(
    /How the programme routes and the conviction routes overlap/.test(application),
    `${trackId}: the application does not preserve the overlapping-programme question.`
  );

  // Venue is the applicant's county and no circuit is chosen for them.
  ok(
    /this package does not name a circuit number/.test(application),
    `${trackId}: the application does not say that it names no judicial circuit.`
  );

  // The stops are printed, not merely enforced.
  ok(/WHERE THIS PACKAGE STOPS/.test(application), `${trackId}: the application carries no printed stop section.`);
  ok(application.includes(SC_REFERRAL), `${trackId}: the application's stop section carries no referral.`);

  // The order form is named accurately, and only the right one.
  const usesC = trackId === "sc_17_1_65_handgun";
  ok(
    usesC ? /SCCA 223C/.test(application) : /SCCA 223A1 GS/.test(application),
    `${trackId}: the application does not name the order form the design assigns to this route.`
  );
  ok(
    usesC || !/SCCA 223C/.test(application),
    `${trackId}: names SCCA 223C, which is a § 17-1-65 instrument and is not generalized across routes.`
  );
  ok(
    /It is not reproduced in this package in any state, blank or completed/.test(application),
    `${trackId}: the application does not say that the order form is not reproduced in it.`
  );

  // Aggregation, per the route the statute actually permits it on.
  if (AGGREGATION_TRACKS.includes(trackId)) {
    ok(
      /This route is one of those two/.test(application),
      `${trackId}: § 17-22-940(G) permits combining on this route and the application does not say so.`
    );
    ok(
      /Nobody at LegalEase has decided it/.test(application),
      `${trackId}: the application decides, rather than refuses to decide, whether the charges arose from one incident.`
    );
  } else {
    ok(
      /This route is neither of those two, so this application covers the one charge/.test(application),
      `${trackId}: § 17-22-940(G) does not permit combining on this route and the application does not say so.`
    );
  }
}
note(
  "2b. Deliverable determination: on all eleven routes the application states that it is the applicant's own application and not the expungement order, recites § 17-22-930, § 17-22-940(B)(1) and § 17-22-940(E)(3), states that no office has accepted, consented or attested, disclaims representation, sending and any promise of relief, refuses to say whether the applicant qualifies, discloses the § 17-1-40(C) retentions, preserves the fee, multi-county venue, overlapping-programme and H.3730/H.428 questions, names no circuit, and names only the order form the design assigns to it."
);

// The five attestation requests ask; they do not attest.
for (const trackId of ATTESTATION_TRACKS) {
  const track = SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const component = attestationOf(track);
  ok(Boolean(component), `${trackId}: § 17-22-940(D) names an attestor and no request component exists.`);
  if (!component) continue;
  const request = sourceOf(component);
  const template = pleadingTemplate(component.templateId);

  ok(
    /17-22-940\(D\)/.test(request),
    `${trackId}: the attestation request does not cite the subsection that requires the attestation.`
  );
  ok(
    /Nothing is enclosed here to be signed/.test(request),
    `${trackId}: the attestation request does not say that nothing in it is to be signed.`
  );
  ok(
    /This letter carries no attestation block and no signature line for the recipient/.test(request),
    `${trackId}: the attestation request does not say that it carries no attestation block.`
  );
  ok(
    /the attestation does not belong on a document LegalEase generated/.test(request),
    `${trackId}: the attestation request does not say where the attestation actually belongs.`
  );
  ok(
    /The applicant is not asking the recipient to decide whether this record can be cleared/.test(request),
    `${trackId}: the attestation request asks the recipient for something other than the attestation.`
  );
  ok(
    /It has sent nothing, holds no reply, and makes no claim about what the recipient will do/.test(request),
    `${trackId}: the attestation request does not disclaim holding a reply."`
  );
  ok(
    /If the recipient is not willing to attest, the applicant asks to be told that plainly/.test(request),
    `${trackId}: the attestation request gives the recipient no way to decline.`
  );
  ok(
    /This block is the applicant's and the only one on this letter/.test(
      template.signatureBlock.join("\n")
    ),
    `${trackId}: the attestation request does not state that the only execution block on it is the applicant's.`
  );
  ok(
    template.signatureBlock.every((line) => !/recipient (signature|signs)|Attestation:|Attested/i.test(line)),
    `${trackId}: the attestation request carries an attestation line for the recipient.`
  );
  ok(
    !/\$[\d,]/.test(request),
    `${trackId}: the attestation request prints a fee amount. The fee schedule is not the attestor's business.`
  );
}

// And no route without an attestor invents one.
for (const track of SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS) {
  if (ATTESTATION_TRACKS.includes(track.trackId)) continue;
  ok(
    !attestationOf(track),
    `${track.trackId}: carries an attestation request on a route § 17-22-940(D) puts no attestor on.`
  );
}

// The two routes whose aggregation rule is unresolved say so.
for (const trackId of ["sc_22_5_910", "sc_22_5_920_yoa"]) {
  const application = sourceOf(
    applicationOf(SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId))
  );
  ok(
    /are not obviously reconciled|not obviously reconciled/.test(application) &&
      /promises no single application on this route/.test(application),
    `${trackId}: the application does not preserve the same-incident aggregation question.`
  );
}

// The handgun route surfaces its deadline unprompted.
const handgunApplication = sourceOf(
  applicationOf(SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === "sc_17_1_65_handgun"))
);
ok(
  /THIS ROUTE CLOSES ON 7 MARCH 2029/.test(handgunApplication),
  "sc_17_1_65_handgun: the application does not surface the closing window."
);
ok(
  /loses this route permanently/.test(handgunApplication),
  "sc_17_1_65_handgun: the application does not say what missing the deadline costs."
);
ok(
  /nobody at LegalEase ticks them/.test(handgunApplication),
  "sc_17_1_65_handgun: the application does not leave the three § 17-1-65 findings to the court."
);

// The drug route keeps the design's routing warning.
const drugApplication = sourceOf(
  applicationOf(SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === "sc_22_5_930_drug"))
);
ok(
  /NOT EVERY DRUG CONVICTION COMES HERE/.test(drugApplication),
  "sc_22_5_930_drug: the application does not carry the design's warning against routing every drug conviction here."
);
ok(
  /interacts with .*44-53-450/.test(drugApplication),
  "sc_22_5_930_drug: the application does not preserve the § 44-53-450 overlap question."
);

note(
  `2c. Route-specific boundaries: the ${ATTESTATION_TRACKS.length} attestation requests cite § 17-22-940(D), carry no attestation block, no recipient signature line and no fee amount, and let the recipient decline; no route without an attestor carries one; the § 22-5-910 and § 22-5-920 aggregation questions are preserved; the § 17-1-65 window and its three judicial findings are stated; the drug route keeps its routing warning and the § 44-53-450 overlap question.`
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical positive per assigned track, plus
//    regression variants where a branch changes the document
// ---------------------------------------------------------------------------

/** Synthetic answers only. No real person's record is used anywhere here. */
const base = (overrides = {}) => ({
  applicantName: "Marion Ellis Broadwater, formerly Marion Ellis Cade",
  dateOfBirth: "9 February 1992",
  chargeIdentity:
    "Described on the docket as simple possession of marijuana; warrant number 2016A4010200123",
  offenseCounty: "Richland County",
  courtLevel: "general sessions",
  arrestDate: "3 May 2016; arrested by the Columbia Police Department",
  dispositionDetail: "Dismissed on the State's motion on 14 November 2018",
  singleIncidentCharges: "No",
  priorExpungementUse: "No",
  pendingCharges: "None",
  ...overrides
});

const TWO_CHARGES =
  "Yes. Simple possession of marijuana and possession of drug paraphernalia, both out of the traffic stop on 3 May 2016.";

const FIXTURES = [
  {
    fixtureId: "sc-general-sessions-positive-1",
    trackId: "sc_17_1_40_general_sessions",
    answers: base({ pleaArrangement: "no", courtesySummons: "no" })
  },
  {
    fixtureId: "sc-general-sessions-single-incident-2",
    trackId: "sc_17_1_40_general_sessions",
    variantOf: "sc-general-sessions-positive-1",
    // § 17-22-940(G) permits combining on this route, so more than one charge
    // changes both the recited allegation and the aggregation paragraph.
    answers: base({
      pleaArrangement: "no",
      courtesySummons: "yes",
      singleIncidentCharges: TWO_CHARGES
    })
  },
  {
    fixtureId: "sc-pretrial-intervention-positive-1",
    trackId: "sc_pti_17_22_150",
    answers: base({
      dispositionDetail:
        "Noncriminal disposition by the solicitor on 20 June 2018 after Pretrial Intervention was completed",
      ptiCircuit:
        "The Pretrial Intervention programme run by the solicitor's office for the circuit that includes Richland County; my officer was J. Alvarez",
      ptiCompletionDate: "12 June 2018"
    })
  },
  {
    fixtureId: "sc-pretrial-intervention-single-incident-2",
    trackId: "sc_pti_17_22_150",
    variantOf: "sc-pretrial-intervention-positive-1",
    // The other of the two routes § 17-22-940(G) lets combine.
    answers: base({
      dispositionDetail:
        "Noncriminal disposition by the solicitor on 20 June 2018 after Pretrial Intervention was completed",
      singleIncidentCharges: TWO_CHARGES,
      ptiCircuit:
        "The Pretrial Intervention programme run by the solicitor's office for the circuit that includes Richland County; my officer was J. Alvarez",
      ptiCompletionDate: "12 June 2018"
    })
  },
  {
    fixtureId: "sc-alcohol-education-positive-1",
    trackId: "sc_aep",
    answers: base({
      chargeIdentity:
        "Described on the ticket as unlawful purchase or possession of beer by a person under twenty-one; ticket number 4110A2C",
      dispositionDetail:
        "Noncriminal disposition by the circuit solicitor on 18 April 2019 after the Alcohol Education Program was completed",
      courtLevel: "magistrate",
      ageAtArrest: "19",
      priorAlcoholOffense: "no",
      aepCompletionDate:
        "4 April 2019, administered by the circuit solicitor's alcohol education programme office"
    })
  },
  {
    fixtureId: "sc-traffic-education-positive-1",
    trackId: "sc_tep",
    answers: base({
      chargeIdentity: "Described on the ticket as failure to yield the right of way; ticket number 7723B9",
      dispositionDetail:
        "Noncriminal disposition by the administering agency on 1 September 2021 after the Traffic Education Program was completed",
      courtLevel: "municipal",
      tepCompletionDate:
        "22 August 2021, administered by the county agency under contract with the circuit solicitor",
      subsequentViolation: "no",
      injuryOrDeath: "no"
    })
  },
  {
    fixtureId: "sc-conditional-discharge-positive-1",
    trackId: "sc_conditional_discharge_44_53_450",
    answers: base({
      dispositionDetail:
        "Discharged and the proceedings dismissed under § 44-53-450 on 8 March 2021",
      priorDrugConviction: "no",
      dischargeDate: "8 March 2021",
      dischargeFeePaid: "paid",
      priorConditionalDischarge: "no"
    })
  },
  {
    fixtureId: "sc-fraudulent-check-positive-1",
    trackId: "sc_34_11_90e_check",
    answers: base({
      chargeIdentity:
        "Described on the docket as fraudulent check, first offence; warrant number 2023A4020100447",
      dispositionDetail: "Convicted on a plea of guilty on 17 January 2023",
      courtLevel: "magistrate",
      convictionDate: "17 January 2023",
      instrumentAmount: "420",
      convictionsSinceYear: "no",
      numberOfChecks: "One cheque, charged as a single offence"
    })
  },
  {
    fixtureId: "sc-low-level-conviction-positive-1",
    trackId: "sc_22_5_910",
    answers: base({
      chargeIdentity:
        "Described on the docket as disorderly conduct; warrant number 2019A4030100882",
      dispositionDetail: "Convicted on a plea of guilty on 2 October 2019",
      courtLevel: "magistrate",
      convictionDate: "2 October 2019",
      penaltyCeiling:
        "Not more than 30 days in jail or a fine of 1,000 dollars, taken from the sentencing sheet",
      motorVehicleOffense: "no",
      domesticViolenceThird: "no",
      firearmPossession: "no",
      convictionsSincePeriod: "no",
      closelyConnectedOffenses: "no"
    })
  },
  {
    fixtureId: "sc-low-level-firearm-limb-2",
    trackId: "sc_22_5_910",
    variantOf: "sc-low-level-conviction-positive-1",
    // The firearm limb of § 22-5-910(A) carries its own penalty ceiling and the
    // application recites a different paragraph for it.
    answers: base({
      chargeIdentity:
        "Described on the docket as unlawful carrying of a weapon, first offence; warrant number 2019A4030100883",
      dispositionDetail: "Convicted on a plea of guilty on 2 October 2019",
      courtLevel: "magistrate",
      convictionDate: "2 October 2019",
      penaltyCeiling:
        "Not more than 1 year in jail or a fine of 1,000 dollars, taken from the sentencing sheet",
      motorVehicleOffense: "no",
      domesticViolenceThird: "no",
      firearmPossession: "yes",
      convictionsSincePeriod: "no",
      closelyConnectedOffenses: "no"
    })
  },
  {
    fixtureId: "sc-youthful-offender-positive-1",
    trackId: "sc_22_5_920_yoa",
    answers: base({
      chargeIdentity:
        "Described on the judgment as breaking into a motor vehicle; indictment number 2013-GS-40-1187",
      dispositionDetail: "Convicted on a plea of guilty on 4 November 2013",
      yoaSentenced: "yes",
      sentenceCompletionDate: "30 September 2018",
      convictionsSinceCompletion: "no",
      excludedCategory: "no",
      closelyConnectedOffenses: "no"
    })
  },
  {
    fixtureId: "sc-first-drug-conviction-positive-1",
    trackId: "sc_22_5_930_drug",
    answers: base({
      dispositionDetail: "Convicted on a plea of guilty on 6 May 2017",
      drugOffenseType: "simple possession",
      substanceType: "marijuana",
      sentenceCompletionDate: "11 July 2020",
      priorDrugOffense: "yes",
      priorConditionalDischarge: "No",
      convictionsSincePeriod: "no"
    })
  },
  {
    fixtureId: "sc-first-drug-prescription-2",
    trackId: "sc_22_5_930_drug",
    variantOf: "sc-first-drug-conviction-positive-1",
    // A different offence inside subsection (A), and the other § 22-5-930(D)
    // lookback, so both the offence recital and the substance recital change.
    answers: base({
      chargeIdentity:
        "Described on the docket as unlawful possession of a prescription drug; warrant number 2017A4010200991",
      dispositionDetail: "Convicted on a plea of guilty on 6 May 2017",
      drugOffenseType: "prescription drug",
      substanceType: "other controlled substance",
      sentenceCompletionDate: "11 July 2020",
      priorDrugOffense: "yes",
      priorConditionalDischarge: "No",
      convictionsSincePeriod: "no"
    })
  },
  {
    fixtureId: "sc-failure-to-stop-positive-1",
    trackId: "sc_56_5_750f",
    answers: base({
      chargeIdentity:
        "Described on the ticket as failure to stop for a blue light; ticket number 5541C2",
      dispositionDetail: "Convicted on a plea of guilty on 3 April 2019",
      offenseDate: "19 February 2019",
      subsectionCharged: "b1 misdemeanor",
      injuryOrDeath: "no",
      termsCompletionDate: "6 June 2021",
      convictionsSincePeriod: "no",
      firstOffenseStatus: "yes"
    })
  },
  {
    fixtureId: "sc-handgun-conviction-positive-1",
    trackId: "sc_17_1_65_handgun",
    answers: base({
      chargeIdentity:
        "Described on the judgment as unlawful possession of a handgun; indictment number 2019-GS-40-0442",
      dispositionDetail: "Convicted on a plea of guilty on 14 March 2019",
      convictionDate: "14 March 2019",
      convictionStatute: "yes",
      priorHandgunApplication: "no",
      otherHandgunConvictions: "no"
    })
  }
];

const fixtureFor = (trackId) => FIXTURES.find((f) => f.trackId === trackId && !f.variantOf).answers;

ok(
  new Set(FIXTURES.filter((f) => !f.variantOf).map((f) => f.trackId)).size === ASSIGNED.length,
  "Not every assigned track has exactly one canonical fixture."
);
for (const fixture of FIXTURES.filter((f) => f.variantOf)) {
  const canonical = FIXTURES.find((f) => f.fixtureId === fixture.variantOf);
  ok(
    canonical && canonical.trackId === fixture.trackId,
    `${fixture.fixtureId}: names a canonical fixture on a different track, so it would be counted as a new legal track.`
  );
}

note(
  `3. Fixtures: ${FIXTURES.filter((f) => !f.variantOf).length} canonical fixtures, exactly one per assigned track, and ${FIXTURES.filter((f) => f.variantOf).length} regression variants, each naming the canonical fixture on its own track so no variant is counted as a new legal track. Every answer is synthetic.`
);

// ---------------------------------------------------------------------------
// 4. Typed stops and closed lists
// ---------------------------------------------------------------------------

const NEGATIVE = [
  // Missing participant case facts, on every route.
  ...ASSIGNED.map((trackId) => [
    "a required case fact is missing",
    trackId,
    { ...fixtureFor(trackId), chargeIdentity: "" },
    "sc-answer-missing"
  ]),
  // Unresolved venue and multi-county uncertainty.
  [
    "the county of the offence is not known",
    "sc_22_5_910",
    { ...fixtureFor("sc_22_5_910"), offenseCounty: "I am not sure which county it was" },
    "sc-venue-not-established"
  ],
  [
    "charges are spread across more than one county",
    "sc_22_5_930_drug",
    { ...fixtureFor("sc_22_5_930_drug"), offenseCounty: "Richland County and Lexington County" },
    "sc-multi-county-venue-unresolved"
  ],
  // A pending charge, on every route.
  ...ASSIGNED.map((trackId) => [
    "a criminal charge is pending",
    trackId,
    {
      ...fixtureFor(trackId),
      pendingCharges: "Yes, a shoplifting charge has been pending since March 2026"
    },
    "sc-pending-charge"
  ]),
  // Prior relief and the statutory cap.
  [
    "a South Carolina record has been expunged before",
    "sc_34_11_90e_check",
    {
      ...fixtureFor("sc_34_11_90e_check"),
      priorExpungementUse: "Yes, a charge was expunged in 2014"
    },
    "sc-prior-expungement-cap"
  ],
  // Outside-party or judicial completion asked for.
  [
    "a solicitor signature is supplied",
    "sc_17_1_40_general_sessions",
    { ...fixtureFor("sc_17_1_40_general_sessions"), solicitorSignature: "R. Pemberton, Solicitor" },
    "sc-outside-party-completion-refused"
  ],
  [
    "a judicial finding is supplied",
    "sc_22_5_920_yoa",
    { ...fixtureFor("sc_22_5_920_yoa"), judicialFinding: "The court finds the defendant eligible" },
    "sc-outside-party-completion-refused"
  ],
  [
    "an attestation is supplied",
    "sc_pti_17_22_150",
    { ...fixtureFor("sc_pti_17_22_150"), attestation: "Attested by the PTI Director" },
    "sc-outside-party-completion-refused"
  ],
  // A summary court non-conviction is free and does not belong here.
  [
    "a summary court non-conviction is routed to the solicitor",
    "sc_17_1_40_general_sessions",
    { ...fixtureFor("sc_17_1_40_general_sessions"), courtLevel: "magistrate" },
    "sc-summary-court-non-conviction-routes-elsewhere"
  ],
  // Unresolved fee treatment.
  [
    "the dismissal was part of a plea arrangement",
    "sc_17_1_40_general_sessions",
    { ...fixtureFor("sc_17_1_40_general_sessions"), pleaArrangement: "yes" },
    "sc-plea-arrangement-dismissal"
  ],
  [
    "the conditional discharge fee is unpaid",
    "sc_conditional_discharge_44_53_450",
    { ...fixtureFor("sc_conditional_discharge_44_53_450"), dischargeFeePaid: "not paid" },
    "sc-conditional-discharge-fee-unpaid"
  ],
  // Incomplete or unestablished programme disposition.
  [
    "the pretrial intervention completion date is not stated",
    "sc_pti_17_22_150",
    { ...fixtureFor("sc_pti_17_22_150"), ptiCompletionDate: "I do not remember" },
    "sc-pti-completion-not-established"
  ],
  [
    "the alcohol education completion date is not stated",
    "sc_aep",
    { ...fixtureFor("sc_aep"), aepCompletionDate: "some time that spring" },
    "sc-aep-completion-not-established"
  ],
  [
    "a further traffic violation terminated the programme",
    "sc_tep",
    { ...fixtureFor("sc_tep"), subsequentViolation: "yes" },
    "sc-tep-subsequent-violation"
  ],
  [
    "the discharge and dismissal date is not stated",
    "sc_conditional_discharge_44_53_450",
    { ...fixtureFor("sc_conditional_discharge_44_53_450"), dischargeDate: "I am not sure" },
    "sc-conditional-discharge-date-not-established"
  ],
  // Outside the permitted offence category.
  [
    "the applicant was outside the alcohol programme age window",
    "sc_aep",
    { ...fixtureFor("sc_aep"), ageAtArrest: "24" },
    "sc-aep-age-outside-programme"
  ],
  [
    "an earlier alcohol-related offence exists",
    "sc_aep",
    { ...fixtureFor("sc_aep"), priorAlcoholOffense: "yes" },
    "sc-aep-prior-alcohol-offence"
  ],
  [
    "the traffic incident caused death or serious injury",
    "sc_tep",
    { ...fixtureFor("sc_tep"), injuryOrDeath: "yes" },
    "sc-tep-injury-or-death"
  ],
  [
    "the offence involved a motor vehicle",
    "sc_22_5_910",
    { ...fixtureFor("sc_22_5_910"), motorVehicleOffense: "yes" },
    "sc-22-5-910-motor-vehicle-offence"
  ],
  [
    "the conviction was for domestic violence in the third degree",
    "sc_22_5_910",
    { ...fixtureFor("sc_22_5_910"), domesticViolenceThird: "yes" },
    "sc-22-5-910-domestic-violence"
  ],
  [
    "the offence is in an excluded youthful offender category",
    "sc_22_5_920_yoa",
    { ...fixtureFor("sc_22_5_920_yoa"), excludedCategory: "yes" },
    "sc-yoa-excluded-category"
  ],
  [
    "the conviction was for possession with intent to distribute",
    "sc_22_5_930_drug",
    { ...fixtureFor("sc_22_5_930_drug"), drugOffenseType: "possession with intent" },
    "sc-drug-possession-with-intent"
  ],
  [
    "the conviction was not under § 56-5-750(B)(1)",
    "sc_56_5_750f",
    { ...fixtureFor("sc_56_5_750f"), subsectionCharged: "felony" },
    "sc-blue-light-outside-subsection-b1"
  ],
  [
    "the instrument exceeded the felony threshold",
    "sc_34_11_90e_check",
    { ...fixtureFor("sc_34_11_90e_check"), instrumentAmount: "6,400" },
    "sc-check-felony-threshold"
  ],
  [
    "more than one instrument was involved",
    "sc_34_11_90e_check",
    { ...fixtureFor("sc_34_11_90e_check"), numberOfChecks: "Three cheques, charged separately" },
    "sc-check-multiple-instruments"
  ],
  // Track-specific waiting-period and window failures.
  [
    "the handgun conviction post-dates the statutory window",
    "sc_17_1_65_handgun",
    { ...fixtureFor("sc_17_1_65_handgun"), convictionDate: "2 April 2024" },
    "sc-handgun-conviction-outside-window"
  ],
  [
    "the handgun conviction date cannot be read against the window",
    "sc_17_1_65_handgun",
    { ...fixtureFor("sc_17_1_65_handgun"), convictionDate: "some time in 2019" },
    "sc-handgun-conviction-date-not-established"
  ],
  [
    "a conviction intervened during the one-year period",
    "sc_34_11_90e_check",
    { ...fixtureFor("sc_34_11_90e_check"), convictionsSinceYear: "yes" },
    "sc-check-intervening-conviction"
  ],
  [
    "a conviction intervened during the § 22-5-910 period",
    "sc_22_5_910",
    { ...fixtureFor("sc_22_5_910"), convictionsSincePeriod: "yes" },
    "sc-22-5-910-intervening-conviction"
  ],
  [
    "a conviction intervened during or after the youthful offender sentence",
    "sc_22_5_920_yoa",
    { ...fixtureFor("sc_22_5_920_yoa"), convictionsSinceCompletion: "yes" },
    "sc-yoa-intervening-conviction"
  ],
  [
    "a conviction intervened after the drug sentence was completed",
    "sc_22_5_930_drug",
    { ...fixtureFor("sc_22_5_930_drug"), convictionsSincePeriod: "yes" },
    "sc-drug-intervening-conviction"
  ],
  [
    "a conviction intervened during the § 56-5-750(F) period",
    "sc_56_5_750f",
    { ...fixtureFor("sc_56_5_750f"), convictionsSincePeriod: "yes" },
    "sc-blue-light-intervening-conviction"
  ],
  [
    "the completion date of every term and condition is not stated",
    "sc_56_5_750f",
    { ...fixtureFor("sc_56_5_750f"), termsCompletionDate: "I could not say" },
    "sc-blue-light-terms-not-established"
  ],
  // Prior relief, statutory cap and once-only rules.
  [
    "an earlier § 17-1-65 application was made",
    "sc_17_1_65_handgun",
    { ...fixtureFor("sc_17_1_65_handgun"), priorHandgunApplication: "yes" },
    "sc-handgun-prior-application"
  ],
  [
    "more than one handgun conviction exists",
    "sc_17_1_65_handgun",
    { ...fixtureFor("sc_17_1_65_handgun"), otherHandgunConvictions: "yes" },
    "sc-handgun-more-than-one-conviction"
  ],
  [
    "an earlier conditional discharge was granted",
    "sc_conditional_discharge_44_53_450",
    { ...fixtureFor("sc_conditional_discharge_44_53_450"), priorConditionalDischarge: "yes" },
    "sc-conditional-discharge-once-only"
  ],
  [
    "a prior drug conviction defeats the conditional discharge route",
    "sc_conditional_discharge_44_53_450",
    { ...fixtureFor("sc_conditional_discharge_44_53_450"), priorDrugConviction: "yes" },
    "sc-conditional-discharge-prior-drug-conviction"
  ],
  [
    "a prior conditional discharge engages the § 22-5-930(D) lookback",
    "sc_22_5_930_drug",
    {
      ...fixtureFor("sc_22_5_930_drug"),
      priorConditionalDischarge: "Yes, a conditional discharge in 2013"
    },
    "sc-drug-conditional-discharge-lookback"
  ],
  [
    "the conviction was not a first drug offence",
    "sc_22_5_930_drug",
    { ...fixtureFor("sc_22_5_930_drug"), priorDrugOffense: "no" },
    "sc-drug-not-a-first-offence"
  ],
  [
    "the conviction was not a first failure-to-stop offence",
    "sc_56_5_750f",
    { ...fixtureFor("sc_56_5_750f"), firstOffenseStatus: "no" },
    "sc-blue-light-not-a-first-offence"
  ],
  // Disputed same-incident treatment.
  [
    "same-incident aggregation is claimed under § 22-5-910(E)",
    "sc_22_5_910",
    { ...fixtureFor("sc_22_5_910"), closelyConnectedOffenses: "yes" },
    "sc-same-incident-aggregation-unresolved"
  ],
  [
    "same-incident aggregation is claimed under § 22-5-920(A)",
    "sc_22_5_920_yoa",
    { ...fixtureFor("sc_22_5_920_yoa"), closelyConnectedOffenses: "yes" },
    "sc-same-incident-aggregation-unresolved"
  ],
  // Contested eligibility requiring counsel or the record.
  [
    "the statutory penalty ceiling is not established from the record",
    "sc_22_5_910",
    { ...fixtureFor("sc_22_5_910"), penaltyCeiling: "I do not know what the maximum was" },
    "sc-22-5-910-penalty-ceiling-not-established"
  ],
  [
    "the sentencing paperwork does not record a youthful offender sentence",
    "sc_22_5_920_yoa",
    { ...fixtureFor("sc_22_5_920_yoa"), yoaSentenced: "no" },
    "sc-yoa-sentence-not-recorded"
  ],
  [
    "the sentencing paperwork does not name § 16-23-20",
    "sc_17_1_65_handgun",
    { ...fixtureFor("sc_17_1_65_handgun"), convictionStatute: "no" },
    "sc-handgun-statute-not-confirmed"
  ]
];

let stopped = 0;
const stopIdsSeen = new Set();
for (const [label, trackId, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveSouthCarolinaFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof SouthCarolinaEligibilityStopError,
    `${trackId}: ${label} did not fail closed with a typed stop.`
  );
  if (caught instanceof SouthCarolinaEligibilityStopError) {
    ok(
      caught.stopId === expectedStopId,
      `${trackId}: ${label} raised ${caught.stopId} rather than ${expectedStopId}.`
    );
    ok(caught.referral.length > 20, `${trackId}: ${label} lost its destination.`);
    ok(caught.nextStep.length > 30, `${trackId}: ${label} gives no next step a person could take.`);
    ok(
      caught.reason.length > 60,
      `${trackId}: ${label} gives no reason a person could act on.`
    );
    // No stop may send the applicant back to the thing that stopped them.
    ok(
      !(caught.referral === SC_SOLICITOR_REFERRAL && /solicitor or his designee declines/i.test(caught.reason)),
      `${trackId}: ${label} routes the applicant in a circle.`
    );
    stopped += 1;
    stopIdsSeen.add(caught.stopId);
  }
}

// Every route's stops are reachable, not just the ones that were convenient.
for (const trackId of ASSIGNED) {
  ok(
    NEGATIVE.some(([, id]) => id === trackId),
    `${trackId}: no negative case covers this route.`
  );
}

// The routing stops send the applicant somewhere other than a lawyer, because a
// lawyer is not the answer to "is there a free route" or "what will you charge".
let summaryCourtStop = null;
try {
  deriveSouthCarolinaFacts("sc_17_1_40_general_sessions", {
    ...fixtureFor("sc_17_1_40_general_sessions"),
    courtLevel: "municipal"
  });
} catch (error) {
  summaryCourtStop = error;
}
ok(
  summaryCourtStop?.referral === SC_SUMMARY_COURT_ROUTE_REFERRAL,
  "The summary court stop does not route the applicant to the free § 17-22-950 route."
);

let outsidePartyStop = null;
try {
  deriveSouthCarolinaFacts("sc_tep", { ...fixtureFor("sc_tep"), judgeSignature: "A. Rowe" });
} catch (error) {
  outsidePartyStop = error;
}
ok(
  outsidePartyStop?.referral === SC_SOLICITOR_REFERRAL,
  "The outside-party stop does not route the applicant to the Solicitor's Office, which is the office that completes the order."
);

let venueStop = null;
try {
  deriveSouthCarolinaFacts("sc_22_5_910", {
    ...fixtureFor("sc_22_5_910"),
    offenseCounty: "Richland County, Lexington County"
  });
} catch (error) {
  venueStop = error;
}
ok(
  venueStop?.referral === SC_SOLICITOR_REFERRAL,
  "The multi-county stop does not route the applicant to a solicitor's office."
);
ok(
  /LegalEase will not choose a circuit for you/.test(venueStop?.reason ?? ""),
  "The multi-county stop does not refuse, in terms, to choose a venue."
);

let missingFactStop = null;
try {
  deriveSouthCarolinaFacts("sc_aep", { ...fixtureFor("sc_aep"), applicantName: "" });
} catch (error) {
  missingFactStop = error;
}
ok(
  missingFactStop?.referral === SC_SLED_REFERRAL,
  "The missing-fact stop does not send the applicant to the record."
);

// Closed lists reject anything outside them.
const BRANCH_CASES = [
  ["sc_17_1_40_general_sessions", "courtLevel", "family court"],
  ["sc_17_1_40_general_sessions", "pleaArrangement", "I think so"],
  ["sc_22_5_910", "motorVehicleOffense", "maybe"],
  ["sc_22_5_930_drug", "drugOffenseType", "trafficking"],
  ["sc_22_5_930_drug", "substanceType", "alcohol"],
  ["sc_56_5_750f", "subsectionCharged", "b2"],
  ["sc_conditional_discharge_44_53_450", "dischargeFeePaid", "partly"],
  ["sc_17_1_65_handgun", "convictionStatute", "probably"]
];
let branchRejected = 0;
for (const [trackId, key, value] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveSouthCarolinaFacts(trackId, { ...fixtureFor(trackId), [key]: value });
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof SouthCarolinaBranchError,
    `${trackId}: "${value}" for ${key} was not rejected as outside the approved list.`
  );
  if (caught instanceof SouthCarolinaBranchError) branchRejected += 1;
}

// A track this job was not assigned cannot be derived for, and neither can the
// composed summary-court route that carries SCCA 223E.
for (const trackId of ["sc_something_else", "sc_17_22_950_summary"]) {
  let caught = null;
  try {
    deriveSouthCarolinaFacts(trackId, {});
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof SouthCarolinaBranchError,
    `An unassigned track identifier ${trackId} was accepted by the fact derivation.`
  );
}

ok(Object.keys(SC_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(new Set(Object.values(SC_COURT_LEVELS)).size === 3, "The court-level list changed size.");
ok(new Set(Object.values(SC_DRUG_OFFENCE_TYPES)).size === 3, "The drug-offence list changed size.");
ok(new Set(Object.values(SC_SUBSTANCE_TYPES)).size === 2, "The substance list changed size.");
ok(
  new Set(Object.values(SC_BLUE_LIGHT_SUBSECTIONS)).size === 4,
  "The failure-to-stop subsection list changed size."
);
ok(
  new Set(Object.values(SC_DISCHARGE_FEE_STATUS)).size === 3,
  "The conditional-discharge fee list changed size."
);
ok(SC_OUTSIDE_PARTY_KEYS.length >= 10, "The outside-party key guard was narrowed.");
ok(SC_REFERRAL.length > 20, "The default referral destination is empty.");

note(
  `4. Stops: ${stopped} negative cases across all ${ASSIGNED.length} routes fail closed with the expected typed stop, a destination, a next step and a reason; ${stopIdsSeen.size} distinct stop families are exercised, covering missing case facts, unresolved and multi-county venue, pending charges, prior relief and statutory caps, unresolved fee treatment, incomplete programme dispositions, offence-category exclusions, intervening-conviction and window failures, disputed same-incident aggregation, contested eligibility, and any request for outside-party or judicial completion; ${branchRejected} out-of-list branch values rejected; two unassigned track identifiers refused; six closed lists hold their size.`
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
 * section overleaf, and a paragraph rendered twice — none of which a page count
 * or a byte length shows.
 *
 * Em dashes and section marks decode to a replacement character under latin1.
 * That is an artefact of reading the stream, not of the render, so comparisons
 * here are made on the decoded text as-is rather than on the template source.
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

/**
 * A fill-in rule rather than a paragraph.
 *
 * The execution blocks deliberately repeat rules of underscores, and a
 * duplicate-paragraph check that could not tell those apart from repeated copy
 * would have to be weakened rather than kept honest.
 */
const isFillInRule = (line) => {
  const solid = line.replace(/\s+/g, "");
  if (solid.length === 0) return true;
  return (solid.match(/_/g) ?? []).length / solid.length > 0.6;
};

const results = [];
let renderedComponents = 0;
let inspectedPages = 0;

for (const fixture of FIXTURES) {
  const facts = deriveSouthCarolinaFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "SC",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );
  const expectedComponents = ATTESTATION_TRACKS.includes(fixture.trackId) ? 2 : 1;
  ok(
    resolved.components.length === expectedComponents,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than the ${expectedComponents} the design assigns.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "SC",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    // Rendering the same facts twice must produce the same bytes.
    const again = await renderPacketComponent({
      component,
      jurisdiction: "SC",
      geography: null,
      facts,
      rootDir: root
    });
    ok(
      sha(output.bytes) === sha(again.bytes),
      `${component.componentId}: rendering is not deterministic.`
    );

    // Every page is inspected as lines, not counted.
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
      // A heading is not allowed to be the last thing on a page: its section
      // would begin overleaf and the heading would read as belonging to
      // whatever came before it.
      const last = written[written.length - 1];
      ok(
        pageIndex === pages.length - 1 || !headings.has(last),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} ends on the heading "${last}", stranding it from its section.`
      );
      // Nothing may run off the page. The renderer wraps to the content width,
      // so an over-long line means a value was drawn without wrapping.
      ok(
        written.every((line) => line.length < 220),
        `${fixture.fixtureId}/${component.componentId}: page ${pageIndex + 1} carries a line long enough to have run past the margin.`
      );
    });
    // No paragraph is rendered twice in succession.
    const allLines = pages.flat().filter((line) => line.length > 24 && !isFillInRule(line));
    for (let i = 1; i < allLines.length; i += 1) {
      ok(
        allLines[i] !== allLines[i - 1],
        `${fixture.fixtureId}/${component.componentId}: the line "${allLines[i].slice(0, 60)}..." is rendered twice in succession.`
      );
    }
    // Nothing in the rendered bytes states a fee the design does not establish
    // for this route, and no bare boolean reaches a page.
    const rendered = pages.flat().join("\n");
    for (const match of rendered.matchAll(RENDERED_MONEY)) {
      const amount = match[0].replace(/\s/g, "");
      ok(
        designAmounts.get(fixture.trackId).has(amount),
        `${fixture.fixtureId}/${component.componentId}: the rendered page prints ${amount}, which the design does not establish for this route.`
      );
    }
    ok(
      !/^\s*(yes|no|true|false)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare boolean answer is rendered on a line of its own.`
    );
    inspectedPages += output.pageCount ?? 0;

    // No unresolved placeholder reached the applicant.
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
    jurisdiction: "SC",
    jurisdictionName: "South Carolina",
    packetName: resolved.track.assembledPacketName,
    caseReference: facts.packetCaseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  };
  const assembled = await assemblePacketPdf(assemblyRequest);
  const againAssembled = await assemblePacketPdf(assemblyRequest);
  ok(
    assembled.sha256 === againAssembled.sha256,
    `${fixture.fixtureId}: assembly is not deterministic.`
  );
  ok(assembled.pageCount > 0, `${fixture.fixtureId}: the assembled packet has no pages.`);
  ok(
    assembled.componentRanges[0].role === "primary_filing",
    `${fixture.fixtureId}: the assembled packet does not open with the application.`
  );
  if (expectedComponents === 2) {
    ok(
      assembled.componentRanges[1].role === "notice",
      `${fixture.fixtureId}: the assembled packet does not put the attestation request after the application.`
    );
  }

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
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, none trailing empty, no heading stranded from its section, no line past the margin, no paragraph repeated, no bare boolean and no unresolved placeholder; every printed amount is one the design establishes for its route.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const gsFacts = deriveSouthCarolinaFacts(
  "sc_17_1_40_general_sessions",
  fixtureFor("sc_17_1_40_general_sessions")
);
ok(
  gsFacts.applicantName === fixtureFor("sc_17_1_40_general_sessions").applicantName,
  "The applicant's name was rewritten rather than carried through."
);
ok(
  gsFacts.countyName === "Richland",
  `The county name was not reduced for a line that already prints "County": got "${gsFacts.countyName}".`
);
ok(
  gsFacts.packetCaseReference === "Richland County",
  "The packet case reference is not the county the applicant named."
);

// No yes-or-no answer reaches a rendered sentence as a bare word.
for (const fixture of FIXTURES) {
  const facts = deriveSouthCarolinaFacts(fixture.trackId, fixture.answers);
  for (const [key, value] of Object.entries(facts)) {
    if (value !== "yes" && value !== "no") continue;
    ok(
      key.endsWith("Statement") === false,
      `${fixture.fixtureId}: ${key} carries a bare yes-or-no answer into a rendered sentence.`
    );
  }
  // Every key the track declares is in the bag, or resolvePacket cannot check it.
  const track = SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === fixture.trackId);
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key),
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
}

// The material branches produce different documents.
const branchPairs = [
  ["sc-general-sessions-positive-1", "sc-general-sessions-single-incident-2"],
  ["sc-pretrial-intervention-positive-1", "sc-pretrial-intervention-single-incident-2"],
  ["sc-low-level-conviction-positive-1", "sc-low-level-firearm-limb-2"],
  ["sc-first-drug-conviction-positive-1", "sc-first-drug-prescription-2"]
];
for (const [baseId, variantId] of branchPairs) {
  const canonical = results.find((r) => r.fixtureId === baseId);
  const variant = results.find((r) => r.fixtureId === variantId);
  ok(
    canonical && variant && canonical.sha256 !== variant.sha256,
    `${variantId}: the regression variant assembles to the same bytes as ${baseId}, so it tests nothing.`
  );
}

// The single-incident branch changes what the application says it covers.
const oneCharge = deriveSouthCarolinaFacts(
  "sc_pti_17_22_150",
  fixtureFor("sc_pti_17_22_150")
);
const manyCharges = deriveSouthCarolinaFacts("sc_pti_17_22_150", {
  ...fixtureFor("sc_pti_17_22_150"),
  singleIncidentCharges: TWO_CHARGES
});
ok(
  /no other charge came out of this same incident/.test(oneCharge.singleIncidentStatement) &&
    /more than one charge came out of this same incident/.test(manyCharges.singleIncidentStatement),
  "The single-incident answer does not change what the application states it covers."
);
ok(
  /Nobody at LegalEase has checked whether they did arise from one incident/.test(
    manyCharges.singleIncidentStatement
  ),
  "The application decides, rather than refuses to decide, that charges arose from one incident."
);

// The firearm limb of § 22-5-910(A) changes the recited branch.
const standardLimb = deriveSouthCarolinaFacts("sc_22_5_910", fixtureFor("sc_22_5_910"));
const firearmLimb = deriveSouthCarolinaFacts("sc_22_5_910", {
  ...fixtureFor("sc_22_5_910"),
  firearmPossession: "yes"
});
ok(
  /was not a first offence of unlawful possession of a firearm/.test(standardLimb.branchStatement) &&
    /was a first offence of unlawful possession of a firearm/.test(firearmLimb.branchStatement),
  "The firearm answer does not change the branch the application recites."
);
ok(
  /is for SLED and the Solicitor's Office to determine/.test(firearmLimb.branchStatement),
  "The firearm branch statement decides which limb applies rather than leaving it to SLED and the solicitor."
);

// The conditional-discharge attestation condition follows the court level.
const summaryCourtCd = deriveSouthCarolinaFacts("sc_conditional_discharge_44_53_450", {
  ...fixtureFor("sc_conditional_discharge_44_53_450"),
  courtLevel: "magistrate"
});
const generalSessionsCd = deriveSouthCarolinaFacts(
  "sc_conditional_discharge_44_53_450",
  fixtureFor("sc_conditional_discharge_44_53_450")
);
ok(
  /which is a summary court, so .* requires the summary court judge to attest/.test(
    summaryCourtCd.attestationConditionStatement
  ),
  "The conditional-discharge route does not state the attestation requirement where the matter was in summary court."
);
ok(
  /is for the Solicitor's Office to say/.test(generalSessionsCd.attestationConditionStatement),
  "The conditional-discharge route decides, rather than asks, whether a General Sessions matter needs an attestation."
);

note(
  "6. Values: participant answers are carried through verbatim, the county is reduced only for the line that already prints the word, no yes-or-no answer reaches a sentence as a bare word, every declared required input reaches the fact bag, and all four regression variants assemble to different bytes from their canonical fixture."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const track of SOUTH_CAROLINA_CUSTOM_PLEADING_TRACKS) {
  ok(track.statuses.runtime === "runtime_disabled", `${track.trackId}: is not runtime-disabled.`);
  ok(track.statuses.legal === "not_submitted", `${track.trackId}: claims a legal review status.`);
  ok(track.statuses.visual === "not_reviewed", `${track.trackId}: claims a visual review status.`);
  ok(track.jurisdiction === "SC", `${track.trackId}: is not a South Carolina track.`);
  ok(track.outputStrategy === "custom_pleading", `${track.trackId}: is not custom_pleading.`);
  ok(
    track.requiredInputs.length > 0,
    `${track.trackId}: declares no participant inputs, so nothing can be checked as answered.`
  );
  ok(
    track.geographyKeys.length === 0 && track.geographicScope === "statewide",
    `${track.trackId}: claims a geography the design does not give it.`
  );
}
note("7. Runtime: every track is runtime-disabled, legally unsubmitted, visually unreviewed and statewide.");

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error("South Carolina custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("South Carolina custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(42)} ${result.trackId.padEnd(36)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(3)} pages  sha256=${result.sha256}`
  );
}
