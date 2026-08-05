// Missouri guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Missouri is not enabled, the
// family is recommended for counsel adoption but not adopted, both tracks match
// the adopted design's five instruction components, each renders
// deterministically into one final guidance PDF, no sheet calls closure erasure
// or Missouri a clean-slate state, the fingerprint-only verification rule is
// stated, the shared lifetime caps and the absence of a published start date
// are carried, the sole statutory remedy for a missed record is named, every
// typed stop has a concrete destination, and every closed list fails closed.

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
const mo = await import("@/lib/rcap/packets/jurisdictions/missouri/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/missouri-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);
const integrationValidation =
  process.env.RCAP_FACTORY_VALIDATION_SCOPE === "integration";

const MY_TRACK_IDS = mo.MISSOURI_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(mo.MISSOURI_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 2, `expected 2 assigned tracks, got ${MY_TRACK_IDS.length}.`);
ok(MY_TEMPLATE_IDS.length === 5, `expected 5 templates, got ${MY_TEMPLATE_IDS.length}.`);
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "MO" && !t.technicalFixture).length === 0,
  "a non-fixture Missouri relief track is already wired into the shared registry.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: neither assigned route is in the shared registry or guidance pack.");

// Injected only into this process, after the absence above is proven.
for (const t of mo.MISSOURI_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, mo.MISSOURI_GUIDANCE_TEMPLATES);

