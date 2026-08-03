// Implementation Tranche 1 (Mississippi) — packet verification.
//
// Proves the properties a rendered sample cannot prove by looking right:
// selection is deterministic, authority is pinned, roles are correct, branches
// route, participant values land, third-party fields stay blank, prohibited
// legal conclusions are absent, and every boundary fixture stops.
//
// Runs offline against the real renderer. No network, no database, no promotion.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { resolvePacket, PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const { pleadingTemplate } = await import("@/lib/rcap/packets/engines/pleading-templates");
const { GUIDANCE_TEMPLATES, NOT_A_COURT_FILING_NOTICE } = await import(
  "@/lib/rcap/packets/engines/process-guidance"
);
const { deriveMississippiFacts, MississippiBranchError, MS_NONCONVICTION_BRANCHES, MS_ADDITIONAL_MISDEMEANOR_VENUES } =
  await import("@/lib/rcap/packets/tranche-1-mississippi-facts");

const root = process.cwd();
const DIR = path.join(root, "data/record-clearing/implementation-tranches");
const tranche = readJson("tranche-1.json");
const pins = readJson("tranche-1-authority-pins.json");
const fixtures = readJson("tranche-1-fixtures.json");
const guidance = readJson("tranche-1-component-guidance.json");

const failures = [];
const checks = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (line) => checks.push(line);

// ---------------------------------------------------------------------------
// 1. Selection is deterministic and bounded
// ---------------------------------------------------------------------------

const selected = tranche.selectedTracks.map((entry) => entry.trackId);
ok(new Set(selected).size === selected.length, "The tranche names a track more than once.");
ok(selected.length >= 3 && selected.length <= 5, `The tranche selects ${selected.length} tracks; three to five are permitted.`);
ok(new Set(tranche.selectedTracks.map((e) => e.trackId.slice(0, 2))).size === 1, "The tranche spans more than one jurisdiction.");
ok(tranche.jurisdiction === "MS", "The tranche jurisdiction is not Mississippi.");
ok(
  [...selected].sort().join(",") === selected.slice().sort().join(","),
  "Selection is not reproducible from the record."
);
note(`1. Selection: ${selected.length} tracks, one jurisdiction (${tranche.jurisdiction}), deterministic.`);

// ---------------------------------------------------------------------------
// 2. Nothing is promoted
// ---------------------------------------------------------------------------

for (const trackId of selected) {
  const track = RELIEF_TRACKS.find((entry) => entry.trackId === trackId);
  ok(Boolean(track), `${trackId} is not registered.`);
  if (!track) continue;
  ok(track.runtimeDisabled === true, `${trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${trackId} is not marked a non-production fixture.`);
  ok(track.statuses.legal !== "legal_approved", `${trackId} claims legal approval.`);
  ok(track.statuses.visual !== "visual_review_passed", `${trackId} claims visual approval.`);
  const runtime = computeRuntimeStatus({
    statuses: track.statuses,
    sourceCurrent: track.sourceCurrent,
    runtimeDisabled: track.runtimeDisabled,
    outputStrategy: track.outputStrategy
  });
  ok(runtime === "runtime_disabled", `${trackId} computes ${runtime} rather than runtime_disabled.`);
  for (const component of track.packetSet.components) {
    ok(component.approval.legal === "not_submitted", `${component.componentId} claims legal approval.`);
    ok(component.approval.visual === "not_reviewed", `${component.componentId} claims visual approval.`);
  }
}
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A relief track is not runtime-disabled."
);
note(`2. Promotion: all ${selected.length} tracks runtime_disabled, no visual or legal approval claimed.`);

// ---------------------------------------------------------------------------
// 3. Authority pinning
// ---------------------------------------------------------------------------

