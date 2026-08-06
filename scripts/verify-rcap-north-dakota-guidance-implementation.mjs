// North Dakota guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: North Dakota is not enabled,
// every assigned track has a governing specification and matches the adopted
// packet set, all five routes render deterministically into one final guidance
// PDF each with no blank page and no detached heading, every typed stop and
// closed list fails closed with a reason, a destination and a next step, and
// the four things the adopted design forbids being asserted are not asserted:
// that the record has closed, a remedy for a court that misses day sixty-one,
// the State v. Howe standard, and an address for the State Crime Laboratory.

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
  NORTH_DAKOTA_GUIDANCE_TRACKS,
  NORTH_DAKOTA_GUIDANCE_TEMPLATES,
  ND_CHARGE_RESOLUTION,
  ND_TRAFFICKING_OFFENCES,
  ND_DNA_OUTCOMES,
  ND_JUVENILE_CASE_TYPES,
  NorthDakotaGuidanceStopError,
  NorthDakotaRouteMismatchError,
  NorthDakotaBranchError,
  deriveNorthDakotaGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/north-dakota/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/north-dakota-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = [
  "nd-dna-profile-removal-routing",
  "nd-juvenile-records-routing",
  "nd-nonconviction-auto-close-verify",
  "nd-trafficking-vacatur-routing",
  "nd-unconstitutional-arrest-expungement-routing"
];

// 1. Not enabled.
// The shared registry ships a non-production `ND technical-fixture-pleading`
// that exists to prove the renderer lifecycle. It is not a North Dakota relief
// track, so the assertion is that no real one is wired in.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "ND" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real North Dakota track is wired into the shared registry."
);
ok(
  RELIEF_TRACKS.filter((t) => ASSIGNED.includes(t.trackId)).length === 0,
  "An assigned North Dakota track is already in the shared registry."
);
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("nd-")).length === 0,
  "North Dakota templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: North Dakota absent from the shared registry and the shared guidance pack.");

