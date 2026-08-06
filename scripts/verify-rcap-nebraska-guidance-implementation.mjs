// Nebraska guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Nebraska is not enabled, every
// assigned track has a governing specification and matches the adopted packet
// set, all seven routes render deterministically into one final guidance PDF
// each with no blank page, every typed stop and closed list fails closed with a
// destination and a next step, no artifact claims relief occurred, no artifact
// carries petition language, and the three things the adopted design forbids
// being asserted are not asserted.

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
  NEBRASKA_GUIDANCE_TRACKS,
  NEBRASKA_GUIDANCE_TEMPLATES,
  NE_RECORD_JURISDICTIONS,
  NE_DISPOSITION_CATEGORIES,
  NE_PARDON_OFFENCE_TYPES,
  NE_CLEMENCY_DOCUMENTS,
  NebraskaGuidanceStopError,
  NebraskaRouteMismatchError,
  NebraskaBranchError,
  deriveNebraskaGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/nebraska/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/nebraska-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = [
  "ne-firearm-restoration-routing",
  "ne-immigration-routing",
  "ne-juvenile-sealing-routing",
  "ne-nonconviction-auto",
  "ne-out-of-jurisdiction-routing",
  "ne-pardon-routing",
  "ne-postconviction-routing"
];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "NE").length === 0,
  "Nebraska is wired into the shared registry."
);
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("ne-")).length === 0,
  "Nebraska templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: Nebraska absent from the shared registry and the shared guidance pack.");