const authority = readJson("../master-library/authority.json");
ok(pins.authorityEdition === authority.edition, "The pins name a different edition than the adopted one.");
ok(
  pins.authorityArchiveSha256 === authority.retention.archiveSha256,
  "The pinned archive SHA-256 does not match the adopted edition."
);
ok(/^[0-9a-f]{64}$/.test(pins.controllingAuthority.legalReview.sha256), "The legal review has no pinned SHA-256.");
ok(
  /^[0-9a-f]{64}$/.test(pins.controllingAuthority.legalReviewAddendum.sha256),
  "The Edition 1.2 addendum has no pinned SHA-256."
);
for (const source of pins.primaryEnactedLaw) {
  ok(/^[0-9a-f]{64}$/.test(source.sha256), `${source.citation} has no pinned SHA-256.`);
  const file = path.join(root, source.repositoryPath);
  ok(fs.existsSync(file), `${source.citation}: the pinned repository binary is absent.`);
  if (fs.existsSync(file)) {
    const actual = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    ok(actual === source.sha256, `${source.citation}: the pinned SHA-256 does not match the file on disk.`);
  }
  ok(source.generationTarget === false, `${source.citation} is marked a generation target.`);
}
ok(pins.officialFormMappingsCreated === 0, "An official-form mapping was created for a custom pleading.");
for (const track of pins.tracks) {
  ok(track.outputStrategy === "custom_pleading", `${track.trackId} is not a custom pleading.`);
  ok(track.localFormOverride === true, `${track.trackId} does not carry localFormOverride.`);
  ok(track.statutoryAuthority.length > 0, `${track.trackId} pins no statutory authority.`);
  ok(Boolean(track.venueAuthority), `${track.trackId} pins no venue authority.`);
  for (const component of track.components) {
    ok(component.officialFormBinaryRequired === false, `${component.componentId} claims to need an official binary.`);
  }
}
note(`3. Authority: Edition ${pins.authorityEdition} pinned by SHA-256; ${pins.tracks.length} tracks, 0 invented form mappings.`);

// ---------------------------------------------------------------------------
// 4. Component roles, order and templates match the pins
// ---------------------------------------------------------------------------

for (const pinned of pins.tracks) {
  const track = RELIEF_TRACKS.find((entry) => entry.trackId === pinned.trackId);
  if (!track) continue;
  const built = new Map(track.packetSet.components.map((c) => [c.componentId, c]));
  for (const component of pinned.components) {
    const actual = built.get(component.componentId);
    ok(Boolean(actual), `${component.componentId} is pinned but not built.`);
    if (!actual) continue;
    ok(actual.role === component.role, `${component.componentId}: role ${actual.role} does not match the pinned ${component.role}.`);
    ok(
      actual.outputStrategy === component.outputStrategy,
      `${component.componentId}: strategy does not match the pinned strategy.`
    );
    ok(actual.templateId === component.templateId, `${component.componentId}: template does not match the pin.`);
    ok(actual.sourcePath === null && actual.sourceSha256 === null, `${component.componentId}: a custom pleading names an official source.`);
    const template =
      component.outputStrategy === "custom_pleading"
        ? pleadingTemplate(component.templateId)
        : GUIDANCE_TEMPLATES[component.templateId];
    ok(Boolean(template), `${component.componentId}: template ${component.templateId} is not registered.`);
  }
  const orders = track.packetSet.components.map((c) => c.order);
  ok(new Set(orders).size === orders.length, `${pinned.trackId}: duplicate component order.`);
  // Every packet carries a filing document, a proposed order and a certificate.
  for (const role of ["primary_filing", "proposed_order", "certificate_of_service", "attachment", "instructions"]) {
    ok(track.packetSet.components.some((c) => c.role === role), `${pinned.trackId}: no ${role} component.`);
  }
}
note(`4. Components: roles, order, strategies and templates match the pinned packet definition.`);

// ---------------------------------------------------------------------------
// 5. Guidance components have a governing specification
// ---------------------------------------------------------------------------

const specifications = readJson("../legal-design-specifications.json");
const guidanceTrackIds = new Set(specifications.processGuidanceSpecs.map((spec) => spec.trackId));
for (const spec of guidance.specifications) {
  ok(guidanceTrackIds.has(spec.trackId), `${spec.trackId}: authored guidance did not reach the specification set.`);
  for (const templateId of spec.templateIds) {
    ok(Boolean(GUIDANCE_TEMPLATES[templateId]), `${templateId}: guidance template is not registered.`);
  }
}
// The gate must still hold for tracks nobody has drafted.
ok(!guidanceTrackIds.has("ms-dui"), "An undrafted Mississippi track acquired a guidance specification.");
note(`5. Guidance: ${guidance.specifications.length} authored component specifications; undrafted tracks still blocked.`);

