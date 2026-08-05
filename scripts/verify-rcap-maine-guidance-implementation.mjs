// Maine guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Maine is not enabled, the family
// is recommended for counsel adoption but not adopted, the component matches
// the adopted design, the route renders deterministically into one final
// guidance PDF, the sheet says plainly that a deferred disposition is a routing
// treatment rather than relief, never claims a record was sealed, expunged or
// destroyed, never invents statewide automatic adult sealing, keeps the
// record-screening mechanism separate, routes both outcomes to the adopted
// tracks, surfaces the cross-track disqualifier as an attorney handoff, and
// fails closed on every list.

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
const me = await import("@/lib/rcap/packets/jurisdictions/maine/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/maine-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);
const integrationValidation =
  process.env.RCAP_FACTORY_VALIDATION_SCOPE === "integration";

const TRACK_ID = "me-deferred";
const MY_TRACK_IDS = me.MAINE_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(me.MAINE_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 1 && MY_TRACK_IDS[0] === TRACK_ID, `expected exactly ${TRACK_ID}, got ${MY_TRACK_IDS.join(",")}.`);
ok(MY_TEMPLATE_IDS.length === 1, `expected 1 template, got ${MY_TEMPLATE_IDS.length}.`);
// The assigned node must not absorb the separate screening mechanism.
ok(!MY_TRACK_IDS.includes("me-screening"), "me-screening was merged into this job.");
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "ME" && !t.technicalFixture).length === 0,
  "a non-fixture Maine relief track is already wired into the shared registry.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: the assigned node is not in the shared registry or guidance pack, and does not absorb the screening mechanism.");

for (const t of me.MAINE_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, me.MAINE_GUIDANCE_TEMPLATES);

