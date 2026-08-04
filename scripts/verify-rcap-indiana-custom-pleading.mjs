// Indiana custom pleadings — committed regression verifier.
//
// This is the job's own focused acceptance gate, and it runs offline against
// the real renderer and the real assembler. It proves the properties a rendered
// sample cannot prove by looking right: Indiana is not enabled, every component
// has a governing specification, the two implemented routes render
// deterministically into one assembled PDF each, the blocked route keeps its
// typed stop, every self-help stop fails closed, participant text is carried
// verbatim, third-party fields stay blank, and the two Indiana disclosures that
// counsel required are present on every document.
//
// It generates PDFs into an ignored directory and leaves nothing tracked.

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
const { PLEADING_TEMPLATES, pleadingTemplate } = await import("@/lib/rcap/packets/engines/pleading-templates");
const { resolvePacket, PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const {
  INDIANA_CUSTOM_PLEADING_TRACKS,
  INDIANA_PLEADING_TEMPLATES,
  INDIANA_BLOCKED_TRACK_IDS,
  IN_BLOCKED_TRACKS,
  IN_EXPUNGEMENT_SECTIONS,
  IN_COLLATERAL_ACTION_TYPES,
  IndianaTrackUnavailableError,
  IndianaSelfHelpStopError,
  IndianaBranchError,
  deriveIndianaFacts,
  assertIndianaTrackImplemented
} = await import("@/lib/rcap/packets/jurisdictions/indiana/custom-pleading");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/indiana-custom-pleading");
const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);

// ---------------------------------------------------------------------------
// 1. Indiana is not enabled. Asserted before anything is registered.
// ---------------------------------------------------------------------------

ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "IN").length === 0,
  "Indiana is wired into the shared relief-track registry. This job must not enable a jurisdiction."
);
ok(
  Object.keys(PLEADING_TEMPLATES).filter((id) => id.startsWith("in-")).length === 0,
  "Indiana templates are wired into the shared pleading-template pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track in the shared registry is not runtime-disabled."
);
note("1. Enablement: Indiana absent from the shared registry and template pack; nothing promoted.");

for (const track of INDIANA_CUSTOM_PLEADING_TRACKS) RELIEF_TRACKS.push(track);
Object.assign(PLEADING_TEMPLATES, INDIANA_PLEADING_TEMPLATES);

// ---------------------------------------------------------------------------
// 2. Nothing is promoted
// ---------------------------------------------------------------------------

for (const track of INDIANA_CUSTOM_PLEADING_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not marked a non-production fixture.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.statuses.visual !== "visual_review_passed", `${track.trackId} claims visual approval.`);
  const runtime = computeRuntimeStatus({
    statuses: track.statuses,
    sourceCurrent: track.sourceCurrent,
    runtimeDisabled: track.runtimeDisabled,
    outputStrategy: track.outputStrategy
  });
  ok(runtime === "runtime_disabled", `${track.trackId} computes ${runtime}.`);
  for (const component of track.packetSet.components) {
    ok(component.approval.legal === "not_submitted", `${component.componentId} claims legal approval.`);
    ok(component.approval.visual === "not_reviewed", `${component.componentId} claims visual approval.`);
    ok(
      component.sourcePath === null && component.sourceSha256 === null,
      `${component.componentId}: a custom pleading names an official source.`
    );
  }
}
note(`2. Promotion: ${INDIANA_CUSTOM_PLEADING_TRACKS.length} tracks runtime_disabled, awaiting counsel adoption.`);

// ---------------------------------------------------------------------------
// 3. Every rendered component has a governing specification
// ---------------------------------------------------------------------------

const specifications = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8")
);
const specified = new Set(specifications.customPleadingSpecs.map((s) => s.componentId));
const registry = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8")
);