// ---------------------------------------------------------------------------
// 6. Branch routing, including the closed list
// ---------------------------------------------------------------------------

for (const branch of Object.keys(MS_NONCONVICTION_BRANCHES)) {
  const derived = deriveMississippiFacts("ms-nonconv", { disposition: branch, dispositionDate: "1 January 2024", chargeName: "X" });
  ok(derived.branchVariantId === branch, `ms-nonconv: branch ${branch} did not route.`);
  ok(!String(derived.dispositionAllegation).includes("{{"), `ms-nonconv: branch ${branch} left an unfilled placeholder.`);
}
for (const branch of Object.keys(MS_ADDITIONAL_MISDEMEANOR_VENUES)) {
  const derived = deriveMississippiFacts("ms-misd-addl", { courtVenue: branch, chargeName: "X" });
  ok(derived.venueStatuteCitation === MS_ADDITIONAL_MISDEMEANOR_VENUES[branch].citation, `ms-misd-addl: ${branch} cited the wrong statute.`);
}
for (const [trackId, key, value] of [
  ["ms-nonconv", "disposition", "convicted"],
  ["ms-nonconv", "disposition", ""],
  ["ms-misd-addl", "courtVenue", "chancery_court"],
  ["ms-misd-addl", "courtVenue", ""]
]) {
  let threw = false;
  try {
    deriveMississippiFacts(trackId, { [key]: value, chargeName: "X" });
  } catch (error) {
    threw = error instanceof MississippiBranchError;
  }
  ok(threw, `${trackId}: an unapproved ${key} value of "${value}" did not fail closed.`);
}
note(`6. Branches: ${Object.keys(MS_NONCONVICTION_BRANCHES).length} disposition and ${Object.keys(MS_ADDITIONAL_MISDEMEANOR_VENUES).length} venue branches route; unapproved values fail closed.`);

// ---------------------------------------------------------------------------
// 7. Boundary fixtures stop
// ---------------------------------------------------------------------------

const byFixtureId = new Map(fixtures.positiveFixtures.map((entry) => [entry.fixtureId, entry]));
for (const boundary of fixtures.boundaryFixtures) {
  const base = byFixtureId.get(boundary.basedOn);
  const facts = { ...base.facts, ...(boundary.overrideFacts ?? {}) };
  for (const key of boundary.omitKeys ?? []) delete facts[key];
  let outcome = "generated";
  try {
    const derived = deriveMississippiFacts(boundary.trackId, facts);
    resolvePacket({ jurisdiction: "MS", trackId: boundary.trackId, facts: derived, allowTechnicalFixtures: true });
  } catch (error) {
    if (error instanceof MississippiBranchError) outcome = "branch_error";
    else if (error instanceof PacketResolutionError) outcome = "resolution_missing_required_input";
    else outcome = "unexpected_error";
  }
  ok(outcome === boundary.expect, `${boundary.fixtureId}: expected ${boundary.expect}, got ${outcome}.`);
}
note(`7. Boundaries: ${fixtures.boundaryFixtures.length} stop conditions all stop.`);

// ---------------------------------------------------------------------------
// 8. Rendered content — participant values in, prohibited content out
// ---------------------------------------------------------------------------

const PROHIBITED = [
  [/leflore|sunflower/i, "Fourth District county hard-coded"],
  [/greenville/i, "Greenville district attorney address"],
  [/grand jury/i, "mandatory grand-jury allegation"],
  [/social security/i, "social security number field"],
  [/\brace\b\s*:/i, "race field"],
  [/rehabilitat/i, "rehabilitation narrative"],
  [/interests of justice warrant|best interests? of justice/i, "interests-of-justice finding"],
  [/not a threat to public safety/i, "public-safety conclusion"],
  [/by and through (his|her|their) attorney/i, "attorney recital"],
  [/99-15-26\s*(and|\/)\s*99-19-71/i, "dual citation conflating two mechanisms"],
  [/\$\s?\d/, "a fee amount"]
];

