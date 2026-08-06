// Utah guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Utah is not enabled, every
// assigned track has a governing specification and matches the adopted packet
// set, all five routes render deterministically into one final guidance PDF each
// with no blank page and no detached heading, every typed stop and closed list
// fails closed with a reason, a destination and a next step, the commercial
// free-route-first instruction and the statutory definition of expunge appear on
// every sheet, and the four things the adopted design forbids being asserted are
// not asserted: that expungement deletes a record, the retired form process, a
// resolution of the statutory tension, and a stored BCI processing time.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production.");
  process.exit(1);
}
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const pg = await import("@/lib/rcap/packets/engines/process-guidance");
const { resolvePacket, PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import("@/lib/rcap/packets/engines/index");
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const { computeRuntimeStatus } = await import("@/lib/rcap/packets/types");
const {
  UTAH_GUIDANCE_TRACKS,
  UTAH_GUIDANCE_TEMPLATES,
  UT_TRAFFIC_OFFENCE_TYPES,
  UT_TRAFFIC_LEVELS,
  UT_NONCONVICTION_DISPOSITIONS,
  UT_CLEAN_SLATE_LEVELS,
  UT_ELIGIBILITY_BARS,
  UtahGuidanceStopError,
  UtahRouteMismatchError,
  UtahBranchError,
  deriveUtahGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/utah/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/utah-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = [
  "ut_adj_reduction_402",
  "ut_auto_clean_slate",
  "ut_auto_nonconviction",
  "ut_auto_traffic",
  "ut_pet_appellate"
];

// 1. Not enabled.
//
// The shared registry ships a non-production `UT technical-fixture-guidance`
// that exists to prove the renderer lifecycle. It is not a Utah relief track,
// so the assertion is that no real one is wired in.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "UT" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real Utah track is wired into the shared registry."
);
ok(
  RELIEF_TRACKS.filter((t) => ASSIGNED.includes(t.trackId)).length === 0,
  "An assigned Utah track is already in the shared registry."
);
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("ut-")).length === 0,
  "Utah templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: Utah absent from the shared registry and the shared guidance pack.");

