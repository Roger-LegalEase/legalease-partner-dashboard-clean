// North Dakota Chapter 12-60.1, § 39-08-01.6 and § 19-03.1-23(9) sealing routes
// — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right: North
// Dakota is not enabled and its shared surfaces are untouched, the assignment is
// exactly the five assigned tracks and their thirteen assigned custom-pleading
// components, every component has a governing legal-design specification, and
// the design's boundaries hold on the face of every document.
//
// The boundaries are what most of section 2 checks. No document states a fee
// amount, because the design establishes none for any of the three routes. No
// document asserts eligibility, computes a look-back or says a period has run.
// No proposed order writes a finding in the court's voice, because § 12-60.1-04(1)
// requires six findings and the adopted design supplies the text of three. No
// proof of service reports that service happened. Every judicial signature block
// is blank, carries no participant signature rule, and says to stay blank.
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
  NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS,
  NORTH_DAKOTA_PLEADING_TEMPLATES,
  ND_DESIGN_ROLE_TO_ENGINE_ROLE,
  ND_ASSIGNED_TRACK_IDS,
  ND_CHAPTER_12_60_1_TRACK_IDS,
  ND_PROPOSED_ORDER_CONDITION_KEY,
  ND_YES_NO,
  ND_COURT_TYPES,
  ND_PROSECUTOR_OFFICES,
  ND_RESTITUTION_STATUS,
  ND_PARDON_KINDS,
  ND_DUI_CONVICTION_TYPES,
  ND_DUI_CHARGED_UNDER,
  ND_MARIJUANA_SUBSTANCES,
  ND_OUTSIDE_PARTY_KEYS,
  ND_REFERRAL,
  ND_CLERK_REFERRAL,
  ND_RECORD_REFERRAL,
  ND_DUI_ROUTE_REFERRAL,
  deriveNorthDakotaFacts,
  NorthDakotaBranchError,
  NorthDakotaEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/north-dakota/custom-pleading");

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
  "nd-dui-record-seal",
  "nd-marijuana-first-offense-seal",
  "nd-seal-felony-conviction",
  "nd-seal-misdemeanor-conviction",
  "nd-seal-pardoned-conviction"
];

const CHAPTER_TRACKS = [
  "nd-seal-felony-conviction",
  "nd-seal-misdemeanor-conviction",
  "nd-seal-pardoned-conviction"
];

// ---------------------------------------------------------------------------
// 0. North Dakota is not enabled, and the shared surfaces are untouched
// ---------------------------------------------------------------------------

const assignedIds = new Set(NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS.map((t) => t.trackId));
ok(
  RELIEF_TRACKS.filter((t) => assignedIds.has(t.trackId)).length === 0,
  "An assigned North Dakota track is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("nd-")).length === 0,
  "North Dakota templates are wired into the shared pleading-template pack. Wiring is the integration captain's step."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);

// Injected for verification only. The committed shared files stay untouched;
// this is what lets the real renderer, resolver and assembler be exercised.
for (const track of NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, NORTH_DAKOTA_PLEADING_TEMPLATES);

note(
  "0. Enablement: all five assigned tracks and all thirteen templates are absent from the shared registry and template pack; injection is verification-time only."
);

// ---------------------------------------------------------------------------
// 1. The assignment is exactly the five tracks and their thirteen components
// ---------------------------------------------------------------------------

const manifests = readJson("data/record-clearing/legal-design-packet-set-manifests.json").packetSets;
const specs = readJson("data/record-clearing/legal-design-specifications.json").customPleadingSpecs;
const registry = readJson("data/record-clearing/legal-design-track-registry.json").tracks;

ok(
  JSON.stringify([...assignedIds].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The implemented track set is not exactly the assigned track set."
);
ok(
  JSON.stringify([...ND_ASSIGNED_TRACK_IDS].sort()) === JSON.stringify([...ASSIGNED].sort()),
  "The module's closed track list is not exactly the assigned track set."
);
ok(
  JSON.stringify([...ND_CHAPTER_12_60_1_TRACK_IDS].sort()) === JSON.stringify([...CHAPTER_TRACKS].sort()),
  "The module's Chapter 12-60.1 list is not the three tracks that chapter reaches."
);
// The composed deferred-imposition route and the official-PDF routes belong to
// other lanes and must not arrive here by any path.
for (const foreign of [
  "nd-deferred-imposition-records",
  "nd-nonconviction-close-petition",
  "nd-prohibit-remote-public-access",
  "nd-summary-marijuana-pardon",
  "nd-regular-pardon"
]) {
  ok(!assignedIds.has(foreign), `${foreign} is implemented here and belongs to another lane.`);
}

let componentCount = 0;
let conditionalCount = 0;
for (const track of NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS) {
  const manifest = manifests.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no packet-set manifest in the adopted legal design.`);
  if (!manifest) continue;

  // Every custom_pleading component in the design must be implemented, and
  // nothing else may be. North Dakota's process_guidance components — the filing
  // instructions and the legal-effect explanation — belong to the guidance lane.
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
    ok(
      other.outputStrategy !== "official_pdf_fill",
      `${track.trackId}: the design assigns an official_pdf_fill component to this route, which would make the packet depend on a binary this job cannot produce.`
    );
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
    if (component.requirement === "conditional") {
      conditionalCount += 1;
      ok(
        component.conditionKey === ND_PROPOSED_ORDER_CONDITION_KEY,
        `${component.componentId}: a conditional component carries no condition key, so it could never render.`
      );
    }

    const spec = specs.find((s) => s.componentId === component.componentId);
    ok(Boolean(spec), `${component.componentId}: no governing custom-pleading specification.`);
    if (spec) {
      ok(
        ND_DESIGN_ROLE_TO_ENGINE_ROLE[spec.role] === component.role,
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
      `${component.componentId}: a custom pleading claims an official source. North Dakota publishes no sealing form.`
    );
    ok(
      component.approval.legal === "not_submitted" && component.approval.visual === "not_reviewed",
      `${component.componentId}: claims an approval this job cannot give.`
    );
  }

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
      designTrack.destination?.kind === "clerk",
      `${track.trackId}: the design does not send this route to a clerk of court.`
    );
  }
  ok(track.runtimeDisabled === true, `${track.trackId}: is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId}: is not a technical fixture.`);
}
ok(componentCount === 13, `Implemented ${componentCount} components rather than the thirteen assigned.`);
ok(
  conditionalCount === 2,
  `Implemented ${conditionalCount} conditional components rather than the two proposed orders the design marks conditional.`
);
note(
  `1. Assignment: exactly ${ASSIGNED.length} assigned tracks and ${componentCount} assigned custom-pleading components — five filings, five proposed orders of which ${conditionalCount} are conditional, and three proofs of service — each pinned to the design's component id, order, requirement, role and declared inputs; no process_guidance component was implemented, no route carries an official_pdf_fill component, and the composed and official-PDF North Dakota routes are absent.`
);

// ---------------------------------------------------------------------------
// 2. The design's boundaries, on the face of every template
// ---------------------------------------------------------------------------

const sourceOf = (component) => JSON.stringify(pleadingTemplate(component.templateId));
const filingOf = (track) => track.packetSet.components.find((c) => c.role === "primary_filing");
const orderOf = (track) => track.packetSet.components.find((c) => c.role === "proposed_order");
const proofOf = (track) =>
  track.packetSet.components.find((c) => c.role === "certificate_of_service");

/**
 * Content no document in this module may carry.
 *
 * Each pattern matches an assertion rather than a mention, because the honest
 * copy here names findings, service and expungement in order to say who they
 * belong to or that they are not on offer. A blunter check would fire on the
 * disclaimers it exists to protect.
 */