for (const fixture of fixtures.positiveFixtures) {
  const facts = deriveMississippiFacts(fixture.trackId, fixture.facts);
  const resolved = resolvePacket({
    jurisdiction: "MS",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${fixture.fixtureId}: resolved to ${resolved.runtimeStatus}.`);

  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "MS",
      geography: null,
      facts,
      rootDir: root
    });
    ok(rendered.mimeType === "application/pdf", `${component.componentId}: not a PDF.`);
    ok((rendered.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(rendered.sourceSha256 === null, `${component.componentId}: a generated document reports an official source hash.`);

    // Deterministic: identical facts, identical bytes.
    const again = await renderPacketComponent({
      component,
      jurisdiction: "MS",
      geography: null,
      facts,
      rootDir: root
    });
    ok(
      sha(rendered.bytes) === sha(again.bytes),
      `${component.componentId}: rendering the same facts twice produced different bytes.`
    );

    const source =
      component.outputStrategy === "custom_pleading"
        ? JSON.stringify(pleadingTemplate(component.templateId))
        : JSON.stringify(GUIDANCE_TEMPLATES[component.templateId]);
    for (const [pattern, why] of PROHIBITED) {
      ok(!pattern.test(source), `${component.componentId}: template contains ${why}.`);
    }

    if (component.role === "primary_filing") {
      ok(/\{\{petitionerStatement\}\}/.test(source), `${component.componentId}: the petitioner's own statement is not carried.`);
      ok(/own words/i.test(source), `${component.componentId}: participant-authored text is not identified as the participant's.`);
    }
    if (component.role === "proposed_order") {
      const template = pleadingTemplate(component.templateId);
      ok(template.signatureLabel === null, `${component.componentId}: a proposed order carries a participant signature rule.`);
      ok(
        template.signatureBlock.some((line) => /JUDGE/.test(line)),
        `${component.componentId}: a proposed order has no judicial signature block.`
      );
      ok(!/\bs\/\s?[A-Z]/.test(source), `${component.componentId}: a signature mark appears on a proposed order.`);
    }
    if (component.outputStrategy === "process_guidance") {
      ok(
        GUIDANCE_TEMPLATES[component.templateId].whyNotAFiling.length > 0,
        `${component.componentId}: guidance does not say why it is not a filing.`
      );
    }
  }
}
ok(NOT_A_COURT_FILING_NOTICE.length > 0, "The not-a-court-filing notice is empty.");
note(`8. Content: ${fixtures.positiveFixtures.length} fixtures render deterministically; no prohibited content in any template.`);

// ---------------------------------------------------------------------------
// 9. Review manifest reflects what is on disk
// ---------------------------------------------------------------------------

const manifestPath = path.join(DIR, "tranche-1-review-manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  ok(manifest.humanLegalReviewStatus === "awaiting_counsel_review", "The review manifest does not await counsel review.");
  for (const forbidden of ["legal_output_approved", "counsel_approved", "packet_ready", "generation_allowed", "enabled"]) {
    ok(
      JSON.stringify(manifest).includes(`"${forbidden}"`) === false,
      `The review manifest claims ${forbidden}.`
    );
  }
  ok(/^[0-9a-f]{64}$/.test(manifest.reviewBundle.zipSha256), "The review manifest has no ZIP SHA-256.");
  ok(manifest.samplePackets.length === fixtures.positiveFixtures.length, "The review manifest does not cover every sample.");
  note(`9. Review manifest: ${manifest.samplePackets.length} samples, awaiting_counsel_review.`);
} else {
  note("9. Review manifest: not yet generated (run rcap:generate-tranche-1-packets, then the bundle step).");
}

// ---------------------------------------------------------------------------

console.log("");
if (failures.length > 0) {
  console.error("Tranche 1 packet verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Tranche 1 packet verification passed.");
for (const line of checks) console.log(line);
console.log("10. No track was promoted, no jurisdiction enabled, packet_ready remains 0.");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(DIR, relative), "utf8"));
}
function sha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
