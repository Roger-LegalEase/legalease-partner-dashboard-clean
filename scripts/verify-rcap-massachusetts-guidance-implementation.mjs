// Massachusetts guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Massachusetts is not enabled, the
// family is recommended for counsel adoption but not adopted, the component
// matches the adopted design, the route renders deterministically into one
// final guidance PDF, sealing and expungement are never used interchangeably,
// no court petition is generated or recommended for a disposition that already
// seals, the Request Not to Seal is described as a decline rather than an
// application, the pre-implementation record routes to correspondence rather
// than a petition, a still-appearing record is NOT a stop on its own, every
// typed stop names a concrete destination, and every closed list fails closed.

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
const ma = await import("@/lib/rcap/packets/jurisdictions/massachusetts/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/massachusetts-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);
const integrationValidation =
  process.env.RCAP_FACTORY_VALIDATION_SCOPE === "integration";

const TRACK_ID = "ma-autoseal";
const MY_TRACK_IDS = ma.MASSACHUSETTS_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(ma.MASSACHUSETTS_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 1 && MY_TRACK_IDS[0] === TRACK_ID, `expected exactly ${TRACK_ID}, got ${MY_TRACK_IDS.join(",")}.`);
ok(MY_TEMPLATE_IDS.length === 1, `expected 1 template, got ${MY_TEMPLATE_IDS.length}.`);
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "MA" && !t.technicalFixture).length === 0,
  "a non-fixture Massachusetts relief track is already wired into the shared registry.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: the assigned route is not in the shared registry or guidance pack.");

for (const t of ma.MASSACHUSETTS_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, ma.MASSACHUSETTS_GUIDANCE_TEMPLATES);