let componentCount = 0;
for (const track of INDIANA_CUSTOM_PLEADING_TRACKS) {
  const designed = registry.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  const designedIds = (designed?.packetSet?.components ?? []).map((c) => c.componentId);
  for (const component of track.packetSet.components) {
    ok(specified.has(component.componentId), `${component.componentId}: no governing specification.`);
    ok(designedIds.includes(component.componentId), `${component.componentId}: not in the adopted packet set.`);
    ok(Boolean(pleadingTemplate(component.templateId)), `${component.componentId}: template not registered.`);
    componentCount += 1;
  }
  // The registry must not silently drop or add a component.
  ok(
    designedIds.length === track.packetSet.components.length,
    `${track.trackId}: builds ${track.packetSet.components.length} of ${designedIds.length} designed components.`
  );
  const orders = track.packetSet.components.map((c) => c.order);
  ok(new Set(orders).size === orders.length, `${track.trackId}: duplicate component order.`);
}
const used = new Set(
  INDIANA_CUSTOM_PLEADING_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId))
);
for (const templateId of Object.keys(INDIANA_PLEADING_TEMPLATES)) {
  ok(used.has(templateId), `${templateId}: registered but unused.`);
}
note(`3. Specifications: ${componentCount} components, each specified, each matching the adopted packet set.`);

// ---------------------------------------------------------------------------
// 4. The blocked route keeps its typed stop
// ---------------------------------------------------------------------------

for (const trackId of INDIANA_BLOCKED_TRACK_IDS) {
  let error = null;
  try {
    assertIndianaTrackImplemented(trackId);
  } catch (caught) {
    error = caught;
  }
  ok(error instanceof IndianaTrackUnavailableError, `${trackId}: no typed stop.`);
  ok((error?.missingComponents ?? []).length > 0, `${trackId}: the stop names no missing component.`);
  ok(String(error?.reason ?? "").length > 0, `${trackId}: the stop carries no reason.`);
  ok(
    !INDIANA_CUSTOM_PLEADING_TRACKS.some((t) => t.trackId === trackId),
    `${trackId} is blocked but was also built.`
  );

  let derived = null;
  try {
    deriveIndianaFacts(trackId, {});
  } catch (caught) {
    derived = caught;
  }
  ok(derived instanceof IndianaTrackUnavailableError, `${trackId}: the deriver did not refuse it.`);
}
// The blocked route's required official-form binaries must still be absent; if
// they arrive, this gate is what says the stop can be reconsidered.
const artifacts = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/source-artifact-registry.json"), "utf8")
);
const indianaOnDisk = artifacts.artifacts
  .filter((a) => a.jurisdiction === "IN" && a.sourcePath)
  .filter((a) => fs.existsSync(path.join(root, a.sourcePath)) || fs.existsSync(a.sourcePath));
ok(
  indianaOnDisk.length === 0,
  `${indianaOnDisk.length} Indiana form binaries are now present; in_conviction_serious_felony should be reconsidered.`
);
note(
  `4. Blocked route: in_conviction_serious_felony keeps a typed stop naming ${IN_BLOCKED_TRACKS.in_conviction_serious_felony.missingComponents.length} components; 0 Indiana binaries on disk.`
);

// ---------------------------------------------------------------------------
// 5. Closed lists and self-help stops fail closed
// ---------------------------------------------------------------------------

const CLEAR_STOPS = {
  prosecutorOpposition: "no",
  hearingSet: "no",
  multiCountyWindowPartlyUsed: "no",
  wantsToFileBeforeEligible: "no",
  alreadyFiledSections2To5: "no",
  sexOrViolentOffender: "no",
  financialObligationsOutstanding: "no",
  pendingChargesOrDiversion: "no",
  commercialDriversLicence: "no",
  collateralConsequencesInPlay: "no",
  wantsToAttackConviction: "no"
};

const COLLATERAL_FACTS = {
  petitionerName: "Rosalie Marie Tenpenny",
  dateOfBirth: "3 January 1986",
  mailingAddress: "812 South Meridian Street, Apartment 5, Indianapolis, Indiana 46225",
  courtName: "Marion Superior Court",
  countyName: "Marion",
  causeNumber: "49D30-2207-MI-024118",
  originalExpungementDate: "14 November 2023",
  originalExpungementSection: "section_5",
  originalExpungementCourt: "Marion Superior Court",
  originalExpungementCounty: "Marion",
  collateralActionCounty: "Marion",
  collateralActionType: "civil_forfeiture",
  relationshipToExpungedMatter:
    "The car was taken the same night I was arrested, in the same traffic stop, and the forfeiture case used the same police report as the criminal case. When the criminal case was expunged the forfeiture stayed on the record, and it still comes up when I apply for anything.",
  contactPhone: "(317) 555-0139",
  contactEmail: "sample.participant@example.org",
  ...CLEAR_STOPS
};