for (const t of NORTH_DAKOTA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, NORTH_DAKOTA_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(NORTH_DAKOTA_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) === JSON.stringify(ASSIGNED),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of NORTH_DAKOTA_GUIDANCE_TRACKS) {
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
for (const track of NORTH_DAKOTA_GUIDANCE_TRACKS) {
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
const used = new Set(
  NORTH_DAKOTA_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId))
);
for (const id of Object.keys(NORTH_DAKOTA_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(`3. Specifications: ${used.size} components, each specified, each matching the design, none source-bound.`);

// 4. Closed lists and typed stops.
//
// The base fixture is a participant on the automatic route whose case qualifies
// and who has already searched and found it gone; each routing node then gets
// the answers that put it on that node rather than another one.
const BASE = {
  wantsEligibilityAdvice: "no",
  autoOrderDate: "3 September 2025",
  autoOrderBeforeAugust2025: "no",
  autoAllChargesResolved: "all_dismissed",
  autoPleaException: "no",
  autoOtherExceptions: "no",
  autoExpectsAgencyRecordsToChange: "no",
  autoSixtyOneDaysPassed: "yes",
  autoVerifiedClosed: "no",
  tvOffence: "misdemeanor_theft",
  tvConvictionDate: "17 June 2021",
  tvVictimisationNexus: "yes",
  tvOfficialDocumentation: "no",
  tvWantsToRunItAlone: "no",
  juvAgeAtOffence: "yes",
  juvCaseType: "delinquency",
  juvFinalOrderDate: "Case closed 4 April 2014; turned eighteen 22 October 2016",
  juvPendingCharges: "no",
  juvWantsEarlyDestruction: "no",
  dnaArrestDate: "8 January 2020",
  dnaOutcome: "dismissed",
  dnaFelonyKeepsProfile: "no",
  uaArrestDate: "12 December 2018",
  uaOutcome: "charges_dismissed",
  uaConstitutionalGroundAsserted: "yes",
  uaConstitutionalGround: "The stop was made without any reason given."
};

const NEG = [
  // The gate that runs on every route.
  ["nd-nonconviction-auto-close-verify", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["nd-dna-profile-removal-routing", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  // nd-nonconviction-auto-close-verify.
  ["nd-nonconviction-auto-close-verify", { autoOrderBeforeAugust2025: "yes" }, "mismatch", "order_predates_the_automatic_close"],
  ["nd-nonconviction-auto-close-verify", { autoAllChargesResolved: "a_mixture" }, "stop", "fewer_than_all_charges_resolved_favourably"],
  ["nd-nonconviction-auto-close-verify", { autoPleaException: "yes" }, "stop", "dismissal_under_a_plea_agreement_with_another_conviction"],
  ["nd-nonconviction-auto-close-verify", { autoOtherExceptions: "yes" }, "stop", "fitness_to_proceed_criminal_responsibility_or_appeal_exception"],
  ["nd-nonconviction-auto-close-verify", { autoExpectsAgencyRecordsToChange: "yes" }, "stop", "participant_expects_agency_records_to_change"],
  ["nd-nonconviction-auto-close-verify", { autoVerifiedClosed: "yes", autoSixtyOneDaysPassed: "yes" }, "stop", "record_still_showing_after_sixty_one_days"],
  // nd-trafficking-vacatur-routing.
  ["nd-trafficking-vacatur-routing", { tvOffence: "something_else" }, "stop", "offence_outside_the_listed_offences"],
  ["nd-trafficking-vacatur-routing", { tvVictimisationNexus: "no" }, "mismatch", "no_victimisation_nexus_asserted"],
  ["nd-trafficking-vacatur-routing", { tvWantsToRunItAlone: "yes" }, "stop", "post_conviction_procedure_is_not_self_help"],
  // nd-juvenile-records-routing.
  ["nd-juvenile-records-routing", { juvAgeAtOffence: "no" }, "mismatch", "offence_was_not_a_juvenile_matter"],
  ["nd-juvenile-records-routing", { juvPendingCharges: "yes" }, "stop", "charges_pending_in_another_court"],
  ["nd-juvenile-records-routing", { juvWantsEarlyDestruction: "yes" }, "stop", "early_destruction_needs_a_good_cause_showing"],
  // nd-dna-profile-removal-routing.
  ["nd-dna-profile-removal-routing", { dnaOutcome: "none_of_these" }, "stop", "outcome_is_not_one_of_the_statutory_grounds"],
  ["nd-dna-profile-removal-routing", { dnaFelonyKeepsProfile: "yes" }, "stop", "felony_charge_or_conviction_keeps_the_profile"],
  // nd-unconstitutional-arrest-expungement-routing.
  ["nd-unconstitutional-arrest-expungement-routing", { uaOutcome: "conviction_stands" }, "stop", "conviction_has_not_been_overturned"],
  ["nd-unconstitutional-arrest-expungement-routing", { uaConstitutionalGroundAsserted: "no" }, "mismatch", "no_constitutional_defect_in_the_arrest_asserted"],
  // Closed lists fail closed rather than falling through.
  ["nd-nonconviction-auto-close-verify", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["nd-nonconviction-auto-close-verify", { autoAllChargesResolved: "most" }, "branch"],
  ["nd-nonconviction-auto-close-verify", { autoVerifiedClosed: "" }, "branch"],
  ["nd-trafficking-vacatur-routing", { tvOffence: "burglary" }, "branch"],
  ["nd-juvenile-records-routing", { juvCaseType: "traffic" }, "branch"],
  ["nd-dna-profile-removal-routing", { dnaOutcome: "unsure" }, "branch"],
  ["nd-unconstitutional-arrest-expungement-routing", { uaOutcome: "" }, "branch"]
];

for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveNorthDakotaGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof NorthDakotaGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: stop lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: stop lost its next step.`);
      ok(Boolean(e.message), `${trackId}/${e.stopId}: stop lost its reason.`);
    } else if (e instanceof NorthDakotaRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: mismatch lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: mismatch lost its next step.`);
      ok(Boolean(e.message), `${trackId}/${e.stopId}: mismatch lost its reason.`);
    } else if (e instanceof NorthDakotaBranchError) outcome = "branch";
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
      deriveNorthDakotaGuidanceFacts(trackId, { ...BASE, ...override });
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
  ok(seen.size >= 15, `only ${seen.size} distinct typed stops carried a destination.`);
  note(
    `4. Stops: ${NEG.length} negative cases fail closed; ${seen.size} typed stops, each with a reason, a destination and a next step, none circular.`
  );
}
ok(Object.keys(ND_CHARGE_RESOLUTION).length === 3, "The charge-resolution closed list changed size.");
ok(Object.keys(ND_TRAFFICKING_OFFENCES).length === 7, "The listed-offence closed list changed size.");
ok(Object.keys(ND_DNA_OUTCOMES).length === 7, "The DNA-ground closed list changed size.");
ok(Object.keys(ND_JUVENILE_CASE_TYPES).length === 2, "The juvenile case-type closed list changed size.");

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
  [/your record (has|was) (been )?(closed|sealed|expunged|destroyed|removed)/i, "a claim that relief occurred"],
  [/is now (closed|sealed|expunged)/i, "a claim that the record is already closed"],
  [/you are eligible/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // The four assertions the adopted design forbids.
  [/the court (must|shall) (close|act) (it )?(by|within) \d+ days of your/i, "a deadline imposed on an office beyond the design"],
  [/(Howe (held|requires|says)|under Howe,)/i, "a standard taken from an unobtainable decision"],
  [/(Crime Laboratory|laboratory) at \d+|P\.?O\.? Box|Bismarck, ND 58/i, "a fabricated laboratory address"],
  [/(file|petition|move) (a|the) motion to compel the (court|clerk) to close/i, "an invented remedy for a missed closing"]
];

const samples = [];
for (const track of NORTH_DAKOTA_GUIDANCE_TRACKS) {
  const facts = deriveNorthDakotaGuidanceFacts(track.trackId, { ...BASE });
  const resolved = resolvePacket({
    jurisdiction: "ND",
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
      jurisdiction: "ND",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "ND",
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
    jurisdiction: "ND",
    jurisdictionName: "North Dakota",
    packetName: resolved.track.assembledPacketName,
    caseReference: "08-2025-CR-00417",
    title: resolved.track.assembledPacketTitle,
    components
  });
  const againAssembled = await assemblePacketPdf({
    jurisdiction: "ND",
    jurisdictionName: "North Dakota",
    packetName: resolved.track.assembledPacketName,
    caseReference: "08-2025-CR-00417",
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
    /has not contacted any court, clerk, agency or laboratory/i.test(text),
    `${track.trackId}: does not disclaim having contacted anyone.`
  );

  if (track.trackId === "nd-nonconviction-auto-close-verify") {
    ok(/Automatic describes what the law requires/i.test(text), "auto-close: missing the automatic-is-not-a-report warning.");
    ok(/sixty-one days/i.test(text), "auto-close: missing the sixty-one-day count.");
    ok(/12-60\.1-05\(1\)/.test(text), "auto-close: does not cite the governing subsection.");
    ok(/1 August 2025/.test(text), "auto-close: missing the commencement date.");
    ok(/public access/i.test(text), "auto-close: does not send the participant to public access.");
    ok(/Bureau of Criminal Investigation/.test(text), "auto-close: does not name the criminal history holder.");
    ok(/court record only/i.test(text), "auto-close: missing the court-record-only limit.");
    ok(/no notice to wait for/i.test(text), "auto-close: does not say there is no notice.");
    ok(/will not invent one/i.test(text), "auto-close: does not close off an invented remedy.");
    ok(/contact the clerk/i.test(text), "auto-close: does not name the clerk as the first step when it has not closed.");
  }
  if (track.trackId === "nd-trafficking-vacatur-routing") {
    ok(/not required/i.test(text), "trafficking: does not say documentation is not required.");
    ok(/presumption/i.test(text), "trafficking: does not state the presumption documentation creates.");
    ok(/survivor legal clinic/i.test(text), "trafficking: does not name the survivor handoff.");
    ok(/does not prepare or file the motion/i.test(text), "trafficking: does not decline the motion.");
    ok(/Post-Conviction Procedure Act/i.test(text), "trafficking: does not name the governing procedure.");
  }
  if (track.trackId === "nd-juvenile-records-routing") {
    ok(/ten years/i.test(text) && /one year/i.test(text), "juvenile: missing a retention clock.");
    ok(/as if it never occurred/i.test(text), "juvenile: missing the effect of final destruction.");
    ok(/ND Legal Self Help Center/i.test(text), "juvenile: does not point at the official packet.");
    ok(/not a finding that the route cannot be run/i.test(text), "juvenile: implies the route is not buildable.");
  }
  if (track.trackId === "nd-dna-profile-removal-routing") {
    ok(/certified order/i.test(text), "dna: missing the certified-order step.");
    ok(/court does not do it for you/i.test(text), "dna: does not say who carries the order.");
    ok(/is not stated in the statute or in the official/i.test(text), "dna: does not disclaim the unknown laboratory process.");
    ok(/not invalidated/i.test(text), "dna: missing the statute's non-invalidation warning.");
    ok(/may not be opened even by order of the court/i.test(text), "dna: missing the effect of sealing.");
  }
  if (track.trackId === "nd-unconstitutional-arrest-expungement-routing") {
    ok(/308 N\.W\.2d 743/.test(text), "unconstitutional arrest: does not give the print citation.");
    ok(/does not tell you what that decision requires/i.test(text), "unconstitutional arrest: does not withhold the standard explicitly.");
    ok(/not available at the courts' own site|not published online/i.test(text), "unconstitutional arrest: does not explain why.");
    ok(/no North Dakota Century Code section/i.test(text), "unconstitutional arrest: does not say there is no statute.");
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
  delete facts.autoOrderDate;
  let outcome = "generated";
  try {
    const derived = deriveNorthDakotaGuidanceFacts("nd-nonconviction-auto-close-verify", facts);
    resolvePacket({
      jurisdiction: "ND",
      trackId: "nd-nonconviction-auto-close-verify",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing order date: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition language, no outcome claim.`
);

console.log("");
if (failures.length > 0) {
  console.error("North Dakota guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("North Dakota guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(`   ${s.trackId.padEnd(46)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
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