for (const t of UTAH_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, UTAH_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(UTAH_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of UTAH_GUIDANCE_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
  ok(track.outputStrategy === "process_guidance", `${track.trackId} is not process guidance.`);
  ok(track.statuses.legal !== "legal_approved", `${track.trackId} claims legal approval.`);
  ok(track.statuses.visual !== "visual_review_passed", `${track.trackId} claims visual approval.`);
  ok(
    computeRuntimeStatus({
      statuses: track.statuses,
      sourceCurrent: track.sourceCurrent,
      runtimeDisabled: track.runtimeDisabled,
      outputStrategy: track.outputStrategy
    }) === "runtime_disabled",
    `${track.trackId} does not compute runtime_disabled.`
  );
}
note(`2. Scope: exactly ${ASSIGNED.length} assigned tracks, all runtime_disabled and awaiting counsel.`);

// 3. Every component specified and matching the adopted packet set.
const spec = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8")
);
const design = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8")
);
const pgTracks = new Set(spec.processGuidanceSpecs.map((s) => s.trackId));
for (const track of UTAH_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(
    designed?.outputStrategy === "process_guidance",
    `${track.trackId}: the adopted design does not make this guidance.`
  );
  const ids = (designed?.packetSet?.components ?? []).map((c) => c.componentId);
  ok(
    ids.length === track.packetSet.components.length,
    `${track.trackId}: component count differs from the design.`
  );
  for (const c of track.packetSet.components) {
    ok(ids.includes(c.componentId), `${c.componentId}: not in the adopted packet set.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
  }
  for (const c of designed?.packetSet?.components ?? []) {
    ok(!c.officialFormId, `${track.trackId}: the design attaches an official form to a guidance route.`);
  }
}
const used = new Set(UTAH_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(UTAH_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(`3. Specifications: ${used.size} components, each specified, each matching the design, none source-bound.`);

// 4. Closed lists and typed stops.
const BASE = {
  wantsEligibilityAdvice: "no",
  immigrationStatusInPlay: "no",
  offenceType: "ordinary_traffic",
  offenceLevel: "class_b_misdemeanour",
  dispositionType: "acquitted",
  dispositionDate: "9 September 2018",
  pleaInAbeyance: "no",
  needsFasterRelief: "no",
  pastStatutoryTimeline: "no",
  needsProofOfDeletion: "no",
  insanityFinding: "no",
  appealFiled: "no",
  stillShowsOnMyCourtCase: "no",
  wellPastTheTimeline: "no",
  highestConvictionLevel: "class_b_misdemeanour",
  adjudicationDate: "14 February 2017",
  excludedOffenceType: "no",
  pendingProceeding: "no",
  supervisionSince20250101: "no",
  stateDebtOutstanding: "no",
  convictionCountNearTheLimits: "no",
  prosecutorObjected: "no",
  districtCourtOrderEntered: "yes",
  publishedOpinionExists: "yes, 2019 UT App 100",
  identifyingDetailsInOpinion: "Full name and date of birth",
  attorneyGeneralObjected: "no",
  wantsPetitionPrepared: "no",
  barEncountered: "offence_level_too_high",
  convictionLevel: "class_a_misdemeanour",
  reductionAlreadyGranted: "no",
  wantsReductionMotionPrepared: "no"
};

/** The nonconviction sheet is written for a dismissal with prejudice. */
const TRACK_FIXTURES = {
  ut_auto_nonconviction: { dispositionType: "dismissed_with_prejudice" }
};

const NEG = [
  // The two gates that run on every route.
  ["ut_auto_traffic", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["ut_pet_appellate", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["ut_auto_clean_slate", { immigrationStatusInPlay: "yes" }, "stop", "immigration_consequences_need_advice_first"],
  ["ut_adj_reduction_402", { immigrationStatusInPlay: "yes" }, "stop", "immigration_consequences_need_advice_first"],
  // ut_auto_traffic.
  ["ut_auto_traffic", { offenceType: "dui_or_reckless_driving" }, "stop", "dui_or_reckless_driving_is_not_a_traffic_offense"],
  ["ut_auto_traffic", { offenceLevel: "higher" }, "stop", "offence_above_class_b_is_outside_the_traffic_definition"],
  ["ut_auto_traffic", { pleaInAbeyance: "yes" }, "mismatch", "dismissal_from_a_completed_plea_in_abeyance"],
  ["ut_auto_traffic", { needsFasterRelief: "yes" }, "mismatch", "participant_cannot_wait_for_the_automatic_deletion"],
  ["ut_auto_traffic", { pastStatutoryTimeline: "yes" }, "stop", "traffic_record_not_deleted_well_past_the_timeline"],
  ["ut_auto_traffic", { needsProofOfDeletion: "yes" }, "stop", "no_certificate_of_traffic_deletion_identified"],
  // ut_auto_nonconviction.
  ["ut_auto_nonconviction", { dispositionType: "dismissed_without_prejudice" }, "mismatch", "dismissal_without_prejudice_is_not_within_the_automatic_route"],
  ["ut_auto_nonconviction", { pleaInAbeyance: "yes" }, "mismatch", "dismissal_from_a_completed_plea_in_abeyance"],
  ["ut_auto_nonconviction", { insanityFinding: "yes" }, "stop", "not_guilty_by_reason_of_insanity_is_excluded"],
  ["ut_auto_nonconviction", { stillShowsOnMyCourtCase: "yes", wellPastTheTimeline: "yes" }, "mismatch", "automatic_expungement_has_not_occurred_past_the_timeline"],
  // ut_auto_clean_slate.
  ["ut_auto_clean_slate", { highestConvictionLevel: "higher_or_other_class_a" }, "stop", "case_contains_a_conviction_outside_clean_slate"],
  ["ut_auto_clean_slate", { excludedOffenceType: "yes" }, "stop", "case_involves_an_excluded_offence"],
  ["ut_auto_clean_slate", { pendingProceeding: "yes" }, "stop", "misdemeanour_or_felony_proceeding_pending"],
  ["ut_auto_clean_slate", { supervisionSince20250101: "yes" }, "stop", "incarceration_probation_or_parole_since_1_january_2025"],
  ["ut_auto_clean_slate", { stateDebtOutstanding: "yes" }, "stop", "unsatisfied_state_debt_or_transferred_receivable"],
  ["ut_auto_clean_slate", { convictionCountNearTheLimits: "yes" }, "stop", "conviction_count_near_the_statutory_limits"],
  ["ut_auto_clean_slate", { prosecutorObjected: "yes" }, "stop", "prosecuting_agency_objected_to_clean_slate"],
  ["ut_auto_clean_slate", { stillShowsOnMyCourtCase: "yes", wellPastTheTimeline: "yes" }, "stop", "clean_slate_expungement_has_not_occurred_past_the_timeline"],
  // ut_pet_appellate.
  ["ut_pet_appellate", { districtCourtOrderEntered: "no" }, "mismatch", "district_court_expungement_order_is_a_prerequisite"],
  ["ut_pet_appellate", { attorneyGeneralObjected: "yes" }, "stop", "attorney_general_objected"],
  ["ut_pet_appellate", { wantsPetitionPrepared: "yes" }, "stop", "appellate_petition_is_outside_self_help_scope"],
  // ut_adj_reduction_402.
  ["ut_adj_reduction_402", { barEncountered: "too_many_convictions" }, "stop", "the_bar_was_the_conviction_count_not_the_offence_level"],
  ["ut_adj_reduction_402", { wantsReductionMotionPrepared: "yes" }, "stop", "reduction_motion_is_outside_the_record_clearing_product"],
  ["ut_adj_reduction_402", { reductionAlreadyGranted: "yes" }, "mismatch", "reduction_already_granted_so_re_run_the_expungement_analysis"],
  // Closed lists fail closed rather than falling through.
  ["ut_auto_traffic", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["ut_auto_traffic", { immigrationStatusInPlay: "" }, "branch"],
  ["ut_auto_traffic", { offenceType: "parking" }, "branch"],
  ["ut_auto_traffic", { offenceLevel: "felony" }, "branch"],
  ["ut_auto_nonconviction", { dispositionType: "convicted" }, "branch"],
  ["ut_auto_clean_slate", { highestConvictionLevel: "" }, "branch"],
  ["ut_adj_reduction_402", { barEncountered: "the_judge" }, "branch"]
];

for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveUtahGuidanceFacts(trackId, {
      ...BASE,
      ...(TRACK_FIXTURES[trackId] ?? {}),
      ...override
    });
  } catch (e) {
    if (e instanceof UtahGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: stop lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: stop lost its next step.`);
      ok(Boolean(e.message), `${trackId}/${e.stopId}: stop lost its reason.`);
    } else if (e instanceof UtahRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: mismatch lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: mismatch lost its next step.`);
      ok(Boolean(e.message), `${trackId}/${e.stopId}: mismatch lost its reason.`);
    } else if (e instanceof UtahBranchError) outcome = "branch";
    else outcome = `unexpected:${e.name}`;
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected stop ${stopId}, got ${detail}.`);
}

