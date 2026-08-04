// Louisiana guidance — committed regression verifier.
//
// The job's focused acceptance gate. Proves: Louisiana is not enabled, the
// family is recommended for counsel adoption but not adopted, every component
// has a governing specification and matches the adopted design, the three
// routes render deterministically into one final guidance PDF each, every sheet
// says the Code prescribes nothing for the participant to file and names the
// ordinary motion route that does produce a packet, the Article 999 sheet
// refuses to answer the unresolved cumulative-or-alternative question, the
// Article 985.2 sheet never presents the automated process as operating and
// tells the participant not to wait for it, the Article 985.3 sheet states the
// discretion and the documents the Article names, and every typed stop, route
// mismatch and closed list fails closed.

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
const la = await import("@/lib/rcap/packets/jurisdictions/louisiana/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/louisiana-guidance");
const failures = []; const checks = [];
const ok = (c, m) => { if (!c) failures.push(m); };
const note = (l) => checks.push(l);

ok(RELIEF_TRACKS.filter(t => t.jurisdiction === "LA").length === 0, "Louisiana is wired into the shared registry.");
ok(Object.keys(pg.GUIDANCE_TEMPLATES).filter(k => k.startsWith("la-")).length === 0, "Louisiana templates already in the shared pack.");
ok(RELIEF_TRACKS.filter(t => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
ok(la.LOUISIANA_GUIDANCE_TRACKS.length === 3, `expected 3 assigned tracks, got ${la.LOUISIANA_GUIDANCE_TRACKS.length}.`);
note("1. Enablement: Louisiana absent from the shared registry and guidance pack.");

// Injected only into this process, after the absence above is proven.
for (const t of la.LOUISIANA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, la.LOUISIANA_GUIDANCE_TEMPLATES);

// Recommended for counsel adoption, and not adopted. The adoption records are
// integration-owned; this proves none of them names a Louisiana track rather
// than trusting the constant.
ok(la.LOUISIANA_LEGAL_OUTPUT_RECOMMENDATION === "recommended_for_counsel_adoption",
  `legal-output recommendation is ${la.LOUISIANA_LEGAL_OUTPUT_RECOMMENDATION}.`);
ok(la.LOUISIANA_COUNSEL_ADOPTED === false, "the worker branch claims counsel adoption.");
{
  const adoptionDir = path.join(root, "data/record-clearing/template-families");
  const trackIds = new Set(la.LOUISIANA_GUIDANCE_TRACKS.map(t => t.trackId));
  const files = fs.existsSync(adoptionDir) ? fs.readdirSync(adoptionDir).filter(f => f.startsWith("ADOPT-")) : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(adoptionDir, file), "utf8");
    for (const id of trackIds) ok(!text.includes(id), `${id} already appears in the counsel adoption record ${file}.`);
  }
  ok(files.length > 0, "no counsel adoption records were found to check against.");
}
for (const track of la.LOUISIANA_GUIDANCE_TRACKS) {
  ok(track.statuses.legal === "legal_review_pending", `${track.trackId}: legal status is ${track.statuses.legal}.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
}
note("2. Adoption: recommended_for_counsel_adoption, counselAdopted false, named in no adoption record.");

for (const track of la.LOUISIANA_GUIDANCE_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(computeRuntimeStatus({ statuses: track.statuses, sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled, outputStrategy: track.outputStrategy }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`);
}
note(`3. Promotion: ${la.LOUISIANA_GUIDANCE_TRACKS.length} tracks runtime_disabled, packet readiness untouched.`);

