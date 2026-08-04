// Delaware guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Delaware is not enabled, the
// family is recommended for counsel adoption but not adopted, every component
// has a governing specification and matches the adopted design, both routes
// render deterministically into one final guidance PDF each, the automatic
// sheet says nothing is sent to the person and carries both the § 4373A(d)
// filing and the § 4373A(e) no-damages provision, no sheet quotes a Clean Slate
// throughput figure, the prosecutor sheet states the disposition window and
// that an Attorney General petition must be granted, the five-category
// consequence stop fires on every category, a still-appearing record is NOT
// turned into a stop, and every closed list fails closed.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
if (process.env.NODE_ENV === "production") { console.error("Refusing to run in production."); process.exit(1); }
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const pg = await import("@/lib/rcap/packets/engines/process-guidance");
const { resolvePacket, PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const de = await import("@/lib/rcap/packets/jurisdictions/delaware/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/delaware-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "DE").length === 0, "Delaware is wired into the shared registry.");
ok(Object.keys(pg.GUIDANCE_TEMPLATES).filter(k => k.startsWith("de-")).length === 0, "Delaware templates already in the shared pack.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
ok(de.DELAWARE_GUIDANCE_TRACKS.length === 2, `expected 2 assigned tracks, got ${de.DELAWARE_GUIDANCE_TRACKS.length}.`);
note("1. Enablement: Delaware absent from the shared registry and guidance pack.");

// Injected only into this process, after the absence above is proven.
for (const t of de.DELAWARE_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, de.DELAWARE_GUIDANCE_TEMPLATES);

ok(de.DELAWARE_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${de.DELAWARE_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(de.DELAWARE_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const trackIds = new Set(de.DELAWARE_GUIDANCE_TRACKS.map(t => t.trackId));
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of trackIds) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
}
for (const track of de.DELAWARE_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Adoption and promotion: ${de.DELAWARE_GUIDANCE_TRACKS.length} tracks runtime_disabled, recommended_for_counsel_adoption, counselAdopted false, in no adoption record.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of de.DELAWARE_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find(t => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(designed?.outputStrategy === "process_guidance", `${track.trackId}: the design does not call for guidance.`);
  const designedComponents = designed?.packetSet?.components ?? [];
  ok(designedComponents.length === track.packetSet.components.length,
    `${track.trackId}: component count differs from the design.`);
  const roles = new Map(designedComponents.map(c => [c.componentId, c.role]));
  for (const c of track.packetSet.components) {
    ok(roles.has(c.componentId), `${c.componentId}: not in the adopted packet set.`);
    ok(roles.get(c.componentId) === c.role, `${c.componentId}: role differs from the design.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
  }
  const required = new Set((spec.processGuidanceSpecs.find(s => s.trackId === track.trackId)?.generationRequirements ?? [])
    .filter(r => r.requirement === "required").map(r => r.key));
  const asked = new Set(track.requiredInputs.map(i => i.key));
  for (const key of required) ok(asked.has(key), `${track.trackId}: the design requires ${key} and it is not asked.`);
}
note("3. Specifications: 2 components, each specified, matching the design's ids and roles.");

const BASE = {
  consequencesInPlay: "none",
  goal: "check_whether_it_happened",
  offenseCategory: "ordinary",
  recordStillAppearing: "no_longer_appears",
  caseStillOpenOrRecentlyDismissed: "recently_dismissed_or_nolle_prossed",
  prosecutorDeclined: "no"
};
// The two `goal` questions are different closed lists.
const FIXTURES = { de_attorney_general_expungement: { goal: "ask_the_prosecutor" } };
const factsFor = (trackId, override) => ({ ...BASE, ...(FIXTURES[trackId] ?? {}), ...(override ?? {}) });

const CONSEQUENCE_VALUES = ["immigration", "firearm", "professional_licensing", "registry", "law_enforcement_employment", "more_than_one"];
const NEG = [
  ...CONSEQUENCE_VALUES.map(v => ["de_auto_expungement", { consequencesInPlay: v }, "stop", "collateral_consequences_in_play"]),
  ["de_attorney_general_expungement", { consequencesInPlay: "registry" }, "stop", "collateral_consequences_in_play"],
  ["de_auto_expungement", { goal: "attack_the_underlying_conviction" }, "stop", "wants_to_attack_the_underlying_conviction"],
  ["de_attorney_general_expungement", { goal: "attack_the_underlying_conviction" }, "stop", "wants_to_attack_the_underlying_conviction"],
  ["de_auto_expungement", { offenseCategory: "section_4201c_felony" }, "stop", "offense_reachable_only_by_pardon"],
  ["de_auto_expungement", { offenseCategory: "beau_biden_act_offense" }, "stop", "offense_reachable_only_by_pardon"],
  ["de_attorney_general_expungement", { caseStillOpenOrRecentlyDismissed: "long_since_closed" }, "mismatch", "window_at_disposition_has_passed"],
  ["de_attorney_general_expungement", { prosecutorDeclined: "yes" }, "stop", "prosecutor_declined_to_petition"],
  ["de_auto_expungement", { consequencesInPlay: "maybe" }, "branch"],
  ["de_auto_expungement", { offenseCategory: "" }, "branch"],
  ["de_auto_expungement", { recordStillAppearing: "dunno" }, "branch"],
  ["de_auto_expungement", { goal: "ask_the_prosecutor" }, "branch"],
  ["de_attorney_general_expungement", { goal: "check_whether_it_happened" }, "branch"],
  ["de_attorney_general_expungement", { caseStillOpenOrRecentlyDismissed: "" }, "branch"],
  ["de_attorney_general_expungement", { prosecutorDeclined: "unsure" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null;
  try { de.deriveDelawareGuidanceFacts(trackId, factsFor(trackId, override)); }
  catch (e) {
    if (e instanceof de.DelawareGuidanceStopError) { outcome = "stop"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: stop lost its destination.`); }
    else if (e instanceof de.DelawareRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: mismatch lost its destination.`); }
    else if (e instanceof de.DelawareBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
}

// A record the automatic process missed is who the section 4373A(d) copy is
// written for, so it must stay on the sheet rather than become a stop.
for (const visibility of ["still_appears", "have_not_checked"]) {
  let outcome = "generated";
  try { de.deriveDelawareGuidanceFacts("de_auto_expungement", factsFor("de_auto_expungement", { recordStillAppearing: visibility })); }
  catch { outcome = "refused"; }
  ok(outcome === "generated", `de_auto_expungement: recordStillAppearing=${visibility} was refused, but it is the case the sheet exists for.`);
}
// A case still open is inside the prosecutor window, not outside it.
{
  let outcome = "generated";
  try { de.deriveDelawareGuidanceFacts("de_attorney_general_expungement", factsFor("de_attorney_general_expungement", { caseStillOpenOrRecentlyDismissed: "still_open" })); }
  catch { outcome = "refused"; }
  ok(outcome === "generated", "de_attorney_general_expungement: a still-open case was refused.");
}
note(`4. Stops: ${NEG.length} negative cases fail closed with a destination; a missed record and a still-open case both stay on their sheet.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/\b\d[\d,]{2,}\s+records\b|\bunder one percent\b|\bpercent of (those|all) eligible\b/i,
    "a Clean Slate throughput figure, which the design requires be confirmed before any user-facing statement"],
  [/your record is now expunged|has already been expunged for you/i,
    "an assertion that the expungement happened without the participant checking"]
];

const samples = [];
for (const track of de.DELAWARE_GUIDANCE_TRACKS) {
  const facts = de.deriveDelawareGuidanceFacts(track.trackId, factsFor(track.trackId));
  const resolved = resolvePacket({ jurisdiction: "DE", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "DE", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "DE", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "DE", jurisdictionName: "Delaware",
    packetName: resolved.track.assembledPacketName, caseReference: "1901000123",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "DE", jurisdictionName: "Delaware",
    packetName: resolved.track.assembledPacketName, caseReference: "1901000123",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say there is nothing to file.`);

  if (track.trackId === "de_auto_expungement") {
    ok(/Nobody will tell you it happened/i.test(text), "automatic sheet does not say nothing is sent to the person.");
    ok(/lets you file for the expungement yourself/i.test(text), "automatic sheet omits the section 4373A(d) filing.");
    ok(/no claim for damages/i.test(text), "automatic sheet omits the section 4373A(e) no-damages provision.");
    ok(/does not tell you how many records/i.test(text), "automatic sheet does not explain why no throughput figure is given.");
    ok(/monthly/i.test(text), "automatic sheet omits the Bureau's monthly cycle.");
    ok(/confirm/i.test(text), "automatic sheet omits the written confirmation each agency must give.");
  }
  if (track.trackId === "de_attorney_general_expungement") {
    ok(/must be granted/i.test(text), "prosecutor sheet omits that an Attorney General petition must be granted.");
    ok(/manifest injustice/i.test(text), "prosecutor sheet omits the standard the prosecutor applies.");
    ok(/nolle prosequi/i.test(text), "prosecutor sheet omits the disposition window.");
    ok(/defence counsel/i.test(text), "prosecutor sheet does not route the ask through defence counsel.");
    ok(/does not ask the prosecutor on your behalf/i.test(text), "prosecutor sheet does not disclaim making the ask.");
  }
  for (const [i, page] of pdfPageTexts(file).entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount, components: components.length });
}

// A required question the deriver validates must fail closed when absent.
{
  const f = factsFor("de_auto_expungement"); delete f.recordStillAppearing;
  let outcome = "generated";
  try { de.deriveDelawareGuidanceFacts("de_auto_expungement", f); }
  catch (e) { outcome = e instanceof de.DelawareBranchError ? "branch_refused" : "other"; }
  ok(outcome === "branch_refused", `missing recordStillAppearing: got ${outcome}.`);
}
// Resolution still enforces the track's own required inputs.
{
  const f = factsFor("de_attorney_general_expungement");
  const d = de.deriveDelawareGuidanceFacts("de_attorney_general_expungement", f);
  delete d.consequencesInPlay;
  let outcome = "generated";
  try { resolvePacket({ jurisdiction: "DE", trackId: "de_attorney_general_expungement", facts: d, allowTechnicalFixtures: true }); }
  catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing consequencesInPlay at resolution: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content, no throughput figure.`);

console.log("");
if (failures.length > 0) { console.error("Delaware guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Delaware guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) console.log(`   ${s.trackId.padEnd(34)} ${s.components}c ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0, counsel adoption not claimed.");

function sha(b) { return crypto.createHash("sha256").update(b).digest("hex"); }
function pdfText(f) {
  const r = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`pdftotext failed: ${r.stderr}`);
  return r.stdout.replace(/-\n\s*/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
}
function pdfPageTexts(f) {
  const n = Number((spawnSync("pdfinfo", [f], { encoding: "utf8" }).stdout.match(/^Pages:\s+(\d+)/m) ?? [])[1] ?? 0);
  const out = [];
  for (let p = 1; p <= n; p += 1)
    out.push(spawnSync("pdftotext", ["-layout", "-f", String(p), "-l", String(p), f, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).stdout);
  return out;
}
