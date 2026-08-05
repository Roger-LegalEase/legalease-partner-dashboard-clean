// Indiana guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Indiana is not enabled, the family
// is recommended for counsel adoption but not adopted, the component matches
// the adopted design, the route renders deterministically into one final
// guidance PDF, no sheet says an Indiana record is destroyed, the staggered
// timing and the public expungement case file are stated, delay is
// distinguished from absence so the wrong petition is not filed, a record that
// has not yet cleared is NOT turned into a stop, every typed stop names a
// concrete destination, and every closed list fails closed.

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
const inn = await import("@/lib/rcap/packets/jurisdictions/indiana/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/indiana-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

const TRACK_ID = "in_auto_expungement";
const MY_TRACK_IDS = inn.INDIANA_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(inn.INDIANA_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 1 && MY_TRACK_IDS[0] === TRACK_ID, `expected exactly ${TRACK_ID}, got ${MY_TRACK_IDS.join(",")}.`);
ok(MY_TEMPLATE_IDS.length === 1, `expected 1 template, got ${MY_TEMPLATE_IDS.length}.`);
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "IN" && !t.technicalFixture).length === 0,
  "a non-fixture Indiana relief track is already wired into the shared registry.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: the assigned route is not in the shared registry or guidance pack.");

for (const t of inn.INDIANA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, inn.INDIANA_GUIDANCE_TEMPLATES);

ok(inn.INDIANA_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${inn.INDIANA_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(inn.INDIANA_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of MY_TRACK_IDS) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  ok(!fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-in-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of inn.INDIANA_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
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
for (const track of inn.INDIANA_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find(t => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(designed?.outputStrategy === "process_guidance", `${track.trackId}: the design does not call for guidance.`);
  const dc = designed?.packetSet?.components ?? [];
  ok(dc.length === track.packetSet.components.length, `${track.trackId}: component count differs from the design.`);
  const roles = new Map(dc.map(c => [c.componentId, c.role]));
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
  chargedAfterJune2022: "yes",
  disposition: "all_charges_dismissed",
  dispositionDate: "2024-03-04",
  courtHasActed: "no_order_yet",
  inPretrialDiversion: "no",
  prosecutorMovedToDelay: "no"
};

const NEG = [
  [{ chargedAfterJune2022: "no" }, "mismatch", "case_predates_the_cutoff"],
  [{ disposition: "convicted" }, "mismatch", "matter_ended_in_a_conviction"],
  [{ inPretrialDiversion: "yes" }, "stop", "currently_in_a_pretrial_diversion_programme"],
  [{ prosecutorMovedToDelay: "yes" }, "stop", "prosecutor_moved_to_delay_the_order"],
  [{ chargedAfterJune2022: "maybe" }, "branch"],
  [{ disposition: "" }, "branch"],
  [{ courtHasActed: "dunno" }, "branch"],
  [{ prosecutorMovedToDelay: "unsure" }, "branch"]
];
for (const [override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { inn.deriveIndianaGuidanceFacts(TRACK_ID, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof inn.IndianaGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof inn.IndianaRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof inn.IndianaBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    ok(routeTo.length > 20, `${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()), `${detail}: generic destination.`);
    ok(/petition route|legal aid|public defender|clerk|defence lawyer|programme supervisor/i.test(routeTo),
      `${detail}: destination names no route or institution.`);
  }
}

// The core protection: an order that has not been entered must NOT be treated
// as a failure, because the statute's own timing makes "not yet" the norm.
for (const v of ["no_order_yet", "have_not_checked", "order_entered"]) {
  let outcome = "generated";
  try { inn.deriveIndianaGuidanceFacts(TRACK_ID, { ...BASE, courtHasActed: v }); } catch { outcome = "refused"; }
  ok(outcome === "generated", `courtHasActed=${v} was refused, but a pending order is the ordinary case this sheet exists for.`);
}
// Every qualifying disposition must generate.
for (const d of ["all_charges_dismissed", "acquitted_all_charges", "vacated", "no_true_finding", "one_year_no_disposition"]) {
  let outcome = "generated";
  try { inn.deriveIndianaGuidanceFacts(TRACK_ID, { ...BASE, disposition: d }); } catch { outcome = "refused"; }
  ok(outcome === "generated", `qualifying disposition ${d} was refused.`);
}
note(`4. Stops: ${NEG.length} negative cases fail closed with concrete destinations; a pending order keeps the packet and all five qualifying dispositions generate.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  // Indiana expungement seals or restricts. It never destroys.
  [{
    test: (t) => t.split(/(?<=[.;])\s+/).some(
      (s) => /\b(destroyed|deleted|erased|shredded)\b/i.test(s) &&
        !/\b(not|never|rather than|nothing is)\b/i.test(s)
    )
  }, "a claim that an Indiana record is destroyed, deleted or erased"],
  // The sheet has to name the non-existent petition in order to deny it, so the
  // ban is per sentence and skips any sentence that is denying rather than
  // asserting one.
  [{
    test: (t) => t.split(/(?<=[.;])\s+/).some(
      (s) => /petition under this (part|subsection)|file (a|the) petition to trigger/i.test(s) &&
        !/\b(no|not|none|never|does not|is not)\b/i.test(s)
    )
  }, "an invented petition under the automatic subsection"],
  [/hearing will be (set|held)|you must serve the prosecutor/i,
    "an invented hearing or prosecutor service"],
  [/order will be entered (on|by) \w+ \d|processed within \d+ (days|weeks)/i,
    "a guaranteed processing date"]
];

const samples = [];
for (const track of inn.INDIANA_GUIDANCE_TRACKS) {
  const facts = inn.deriveIndianaGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "IN", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "IN", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "IN", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "IN", jurisdictionName: "Indiana",
    packetName: resolved.track.assembledPacketName, caseReference: "49D01-2301-CM-001234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "IN", jurisdictionName: "Indiana",
    packetName: resolved.track.assembledPacketName, caseReference: "49D01-2301-CM-001234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say whether the participant files anything.`);
  ok(/own motion/i.test(text), `${track.trackId}: does not say the court acts on its own motion.`);
  ok(/Nothing is destroyed/i.test(text), `${track.trackId}: does not correct the destruction misconception.`);
  ok(/sealed or restricted/i.test(text), `${track.trackId}: does not say what Indiana expungement actually does.`);
  ok(/immediately/i.test(text), `${track.trackId}: omits the immediate effect for non-prosecution orders.`);
  ok(/sixty days/i.test(text), `${track.trackId}: omits the sixty-day floor.`);
  ok(/up to a year/i.test(text), `${track.trackId}: omits the prosecutor's delay motion.`);
  ok(/do not read a record that still shows as a failure/i.test(text),
    `${track.trackId}: does not distinguish delay from failure.`);
  ok(/case file itself is public/i.test(text), `${track.trackId}: omits that the expungement case file is public.`);
  ok(/30 June 2022/.test(text), `${track.trackId}: omits the cutoff.`);
  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  ok(pages.length === asm.pageCount, `${track.trackId}: page count disagrees with the assembled PDF.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

{
  const f = { ...BASE }; delete f.dispositionDate;
  let outcome = "generated";
  try {
    const d = inn.deriveIndianaGuidanceFacts(TRACK_ID, f);
    resolvePacket({ jurisdiction: "IN", trackId: TRACK_ID, facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing dispositionDate: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifact renders deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Indiana guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Indiana guidance verification passed.");
for (const l of checks) console.log(l);
console.log("");
console.log("FINAL PACKET RESULT");
for (const s of samples) console.log(`   ${s.trackId.padEnd(36)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
