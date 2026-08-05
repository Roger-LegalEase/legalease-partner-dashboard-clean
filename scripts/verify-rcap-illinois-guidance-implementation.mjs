// Illinois guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Illinois guidance is not enabled,
// the family is recommended for counsel adoption but not adopted, every
// component has a governing specification and matches the adopted design, the
// four routes render deterministically into one final guidance PDF each, no
// sheet predicts a completion date or asserts that a particular record has
// already been cleared, every typed stop carries a concrete destination and the
// statewide referral number, the prostitution sheet asks nothing about the
// circumstances of the offence, and every closed list fails closed.

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
const il = await import("@/lib/rcap/packets/jurisdictions/illinois/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/illinois-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

const MY_TRACK_IDS = il.ILLINOIS_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(il.ILLINOIS_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 4, `expected 4 assigned tracks, got ${MY_TRACK_IDS.length}.`);
ok(MY_TEMPLATE_IDS.length === 4, `expected 4 templates, got ${MY_TEMPLATE_IDS.length}.`);
// Illinois already carries custom-pleading routes from a different job, so the
// gate is that none of THESE four is wired, not that Illinois is absent.
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: none of the four assigned routes is in the shared registry or guidance pack.");

// Injected only into this process, after the absence above is proven.
for (const t of il.ILLINOIS_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, il.ILLINOIS_GUIDANCE_TEMPLATES);

ok(il.ILLINOIS_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${il.ILLINOIS_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(il.ILLINOIS_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of MY_TRACK_IDS) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  // The packet proof is integration-owned and must not exist on the worker branch.
  ok(!fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-il-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of il.ILLINOIS_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Adoption and promotion: ${il.ILLINOIS_GUIDANCE_TRACKS.length} tracks runtime_disabled, recommended_for_counsel_adoption, counselAdopted false, no integration-owned proof written.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of il.ILLINOIS_GUIDANCE_TRACKS) {
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
note("3. Specifications: 4 components, each specified, matching the design's ids and roles, asking every required question.");

const BASE = {
  // il-auto-seal-2029
  wantsReliefBefore2029: "no", wantsExpungementNotSealing: "no",
  recordMayBeExcludedFromAuto: "no", currentlyServingOrPendingCharges: "no",
  // il-auto-seal-2028
  isOrdinanceOrClassC: "yes", caseClosedDate: "2022-04-04", wantsReliefBefore2028: "no",
  // il-cannabis-auto
  cannabisOffenceBeforeJune2019: "yes", quantityUnder30Grams: "yes",
  cannabisDisposition: "dismissed", hasRunAccessAndReview: "requested_record_gone",
  // il-prostitution-j-auto
  isClass4FelonyProstitution: "yes", isTraffickingSurvivor: "no"
};

const NEG = [
  ["il-auto-seal-2029", { wantsReliefBefore2029: "yes" }, "mismatch", "relief_needed_before_the_operative_date"],
  ["il-auto-seal-2029", { wantsExpungementNotSealing: "yes" }, "mismatch", "wants_expungement_which_automatic_sealing_never_gives"],
  ["il-auto-seal-2029", { recordMayBeExcludedFromAuto: "yes" }, "mismatch", "record_may_be_excluded_from_automatic_sealing"],
  ["il-auto-seal-2029", { currentlyServingOrPendingCharges: "yes" }, "stop", "sentence_or_charges_not_yet_resolved"],
  ["il-auto-seal-2029", { wantsReliefBefore2029: "maybe" }, "branch"],
  ["il-auto-seal-2028", { isOrdinanceOrClassC: "no" }, "mismatch", "not_an_ordinance_violation_or_class_c_misdemeanor"],
  ["il-auto-seal-2028", { wantsReliefBefore2028: "yes" }, "mismatch", "relief_needed_before_the_operative_date"],
  ["il-auto-seal-2028", { isOrdinanceOrClassC: "" }, "branch"],
  ["il-cannabis-auto", { cannabisDisposition: "conviction" }, "mismatch", "cannabis_conviction_rather_than_arrest_record"],
  ["il-cannabis-auto", { cannabisOffenceBeforeJune2019: "no" }, "mismatch", "offence_on_or_after_25_june_2019"],
  ["il-cannabis-auto", { quantityUnder30Grams: "no" }, "mismatch", "quantity_above_the_minor_cannabis_threshold"],
  ["il-cannabis-auto", { hasRunAccessAndReview: "requested_record_still_shows" }, "stop", "record_still_shows_after_the_statutory_deadline"],
  ["il-cannabis-auto", { cannabisDisposition: "probably" }, "branch"],
  ["il-cannabis-auto", { hasRunAccessAndReview: "yes" }, "branch"],
  ["il-prostitution-j-auto", { isTraffickingSurvivor: "yes" }, "mismatch", "trafficking_route_is_stronger"],
  ["il-prostitution-j-auto", { isClass4FelonyProstitution: "no" }, "stop", "record_not_clearly_class_4_felony_prostitution"],
  ["il-prostitution-j-auto", { wantsReliefBefore2028: "yes" }, "mismatch", "relief_needed_before_the_sealing_deadline"],
  ["il-prostitution-j-auto", { isTraffickingSurvivor: "" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { il.deriveIllinoisGuidanceFacts(trackId, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof il.IllinoisGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof il.IllinoisRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof il.IllinoisBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    // Every typed stop must name a concrete destination, never a generic one.
    ok(routeTo.length > 20, `${trackId}/${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()),
      `${trackId}/${detail}: generic destination.`);
    ok(/866-787-1776|petition|motion|transcript|wait until/i.test(routeTo),
      `${trackId}/${detail}: destination names no route, institution or action.`);
  }
}

// A participant who has not yet run Access and Review must still get the sheet:
// telling them to run it is the point of the page.
for (const trackId of ["il-cannabis-auto", "il-prostitution-j-auto"]) {
  let outcome = "generated";
  try { il.deriveIllinoisGuidanceFacts(trackId, { ...BASE, hasRunAccessAndReview: "not_yet_requested" }); }
  catch { outcome = "refused"; }
  ok(outcome === "generated", `${trackId}: an unchecked record was refused, but running the check is the instruction.`);
}
note(`4. Stops: ${NEG.length} negative cases fail closed, each naming a concrete destination; an unchecked record still receives the sheet.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/your record (has been|was) (sealed|expunged)|has already been (sealed|expunged) for you/i,
    "an assertion that a particular record has already been cleared"],
  [/will be (sealed|expunged) (on|by) \w+ \d/i, "a predicted completion date for the participant's own record"],
  [/guaranteed|we will clear|automatically cleared before/i, "an outcome promise"]
];

const samples = [];
for (const track of il.ILLINOIS_GUIDANCE_TRACKS) {
  const facts = il.deriveIllinoisGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "IL", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "IL", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "IL", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "IL", jurisdictionName: "Illinois",
    packetName: resolved.track.assembledPacketName, caseReference: "2019-CM-001234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "IL", jurisdictionName: "Illinois",
    packetName: resolved.track.assembledPacketName, caseReference: "2019-CM-001234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say whether the participant files anything.`);
  ok(/Access and Review/i.test(text), `${track.trackId}: does not send the participant to the free check.`);
  ok(/866-787-1776/.test(text), `${track.trackId}: omits the statewide referral number.`);
  ok(/subject to appropriations/i.test(text), `${track.trackId}: omits the appropriations condition.`);
  ok(/does not obtain, receive or inspect/i.test(text), `${track.trackId}: does not disclaim handling the transcript.`);

  if (track.trackId === "il-auto-seal-2029") {
    ok(/1 January 2029/.test(text), "2029 sheet omits the operative date.");
    ok(/1 January 2034/.test(text), "2029 sheet omits the phase-in completion date.");
    ok(/never expunges/i.test(text), "2029 sheet does not say the automatic system never expunges.");
    ok(/quarterly/i.test(text), "2029 sheet omits the quarterly notification cycle.");
    ok(/ninety days/i.test(text), "2029 sheet omits the clerks' ninety-day window.");
  }
  if (track.trackId === "il-auto-seal-2028") {
    ok(/1 January 2028/.test(text), "2028 sheet omits its operative date.");
    ok(/1 January 2029/.test(text), "2028 sheet does not deliver the general date alongside its own.");
    ok(/1 January 2034/.test(text), "2028 sheet omits the phase-in date.");
    ok(/one year has elapsed/i.test(text), "2028 sheet omits the one-year condition.");
  }
  if (track.trackId === "il-cannabis-auto") {
    ok(/25 June 2019/.test(text), "cannabis sheet omits the offence-date cut-off.");
    ok(/thirty grams/i.test(text), "cannabis sheet omits the quantity threshold.");
    ok(/before paying/i.test(text), "cannabis sheet does not tell the participant to check before paying.");
    ok(/publicise|publicize/i.test(text), "cannabis sheet omits that the statute requires Access and Review be publicised.");
  }
  if (track.trackId === "il-prostitution-j-auto") {
    ok(/carved back in/i.test(text), "prostitution sheet omits the Article 11 carve-in that makes the route work.");
    ok(/Class 4 felony/i.test(text), "prostitution sheet omits the classification the route depends on.");
    ok(/circumstances of the offence/i.test(text), "prostitution sheet does not state that it asks nothing about circumstances.");
    // The design forbids graphic questioning; no such prompt may reach the page.
    ok(!/describe what happened|what were you doing|details of the (act|encounter)/i.test(text),
      "prostitution sheet asks about the circumstances of the offence.");
  }
  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  ok(pages.length === asm.pageCount, `${track.trackId}: page count disagrees with the assembled PDF.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

// A required question the deriver never inspects must still stop resolution.
{
  const f = { ...BASE }; delete f.caseClosedDate;
  let outcome = "generated";
  try {
    const d = il.deriveIllinoisGuidanceFacts("il-auto-seal-2028", f);
    resolvePacket({ jurisdiction: "IL", trackId: "il-auto-seal-2028", facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing caseClosedDate: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content, no predicted completion date.`);

console.log("");
if (failures.length > 0) { console.error("Illinois guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Illinois guidance verification passed.");
for (const l of checks) console.log(l);
console.log("");
console.log("FINAL PACKET RESULTS");
for (const s of samples) console.log(`   ${s.trackId.padEnd(24)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