const PROHIBITED = [
  [/\$\s?\d/, "a monetary amount, which the design establishes for none of these three routes"],
  [/\b(is|are|were|will be|would be) eligible\b/i, "an eligibility assertion, which § 12-60.1-04(1) reserves to the court"],
  [/\bwill be (granted|sealed|expunged|cleared)\b/i, "a promise about the result"],
  [/\byour record will be clear\b|\bguaranteed\b/i, "a promise about the result"],
  [/\bthe (court|judge) (finds|has found|found|orders that the petitioner has)\b/i, "a judicial finding written as though already made"],
  [/\bthe court has (granted|signed|ordered)\b/i, "a claim that the court has acted"],
  [/\bservice (was|has been) (made|completed|effected)\b/i, "a claim that service has already happened"],
  [/\bwe (have )?(served|filed|reviewed|verified|confirmed|checked)\b/i, "a claim that LegalEase served, filed, reviewed or verified"],
  [/\bon your behalf we (filed|served|sent|submitted)\b/i, "a claim that LegalEase filed or served"],
  [/\bthe prosecut(or|ing attorney) (has consented|consents|agrees|will not object|does not object)\b/i, "an assertion about the prosecuting attorney's position"],
  [/\bhearing (is|has been) set (for|on)\b/i, "a hearing date, which § 12-60.1-04(3) leaves to the court"],
  [/\bthe (three|five|seven|two|ten) years have (run|passed|elapsed)\b/i, "a computed period, which no packet here may state has run"],
  [/\ban official (state|statewide|North Dakota) (form|petition) (exists|is available)/i, "a claim that an official North Dakota sealing form exists"],
  [/Notary Public|Sworn to before me|\/s\//i, "a notarial block or a populated execution"]
];

let templatesChecked = 0;
for (const track of NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS) {
  for (const component of track.packetSet.components) {
    const template = pleadingTemplate(component.templateId);
    const source = sourceOf(component);
    templatesChecked += 1;

    for (const [pattern, description] of PROHIBITED) {
      ok(!pattern.test(source), `${component.componentId}: contains ${description}.`);
    }
    ok(
      template.technicalFixture === true,
      `${component.templateId}: is not marked a technical fixture.`
    );
    ok(
      template.fixtureBanner && /DRAFT PENDING LEGAL REVIEW/.test(template.fixtureBanner),
      `${component.templateId}: carries no draft banner.`
    );
    ok(
      !/\{\{/.test(source.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "")),
      `${component.templateId}: malformed placeholder.`
    );

    if (component.role === "proposed_order") {
      // The court signs an order. The petitioner must not be invited to.
      ok(
        template.signatureLabel === null,
        `${component.componentId}: a proposed order carries a participant signature rule.`
      );
      ok(
        template.verification === undefined,
        `${component.componentId}: a proposed order carries a declaration, which is the petitioner's instrument and not the court's.`
      );
      ok(
        template.signatureBlock.some((line) => /^Judge of \{\{courtPhrase\}\}$/.test(line)),
        `${component.componentId}: the judicial signature block does not name the court from the petitioner's own answer.`
      );
      ok(
        template.signatureBlock.some((line) => /Leave every line of it blank/.test(line)),
        `${component.componentId}: the judicial signature block is not marked to stay blank.`
      );
      ok(
        template.signatureBlock.every((line) => !/^\s*(Signed|\/s\/|Dated this)/i.test(line)),
        `${component.componentId}: the judicial signature block is populated.`
      );
      ok(
        /PROPOSED — NOT YET MADE/.test(source),
        `${component.componentId}: the proposed order does not mark itself as proposed and not yet made.`
      );
      ok(
        /is not an order of the court, it has no effect/.test(source),
        `${component.componentId}: the proposed order does not disclaim its own effect.`
      );
      ok(
        /No finding is written into this draft, and that is deliberate/.test(source),
        `${component.componentId}: the proposed order does not refuse, in terms, to write the court's findings.`
      );
    } else {
      ok(
        typeof template.signatureLabel === "string" && template.signatureLabel.length > 0,
        `${component.componentId}: a document the petitioner signs carries no signature rule.`
      );
      // Chapter 12-60.1 contains no verification clause, so no petition or
      // motion may carry a sworn form of signature. The proof of service is the
      // one exception: it is a declaration about service the petitioner
      // personally made, signed afterwards.
      if (component.role === "certificate_of_service") {
        ok(
          typeof template.verification === "string" && template.verification.length > 40,
          `${component.componentId}: the proof of service carries no declaration.`
        );
      } else {
        ok(
          template.verification === undefined,
          `${component.componentId}: carries a verification, and the chapter contains no verification clause.`
        );
      }
      ok(
        template.signatureBlock.some((line) => /notarial block is printed/.test(line)),
        `${component.componentId}: does not tell the petitioner what to do about notarization.`
      );
      ok(
        !template.signatureBlock.some((line) => /^\s*(Judge|Clerk|State's Attorney|City Attorney)/i.test(line)),
        `${component.componentId}: carries a signature line for an outside party.`
      );
    }
  }
}
note(
  `2. Prohibited content: ${templatesChecked} templates print no monetary amount, assert no eligibility, promise no result, write no judicial finding as made, report no completed service, claim nothing about the prosecuting attorney's position, set no hearing date, state no period as run and carry no notarial block; every proposed order is marked proposed, refuses to write the court's findings, carries no petitioner signature rule and names the court from the petitioner's own answer.`
);

// The three Chapter 12-60.1 packets say what the chapter requires them to say.
for (const trackId of CHAPTER_TRACKS) {
  const track = NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === trackId);
  const petition = sourceOf(filingOf(track));
  const order = sourceOf(orderOf(track));
  const proof = sourceOf(proofOf(track));

  // No official form, which is the reason this is a drafted document at all.
  ok(
    /no forms for sealing criminal records are available/.test(petition),
    `${trackId}: the petition does not record that North Dakota publishes no sealing form.`
  );
  ok(
    /It is not an official form, it is not approved by any court/.test(petition),
    `${trackId}: the petition does not disclaim being an official form.`
  );

  // The statutory contents of § 12-60.1-03(2).
  for (const [cite, what] of [
    ["12-60.1-03\\(1\\)", "that the petition is filed in the criminal case itself"],
    ["12-60.1-03\\(2\\)\\(a\\)", "the other-names requirement"],
    ["12-60.1-03\\(2\\)\\(b\\)", "the address-history requirement"],
    ["12-60.1-03\\(2\\)\\(c\\)", "the reasons requirement"],
    ["12-60.1-03\\(2\\)\\(d\\)", "the full-criminal-history requirement"],
    ["12-60.1-03\\(3\\)", "the mandatory proposed order"],
    ["12-60.1-03\\(4\\)", "service on the prosecuting attorney"],
    ["12-60.1-04\\(1\\)", "that the findings are the court's"],
    ["12-60.1-04\\(3\\)", "the forty-five days before a hearing"],
    ["12-60.1-04\\(4\\)", "the prosecutor's canvass"],
    ["12-60.1-04\\(5\\)", "the clear-and-convincing burden"],
    ["12-60.1-04\\(8\\)", "the recital the order must carry"]
  ]) {
    ok(
      new RegExp(cite).test(petition),
      `${trackId}: the petition does not recite § ${cite.replace(/\\/g, "")} — ${what}.`
    );
  }

  // Sealing is not expungement and does not reach BCI.
  ok(
    /It is not an expungement and the record is not destroyed/.test(petition),
    `${trackId}: the petition does not say that sealing is not expungement.`
  );
  ok(
    /does not reach criminal history record information held by the Bureau of Criminal Investigation/.test(petition),
    `${trackId}: the petition does not disclose that sealing leaves the BCI record.`
  );
  ok(
    /12\.1-33-02\.1/.test(petition) && /statutory obligation to conduct a criminal history background check/.test(petition),
    `${trackId}: the petition does not carry the § 12-60.1-04(8) disclosure.`
  );
  ok(
    /Nobody should be told that a sealing order makes a record disappear everywhere/.test(petition),
    `${trackId}: the petition does not refuse, in terms, the claim that the record disappears.`
  );

  // The reasons stay the petitioner's.
  ok(
    /LegalEase has not investigated it, does not corroborate it and asserts neither good cause nor reformation/.test(petition),
    `${trackId}: the petition does not disclaim the reformation showing.`
  );

  // The fee is not stated, and the packet says why.
  ok(
    /No monetary amount appears anywhere in this packet/.test(petition),
    `${trackId}: the petition does not say that no fee amount is stated.`
  );
  ok(
    /contact the clerk of court to confirm the amount, if any/.test(petition),
    `${trackId}: the petition does not send the petitioner to the clerk for the fee.`
  );

  // The look-back is not computed.
  ok(
    /does not compute the period or state that it is satisfied/.test(petition) ||
      /carries no look-back period of its own/.test(petition),
    `${trackId}: the petition does not refuse to compute the look-back.`
  );

  // The stops are printed, not only enforced.
  ok(/WHERE THIS PACKET STOPS/.test(petition), `${trackId}: the petition carries no printed stop section.`);
  ok(petition.includes(ND_REFERRAL), `${trackId}: the petition's stop section carries no referral.`);

  // The proposed order names § 12-60.1-04(1) and leaves the findings blank.
  ok(
    /12-60\.1-04\(1\) sets out the findings this court must make/.test(order),
    `${trackId}: the proposed order does not name the subsection the findings come from.`
  );
  ok(
    /A finding written in advance by the person asking for the order is not a finding/.test(order),
    `${trackId}: the proposed order does not say why it writes no findings.`
  );
  ok(
    /IT IS ORDERED/.test(order) && /IT IS FURTHER ORDERED/.test(order),
    `${trackId}: the proposed order carries no ordered paragraphs.`
  );

  // The proof of service reports nothing.
  ok(
    /Nothing in this document reports that service has happened/.test(proof),
    `${trackId}: the proof of service does not disclaim reporting service.`
  );
  ok(
    /Every line below is blank because none of it has happened yet/.test(proof),
    `${trackId}: the proof of service does not say that its lines are blank.`
  );
  ok(
    /Date of service: _+/.test(proof),
    `${trackId}: the proof of service does not leave the date of service blank.`
  );
  ok(
    !/Date of service: [A-Za-z0-9]/.test(proof),
    `${trackId}: the proof of service populates a date of service.`
  );
  ok(
    /It is not evidence of any position taken by the prosecuting attorney/.test(proof),
    `${trackId}: the proof of service does not disclaim the prosecuting attorney's agreement.`
  );
}
note(
  `2b. Chapter 12-60.1: on all ${CHAPTER_TRACKS.length} routes the petition records that no official form exists, recites all twelve controlling subsections, discloses that sealing is not expungement and does not reach the BCI record, carries the § 12-60.1-04(8) disclosure, disclaims the reformation showing, refuses to state a fee or compute the look-back, and prints its stops; the proposed order names § 12-60.1-04(1) and writes no finding; the proof of service reports nothing and leaves every service fact blank.`
);

// Route-specific boundaries.
const felonyPetition = sourceOf(
  filingOf(NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === "nd-seal-felony-conviction"))
);
ok(
  /treats every felony petition under this chapter as an attorney handoff/.test(felonyPetition),
  "nd-seal-felony-conviction: the petition does not carry the controlling review's attorney handoff."
);
ok(
  /62\.1-02-01\(1\)\(a\)/.test(felonyPetition) && /chapters 12\.1-16 through 12\.1-25/.test(felonyPetition),
  "nd-seal-felony-conviction: the petition does not state the § 12-60.1-02(2) violence-or-intimidation bar and its offence set."
);
ok(
  /62\.1-02-01\(2\)/.test(felonyPetition),
  "nd-seal-felony-conviction: the petition does not warn that a deferred imposition counts as a conviction for the firearm-disability computation."
);

const pardonPetition = sourceOf(
  filingOf(NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === "nd-seal-pardoned-conviction"))
);
ok(
  /12-55\.1-01\(2\)/.test(pardonPetition),
  "nd-seal-pardoned-conviction: the petition does not define a conditional pardon by its section."
);
ok(
  /A pardon does not by itself remove the fact of the conviction/.test(pardonPetition),
  "nd-seal-pardoned-conviction: the petition does not explain why sealing is a separate step after a pardon."
);

const duiTrack = NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === "nd-dui-record-seal");
const duiPetition = sourceOf(filingOf(duiTrack));
ok(
  /Expungement of an impaired-driving record is not available in North Dakota/.test(duiPetition),
  "nd-dui-record-seal: the petition does not say that expungement is unavailable, which the design calls the point the participant must be told plainly."
);
ok(
  /12\.1-32-07\.2\(2\)/.test(duiPetition),
  "nd-dui-record-seal: the petition does not identify the restricted-access regime the seal actually is."
);
ok(
  /39-08-01\(3\) preserves a prosecutor's access to a prior offence for enhancement/.test(duiPetition),
  "nd-dui-record-seal: the petition does not disclose the retained enhancement access."
);
ok(
  /states no motion or petition trigger/.test(duiPetition) &&
    /this petition is not represented as statutorily required/.test(duiPetition),
  "nd-dui-record-seal: the petition does not preserve the § 39-08-01.6(1) motion-trigger question."
);
ok(
  /run from the first violation/.test(duiPetition) &&
    /clean period covers any other criminal offence/.test(duiPetition),
  "nd-dui-record-seal: the petition does not state the seven-year anchor and the breadth of the clean period."
);