ok(ma.MASSACHUSETTS_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${ma.MASSACHUSETTS_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(ma.MASSACHUSETTS_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of MY_TRACK_IDS) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  ok(integrationValidation || !fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-ma-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of ma.MASSACHUSETTS_GUIDANCE_TRACKS) {
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
for (const track of ma.MASSACHUSETTS_GUIDANCE_TRACKS) {
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
  disposition: "not_guilty",
  dispositionDate: "2024-06-01",
  entryPeriod: "on_or_after_implementation",
  mixedCase: "no",
  recordStillAppears: "no_longer_appears"
};

const NEG = [
  [{ disposition: "dismissed_or_nolle" }, "mismatch", "dismissal_or_nolle_does_not_seal_on_its_own"],
  [{ disposition: "convicted" }, "mismatch", "conviction_does_not_seal_on_its_own"],
  [{ mixedCase: "yes" }, "stop", "mixed_case_with_counts_outside_this_route"],
  [{ entryPeriod: "before_implementation", recordStillAppears: "still_appears" }, "stop", "pre_implementation_record_still_appearing"],
  [{ disposition: "maybe" }, "branch"],
  [{ entryPeriod: "" }, "branch"],
  [{ recordStillAppears: "dunno" }, "branch"],
  [{ mixedCase: "unsure" }, "branch"]
];
for (const [override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { ma.deriveMassachusettsGuidanceFacts(TRACK_ID, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof ma.MassachusettsGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof ma.MassachusettsRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof ma.MassachusettsBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    ok(routeTo.length > 20, `${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()), `${detail}: generic destination.`);
    ok(/Commissioner of Probation|legal aid|sealing clinic|route/i.test(routeTo),
      `${detail}: destination names no route or institution.`);
  }
}

// The pre-implementation stop must send the participant to correspondence, and
// must never send them to a court petition.
{
  let routeTo = "";
  try { ma.deriveMassachusettsGuidanceFacts(TRACK_ID, { ...BASE, entryPeriod: "before_implementation", recordStillAppears: "still_appears" }); }
  catch (e) { routeTo = e.routeTo ?? ""; }
  ok(/write to the Commissioner of Probation/i.test(routeTo),
    "the pre-implementation stop does not route to correspondence with the Commissioner's office.");
  ok(!/petition|pleading|court filing/i.test(routeTo.replace(/rather than a court pleading/i, "")),
    "the pre-implementation stop routes to a petition, which the design forbids.");
}
// A still-appearing record on or after the implementation date must keep the
// packet: it is the case the verification half is written for.
for (const v of ["still_appears", "have_not_checked", "no_longer_appears"]) {
  let outcome = "generated";
  try { ma.deriveMassachusettsGuidanceFacts(TRACK_ID, { ...BASE, recordStillAppears: v }); } catch { outcome = "refused"; }
  ok(outcome === "generated", `recordStillAppears=${v} on an in-scope record was refused.`);
}
// All three self-sealing dispositions must generate.
for (const d of ["not_guilty", "no_bill", "no_probable_cause"]) {
  let outcome = "generated";
  try { ma.deriveMassachusettsGuidanceFacts(TRACK_ID, { ...BASE, disposition: d }); } catch { outcome = "refused"; }
  ok(outcome === "generated", `self-sealing disposition ${d} was refused.`);
}
note(`4. Stops: ${NEG.length} negative cases fail closed with concrete destinations; the pre-implementation stop routes to correspondence not a petition, and all three self-sealing dispositions generate.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

// The sheet must name expungement to contrast it with sealing, so the ban is
// per sentence and skips any sentence drawing that contrast.
// Split on full stops only. The contrast that makes the copy correct is written
// as one sentence with a semicolon — "Sealing does not destroy the record;
// expungement does" — and splitting on the semicolon would tear the clause away
// from the very words that disclaim it.
function conflatesTerms(text) {
  return text.split(/(?<=\.)\s+/).some(
    (s) => /\bexpunge|\bexpungement/i.test(s) &&
      !/\b(not the same|does not destroy|destroys|apart|never|rather than|is sealing|cannot)\b/i.test(s)
  );
}
const PROHIBITED = [
  [{ test: conflatesTerms }, "expungement used as a synonym for sealing"],
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  // Never push the paragraph 2 court petition for a self-sealing disposition.
  [{
    test: (t) => t.split(/(?<=[.;])\s+/).some(
      (s) => /(file|bring|submit) (a|the) (court )?petition/i.test(s) &&
        !/\b(do not|not|never|would spend|wrong)\b/i.test(s)
    )
  }, "a recommendation to file a court petition for a disposition that already seals"],
  [/Request Not to Seal (is|as) (an|the) application|apply using (the )?OCPS004/i,
    "the Request Not to Seal misdescribed as an application for relief"]
];

const samples = [];
for (const track of ma.MASSACHUSETTS_GUIDANCE_TRACKS) {
  const facts = ma.deriveMassachusettsGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "MA", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "MA", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "MA", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "MA", jurisdictionName: "Massachusetts",
    packetName: resolved.track.assembledPacketName, caseReference: "2401CR001234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "MA", jurisdictionName: "Massachusetts",
    packetName: resolved.track.assembledPacketName, caseReference: "2401CR001234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say whether the participant files anything.`);
  ok(/Sealing does not destroy the record/i.test(text), `${track.trackId}: does not separate sealing from expungement.`);
  ok(/Do not bring a court petition/i.test(text), `${track.trackId}: does not warn against the wasted petition.`);
  ok(/Request Not to Seal/i.test(text), `${track.trackId}: does not name the decline form.`);
  ok(/solely to DECLINE|opposite of what people expect/i.test(text),
    `${track.trackId}: does not describe the form as a decline rather than an application.`);
  ok(/11 March 2024/.test(text), `${track.trackId}: omits the implementation date.`);
  ok(/correspondence rather than a pleading|correspondence, not a pleading/i.test(text),
    `${track.trackId}: does not describe the older-record route as correspondence.`);
  ok(/CORI/.test(text), `${track.trackId}: does not send the participant to their own CORI.`);
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
    const d = ma.deriveMassachusettsGuidanceFacts(TRACK_ID, f);
    resolvePacket({ jurisdiction: "MA", trackId: TRACK_ID, facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing dispositionDate: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifact renders deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Massachusetts guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Massachusetts guidance verification passed.");
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
