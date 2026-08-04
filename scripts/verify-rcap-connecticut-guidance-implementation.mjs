// Connecticut guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Connecticut is not enabled, every
// component has a governing specification, the six implemented routes render
// deterministically into one final guidance PDF each, the blocked Clean Slate
// route keeps its typed stop, the statutory term "erasure" is used and neither
// "expungement" nor "sealing" appears, no unverified Board waiting period or
// fee is quoted, no list of diversionary programmes is published, the
// multi-count defeat is stated on every erasure sheet, the non-conviction sheet
// routes verification away from the conviction-only State Police record, and
// every typed stop and closed list fails closed.

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
const ct = await import("@/lib/rcap/packets/jurisdictions/connecticut/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/connecticut-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "CT").length === 0, "Connecticut is wired into the shared registry.");
ok(Object.keys(pg.GUIDANCE_TEMPLATES).filter(k => k.startsWith("ct-")).length === 0, "Connecticut templates already in the shared pack.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: Connecticut absent from the shared registry and guidance pack.");

for (const t of ct.CONNECTICUT_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, ct.CONNECTICUT_GUIDANCE_TEMPLATES);

for (const track of ct.CONNECTICUT_GUIDANCE_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Promotion: ${ct.CONNECTICUT_GUIDANCE_TRACKS.length} tracks runtime_disabled, awaiting counsel adoption.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of ct.CONNECTICUT_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find(t => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  const ids = (designed?.packetSet?.components ?? []).map(c => c.componentId);
  ok(ids.length === track.packetSet.components.length, `${track.trackId}: component count differs from the design.`);
  for (const c of track.packetSet.components) {
    ok(ids.includes(c.componentId), `${c.componentId}: not in the adopted packet set.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
  }
}
note(`3. Specifications: ${ct.CONNECTICUT_GUIDANCE_TRACKS.length} components, each specified and matching the design.`);

// Blocked route keeps its typed stop.
for (const id of ct.CONNECTICUT_BLOCKED_TRACK_IDS) {
  let e = null;
  try { ct.assertConnecticutTrackImplemented(id); } catch (err) { e = err; }
  ok(e instanceof ct.ConnecticutTrackUnavailableError, `${id}: no typed stop.`);
  ok((e?.openQuestions ?? []).length === 2, `${id}: the stop does not carry both open questions.`);
  ok(!ct.CONNECTICUT_GUIDANCE_TRACKS.some(t => t.trackId === id), `${id} is blocked but was also built.`);
  let d = null;
  try { ct.deriveConnecticutGuidanceFacts(id, {}); } catch (err) { d = err; }
  ok(d instanceof ct.ConnecticutTrackUnavailableError, `${id}: the deriver did not refuse it.`);
}
note(`4. Blocked route: ct-cleanslate-auto keeps a typed stop carrying both open eligibility questions.`);

const BASE = {
  immigrationMatter: "no",
  caseOutcome: "dismissed", dispositionDate: "4 April 2021", appealOpen: "no",
  everyCountErasable: "every_count_erasable",
  convictionDate: "6 June 2012", statuteSection: "Conn. Gen. Stat. § 21a-279(c)",
  programmeName: "Accelerated Rehabilitation", completedProgramme: "yes", endedInDismissal: "yes",
  finalDispositionDate: "4 April 2021", recordsAlreadyErased: "yes", threeYearsElapsed: "yes",
  courtLocation: "Hartford JD", pardonGoal: "clear_the_record",
  convictionsSought: "Hartford JD, H14N-CR12-0123456, 6 June 2012",
  sentenceCompletionDate: "1 January 2015", checkedErasure: "yes",
  barrierConvictions: "Hartford JD, H14N-CR12-0123456, 6 June 2012"
};
const FIXTURES = {
  "ct-provisional-pardon": { pardonGoal: "remove_an_employment_or_licensing_barrier" }
};

const NEG = [
  ["ct-nonconviction-auto", { immigrationMatter: "yes" }, "stop", "immigration_matter"],
  ["ct-cannabis-auto", { immigrationMatter: "yes" }, "stop", "immigration_matter"],
  ["ct-nonconviction-auto", { caseOutcome: "not_guilty_mental_disease_or_defect" }, "stop", "finding_outside_automatic_erasure"],
  ["ct-nonconviction-auto", { caseOutcome: "guilty_but_not_criminally_responsible" }, "stop", "finding_outside_automatic_erasure"],
  ["ct-nonconviction-auto", { appealOpen: "yes" }, "stop", "appeal_open_or_window_running"],
  ["ct-cannabis-auto", { everyCountErasable: "some_count_not_erasable" }, "stop", "multi_count_defeat"],
  ["ct-cannabis-auto", { everyCountErasable: "unsure" }, "stop", "multi_count_defeat"],
  ["ct-diversion", { endedInDismissal: "no" }, "stop", "programme_did_not_end_in_dismissal"],
  ["ct-destruction-request", { recordsAlreadyErased: "no" }, "mismatch", "records_not_yet_erased"],
  ["ct-destruction-request", { threeYearsElapsed: "no" }, "stop", "three_year_period_not_elapsed"],
  ["ct-absolute-pardon", { pardonGoal: "remove_an_employment_or_licensing_barrier" }, "mismatch", "pardon_goal_belongs_to_the_other_route"],
  ["ct-provisional-pardon", { pardonGoal: "clear_the_record" }, "mismatch", "pardon_goal_belongs_to_the_other_route"],
  ["ct-nonconviction-auto", { immigrationMatter: "maybe" }, "branch"],
  ["ct-nonconviction-auto", { caseOutcome: "" }, "branch"],
  ["ct-cannabis-auto", { everyCountErasable: "probably" }, "branch"],
  ["ct-absolute-pardon", { pardonGoal: "both" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null;
  try { ct.deriveConnecticutGuidanceFacts(trackId, { ...BASE, ...(FIXTURES[trackId] ?? {}), ...override }); }
  catch (e) {
    if (e instanceof ct.ConnecticutGuidanceStopError) { outcome = "stop"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: stop lost its destination.`); }
    else if (e instanceof ct.ConnecticutRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: mismatch lost its destination.`); }
    else if (e instanceof ct.ConnecticutBranchError) outcome = "branch";
    else outcome = "unexpected";
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
}
note(`5. Stops: ${NEG.length} negative cases fail closed, each stop and mismatch carrying a destination.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const ERASURE_SHEETS = new Set(["ct-nonconviction-auto", "ct-cannabis-auto", "ct-diversion"]);
// Connecticut's own required sentence NAMES the two words it does not use, so
// a keyword ban would flag the disclosure that makes the sheet correct. What is
// prohibited is USING either word for a Connecticut remedy, so the test is per
// sentence and skips any sentence that is disclaiming the term.
function usesWrongTerm(text, re) {
  return text.split(/(?<=[.;])\s+/).some(
    (sentence) => re.test(sentence) && !/\b(does not say|not expungement|not sealing|rather than)\b/i.test(sentence)
  );
}
const PROHIBITED = [
  [{ test: (t) => usesWrongTerm(t, /\bexpunge|\bexpungement/i) }, "expungement vocabulary, which Connecticut does not use"],
  [{ test: (t) => usesWrongTerm(t, /\bsealing\b|\bsealed\b/i) }, "sealing vocabulary, which Connecticut does not use"],
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/\b(three|five)[- ]year waiting period\b/i, "an unverified Board waiting period"]
];

const samples = [];
for (const track of ct.CONNECTICUT_GUIDANCE_TRACKS) {
  const facts = ct.deriveConnecticutGuidanceFacts(track.trackId, { ...BASE, ...(FIXTURES[track.trackId] ?? {}) });
  const resolved = resolvePacket({ jurisdiction: "CT", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "CT", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "CT", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "CT", jurisdictionName: "Connecticut",
    packetName: resolved.track.assembledPacketName, caseReference: "H14N-CR12-0123456",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "CT", jurisdictionName: "Connecticut",
    packetName: resolved.track.assembledPacketName, caseReference: "H14N-CR12-0123456",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/Connecticut says erasure/i.test(text), `${track.trackId}: does not state the statutory term.`);
  if (ERASURE_SHEETS.has(track.trackId)) {
    ok(/nothing on that record is erased/i.test(text), `${track.trackId}: missing the multi-count defeat.`);
    ok(/does not currently notify/i.test(text), `${track.trackId}: does not say the state gives no notice.`);
  }
  if (track.trackId === "ct-nonconviction-auto")
    ok(/conviction-only/i.test(text), "non-conviction sheet does not warn that the State Police record is conviction-only.");
  if (track.trackId === "ct-absolute-pardon") {
    ok(/unverified/i.test(text), "absolute pardon sheet does not flag the figures as unverified.");
    ok(/does not generate or submit/i.test(text), "absolute pardon sheet does not disclaim generating the application.");
  }
  if (track.trackId === "ct-diversion")
    ok(/does not publish a list|ask about yours/i.test(text), "diversion sheet publishes or implies a verified programme list.");
  if (track.trackId === "ct-destruction-request") {
    ok(/three years/i.test(text), "destruction sheet omits the three-year rule.");
    ok(/does not generate/i.test(text), "destruction sheet does not disclaim generating the request.");
  }
  for (const [i, page] of pdfPageTexts(file).entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

{
  const f = { ...BASE }; delete f.dispositionDate;
  let outcome = "generated";
  try {
    const d = ct.deriveConnecticutGuidanceFacts("ct-nonconviction-auto", f);
    resolvePacket({ jurisdiction: "CT", trackId: "ct-nonconviction-auto", facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing dispositionDate: got ${outcome}.`);
}

note(`6. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Connecticut guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Connecticut guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) console.log(`   ${s.trackId.padEnd(28)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
console.log("7. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

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