ok(mo.MISSOURI_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${mo.MISSOURI_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(mo.MISSOURI_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of MY_TRACK_IDS) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  ok(integrationValidation || !fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-mo-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of mo.MISSOURI_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Adoption and promotion: ${mo.MISSOURI_GUIDANCE_TRACKS.length} tracks runtime_disabled, recommended_for_counsel_adoption, counselAdopted false, ${integrationValidation ? "captain-owned proof permitted during integration" : "no integration-owned proof written"}.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of mo.MISSOURI_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find(t => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(designed?.outputStrategy === "process_guidance", `${track.trackId}: the design does not call for guidance.`);
  const designedComponents = designed?.packetSet?.components ?? [];
  ok(designedComponents.length === track.packetSet.components.length,
    `${track.trackId}: component count differs from the design (${designedComponents.length} vs ${track.packetSet.components.length}).`);
  const roles = new Map(designedComponents.map(c => [c.componentId, c.role]));
  for (const c of track.packetSet.components) {
    ok(roles.has(c.componentId), `${c.componentId}: not in the adopted packet set.`);
    ok(roles.get(c.componentId) === c.role, `${c.componentId}: role ${c.role} differs from the design ${roles.get(c.componentId)}.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
  }
  const required = new Set((spec.processGuidanceSpecs.find(s => s.trackId === track.trackId)?.generationRequirements ?? [])
    .filter(r => r.requirement === "required").map(r => r.key));
  const asked = new Set(track.requiredInputs.map(i => i.key));
  for (const key of required) ok(asked.has(key), `${track.trackId}: the design requires ${key} and it is not asked.`);
}
note(`3. Specifications: ${mo.MISSOURI_GUIDANCE_TRACKS.reduce((n, t) => n + t.packetSet.components.length, 0)} components, each specified, matching the design's ids and instruction roles.`);

const BASE = {
  immigrationMatter: "no",
  // mo-610-105-automatic-closure
  disposition: "dismissed", sesConfusion: "not_a_suspended_sentence",
  sisProbationComplete: "not_applicable",
  originatingCourt: "Circuit Court of Greene County, 1931-CR01234",
  caseNetVisible: "no_longer_appears", mshpVisible: "requested_not_showing",
  backgroundCheckVisible: "no", chapter566Charge: "no",
  wantsRecordCorrected: "no", wantsExpungementToo: "no",
  // mo-610-141-automatic-drug
  offenseType: "possession_579_015", offenseLevel: "misdemeanor",
  finalDispositionDate: "2020-06-01", statuteUnclear: "no",
  onlyChargeInCase: "yes", convictionSinceDisposition: "no",
  pendingChargesOrWarrants: "no", priorExpungements: "none",
  recordNotExpungedAfterOperative: "no", urgency: "no", petitionNowOrWait: "no"
};

const NEG = [
  ["mo-610-105-automatic-closure", { immigrationMatter: "yes" }, "stop", "immigration_consequence_in_play"],
  ["mo-610-105-automatic-closure", { sesConfusion: "suspended_execution" }, "mismatch", "suspended_execution_is_a_conviction"],
  ["mo-610-105-automatic-closure", { sesConfusion: "cannot_tell_from_the_docket" }, "stop", "cannot_distinguish_suspended_imposition_from_execution"],
  ["mo-610-105-automatic-closure", { disposition: "convicted" }, "mismatch", "case_ended_in_a_conviction"],
  ["mo-610-105-automatic-closure", { sesConfusion: "suspended_imposition", disposition: "suspended_imposition", sisProbationComplete: "still_running" }, "stop", "probation_has_not_reached_final_termination"],
  ["mo-610-105-automatic-closure", { sesConfusion: "suspended_imposition", disposition: "suspended_imposition", sisProbationComplete: "revoked" }, "mismatch", "probation_revoked_and_sentence_imposed"],
  ["mo-610-105-automatic-closure", { sesConfusion: "suspended_imposition", disposition: "suspended_imposition", sisProbationComplete: "unsure" }, "stop", "unsure_whether_probation_reached_final_termination"],
  ["mo-610-105-automatic-closure", { chapter566Charge: "yes" }, "stop", "enumerated_offense_with_victim_access_to_the_closed_file"],
  ["mo-610-105-automatic-closure", { wantsRecordCorrected: "yes" }, "stop", "wants_the_record_corrected_rather_than_confirmed"],
  ["mo-610-105-automatic-closure", { backgroundCheckVisible: "yes" }, "stop", "background_check_shows_a_case_believed_closed"],
  ["mo-610-105-automatic-closure", { mshpVisible: "requested_still_showing" }, "stop", "record_still_showing_after_final_termination"],
  ["mo-610-105-automatic-closure", { wantsExpungementToo: "yes" }, "mismatch", "wants_to_know_whether_a_petition_adds_anything"],
  ["mo-610-105-automatic-closure", { sesConfusion: "maybe" }, "branch"],
  ["mo-610-105-automatic-closure", { mshpVisible: "" }, "branch"],
  ["mo-610-141-automatic-drug", { offenseType: "trafficking_distribution_delivery_or_manufacture" }, "mismatch", "offense_outside_the_four_covered_offenses"],
  ["mo-610-141-automatic-drug", { offenseType: "other_offense" }, "mismatch", "offense_outside_the_four_covered_offenses"],
  ["mo-610-141-automatic-drug", { offenseLevel: "class_a_felony" }, "mismatch", "class_a_felony_excluded_from_the_automatic_route"],
  ["mo-610-141-automatic-drug", { statuteUnclear: "yes" }, "stop", "statute_of_conviction_unclear_on_the_docket"],
  ["mo-610-141-automatic-drug", { onlyChargeInCase: "no" }, "stop", "case_contained_a_non_qualifying_conviction"],
  ["mo-610-141-automatic-drug", { convictionSinceDisposition: "yes" }, "stop", "intervening_conviction_since_final_disposition"],
  ["mo-610-141-automatic-drug", { pendingChargesOrWarrants: "yes" }, "stop", "outstanding_arrest_warrant_or_pending_charge"],
  ["mo-610-141-automatic-drug", { priorExpungements: "at_or_over_the_caps" }, "stop", "shared_lifetime_caps_may_be_exhausted"],
  ["mo-610-141-automatic-drug", { priorExpungements: "unsure" }, "stop", "shared_lifetime_caps_may_be_exhausted"],
  ["mo-610-141-automatic-drug", { recordNotExpungedAfterOperative: "yes" }, "mismatch", "eligible_record_not_expunged_is_remedied_only_by_petition"],
  ["mo-610-141-automatic-drug", { urgency: "yes" }, "mismatch", "needs_the_record_cleared_by_a_fixed_date"],
  ["mo-610-141-automatic-drug", { petitionNowOrWait: "yes" }, "stop", "choosing_between_petitioning_now_and_waiting"],
  ["mo-610-141-automatic-drug", { offenseType: "" }, "branch"],
  ["mo-610-141-automatic-drug", { priorExpungements: "lots" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { mo.deriveMissouriGuidanceFacts(trackId, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof mo.MissouriGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof mo.MissouriRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof mo.MissouriBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    ok(routeTo.length > 20, `${trackId}/${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()), `${trackId}/${detail}: generic destination.`);
    ok(/legal aid|public defender|clerk|Highway Patrol|petition route|immigration lawyer|wait until|resolve the outstanding|arresting agency/i.test(routeTo),
      `${trackId}/${detail}: destination names no route, institution or action.`);
  }
}

// A participant who has not yet obtained the fingerprint-based record must keep
// the packet: requesting it is the instruction the sheet exists to give.
for (const trackId of MY_TRACK_IDS) {
  let outcome = "generated";
  try { mo.deriveMissouriGuidanceFacts(trackId, { ...BASE, mshpVisible: "not_yet_requested", caseNetVisible: "have_not_checked" }); }
  catch { outcome = "refused"; }
  ok(outcome === "generated", `${trackId}: an unchecked record was refused, but requesting the record is the instruction.`);
}
// A completed suspended imposition is inside the route, not outside it.
{
  let outcome = "generated";
  try {
    mo.deriveMissouriGuidanceFacts("mo-610-105-automatic-closure",
      { ...BASE, sesConfusion: "suspended_imposition", disposition: "suspended_imposition", sisProbationComplete: "completed" });
  } catch { outcome = "refused"; }
  ok(outcome === "generated", "a completed suspended imposition of sentence was refused.");
}
note(`4. Stops: ${NEG.length} negative cases fail closed with concrete destinations; an unchecked record and a completed suspended imposition both keep the packet.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

// The sheets must name expungement to contrast it with closure, so the erasure
// ban is per sentence and skips any sentence drawing that contrast.
function usesWrongTerm(text, re) {
  return text.split(/(?<=[.;])\s+/).some(
    (sentence) => re.test(sentence) &&
      !/\b(is not|not destruction|never call|nothing here will describe|rather than)\b/i.test(sentence)
  );
}
const PROHIBITED = [
  [{ test: (t) => usesWrongTerm(t, /\berasure\b|\berased\b|\bdestroys? the record\b/i) },
    "erasure vocabulary for a Missouri closure"],
  // The design forbids describing Missouri as a general clean-slate state. The
  // sheet has to name that framing in order to correct it, so what is banned is
  // the AFFIRMATIVE claim, per sentence, not any mention of the phrase.
  [{
    test: (t) => t.split(/(?<=[.;])\s+/).some(
      (s) => /clean[- ]slate/i.test(s) &&
        !/\b(not|never|correction|framing|narrower|wider than|misread|coverage)\b/i.test(s)
    )
  }, "describing Missouri as a clean-slate state"],
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/your record (has been|was) (closed|expunged)|has already been (closed|expunged) for you/i,
    "asserting an outcome for the participant's own record"],
  [/will be (closed|expunged) (on|by) \w+ \d/i, "a predicted completion date"]
];

const samples = [];
for (const track of mo.MISSOURI_GUIDANCE_TRACKS) {
  const facts = mo.deriveMissouriGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "MO", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "MO", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "MO", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "MO", jurisdictionName: "Missouri",
    packetName: resolved.track.assembledPacketName, caseReference: "1931-CR01234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "MO", jurisdictionName: "Missouri",
    packetName: resolved.track.assembledPacketName, caseReference: "1931-CR01234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say whether the participant files anything.`);
  ok(/does not tell you whether your own record/i.test(text), `${track.trackId}: asserts or implies an individual outcome.`);
  ok(/fingerprint-based/i.test(text), `${track.trackId}: omits the fingerprint-based verification rule.`);

  if (track.trackId === "mo-610-105-automatic-closure") {
    ok(/Closure is not expungement/i.test(text), "closure sheet does not separate closure from expungement.");
    ok(/stays a public record/i.test(text), "closure sheet does not say the judgment stays public.");
    ok(/suspended IMPOSITION/.test(text) && /suspended EXECUTION/.test(text),
      "closure sheet does not draw the suspended imposition against execution distinction.");
    ok(/name-based search cannot confirm closure/i.test(text), "closure sheet does not warn about name-based searches.");
    ok(/victim of that offence may obtain/i.test(text), "closure sheet omits victim access to the closed file.");
    ok(/no correction petition/i.test(text) || /will not invent one/i.test(text) || /invent one/i.test(text),
      "closure sheet does not refuse to invent a correction petition.");
  }
  if (track.trackId === "mo-610-141-automatic-drug") {
    ok(/four offences/i.test(text), "drug sheet does not state the four-offence scope.");
    ok(/not a clean-slate state/i.test(text), "drug sheet does not correct the clean-slate framing.");
    ok(/trafficking, distribution, delivery and manufacture are outside/i.test(text),
      "drug sheet does not name what falls outside the scope.");
    ok(/lifetime slot/i.test(text), "drug sheet omits that automatic relief consumes a lifetime slot.");
    ok(/Three misdemeanours and two felonies/i.test(text), "drug sheet omits the shared caps.");
    ok(/1 January 2027/.test(text), "drug sheet omits the outer limit.");
    ok(/no published start date|No implementation notice has been published/i.test(text),
      "drug sheet does not say there is no published start date.");
    ok(/sole remedy|only remedy/i.test(text), "drug sheet does not name the statutory sole remedy.");
    ok(/no appeal to the Highway Patrol/i.test(text), "drug sheet does not rule out an agency appeal.");
    ok(/not destruction/i.test(text), "drug sheet does not say the relief is closure rather than destruction.");
  }
  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  ok(pages.length === asm.pageCount, `${track.trackId}: page count disagrees with the assembled PDF.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount, components: components.length });
}

// A required question the deriver never inspects must still stop resolution.
{
  const f = { ...BASE }; delete f.originatingCourt;
  let outcome = "generated";
  try {
    const d = mo.deriveMissouriGuidanceFacts("mo-610-105-automatic-closure", f);
    resolvePacket({ jurisdiction: "MO", trackId: "mo-610-105-automatic-closure", facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing originatingCourt: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Missouri guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Missouri guidance verification passed.");
for (const l of checks) console.log(l);
console.log("");
console.log("FINAL PACKET RESULTS");
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
