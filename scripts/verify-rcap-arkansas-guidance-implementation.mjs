// Arkansas guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Arkansas is not enabled, the
// family is recommended for counsel adoption but not adopted, the component
// matches the adopted design, the route renders deterministically into one
// final guidance PDF, the sheet says the placement is negotiated rather than
// applied for, refuses to invent a post-completion filing, reports the fee,
// waiver and notarization rules as unstated rather than guessing, both design
// stop conditions name the person who can actually act, and every closed list
// fails closed.

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
const ar = await import("@/lib/rcap/packets/jurisdictions/arkansas/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/arkansas-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

const MY_TRACK_IDS = ar.ARKANSAS_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(ar.ARKANSAS_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 1, `expected 1 assigned track, got ${MY_TRACK_IDS.length}.`);
ok(MY_TEMPLATE_IDS.length === 1, `expected 1 template, got ${MY_TEMPLATE_IDS.length}.`);
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "AR" && !t.technicalFixture).length === 0,
  "a non-fixture Arkansas relief track is already wired into the shared registry.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: the assigned route is not in the shared registry or guidance pack.");

// Injected only into this process, after the absence above is proven.
for (const t of ar.ARKANSAS_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, ar.ARKANSAS_GUIDANCE_TEMPLATES);

ok(ar.ARKANSAS_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${ar.ARKANSAS_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(ar.ARKANSAS_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of MY_TRACK_IDS) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  ok(!fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-ar-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of ar.ARKANSAS_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note("2. Adoption and promotion: 1 track runtime_disabled, recommended_for_counsel_adoption, counselAdopted false, no integration-owned proof written.");

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of ar.ARKANSAS_GUIDANCE_TRACKS) {
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
note("3. Specifications: 1 component, specified, matching the design's id and role, asking every required question.");

const BASE = {
  caseActive: "finished",
  prosecutorDiscussed: "not_applicable",
  goal: "understand_what_i_already_have"
};

const NEG = [
  ["ar-preadjudication-probation", { caseActive: "still_active" }, "stop", "active_case_belongs_to_defence_counsel"],
  ["ar-preadjudication-probation", { goal: "seek_placement_now" }, "stop", "prosecutor_concurrence_is_negotiation_not_self_help"],
  ["ar-preadjudication-probation", { caseActive: "yes" }, "branch"],
  ["ar-preadjudication-probation", { goal: "" }, "branch"],
  ["ar-preadjudication-probation", { prosecutorDiscussed: "maybe" }, "branch"],
  ["ar-preadjudication-probation", { caseActive: "" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { ar.deriveArkansasGuidanceFacts(trackId, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof ar.ArkansasGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof ar.ArkansasRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof ar.ArkansasBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    ok(routeTo.length > 20, `${trackId}/${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()), `${trackId}/${detail}: generic destination.`);
    ok(/lawyer representing you|public defender/i.test(routeTo),
      `${trackId}/${detail}: destination does not name who can actually act.`);
  }
}

// A participant whose case is finished and who wants to understand what they
// have must keep the packet — that is who it is written for.
for (const discussed of ["yes", "no", "not_applicable"]) {
  let outcome = "generated";
  try { ar.deriveArkansasGuidanceFacts("ar-preadjudication-probation", { ...BASE, prosecutorDiscussed: discussed }); }
  catch { outcome = "refused"; }
  ok(outcome === "generated", `ar-preadjudication-probation: prosecutorDiscussed=${discussed} was refused on a finished case.`);
}
note(`4. Stops: ${NEG.length} negative cases fail closed, each naming the defence lawyer or public defender who can act; a finished case keeps the packet.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount the source review does not state"],
  [/notary public|sworn to and subscribed/i, "a notarization requirement the source review does not state"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/complete (the|this) form|submit (the|this) (application|request) (to|for) (the )?(prosecutor|court)/i,
    "an invented participant submission"],
  [/after you complete .{0,40}(file|send|submit)/i, "an invented post-completion filing"],
  [/we will ask the prosecut|LegalEase will contact/i, "LegalEase approaching the prosecutor"]
];

const samples = [];
for (const track of ar.ARKANSAS_GUIDANCE_TRACKS) {
  const facts = ar.deriveArkansasGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "AR", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "AR", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "AR", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "AR", jurisdictionName: "Arkansas",
    packetName: resolved.track.assembledPacketName, caseReference: "60CR-21-1234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "AR", jurisdictionName: "Arkansas",
    packetName: resolved.track.assembledPacketName, caseReference: "60CR-21-1234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say whether the participant files anything.`);
  ok(/not applied for on a form|is not something you apply for/i.test(text),
    `${track.trackId}: does not say the placement is negotiated rather than applied for.`);
  ok(/concur/i.test(text), `${track.trackId}: omits the prosecutor concurrence requirement.`);
  ok(/has been confirmed for this route/i.test(text) || /No separate filing/i.test(text),
    `${track.trackId}: does not refuse to invent a post-completion filing.`);
  ok(/sceptical|skeptical/i.test(text), `${track.trackId}: does not warn about anyone offering a form for it.`);
  // Unstated rules reported as unstated rather than guessed.
  ok(/does not address a fee waiver/i.test(text), `${track.trackId}: does not report the fee waiver as unaddressed.`);
  ok(/does not state a notarization requirement/i.test(text),
    `${track.trackId}: does not report the notarization rule as unstated.`);
  ok(/before the disposition/i.test(text), `${track.trackId}: does not say to raise it before the disposition.`);
  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  ok(pages.length === asm.pageCount, `${track.trackId}: page count disagrees with the assembled PDF.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

// A required question the deriver validates must fail closed when absent.
{
  const f = { ...BASE }; delete f.prosecutorDiscussed;
  let outcome = "generated";
  try { ar.deriveArkansasGuidanceFacts("ar-preadjudication-probation", f); }
  catch (e) { outcome = e instanceof ar.ArkansasBranchError ? "branch_refused" : "other"; }
  ok(outcome === "branch_refused", `missing prosecutorDiscussed: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifact renders deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Arkansas guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Arkansas guidance verification passed.");
for (const l of checks) console.log(l);
console.log("");
console.log("FINAL PACKET RESULTS");
for (const s of samples) console.log(`   ${s.trackId.padEnd(30)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