// No typed stop may route to the node the participant is already standing on.
{
  const seen = new Map();
  for (const [trackId, override] of NEG) {
    try {
      deriveUtahGuidanceFacts(trackId, { ...BASE, ...(TRACK_FIXTURES[trackId] ?? {}), ...override });
    } catch (e) {
      if (e.routeTo) {
        ok(
          !e.routeTo.includes(trackId),
          `${trackId}/${e.stopId}: routes back to the node the participant is on.`
        );
        seen.set(`${trackId}/${e.stopId}`, e.routeTo);
      }
    }
  }
  ok(seen.size >= 19, `only ${seen.size} distinct typed stops carried a destination.`);
  note(
    `4. Stops: ${NEG.length} negative cases fail closed; ${seen.size} typed stops, each with a reason, a destination and a next step, none circular.`
  );
}
ok(Object.keys(UT_TRAFFIC_OFFENCE_TYPES).length === 2, "The traffic offence-type closed list changed size.");
ok(Object.keys(UT_TRAFFIC_LEVELS).length === 4, "The traffic level closed list changed size.");
ok(Object.keys(UT_NONCONVICTION_DISPOSITIONS).length === 3, "The nonconviction disposition closed list changed size.");
ok(Object.keys(UT_CLEAN_SLATE_LEVELS).length === 5, "The Clean Slate level closed list changed size.");
ok(Object.keys(UT_ELIGIBILITY_BARS).length === 3, "The eligibility-bar closed list changed size.");

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  // Nothing here may report an outcome in the participant's own case.
  [/your record (has|was) (been )?(cleared|expunged|deleted|sealed|removed)/i, "a claim that relief occurred"],
  [/is now (cleared|expunged|deleted|sealed)/i, "a claim that the record is already cleared"],
  [/you are eligible/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // The four assertions the adopted design forbids.
  [/completely delet|deletes all information|permanently destroy/i, "expungement described as deletion"],
  [/(submit|send|complete|file) (the )?(form )?1200EX/i, "the retired form process"],
  [/(the (tension|conflict) (is|has been) resolved|the correct reading is|in our view)/i, "a resolution of the statutory tension"],
  [/(processing time|currently processing|applications received) (is|of|as of)? ?\d/i, "a stored BCI processing time"]
];

