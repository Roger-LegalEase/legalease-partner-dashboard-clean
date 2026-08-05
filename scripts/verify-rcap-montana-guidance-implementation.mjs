// Montana guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Montana is not enabled, the family
// is recommended for counsel adoption but not adopted, the component matches
// the adopted design, the route renders deterministically into one final
// guidance PDF, expungement, sealing and removal are kept apart, no Record
// Removal Form is generated and no superseded form or legacy address is named,
// the sheet says the removal does not reach county court records and requires
// both portal searches, verification is not described as free, the separate
// request route exists in the adopted design and is named rather than
// generated, a still-showing record is NOT a stop, and every list fails closed.

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
const mt = await import("@/lib/rcap/packets/jurisdictions/montana/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/montana-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);
const integrationValidation =
  process.env.RCAP_FACTORY_VALIDATION_SCOPE === "integration";

const TRACK_ID = "mt_auto_nonconviction";
const MY_TRACK_IDS = mt.MONTANA_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(mt.MONTANA_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 1 && MY_TRACK_IDS[0] === TRACK_ID, `expected exactly ${TRACK_ID}, got ${MY_TRACK_IDS.join(",")}.`);
ok(MY_TEMPLATE_IDS.length === 1, `expected 1 template, got ${MY_TEMPLATE_IDS.length}.`);
// The participant-requested removal is a separate route and must stay separate.
ok(!MY_TRACK_IDS.includes("mt_nonconviction_removal"), "the participant-requested removal route was absorbed into this job.");
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "MT" && !t.technicalFixture).length === 0,
  "a non-fixture Montana relief track is already wired into the shared registry.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: the assigned route is not in the shared registry or guidance pack, and does not absorb the request route.");

for (const t of mt.MONTANA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, mt.MONTANA_GUIDANCE_TEMPLATES);