const SUPPLEMENTAL_FACTS = {
  petitionerName: "Darnell Everett Whitaker",
  dateOfBirth: "27 August 1979",
  mailingAddress: "4402 Lincoln Way West, South Bend, Indiana 46628",
  courtName: "St. Joseph Superior Court",
  countyName: "St. Joseph",
  causeNumber: "71D02-1904-XP-000188",
  originalExpungementDate: "2 May 2019",
  originalExpungementSection: "section_3",
  amendmentReliedOn:
    "The 2024 change to the chapter that broadened what a court may order sealed for a Section 3 expungement.",
  reliefSought:
    "I am asking the court to extend my expungement to cover the records the amendment now allows, so that the same relief applies to my case as would apply if I filed today.",
  contactPhone: "(574) 555-0107",
  contactEmail: "sample.participant2@example.org",
  ...CLEAR_STOPS
};

const STOP_CASES = [
  ["prosecutorOpposition", "prosecutor_or_victim_opposition"],
  ["hearingSet", "hearing_set"],
  ["multiCountyWindowPartlyUsed", "multi_county_365_day_window"],
  ["wantsToFileBeforeEligible", "chastain_trap"],
  ["alreadyFiledSections2To5", "already_filed_sections_2_to_5"],
  ["sexOrViolentOffender", "sex_or_violent_offender"],
  ["financialObligationsOutstanding", "fines_fees_or_restitution_outstanding"],
  ["pendingChargesOrDiversion", "pending_charges_or_diversion"],
  ["commercialDriversLicence", "commercial_drivers_licence"],
  ["collateralConsequencesInPlay", "collateral_consequences_in_play"],
  ["wantsToAttackConviction", "attacking_the_underlying_conviction"]
];

for (const [key, stopId] of STOP_CASES) {
  for (const [trackId, base] of [
    ["in_collateral_action", COLLATERAL_FACTS],
    ["in_supplemental_order", SUPPLEMENTAL_FACTS]
  ]) {
    let outcome = "generated";
    let seen = null;
    try {
      deriveIndianaFacts(trackId, { ...base, [key]: "yes" });
    } catch (error) {
      if (error instanceof IndianaSelfHelpStopError) {
        outcome = "stop";
        seen = error.stopId;
        ok(Boolean(error.routeTo), `${trackId}: the ${stopId} stop lost its destination.`);
      } else {
        outcome = "other";
      }
    }
    ok(outcome === "stop" && seen === stopId, `${trackId}: ${key}=yes expected ${stopId}, got ${outcome}/${seen}.`);
  }
}

// Unclear section classification is its own stop.
for (const [trackId, base] of [
  ["in_collateral_action", COLLATERAL_FACTS],
  ["in_supplemental_order", SUPPLEMENTAL_FACTS]
]) {
  let seen = null;
  try {
    deriveIndianaFacts(trackId, { ...base, originalExpungementSection: "unclear" });
  } catch (error) {
    seen = error instanceof IndianaSelfHelpStopError ? error.stopId : "other";
  }
  ok(seen === "section_classification_unclear", `${trackId}: unclear section did not stop (${seen}).`);
}

// Closed lists refuse anything outside them.
const BRANCH_CASES = [
  ["in_collateral_action", { originalExpungementSection: "section_9" }],
  ["in_collateral_action", { collateralActionType: "criminal_appeal" }],
  ["in_collateral_action", { collateralActionType: "" }],
  ["in_collateral_action", { prosecutorOpposition: "maybe" }],
  ["in_supplemental_order", { originalExpungementSection: "" }],
  ["in_supplemental_order", { hearingSet: "unsure" }]
];
for (const [trackId, override] of BRANCH_CASES) {
  const base = trackId === "in_collateral_action" ? COLLATERAL_FACTS : SUPPLEMENTAL_FACTS;
  let outcome = "generated";
  try {
    deriveIndianaFacts(trackId, { ...base, ...override });
  } catch (error) {
    outcome = error instanceof IndianaBranchError ? "branch" : "other";
  }
  ok(outcome === "branch", `${trackId} ${JSON.stringify(override)}: expected branch error, got ${outcome}.`);
}
ok(Object.keys(IN_EXPUNGEMENT_SECTIONS).length === 6, "The section closed list changed size.");
ok(Object.keys(IN_COLLATERAL_ACTION_TYPES).length === 4, "The collateral-action closed list changed size.");
note(
  `5. Stops: ${STOP_CASES.length * 2} self-help stops fail closed with a destination, plus section-classification and ${BRANCH_CASES.length} branch cases.`
);