ok(me.MAINE_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${me.MAINE_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(me.MAINE_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of MY_TRACK_IDS) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  ok(integrationValidation || !fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-me-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of me.MAINE_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Adoption and promotion: 1 node runtime_disabled, recommended_for_counsel_adoption, counselAdopted false, ${integrationValidation ? "captain-owned proof permitted during integration" : "no integration-owned proof written"}.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of me.MAINE_GUIDANCE_TRACKS) {
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
// The adopted design must still carry the separate screening mechanism.
ok(Boolean(design.tracks.find(t => t.trackId === "me-screening")),
  "me-screening is missing from the adopted design, so the routing destination does not exist.");
note("3. Specifications: 1 component, specified, matching the design's id and role, with the separate screening mechanism intact.");

const BASE = {
  usCitizen: "yes",
  deferralComplete: "completed",
  outcomeType: "reduced_conviction",
  outcomeDate: "2024-05-06",
  reducedOffenseName: "Class E theft",
  otherConvictionToSeal: "no",
  otherConvictionCompletionDate: ""
};

const NEG = [
  [{ usCitizen: "no" }, "stop", "participant_is_not_a_us_citizen"],
  [{ deferralComplete: "still_running" }, "stop", "deferral_period_has_not_ended"],
  [{ deferralComplete: "compliance_disputed" }, "stop", "compliance_with_the_agreement_is_disputed"],
  [{ outcomeType: "cannot_tell_from_the_record" }, "stop", "outcome_not_clear_from_the_court_record"],
  [{ outcomeType: "charge_dismissed", otherConvictionToSeal: "yes" }, "stop", "deferred_dismissal_may_disqualify_an_earlier_conviction_from_sealing"],
  [{ outcomeType: "charge_dismissed" }, "mismatch", "dismissal_is_handled_by_the_non_conviction_track"],
  [{ outcomeType: "reduced_conviction" }, "mismatch", "reduced_conviction_is_judged_on_its_own_terms"],
  [{ deferralComplete: "maybe" }, "branch"],
  [{ outcomeType: "" }, "branch"],
  [{ otherConvictionToSeal: "unsure" }, "branch"],
  [{ usCitizen: "dunno" }, "branch"]
];
for (const [override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { me.deriveMaineGuidanceFacts(TRACK_ID, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof me.MaineGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof me.MaineRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof me.MaineBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    ok(routeTo.length > 20, `${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()), `${detail}: generic destination.`);
    ok(/track|legal aid|defence lawyer|clerk|immigration lawyer|court/i.test(routeTo),
      `${detail}: destination names no route or institution.`);
  }
}

// The disqualifier must fire before the ordinary dismissal routing, because it
// is the fact the participant most needs to hear.
{
  let detail = null;
  try { me.deriveMaineGuidanceFacts(TRACK_ID, { ...BASE, outcomeType: "charge_dismissed", otherConvictionToSeal: "yes" }); }
  catch (e) { detail = e.stopId; }
  ok(detail === "deferred_dismissal_may_disqualify_an_earlier_conviction_from_sealing",
    "the cross-track disqualifier is masked by the ordinary dismissal routing.");
}
note(`4. Stops: ${NEG.length} negative cases fail closed with concrete destinations; the cross-track disqualifier fires ahead of the ordinary routing.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  // The node grants nothing. It must never claim an effect.
  [{
    test: (t) => t.split(/(?<=\.)\s+/).some(
      (s) => /\b(your record (is|has been|was) (sealed|expunged|destroyed)|the record (is|has been) (sealed|expunged|destroyed))\b/i.test(s) &&
        !/\b(not|never|does not|no)\b/i.test(s)
    )
  }, "a claim that the record has been sealed, expunged or destroyed"],
  [{
    test: (t) => t.split(/(?<=\.)\s+/).some(
      (s) => /automatic(ally)? (seal|clear|expunge)/i.test(s) &&
        !/\b(not|never|does not|no automatic|nothing happens)\b/i.test(s)
    )
  }, "invented statewide automatic adult sealing"],
  [/this page will get the record off (your|a) background check|we will remove it from the background check/i,
    "absorbing the separate record-screening mechanism"]
];

const samples = [];
for (const track of me.MAINE_GUIDANCE_TRACKS) {
  const facts = { ...BASE };
  // The node routes on every completed outcome, so render from the pre-routing
  // state: validation runs, and the sheet is the classification itself.
  const resolved = resolvePacket({ jurisdiction: "ME", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "ME", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "ME", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "ME", jurisdictionName: "Maine",
    packetName: resolved.track.assembledPacketName, caseReference: "CUMCD-CR-2023-01234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "ME", jurisdictionName: "Maine",
    packetName: resolved.track.assembledPacketName, caseReference: "CUMCD-CR-2023-01234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/not a record-clearing mechanism/i.test(text), `${track.trackId}: does not say the node grants no relief.`);
  ok(/produces no relief of its own/i.test(text), `${track.trackId}: does not state the node's nature plainly.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say whether the participant files anything.`);
  ok(/does not clear adult records automatically/i.test(text),
    `${track.trackId}: does not deny statewide automatic adult sealing.`);
  ok(/two outcomes/i.test(text), `${track.trackId}: does not classify the two outcomes.`);
  ok(/absolute disqualifier/i.test(text), `${track.trackId}: omits the cross-track disqualifier.`);
  ok(/separate Maine mechanism/i.test(text), `${track.trackId}: does not keep the screening mechanism separate.`);
  ok(/says nothing about confidentiality or sealing/i.test(text),
    `${track.trackId}: does not state that the deferred-disposition statute grants no sealing.`);
  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  ok(pages.length === asm.pageCount, `${track.trackId}: page count disagrees with the assembled PDF.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

{
  const f = { ...BASE }; delete f.outcomeDate;
  let outcome = "generated";
  try { resolvePacket({ jurisdiction: "ME", trackId: TRACK_ID, facts: f, allowTechnicalFixtures: true }); }
  catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing outcomeDate: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifact renders deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Maine guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Maine guidance verification passed.");
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
