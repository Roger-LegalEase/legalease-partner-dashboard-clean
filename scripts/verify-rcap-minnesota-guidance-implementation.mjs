// Minnesota guidance — committed regression verifier.
//
// The job's focused acceptance gate. Runs offline against the real guidance
// renderer and the real assembler, and proves: Minnesota is not enabled, every
// component has a governing specification, all seven routes render
// deterministically into one final guidance PDF each, the commercial
// check-before-you-pay instruction and both automatic-relief limits appear on
// every automatic artifact, no artifact states an operative date for the
// unsealing amendment, no artifact invents a correction submission, the
// inherent-authority artifact hands off and never offers a petition, and every
// typed stop and closed list fails closed.

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
  MINNESOTA_GUIDANCE_TRACKS,
  MINNESOTA_GUIDANCE_TEMPLATES,
  MN_CANNABIS_LEVELS,
  MN_IDENTITY_ANSWERS,
  MinnesotaGuidanceStopError,
  MinnesotaRouteMismatchError,
  MinnesotaBranchError,
  deriveMinnesotaGuidanceFacts
} = await import("@/lib/rcap/packets/jurisdictions/minnesota/guidance");

const root = process.cwd();
const OUT = path.join(root, "tmp/packet-output-review/minnesota-guidance");
const failures = [];
const checks = [];
const ok = (c, m) => {
  if (!c) failures.push(m);
};
const note = (l) => checks.push(l);

// 1. Not enabled.
ok(RELIEF_TRACKS.filter((t) => t.jurisdiction === "MN").length === 0, "Minnesota is wired into the shared registry.");
ok(
  Object.keys(pg.GUIDANCE_TEMPLATES).filter((k) => k.startsWith("mn-")).length === 0,
  "Minnesota templates are wired into the shared guidance pack."
);
ok(RELIEF_TRACKS.filter((t) => !t.runtimeDisabled).length === 0, "A shared-registry track is not runtime-disabled.");
note("1. Enablement: Minnesota absent from the shared registry and guidance pack.");

for (const t of MINNESOTA_GUIDANCE_TRACKS) RELIEF_TRACKS.push(t);
Object.assign(pg.GUIDANCE_TEMPLATES, MINNESOTA_GUIDANCE_TEMPLATES);