// ---------------------------------------------------------------------------
// 6. Rendered content, assembly and determinism
// ---------------------------------------------------------------------------

/**
 * Destruction language, tested as an ASSERTION rather than as a keyword.
 *
 * Every Indiana document is required to carry the opposite sentence —
 * "expungement in Indiana does not destroy anything ... court records are not
 * deleted or removed" — so a bare keyword ban would flag the very disclosure
 * that makes the packet correct. What is prohibited is telling a participant
 * their record IS destroyed, so the test is per sentence and skips any sentence
 * carrying a negation.
 */
function assertsDestruction(text) {
  return text
    .split(/(?<=[.;])\s+/)
    .some(
      (sentence) =>
        /\b(destroy(ed|s)?|deleted|erased)\b/i.test(sentence) &&
        !/\b(not|never|does not|do not|no longer exists|cannot)\b/i.test(sentence)
    );
}

const PROHIBITED = [
  [{ test: assertsDestruction }, "an assertion that a record is destroyed, deleted or erased"],
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/we (will )?(obtain|negotiate|appear)/i, "a claim that LegalEase obtains consent, negotiates or appears"],
  [/you (qualify|are eligible)(?!\?)/i, "an individualized legal finding"],
  [/social security (number|no)/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"]
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const samples = [];
for (const [trackId, facts, caseReference] of [
  ["in_collateral_action", COLLATERAL_FACTS, COLLATERAL_FACTS.causeNumber],
  ["in_supplemental_order", SUPPLEMENTAL_FACTS, SUPPLEMENTAL_FACTS.causeNumber]
]) {
  const derived = deriveIndianaFacts(trackId, facts);
  const resolved = resolvePacket({ jurisdiction: "IN", trackId, facts: derived, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${trackId}: resolved ${resolved.runtimeStatus}.`);

  const assemblyComponents = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "IN",
      geography: null,
      facts: derived,
      rootDir: root
    });
    ok(rendered.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((rendered.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(rendered.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);

    const again = await renderPacketComponent({
      component,
      jurisdiction: "IN",
      geography: null,
      facts: derived,
      rootDir: root
    });
    ok(sha(rendered.bytes) === sha(again.bytes), `${component.componentId}: not deterministic.`);

    const source = JSON.stringify(pleadingTemplate(component.templateId));
    for (const [pattern, why] of PROHIBITED) {
      ok(!pattern.test(source), `${component.componentId}: template contains ${why}.`);
    }
    ok(!assertsDestruction(source), `${component.componentId}: template asserts a record is destroyed.`);
    if (component.role === "proposed_order") {
      const template = pleadingTemplate(component.templateId);
      ok(template.signatureLabel === null, `${component.componentId}: a proposed order has a participant signature rule.`);
      ok(
        template.signatureBlock.some((line) => /JUDGE/.test(line)),
        `${component.componentId}: no judicial signature block.`
      );
      ok(/\(   \) that the (request|petition) should be GRANTED/.test(source), `${component.componentId}: grant election not blank.`);
      ok(/\(   \) that the (request|petition) should be DENIED/.test(source), `${component.componentId}: denial election not blank.`);
    }
    assemblyComponents.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
  }

  const assembled = await assemblePacketPdf({
    jurisdiction: "IN",
    jurisdictionName: "Indiana",
    packetName: resolved.track.assembledPacketName,
    caseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  });
  const again = await assemblePacketPdf({
    jurisdiction: "IN",
    jurisdictionName: "Indiana",
    packetName: resolved.track.assembledPacketName,
    caseReference,
    title: resolved.track.assembledPacketTitle,
    components: assemblyComponents
  });
  ok(assembled.sha256 === again.sha256, `${trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${trackId}: the deliverable is a ZIP.`);
  ok(
    assembled.componentRanges.length === assemblyComponents.length,
    `${trackId}: the assembled packet does not cover every component.`
  );

  const dir = path.join(OUT, trackId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, assembled.fileName);
  fs.writeFileSync(file, assembled.bytes);

  const text = pdfText(file);
  for (const [pattern, why] of PROHIBITED) {
    ok(!pattern.test(text), `${trackId}: assembled packet contains ${why}.`);
  }
  // The two Indiana disclosures counsel required, on every packet.
  ok(/sealed or restricted/i.test(text), `${trackId}: does not say records are sealed or restricted.`);
  ok(/35-38-9-1\(k\)/.test(text), `${trackId}: does not cite I.C. 35-38-9-1(k).`);
  ok(/public until the court grants/i.test(text), `${trackId}: does not disclose that the case file is public until granted.`);
  ok(/does not appear in court/i.test(text), `${trackId}: does not disclaim appearing in court.`);
  // Participant text carried verbatim and attributed.
  const narrative = facts.relationshipToExpungedMatter ?? facts.reliefSought;
  ok(text.includes(narrative), `${trackId}: the participant's own statement is absent or altered.`);
  ok(/own words/i.test(text), `${trackId}: participant text is not identified as the participant's.`);
  ok(text.includes(facts.petitionerName), `${trackId}: the participant's name is absent.`);
  ok(text.includes(facts.causeNumber), `${trackId}: the cause number is absent.`);
  // The certified original order is a required-before-filing item, disclosed.
  ok(/certified/i.test(text), `${trackId}: does not require a certified original order.`);
  // No page may be blank.
  for (const [index, page] of pdfPageTexts(file).entries()) {
    ok(page.replace(/\s/g, "").length > 40, `${trackId}: page ${index + 1} is blank.`);
  }

  samples.push({
    trackId,
    fileName: assembled.fileName,
    sha256: assembled.sha256,
    pageCount: assembled.pageCount,
    byteSize: assembled.byteSize,
    components: assemblyComponents.length
  });
}

// Missing a required input must stop at resolution rather than render a blank.
{
  const facts = { ...COLLATERAL_FACTS };
  delete facts.relationshipToExpungedMatter;
  let outcome = "generated";
  try {
    const derived = deriveIndianaFacts("in_collateral_action", facts);
    resolvePacket({ jurisdiction: "IN", trackId: "in_collateral_action", facts: derived, allowTechnicalFixtures: true });
  } catch (error) {
    outcome = error instanceof PacketResolutionError ? "resolution_missing_required_input" : "other";
  }
  ok(outcome === "resolution_missing_required_input", `missing participant statement: got ${outcome}.`);
}

note(
  `6. Content: ${samples.reduce((n, s) => n + s.components, 0)} components render deterministically into ${samples.length} assembled packets, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no prohibited content.`
);

// ---------------------------------------------------------------------------

console.log("");
if (failures.length > 0) {
  console.error("Indiana custom-pleading verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Indiana custom-pleading verification passed.");
for (const line of checks) console.log(line);
for (const sample of samples) {
  console.log(
    `   ${sample.trackId.padEnd(24)} ${String(sample.pageCount).padStart(2)} pages  ${sample.sha256}  ${sample.fileName}`
  );
}
console.log("7. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

function sha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function pdfText(file) {
  const result = spawnSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`pdftotext failed for ${file}: ${result.stderr}`);
  return result.stdout.replace(/-\n\s*/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
}
function pdfPageTexts(file) {
  const pageCount = Number(
    (spawnSync("pdfinfo", [file], { encoding: "utf8" }).stdout.match(/^Pages:\s+(\d+)/m) ?? [])[1] ?? 0
  );
  const pages = [];
  for (let page = 1; page <= pageCount; page += 1) {
    pages.push(
      spawnSync("pdftotext", ["-layout", "-f", String(page), "-l", String(page), file, "-"], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024
      }).stdout
    );
  }
  return pages;
}
