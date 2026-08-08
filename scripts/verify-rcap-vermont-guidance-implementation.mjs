// Vermont guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Vermont is not enabled, both
// assigned tracks have governing specifications and match the adopted packet
// sets and manifests in component identity, order and requirement, each route
// renders deterministically into its own final guidance PDF with no blank page
// and no detached heading, every typed stop and every closed list fails closed
// with a reason, a destination and a next step, no stop routes back to the
// node the participant is standing on, no artifact carries petition structure
// or a submission instruction, and every place the design says the law runs
// out is stated rather than papered over.
//
// Six rules here are Vermont's own:
//
//   - **Neither branch has a participant filing, and neither may grow one.**
//     Section 164(f)(5) puts the duty on the court; § 164(f)(1) to (4) puts it
//     on the Attorney General and the holding agencies. No petition,
//     application or request may be generated on either.
//   - **Sealing petitions and fee-waiver applications stay out of this lane.**
//     They are separate Vermont routes owned by other jobs. Naming their
//     official forms here would put a form identity inside the guidance lane,
//     so the two source-assignment form numbers this job must not touch —
//     600-00228 and 200-00130 — are prohibited outright.
//   - **Vocabulary is a scope restriction.** After 1 July 2025 Vermont is a
//     sealing state rather than an expungement state, and participant copy may
//     not use expungement as the umbrella term. Both sheets must carry the
//     three-way distinction; the post-charge sheet uses expungement because
//     the statute does; the pre-charge sheet uses deletion and must not claim
//     a court expunged anything, because no charge was ever filed.
//   - **The § 164(f)(4) applicability cut-off is a first-class fact.** A
//     pre-charge completion before 1 July 2025 is outside the scheme, no
//     alternative route was established, and none may be invented.
//   - **Valcour is exempt and nobody may be told the record is gone
//     everywhere.** The exemption is required copy on the pre-charge sheet and
//     the claim that every holder has cleared is prohibited on both.
//   - **Federal records are not reached.** Required on both sheets, because
//     the Vermont Crime Information Center notifies the FBI's National Crime
//     Information Center and that invites exactly the wrong inference.
//
// `FORBIDDEN_PER_TRACK` is the check that earns its place on a two-branch
// jurisdiction. The two branches share a section number and almost nothing
// else: one has a court, a State's Attorney contest and three findings; the
// other has no court at all, an Attorney General notice and an applicability
// cut-off. A shared constant that reads correctly on one reads as invented law
// on the other, so each track asserts the absence of the other's machinery.
//
// Money: the design supplies no figure on either branch. The Vermont Crime
// Information Center record carries a fee that the design says must be read
// live at intake rather than stored, so the sheet says there is a charge and
// quotes none — and no currency figure may appear anywhere.
//
// Why there is no regression variant on either track: both adopted packet sets
// carry a single required component and neither template interpolates a
// participant answer, so a second fixture would render byte-for-byte the same
// packet. The branches that matter are typed stops, and all sixteen are
// exercised below.

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
  VERMONT_GUIDANCE_TRACKS,
  VERMONT_GUIDANCE_TEMPLATES,
  VT_RECORD_JURISDICTIONS,
  VT_DIVERSION_TYPES,
  VT_COMPLETION_ERA,
  VT_RECORD_STATUS,
  VermontGuidanceStopError,
  VermontRouteMismatchError,
  VermontBranchError,
  deriveVermontGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/vermont/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/vermont-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

const ASSIGNED = ["vt_diversion_post_charge", "vt_diversion_pre_charge"];

// 1. Not enabled.
ok(
  RELIEF_TRACKS.filter((t) => t.jurisdiction === "VT" && !t.trackId.startsWith("technical-fixture-"))
    .length === 0,
  "A real Vermont track is wired into the shared registry."
);
for (const trackId of ASSIGNED) {
  ok(!RELIEF_TRACKS.some((t) => t.trackId === trackId), `${trackId} is already in the shared registry.`);
}
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("vt-")).length === 0,
  "Vermont templates are wired into the shared guidance pack."
);
ok(
  RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0,
  "A shared-registry track is not runtime-disabled."
);
note("1. Enablement: no real Vermont track in the shared registry, no Vermont template in the shared guidance pack.");

for (const t of VERMONT_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, VERMONT_GUIDANCE_TEMPLATES);

