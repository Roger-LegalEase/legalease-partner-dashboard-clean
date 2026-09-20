#!/usr/bin/env node
/**
 * The caption-treatment control.
 *
 * The Grade-A renderer used to hold one rule about court documents: a document
 * whose presentation is `pleading` must carry its own caption, or it is not a
 * pleading. That is true of some filings and false as a universal, and the
 * corpus says so — 42 of the 51 court-facing components declare no caption
 * section, and they are not one kind of thing:
 *
 *   - some take their caption from an official form (CT's JD-CR-202, Oregon's
 *     OJD set-aside packet);
 *   - some are supporting pages filed WITH a captioned instrument and identified
 *     by it. Nevada's declaration is the reference case: page 7 of the
 *     owner-adopted output opens "This declaration accompanies the subsection 2
 *     petition" and carries no caption, while the petition and proposed order on
 *     pages 4 and 6 each carry a full one;
 *   - some lost a caption in derivation, and the caption is authoritative and
 *     missing;
 *   - and for some, nothing read establishes which of those is true.
 *
 * One blunt rule cannot tell those apart, and it leaves only two ways out, both
 * forbidden: manufacture a caption, or relabel a court-facing filing as
 * guidance. So caption behaviour moved into the §4.2 document contract, and the
 * renderer's invariant became:
 *
 *   a court-facing component must carry an explicit, satisfied captionTreatment
 *
 * rather than
 *
 *   presentation === "pleading" && no caption block.
 *
 * This control proves both directions. The positives matter as much as the
 * negative: an invariant that only ever refuses would be satisfied by refusing
 * everything, which is how a renderer stops shipping and still looks correct.
 */

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { documentContractFor, isCourtFacing, captionTreatmentIsResolved } =
  await import("../src/lib/rcap/grade-a/document-contract.ts");
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { composeIlProstitutionJVacateParticipantPacket } =
  await import("../src/lib/rcap/grade-a/families/il-prostitution-j-vacate-set.ts");
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");
const NV = await import("../src/lib/rcap-engine/nevada-176a-branch.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

// ---------------------------------------------------------------------------
// 1. The contract exists, is per-component, and is never inferred from
//    presentation.
// ---------------------------------------------------------------------------

const specDir = path.join(rootDir, "data/record-clearing/packet-specifications");
const specs = fs.readdirSync(specDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(fs.readFileSync(path.join(specDir, file), "utf8")));

const courtFacing = specs.flatMap((spec) => (spec.documents ?? [])
  .map((document) => ({ spec, document, contract: documentContractFor(document) }))
  .filter((row) => isCourtFacing(row.contract)));

check(courtFacing.length > 0, `there are court-facing components to measure (${courtFacing.length})`);

const TREATMENTS = new Set([
  "full_independent_caption",
  "supporting_page",
  "official_form_controls",
  "not_applicable",
  "unresolved"
]);
const unknownValues = [...new Set(courtFacing.map((row) => row.contract.captionTreatment))]
  .filter((value) => !TREATMENTS.has(value));
check(unknownValues.length === 0, `every caption treatment is one of the contract's values${unknownValues.length ? `; found ${unknownValues.join(", ")}` : ""}`);

// The decisive property: caption behaviour does not follow presentation. If it
// did, this contract would be a rename rather than a correction.
const pleadings = courtFacing.filter((row) => row.document.presentation === "pleading");
const pleadingTreatments = new Set(pleadings.map((row) => row.contract.captionTreatment));
check(
  pleadingTreatments.size > 1,
  `components presented as pleadings carry more than one caption treatment, so the treatment is not a restatement of presentation (${[...pleadingTreatments].join(", ")})`
);

// And a caption section is not the same statement as a caption treatment.
const declaredNoSection = courtFacing.filter((row) =>
  !(row.document.sections ?? []).some((section) => /caption/.test(section.kind)));
const resolvedWithoutSection = declaredNoSection.filter((row) => captionTreatmentIsResolved(row.contract));
check(
  declaredNoSection.length > 0 && resolvedWithoutSection.length > 0,
  `a component can have no caption section and still have a resolved treatment (${resolvedWithoutSection.length} of ${declaredNoSection.length})`
);

// ---------------------------------------------------------------------------
// 1b. An implementation is not its own document authority.
//
// "The composer emits a caption today" proves what the renderer does, not what
// the document should carry, and classifying from it is how a legacy behaviour
// validates itself. So every RECORDED treatment — as opposed to one derived
// from a source field that states it — must cite what establishes it: a
// controlling official or local form, adopted or approved artifact bytes, a
// source-backed document specification, or an owner or legal decision.
// ---------------------------------------------------------------------------

const RECORDED_TREATMENTS = new Set(["full_independent_caption", "supporting_page"]);
const recorded = courtFacing.filter((row) => RECORDED_TREATMENTS.has(row.contract.captionTreatment));

// The denominator, stated so it cannot drift into ambiguity. The two recorded
// treatments are counted separately and then together, because "seven" and
// "eight" are both true of this population and mean different things: seven
// components carry their own caption, one is an approved supporting page that
// carries none, and eight is the number of treatments recorded on authority.
const independentCount = recorded.filter((row) => row.contract.captionTreatment === "full_independent_caption").length;
const supportingCount = recorded.filter((row) => row.contract.captionTreatment === "supporting_page").length;
check(
  recorded.length === independentCount + supportingCount,
  `recorded caption treatments = ${independentCount} full_independent_caption + ${supportingCount} supporting_page = ${recorded.length} total`
);
check(recorded.length > 0, `there are recorded caption treatments to audit (${recorded.length})`);

/*
 * What may settle a caption treatment.
 *
 * "repaired artifact" joins the list because a component can now be carried
 * from a recorded repair rather than from the adopted bytes -- Illinois's
 * mistaken-identity petition is, its adopted version having failed independent
 * semantic review. The page that settles the caption is the page the component
 * was transcribed from, and for that route the adopted one is not it.
 */
const AUTHORITY =
  /adopted artifact|approved artifact|repaired artifact|official form|local form|owner|legal decision|specification/i;
const withoutEvidence = recorded.filter((row) => {
  const evidence = row.document.documentContract?.captionTreatmentEvidence;
  return typeof evidence !== "string" || evidence.trim().length < 40 || !AUTHORITY.test(evidence);
});
check(
  withoutEvidence.length === 0,
  `every recorded caption treatment cites an authority${withoutEvidence.length ? `; missing on ${withoutEvidence.map((row) => `${row.spec.routeKey}|${row.document.documentId}`).join(", ")}` : ""}`
);

// And the evidence may not be the renderer. A treatment justified by what the
// composer currently emits is the error this check exists to make impossible.
const selfValidating = recorded.filter((row) =>
  /\b(composer|renderer) (emits|draws|produces|outputs)|emits a caption (block )?today|current(ly)? (emits|renders|draws)/i
    .test(row.document.documentContract?.captionTreatmentEvidence ?? ""));
check(
  selfValidating.length === 0,
  `no caption treatment is justified by what the implementation currently emits${selfValidating.length ? `; ${selfValidating.map((row) => row.document.documentId).join(", ")}` : ""}`
);

// ---------------------------------------------------------------------------
// 2. Positive control A — a filing that carries its own caption still renders.
// ---------------------------------------------------------------------------

const factsFor = (spec) => {
  const facts = {};
  for (const required of spec.requiredFacts ?? []) facts[required.factId] = "X";
  for (const document of spec.documents ?? []) {
    for (const section of document.sections ?? []) {
      for (const field of section.fields ?? []) facts[field] = "X";
      for (const assertion of section.assertions ?? []) for (const id of assertion.facts ?? []) facts[id] = "X";
    }
  }
  return facts;
};

const matterFor = (spec, facts) => ({
  routeKey: spec.routeKey,
  jurisdiction: spec.jurisdiction,
  pathwayId: spec.pathwayId,
  facts,
  verificationHash: "caption-treatment-control",
  verifiedAt: "2026-09-19T00:00:00.000Z",
  generationPurpose: "internal_review"
});

const ilSpec = packetSpecificationFor("IL:felony-prostitution-relief");
const ilPacket = composeIlProstitutionJVacateParticipantPacket(ilSpec, matterFor(ilSpec, factsFor(ilSpec)));
const ilCourtFacing = ilPacket.documents.filter((document) => document.courtFacing);
check(ilCourtFacing.length > 0, `the independently captioned family has court-facing documents (${ilCourtFacing.length})`);
check(
  ilCourtFacing.every((document) => document.captionTreatment === "full_independent_caption"),
  "every one of its court-facing documents declares a full independent caption"
);
check(
  ilCourtFacing.every((document) => document.blocks.some((block) => block.kind === "pleading_caption")),
  "and every one actually carries a caption block, so the declaration is not an empty claim"
);
let ilBytes = 0;
try {
  ilBytes = (await renderGradeAPacketPdf(ilPacket)).byteLength;
} catch (error) {
  check(false, `POSITIVE A: an independently captioned filing renders — ${String(error.message).slice(0, 160)}`);
}
check(ilBytes > 1000, `POSITIVE A: a valid independently captioned filing renders (${ilBytes} bytes)`);

// ---------------------------------------------------------------------------
// 3. Positive control B — an approved supporting page with no caption of its
//    own also renders, in the same packet as captioned filings.
// ---------------------------------------------------------------------------

const nvSpec = packetSpecificationFor(NV.NEVADA_176A_ROUTE_KEY);
const nvFacts = {
  ...factsFor(nvSpec),
  [NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]: NV.NEVADA_176A_EXCLUDED_CHARGE_NO,
  [NV.NEVADA_176A_CHARGE_FACT_ID]: NV.NEVADA_176A_CHARGE_NAMED,
  [NV.NEVADA_176A_DISPOSITION_FACT_ID]: NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL
};
const nvPacket = composeGradeAPacket(nvSpec, matterFor(nvSpec, nvFacts));

const supporting = nvPacket.documents.filter((document) => document.captionTreatment === "supporting_page");
const independentlyCaptioned = nvPacket.documents.filter((document) => document.captionTreatment === "full_independent_caption");
check(supporting.length > 0, `the packet contains an approved supporting page (${supporting.map((d) => d.documentId).join(", ") || "none"})`);
check(independentlyCaptioned.length > 0, `and captioned filings alongside it (${independentlyCaptioned.map((d) => d.documentId).join(", ") || "none"})`);
check(
  supporting.every((document) => !document.blocks.some((block) => block.kind === "pleading_caption")),
  "the supporting page carries no caption, which is what makes it the case this control is for"
);
check(
  supporting.every((document) => document.courtFacing),
  "the supporting page is court-facing, so it is not passing by being reclassified as guidance"
);
check(
  independentlyCaptioned.every((document) => document.blocks.some((block) => block.kind === "pleading_caption")),
  "the captioned filings in the same packet do carry captions"
);
let nvBytes = 0;
try {
  nvBytes = (await renderGradeAPacketPdf(nvPacket)).byteLength;
} catch (error) {
  check(false, `POSITIVE B: an approved supporting page renders — ${String(error.message).slice(0, 160)}`);
}
check(nvBytes > 1000, `POSITIVE B: a valid approved supporting page without its own caption renders (${nvBytes} bytes)`);

// ---------------------------------------------------------------------------
// 4. Negative controls — refuse, and refuse for the stated reason.
// ---------------------------------------------------------------------------

const renderRefusal = async (mutate) => {
  const packet = JSON.parse(JSON.stringify(nvPacket));
  mutate(packet);
  try {
    await renderGradeAPacketPdf(packet);
    return "";
  } catch (error) {
    return String(error.message);
  }
};

const unresolvedRefusal = await renderRefusal((packet) => {
  for (const document of packet.documents) {
    if (document.courtFacing) document.captionTreatment = "unresolved";
  }
});
check(
  /no resolved caption treatment/.test(unresolvedRefusal),
  `NEGATIVE: a court-facing component with an unresolved caption treatment refuses (got: ${unresolvedRefusal.slice(0, 120) || "rendered"})`
);

// The same unresolved treatment on a component that is NOT court-facing is not
// an error: the question does not arise for it.
const guidanceUnresolved = await renderRefusal((packet) => {
  for (const document of packet.documents) {
    if (!document.courtFacing) document.captionTreatment = "unresolved";
  }
});
check(
  guidanceUnresolved === "",
  `an unresolved treatment on a component that is not court-facing does not refuse (got: ${guidanceUnresolved.slice(0, 120)})`
);

// A component that declares it carries its own caption and then does not is the
// derivation defect the rule exists to catch.
const missingCaptionRefusal = await renderRefusal((packet) => {
  for (const document of packet.documents) {
    if (document.captionTreatment !== "full_independent_caption") continue;
    document.blocks = document.blocks.filter((block) => block.kind !== "pleading_caption");
  }
});
check(
  /declares a full independent caption and carries none/.test(missingCaptionRefusal),
  `NEGATIVE: a declared caption that is missing refuses as a derivation defect (got: ${missingCaptionRefusal.slice(0, 120) || "rendered"})`
);

// The old rule must be gone, not merely supplemented: a supporting page is a
// pleading with no caption, and it renders.
check(
  supporting.length > 0 && supporting.every((document) => document.presentation === "pleading") && nvBytes > 1000,
  "the retired invariant is gone: a component presented as a pleading with no caption block renders when its treatment says it should"
);

// ---------------------------------------------------------------------------
// 5. The population, stated rather than assumed.
// ---------------------------------------------------------------------------

const byTreatment = {};
for (const row of courtFacing) {
  byTreatment[row.contract.captionTreatment] = (byTreatment[row.contract.captionTreatment] ?? 0) + 1;
}
console.log(`\nrecorded on authority: ${independentCount} full_independent_caption + ${supportingCount} supporting_page = ${recorded.length}`);
console.log(`court-facing components by caption treatment: ${
  Object.entries(byTreatment).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}=${count}`).join(", ")}`);
const unresolvedRows = courtFacing.filter((row) => row.contract.captionTreatment === "unresolved");
if (unresolvedRows.length > 0) {
  console.log("unresolved, and therefore refusing to render:");
  for (const row of unresolvedRows) console.log(`  - ${row.spec.routeKey} | ${row.document.documentId}`);
}
check(
  unresolvedRows.every((row) => !(row.document.documentContract ?? {}).captionTreatment),
  "no component is recorded as unresolved on purpose; unresolved means nothing has been recorded yet"
);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
