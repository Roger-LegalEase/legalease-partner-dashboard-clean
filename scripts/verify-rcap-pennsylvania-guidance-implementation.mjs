// Pennsylvania guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Pennsylvania is not enabled, the
// family is recommended for counsel adoption but not adopted, every component
// has a governing specification and matches the adopted design, the three
// routes render deterministically into one final guidance PDF each, every sheet
// tells the participant to check before paying for a petition, the two
// five-year clocks are kept apart, the misdemeanour and fines misconceptions
// are corrected, the ARD sexual-offence limit is cited to the statute rather
// than the rule, a still-visible record only escalates where the design says it
// should, every typed stop names a concrete destination, and every closed list
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
const pa = await import("@/lib/rcap/packets/jurisdictions/pennsylvania/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/pennsylvania-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

// The shared registry already carries a PA-coded technical fixture that belongs
// to no relief route, so the gate is that none of THESE three tracks and none
// of THESE templates is wired — not that the PA code is absent altogether.
const MY_TRACK_IDS = pa.PENNSYLVANIA_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(pa.PENNSYLVANIA_GUIDANCE_TEMPLATES);
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "PA" && !t.technicalFixture).length === 0,
  "a non-fixture Pennsylvania relief track is already wired into the shared registry.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
ok(pa.PENNSYLVANIA_GUIDANCE_TRACKS.length === 3, `expected 3 assigned tracks, got ${pa.PENNSYLVANIA_GUIDANCE_TRACKS.length}.`);
note("1. Enablement: none of the three assigned routes is in the shared registry or guidance pack.");

// Injected only into this process, after the absence above is proven.
for (const t of pa.PENNSYLVANIA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, pa.PENNSYLVANIA_GUIDANCE_TEMPLATES);

