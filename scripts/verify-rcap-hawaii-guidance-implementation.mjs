// Hawaii guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Hawaii is not enabled, the family
// is recommended for counsel adoption but not adopted, the component matches
// the adopted design, the route renders deterministically into one final
// guidance PDF, the sheet never promises the record will be cleared
// automatically and states no completion date or processed volume, the county
// scope and the petition fallback are both surfaced, a still-visible record is
// NOT turned into a stop, every typed stop names a concrete destination, and
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
const hi = await import("@/lib/rcap/packets/jurisdictions/hawaii/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/hawaii-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);
const integrationValidation =
  process.env.RCAP_FACTORY_VALIDATION_SCOPE === "integration";

const TRACK_ID = "hi_state_initiated_marijuana_pilot";
const MY_TRACK_IDS = hi.HAWAII_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(hi.HAWAII_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 1 && MY_TRACK_IDS[0] === TRACK_ID, `expected exactly ${TRACK_ID}, got ${MY_TRACK_IDS.join(",")}.`);
ok(MY_TEMPLATE_IDS.length === 1, `expected 1 template, got ${MY_TEMPLATE_IDS.length}.`);
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "HI" && !t.technicalFixture).length === 0,
  "a non-fixture Hawaii relief track is already wired into the shared registry.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: the assigned route is not in the shared registry or guidance pack.");

for (const t of hi.HAWAII_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, hi.HAWAII_GUIDANCE_TEMPLATES);

ok(hi.HAWAII_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${hi.HAWAII_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(hi.HAWAII_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of MY_TRACK_IDS) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  ok(integrationValidation || !fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-hi-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of hi.HAWAII_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Adoption and promotion: 1 track runtime_disabled, recommended_for_counsel_adoption, counselAdopted false, ${integrationValidation ? "captain-owned proof permitted during integration" : "no integration-owned proof written"}.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of hi.HAWAII_GUIDANCE_TRACKS) {
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
  immigrationMatter: "no",
  countyOfConviction: "hawaii_county",
  goal: "understand_the_pilot_and_check",
  recordStillVisible: "still_appears"
};

const NEG = [
  [{ immigrationMatter: "yes" }, "stop", "immigration_matter_in_play"],
  [{ goal: "needs_relief_the_pilot_does_not_reach" }, "mismatch", "needs_relief_outside_the_pilot"],
  [{ countyOfConviction: "honolulu_county" }, "mismatch", "conviction_outside_the_pilot_county_scope"],
  [{ countyOfConviction: "maui_county" }, "mismatch", "conviction_outside_the_pilot_county_scope"],
  [{ countyOfConviction: "kauai_county" }, "mismatch", "conviction_outside_the_pilot_county_scope"],
  [{ countyOfConviction: "oahu" }, "branch"],
  [{ goal: "" }, "branch"],
  [{ recordStillVisible: "dunno" }, "branch"],
  [{ immigrationMatter: "maybe" }, "branch"]
];
for (const [override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { hi.deriveHawaiiGuidanceFacts(TRACK_ID, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof hi.HawaiiGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof hi.HawaiiRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof hi.HawaiiBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    ok(routeTo.length > 20, `${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()), `${detail}: generic destination.`);
    ok(/petition route|legal aid|public defender|immigration lawyer/i.test(routeTo),
      `${detail}: destination names no route or institution.`);
  }
}

// The whole point of the sheet: a record that still appears, or has not been
// checked, keeps the packet. Nobody is told when the pilot reaches a case.
for (const v of ["still_appears", "have_not_checked", "no_longer_appears"]) {
  let outcome = "generated";
  try { hi.deriveHawaiiGuidanceFacts(TRACK_ID, { ...BASE, recordStillVisible: v }); } catch { outcome = "refused"; }
  ok(outcome === "generated", `recordStillVisible=${v} was refused, but it is the case the sheet exists for.`);
}
// An unsure county must not be routed away — the sheet tells them how to find out.
{
  let outcome = "generated";
  try { hi.deriveHawaiiGuidanceFacts(TRACK_ID, { ...BASE, countyOfConviction: "unsure" }); } catch { outcome = "refused"; }
  ok(outcome === "generated", "an unsure county was refused rather than being told how to establish it.");
}
note(`4. Stops: ${NEG.length} negative cases fail closed with concrete destinations; a still-visible, unchecked or unsure-county case keeps the packet.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  // The design's absolute instruction. The sheet has to quote the promise in
  // order to refuse it, so the ban is per sentence and skips any sentence that
  // is disclaiming rather than making the promise.
  [{
    test: (t) => t.split(/(?<=[.;])\s+/).some(
      (s) => /your record will be cleared|will be cleared automatically|has been cleared for you|record has been expunged/i.test(s) &&
        !/\b(will not tell you|cannot|nobody can|not the same as|does not promise|no page|never)\b/i.test(s)
    )
  }, "a promise that the record will be or has been cleared automatically"],
  [/will be (cleared|expunged) (on|by) \w+ \d/i, "a completion date"],
  [/\b[\d,]{3,}\s+(records|convictions) (have been|were) (cleared|expunged|processed)/i,
    "a processed-volume claim the design does not support"],
  [/you (are|will be) eligible, so|since you qualify, your record/i,
    "implying that pilot eligibility means relief has occurred"]
];

const samples = [];
for (const track of hi.HAWAII_GUIDANCE_TRACKS) {
  const facts = hi.deriveHawaiiGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "HI", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "HI", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "HI", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "HI", jurisdictionName: "Hawaii",
    packetName: resolved.track.assembledPacketName, caseReference: "3DCW-19-0001234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "HI", jurisdictionName: "Hawaii",
    packetName: resolved.track.assembledPacketName, caseReference: "3DCW-19-0001234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say whether the participant files anything.`);
  ok(/state initiates the pilot/i.test(text), `${track.trackId}: does not say the state initiates the pilot.`);
  ok(/will not tell you that your record will be cleared automatically/i.test(text),
    `${track.trackId}: does not refuse the automatic-clearing promise.`);
  ok(/not the same as the pilot having reached/i.test(text),
    `${track.trackId}: does not separate pilot scope from relief having occurred.`);
  ok(/Hawaii County/i.test(text), `${track.trackId}: omits the pilot's county scope.`);
  ok(/petition route/i.test(text), `${track.trackId}: suppresses the petition fallback.`);
  ok(/does not obtain, receive or inspect/i.test(text), `${track.trackId}: does not disclaim handling the record.`);
  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  ok(pages.length === asm.pageCount, `${track.trackId}: page count disagrees with the assembled PDF.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

{
  const f = { ...BASE }; delete f.countyOfConviction;
  let outcome = "generated";
  try { hi.deriveHawaiiGuidanceFacts(TRACK_ID, f); }
  catch (e) { outcome = e instanceof hi.HawaiiBranchError ? "branch_refused" : "other"; }
  ok(outcome === "branch_refused", `missing countyOfConviction: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifact renders deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Hawaii guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Hawaii guidance verification passed.");
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
