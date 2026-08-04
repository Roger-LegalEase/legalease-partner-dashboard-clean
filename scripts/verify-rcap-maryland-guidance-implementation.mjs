// Maryland guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: none of the five assigned routes
// is wired into the shared registry or guidance pack, every component has a
// governing specification and matches the adopted design, all five render
// deterministically into one final guidance PDF each, the statutory term
// "expungement" is used and no sheet calls one of these routes shielding, no
// fee amount is printed, the § 10-103.1 sheet refuses to invent a remedy the
// design records as unresolved, the § 10-112 sheet flags the unconfirmed
// statutory change rather than asserting either version, the closed pre-2007
// route says it is closed and preserves the DC-CR-071 naming point, the
// 1 October 2007 routing boundary is exact in both directions, and every typed
// stop, route mismatch and closed list fails closed.

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
const md = await import("@/lib/rcap/packets/jurisdictions/maryland/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/maryland-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

// Maryland already carries the shielding track and its participant guide, which
// belong to a different job. The gate is therefore that none of THESE five
// routes and none of THESE five templates is already wired, not that Maryland
// is absent altogether.
const MY_TRACK_IDS = md.MARYLAND_GUIDANCE_TRACKS.map((t) => t.trackId);
const MY_TEMPLATE_IDS = Object.keys(md.MARYLAND_PROCESS_GUIDANCE_TEMPLATES);
ok(MY_TRACK_IDS.length === 5, `expected 5 assigned tracks, got ${MY_TRACK_IDS.length}.`);
ok(MY_TEMPLATE_IDS.length === 5, `expected 5 templates, got ${MY_TEMPLATE_IDS.length}.`);
for (const id of MY_TRACK_IDS)
  ok(!RELIEF_TRACKS.some((t) => t.trackId === id), `${id} is already wired into the shared registry.`);
for (const id of MY_TEMPLATE_IDS)
  ok(!pg.GUIDANCE_TEMPLATES[id], `${id} is already in the shared guidance pack.`);
ok(RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: none of the five assigned routes is in the shared registry or guidance pack.");

for (const t of md.MARYLAND_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, md.MARYLAND_PROCESS_GUIDANCE_TEMPLATES);

for (const track of md.MARYLAND_GUIDANCE_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`2. Promotion: ${md.MARYLAND_GUIDANCE_TRACKS.length} tracks runtime_disabled, awaiting counsel adoption.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map((s) => s.trackId));
for (const track of md.MARYLAND_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(designed?.outputStrategy === "process_guidance", `${track.trackId}: the design does not call for guidance.`);
  const ids = (designed?.packetSet?.components ?? []).map((c) => c.componentId);
  ok(ids.length === track.packetSet.components.length, `${track.trackId}: component count differs from the design.`);
  for (const c of track.packetSet.components) {
    ok(ids.includes(c.componentId), `${c.componentId}: not in the adopted packet set.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
  }
  // Every question the design requires is asked.
  const required = new Set((spec.processGuidanceSpecs.find((s) => s.trackId === track.trackId)?.generationRequirements ?? [])
    .filter((r) => r.requirement === "required").map((r) => r.key));
  const asked = new Set(track.requiredInputs.map((i) => i.key));
  for (const key of required) ok(asked.has(key), `${track.trackId}: the design requires ${key} and it is not asked.`);
}
note(`3. Specifications: ${md.MARYLAND_GUIDANCE_TRACKS.length} components, each specified, matching the design, asking every required question.`);

const BASE = {
  // md_10105_1_automatic
  disposition: "dismissal", dispositionDate: "2021-04-04",
  treatmentRequirement: "no", needsReliefSooner: "no",
  // md_10112_dpscs_cannabis
  cannabisOnlyCharge: "yes", chargeIssuedBefore2023: "yes",
  checkedCaseSearch: "yes", caseStillAppears: "no",
  // md_10103_1_automatic
  arrestDate: "2019-05-06", releasedWithoutCharge: "yes", recordsStillAppear: "no",
  // md_10103_legacy_police
  incidentDate: "2003-03-04", lawEnforcementUnit: "Baltimore Police Department", priorRequestMade: "no",
  // md_10104_pre_service
  wasServed: "no", allChargesNolled: "yes", districtCourtCase: "yes", recordStillAppears: "no"
};

const NEG = [
  ["md_10105_1_automatic", { disposition: "probation_before_judgment" }, "stop", "disposition_outside_automatic_expungement"],
  ["md_10105_1_automatic", { disposition: "conviction" }, "stop", "disposition_outside_automatic_expungement"],
  ["md_10105_1_automatic", { disposition: "other_disposition" }, "stop", "disposition_outside_automatic_expungement"],
  ["md_10105_1_automatic", { treatmentRequirement: "yes" }, "stop", "nolle_prosequi_with_treatment_requirement"],
  ["md_10105_1_automatic", { needsReliefSooner: "yes" }, "mismatch", "relief_needed_before_the_automatic_date"],
  ["md_10105_1_automatic", { disposition: "maybe" }, "branch"],
  ["md_10105_1_automatic", { dispositionDate: "4 April 2021" }, "branch"],
  ["md_10105_1_automatic", { dispositionDate: "2021-02-30" }, "branch"],
  ["md_10112_dpscs_cannabis", { cannabisOnlyCharge: "no" }, "mismatch", "cannabis_was_not_the_only_charge"],
  ["md_10112_dpscs_cannabis", { chargeIssuedBefore2023: "no" }, "stop", "charge_issued_outside_the_swept_window"],
  ["md_10112_dpscs_cannabis", { checkedCaseSearch: "no" }, "stop", "case_search_not_yet_checked"],
  ["md_10112_dpscs_cannabis", { caseStillAppears: "yes" }, "mismatch", "case_still_appears_after_the_sweep"],
  ["md_10103_1_automatic", { arrestDate: "2001-06-06" }, "mismatch", "arrest_predates_the_automatic_police_record_route"],
  ["md_10103_1_automatic", { releasedWithoutCharge: "no" }, "mismatch", "charges_were_filed"],
  ["md_10103_1_automatic", { recordsStillAppear: "yes" }, "stop", "agency_has_not_complied_and_the_remedy_is_unresolved"],
  ["md_10103_1_automatic", { arrestDate: "not-a-date" }, "branch"],
  ["md_10103_legacy_police", { incidentDate: "2019-05-06" }, "mismatch", "incident_falls_under_the_automatic_police_record_route"],
  ["md_10103_legacy_police", { priorRequestMade: "yes" }, "stop", "timely_request_already_made_and_the_matter_is_contested"],
  ["md_10104_pre_service", { wasServed: "yes" }, "mismatch", "participant_was_served"],
  ["md_10104_pre_service", { allChargesNolled: "no" }, "stop", "not_every_charge_was_dropped"],
  ["md_10104_pre_service", { districtCourtCase: "no" }, "mismatch", "case_was_not_in_the_district_court"],
  ["md_10104_pre_service", { recordStillAppears: "yes" }, "mismatch", "record_still_appears"],
  ["md_10104_pre_service", { wasServed: "" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null;
  try { md.deriveMarylandGuidanceFacts(trackId, { ...BASE, ...override }); }
  catch (e) {
    if (e instanceof md.MarylandGuidanceStopError) { outcome = "stop"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: stop lost its destination.`); }
    else if (e instanceof md.MarylandRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: mismatch lost its destination.`); }
    else if (e instanceof md.MarylandBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
}
note(`4. Stops: ${NEG.length} negative cases fail closed, each stop and mismatch carrying a destination.`);

// The 1 October 2007 boundary decides which police-record route a participant
// is on, so it is pinned on both sides rather than left to a comparison.
{
  const B = md.MD_POLICE_RECORD_BOUNDARY;
  ok(B === "2007-10-01", `the police-record boundary moved: ${B}.`);
  let onBoundary = "generated";
  try { md.deriveMarylandGuidanceFacts("md_10103_1_automatic", { ...BASE, arrestDate: B }); }
  catch { onBoundary = "refused"; }
  ok(onBoundary === "generated", "an arrest ON 1 October 2007 was refused by the automatic route.");

  let legacyOnBoundary = "generated";
  try { md.deriveMarylandGuidanceFacts("md_10103_legacy_police", { ...BASE, incidentDate: B }); }
  catch (e) { legacyOnBoundary = e instanceof md.MarylandRouteMismatchError ? "mismatch" : "other"; }
  ok(legacyOnBoundary === "mismatch", "an incident ON 1 October 2007 was not routed off the legacy route.");

  let dayBefore = "generated";
  try { md.deriveMarylandGuidanceFacts("md_10103_1_automatic", { ...BASE, arrestDate: "2007-09-30" }); }
  catch (e) { dayBefore = e instanceof md.MarylandRouteMismatchError ? "mismatch" : "other"; }
  ok(dayBefore === "mismatch", "an arrest the day before the boundary was not routed to the legacy route.");
}
note("5. Boundary: 1 October 2007 routes exactly — on the day is automatic, the day before is the legacy route.");

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

// Maryland's own required sentence NAMES the word it does not use for these
// routes, so a keyword ban would flag the disclosure that makes the sheet
// correct. What is prohibited is CALLING one of these routes shielding, so the
// test is per sentence and skips any sentence disclaiming the term.
function usesWrongTerm(text, re) {
  return text.split(/(?<=[.;])\s+/).some(
    (sentence) => re.test(sentence) && !/\b(is not shielding|not the same as shielding|rather than)\b/i.test(sentence)
  );
}
const PROHIBITED = [
  [{ test: (t) => usesWrongTerm(t, /\bshielding\b|\bshielded\b/i) }, "shielding vocabulary, which is a different Maryland process"],
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"]
];

const samples = [];
for (const track of md.MARYLAND_GUIDANCE_TRACKS) {
  const facts = md.deriveMarylandGuidanceFacts(track.trackId, BASE);
  const resolved = resolvePacket({ jurisdiction: "MD", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "MD", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "MD", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "MD", jurisdictionName: "Maryland",
    packetName: resolved.track.assembledPacketName, caseReference: "D-081-CR-21-000123",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "MD", jurisdictionName: "Maryland",
    packetName: resolved.track.assembledPacketName, caseReference: "D-081-CR-21-000123",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/Maryland says expungement/i.test(text), `${track.trackId}: does not state the statutory term.`);
  ok(/nothing for you to file/i.test(text), `${track.trackId}: does not say there is nothing to file.`);
  ok(/may still be required to disclose/i.test(text), `${track.trackId}: omits the disclosure limit.`);

  if (track.trackId === "md_10105_1_automatic") {
    ok(/three years after disposition/i.test(text), "automatic sheet omits the three-year rule.");
    ok(/probation before judgment/i.test(text), "automatic sheet does not warn about probation before judgment.");
    ok(/general waiver and release/i.test(text), "automatic sheet does not name the early-filing trade-off.");
  }
  if (track.trackId === "md_10112_dpscs_cannabis") {
    ok(/1 July 2023/i.test(text), "cannabis sheet omits the qualifying window.");
    ok(/unconfirmed/i.test(text), "cannabis sheet does not flag the unconfirmed statutory change.");
    ok(/Case Search/i.test(text), "cannabis sheet does not route the check to Case Search.");
  }
  if (track.trackId === "md_10103_1_automatic") {
    ok(/60 days/i.test(text), "police-record sheet omits the 60-day deadline.");
    ok(/not clearly settled/i.test(text), "police-record sheet does not say the non-compliance remedy is unsettled.");
    ok(/does not hand you a form/i.test(text), "police-record sheet does not refuse to invent a filing.");
  }
  if (track.trackId === "md_10103_legacy_police") {
    ok(/window has closed/i.test(text), "legacy sheet does not say the request window has closed.");
    ok(/DC-CR-071/.test(text), "legacy sheet omits the form identification.");
    ok(/District Court, not the District of Columbia/i.test(text), "legacy sheet does not preserve the DC-CR-071 naming point.");
    ok(/does not generate/i.test(text), "legacy sheet does not disclaim generating the request.");
  }
  if (track.trackId === "md_10104_pre_service") {
    ok(/no costs may be assessed/i.test(text), "pre-service sheet omits the no-costs rule.");
    ok(/never served/i.test(text), "pre-service sheet does not state the never-served condition.");
  }
  for (const [i, page] of pdfPageTexts(file).entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount });
}

// A required question the deriver never inspects must still stop resolution.
{
  const f = { ...BASE }; delete f.lawEnforcementUnit;
  let outcome = "generated";
  try {
    const d = md.deriveMarylandGuidanceFacts("md_10103_legacy_police", f);
    resolvePacket({ jurisdiction: "MD", trackId: "md_10103_legacy_police", facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing lawEnforcementUnit: got ${outcome}.`);
}

note(`6. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`);

console.log("");
if (failures.length > 0) { console.error("Maryland guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Maryland guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) console.log(`   ${s.trackId.padEnd(24)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
