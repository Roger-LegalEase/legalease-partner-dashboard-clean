// California guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: California is not enabled, every
// component has a governing specification and matches the adopted design, the
// three routes render deterministically into one final guidance PDF each, no
// sheet uses expungement vocabulary affirmatively, the conviction sheet states
// that the record stays with a notation added and carries all three of the
// design's corrections, the arrest sheet states that automatic relief and the
// petition routes coexist and prints the three waiting periods without deciding
// whether any has run, the factual innocence sheet distinguishes destruction
// from sealing and refuses to generate the petition, no fee figure appears
// anywhere, and every typed stop, route mismatch and closed list fails closed.

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
const ca = await import("@/lib/rcap/packets/jurisdictions/california/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/california-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "CA").length === 0, "California is wired into the shared registry.");
ok(Object.keys(pg.GUIDANCE_TEMPLATES).filter(k => k.startsWith("ca-")).length === 0, "California templates already in the shared pack.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
ok(ca.CALIFORNIA_GUIDANCE_TRACKS.length === 3, `expected 3 assigned tracks, got ${ca.CALIFORNIA_GUIDANCE_TRACKS.length}.`);
note("1. Enablement: California absent from the shared registry and guidance pack.");

for (const t of ca.CALIFORNIA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, ca.CALIFORNIA_GUIDANCE_TEMPLATES);

for (const track of ca.CALIFORNIA_GUIDANCE_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Promotion: ${ca.CALIFORNIA_GUIDANCE_TRACKS.length} tracks runtime_disabled, awaiting counsel adoption.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of ca.CALIFORNIA_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find(t => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(designed?.outputStrategy === "process_guidance", `${track.trackId}: the design does not call for guidance.`);
  const ids = (designed?.packetSet?.components ?? []).map(c => c.componentId);
  ok(ids.length === track.packetSet.components.length, `${track.trackId}: component count differs from the design.`);
  for (const c of track.packetSet.components) {
    ok(ids.includes(c.componentId), `${c.componentId}: not in the adopted packet set.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
  }
  const required = new Set((spec.processGuidanceSpecs.find(s => s.trackId === track.trackId)?.generationRequirements ?? [])
    .filter(r => r.requirement === "required").map(r => r.key));
  const asked = new Set(track.requiredInputs.map(i => i.key));
  for (const key of required) ok(asked.has(key), `${track.trackId}: the design requires ${key} and it is not asked.`);
}
note(`3. Specifications: ${ca.CALIFORNIA_GUIDANCE_TRACKS.length} components, each specified, matching the design, asking every required question.`);

const BASE = {
  recordTypeSought: "conviction",
  goal: "check_whether_relief_happened",
  prosecutorPetitionFiled: "no",
  hasRequestedDojRecord: "yes",
  reliefNotationPresent: "yes",
  reductionInterest: "no",
  arrestDate: "2019-05-06",
  arrestOutcome: "no_conviction",
  offenseLevel: "misdemeanor",
  seeksFactualInnocence: "yes",
  arrestCityCounty: "Oakland, Alameda County"
};

const NEG = [
  ["ca-auto-conviction", { recordTypeSought: "arrest" }, "mismatch", "asking_about_an_arrest_not_a_conviction"],
  ["ca-auto-conviction", { goal: "dismissal_sealing_resentencing_or_reduction" }, "mismatch", "goal_requires_a_petition"],
  ["ca-auto-conviction", { goal: "challenge_record_accuracy" }, "stop", "accuracy_challenge_beyond_the_claim_form"],
  ["ca-auto-conviction", { prosecutorPetitionFiled: "yes" }, "stop", "prosecutor_petitioned_to_prohibit_relief"],
  ["ca-auto-conviction", { reliefNotationPresent: "maybe" }, "branch"],
  ["ca-auto-conviction", { recordTypeSought: "" }, "branch"],
  ["ca-auto-conviction", { reductionInterest: "sure" }, "branch"],
  ["ca-auto-arrest", { arrestOutcome: "convicted" }, "mismatch", "matter_ended_in_a_conviction"],
  ["ca-auto-arrest", { goal: "seal_by_petition" }, "mismatch", "wants_sealing_by_petition"],
  ["ca-auto-arrest", { goal: "factual_innocence_finding" }, "mismatch", "wants_a_factual_innocence_finding"],
  ["ca-auto-arrest", { goal: "challenge_record_accuracy" }, "stop", "accuracy_challenge_beyond_the_claim_form"],
  ["ca-auto-arrest", { arrestDate: "1972-12-31" }, "stop", "arrest_predates_the_automatic_scheme"],
  ["ca-auto-arrest", { arrestDate: "6 May 2019" }, "branch"],
  ["ca-auto-arrest", { arrestDate: "2019-02-30" }, "branch"],
  ["ca-auto-arrest", { offenseLevel: "infraction" }, "branch"],
  ["ca-851-8", { seeksFactualInnocence: "no" }, "mismatch", "not_seeking_a_factual_innocence_finding"],
  ["ca-851-8", { seeksFactualInnocence: "" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null;
  try { ca.deriveCaliforniaGuidanceFacts(trackId, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof ca.CaliforniaGuidanceStopError) { outcome = "stop"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: stop lost its destination.`); }
    else if (e instanceof ca.CaliforniaRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: mismatch lost its destination.`); }
    else if (e instanceof ca.CaliforniaBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
}

// The 1 January 1973 floor is a boundary, so it is pinned on the day itself.
{
  ok(ca.CA_AUTOMATIC_ARREST_FLOOR === "1973-01-01", `the automatic arrest floor moved: ${ca.CA_AUTOMATIC_ARREST_FLOOR}.`);
  let onFloor = "generated";
  try { ca.deriveCaliforniaGuidanceFacts("ca-auto-arrest", { ...BASE, arrestDate: ca.CA_AUTOMATIC_ARREST_FLOOR }); }
  catch { onFloor = "refused"; }
  ok(onFloor === "generated", "an arrest ON 1 January 1973 was refused by the automatic route.");
}
note(`4. Stops: ${NEG.length} negative cases fail closed, each stop and mismatch carrying a destination; the 1 January 1973 floor is inclusive.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

// The conviction sheet's required correction NAMES the words it refuses, so a
// keyword ban would flag the disclosure that makes the sheet correct. What is
// prohibited is USING expungement vocabulary for California relief, so the test
// is per sentence and skips any sentence disclaiming the term.
function usesWrongTerm(text, re) {
  return text.split(/(?<=[.;])\s+/).some(
    (sentence) => re.test(sentence) &&
      !/\b(not an expungement|not a dismissal|is not a sealing|rather than)\b/i.test(sentence)
  );
}
const PROHIBITED = [
  [{ test: (t) => usesWrongTerm(t, /\bexpunge|\bexpungement/i) }, "expungement vocabulary, which California automatic relief is not"],
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"]
];

const samples = [];
for (const track of ca.CALIFORNIA_GUIDANCE_TRACKS) {
  const facts = ca.deriveCaliforniaGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "CA", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "CA", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "CA", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "CA", jurisdictionName: "California",
    packetName: resolved.track.assembledPacketName, caseReference: "RG-19-0123456",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "CA", jurisdictionName: "California",
    packetName: resolved.track.assembledPacketName, caseReference: "RG-19-0123456",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);

  if (track.trackId === "ca-auto-conviction") {
    // All three of the design's packet instructions, on the page.
    ok(/not a dismissal/i.test(text), "conviction sheet does not deny that this is a dismissal.");
    ok(/not an expungement/i.test(text), "conviction sheet does not deny that this is an expungement.");
    ok(/stays on your state summary criminal history/i.test(text), "conviction sheet does not say the record stays.");
    ok(/not a verdict/i.test(text), "conviction sheet does not say an absent notation is not a finding of ineligibility.");
    ok(/do not access Department of Justice records/i.test(text), "conviction sheet omits the commercial background check point.");
    ok(/Commission on Teacher Credentialing/i.test(text), "conviction sheet omits the checks that still see everything.");
    ok(/1 October 2024/.test(text), "conviction sheet omits the operative commencement date.");
  }
  if (track.trackId === "ca-auto-arrest") {
    ok(/does not limit petitions/i.test(text), "arrest sheet does not state that the petition routes are preserved.");
    ok(/one year from the arrest/i.test(text), "arrest sheet omits the misdemeanour waiting period.");
    ok(/six years from the arrest/i.test(text), "arrest sheet omits the eight-or-more-years felony waiting period.");
    ok(/no additional wait/i.test(text), "arrest sheet omits the diversion rule.");
    ok(/1 January 1973/.test(text), "arrest sheet omits the scheme floor.");
    ok(/does not decide whether the period has run/i.test(text), "arrest sheet does not refuse to determine eligibility.");
  }
  if (track.trackId === "ca-851-8") {
    ok(/only routine California path/i.test(text), "factual innocence sheet does not state it is the only routine destruction path.");
    ok(/is not destruction/i.test(text), "factual innocence sheet does not distinguish sealing from destruction.");
    ok(/does not generate/i.test(text), "factual innocence sheet does not disclaim generating the petition.");
    ok(/CR-409/.test(text), "factual innocence sheet omits the form that must carry notice of this option.");
  }
  for (const [i, page] of pdfPageTexts(file).entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

// A required question the deriver never inspects must still stop resolution.
{
  const f = { ...BASE }; delete f.arrestCityCounty;
  let outcome = "generated";
  try {
    const d = ca.deriveCaliforniaGuidanceFacts("ca-851-8", f);
    resolvePacket({ jurisdiction: "CA", trackId: "ca-851-8", facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing arrestCityCounty: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content, no fee figure.`);

console.log("");
if (failures.length > 0) { console.error("California guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("California guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) console.log(`   ${s.trackId.padEnd(22)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

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