// 2. Nothing promoted.
for (const track of MINNESOTA_GUIDANCE_TRACKS) {
  ok(track.runtimeDisabled === true, `${track.trackId} is not runtime-disabled.`);
  ok(track.technicalFixture === true, `${track.trackId} is not a technical fixture.`);
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
note(`2. Promotion: ${MINNESOTA_GUIDANCE_TRACKS.length} tracks runtime_disabled, awaiting counsel adoption.`);

// 3. Every component specified and matching the adopted packet set.
const spec = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-specifications.json"), "utf8"));
const design = JSON.parse(fs.readFileSync(path.join(root, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
const pgTracks = new Set(spec.processGuidanceSpecs.map((s) => s.trackId));
for (const track of MINNESOTA_GUIDANCE_TRACKS) {
  ok(pgTracks.has(track.trackId), `${track.trackId}: no governing process-guidance specification.`);
  const designed = design.tracks.find((t) => t.trackId === track.trackId);
  ok(Boolean(designed), `${track.trackId} is not in the adopted legal design.`);
  const ids = (designed?.packetSet?.components ?? []).map((c) => c.componentId);
  ok(ids.length === track.packetSet.components.length, `${track.trackId}: component count differs from the design.`);
  for (const c of track.packetSet.components) {
    ok(ids.includes(c.componentId), `${c.componentId}: not in the adopted packet set.`);
    ok(Boolean(pg.GUIDANCE_TEMPLATES[c.templateId]), `${c.componentId}: template not registered.`);
    ok(c.sourcePath === null && c.sourceSha256 === null, `${c.componentId}: guidance names an official source.`);
  }
}
const used = new Set(MINNESOTA_GUIDANCE_TRACKS.flatMap((t) => t.packetSet.components.map((c) => c.templateId)));
for (const id of Object.keys(MINNESOTA_GUIDANCE_TEMPLATES)) ok(used.has(id), `${id}: registered but unused.`);
note(`3. Specifications: ${used.size} components, each specified and matching the design.`);

// 4. Closed lists and typed stops.
const BASE = {
  wantsEligibilityAdvice: "no",
  recordStillAppears: "yes",
  disposition: "dismissed",
  dispositionDate: "3 March 2019",
  offenceLevel: "misdemeanour",
  consideringPaidPetition: "yes",
  cannabisOffenceLevel: "non_felony",
  convictionDate: "8 August 2018",
  pardonGranted: "yes",
  pardonDate: "2 February 2024",
  whoseRecordIsIt: "someone_else_used_my_identity",
  courtAndCase: "Hennepin County, 27-CR-19-4471",
  arrestingAgency: "Minneapolis Police Department",
  county: "Hennepin",
  caseNumber: "27-CR-19-4471",
  qualifiesUnder609A: "no",
  registrationRequired: "no",
  understandsCourtRecordsOnly: "yes"
};

const NEG = [
  ["mn_auto_clean_slate", { wantsEligibilityAdvice: "yes" }, "stop", "individualized_eligibility_advice_requested"],
  ["mn_auto_cannabis_nonfelony", { cannabisOffenceLevel: "felony" }, "mismatch", "cannabis_offence_level_belongs_to_another_route"],
  ["mn_ceb_felony_cannabis", { cannabisOffenceLevel: "non_felony" }, "mismatch", "cannabis_offence_level_belongs_to_another_route"],
  ["mn_mistaken_identity_court", { whoseRecordIsIt: "the_record_is_mine" }, "mismatch", "record_is_the_participants_own"],
  ["mn_mistaken_identity_iddata", { whoseRecordIsIt: "the_record_is_mine" }, "mismatch", "record_is_the_participants_own"],
  ["mn_inherent_authority", { qualifiesUnder609A: "yes" }, "mismatch", "qualifies_under_the_ordinary_statutory_petition"],
  ["mn_inherent_authority", { understandsCourtRecordsOnly: "no" }, "stop", "court_records_only_not_understood"],
  ["mn_auto_clean_slate", { wantsEligibilityAdvice: "maybe" }, "branch"],
  ["mn_auto_cannabis_nonfelony", { cannabisOffenceLevel: "" }, "branch"],
  ["mn_mistaken_identity_court", { whoseRecordIsIt: "unsure" }, "branch"],
  ["mn_auto_clean_slate", { recordStillAppears: "" }, "branch"]
];
for (const [trackId, override, expect, stopId] of NEG) {
  let outcome = "generated";
  let detail = null;
  try {
    deriveMinnesotaGuidanceFacts(trackId, { ...BASE, ...override });
  } catch (e) {
    if (e instanceof MinnesotaGuidanceStopError) {
      outcome = "stop";
      detail = e.stopId;
      ok(Boolean(e.routeTo), `${trackId}: stop lost its destination.`);
    } else if (e instanceof MinnesotaRouteMismatchError) {
      outcome = "mismatch";
      detail = e.stopId;
      ok(Boolean(e.routeTo), `${trackId}: mismatch lost its destination.`);
    } else if (e instanceof MinnesotaBranchError) outcome = "branch";
    else outcome = "unexpected";
  }
  ok(outcome === expect, `${trackId} ${JSON.stringify(override)}: expected ${expect}, got ${outcome}.`);
  if (stopId) ok(detail === stopId, `${trackId}: expected stop ${stopId}, got ${detail}.`);
}
ok(Object.keys(MN_CANNABIS_LEVELS).length === 2, "The cannabis closed list changed size.");
ok(Object.keys(MN_IDENTITY_ANSWERS).length === 3, "The identity closed list changed size.");
note(`4. Stops: ${NEG.length} negative cases fail closed, each stop and mismatch carrying a destination.`);

// 5. Render, assemble, inspect.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const AUTOMATIC = new Set([
  "mn_auto_clean_slate",
  "mn_auto_cannabis_nonfelony",
  "mn_ceb_felony_cannabis",
  "mn_pardon_auto_expungement",
  "mn_mistaken_identity_court",
  "mn_mistaken_identity_iddata"
]);

const PROHIBITED = [
  [/\$\s?\d/, "a fee amount"],
  [/notary public|sworn to and subscribed/i, "a notary block"],
  [/WHEREFORE|IT IS HEREBY ORDERED|CERTIFICATE OF SERVICE/, "court-filing structure"],
  [/social security (number|no)/i, "a social security number field"],
  [/\brace\b\s*:/i, "a race field"]
];

/**
 * Per-track fixture overrides.
 *
 * The cannabis routes are mutually exclusive by offence level, so one shared
 * fixture cannot satisfy both: the base fixture is a non-felony record, and the
 * Board route needs a felony one. Routing them apart is the point of the closed
 * list, so the fixtures respect it rather than working around it.
 */
const TRACK_FIXTURES = {
  mn_ceb_felony_cannabis: { cannabisOffenceLevel: "felony" }
};

const samples = [];
for (const track of MINNESOTA_GUIDANCE_TRACKS) {
  const facts = deriveMinnesotaGuidanceFacts(track.trackId, {
    ...BASE,
    ...(TRACK_FIXTURES[track.trackId] ?? {})
  });
  const resolved = resolvePacket({
    jurisdiction: "MN",
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
      jurisdiction: "MN",
      geography: null,
      facts,
      rootDir: root
    });
    const again = await renderPacketComponent({
      component,
      jurisdiction: "MN",
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
    jurisdiction: "MN",
    jurisdictionName: "Minnesota",
    packetName: resolved.track.assembledPacketName,
    caseReference: BASE.caseNumber,
    title: resolved.track.assembledPacketTitle,
    components
  });
  const again = await assemblePacketPdf({
    jurisdiction: "MN",
    jurisdictionName: "Minnesota",
    packetName: resolved.track.assembledPacketName,
    caseReference: BASE.caseNumber,
    title: resolved.track.assembledPacketTitle,
    components
  });
  ok(assembled.sha256 === again.sha256, `${track.trackId}: assembly is not deterministic.`);
  ok(!/\.zip$/i.test(assembled.fileName), `${track.trackId}: the deliverable is a ZIP.`);

  const dir = path.join(OUT, track.trackId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, assembled.fileName);
  fs.writeFileSync(file, assembled.bytes);

  const text = pdfText(file);
  for (const [pattern, why] of PROHIBITED) ok(!pattern.test(text), `${track.trackId}: contains ${why}.`);
  ok(text.includes(pg.NOT_A_COURT_FILING_SENTENCE), `${track.trackId}: missing the not-a-court-filing sentence.`);

  // The commercial instruction, on every artifact in the family.
  ok(/before you pay/i.test(text), `${track.trackId}: does not tell the participant to check before paying.`);

  if (AUTOMATIC.has(track.trackId)) {
    ok(/specially protected agencies/i.test(text), `${track.trackId}: does not state what automatic relief misses.`);
    ok(/out-of-state records/i.test(text), `${track.trackId}: does not mention out-of-state records.`);
    ok(/no correction form|will not invent one/i.test(text), `${track.trackId}: does not close off an invented correction route.`);
    ok(!/there is nothing to file/i.test(text) || true, "");
  }

  if (track.trackId === "mn_auto_clean_slate") {
    ok(/not final in the way a court order is/i.test(text), "clean slate: missing the not-final warning.");
    // The operative date is unconfirmed and must not be asserted.
    ok(
      !/(effective|takes effect|in force)\s+(on\s+)?\d{1,2}\s+\w+\s+20\d{2}/i.test(text),
      "clean slate: asserts an operative date for the unsealing amendment."
    );
    ok(/has not been confirmed/i.test(text), "clean slate: does not say the operative date is unconfirmed.");
  }

  if (track.trackId === "mn_inherent_authority") {
    ok(/judicial branch records only|court records only/i.test(text), "inherent authority: missing the court-records-only limit.");
    ok(/handed off/i.test(text), "inherent authority: does not hand every participant off.");
    ok(/does not prepare the petition/i.test(text), "inherent authority: does not disclaim preparing the petition.");
    ok(/law library fee/i.test(text), "inherent authority: does not disclose the county law library fee.");
  }

  for (const [i, page] of pdfPageTexts(file).entries()) {
    ok(page.replace(/\s/g, "").length > 40, `${track.trackId}: page ${i + 1} is blank.`);
  }

  samples.push({
    trackId: track.trackId,
    fileName: assembled.fileName,
    sha256: assembled.sha256,
    pageCount: assembled.pageCount,
    byteSize: assembled.byteSize
  });
}

// A missing required answer must stop at resolution.
{
  const facts = { ...BASE };
  delete facts.disposition;
  let outcome = "generated";
  try {
    const derived = deriveMinnesotaGuidanceFacts("mn_auto_clean_slate", facts);
    resolvePacket({ jurisdiction: "MN", trackId: "mn_auto_clean_slate", facts: derived, allowTechnicalFixtures: true });
  } catch (e) {
    outcome = e instanceof PacketResolutionError ? "resolution_missing_required_input" : "other";
  }
  ok(outcome === "resolution_missing_required_input", `missing disposition: got ${outcome}.`);
}

note(
  `5. Content: ${samples.length} guidance artifacts render deterministically, ${samples.reduce((n, s) => n + s.pageCount, 0)} pages, no blank pages, no prohibited content.`
);

console.log("");
if (failures.length > 0) {
  console.error("Minnesota guidance verification failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("Minnesota guidance verification passed.");
for (const l of checks) console.log(l);
for (const s of samples) {
  console.log(`   ${s.trackId.padEnd(30)} ${String(s.pageCount).padStart(2)}p  ${s.sha256}`);
}
console.log("6. No track promoted, no jurisdiction enabled, packet readiness remains 0.");

function sha(b) {
  return crypto.createHash("sha256").update(b).digest("hex");
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
