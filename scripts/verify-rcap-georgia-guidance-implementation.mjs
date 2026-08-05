// Georgia guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Georgia guidance is not enabled,
// the family is recommended for counsel adoption but not adopted, every
// component has a governing specification and matches the adopted design
// (including the two components the design allocates to the retroactive first
// offender route), the three routes render deterministically into one final
// guidance PDF each, no sheet calls a Georgia remedy an expungement or tells a
// participant they may say the record does not exist, the time-expired sheet
// surfaces the Attorney General's federal-definition determination, the first
// offender sentencing sheet carries both statutory deadlines, the retroactive
// route neither generates nor files a petition, every typed stop names a
// concrete destination, and every closed list fails closed.

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
const ga = await import("@/lib/rcap/packets/jurisdictions/georgia/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/georgia-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

const MY_TRACK_IDS = ga.GEORGIA_GUIDANCE_TRACKS.map(t => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(ga.GEORGIA_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 3, `expected 3 assigned tracks, got ${MY_TRACK_IDS.length}.`);
ok(MY_TEMPLATE_IDS.length === 4, `expected 4 templates, got ${MY_TEMPLATE_IDS.length}.`);
// Georgia already carries custom-pleading routes from a different job, so the
// gate is that none of THESE is wired, not that Georgia is absent.
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some(t => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: none of the three assigned routes is in the shared registry or guidance pack.");

// Injected only into this process, after the absence above is proven.
for (const t of ga.GEORGIA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, ga.GEORGIA_GUIDANCE_TEMPLATES);

ok(ga.GEORGIA_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${ga.GEORGIA_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(ga.GEORGIA_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of MY_TRACK_IDS) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
  ok(!fs.existsSync(path.join(root, "data/record-clearing/production-factory/packet-proofs/rcap-ga-guidance-implementation.json")),
    "the worker branch created the integration-owned packet proof.");
}
for (const track of ga.GEORGIA_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Adoption and promotion: ${ga.GEORGIA_GUIDANCE_TRACKS.length} tracks runtime_disabled, recommended_for_counsel_adoption, counselAdopted false, no integration-owned proof written.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of ga.GEORGIA_GUIDANCE_TRACKS) {
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
    ok(roles.get(c.componentId) === c.role, `${c.componentId}: role differs from the design.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
  }
  const required = new Set((spec.processGuidanceSpecs.find(s => s.trackId === track.trackId)?.generationRequirements ?? [])
    .filter(r => r.requirement === "required").map(r => r.key));
  const asked = new Set(track.requiredInputs.map(i => i.key));
  for (const key of required) ok(asked.has(key), `${track.trackId}: the design requires ${key} and it is not asked.`);
}
note(`3. Specifications: ${ga.GEORGIA_GUIDANCE_TRACKS.reduce((n, t) => n + t.packetSet.components.length, 0)} components, each specified, matching the design's ids and roles.`);

const BASE = {
  // ga-time-expired
  arrestDate: "2019-05-06", offenseClass: "misdemeanor", everCharged: "no",
  backgroundCheckScope: "georgia_only", otherRestrictionRoute: "no_disposition_based_route",
  // ga-fo-sentencing-post2026
  sentencingPosture: "already_sentenced", sentencedUnderFirstOffenderAct: "yes",
  sentencingDate: "2026-09-01", statusRevoked: "no",
  sentencingCourtAndCounty: "Superior Court of Fulton County, 26SC000123",
  representedByCounsel: "no", immigrationConsequence: "no",
  // ga-rfo
  convictingCourtAndCounty: "Superior Court of Bibb County, 05CR1234",
  offenseCodeSection: "O.C.G.A. § 16-8-2", firstOffenderEverUsed: "no",
  informedOfEligibility: "no", historicalCategory: "no",
  prosecutingAttorneyOffice: "district_attorney",
  participantAccount: "Nobody mentioned first offender to me at the hearing.",
  readyForConsentStage: "no"
};
// sentencedUnderFirstOffenderAct means opposite things on the two FO routes.
const FIXTURES = { "ga-rfo": { sentencedUnderFirstOffenderAct: "no" } };
const factsFor = (trackId, override) => ({ ...BASE, ...(FIXTURES[trackId] ?? {}), ...(override ?? {}) });

const NEG = [
  ["ga-time-expired", { everCharged: "yes" }, "mismatch", "charges_were_filed"],
  ["ga-time-expired", { otherRestrictionRoute: "dismissal_nolle_prosse_or_acquittal" }, "mismatch", "disposition_based_restriction_is_the_better_route"],
  ["ga-time-expired", { backgroundCheckScope: "federal_or_multi_state" }, "stop", "federal_or_multi_state_check_not_delivered_by_this_route"],
  ["ga-time-expired", { offenseClass: "traffic" }, "branch"],
  ["ga-time-expired", { backgroundCheckScope: "" }, "branch"],
  ["ga-fo-sentencing-post2026", { sentencingPosture: "being_sentenced_now" }, "stop", "live_criminal_case_belongs_to_defence_counsel"],
  ["ga-fo-sentencing-post2026", { sentencedUnderFirstOffenderAct: "no" }, "mismatch", "not_sentenced_under_the_first_offender_act"],
  ["ga-fo-sentencing-post2026", { statusRevoked: "yes" }, "stop", "first_offender_status_revoked_and_guilt_adjudicated"],
  ["ga-fo-sentencing-post2026", { immigrationConsequence: "yes" }, "stop", "immigration_consequence_in_play"],
  ["ga-fo-sentencing-post2026", { sentencingPosture: "" }, "branch"],
  ["ga-rfo", { sentencedUnderFirstOffenderAct: "yes" }, "mismatch", "already_sentenced_under_the_first_offender_act"],
  ["ga-rfo", { immigrationConsequence: "yes" }, "stop", "immigration_consequence_in_play"],
  ["ga-rfo", { informedOfEligibility: "yes", historicalCategory: "no" }, "mismatch", "told_about_first_offender_and_outside_the_historical_window"],
  ["ga-rfo", { readyForConsentStage: "yes" }, "stop", "consent_stage_is_always_a_handoff"],
  ["ga-rfo", { prosecutingAttorneyOffice: "" }, "branch"],
  ["ga-rfo", { readyForConsentStage: "maybe" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null, routeTo = null;
  try { ga.deriveGeorgiaGuidanceFacts(trackId, factsFor(trackId, override)); }
  catch (e) {
    if (e instanceof ga.GeorgiaGuidanceStopError) { outcome = "stop"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof ga.GeorgiaRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; routeTo = e.routeTo; }
    else if (e instanceof ga.GeorgiaBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
  if (routeTo !== null) {
    ok(routeTo.length > 20, `${trackId}/${detail}: destination is too thin to act on.`);
    ok(!/^(not eligible|contact an attorney|more research)/i.test(routeTo.trim()), `${trackId}/${detail}: generic destination.`);
    ok(/Georgia Justice Project|Second Chance Desk|Records Restriction Desk|The Desk|defence lawyer|public defender|immigration lawyer|route/i.test(routeTo),
      `${trackId}/${detail}: destination names no route or institution.`);
  }
}

// Someone who qualifies on the historical ground must not be turned away merely
// because they were told about first offender treatment.
{
  let outcome = "generated";
  try { ga.deriveGeorgiaGuidanceFacts("ga-rfo", factsFor("ga-rfo", { informedOfEligibility: "yes", historicalCategory: "yes" })); }
  catch { outcome = "refused"; }
  ok(outcome === "generated", "ga-rfo refused a participant qualifying on the 1968-1982 ground.");
}
note(`4. Stops: ${NEG.length} negative cases fail closed, each naming a concrete destination; the historical ground still generates.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

// Georgia's required sentence names the word it refuses, so the ban is per
// sentence and skips any sentence disclaiming the term.
function usesWrongTerm(text, re) {
  return text.split(/(?<=[.;])\s+/).some(
    (sentence) => re.test(sentence) &&
      !/\b(has not used the word expungement|not used expungement|rather than)\b/i.test(sentence) &&
      !/records-restriction desk|expungement desk|Expungement Unit/i.test(sentence)
  );
}
const PROHIBITED = [
  [{ test: (t) => usesWrongTerm(t, /\bexpunge\b|\bexpunged\b|\bexpungement of\b/i) },
    "expungement vocabulary for a Georgia remedy"],
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/you may (say|state) (that )?(the record|it) (does not|never) exist|record does not exist/i,
    "telling the participant they may say the record does not exist"],
  [/will come back clean|guaranteed|we will restrict/i, "an outcome promise"]
];

const samples = [];
for (const track of ga.GEORGIA_GUIDANCE_TRACKS) {
  const facts = ga.deriveGeorgiaGuidanceFacts(track.trackId, factsFor(track.trackId));
  const resolved = resolvePacket({ jurisdiction: "GA", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "GA", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "GA", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "GA", jurisdictionName: "Georgia",
    packetName: resolved.track.assembledPacketName, caseReference: "05CR1234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "GA", jurisdictionName: "Georgia",
    packetName: resolved.track.assembledPacketName, caseReference: "05CR1234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/Georgia says restrict/i.test(text), `${track.trackId}: does not carry the Georgia vocabulary rule.`);
  ok(/must not say that it does not/i.test(text), `${track.trackId}: omits the never-say-it-does-not-exist rule.`);
  ok(/disqualify you from employment or office/i.test(text), `${track.trackId}: omits the § 42-8-63.1 disqualification warning.`);
  ok(/federal law requires/i.test(text), `${track.trackId}: omits that federally required disclosure is not overridden.`);
  ok(/Georgia Justice Project/i.test(text), `${track.trackId}: omits the named referral desks.`);

  if (track.trackId === "ga-time-expired") {
    ok(/two years/i.test(text) && /four years/i.test(text) && /seven years/i.test(text),
      "time-expired sheet omits one of the three statutory periods.");
    ok(/Attorney General determined/i.test(text), "time-expired sheet omits the Attorney General determination.");
    ok(/Federal Bureau of Investigation/i.test(text), "time-expired sheet does not say the record still goes to the FBI.");
    ok(/unrestricts/i.test(text), "time-expired sheet omits that a later indictment unrestricts the record.");
  }
  if (track.trackId === "ga-fo-sentencing-post2026") {
    ok(/sixty days/i.test(text), "first offender sheet omits the clerk's sixty-day deadline.");
    ok(/thirty days/i.test(text), "first offender sheet omits the agencies' thirty-day deadline.");
    ok(/shall limit public access/i.test(text), "first offender sheet does not state the mandatory duty.");
    ok(/were struck/i.test(text), "first offender sheet does not say the discretionary language was struck.");
    ok(/revokes/i.test(text), "first offender sheet omits what revocation undoes.");
  }
  if (track.trackId === "ga-rfo") {
    ok(/does not generate or file/i.test(text), "retroactive sheet does not disclaim generating the petition.");
    ok(/consent/i.test(text), "retroactive sheet omits the consent gate.");
    ok(/no filing fee/i.test(text), "retroactive sheet omits the statutory no-fee rule.");
    ok(/Department of Driver Services/i.test(text), "retroactive sheet omits the order distribution.");
    ok(/in your own words/i.test(text), "retroactive packet omits the factual-record component.");
    ok(/not a petition/i.test(text), "factual-record sheet does not say it is not a petition.");
  }
  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  ok(pages.length === asm.pageCount, `${track.trackId}: page count disagrees with the assembled PDF.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount, components: components.length });
}

// A required question the deriver never inspects must still stop resolution.
{
  const f = factsFor("ga-rfo"); delete f.offenseCodeSection;
  let outcome = "generated";
  try {
    const d = ga.deriveGeorgiaGuidanceFacts("ga-rfo", f);
    resolvePacket({ jurisdiction: "GA", trackId: "ga-rfo", facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing offenseCodeSection: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Georgia guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Georgia guidance verification passed.");
for (const l of checks) console.log(l);
console.log("");
console.log("FINAL PACKET RESULTS");
for (const s of samples) console.log(`   ${s.trackId.padEnd(26)} ${s.components}c ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