ok(mt.MONTANA_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${mt.MONTANA_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(mt.MONTANA_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of MY_TRACK_IDS) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  ok(integrationValidation || !fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-mt-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of mt.MONTANA_GUIDANCE_TRACKS) {
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
for (const track of mt.MONTANA_GUIDANCE_TRACKS) {
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
// The fallback route must exist in the adopted design, so naming it is not a
// promise of something that does not exist — and so this job never needs to
// generate the form itself.
{
  const fallback = design.tracks.find(t => t.trackId === "mt_nonconviction_removal");
  ok(Boolean(fallback), "the separate participant-requested removal route is missing from the adopted design.");
  ok(fallback?.outputStrategy === "official_pdf_fill",
    `the fallback route is ${fallback?.outputStrategy}, so this guidance job may be expected to generate it.`);
}
note("3. Specifications: 1 component, specified, matching the design's id and role, with the separate request route intact as its own official-form track.");

const BASE = {
  usCitizen: "yes",
  fullName: "Jordan Rivers",
  dateOfBirth: "1990-02-02",
  arrestDate: "2019-05-06",
  arrestingAgency: "Missoula County Sheriff",
  arrestCountyCity: "Missoula County, Missoula",
  charges: "Criminal mischief",
  dispositionType: "charges_dismissed",
  dispositionDate: "2019-11-01",
  dispositionPeriod: "on_or_after_1_july_2017",
  courtOfJurisdiction: "Missoula County Justice Court",
  stillShowingOnChoprs: "still_appears",
  courtWillNotReport: "no",
  needsCourtRecordAddressed: "no"
};

const NEG = [
  [{ usCitizen: "no" }, "stop", "participant_is_not_a_us_citizen"],
  [{ dispositionType: "convicted" }, "mismatch", "matter_ended_in_a_conviction"],
  [{ dispositionType: "revoked_deferred" }, "stop", "revoked_deferred_sentence_or_prosecution"],
  [{ dispositionPeriod: "before_1_july_2017" }, "mismatch", "disposition_predates_the_automatic_practice"],
  [{ courtWillNotReport: "yes" }, "stop", "court_will_not_report_the_disposition"],
  [{ needsCourtRecordAddressed: "yes" }, "mismatch", "participant_needs_the_court_record_addressed"],
  [{ dispositionType: "maybe" }, "branch"],
  [{ dispositionPeriod: "" }, "branch"],
  [{ stillShowingOnChoprs: "dunno" }, "branch"],
  [{ usCitizen: "unsure" }, "branch"]
];
for (const [override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { mt.deriveMontanaGuidanceFacts(TRACK_ID, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof mt.MontanaGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof mt.MontanaRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof mt.MontanaBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    ok(routeTo.length > 20, `${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()), `${detail}: generic destination.`);
    ok(/removal request route|sealing routes|legal aid|public defender|immigration lawyer|court/i.test(routeTo),
      `${detail}: destination names no route or institution.`);
  }
}

// A record that still shows is the diagnostic case this sheet exists for.
for (const v of ["still_appears", "have_not_checked", "no_longer_appears"]) {
  let outcome = "generated";
  try { mt.deriveMontanaGuidanceFacts(TRACK_ID, { ...BASE, stillShowingOnChoprs: v }); } catch { outcome = "refused"; }
  ok(outcome === "generated", `stillShowingOnChoprs=${v} was refused, but it is the case the sheet exists for.`);
}
// Every qualifying non-conviction disposition must generate.
for (const d of ["charges_dismissed", "deferred_prosecution_dismissed", "acquitted", "charges_dropped", "charges_not_filed", "released_without_charges"]) {
  let outcome = "generated";
  try { mt.deriveMontanaGuidanceFacts(TRACK_ID, { ...BASE, dispositionType: d }); } catch { outcome = "refused"; }
  ok(outcome === "generated", `qualifying disposition ${d} was refused.`);
}
note(`4. Stops: ${NEG.length} negative cases fail closed with concrete destinations; a still-showing record keeps the packet and all six qualifying dispositions generate.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  // No form is generated on this route, and no superseded form or legacy
  // address may be named.
  [/complete (the|a) Record Removal Form|fill out the Record Removal Form|attached form/i,
    "a Record Removal Form the design says is not required on this route"],
  [/chopr[sz]?\.(mt\.)?gov|https?:\/\//i, "a web address, which may be a legacy or superseded link"],
  [/\b(2023|rev\.? 2023)\s+(CRISS|Record Removal)/i, "a superseded 2023 form reference"],
  // Verification is not free and the removal does not reach county records.
  [{
    test: (t) => t.split(/(?<=\.)\s+/).some(
      (s) => /(background check|record check|verification|criminal history check)[^.]*\b(is free|no fee|free of charge)\b/i.test(s)
    )
  }, "an unsupported statement that verification is free"],
  [{
    test: (t) => t.split(/(?<=\.)\s+/).some(
      (s) => /(all|every) (local |county )?records?[^.]*\b(disappear|removed|deleted|cleared)\b/i.test(s) &&
        !/\b(not|never|does not|will not)\b/i.test(s)
    )
  }, "a promise that every local record disappears"]
];

const samples = [];
for (const track of mt.MONTANA_GUIDANCE_TRACKS) {
  const facts = mt.deriveMontanaGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "MT", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "MT", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "MT", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "MT", jurisdictionName: "Montana",
    packetName: resolved.track.assembledPacketName, caseReference: "DC-19-1234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "MT", jurisdictionName: "Montana",
    packetName: resolved.track.assembledPacketName, caseReference: "DC-19-1234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say whether the participant files anything.`);
  ok(/no Record Removal Form is required/i.test(text), `${track.trackId}: does not say the form is not required.`);
  // The three words, kept apart.
  ok(/Expungement means permanently destroying/i.test(text), `${track.trackId}: does not define expungement.`);
  ok(/Sealing is what happens at the courts/i.test(text), `${track.trackId}: does not define sealing.`);
  ok(/Removal is the Department's word/i.test(text), `${track.trackId}: does not define removal.`);
  // The limit and the required search.
  ok(/does not reach public county court records/i.test(text),
    `${track.trackId}: does not state that county court records are untouched.`);
  ok(/no centralised court records system|no centralized court records system/i.test(text),
    `${track.trackId}: omits the absence of a centralised court records system.`);
  ok(/District Courts/i.test(text) && /Courts of Limited Jurisdiction/i.test(text),
    `${track.trackId}: does not require both portal searches.`);
  ok(/required step, not a suggestion/i.test(text), `${track.trackId}: treats the two-portal search as optional.`);
  // Verification and the trigger.
  ok(/fourteen business days/i.test(text), `${track.trackId}: omits the reporting deadline that triggers removal.`);
  ok(/seventy-two hours/i.test(text), `${track.trackId}: omits the record-check hold.`);
  ok(/has its own fee/i.test(text), `${track.trackId}: does not acknowledge the verification fee.`);
  ok(/separate participant-requested removal route|separate Montana non-conviction record removal request route/i.test(text),
    `${track.trackId}: does not name the separate request route.`);
  ok(/this page does not generate it/i.test(text), `${track.trackId}: does not disclaim generating the request form.`);
  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  ok(pages.length === asm.pageCount, `${track.trackId}: page count disagrees with the assembled PDF.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

{
  const f = { ...BASE }; delete f.arrestingAgency;
  let outcome = "generated";
  try {
    const d = mt.deriveMontanaGuidanceFacts(TRACK_ID, f);
    resolvePacket({ jurisdiction: "MT", trackId: TRACK_ID, facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing arrestingAgency: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifact renders deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Montana guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Montana guidance verification passed.");
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