const mjTrack = NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS.find(
  (t) => t.trackId === "nd-marijuana-first-offense-seal"
);
const mjMotion = sourceOf(filingOf(mjTrack));
ok(
  /may not be opened even by order of the court/.test(mjMotion),
  "nd-marijuana-first-offense-seal: the motion does not disclose that the seal is irreversible."
);
ok(
  /keep your own copies/.test(mjMotion),
  "nd-marijuana-first-offense-seal: the motion does not tell the movant to keep copies before an irreversible seal."
);
ok(
  /open between two years from the judgment and two years from the further violation/.test(mjMotion),
  "nd-marijuana-first-offense-seal: the motion does not preserve the two-year anchor ambiguity."
);
ok(
  /general expungement research guide (calls|describes)/.test(mjMotion),
  "nd-marijuana-first-offense-seal: the motion does not record the conflict between the two official publications."
);
ok(
  /executive marijuana pardon/.test(mjMotion),
  "nd-marijuana-first-offense-seal: the motion does not distinguish itself from the executive marijuana pardon."
);

// Chapter 12-60.1's procedure governs neither of the other two routes, so
// neither may recite a § 12-60.1-04 subsection as though it applied to them.
for (const track of [duiTrack, mjTrack]) {
  for (const component of track.packetSet.components) {
    ok(
      !/12-60\.1-04\(/.test(sourceOf(component)),
      `${component.componentId}: cites a § 12-60.1-04 subsection, and Chapter 12-60.1's procedure does not govern this route.`
    );
  }
}
const duiWhoDecides = sourceOf(filingOf(duiTrack));
ok(
  /Chapter 12-60\.1's procedure does not govern this route/.test(duiWhoDecides),
  "nd-dui-record-seal: the petition does not say that Chapter 12-60.1's procedure does not govern it."
);
ok(
  /Chapter 12-60\.1's procedure does not govern this route/.test(sourceOf(filingOf(mjTrack))),
  "nd-marijuana-first-offense-seal: the motion does not say that Chapter 12-60.1's procedure does not govern it."
);

// A document must not name its own signer two different things. The
// § 19-03.1-23(9) filing is a motion and its signer is the movant throughout;
// every other document in the module is a petition signed by the petitioner.
for (const component of mjTrack.packetSet.components) {
  const source = sourceOf(component);
  ok(
    !/\bpetitioner\b/i.test(source),
    `${component.componentId}: calls its signer the petitioner on a route whose filing is a motion signed by the movant.`
  );
  ok(/\bmovant\b/i.test(source), `${component.componentId}: never names the movant.`);
}
for (const track of NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS.filter((t) => t.trackId !== mjTrack.trackId)) {
  for (const component of track.packetSet.components) {
    const source = sourceOf(component);
    ok(
      !/\bmovant\b/i.test(source),
      `${component.componentId}: calls its signer the movant on a route whose filing is a petition signed by the petitioner.`
    );
    ok(/\bpetitioner\b/i.test(source), `${component.componentId}: never names the petitioner.`);
  }
}

// The two conditional proposed orders say why they are lodged at all.
for (const track of [duiTrack, mjTrack]) {
  const order = sourceOf(orderOf(track));
  ok(
    /not because the (section|subsection) requires one/.test(order),
    `${track.trackId}: the conditional proposed order does not say that the statute does not require it.`
  );
  ok(
    /ask the clerk whether that court wants one at all/.test(order),
    `${track.trackId}: the conditional proposed order does not send the participant to the clerk.`
  );
}
note(
  "2c. Route-specific boundaries: the felony petition carries the review's attorney handoff, the § 12-60.1-02(2) bar with its offence set and the deferred-imposition trap; the pardon petition defines a conditional pardon and explains why sealing follows a pardon; the impaired-driving petition states that expungement is unavailable, identifies the restricted-access regime, discloses the retained enhancement access and preserves the motion-trigger question; the marijuana motion discloses irreversibility, preserves the two-year ambiguity, records the conflict between two official publications and separates itself from the executive pardon; both conditional orders say the statute does not require them."
);

// ---------------------------------------------------------------------------
// 3. Deterministic fixtures — one canonical positive per assigned track, plus
//    regression variants where a branch changes the document
// ---------------------------------------------------------------------------

/** Synthetic answers only. No real person's record is used anywhere here. */
const chapterBase = (overrides = {}) => ({
  sealFullLegalName: "Talia Renae Ostgaard",
  sealAllOtherNames: "Talia Renae Bergstrom, before marriage",
  sealAddressHistory:
    "412 Third Avenue North, Fargo, North Dakota from March 2014 to August 2019; 88 Elm Street, Bismarck, North Dakota from August 2019 to now",
  sealReasons:
    "I was twenty-two when this happened and I have not been in trouble since. I finished probation, I paid what I owed, and I have worked at the same employer for six years. The conviction comes up every time I apply for the licensed health-care work I trained for, and it is the only thing standing between me and that job.",
  sealCourtType: "district",
  sealCounty: "Cass County",
  sealCaseNumber: "09-2016-CR-01187",
  sealOffence: "Described on the judgment as theft of property, a class A misdemeanor",
  sealCriminalHistoryND: "No other North Dakota charges or convictions",
  sealPriorReliefRequests: "No",
  sealNewConvictions: "No",
  sealSupervisionComplete: "yes",
  sealRestitutionPaid: "paid",
  sealRegistrationOrdered: "no",
  sealProsecutorOffice: "state's attorney",
  ...overrides
});

const felonyBase = (overrides = {}) =>
  chapterBase({
    sealOffence: "Described on the judgment as false statement to a public servant, a class C felony",
    sealCaseNumber: "09-2015-CR-00942",
    sealOffenceChapter: "12.1-11",
    ...overrides
  });

const pardonBase = (overrides = {}) =>
  chapterBase({
    sealOffence: "Described on the judgment as forgery, a class C felony",
    sealCaseNumber: "09-2009-CR-00318",
    sealPardonDate: "17 November 2023",
    sealPardonUnconditional: "unconditional",
    sealPardonCoversConviction: "yes",
    ...overrides
  });

const duiBase = (overrides = {}) => ({
  duiFirstViolationDate: "8 June 2016",
  duiCaseNumber: "09-2016-CR-02244",
  duiCourtType: "district",
  duiCounty: "Cass County",
  duiConvictionType: "guilty plea",
  duiChargedUnder: "statute",
  duiSubsequentDui: "no",
  duiOtherOffence: "no",
  duiCommercialLicence: "no",
  ...overrides
});

const mjBase = (overrides = {}) => ({
  mjJudgmentDate: "3 October 2017",
  mjOffenceDate: "22 July 2017",
  mjSubstance: "marijuana",
  mjQuantity: "one ounce",
  mjFirstOffence: "yes",
  mjSubsequentConviction: "No",
  mjOtherCharges: "No",
  mjCaseNumber: "09-2017-CR-03310",
  mjCounty: "Cass County",
  mjCourtType: "district",
  ...overrides
});

const FIXTURES = [
  {
    fixtureId: "nd-misdemeanor-seal-positive-1",
    trackId: "nd-seal-misdemeanor-conviction",
    answers: chapterBase()
  },
  {
    fixtureId: "nd-misdemeanor-seal-municipal-court-2",
    trackId: "nd-seal-misdemeanor-conviction",
    variantOf: "nd-misdemeanor-seal-positive-1",
    variantPurpose:
      "A municipal case changes the caption, the respondent § 12-60.1-03(4) names and the judge's title on the proposed order. The caption names the city, not a county: a North Dakota municipal court is established by a city under N.D.C.C. § 40-18.1-01(1) and hears the ordinances of a city served by it under § 40-18.1-02(1), so the locality answer is the city.",
    answers: chapterBase({
      sealCourtType: "municipal",
      sealProsecutorOffice: "city attorney",
      sealCounty: "Fargo",
      sealCaseNumber: "M-2016-00471"
    })
  },
  {
    fixtureId: "nd-felony-seal-positive-1",
    trackId: "nd-seal-felony-conviction",
    answers: felonyBase()
  },
  {
    fixtureId: "nd-felony-seal-no-restitution-ordered-2",
    trackId: "nd-seal-felony-conviction",
    variantOf: "nd-felony-seal-positive-1",
    variantPurpose:
      "Restitution never ordered and restitution paid are different § 12-60.1-04(1)(d) recitals, and only one of them is true of a given record.",
    answers: felonyBase({ sealRestitutionPaid: "none ordered" })
  },
  {
    fixtureId: "nd-pardoned-seal-positive-1",
    trackId: "nd-seal-pardoned-conviction",
    answers: pardonBase()
  },
  {
    fixtureId: "nd-dui-seal-positive-1",
    trackId: "nd-dui-record-seal",
    answers: duiBase()
  },
  {
    fixtureId: "nd-dui-seal-municipal-ordinance-2",
    trackId: "nd-dui-record-seal",
    variantOf: "nd-dui-seal-positive-1",
    variantPurpose:
      "An ordinance charge changes what § 39-08-01.6(1) requires the petition to show: the ordinance is named and its equivalence to § 39-08-01 has to be demonstrated from its text.",
    answers: duiBase({
      duiCourtType: "municipal",
      duiCounty: "Fargo",
      duiChargedUnder: "ordinance",
      duiOrdinanceCitation: "Fargo Municipal Code § 8-0301, driving under the influence",
      duiCaseNumber: "M-2016-01902"
    })
  },
  {
    fixtureId: "nd-marijuana-seal-positive-1",
    trackId: "nd-marijuana-first-offense-seal",
    answers: mjBase()
  },
  {
    fixtureId: "nd-marijuana-seal-thc-grams-2",
    trackId: "nd-marijuana-first-offense-seal",
    variantOf: "nd-marijuana-seal-positive-1",
    variantPurpose:
      "Tetrahydrocannabinol carries its own threshold in its own unit — two grams rather than one ounce — and the motion recites the substance and the quantity as charged.",
    answers: mjBase({ mjSubstance: "thc", mjQuantity: "1.5 grams" })
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
  ok(
    typeof fixture.variantPurpose === "string" && fixture.variantPurpose.length > 40,
    `${fixture.fixtureId}: records no purpose, so it cannot be justified as a material branch.`
  );
}
note(
  `3. Fixtures: ${FIXTURES.filter((f) => !f.variantOf).length} canonical fixtures, exactly one per assigned track, and ${FIXTURES.filter((f) => f.variantOf).length} regression variants, each naming the canonical fixture on its own track and each recording the material branch it tests. Every answer is synthetic.`
);

// ---------------------------------------------------------------------------
// 4. Typed stops and closed lists
// ---------------------------------------------------------------------------

const NEGATIVE = [
  // Missing participant facts, on every route.
  ...ASSIGNED.map((trackId) => {
    const answers = { ...fixtureFor(trackId) };
    const firstKey = Object.keys(answers)[0];
    return ["a required case fact is missing", trackId, { ...answers, [firstKey]: "" }, "nd-answer-missing"];
  }),
  // A request to populate outside-party content, on every route.
  ...ASSIGNED.map((trackId) => [
    "a judicial finding is supplied",
    trackId,
    { ...fixtureFor(trackId), judicialFinding: "The court finds the petitioner has been reformed" },
    "nd-outside-party-content-refused"
  ]),
  [
    "the prosecutor's position is supplied",
    "nd-seal-misdemeanor-conviction",
    { ...fixtureFor("nd-seal-misdemeanor-conviction"), prosecutorConsent: "The State does not object" },
    "nd-outside-party-content-refused"
  ],
  [
    "a hearing date is supplied",
    "nd-seal-felony-conviction",
    { ...fixtureFor("nd-seal-felony-conviction"), hearingDate: "4 March 2027" },
    "nd-outside-party-content-refused"
  ],
  [
    "a completed service is supplied",
    "nd-seal-pardoned-conviction",
    { ...fixtureFor("nd-seal-pardoned-conviction"), serviceCompleted: "Served by mail on 2 February 2027" },
    "nd-outside-party-content-refused"
  ],
  // Track-specific statutory exclusions on the three Chapter 12-60.1 routes.
  ...CHAPTER_TRACKS.flatMap((trackId) => [
    [
      "registration was ordered under § 12.1-32-15",
      trackId,
      { ...fixtureFor(trackId), sealRegistrationOrdered: "yes" },
      "nd-registration-offence-excluded"
    ],
    [
      "the offence is an impaired-driving offence",
      trackId,
      {
        ...fixtureFor(trackId),
        sealOffence: "Described on the judgment as driving under the influence, a class B misdemeanor"
      },
      "nd-impaired-driving-routes-to-39-08-01-6"
    ],
    [
      "imprisonment or probation is not complete",
      trackId,
      { ...fixtureFor(trackId), sealSupervisionComplete: "no" },
      "nd-supervision-not-complete"
    ],
    [
      "restitution is outstanding",
      trackId,
      { ...fixtureFor(trackId), sealRestitutionPaid: "not paid" },
      "nd-restitution-outstanding"
    ],
    [
      "a new conviction falls in the look-back",
      trackId,
      { ...fixtureFor(trackId), sealNewConvictions: "Yes, a disorderly conduct conviction in 2024" },
      "nd-new-conviction-in-look-back"
    ],
    [
      "a charge is still pending",
      trackId,
      {
        ...fixtureFor(trackId),
        sealCriminalHistoryND: "A simple assault charge from 2026 is still pending in Burleigh County"
      },
      "nd-pending-charge"
    ],
    [
      "the prosecuting office does not match the court",
      trackId,
      { ...fixtureFor(trackId), sealProsecutorOffice: "city attorney" },
      "nd-prosecutor-office-does-not-match-court"
    ],
    // A municipal court belongs to a city, so a county answer leaves the court
    // unidentifiable and the caption cannot be written.
    [
      "a municipal case gives its locality as a county",
      trackId,
      {
        ...fixtureFor(trackId),
        sealCourtType: "municipal",
        sealProsecutorOffice: "city attorney",
        sealCounty: "Cass County"
      },
      "nd-municipal-court-named-by-county"
    ]
  ]),
  // The felony bar, computed from the chapter alone.
  [
    "the offence is in the violence-and-intimidation chapter range",
    "nd-seal-felony-conviction",
    { ...fixtureFor("nd-seal-felony-conviction"), sealOffenceChapter: "12.1-17" },
    "nd-violence-or-intimidation-felony"
  ],
  [
    "the Century Code chapter cannot be read",
    "nd-seal-felony-conviction",
    { ...fixtureFor("nd-seal-felony-conviction"), sealOffenceChapter: "I am not sure" },
    "nd-offence-chapter-not-established"
  ],
  // The pardon ground.
  [
    "the pardon is conditional",
    "nd-seal-pardoned-conviction",
    { ...fixtureFor("nd-seal-pardoned-conviction"), sealPardonUnconditional: "conditional" },
    "nd-conditional-pardon"
  ],
  [
    "the pardon covers a different conviction",
    "nd-seal-pardoned-conviction",
    { ...fixtureFor("nd-seal-pardoned-conviction"), sealPardonCoversConviction: "no" },
    "nd-pardon-does-not-cover-conviction"
  ],
  [
    "the pardon date is not established",
    "nd-seal-pardoned-conviction",
    { ...fixtureFor("nd-seal-pardoned-conviction"), sealPardonDate: "some time a few years ago" },
    "nd-pardon-date-not-established"
  ],
  // The same municipal-caption failure on the two routes that do not run
  // through the Chapter 12-60.1 screen.
  [
    "a municipal impaired-driving case gives its locality as a county",
    "nd-dui-record-seal",
    { ...fixtureFor("nd-dui-record-seal"), duiCourtType: "municipal", duiCounty: "Cass County" },
    "nd-municipal-court-named-by-county"
  ],
  [
    "a municipal marijuana case gives its locality as a county",
    "nd-marijuana-first-offense-seal",
    { ...fixtureFor("nd-marijuana-first-offense-seal"), mjCourtType: "municipal", mjCounty: "Cass County" },
    "nd-municipal-court-named-by-county"
  ],
  // The impaired-driving route.
  [
    "the petitioner holds or held a commercial driver's licence",
    "nd-dui-record-seal",
    { ...fixtureFor("nd-dui-record-seal"), duiCommercialLicence: "yes" },
    "nd-dui-commercial-driver-excluded"
  ],
  [
    "a further impaired-driving violation falls inside the seven years",
    "nd-dui-record-seal",
    { ...fixtureFor("nd-dui-record-seal"), duiSubsequentDui: "yes" },
    "nd-dui-subsequent-violation"
  ],
  [
    "another criminal offence falls inside the seven years",
    "nd-dui-record-seal",
    { ...fixtureFor("nd-dui-record-seal"), duiOtherOffence: "yes" },
    "nd-dui-other-offence-in-clean-period"
  ],
  [
    "an ordinance charge names no ordinance",
    "nd-dui-record-seal",
    { ...fixtureFor("nd-dui-record-seal"), duiChargedUnder: "ordinance" },
    "nd-dui-ordinance-not-identified"
  ],
  [
    "the first violation date is not established",
    "nd-dui-record-seal",
    { ...fixtureFor("nd-dui-record-seal"), duiFirstViolationDate: "I could not say" },
    "nd-dui-first-violation-date-not-established"
  ],
  // The marijuana route.
  [
    "the conviction was not a first offence",
    "nd-marijuana-first-offense-seal",
    { ...fixtureFor("nd-marijuana-first-offense-seal"), mjFirstOffence: "no" },
    "nd-marijuana-not-a-first-offence"
  ],
  [
    "a further controlled-substance conviction exists",
    "nd-marijuana-first-offense-seal",
    {
      ...fixtureFor("nd-marijuana-first-offense-seal"),
      mjSubsequentConviction: "Yes, a possession conviction in 2019"
    },
    "nd-marijuana-subsequent-controlled-substance-conviction"
  ],
  [
    "other charges were filed in the same case",
    "nd-marijuana-first-offense-seal",
    {
      ...fixtureFor("nd-marijuana-first-offense-seal"),
      mjOtherCharges: "Yes, possession of drug paraphernalia was charged with it"
    },
    "nd-marijuana-other-charges-in-case"
  ],
  [
    "the quantity is not stated as an amount and a unit",
    "nd-marijuana-first-offense-seal",
    { ...fixtureFor("nd-marijuana-first-offense-seal"), mjQuantity: "a small bag" },
    "nd-marijuana-quantity-not-established"
  ],
  [
    "the quantity is stated in a unit the subsection does not use",
    "nd-marijuana-first-offense-seal",
    { ...fixtureFor("nd-marijuana-first-offense-seal"), mjQuantity: "20 grams" },
    "nd-marijuana-quantity-unit-not-statutory"
  ],
  [
    "the quantity is above the statutory threshold",
    "nd-marijuana-first-offense-seal",
    { ...fixtureFor("nd-marijuana-first-offense-seal"), mjQuantity: "3 ounces" },
    "nd-marijuana-quantity-above-threshold"
  ],
  [
    "the judgment date is not established",
    "nd-marijuana-first-offense-seal",
    { ...fixtureFor("nd-marijuana-first-offense-seal"), mjJudgmentDate: "I do not remember" },
    "nd-marijuana-judgment-date-not-established"
  ],
  [
    "the offence date is not established",
    "nd-marijuana-first-offense-seal",
    { ...fixtureFor("nd-marijuana-first-offense-seal"), mjOffenceDate: "not sure" },
    "nd-marijuana-offence-date-not-established"
  ]
];

let stopped = 0;
const stopIdsSeen = new Set();
for (const [label, trackId, answers, expectedStopId] of NEGATIVE) {
  let caught = null;
  try {
    deriveNorthDakotaFacts(trackId, answers);
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof NorthDakotaEligibilityStopError,
    `${trackId}: ${label} did not fail closed with a typed stop.`
  );
  if (caught instanceof NorthDakotaEligibilityStopError) {
    ok(
      caught.stopId === expectedStopId,
      `${trackId}: ${label} raised ${caught.stopId} rather than ${expectedStopId}.`
    );
    ok(caught.reason.length > 60, `${trackId}: ${label} gives no reason a person could act on.`);
    ok(caught.referral.length > 20, `${trackId}: ${label} lost its destination.`);
    ok(caught.nextStep.length > 30, `${trackId}: ${label} gives no next step a person could take.`);
    stopped += 1;
    stopIdsSeen.add(caught.stopId);
  }
}

// Every route's stops are reachable, not only the ones that were convenient.
for (const trackId of ASSIGNED) {
  ok(NEGATIVE.some(([, id]) => id === trackId), `${trackId}: no negative case covers this route.`);
}

// No stop routes back to the node that raised it.
const impairedDrivingStop = (() => {
  try {
    deriveNorthDakotaFacts("nd-seal-misdemeanor-conviction", {
      ...fixtureFor("nd-seal-misdemeanor-conviction"),
      sealOffence: "Described on the judgment as driving under the influence, a class B misdemeanor"
    });
  } catch (error) {
    return error;
  }
  return null;
})();
ok(
  impairedDrivingStop?.referral === ND_DUI_ROUTE_REFERRAL,
  "The impaired-driving stop does not route the petitioner to the § 39-08-01.6 route."
);
ok(
  /appears in the guides and not in the statutory exclusions/.test(impairedDrivingStop?.reason ?? ""),
  "The impaired-driving stop does not record that the carve-out is the guides' and not the statute's."
);

const outsidePartyStop = (() => {
  try {
    deriveNorthDakotaFacts("nd-dui-record-seal", {
      ...fixtureFor("nd-dui-record-seal"),
      judgeSignature: "Hon. R. Lindquist"
    });
  } catch (error) {
    return error;
  }
  return null;
})();
ok(
  outsidePartyStop?.referral === ND_CLERK_REFERRAL,
  "The outside-party stop does not route the petitioner to the clerk."
);

const missingFactStop = (() => {
  try {
    deriveNorthDakotaFacts("nd-marijuana-first-offense-seal", {
      ...fixtureFor("nd-marijuana-first-offense-seal"),
      mjCaseNumber: ""
    });
  } catch (error) {
    return error;
  }
  return null;
})();
ok(
  missingFactStop?.referral === ND_RECORD_REFERRAL,
  "The missing-fact stop does not send the petitioner to the record."
);

// Closed lists reject anything outside them.
const BRANCH_CASES = [
  ["nd-seal-misdemeanor-conviction", "sealCourtType", "county court"],
  ["nd-seal-misdemeanor-conviction", "sealRestitutionPaid", "mostly"],
  ["nd-seal-misdemeanor-conviction", "sealRegistrationOrdered", "maybe"],
  ["nd-seal-misdemeanor-conviction", "sealProsecutorOffice", "the attorney general"],
  ["nd-seal-pardoned-conviction", "sealPardonUnconditional", "partly"],
  ["nd-seal-pardoned-conviction", "sealPardonCoversConviction", "I think so"],
  ["nd-dui-record-seal", "duiConvictionType", "an Alford plea"],
  ["nd-dui-record-seal", "duiChargedUnder", "federal law"],
  ["nd-dui-record-seal", "duiCommercialLicence", "expired"],
  ["nd-marijuana-first-offense-seal", "mjSubstance", "hashish"],
  ["nd-marijuana-first-offense-seal", "mjCourtType", "tribal court"],
  ["nd-marijuana-first-offense-seal", "mjFirstOffence", "probably"]
];
let branchRejected = 0;
for (const [trackId, key, value] of BRANCH_CASES) {
  let caught = null;
  try {
    deriveNorthDakotaFacts(trackId, { ...fixtureFor(trackId), [key]: value });
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof NorthDakotaBranchError,
    `${trackId}: "${value}" for ${key} was not rejected as outside the approved list.`
  );
  if (caught instanceof NorthDakotaBranchError) branchRejected += 1;
}

// A track this job was not assigned cannot be derived for, including the
// composed and official-PDF North Dakota routes.
for (const trackId of [
  "nd-something-else",
  "nd-deferred-imposition-records",
  "nd-nonconviction-close-petition"
]) {
  let caught = null;
  try {
    deriveNorthDakotaFacts(trackId, {});
  } catch (error) {
    caught = error;
  }
  ok(
    caught instanceof NorthDakotaBranchError,
    `An unassigned track identifier ${trackId} was accepted by the fact derivation.`
  );
}

ok(Object.keys(ND_YES_NO).length === 2, "The yes-or-no list changed size.");
ok(new Set(Object.values(ND_COURT_TYPES)).size === 2, "The court-type list changed size.");
ok(new Set(Object.values(ND_PROSECUTOR_OFFICES)).size === 2, "The prosecuting-office list changed size.");
ok(new Set(Object.values(ND_RESTITUTION_STATUS)).size === 3, "The restitution list changed size.");
ok(new Set(Object.values(ND_PARDON_KINDS)).size === 2, "The pardon-kind list changed size.");
ok(new Set(Object.values(ND_DUI_CONVICTION_TYPES)).size === 3, "The conviction-type list changed size.");
ok(new Set(Object.values(ND_DUI_CHARGED_UNDER)).size === 2, "The charged-under list changed size.");
ok(new Set(Object.values(ND_MARIJUANA_SUBSTANCES)).size === 2, "The substance list changed size.");
ok(ND_OUTSIDE_PARTY_KEYS.length >= 10, "The outside-party key guard was narrowed.");
ok(ND_REFERRAL.length > 20, "The default referral destination is empty.");

note(
  `4. Stops: ${stopped} negative cases across all ${ASSIGNED.length} routes fail closed with the expected typed stop, a reason, a destination and a next step; ${stopIdsSeen.size} distinct stop families are exercised, covering missing participant facts, any request to populate outside-party content, statutory exclusions, an incomplete sentence, outstanding restitution, a conviction in the look-back, a pending charge, a mismatched prosecuting office, a municipal case captioned from a county, the violence-and-intimidation bar, a conditional or non-covering pardon, the commercial-driver exclusion, both seven-year clean-period failures, an unidentified ordinance, a non-first offence, an unsettled two-year period, other charges in the same case, and three separate quantity failures; ${branchRejected} out-of-list branch values rejected; three unassigned track identifiers refused; eight closed lists hold their size.`
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
 * The proposed order's findings block and the proof of service both repeat rules
 * of underscores deliberately, and a duplicate-paragraph check that could not
 * tell those apart from repeated copy would have to be weakened rather than kept
 * honest.
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
  const facts = deriveNorthDakotaFacts(fixture.trackId, fixture.answers);
  const resolved = resolvePacket({
    jurisdiction: "ND",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(
    resolved.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`
  );
  const expected = CHAPTER_TRACKS.includes(fixture.trackId) ? 3 : 2;
  ok(
    resolved.components.length === expected,
    `${fixture.fixtureId}: resolved ${resolved.components.length} components rather than the ${expected} the design assigns.`
  );

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "ND",
      geography: null,
      facts,
      rootDir: root
    });
    ok(output.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((output.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(output.sourceSha256 === null, `${component.componentId}: claims an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "ND",
      geography: null,
      facts,
      rootDir: root
    });
    ok(
      sha(output.bytes) === sha(again.bytes),
      `${component.componentId}: rendering is not deterministic.`
    );

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
      `${fixture.fixtureId}/${component.componentId}: the rendered page prints a monetary amount, and the design establishes none for this route.`
    );
    ok(
      !/^\s*(yes|no|true|false|district|municipal|paid|unconditional)\s*$/im.test(rendered),
      `${fixture.fixtureId}/${component.componentId}: a bare branch answer is rendered on a line of its own.`
    );
    // The judicial block is the only outside-party execution in the module, and
    // it is only ever on a proposed order.
    if (component.role !== "proposed_order") {
      ok(
        !/Judge of the (District|Municipal) Court/.test(rendered),
        `${fixture.fixtureId}/${component.componentId}: a document that is not a proposed order carries a judicial signature line.`
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
    jurisdiction: "ND",
    jurisdictionName: "North Dakota",
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
    `${fixture.fixtureId}: the assembled packet does not open with the filing.`
  );
  ok(
    assembled.componentRanges[1]?.role === "proposed_order",
    `${fixture.fixtureId}: the proposed order § 12-60.1-03(3) requires is not bound with the filing.`
  );
  if (expected === 3) {
    ok(
      assembled.componentRanges[2]?.role === "certificate_of_service",
      `${fixture.fixtureId}: the proof of service is not bound last.`
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
  `5. Rendering: ${renderedComponents} components across ${FIXTURES.length} packets render deterministically as PDFs; ${inspectedPages} pages inspected line by line — none blank, none trailing empty, no heading stranded from its section, no line past the margin, no paragraph repeated, no bare branch answer, no monetary amount, no unresolved placeholder and no judicial signature line outside a proposed order.`
);

// ---------------------------------------------------------------------------
// 6. Participant values reach the rendered bytes, and branches change them
// ---------------------------------------------------------------------------

const misdemeanorFacts = deriveNorthDakotaFacts(
  "nd-seal-misdemeanor-conviction",
  fixtureFor("nd-seal-misdemeanor-conviction")
);
ok(
  misdemeanorFacts.reasonsForSealing === fixtureFor("nd-seal-misdemeanor-conviction").sealReasons,
  "The petitioner's reasons were rewritten rather than carried through verbatim."
);
ok(
  misdemeanorFacts.captionLocality === "Cass" && misdemeanorFacts.captionLocalityKind === "county",
  `The county name was not reduced for a line that already prints "County": got "${misdemeanorFacts.captionLocality}" (${misdemeanorFacts.captionLocalityKind}).`
);
ok(
  /IN THE DISTRICT COURT OF CASS COUNTY, STATE OF NORTH DAKOTA/.test(misdemeanorFacts.courtLine),
  "The court line is not built from the petitioner's own court and county answers."
);
ok(
  /office of the State's Attorney for Cass County/.test(misdemeanorFacts.respondentOffice),
  "The respondent is not the office § 12-60.1-03(4) names for a district court case."
);
ok(
  misdemeanorFacts.packetCaseReference === "Cass County",
  `A district case reference does not name the county: got "${misdemeanorFacts.packetCaseReference}".`
);

// A municipal court is a city court. N.D.C.C. § 40-18.1-01(1) has the governing
// body of a city establish it and § 40-18.1-02(1) gives it the ordinances of a
// city served by the court, so there is no municipal court of a county. This
// pins the correction: the caption names the city, and the word COUNTY may not
// appear in a municipal court line at all.
const municipalFacts = deriveNorthDakotaFacts("nd-seal-misdemeanor-conviction", {
  ...fixtureFor("nd-seal-misdemeanor-conviction"),
  sealCourtType: "municipal",
  sealProsecutorOffice: "city attorney",
  sealCounty: "Fargo"
});
ok(
  municipalFacts.courtLine === "IN THE MUNICIPAL COURT OF THE CITY OF FARGO, STATE OF NORTH DAKOTA",
  `A municipal caption does not name the city whose court it is: got "${municipalFacts.courtLine}".`
);
ok(
  !/\bCOUNTY\b/.test(municipalFacts.courtLine),
  `A municipal caption names a county, and no North Dakota municipal court is a county court: got "${municipalFacts.courtLine}".`
);
ok(
  municipalFacts.captionLocality === "Fargo" && municipalFacts.captionLocalityKind === "city",
  `A municipal case does not resolve its locality as a city: got "${municipalFacts.captionLocality}" (${municipalFacts.captionLocalityKind}).`
);
ok(
  /prosecuting official for the City of Fargo/.test(municipalFacts.respondentOffice),
  `The respondent is not the office § 12-60.1-03(4) names for a municipal case: got "${municipalFacts.respondentOffice}".`
);
ok(
  municipalFacts.packetCaseReference === "City of Fargo",
  `A municipal case reference does not name the city: got "${municipalFacts.packetCaseReference}".`
);
// "City of" is stripped where the participant supplies it, and a trailing
// "City" that is part of the name is left alone.
for (const [answer, expected] of [
  ["City of Fargo", "Fargo"],
  ["the City of Grand Forks", "Grand Forks"],
  ["Valley City", "Valley City"]
]) {
  const facts = deriveNorthDakotaFacts("nd-seal-misdemeanor-conviction", {
    ...fixtureFor("nd-seal-misdemeanor-conviction"),
    sealCourtType: "municipal",
    sealProsecutorOffice: "city attorney",
    sealCounty: answer
  });
  ok(
    facts.captionLocality === expected,
    `A municipal locality answered as "${answer}" resolved to "${facts.captionLocality}" rather than "${expected}".`
  );
}
// Every route composes its caption through the same helper, so no route may
// keep the old unconditional "OF <COUNTY> COUNTY" form on a municipal case.
for (const [trackId, overrides] of [
  ["nd-dui-record-seal", { duiCourtType: "municipal", duiCounty: "Fargo" }],
  ["nd-marijuana-first-offense-seal", { mjCourtType: "municipal", mjCounty: "Fargo" }]
]) {
  const facts = deriveNorthDakotaFacts(trackId, { ...fixtureFor(trackId), ...overrides });
  ok(
    facts.courtLine === "IN THE MUNICIPAL COURT OF THE CITY OF FARGO, STATE OF NORTH DAKOTA",
    `${trackId}: a municipal caption does not name the city: got "${facts.courtLine}".`
  );
  ok(
    facts.packetCaseReference === "City of Fargo",
    `${trackId}: a municipal case reference does not name the city: got "${facts.packetCaseReference}".`
  );
}

// No branch answer reaches a rendered sentence as a bare word.
for (const fixture of FIXTURES) {
  const facts = deriveNorthDakotaFacts(fixture.trackId, fixture.answers);
  for (const [key, value] of Object.entries(facts)) {
    if (!["yes", "no", "district", "municipal", "paid", "unconditional"].includes(value)) continue;
    ok(
      !key.endsWith("Statement") && !key.endsWith("Line"),
      `${fixture.fixtureId}: ${key} carries a bare branch answer into a rendered sentence.`
    );
  }
  const track = NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS.find((t) => t.trackId === fixture.trackId);
  for (const input of track.requiredInputs.filter((i) => i.required)) {
    ok(
      Object.prototype.hasOwnProperty.call(facts, input.key),
      `${fixture.fixtureId}: declared input ${input.key} is not carried through to the fact bag.`
    );
  }
  // Both conditional proposed orders need their condition fact, or they would
  // silently never render.
  if (!CHAPTER_TRACKS.includes(fixture.trackId)) {
    ok(
      Boolean(facts[ND_PROPOSED_ORDER_CONDITION_KEY]),
      `${fixture.fixtureId}: the conditional proposed order's condition fact is absent, so the order would not render.`
    );
  }
}

// The material branches produce different documents.
const branchPairs = [
  ["nd-misdemeanor-seal-positive-1", "nd-misdemeanor-seal-municipal-court-2"],
  ["nd-felony-seal-positive-1", "nd-felony-seal-no-restitution-ordered-2"],
  ["nd-dui-seal-positive-1", "nd-dui-seal-municipal-ordinance-2"],
  ["nd-marijuana-seal-positive-1", "nd-marijuana-seal-thc-grams-2"]
];
for (const [baseId, variantId] of branchPairs) {
  const canonical = results.find((r) => r.fixtureId === baseId);
  const variant = results.find((r) => r.fixtureId === variantId);
  ok(
    canonical && variant && canonical.sha256 !== variant.sha256,
    `${variantId}: the regression variant assembles to the same bytes as ${baseId}, so it tests nothing.`
  );
}

// The restitution branch changes which § 12-60.1-04(1)(d) recital is made.
const restitutionPaid = deriveNorthDakotaFacts(
  "nd-seal-felony-conviction",
  fixtureFor("nd-seal-felony-conviction")
);
const restitutionNone = deriveNorthDakotaFacts("nd-seal-felony-conviction", {
  ...fixtureFor("nd-seal-felony-conviction"),
  sealRestitutionPaid: "none ordered"
});
ok(
  /has been paid in full/.test(restitutionPaid.restitutionStatement) &&
    /no restitution was ordered/.test(restitutionNone.restitutionStatement),
  "The restitution answer does not change the recital the petition makes."
);

// The marijuana substance branch changes the substance and the threshold unit.
const mjMarijuana = deriveNorthDakotaFacts(
  "nd-marijuana-first-offense-seal",
  fixtureFor("nd-marijuana-first-offense-seal")
);
const mjThc = deriveNorthDakotaFacts("nd-marijuana-first-offense-seal", {
  ...fixtureFor("nd-marijuana-first-offense-seal"),
  mjSubstance: "thc",
  mjQuantity: "1.5 grams"
});
ok(
  mjMarijuana.substanceName === "marijuana" && mjThc.substanceName === "tetrahydrocannabinol",
  "The substance answer does not change what the motion says was possessed."
);
ok(
  mjThc.quantityStatement.includes("1.5 grams"),
  "The quantity is not carried through as the participant stated it."
);

note(
  "6. Values: the petitioner's reasons are carried through verbatim, the county is reduced only for the line that already prints the word, the court line and the respondent follow the petitioner's own answers, no branch answer reaches a sentence as a bare word, every declared required input reaches the fact bag, both conditional orders carry their condition fact, and all four regression variants assemble to different bytes from their canonical fixture. On the municipal branch the caption names the city rather than a county on all three routes that offer it — a North Dakota municipal court is established by a city under N.D.C.C. § 40-18.1-01(1) and hears the ordinances of a city served by it under § 40-18.1-02(1), so no municipal court line may contain the word COUNTY — the respondent and the packet case reference name the same city, a supplied \"City of\" prefix is stripped while a name ending in \"City\" is left intact, and a municipal case whose locality is answered as a county stops on every route."
);

// ---------------------------------------------------------------------------
// 7. Runtime invariants
// ---------------------------------------------------------------------------

for (const track of NORTH_DAKOTA_CUSTOM_PLEADING_TRACKS) {
  ok(track.statuses.runtime === "runtime_disabled", `${track.trackId}: is not runtime-disabled.`);
  ok(track.statuses.legal === "not_submitted", `${track.trackId}: claims a legal review status.`);
  ok(track.statuses.visual === "not_reviewed", `${track.trackId}: claims a visual review status.`);
  ok(track.jurisdiction === "ND", `${track.trackId}: is not a North Dakota track.`);
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
  console.error("North Dakota custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("North Dakota custom-pleading verification passed.\n");
for (const line of checks) console.log(line);
console.log("\nPer-fixture packets:");
for (const result of results.sort((a, b) => a.fixtureId.localeCompare(b.fixtureId))) {
  console.log(
    `  ${result.fixtureId.padEnd(40)} ${result.trackId.padEnd(32)} ${result.sampleRole.padEnd(9)} ${String(result.components).padStart(2)} components  ${String(result.pages).padStart(3)} pages  sha256=${result.sha256}`
  );
}