for (const t of NEBRASKA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, NEBRASKA_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(NEBRASKA_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of NEBRASKA_GUIDANCE_TRACKS) {
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
for (const track of NEBRASKA_GUIDANCE_TRACKS) {
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
  // No assigned track may depend on an official source binary.
  for (const c of designed?.packetSet?.components ?? []) {
    ok(!c.officialFormId, `${track.trackId}: the design attaches an official form to a guidance route.`);
  }
}
const used = new Set(NEBRASKA_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(NEBRASKA_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(`3. Specifications: ${used.size} components, each specified, each matching the design, none source-bound.`);

// 4. Closed lists and typed stops.
//
// The base fixture is a Nebraska participant with no immigration exposure who
// wants a sheet rather than an opinion. Each routing node needs its own
// qualifying answer, because a node that routes everyone away serves nobody.
const BASE = {
  recordJurisdiction: "nebraska",
  immigrationStatusInPlay: "no",
  wantsEligibilityAdvice: "no",
  ncaDispositionCategory: "dismissed",
  ncaDispositionDate: "14 March 2019",
  ncaDispositionBefore2017: "no",
  ncaArrestDate: "2 February 2019",
  ncaSeparateProsecution: "no",
  ncaPublicOffice: "no",
  firearmRestorationIsTheGoal: "no",
  ncaPeriodHasRun: "yes",
  ncaRecordStillPublic: "no",
  ncaAppearsInPrivateDatabase: "no",
  jsUnderEighteen: "yes",
  jsDispositionCategory: "diversion_or_similar_completed",
  jsCaseClosedDate: "Closed 9 May 2016; turned eighteen 3 July 2018",
  jsCurrentlyAMinor: "no",
  jsSpansAdultAndJuvenile: "no",
  jsRecordStillPublic: "yes",
  prConvictionLevel: "felony",
  prCompletionDate: "11 November 2011",
  prOffenceType: "other",
  prWaitingPeriodHasRun: "yes",
  prCityOrdinance: "no",
  prDocumentHeld: "neither",
  frGoal: "yes",
  frRightsRemovedBy: "felony_conviction",
  ojRecordJurisdiction: "District Court of Shawnee County, Kansas",
  ojAlsoHoldsNebraskaRecords: "yes",
  imNebraskaCases: "One Douglas County case, dismissed",
  imMatterUnderway: "no",
  pcDisputesConviction: "yes",
  pcWantsVacatur: "yes",
  pcActiveAppeal: "no",
  pcSentencingCourt: "District Court of Lancaster County, CR 12-345"
};

/** Per-node overrides so each routing node's own qualifying answer is given. */
const TRACK_FIXTURES = {
  "ne-out-of-jurisdiction-routing": { recordJurisdiction: "another_state" },
  "ne-immigration-routing": { immigrationStatusInPlay: "yes" }
};

const NEG = [
  // The two gates that run on every route.
  ["ne-nonconviction-auto", { recordJurisdiction: "federal" }, "mismatch", "record_is_not_a_nebraska_record"],
  ["ne-pardon-routing", { recordJurisdiction: "tribal" }, "mismatch", "record_is_not_a_nebraska_record"],
  ["ne-out-of-jurisdiction-routing", { recordJurisdiction: "nebraska" }, "mismatch", "record_is_a_nebraska_record"],
  ["ne-nonconviction-auto", { immigrationStatusInPlay: "yes" }, "mismatch", "immigration_exposure_screened_on_every_track"],
  ["ne-postconviction-routing", { immigrationStatusInPlay: "yes" }, "mismatch", "immigration_exposure_screened_on_every_track"],
  ["ne-immigration-routing", { recordJurisdiction: "nebraska", immigrationStatusInPlay: "no" }, "mismatch", "no_immigration_exposure_to_route"],
  ["ne-nonconviction-auto", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["ne-firearm-restoration-routing", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  // ne-nonconviction-auto.
  ["ne-nonconviction-auto", { ncaDispositionCategory: "unclear" }, "stop", "disposition_type_unclear_from_the_record"],
  ["ne-nonconviction-auto", { ncaDispositionBefore2017: "yes" }, "mismatch", "disposition_predates_the_automatic_route"],
  ["ne-nonconviction-auto", { ncaSeparateProsecution: "yes" }, "stop", "separate_prosecution_or_correctional_control"],
  ["ne-nonconviction-auto", { ncaPublicOffice: "yes" }, "stop", "announced_candidate_for_or_holder_of_public_office"],
  ["ne-nonconviction-auto", { firearmRestorationIsTheGoal: "yes" }, "mismatch", "firearm_restoration_is_the_actual_goal"],
  ["ne-nonconviction-auto", { ncaRecordStillPublic: "yes", ncaPeriodHasRun: "yes" }, "mismatch", "record_still_public_after_the_applicable_period"],
  ["ne-nonconviction-auto", { ncaAppearsInPrivateDatabase: "yes" }, "stop", "copy_held_in_a_private_background_check_database"],
  // ne-juvenile-sealing-routing.
  ["ne-juvenile-sealing-routing", { jsUnderEighteen: "no" }, "mismatch", "offence_was_not_a_juvenile_matter"],
  ["ne-juvenile-sealing-routing", { jsCurrentlyAMinor: "yes" }, "stop", "participant_is_currently_a_minor"],
  ["ne-juvenile-sealing-routing", { jsSpansAdultAndJuvenile: "yes" }, "stop", "record_spans_juvenile_and_adult_cases"],
  // ne-pardon-routing.
  ["ne-pardon-routing", { prOffenceType: "driving_under_the_influence" }, "stop", "offence_the_board_will_not_consider"],
  ["ne-pardon-routing", { prOffenceType: "traffic_violation" }, "stop", "offence_the_board_will_not_consider"],
  ["ne-pardon-routing", { prOffenceType: "driving_under_suspension" }, "stop", "offence_the_board_will_not_consider"],
  ["ne-pardon-routing", { prWaitingPeriodHasRun: "no" }, "stop", "board_waiting_period_has_not_run_or_has_restarted"],
  ["ne-pardon-routing", { prDocumentHeld: "warrant_of_discharge" }, "stop", "participant_holds_a_warrant_of_discharge_not_a_pardon"],
  // ne-firearm-restoration-routing.
  ["ne-firearm-restoration-routing", { frGoal: "no" }, "mismatch", "firearm_restoration_is_not_the_goal"],
  // ne-postconviction-routing.
  ["ne-postconviction-routing", { pcDisputesConviction: "no", pcWantsVacatur: "no" }, "mismatch", "participant_wants_record_clearing_not_vacatur"],
  ["ne-postconviction-routing", { pcActiveAppeal: "yes" }, "stop", "active_appeal_in_the_case"],
  // Closed lists fail closed rather than falling through.
  ["ne-nonconviction-auto", { recordJurisdiction: "maybe" }, "branch"],
  ["ne-nonconviction-auto", { immigrationStatusInPlay: "" }, "branch"],
  ["ne-nonconviction-auto", { wantsEligibilityAdvice: "unsure" }, "branch"],
  ["ne-nonconviction-auto", { ncaDispositionCategory: "convicted" }, "branch"],
  ["ne-pardon-routing", { prOffenceType: "assault" }, "branch"],
  ["ne-pardon-routing", { prConvictionLevel: "infraction" }, "branch"],
  ["ne-pardon-routing", { prDocumentHeld: "commutation" }, "branch"],
  ["ne-juvenile-sealing-routing", { jsDispositionCategory: "" }, "branch"],
  ["ne-firearm-restoration-routing", { frRightsRemovedBy: "a court" }, "branch"]
];

for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveNebraskaGuidanceFacts(trackId, {
      ...BASE,
      ...(TRACK_FIXTURES[trackId] ?? {}),
      ...override
    });
  } catch (e) {
    if (e instanceof NebraskaGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: stop lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: stop lost its next step.`);
      ok(Boolean(e.message), `${trackId}/${e.stopId}: stop lost its reason.`);
    } else if (e instanceof NebraskaRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: mismatch lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: mismatch lost its next step.`);
      ok(Boolean(e.message), `${trackId}/${e.stopId}: mismatch lost its reason.`);
    } else if (e instanceof NebraskaBranchError) outcome = "branch";
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
      deriveNebraskaGuidanceFacts(trackId, { ...BASE, ...(TRACK_FIXTURES[trackId] ?? {}), ...override });
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
  ok(seen.size >= 24, `only ${seen.size} distinct typed stops carried a destination.`);
  note(`4. Stops: ${NEG.length} negative cases fail closed; ${seen.size} typed stops, each with a reason, a destination and a next step, none circular.`);
}

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
  [/your record (has been|was) (sealed|expunged|removed|destroyed)/i, "a claim that relief occurred"],
  [/is now (sealed|expunged|confidential)/i, "a claim that the record is already sealed"],
  [/you are eligible/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // The three assertions the adopted design forbids.
  [/§\s*29-2266|section 29-2266|§\s*29-1606|section 29-1606/i, "an unverified diversion or deferred-judgment citation"],
  [/mayoral pardon (does|will) support/i, "an unsettled mayoral-pardon conclusion"],
  [/LB\s?530 (changed|amended|now)/i, "an unread 2025 amendment's substance"]
];

const samples = [];
const pagesByTrack = [];
for (const track of NEBRASKA_GUIDANCE_TRACKS) {
  const facts = deriveNebraskaGuidanceFacts(track.trackId, {
    ...BASE,
    ...(TRACK_FIXTURES[track.trackId] ?? {})
  });
  const resolved = resolvePacket({
    jurisdiction: "NE",
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
      jurisdiction: "NE",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "NE",
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
    jurisdiction: "NE",
    jurisdictionName: "Nebraska",
    packetName: resolved.track.assembledPacketName,
    caseReference: "CR 19-1188",
    title: resolved.track.assembledPacketTitle,
    components
  });
  const againAssembled = await assemblePacketPdf({
    jurisdiction: "NE",
    jurisdictionName: "Nebraska",
    packetName: resolved.track.assembledPacketName,
    caseReference: "CR 19-1188",
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

  // Every sheet names where the participant goes and what LegalEase will not do.
  ok(/LegalEase cannot/i.test(text), `${track.trackId}: does not say what LegalEase cannot do.`);
  ok(
    /has not contacted any court, agency or board/i.test(text),
    `${track.trackId}: does not disclaim having contacted anyone.`
  );

  if (track.trackId === "ne-nonconviction-auto") {
    ok(/Automatic describes what the law does/i.test(text), "nonconviction: missing the automatic-is-not-a-report warning.");
    ok(/29-3523/.test(text), "nonconviction: does not cite the governing section.");
    ok(/Coble/.test(text), "nonconviction: does not warn against a motion under Coble.");
    ok(/29-3528/.test(text), "nonconviction: does not name the enforcement route's statute.");
    ok(/one year/i.test(text) && /two years/i.test(text) && /immediate/i.test(text), "nonconviction: missing a timetable branch.");
    ok(/private background-check/i.test(text), "nonconviction: missing the private-database limit.");
    ok(/29-3527/.test(text), "nonconviction: missing the unauthorized-dissemination penalty.");
    ok(/firearm rights/i.test(text), "nonconviction: missing the firearm warning.");
  }
  if (track.trackId === "ne-juvenile-sealing-routing") {
    ok(/does not prepare the Nebraska juvenile motion/i.test(text), "juvenile: does not say LegalEase declines the motion.");
    ok(/not a finding that the route cannot be run/i.test(text), "juvenile: implies the route is not buildable.");
    ok(/has not been confirmed here/i.test(text), "juvenile: does not flag the unread amendment.");
    ok(/deemed never to have occurred/i.test(text), "juvenile: missing the effect of sealing.");
  }
  if (track.trackId === "ne-pardon-routing") {
    ok(/ten years/i.test(text) && /three years/i.test(text), "pardon: missing the published waiting periods.");
    ok(/restarts/i.test(text), "pardon: does not say the period restarts.");
    ok(/will not consider/i.test(text), "pardon: missing the excluded offences.");
    ok(/warrant of discharge is not a pardon/i.test(text), "pardon: does not distinguish a warrant of discharge.");
    ok(/has not been settled here/i.test(text), "pardon: does not mark the mayoral-pardon question unsettled.");
    ok(/does not prepare the pardon application/i.test(text), "pardon: does not say LegalEase declines the application.");
  }
  if (track.trackId === "ne-firearm-restoration-routing") {
    ok(/29-2264\(6\)/.test(text), "firearm: missing the statute that preserves the conviction.");
    ok(/Board of Pardons/.test(text), "firearm: does not name the restoring body.");
    ok(/federal firearm/i.test(text), "firearm: does not exclude a federal disability.");
  }
  if (track.trackId === "ne-out-of-jurisdiction-routing") {
    ok(/first question in the Nebraska intake/i.test(text), "out-of-jurisdiction: does not state the intake gate.");
    ok(/Nebraska is not where that happens/i.test(text), "out-of-jurisdiction: does not keep the door open elsewhere.");
  }
  if (track.trackId === "ne-immigration-routing") {
    ok(/before anything is generated/i.test(text), "immigration: does not route before generation.");
    ok(/no federal or immigration effect/i.test(text), "immigration: missing the set-aside disclaimer.");
    ok(/This page is not immigration advice/i.test(text), "immigration: does not disclaim advising.");
  }
  if (track.trackId === "ne-postconviction-routing") {
    ok(/concedes the conviction/i.test(text), "post-conviction: does not explain what a set-aside is.");
    ok(/does not prepare (or file )?that motion|does not prepare or file a motion/i.test(text), "post-conviction: does not decline the motion.");
    ok(/not a finding that the motion cannot be made/i.test(text), "post-conviction: implies no filing exists.");
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
  pagesByTrack.push({ trackId: track.trackId, pages: pages.length });

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
  delete facts.ncaDispositionDate;
  let outcome = "generated";
  try {
    const derived = deriveNebraskaGuidanceFacts("ne-nonconviction-auto", facts);
    resolvePacket({
      jurisdiction: "NE",
      trackId: "ne-nonconviction-auto",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing disposition date: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no petition language, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("Nebraska guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Nebraska guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(`   ${s.trackId.padEnd(34)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