ok(pa.PENNSYLVANIA_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${pa.PENNSYLVANIA_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(pa.PENNSYLVANIA_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const trackIds = new Set(pa.PENNSYLVANIA_GUIDANCE_TRACKS.map(t => t.trackId));
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of trackIds) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  ok(!fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-pa-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of pa.PENNSYLVANIA_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Adoption and promotion: ${pa.PENNSYLVANIA_GUIDANCE_TRACKS.length} tracks runtime_disabled, recommended_for_counsel_adoption, counselAdopted false, no integration-owned proof written.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of pa.PENNSYLVANIA_GUIDANCE_TRACKS) {
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
note("3. Specifications: 3 components, each specified, matching the design's ids and roles, asking every required question.");

const BASE = {
  // pa_acquittal_auto
  docketNumber: "CP-51-CR-0001234-2021", acquittalDate: "2024-03-04",
  acquittedOfAllCharges: "all_charges", sameCriminalEpisode: "yes",
  monthsSinceAcquittal: "under_twelve_months", stillAppearsPublicly: "have_not_checked",
  // pa_ard_expungement
  ardCompleted: "yes", dismissalEntered: "yes", dismissalDate: "2024-05-06",
  sexualOffenseMinorVictim: "no", commonwealthObjected: "no",
  // pa_9122_2_clean_slate
  offenseAndGrading: "Misdemeanor of the second degree", convictionOrDispositionDate: "2015-02-02",
  mostRecentConviction: "2015-02-02", summaryJudgmentEntryDate: "",
  sameCaseCharges: "None other", conditionalPardon: "no",
  goal: "check_whether_it_sealed", section9122_3Exclusion: "no", disqualifyingChargeSameCase: "no"
};

const NEG = [
  ["pa_acquittal_auto", { acquittedOfAllCharges: "some_charges_only" }, "mismatch", "partial_acquittal"],
  ["pa_acquittal_auto", { sameCriminalEpisode: "no" }, "mismatch", "charges_from_different_conduct"],
  ["pa_acquittal_auto", { monthsSinceAcquittal: "twelve_months_or_more", stillAppearsPublicly: "still_appears" }, "stop", "twelve_months_passed_and_record_has_not_cleared"],
  ["pa_acquittal_auto", { acquittedOfAllCharges: "maybe" }, "branch"],
  ["pa_acquittal_auto", { monthsSinceAcquittal: "6" }, "branch"],
  ["pa_ard_expungement", { sexualOffenseMinorVictim: "yes" }, "stop", "section_9122_b_1_removes_authority_to_expunge"],
  ["pa_ard_expungement", { ardCompleted: "no" }, "stop", "ard_not_successfully_completed"],
  ["pa_ard_expungement", { dismissalEntered: "no" }, "stop", "dismissal_not_yet_entered"],
  ["pa_ard_expungement", { commonwealthObjected: "yes" }, "stop", "commonwealth_objected_to_the_expungement"],
  ["pa_ard_expungement", { ardCompleted: "" }, "branch"],
  ["pa_9122_2_clean_slate", { goal: "wants_expungement_not_sealing" }, "mismatch", "wants_expungement_rather_than_sealing"],
  ["pa_9122_2_clean_slate", { section9122_3Exclusion: "yes" }, "stop", "section_9122_3_exclusion_applies"],
  ["pa_9122_2_clean_slate", { disqualifyingChargeSameCase: "yes" }, "stop", "disqualifying_charge_in_the_same_case"],
  ["pa_9122_2_clean_slate", { stillAppearsPublicly: "still_appears" }, "stop", "record_should_have_sealed_and_has_not"],
  ["pa_9122_2_clean_slate", { goal: "" }, "branch"],
  ["pa_9122_2_clean_slate", { stillAppearsPublicly: "dunno" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { pa.derivePennsylvaniaGuidanceFacts(trackId, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof pa.PennsylvaniaGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof pa.PennsylvaniaRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof pa.PennsylvaniaBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    ok(routeTo.length > 20, `${trackId}/${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()), `${trackId}/${detail}: generic destination.`);
    ok(/clerk of courts|legal aid|record-clearing|public defender|route|supervision office|probation officer/i.test(routeTo),
      `${trackId}/${detail}: destination names no route or institution.`);
  }
}

// The design says not to file inside the twelve months. A record still showing
// before the outside date must therefore stay on the sheet, not escalate.
{
  let outcome = "generated";
  try {
    pa.derivePennsylvaniaGuidanceFacts("pa_acquittal_auto",
      { ...BASE, monthsSinceAcquittal: "under_twelve_months", stillAppearsPublicly: "still_appears" });
  } catch { outcome = "refused"; }
  ok(outcome === "generated",
    "pa_acquittal_auto escalated inside the twelve months, which the design says not to do.");
}
// An unchecked record must still receive every sheet: checking is the instruction.
for (const trackId of ["pa_acquittal_auto", "pa_ard_expungement", "pa_9122_2_clean_slate"]) {
  let outcome = "generated";
  try { pa.derivePennsylvaniaGuidanceFacts(trackId, { ...BASE, stillAppearsPublicly: "have_not_checked" }); }
  catch { outcome = "refused"; }
  ok(outcome === "generated", `${trackId}: an unchecked record was refused, but checking is the instruction.`);
}
note(`4. Stops: ${NEG.length} negative cases fail closed with concrete destinations; nothing escalates inside the twelve months and an unchecked record still receives the sheet.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/your record (has been|was) (sealed|expunged)|has already been (sealed|expunged) for you/i,
    "an assertion that a particular record has already been cleared"],
  [/will be (sealed|expunged) (on|by) \w+ \d/i, "a predicted completion date"],
  [/unpaid fines|outstanding costs (will|would) (block|disqualify)/i,
    "the incorrect statement that fines and costs block Clean Slate sealing"]
];

const samples = [];
for (const track of pa.PENNSYLVANIA_GUIDANCE_TRACKS) {
  const facts = pa.derivePennsylvaniaGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "PA", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "PA", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "PA", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "PA", jurisdictionName: "Pennsylvania",
    packetName: resolved.track.assembledPacketName, caseReference: "CP-51-CR-0001234-2021",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "PA", jurisdictionName: "Pennsylvania",
    packetName: resolved.track.assembledPacketName, caseReference: "CP-51-CR-0001234-2021",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say whether the participant files anything.`);
  ok(/Check before you pay anyone/i.test(text), `${track.trackId}: omits the check-before-paying instruction.`);
  ok(/does not obtain, receive or inspect/i.test(text), `${track.trackId}: does not disclaim handling the record.`);

  if (track.trackId === "pa_acquittal_auto") {
    ok(/sixty days/i.test(text), "acquittal sheet omits the Commonwealth's objection window.");
    ok(/twelve months/i.test(text), "acquittal sheet omits the statutory outside date.");
    ok(/do not file anything inside those twelve months/i.test(text), "acquittal sheet does not say not to file inside the window.");
    ok(/clerk of courts/i.test(text), "acquittal sheet does not name the escalation destination.");
  }
  if (track.trackId === "pa_ard_expungement") {
    ok(/9122\(b\.1\)/.test(text), "ARD sheet does not cite the statute for the sexual-offence limit.");
    ok(/not in the rule/i.test(text), "ARD sheet does not correct the rule-versus-statute confusion.");
    ok(/thirty days/i.test(text), "ARD sheet omits the Commonwealth's objection window.");
    ok(/compelling reasons/i.test(text), "ARD sheet omits the Commonwealth's burden.");
    ok(/two separate things/i.test(text), "ARD sheet does not tell the participant to check for both orders.");
  }
  if (track.trackId === "pa_9122_2_clean_slate") {
    ok(/ENTRY OF THE JUDGMENT/i.test(text), "Clean Slate sheet does not state the summary-conviction clock.");
    ok(/FREE OF ARREST OR PROSECUTION/i.test(text), "Clean Slate sheet does not state the expungement clock.");
    ok(/no more than two years/i.test(text), "Clean Slate sheet omits the two-year misdemeanour rule.");
    ok(/do not assume a first-degree misdemeanour is out/i.test(text), "Clean Slate sheet does not correct the M1 misconception.");
    ok(/fines and costs do not block/i.test(text), "Clean Slate sheet does not correct the fines misconception.");
    ok(/Restitution does remain a condition/i.test(text), "Clean Slate sheet omits the restitution condition.");
    ok(/14 December 2023/.test(text) && /12 February 2024/.test(text) && /11 June 2024/.test(text),
      "Clean Slate sheet omits one of the Act 36 phase-in dates.");
    ok(/still being researched/i.test(text), "Clean Slate sheet does not disclose that the correction route is deferred.");
  }
  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  ok(pages.length === asm.pageCount, `${track.trackId}: page count disagrees with the assembled PDF.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

// A required question the deriver never inspects must still stop resolution.
{
  const f = { ...BASE }; delete f.docketNumber;
  let outcome = "generated";
  try {
    const d = pa.derivePennsylvaniaGuidanceFacts("pa_acquittal_auto", f);
    resolvePacket({ jurisdiction: "PA", trackId: "pa_acquittal_auto", facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing docketNumber: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Pennsylvania guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Pennsylvania guidance verification passed.");
for (const l of checks) console.log(l);
console.log("");
console.log("FINAL PACKET RESULTS");
for (const s of samples) console.log(`   ${s.trackId.padEnd(26)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
