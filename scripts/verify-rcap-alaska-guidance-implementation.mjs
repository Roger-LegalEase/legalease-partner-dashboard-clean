// Alaska guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Alaska is not enabled, every
// component has a governing specification and matches the adopted design, the
// four routes render deterministically into one final guidance PDF each, every
// sheet carries the no-general-adult-expungement sentence and no sheet uses
// expungement vocabulary for a remedy Alaska offers, the pardon sheet carries
// the grant numbers the design requires and refuses to generate the
// application, the suspended-entry-of-judgment sheet stops an active case to
// defence counsel, the confidentiality sheet distinguishes agency release from
// court publication, the juvenile sheet states the scope limit and the
// automatic sealing, and every typed stop and closed list fails closed.

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
const ak = await import("@/lib/rcap/packets/jurisdictions/alaska/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/alaska-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "AK").length === 0, "Alaska is wired into the shared registry.");
ok(Object.keys(pg.GUIDANCE_TEMPLATES).filter(k => k.startsWith("ak-")).length === 0, "Alaska templates already in the shared pack.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
ok(ak.ALASKA_GUIDANCE_TRACKS.length === 4, `expected 4 assigned tracks, got ${ak.ALASKA_GUIDANCE_TRACKS.length}.`);
note("1. Enablement: Alaska absent from the shared registry and guidance pack.");

for (const t of ak.ALASKA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, ak.ALASKA_GUIDANCE_TEMPLATES);

for (const track of ak.ALASKA_GUIDANCE_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Promotion: ${ak.ALASKA_GUIDANCE_TRACKS.length} tracks runtime_disabled, awaiting counsel adoption.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of ak.ALASKA_GUIDANCE_TRACKS) {
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
note(`3. Specifications: ${ak.ALASKA_GUIDANCE_TRACKS.length} components, each specified, matching the design, asking every required question.`);

const BASE = {
  caseActive: "no",
  immigrationMatter: "no",
  disposition: "dismissed",
  convictionDetails: "Anchorage, 3AN-05-01234CR, 6 June 2005",
  convictionOrigin: "alaska_state",
  needsRepresentation: "no",
  juvenileRecord: "yes"
};

const NEG = [
  ["ak-sej", { caseActive: "yes" }, "stop", "active_case_needs_defence_representation"],
  ["ak-sej", { caseActive: "maybe" }, "branch"],
  ["ak-nonconviction-confidential", { immigrationMatter: "yes" }, "stop", "immigration_matter"],
  ["ak-nonconviction-confidential", { disposition: "convicted" }, "mismatch", "case_ended_in_a_conviction"],
  ["ak-nonconviction-confidential", { disposition: "probably" }, "branch"],
  ["ak-pardon", { immigrationMatter: "yes" }, "stop", "immigration_matter"],
  ["ak-pardon", { convictionOrigin: "federal" }, "mismatch", "conviction_is_not_an_alaska_state_conviction"],
  ["ak-pardon", { convictionOrigin: "another_state" }, "mismatch", "conviction_is_not_an_alaska_state_conviction"],
  ["ak-pardon", { needsRepresentation: "yes" }, "stop", "needs_individualized_advocacy"],
  ["ak-pardon", { convictionOrigin: "" }, "branch"],
  ["ak-juvenile", { juvenileRecord: "no" }, "mismatch", "record_is_not_a_juvenile_record"],
  ["ak-juvenile", { juvenileRecord: "" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null;
  try { ak.deriveAlaskaGuidanceFacts(trackId, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof ak.AlaskaGuidanceStopError) { outcome = "stop"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: stop lost its destination.`); }
    else if (e instanceof ak.AlaskaRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: mismatch lost its destination.`); }
    else if (e instanceof ak.AlaskaBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
}

// The immigration stop is applied where the design records it and nowhere else,
// so a route without that stop condition must not acquire one by accident.
{
  let outcome = "generated";
  try { ak.deriveAlaskaGuidanceFacts("ak-sej", { ...BASE, immigrationMatter: "yes" }); }
  catch { outcome = "refused"; }
  ok(outcome === "generated", "ak-sej gained an immigration stop the design does not record.");
}
note(`4. Stops: ${NEG.length} negative cases fail closed, each stop and mismatch carrying a destination.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

// Alaska's own required sentence NAMES the word it forbids, so a keyword ban
// would flag the disclosure that makes the sheet correct. What is prohibited is
// USING expungement vocabulary for a remedy Alaska offers, so the test is per
// sentence and skips any sentence that is disclaiming the term.
function usesWrongTerm(text, re) {
  return text.split(/(?<=[.;])\s+/).some(
    (sentence) => re.test(sentence) &&
      !/\b(no general adult expungement|nobody can expunge|cannot be expunged|is not expungement)\b/i.test(sentence)
  );
}
const PROHIBITED = [
  [{ test: (t) => usesWrongTerm(t, /\bexpunge|\bexpungement/i) }, "expungement vocabulary, which Alaska does not offer for convictions"],
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"]
];

const samples = [];
for (const track of ak.ALASKA_GUIDANCE_TRACKS) {
  const facts = ak.deriveAlaskaGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "AK", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "AK", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "AK", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "AK", jurisdictionName: "Alaska",
    packetName: resolved.track.assembledPacketName, caseReference: "3AN-05-01234CR",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "AK", jurisdictionName: "Alaska",
    packetName: resolved.track.assembledPacketName, caseReference: "3AN-05-01234CR",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/no general adult expungement in Alaska/i.test(text), `${track.trackId}: does not carry the Alaska headline.`);

  if (track.trackId === "ak-sej") {
    ok(/not convicted of a crime/i.test(text), "SEJ sheet does not state that no conviction results.");
    ok(/defence lawyer/i.test(text), "SEJ sheet does not send an active case to defence counsel.");
    ok(/was not obtained for this review/i.test(text), "SEJ sheet does not disclose the unacquired statutory text.");
  }
  if (track.trackId === "ak-nonconviction-confidential") {
    ok(/different protection/i.test(text), "confidentiality sheet does not distinguish agency release from court publication.");
    ok(/consent/i.test(text), "confidentiality sheet omits the consent gap.");
    ok(/was not obtained for this review/i.test(text), "confidentiality sheet does not disclose the unacquired statutory text.");
  }
  if (track.trackId === "ak-pardon") {
    // The design's limitation: the copy must carry the grant numbers, because
    // presenting a pardon as a remaining option without them would mislead.
    ok(/three pardons have been granted since 1995/i.test(text), "pardon sheet omits the grants-since-1995 figure.");
    ok(/none since 2007/i.test(text), "pardon sheet omits that there have been no grants since 2007.");
    ok(/2011 through 2023/.test(text), "pardon sheet omits the Board's 2011-2023 statistics.");
    ok(/188 grants/.test(text), "pardon sheet omits the since-statehood figure.");
    ok(/1959/.test(text), "pardon sheet omits the statehood baseline.");
    ok(/does not generate or submit/i.test(text), "pardon sheet does not disclaim generating the application.");
    ok(/remains on the record/i.test(text), "pardon sheet does not say the conviction remains on the record.");
  }
  if (track.trackId === "ak-juvenile") {
    ok(/outside the adult scope/i.test(text), "juvenile sheet does not state the scope limit.");
    ok(/30 days/.test(text), "juvenile sheet omits the automatic sealing deadline.");
    ok(/first degree arson/i.test(text), "juvenile sheet omits the exceptions.");
    ok(/five years/i.test(text), "juvenile sheet omits the charged-as-an-adult timing.");
  }
  for (const [i, page] of pdfPageTexts(file).entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

// A required question the deriver never inspects must still stop resolution.
{
  const f = { ...BASE }; delete f.convictionDetails;
  let outcome = "generated";
  try {
    const d = ak.deriveAlaskaGuidanceFacts("ak-pardon", f);
    resolvePacket({ jurisdiction: "AK", trackId: "ak-pardon", facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing convictionDetails: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Alaska guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Alaska guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) console.log(`   ${s.trackId.padEnd(30)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