// 2. Exactly the assigned tracks, nothing promoted.
ok(
  JSON.stringify(VERMONT_GUIDANCE_TRACKS.map((t) => t.trackId).sort()) ===
    JSON.stringify([...ASSIGNED].sort()),
  "The implemented tracks are not exactly the assigned tracks."
);
for (const track of VERMONT_GUIDANCE_TRACKS) {
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
const manifests = JSON.parse(
  fs.readFileSync(path.join(root, "data/record-clearing/legal-design-packet-set-manifests.json"), "utf8")
);
const pgTracks = new Set(spec.processGuidanceSpecs.map((s) => s.trackId));
let componentCount = 0;
let conditionalCount = 0;
for (const track of VERMONT_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  ok(
    designed?.outputStrategy === "process_guidance",
    `${track.trackId}: the adopted design does not make this guidance.`
  );
  const manifest = manifests.packetSets.find((m) => m.trackId === track.trackId);
  ok(Boolean(manifest), `${track.trackId}: no adopted packet-set manifest.`);
  ok(
    manifest?.packetSetId === track.packetSet.packetSetId,
    `${track.trackId}: packet set id differs from the adopted manifest.`
  );

  const designedComponents = designed?.packetSet?.components ?? [];
  ok(
    designedComponents.length === track.packetSet.components.length,
    `${track.trackId}: component count differs from the design.`
  );
  ok(
    JSON.stringify((manifest?.components ?? []).map((c) => c.componentId)) ===
      JSON.stringify(track.packetSet.components.map((c) => c.componentId)),
    `${track.trackId}: component identity or order differs from the adopted manifest.`
  );
  for (const [index, c] of track.packetSet.components.entries()) {
    const match = designedComponents[index];
    ok(
      match?.componentId === c.componentId,
      `${c.componentId}: out of the design's component identity or order.`
    );
    ok(
      match?.requirement === c.requirement,
      `${c.componentId}: requirement differs from the design (${match?.requirement} vs ${c.requirement}).`
    );
    if (c.requirement === "conditional") {
      conditionalCount += 1;
      ok(Boolean(c.conditionKey), `${c.componentId}: conditional component carries no condition key.`);
    }
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(
      c.sourcePath === null && c.sourceSha256 === null,
      `${c.componentId}: guidance names an official source.`
    );
    componentCount += 1;
  }
  for (const c of designedComponents) {
    ok(!c.officialFormId, `${track.trackId}: the design attaches an official form to a guidance route.`);
    ok(
      c.outputStrategy === "process_guidance",
      `${track.trackId}/${c.componentId}: the design gives this component a non-guidance output strategy.`
    );
  }
  // Neither branch has a participant filing, and the design must keep saying so.
  ok(
    /^nothing is filed/i.test((designed?.rules?.filing ?? "").trim()),
    `${track.trackId}: the design no longer records that nothing is filed.`
  );
  ok(
    /^none/i.test((designed?.rules?.participantSignature ?? "").trim()),
    `${track.trackId}: the design now expects the participant to sign something.`
  );
  ok(
    /^none/i.test((designed?.rules?.fees ?? "").trim()),
    `${track.trackId}: the design now records a fee on a route with no filing.`
  );
  ok(
    /participant gives no notice/i.test(designed?.rules?.notice ?? ""),
    `${track.trackId}: the design no longer records that the participant gives no notice.`
  );
}
ok(componentCount === 2, `expected the design's 2 components, found ${componentCount}.`);
ok(conditionalCount === 0, `the Vermont design has no conditional component, found ${conditionalCount}.`);
const used = new Set(VERMONT_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(VERMONT_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);

// The design's own split: one branch runs on the court, the other does not.
{
  const post = design.tracks.find((t) => t.trackId === "vt_diversion_post_charge");
  const pre = design.tracks.find((t) => t.trackId === "vt_diversion_pre_charge");
  ok(
    /164\(f\)\(5\)/.test(post?.rules?.filing ?? ""),
    "the design no longer places the post-charge branch at § 164(f)(5)."
  );
  ok(
    /164\(f\)\(1\) to \(4\)/.test(pre?.rules?.filing ?? ""),
    "the design no longer places the pre-charge branch at § 164(f)(1) to (4)."
  );
  ok(
    post?.destination?.kind === "automatic",
    "the post-charge destination is no longer recorded as court-initiated."
  );
  ok(pre?.destination?.kind === "agency", "the pre-charge destination is no longer recorded as an agency.");
}
note(
  `3. Specifications: ${componentCount} components across ${ASSIGNED.length} tracks, each specified, each matching the design and the adopted manifest in identity, order and requirement, none source-bound.`
);

for (const [id, template] of Object.entries(VERMONT_GUIDANCE_TEMPLATES)) {
  ok(!/\{\{/.test(JSON.stringify(template)), `${id}: carries a fact placeholder, so one fixture no longer covers it.`);
}

// 4. Closed lists and typed stops.
//
// Two base fixtures, because the two branches ask different questions. Both
// are Chittenden County participants who completed successfully, owe nothing
// and have not yet checked their own record.
const BASE_POST = {
  recordJurisdiction: "vermont_state",
  diversionType: "post_charge",
  immigrationConsequences: "no",
  completionDate: "12 February 2024",
  recordStatus: "not_yet_checked",
  statesAttorneyContested: "no",
  subsequentConvictionOrPendingProceeding: "no",
  restitutionOwed: "no",
  countyOfCase: "Chittenden County"
};

const BASE_PRE = {
  recordJurisdiction: "vermont_state",
  diversionType: "pre_charge",
  immigrationConsequences: "no",
  completionDate: "3 September 2025",
  recordStatus: "not_yet_checked",
  completionEra: "on_or_after_1_july_2025",
  restitutionPaid: "yes",
  wantsRemovalFromAnExemptDatabase: "no",
  countyOfProgram: "Chittenden County"
};

const BASE = { vt_diversion_post_charge: BASE_POST, vt_diversion_pre_charge: BASE_PRE };

const NEG = [
  // Shared gates, exercised on both branches.
  ["vt_diversion_post_charge", { recordJurisdiction: "federal" }, "mismatch", "record_is_not_a_vermont_state_record"],
  ["vt_diversion_pre_charge", { recordJurisdiction: "another_state" }, "mismatch", "record_is_not_a_vermont_state_record"],
  [
    "vt_diversion_post_charge",
    { diversionType: "cannot_tell" },
    "stop",
    "whether_the_diversion_was_pre_charge_or_post_charge_cannot_be_established"
  ],
  [
    "vt_diversion_pre_charge",
    { diversionType: "cannot_tell" },
    "stop",
    "whether_the_diversion_was_pre_charge_or_post_charge_cannot_be_established"
  ],
  [
    "vt_diversion_post_charge",
    { diversionType: "pre_charge" },
    "mismatch",
    "diversion_was_pre_charge_rather_than_post_charge"
  ],
  [
    "vt_diversion_pre_charge",
    { diversionType: "post_charge" },
    "mismatch",
    "diversion_was_post_charge_rather_than_pre_charge"
  ],
  ["vt_diversion_post_charge", { immigrationConsequences: "yes" }, "stop", "immigration_consequences_in_play"],
  ["vt_diversion_pre_charge", { immigrationConsequences: "yes" }, "stop", "immigration_consequences_in_play"],
  // Post-charge branch only.
  [
    "vt_diversion_post_charge",
    { statesAttorneyContested: "yes" },
    "stop",
    "states_attorney_has_contested_the_expungement"
  ],
  [
    "vt_diversion_post_charge",
    { subsequentConvictionOrPendingProceeding: "yes" },
    "stop",
    "subsequent_conviction_or_pending_proceeding_in_the_two_year_period"
  ],
  [
    "vt_diversion_post_charge",
    { restitutionOwed: "yes" },
    "stop",
    "restitution_related_to_the_case_remains_outstanding"
  ],
  [
    "vt_diversion_post_charge",
    { recordStatus: "still_shows_after_the_window" },
    "stop",
    "the_court_window_has_passed_and_the_record_still_shows"
  ],
  // Pre-charge branch only.
  [
    "vt_diversion_pre_charge",
    { completionEra: "before_1_july_2025" },
    "stop",
    "completion_predates_the_automatic_deletion_scheme"
  ],
  [
    "vt_diversion_pre_charge",
    { completionEra: "cannot_tell" },
    "stop",
    "completion_predates_the_automatic_deletion_scheme"
  ],
  [
    "vt_diversion_pre_charge",
    { restitutionPaid: "no" },
    "stop",
    "restitution_was_not_paid_so_the_completion_may_not_be_successful"
  ],
  [
    "vt_diversion_pre_charge",
    { wantsRemovalFromAnExemptDatabase: "yes" },
    "stop",
    "removal_from_an_exempt_law_enforcement_database_requested"
  ],
  [
    "vt_diversion_pre_charge",
    { recordStatus: "still_shows_after_the_window" },
    "stop",
    "the_deletion_window_has_passed_and_records_still_appear"
  ],
  // Honest non-stopping answers still render.
  ["vt_diversion_post_charge", { recordStatus: "no_longer_shows" }, "generated"],
  ["vt_diversion_post_charge", { recordStatus: "window_has_not_run_yet" }, "generated"],
  ["vt_diversion_pre_charge", { recordStatus: "window_has_not_run_yet" }, "generated"],
  // Closed lists fail closed rather than falling through.
  ["vt_diversion_post_charge", { recordJurisdiction: "" }, "branch"],
  ["vt_diversion_post_charge", { recordJurisdiction: "vermont" }, "branch"],
  ["vt_diversion_post_charge", { diversionType: "diversion" }, "branch"],
  ["vt_diversion_post_charge", { immigrationConsequences: "maybe" }, "branch"],
  ["vt_diversion_post_charge", { statesAttorneyContested: "unsure" }, "branch"],
  ["vt_diversion_post_charge", { subsequentConvictionOrPendingProceeding: "possibly" }, "branch"],
  ["vt_diversion_post_charge", { restitutionOwed: "some" }, "branch"],
  ["vt_diversion_post_charge", { recordStatus: "still_shows" }, "branch"],
  ["vt_diversion_pre_charge", { completionEra: "2025" }, "branch"],
  ["vt_diversion_pre_charge", { completionEra: "" }, "branch"],
  ["vt_diversion_pre_charge", { restitutionPaid: "partly" }, "branch"],
  ["vt_diversion_pre_charge", { wantsRemovalFromAnExemptDatabase: "later" }, "branch"],
  ["vt_diversion_pre_charge", { recordStatus: "cleared" }, "branch"]
];

/**
 * How each route names itself when a stop points elsewhere.
 *
 * A stop that routes the participant back to the node they are standing on is
 * a dead end dressed as a referral, so the circularity check tests the phrase
 * the other node would use to name this route rather than a generic
 * self-referential word.
 */
const SELF_MARKERS = {
  vt_diversion_post_charge: /the Vermont post-charge diversion route|the 164\(f\)\(5\) route/i,
  vt_diversion_pre_charge: /the Vermont pre-charge diversion route|the 164\(f\)\(1\) to \(4\) route/i
};

/**
 * The stops whose honesty the design turns on.
 *
 * Each carries a fact a later edit could drop while leaving the stop id and
 * the destination intact, so the reason itself is asserted.
 */
const STOP_REASON_REQUIRED = {
  completion_predates_the_automatic_deletion_scheme: [
    [/1 July 2025/, "the applicability cut-off"],
    [/\(f\)\(4\)/, "the subsection that imposes it"],
    [/was not established/i, "the honest statement that no alternative route is known"],
    [/will not invent one/i, "the refusal to invent a remedy"]
  ],
  removal_from_an_exempt_law_enforcement_database_requested: [
    [/Valcour/, "the database the section exempts"],
    [/exempts/i, "the exemption itself"],
    [/none was found/i, "the honest statement that no route was identified"]
  ],
  states_attorney_has_contested_the_expungement: [
    [/opportunity for a hearing to contest/i, "the statutory right being exercised"]
  ],
  subsequent_conviction_or_pending_proceeding_in_the_two_year_period: [
    [/no proceeding is pending/i, "the second half of the finding"]
  ],
  restitution_related_to_the_case_remains_outstanding: [
    [/no restitution related to the case is owed/i, "the finding restitution defeats"]
  ],
  restitution_was_not_paid_so_the_completion_may_not_be_successful: [
    [/required for a completion to count as successful/i, "why unpaid restitution is worse here"]
  ],
  whether_the_diversion_was_pre_charge_or_post_charge_cannot_be_established: [
    [/completely different machinery/i, "why the answer cannot be guessed"]
  ],
  the_court_window_has_passed_and_the_record_still_shows: [
    [/no deadline or appeal attaches/i, "the refusal to invent a remedy"]
  ],
  the_deletion_window_has_passed_and_records_still_appear: [
    [/no deadline or appeal attaches/i, "the refusal to invent a remedy"]
  ]
};

const STOP_REASON_PROHIBITED = [
  [/we (will|can) (file|prepare|submit)/i, "an offer to act for the participant"],
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "an invented deadline"],
  [/you (can|may) appeal/i, "an invented appeal"],
  [/600-00228|200-00130/, "a source-assigned official form that belongs to another job"]
];

const typedStops = new Map();
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveVermontGuidanceFacts(trackId, { ...BASE[trackId], ...override });
  } catch (e) {
    if (e instanceof VermontGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
    } else if (e instanceof VermontRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
    } else if (e instanceof VermontBranchError) outcome = "branch";
    else outcome = `unexpected:${e.name}`;

    if (outcome === "stop" || outcome === "mismatch") {
      ok(Boolean(e.message), `${trackId}/${e.stopId}: lost its reason.`);
      ok(Boolean(e.routeTo), `${trackId}/${e.stopId}: lost its destination.`);
      ok(Boolean(e.nextStep), `${trackId}/${e.stopId}: lost its next step.`);
      ok(
        !e.routeTo.includes(trackId) && !SELF_MARKERS[trackId].test(e.routeTo),
        `${trackId}/${e.stopId}: routes back to the node the participant is on.`
      );
      for (const [pattern, why] of STOP_REASON_REQUIRED[e.stopId] ?? []) {
        ok(pattern.test(e.message), `${trackId}/${e.stopId}: the reason no longer states ${why}.`);
      }
      for (const [pattern, why] of STOP_REASON_PROHIBITED) {
        ok(!pattern.test(e.message), `${trackId}/${e.stopId}: the reason carries ${why}.`);
      }
      typedStops.set(`${trackId}/${e.stopId}`, e.routeTo);
    }
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected stop ${stopId}, got ${detail}.`);
}
ok(typedStops.size === 16, `expected 16 distinct typed stops, found ${typedStops.size}.`);
note(
  `4. Stops: ${NEG.length} cases exercised; ${typedStops.size} typed stops, each with a reason, a destination and a next step, none circular, none offering to act and none inventing a route the statute does not give.`
);

// The design's own closed lists.
ok(
  JSON.stringify(Object.keys(VT_RECORD_JURISDICTIONS).sort()) ===
    JSON.stringify(["another_state", "federal", "tribal", "vermont_state"]),
  "the record-jurisdiction list is not the design's list."
);
ok(
  JSON.stringify(Object.keys(VT_DIVERSION_TYPES).sort()) ===
    JSON.stringify(["cannot_tell", "post_charge", "pre_charge"]),
  "the diversion-type list does not split on the axis the current statute uses."
);
ok(
  Object.keys(VT_COMPLETION_ERA).includes("before_1_july_2025"),
  "the completion-era list does not carry the § 164(f)(4) cut-off."
);
ok(
  Object.keys(VT_RECORD_STATUS).includes("not_yet_checked") &&
    Object.keys(VT_RECORD_STATUS).includes("window_has_not_run_yet"),
  "the record-status list does not allow the honest answers that nothing has been checked or that it is too early."
);

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const PROHIBITED = [
  // The design supplies no figure on either branch.
  [/[$£€]\s?\d/, "a fee figure the design does not supply"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|COMES NOW|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)\b/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"],
  // No outcome is reported and no eligibility is decided.
  [
    /your (record|case|charge|matter) (has been|was) (expunged|deleted|cleared|sealed|removed)/i,
    "a claim that relief occurred"
  ],
  [/is now (expunged|deleted|cleared|sealed)/i, "a claim that the record is already dealt with"],
  [/\byou are eligible\b/i, "an eligibility determination"],
  [/\byou qualify\b/i, "an eligibility determination"],
  [/we (have )?(filed|submitted|contacted)/i, "a claim that LegalEase filed or contacted someone"],
  // Nobody may be told the record is gone everywhere.
  // Scoped to the unqualified everywhere-claim. The statute's own mandatory
  // phrasing — "all records held by the diversion programme shall be deleted"
  // — carries its holder with it and is required copy on the pre-charge sheet,
  // so the rule tests for a completed claim about every holder rather than for
  // the words "all records".
  [
    /(all|every) (of your |your )?(records?|copies|holders?|databases?)[^.]{0,40}(have|has|are|is) (now )?been? (deleted|expunged|removed|cleared)/i,
    "a promise that every holder cleared"
  ],
  [/(gone|removed|deleted) (from )?everywhere/i, "the claim the design forbids"],
  [/no (record|copy|trace) (of it )?(remains|survives) anywhere/i, "the claim the design forbids"],
  // No participant filing on either branch, ever.
  [/\b(sign|complete|fill out) (it |them |the \w+ )?(and|then) (send|mail|file|submit)\b/i, "a submission instruction"],
  [/\bmail (it|them|the (petition|application|form|request)) to\b/i, "a mailing instruction"],
  [/file (this|the attached|the enclosed) (petition|form|request|application)/i, "a filing instruction"],
  [/(your|the) (attached|enclosed|generated) (petition|request|letter|application)/i, "a generated instrument"],
  [
    /(this (packet|page)|LegalEase) (prepares|includes|generates|contains|drafts) (a|the|your) (petition|application|request|letter)/i,
    "a claim that this packet produces a filing"
  ],
  // Sealing petitions and fee-waiver applications stay in their own lane.
  [/\b(600-00228|200-00130)\b/, "a source-assigned official form that belongs to another job"],
  [
    /(this page|we) (can )?(prepare|complete|generate) (a|the|your) (sealing petition|fee waiver|application to waive)/i,
    "a sealing petition or fee-waiver application inside the guidance lane"
  ],
  // No agency is accused, no remedy or deadline is invented.
  [/you (must|have to) (file|apply|petition|respond) (by|within)/i, "a deadline the design does not state"],
  [
    /the (court|clerk|programme|program|Attorney General|State's Attorney) (has |had )?(failed|refused|neglected)/i,
    "an accusation that an office failed"
  ],
  [/the remedy (is|would be) to (file|apply|move|appeal)/i, "an invented remedy"],
  [/you (can|may|should) appeal/i, "an invented appeal"],
  // No fabricated office.
  [
    /\b\d{2,5}\s+[A-Z][a-z]+\s+(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.)/,
    "a street address"
  ],
  [/\bVT\s+0\d{4}\b/, "a postal code"],
  [/\b(1-)?\d{3}[-.]\d{3}[-.]\d{4}\b/, "a telephone number"],
  // Internal legal-design vocabulary must not reach participant copy.
  [
    /\b(adopted design|legal-design|release blocker|build blocker|output strategy|packet set|track id|trackId)\b/i,
    "internal legal-design jargon"
  ],
  [/\bthe design (records|says|treats|classifies|holds)\b/i, "internal legal-design jargon"],
  [/\b(in|by|for) (this|the) design\b/i, "internal legal-design jargon"],
  [/the list below/i, "a forward reference to a list that does not follow on every sheet"]
];

const REQUIRED = [
  [/This document is not a court filing\./, "the not-a-court-filing sentence"],
  [/LegalEase cannot/i, "a statement of what LegalEase cannot do"],
  [
    /has not contacted any court, clerk, prosecutor, diversion programme or agency/i,
    "the disclaimer of having contacted anyone"
  ],
  [
    /LegalEase cannot tell you that a record has been expunged or deleted/i,
    "the refusal to report an outcome"
  ],
  // The section, and the two amendments that made it current.
  [/3 V\.S\.A\. § 164|section 164/i, "the governing section"],
  [/2023 Act 180/, "the first amending act"],
  [/2025 Act 64/, "the second amending act"],
  [/1 July 2025/, "the date the current scheme took effect"],
  // The two-year clock and the 30-day window.
  [/two-year anniversary|two years/i, "the waiting period"],
  [/30 days/, "the window the acting body has"],
  // The vocabulary distinction the design requires.
  [/Expungement removes records from any accessible database/i, "the definition of expungement"],
  [/Sealing moves records into a confidential file/i, "the definition of sealing"],
  [/Deletion is what section 164 does/i, "the definition of deletion"],
  // The no-petition message the design calls the most valuable one.
  [/without a petition and without a fee/i, "the no-petition, no-fee statement"],
  [/Nobody should sell you a petition packet/i, "the warning the design asks for in terms"],
  // Federal reach.
  [/National Crime Information Center/, "the notification that invites the wrong inference"],
  [/federal criminal background check/i, "the limit on Vermont's reach"],
  // Nothing filed.
  [/Nothing is filed by you on this route/i, "the statement that nothing is filed"]
];

/**
 * Per-track assertions.
 *
 * The two branches of § 164(f) share a section number and almost nothing else,
 * so each track asserts both its own machinery and the absence of the other's.
 * These are the checks that catch a shared constant carrying one route's law
 * onto the other's page.
 */
const PER_TRACK = {
  vt_diversion_post_charge: [
    [/164\(f\)\(5\)/, "the governing subsection"],
    [/all parties of record/i, "who the court notifies"],
    [/opportunity for a hearing to contest/i, "the State's Attorney's right"],
    [/three (statutory )?findings|three findings/i, "the findings the court must make"],
    [/fingerprints and (the )?photographs/i, "the full list of what is expunged"],
    [/Criminal Division of the Superior Court/i, "the office that runs the record search"],
    [/200-00331/, "the participant's own record-search request, named so it is recognised"],
    [/Restitution Unit of the Vermont Center for Crime Victim Services/i, "where a restitution balance comes from"],
    [/previous arrangement/i, "the open question about an older completion"]
  ],
  vt_diversion_pre_charge: [
    [/164\(f\)\(1\) to \(4\)|\(f\)\(1\) to \(4\)/, "the governing subsections"],
    [/Deletion applicability/, "the caption of the subsection that limits the scheme"],
    [/Attorney General/, "the body that gives the deletion notice"],
    [/within 10 days/i, "the programme's notification step"],
    [/Valcour/, "the exempt database"],
    [/exempt from deletion/i, "the exemption itself"],
    [/Vermont Crime Information Center/, "where the participant checks"],
    [/no court is involved|there is no court at all/i, "the absence of a court on this branch"],
    [/was not established/i, "the open question about an earlier completion"]
  ]
};

const FORBIDDEN_PER_TRACK = {
  vt_diversion_post_charge: [
    [/Valcour/, "the pre-charge branch's exempt database"],
    [/Deletion applicability/, "the pre-charge branch's applicability subsection"],
    [/Attorney General/, "the pre-charge branch's acting body"],
    // The Center is named family-wide in the federal-reach sentence, which is
    // a design packet instruction on both tracks. What must not cross over is
    // the Center in its pre-charge role, as the place this participant checks.
    [
      /(request|obtain|order) a criminal conviction record from the Vermont Crime Information Center/i,
      "the pre-charge branch's checking body"
    ]
  ],
  vt_diversion_pre_charge: [
    [/opportunity for a hearing to contest/i, "the post-charge branch's contest right"],
    [/Criminal Division of the Superior Court/i, "the post-charge branch's court office"],
    [/200-00331/, "the post-charge branch's record-search request"],
    [/three findings/i, "the post-charge branch's statutory findings"],
    [/fingerprints/i, "the post-charge branch's list of expunged records"]
  ]
};

const samples = [];

async function renderTrack(track, extraFacts, label, expectedComponents, sampleRole = "canonical") {
  const facts = deriveVermontGuidanceFacts(track.trackId, {
    ...BASE[track.trackId],
    ...(extraFacts ?? {})
  });
  const resolved = resolvePacket({
    jurisdiction: "VT",
    trackId: track.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  ok(resolved.runtimeStatus === "runtime_disabled", `${label}: resolved ${resolved.runtimeStatus}.`);
  ok(resolved.isFilingPacket === false, `${label}: guidance resolved as a filing packet.`);
  if (expectedComponents !== undefined) {
    ok(
      resolved.components.length === expectedComponents,
      `${label}: resolved ${resolved.components.length} components, expected ${expectedComponents}.`
    );
  }

  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "VT",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "VT",
      geography: null,
      facts,
      rootDir: root
    });
    ok(sha(rendered.bytes) === sha(again.bytes), `${component.componentId}: not deterministic.`);
    ok((rendered.pageCount ?? 0) > 0, `${component.componentId}: no pages.`);
    ok(rendered.sourceSha256 === null, `${component.componentId}: reports an official source hash.`);
    ok(
      (rendered.warnings ?? []).length === 0,
      `${component.componentId}: rendered with warnings ${JSON.stringify(rendered.warnings)}.`
    );
    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
  }

  const assembleInput = {
    jurisdiction: "VT",
    jurisdictionName: "Vermont",
    packetName: resolved.track.assembledPacketName,
    caseReference: "125-2-24-Cncr",
    title: resolved.track.assembledPacketTitle,
    components
  };
  const assembled = await assemblePacketPdf(assembleInput);
  const againAssembled = await assemblePacketPdf(assembleInput);
  ok(assembled.sha256 === againAssembled.sha256, `${label}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${label}: the deliverable is a ZIP.`);

  const dir = path.join(OUT, label.replace(/[^a-z0-9_]+/gi, "-"));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, assembled.fileName);
  fs.writeFileSync(file, assembled.bytes);

  const text = pdfText(file);
  for (const [pattern, why] of PROHIBITED) ok(!pattern.test(text), `${label}: contains ${why}.`);
  for (const [pattern, why] of REQUIRED) ok(pattern.test(text), `${label}: missing ${why}.`);
  for (const [pattern, why] of PER_TRACK[track.trackId]) ok(pattern.test(text), `${label}: missing ${why}.`);
  for (const [pattern, why] of FORBIDDEN_PER_TRACK[track.trackId]) {
    ok(!pattern.test(text), `${label}: carries ${why}.`);
  }

  const pages = pdfPageTexts(file);
  for (const [i, page] of pages.entries()) {
    ok(page.replace(/\s/g, "").length > 40, `${label}: page ${i + 1} is blank.`);
    const lastLine = page.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
    ok(!isSectionHeading(lastLine), `${label}: page ${i + 1} ends on the detached heading "${lastLine}".`);
  }
  ok(pages.length === assembled.pageCount, `${label}: page count disagrees with the assembler.`);

  samples.push({
    label,
    trackId: track.trackId,
    sampleRole,
    variantOfTrackId: sampleRole === "variant" ? track.trackId : null,
    variantPurpose: null,
    fileName: assembled.fileName,
    sha256: assembled.sha256,
    pageCount: assembled.pageCount,
    byteSize: assembled.byteSize,
    components: components.length
  });
  return assembled.sha256;
}

for (const track of VERMONT_GUIDANCE_TRACKS) {
  const expected = track.packetSet.components.filter((c) => c.requirement === "required").length;
  await renderTrack(track, undefined, track.trackId, expected);
}

ok(samples.length === ASSIGNED.length, `expected ${ASSIGNED.length} samples, found ${samples.length}.`);
for (const trackId of ASSIGNED) {
  const canonical = samples.filter((s) => s.trackId === trackId && s.sampleRole === "canonical");
  ok(canonical.length === 1, `${trackId}: expected exactly one canonical sample, found ${canonical.length}.`);
}
ok(samples.every((s) => s.variantOfTrackId === null), "a variant was emitted without a material branch to justify it.");
ok(
  new Set(samples.map((s) => s.sha256)).size === samples.length,
  "the two branches render the same packet, so one of them is not carrying its own law."
);

// A non-stopping answer renders the identical packet, which is what makes one
// canonical fixture per track sufficient rather than merely convenient.
{
  const other = await assembleOnly("vt_diversion_post_charge", { recordStatus: "no_longer_shows" });
  ok(
    other === samples.find((s) => s.trackId === "vt_diversion_post_charge").sha256,
    "a different record-status answer changes the packet, so one fixture no longer covers the track."
  );
}

// A missing required answer must stop at resolution rather than render a gap.
{
  const facts = { ...BASE_PRE };
  delete facts.countyOfProgram;
  let outcome = "generated";
  try {
    const derived = deriveVermontGuidanceFacts("vt_diversion_pre_charge", facts);
    resolvePacket({
      jurisdiction: "VT",
      trackId: "vt_diversion_pre_charge",
      facts: derived,
      allowTechnicalFixtures: true
    });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : `other:${e.name}`;
  }
  ok(outcome === "resolution_missing_required_input", `missing county of programme: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically from ${samples.reduce((n, s) => n + s.components, 0)} components, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no detached headings, no petition structure, no submission instruction, no sealing petition or fee-waiver application, and neither branch carrying the other's machinery.`
);

console.log("");
if (failures.length > 0) {
  console.error("Vermont guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Vermont guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(
    `   ${s.trackId.padEnd(26)} ${s.sampleRole.padEnd(9)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`
  );
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

async function assembleOnly(trackId, extraFacts) {
  const track = VERMONT_GUIDANCE_TRACKS.find((t) => t.trackId === trackId);
  const facts = deriveVermontGuidanceFacts(trackId, { ...BASE[trackId], ...extraFacts });
  const resolved = resolvePacket({
    jurisdiction: "VT",
    trackId,
    facts,
    allowTechnicalFixtures: true
  });
  const components = [];
  for (const component of resolved.components) {
    const rendered = await renderPacketComponent({
      component,
      jurisdiction: "VT",
      geography: null,
      facts,
      rootDir: root
    });
    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: rendered.bytes
    });
  }
  const assembled = await assemblePacketPdf({
    jurisdiction: "VT",
    jurisdictionName: "Vermont",
    packetName: resolved.track.assembledPacketName,
    caseReference: "125-2-24-Cncr",
    title: track.assembledPacketTitle,
    components
  });
  return assembled.sha256;
}

function sha(b) {
  return crypto.createHash("sha256").update(b).digest("hex");
}
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