const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map(s => s.trackId));
for (const track of la.LOUISIANA_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find(t => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(designed?.outputStrategy === "process_guidance", `${track.trackId}: the design does not call for guidance.`);
  const designedComponents = designed?.packetSet?.components ?? [];
  ok(designedComponents.length === track.packetSet.components.length,
    `${track.trackId}: component count differs from the design (${designedComponents.length} vs ${track.packetSet.components.length}).`);
  const ids = designedComponents.map(c => c.componentId);
  const roles = new Map(designedComponents.map(c => [c.componentId, c.role]));
  for (const c of track.packetSet.components) {
    ok(ids.includes(c.componentId), `${c.componentId}: not in the adopted packet set.`);
    ok(roles.get(c.componentId) === c.role, `${c.componentId}: role ${c.role} differs from the design ${roles.get(c.componentId)}.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
  }
  const required = new Set((spec.processGuidanceSpecs.find(s => s.trackId === track.trackId)?.generationRequirements ?? [])
    .filter(r => r.requirement === "required").map(r => r.key));
  const asked = new Set(track.requiredInputs.map(i => i.key));
  for (const key of required) ok(asked.has(key), `${track.trackId}: the design requires ${key} and it is not asked.`);
}
note(`3b. Specifications: ${la.LOUISIANA_GUIDANCE_TRACKS.reduce((n, t) => n + t.packetSet.components.length, 0)} components, each specified, matching the design's ids and roles.`);

const BASE = {
  ageAtArrest: "seventeen",
  arrestDate: "2019-05-06",
  offenseTitle: "title_14",
  districtAttorneyDeclined: "yes",
  prosecutionInstitutedAndDisposed: "yes",
  anyConvictionFromArrest: "no",
  parish: "Orleans Parish",
  underlyingEligibility: "yes",
  caseNumber: "2019-CR-01234",
  courtOrderedProbationOrProgram: "yes",
  successfulCompletion: "yes",
  completionDate: "2022-03-15",
  underlyingViolation: "La. R.S. 40:966(C), possession",
  otherwiseEligible: "yes",
  stillBeforeTheCourt: "still_before_the_court"
};
// The two `goal` questions are different closed lists, so each track supplies
// its own. A value from the other list must fail closed, which NEG asserts.
const FIXTURES = {
  "la-985-2-automated-expungement": { goal: "understand_the_route" },
  "la-985-3-immediate-expungement": { goal: "understand_and_raise_it_with_the_court" }
};
const factsFor = (trackId, override) => ({ ...BASE, ...(FIXTURES[trackId] ?? {}), ...(override ?? {}) });

const NEG = [
  ["la-999-expedited-expungement", { ageAtArrest: "under_seventeen" }, "stop", "age_element_not_met"],
  ["la-999-expedited-expungement", { ageAtArrest: "eighteen_or_older" }, "stop", "age_element_not_met"],
  ["la-999-expedited-expungement", { offenseTitle: "another_title" }, "stop", "offense_outside_title_14_or_title_40"],
  ["la-999-expedited-expungement", { anyConvictionFromArrest: "yes" }, "stop", "conviction_arising_from_the_arrest"],
  ["la-999-expedited-expungement", { districtAttorneyDeclined: "no", prosecutionInstitutedAndDisposed: "no" }, "stop", "neither_article_999_a_2_nor_a_3_is_met"],
  ["la-999-expedited-expungement", { districtAttorneyDeclined: "yes", prosecutionInstitutedAndDisposed: "no" }, "stop", "article_999_a_2_and_a_3_cumulative_or_alternative_unresolved"],
  ["la-999-expedited-expungement", { districtAttorneyDeclined: "no", prosecutionInstitutedAndDisposed: "yes" }, "stop", "article_999_a_2_and_a_3_cumulative_or_alternative_unresolved"],
  ["la-999-expedited-expungement", { ageAtArrest: "17" }, "branch"],
  ["la-999-expedited-expungement", { arrestDate: "6 May 2019" }, "branch"],
  ["la-985-2-automated-expungement", { goal: "have_legalease_submit_a_request" }, "stop", "no_official_request_channel_exists"],
  ["la-985-2-automated-expungement", { goal: "wait_for_automation_instead_of_filing" }, "stop", "do_not_delay_an_ordinary_filing"],
  ["la-985-2-automated-expungement", { underlyingEligibility: "no" }, "stop", "record_not_already_eligible"],
  ["la-985-2-automated-expungement", { goal: "understand_and_raise_it_with_the_court" }, "branch"],
  ["la-985-2-automated-expungement", { underlyingEligibility: "maybe" }, "branch"],
  ["la-985-3-immediate-expungement", { courtOrderedProbationOrProgram: "no" }, "mismatch", "no_court_ordered_probation_or_program"],
  ["la-985-3-immediate-expungement", { goal: "have_legalease_file_something" }, "stop", "the_article_prescribes_nothing_to_file"],
  ["la-985-3-immediate-expungement", { successfulCompletion: "no" }, "stop", "probation_or_program_not_successfully_completed"],
  ["la-985-3-immediate-expungement", { otherwiseEligible: "no" }, "stop", "not_otherwise_eligible_for_an_expungement"],
  ["la-985-3-immediate-expungement", { stillBeforeTheCourt: "already_closed_out" }, "stop", "case_already_closed_out"],
  ["la-985-3-immediate-expungement", { goal: "understand_the_route" }, "branch"],
  ["la-985-3-immediate-expungement", { completionDate: "2022-02-30" }, "branch"],
  ["la-985-3-immediate-expungement", { stillBeforeTheCourt: "" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated", detail = null;
  try { la.deriveLouisianaGuidanceFacts(trackId, factsFor(trackId, override)); }
  catch (e) {
    if (e instanceof la.LouisianaGuidanceStopError) { outcome = "stop"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: stop lost its destination.`); }
    else if (e instanceof la.LouisianaRouteMismatchError) { outcome = "mismatch"; detail = e.stopId; ok(Boolean(e.routeTo), `${trackId}: mismatch lost its destination.`); }
    else if (e instanceof la.LouisianaBranchError) outcome = "branch";
    else outcome = `unexpected:${e?.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected ${stopId}, got ${detail}.`);
}

// Meeting BOTH disputed Article 999 conditions is inside the Article on either
// reading, so it must generate. Meeting exactly one must not. Both directions
// are pinned, because the whole point of the stop is that it is narrow.
{
  let both = "generated";
  try { la.deriveLouisianaGuidanceFacts("la-999-expedited-expungement", factsFor("la-999-expedited-expungement", { districtAttorneyDeclined: "yes", prosecutionInstitutedAndDisposed: "yes" })); }
  catch { both = "refused"; }
  ok(both === "generated", "meeting both Article 999 conditions was refused.");
}
// Uncertainty that the design does not make a stop must not become one.
for (const [trackId, override] of [
  ["la-985-3-immediate-expungement", { successfulCompletion: "about_to" }],
  ["la-985-3-immediate-expungement", { otherwiseEligible: "unsure" }],
  ["la-985-2-automated-expungement", { underlyingEligibility: "unsure" }]
]) {
  let outcome = "generated";
  try { la.deriveLouisianaGuidanceFacts(trackId, factsFor(trackId, override)); } catch { outcome = "refused"; }
  ok(outcome === "generated", `${trackId} ${JSON.stringify(override)}: refused a case the design does not stop.`);
}
note(`4. Stops: ${NEG.length} negative cases fail closed with a destination; the Article 999 both-conditions case still generates.`);

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/is now operating|is up and running|is available now|will be expunged automatically/i,
    "a promise that the automated process is operating"]
];

const samples = [];
for (const track of la.LOUISIANA_GUIDANCE_TRACKS) {
  const facts = la.deriveLouisianaGuidanceFacts(track.trackId, factsFor(track.trackId));
  const resolved = resolvePacket({ jurisdiction: "LA", trackId: track.trackId, facts, allowTechnicalFixtures: true });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);
  const components = [];
  for (const component of resolved.components) {
    const a = await renderPacketComponent({ component, jurisdiction: "LA", geography: null, facts, rootDir: root });
    const b = await renderPacketComponent({ component, jurisdiction: "LA", geography: null, facts, rootDir: root });
    ok(sha(a.bytes) === sha(b.bytes), `${component.componentId}: not deterministic.`);
    ok((a.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(a.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({ componentId: component.componentId, role: component.role, order: component.order, bytes: a.bytes });
  }
  const asm = await assemblePacketPdf({ jurisdiction: "LA", jurisdictionName: "Louisiana",
    packetName: resolved.track.assembledPacketName, caseReference: "2019-CR-01234",
    title: resolved.track.assembledPacketTitle, components });
  const asm2 = await assemblePacketPdf({ jurisdiction: "LA", jurisdictionName: "Louisiana",
    packetName: resolved.track.assembledPacketName, caseReference: "2019-CR-01234",
    title: resolved.track.assembledPacketTitle, components });
  ok(asm.sha256 === asm2.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(asm.fileName), `${track.trackId}: the deliverable is a ZIP.`);
  const dir = path.join(OUT, track.trackId); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asm.fileName); fs.writeFileSync(file, asm.bytes);

  const text = pdfText(file);
  for (const [p, why] of PROHIBITED) ok(!p.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/prescribes nothing for you to file/i.test(text), `${track.trackId}: does not say the Code prescribes no filing.`);
  ok(/Article 976, 977 or 978/.test(text), `${track.trackId}: does not name the ordinary motion route.`);

  if (track.trackId === "la-999-expedited-expungement") {
    ok(/no cost/i.test(text), "expedited sheet does not say the route is free.");
    ok(/without a motion being filed with the clerk/i.test(text), "expedited sheet omits the no-motion rule.");
    ok(/seventeen years of age/i.test(text), "expedited sheet omits the age element.");
    ok(/read literally/i.test(text), "expedited sheet does not expose the cumulative reading problem.");
    ok(/has not been settled/i.test(text), "expedited sheet does not say the question is unresolved.");
    ok(/does not prepare or present/i.test(text), "expedited sheet does not disclaim preparing the order.");
    ok(/Article 999\.1/.test(text), "expedited sheet omits the order form identity.");
  }
  if (track.trackId === "la-985-2-automated-expungement") {
    ok(/do not wait for this/i.test(text), "automated sheet does not tell the participant not to wait.");
    ok(/not established as operating/i.test(text), "automated sheet does not say the route is not established.");
    ok(/appropriation/i.test(text), "automated sheet omits the appropriation condition.");
    ok(/does not mention automated expungement/i.test(text), "automated sheet omits that the Bureau's page is silent.");
    ok(/newly eligible/i.test(text), "automated sheet does not say it expands eligibility for nobody.");
    ok(/does not submit an automated-expungement request/i.test(text), "automated sheet does not disclaim submitting a request.");
  }
  if (track.trackId === "la-985-3-immediate-expungement") {
    ok(/discretionary/i.test(text), "immediate sheet does not state the discretion.");
    ok(/may order/i.test(text), "immediate sheet omits the statutory verb.");
    ok(/bill of information/i.test(text), "immediate sheet omits the bill of information.");
    ok(/sentencing minutes/i.test(text), "immediate sheet omits the sentencing minutes.");
    ok(/is not settled/i.test(text), "immediate sheet does not disclose the waiting-period question.");
    ok(/does not file anything/i.test(text), "immediate sheet does not disclaim filing.");
    ok(/closed out/i.test(text), "immediate sheet omits the closed-out timing limit.");
  }
  for (const [i, page] of pdfPageTexts(file).entries())
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  samples.push({ trackId: track.trackId, sha256: asm.sha256, pageCount: asm.pageCount, components: components.length });
}

// A required question the deriver never inspects must still stop resolution.
{
  const f = factsFor("la-985-3-immediate-expungement"); delete f.underlyingViolation;
  let outcome = "generated";
  try {
    const d = la.deriveLouisianaGuidanceFacts("la-985-3-immediate-expungement", f);
    resolvePacket({ jurisdiction: "LA", trackId: "la-985-3-immediate-expungement", facts: d, allowTechnicalFixtures: true });
  } catch (e) { outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other"; }
  ok(outcome === "resolution_missing_required_input", `missing underlyingViolation: got ${outcome}.`);
}

note(`5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content, no fee figure.`);

console.log("");
if (failures.length > 0) { console.error("Louisiana guidance verification failed:"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("Louisiana guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) console.log(`   ${s.trackId.padEnd(32)} ${s.components}c ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
