// Colorado guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Colorado is not enabled, the
// family is recommended for counsel adoption but not adopted, every component
// has a governing specification and matches the adopted design, both routes
// render deterministically into one final guidance PDF each, each sheet tells
// the participant to check their own Bureau criminal-history report and names
// the backstop route for a sealing that did not happen, no sheet asserts that
// the record is already sealed, the immigration-licensing-firearm stop fires on
// all three consequences, a still-visible record is NOT turned into a stop, and
// every closed list fails closed.

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
const co = await import("@/lib/rcap/packets/jurisdictions/colorado/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/colorado-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "CO").length === 0, "Colorado is wired into the shared registry.");
ok(Object.keys(pg.GUIDANCE_TEMPLATES).filter(k => k.startsWith("co-")).length === 0, "Colorado templates already in the shared pack.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
ok(co.COLORADO_GUIDANCE_TRACKS.length === 2, `expected 2 assigned tracks, got ${co.COLORADO_GUIDANCE_TRACKS.length}.`);
note("1. Enablement: Colorado absent from the shared registry and guidance pack.");

// Injected only into this process, after the absence above is proven.
for (const t of co.COLORADO_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, co.COLORADO_GUIDANCE_TEMPLATES);

ok(co.COLORADO_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${co.COLORADO_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(co.COLORADO_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const trackIds = new Set(co.COLORADO_GUIDANCE_TRACKS.map(t => t.trackId));
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of trackIds) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
}
for (const track of co.COLORADO_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Adoption and promotion: ${co.COLORADO_GUIDANCE_TRACKS.length} tracks runtime_disabled, recommended_for_counsel_adoption, counselAdopted false, in no adoption record.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of co.COLORADO_GUIDANCE_TRACKS) {
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
  chargesFiled: "no",
  disposition: "dismissed",
  recordStillVisible: "no_longer_appears"
};

const NEG = [
  ["co_auto_seal_arrest", { consequencesInPlay: "immigration" }, "stop", "immigration_licensing_or_firearm_consequences"],
  ["co_auto_seal_arrest", { consequencesInPlay: "professional_licensing" }, "stop", "immigration_licensing_or_firearm_consequences"],
  ["co_auto_seal_arrest", { consequencesInPlay: "firearm" }, "stop", "immigration_licensing_or_firearm_consequences"],
  ["co_auto_seal_nonconviction", { consequencesInPlay: "more_than_one" }, "stop", "immigration_licensing_or_firearm_consequences"],
  ["co_auto_seal_arrest", { chargesFiled: "yes" }, "mismatch", "charges_were_filed"],
  ["co_auto_seal_nonconviction", { disposition: "convicted" }, "mismatch", "case_ended_in_a_conviction"],
  ["co_auto_seal_arrest", { consequencesInPlay: "maybe" }, "branch"],
  ["co_auto_seal_arrest", { chargesFiled: "" }, "branch"],
  ["co_auto_seal_nonconviction", { disposition: "probably" }, "branch"],
  ["co_auto_seal_arrest", { recordStillVisible: "dunno" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null;
  try { co.deriveColoradoGuidanceFacts(trackId, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof co.ColoradoGuidanceStopError) { outcome = "stop"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: stop lost its destination.`); }
    else if (e instanceof co.ColoradoRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: mismatch lost its destination.`); }
    else if (e instanceof co.ColoradoBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
}

// The design does not make a still-visible record a stop, and it must not
// become one: that participant is exactly who the backstop copy is written for.
for (const trackId of ["co_auto_seal_arrest", "co_auto_seal_nonconviction"]) {
  for (const visibility of ["still_appears", "have_not_checked"]) {
    let outcome = "generated";
    try { co.deriveColoradoGuidanceFacts(trackId, { ...BASE, recordStillVisible: visibility }); }
    catch { outcome = "refused"; }
    ok(outcome === "generated", `${trackId}: recordStillVisible=${visibility} was refused, but it is the case the sheet exists for.`);
  }
}
note(`4. Stops: ${NEG.length} negative cases fail closed with a destination; a still-visible record stays on the sheet rather than becoming a stop.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/your record is now sealed|has already been sealed for you|no need to check/i,
    "an assertion that the sealing happened without the participant checking"]
];

const samples = [];
for (const track of co.COLORADO_GUIDANCE_TRACKS) {
  const facts = co.deriveColoradoGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "CO", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "CO", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "CO", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "CO", jurisdictionName: "Colorado",
    packetName: resolved.track.assembledPacketName, caseReference: "2021CR001234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "CO", jurisdictionName: "Colorado",
    packetName: resolved.track.assembledPacketName, caseReference: "2021CR001234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say there is nothing to file.`);
  ok(/criminal-history report/i.test(text), `${track.trackId}: does not send the participant to their own record.`);
  ok(/does not obtain, receive or verify/i.test(text), `${track.trackId}: does not disclaim verifying the report.`);
  ok(/was not obtained for this review/i.test(text), `${track.trackId}: does not disclose the unacquired judicial guide.`);

  if (track.trackId === "co_auto_seal_arrest") {
    ok(/no charges/i.test(text), "arrest sheet does not state the no-charges condition.");
    ok(/petition to seal an arrest record/i.test(text), "arrest sheet does not name the petition backstop.");
  }
  if (track.trackId === "co_auto_seal_nonconviction") {
    ok(/at disposition/i.test(text), "non-conviction sheet does not state that sealing happens at disposition.");
    ok(/simplified motion/i.test(text), "non-conviction sheet does not name the simplified motion backstop.");
  }
  for (const [i, page] of pdfPageTexts(file).entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount, components: components.length });
}

// A required question the deriver validates must still stop resolution when absent.
{
  const f = { ...BASE }; delete f.recordStillVisible;
  let outcome = "generated";
  try {
    co.deriveColoradoGuidanceFacts("co_auto_seal_arrest", f);
  } catch (e) { outcome = e instanceof co.ColoradoBranchError ? "branch_refused" : "other"; }
  ok(outcome === "branch_refused", `missing recordStillVisible: got ${outcome}.`);

  const g = { ...BASE }; delete g.chargesFiled;
  let resolutionOutcome = "generated";
  try {
    const d = co.deriveColoradoGuidanceFacts("co_auto_seal_nonconviction", g);
    resolvePacket({ jurisdiction: "CO", trackId: "co_auto_seal_nonconviction", facts: d, allowTechnicalFixtures: true });
  } catch (e) { resolutionOutcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  // chargesFiled is not required on the non-conviction track, so this must succeed.
  ok(resolutionOutcome === "generated", `non-conviction track wrongly requires chargesFiled: got ${resolutionOutcome}.`);
}

note(`5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Colorado guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Colorado guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) console.log(`   ${s.trackId.padEnd(30)} ${s.components}c ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