const samples = [];
for (const track of UTAH_GUIDANCE_TRACKS) {
  const facts = deriveUtahGuidanceFacts(track.trackId, {
    ...BASE,
    ...(TRACK_FIXTURES[track.trackId] ?? {})
  });
  const resolved = resolvePacket({
    jurisdiction: "UT",
    trackId: track.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${track.trackId}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${track.trackId}: guidance resolved as a filing packet.`);

  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "UT",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "UT",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(rendered.bytes) === sha(again.bytes), `${component.componentId}: not deterministic.`);
    ok((rendered.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(rendered.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
  }

  const assembled = await assemblePacketPdf({
    jurisdiction: "UT",
    jurisdictionName: "Utah",
    packetName: resolved.track.assembledPacketName,
    caseReference: "17-1900123",
    title: resolved.track.assembledPacketTitle,
    components
  });
  const againAssembled = await assemblePacketPdf({
    jurisdiction: "UT",
    jurisdictionName: "Utah",
    packetName: resolved.track.assembledPacketName,
    caseReference: "17-1900123",
    title: resolved.track.assembledPacketTitle,
    components
  });
  ok(assembled.sha256 === againAssembled.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${track.trackId}: the deliverable is a ZIP.`);

  const dir = path.join(OUT, track.trackId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, assembled.fileName);
  fs.writeFileSync(file, assembled.bytes);

  const text = pdfText(file);
  for (const [pattern, why] of PROHIBITED) ok(!pattern.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);
  ok(/LegalEase cannot/i.test(text), `${track.trackId}: does not say what LegalEase cannot do.`);
  ok(
    /has not contacted any court, prosecuting agency or bureau/i.test(text),
    `${track.trackId}: does not disclaim having contacted anyone.`
  );
  // The statutory definition of expunge is a limitation the design records on
  // every one of these tracks.
  ok(/seal or otherwise restrict access/i.test(text), `${track.trackId}: does not use the statutory definition of expunge.`);
  ok(/It is not destruction/i.test(text), `${track.trackId}: does not say expungement is not destruction.`);
  // The commercial instruction belongs where the design puts it: the three
  // automatic tracks and the reduction node, all of which sit in front of a
  // paid petition. The appellate sheet is a referral out and charges nothing,
  // so it carries the disclaimer rather than the instruction.
  if (track.trackId === "ut_pet_appellate") {
    ok(/LegalEase charges nothing on this route/i.test(text), "appellate: does not disclaim charging.");
  } else {
    ok(
      /free route and its timing before you pay/i.test(text),
      `${track.trackId}: does not lead with the free route.`
    );
  }

  if (track.trackId === "ut_auto_traffic") {
    ok(/77-40a-202/.test(text), "traffic: does not cite the governing section.");
    ok(/five years/i.test(text) && /six years/i.test(text), "traffic: missing a waiting period.");
    ok(/1 May 2020/.test(text), "traffic: missing the commencement split.");
    ok(/not a certificate/i.test(text), "traffic: does not warn that the screen is not proof.");
    ok(/go to the court/i.test(text) || /not to the Bureau/i.test(text), "traffic: does not route enquiries to the court.");
  }
  if (track.trackId === "ut_auto_nonconviction") {
    ok(/sixty days/i.test(text) && /one hundred and eighty days/i.test(text), "nonconviction: missing a timetable.");
    ok(/no longer used/i.test(text), "nonconviction: does not say the form is retired.");
    ok(/not been squared/i.test(text), "nonconviction: does not flag the statutory tension.");
    ok(/does not preclude filing a petition/i.test(text), "nonconviction: does not name the petition fallback.");
    ok(/one hundred and twenty days/i.test(text), "nonconviction: missing the practical allowance.");
  }
  if (track.trackId === "ut_auto_clean_slate") {
    ok(/thirty-five days/i.test(text), "clean slate: missing the objection window.");
    ok(/seven years/i.test(text), "clean slate: missing the class A drug possession wait.");
    ok(/across all states/i.test(text), "clean slate: does not warn how the counting runs.");
    ok(/already expunged/i.test(text), "clean slate: does not say expunged cases still count.");
    ok(/Office of State Debt Collection/i.test(text), "clean slate: missing the state-debt exclusion.");
  }
  if (track.trackId === "ut_pet_appellate") {
    ok(/Standing Order No\. 12/.test(text), "appellate: does not name the governing order.");
    ok(/no forms/i.test(text), "appellate: does not say there are no forms.");
    ok(/thirty days/i.test(text), "appellate: missing the Attorney General's window.");
    ok(/not legally required to redact/i.test(text), "appellate: does not state the publisher limit.");
    ok(/referred out/i.test(text), "appellate: does not refer the participant out.");
  }
  if (track.trackId === "ut_adj_reduction_402") {
    ok(/76-3-402/.test(text), "reduction: does not cite the reduction statute.");
    ok(/not record clearing/i.test(text), "reduction: does not say it is not a clearing route.");
    ok(/It is not prepared here/i.test(text), "reduction: does not decline the motion.");
    ok(/has not been established/i.test(text), "reduction: asserts how the Bureau sees a reduction.");
  }

  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries()) {
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
    // A section heading is the last thing on a page only when its body has been
    // pushed onto the next one. The renderer has no widow control and this job
    // does not own it, so the guard lives here and the fix is copy length.
    const lastLine = page.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
    ok(
      !isSectionHeading(lastLine),
      `${track.trackId}: page ${i + 1} ends on the detached heading "${lastLine}".`
    );
  }
  ok(pages.length === assembled.pageCount, `${track.trackId}: page count disagrees with the assembler.`);

  samples.push({
    trackId: track.trackId,
    fileName: assembled.fileName,
    sha256: assembled.sha256,
    pageCount: assembled.pageCount,
    byteSize: assembled.byteSize
  });
}

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE };
  delete facts.adjudicationDate;
  let outcome = "generated";
  try {
    const derived = deriveUtahGuidanceFacts("ut_auto_clean_slate", facts);
    resolvePacket({
      jurisdiction: "UT",
      trackId: "ut_auto_clean_slate",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing adjudication date: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition language, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("Utah guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Utah guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(`   ${s.trackId.padEnd(24)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

function sha(b) {
  return crypto.createHash("sha256").update(b).digest("hex");
}
/** The renderer's section headings are upper case and short. */
function isSectionHeading(line) {
  return /^[A-Z][A-Z ,'()-]{3,60}$/.test(line) && line === line.toUpperCase();
}
function pdfText(f) {
  const r = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`pdftotext failed: ${r.stderr}`);
  return r.stdout.replace(/-\n\s*/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
}
function pdfPageTexts(f) {
  const n = Number((spawnSync("pdfinfo", [f], { encoding: "utf8" }).stdout.match(/^Pages:\s+(\d+)/m) ?? [])[1] ?? 0);
  const out = [];
  for (let p = 1; p <= n; p += 1) {
    out.push(
      spawnSync("pdftotext", ["-layout", "-f", String(p), "-l", String(p), f, "-"], {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024
      }).stdout
    );
  }
  return out;
}
