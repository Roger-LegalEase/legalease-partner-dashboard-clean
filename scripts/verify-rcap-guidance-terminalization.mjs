// Lane-B acceptance contract: guidance, exclusions and exact deferrals.
//
// Every lane-B track must reach the participant through exactly one supported
// treatment, and that treatment must be a useful, specific, product-ready
// experience. This verifier is what makes "complete" checkable instead of a
// matter of prose review.
//
// It reads three things and nothing else:
//   * data/rcap-ledger/track-terminalization.json  — the live assignment (never edited here)
//   * data/rcap-all50/guidance-packets/*.json      — this lane's output
//   * docs/record-clearing/deferrals/*.md          — this lane's deferral statements
//
// Run:
//   node scripts/verify-rcap-guidance-terminalization.mjs            # all lane-B states present
//   node scripts/verify-rcap-guidance-terminalization.mjs --partition=B1
//
// The partition flag scopes coverage to one partition's states so a partition
// can verify itself before its siblings have landed. Every other check always
// runs against every packet file found.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");

const PACKET_DIR = "data/rcap-all50/guidance-packets";
const DEFERRAL_DIR = "docs/record-clearing/deferrals";
const LEDGER = "data/rcap-ledger/track-terminalization.json";

const PARTITIONS = {
  B1: ["AK", "CA", "GA", "IL", "IN", "MD", "MI", "NC", "ND", "NH", "UT"],
  B2: ["AR", "CO", "ME", "MN", "MO", "NE", "OH", "TN", "VA", "VT", "WI"],
  B3: ["CT", "DE", "HI", "KY", "LA", "MT", "NJ", "NY", "OK", "TX", "WV"]
};

const partitionArg = process.argv.find((a) => a.startsWith("--partition="));
const partition = partitionArg ? partitionArg.split("=")[1] : null;
if (partition && !PARTITIONS[partition]) {
  console.error(`unknown partition ${partition}; expected one of ${Object.keys(PARTITIONS).join(", ")}`);
  process.exit(1);
}

/** Internal build vocabulary that must never reach a participant. */
const PROHIBITED_PHRASES = [
  "registry gap",
  "source blocker",
  "crosswalk",
  "legal review pending",
  "unsupported runtime",
  "implementation family",
  "terminal disposition",
  "coming soon",
  "research required",
  "missing_from_compiled_runtime",
  "compiled pathway",
  "nonterminal",
  "lane b",
  "track id",
  "trackid"
];

/** Outcome promises the surrounding copy guardrails already ban. */
const PROHIBITED_PROMISES = [
  "guaranteed eligible",
  "you qualify",
  "will clear your record",
  "will seal your record",
  "will expunge",
  "erase your record",
  "remove from all background checks",
  "garantizado",
  "usted califica"
];

/** A referral is not a treatment when it is the whole answer. */
const BARE_REFERRAL = /^\s*(contact|consult|speak (to|with)|talk to|see)\s+(an?\s+)?(attorney|lawyer|abogad)/i;

/** The eleven required participant-treatment elements. */
const REQUIRED_ELEMENTS = [
  "mechanism",
  "participantFiles",
  "controllingActor",
  "gather",
  "nextStep",
  "destination",
  "stopReason",
  "afterNextStep",
  "briefcaseSaved",
  "handoff",
  "timing"
];

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

// --- load the live assignment ------------------------------------------------

const ledger = JSON.parse(read(LEDGER));
const laneBJobs = ledger.jobs.filter((j) => j.lane === "B");
// A track whose guidance treatment was already PROMOTED by an F2 closure is
// terminal and leaves the job list, but its packet legitimately remains — the
// packet IS the delivered treatment (first case: AK:ak-sej, promoted
// 2026-08-12-w2). Promoted tracks count as validly terminalized here.
const promotedGuidanceTracks = new Set(
  (ledger.tracks ?? [])
    .filter((t) => t.candidateTreatment === "complete_guidance" && t.candidateStatus === "promoted_by_f2")
    .map((t) => t.trackId)
);
const assignedByState = new Map();
for (const job of laneBJobs) {
  const entry = assignedByState.get(job.jurisdiction) ?? { tracks: new Map(), jobIds: new Set() };
  entry.jobIds.add(job.jobId);
  for (const trackId of job.trackIds) entry.tracks.set(trackId, job.requiredTreatment);
  assignedByState.set(job.jurisdiction, entry);
}

const inScopeStates = partition
  ? PARTITIONS[partition].filter((st) => assignedByState.has(st))
  : [...assignedByState.keys()];

// --- collect this lane's output ----------------------------------------------

const packetDirAbs = path.join(rootDir, PACKET_DIR);
const packetFiles = fs.existsSync(packetDirAbs)
  ? fs.readdirSync(packetDirAbs).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  : [];

const seenTracks = new Map(); // trackId -> file that terminalized it

function walkStrings(value, at, visit) {
  if (typeof value === "string") return visit(value, at);
  if (Array.isArray(value)) return value.forEach((v, i) => walkStrings(v, `${at}[${i}]`, visit));
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) walkStrings(v, `${at}.${k}`, visit);
  }
}

/** en/es pair: both present, both non-empty, and not the same text. */
function checkBilingual(node, label) {
  if (node === null || node === undefined) return;
  const hasPair = typeof node === "object" && ("en" in node || "es" in node);
  if (!hasPair) return;
  const en = node.en;
  const es = node.es;
  const nonEmpty = (v) => (Array.isArray(v) ? v.length > 0 && v.every((s) => String(s).trim()) : String(v ?? "").trim().length > 0);
  check(nonEmpty(en), `${label}: English is missing or empty`);
  check(nonEmpty(es), `${label}: Spanish is missing or empty`);
  const flat = (v) => (Array.isArray(v) ? v.join(" ") : String(v ?? ""));
  if (nonEmpty(en) && nonEmpty(es)) {
    check(
      flat(en).trim().toLowerCase() !== flat(es).trim().toLowerCase(),
      `${label}: Spanish is a copy of the English, not a translation`
    );
    if (Array.isArray(en) && Array.isArray(es)) {
      check(en.length === es.length, `${label}: English has ${en.length} items but Spanish has ${es.length}`);
    }
  }
}

for (const file of packetFiles) {
  const rel = `${PACKET_DIR}/${file}`;
  let doc;
  try {
    doc = JSON.parse(read(rel));
  } catch (error) {
    failures.push(`${rel}: is not valid JSON — ${error.message}`);
    continue;
  }

  check(doc.schemaVersion === "rcap-guidance-packets/v1", `${rel}: schemaVersion must be rcap-guidance-packets/v1`);
  check(typeof doc.jurisdiction === "string" && doc.jurisdiction.length === 2, `${rel}: jurisdiction must be a two-letter code`);
  check(Array.isArray(doc.packets) && doc.packets.length > 0, `${rel}: packets[] must be a non-empty array`);
  if (!Array.isArray(doc.packets)) continue;

  const assigned = assignedByState.get(doc.jurisdiction);
  check(Boolean(assigned), `${rel}: ${doc.jurisdiction} has no lane-B assignment in the ledger`);

  for (const entry of doc.packets) {
    const label = `${rel}#${entry.trackId ?? "<no trackId>"}`;

    // The assignment governs: a packet may only terminalize an assigned track,
    // exactly once, with exactly the treatment the ledger requires.
    check(Boolean(entry.trackId), `${label}: trackId is required`);
    if (entry.trackId && assigned) {
      check(assigned.tracks.has(entry.trackId) || promotedGuidanceTracks.has(entry.trackId), `${label}: this track is not assigned to lane B for ${doc.jurisdiction}`);
      const requiredTreatment = assigned.tracks.get(entry.trackId);
      if (requiredTreatment) {
        check(
          entry.treatment === requiredTreatment,
          `${label}: treatment is "${entry.treatment}" but the ledger requires "${requiredTreatment}"`
        );
      }
      check(assigned.jobIds.has(entry.jobId), `${label}: jobId "${entry.jobId}" is not a lane-B job for ${doc.jurisdiction}`);
    }
    if (entry.trackId) {
      check(!seenTracks.has(entry.trackId), `${label}: track already terminalized in ${seenTracks.get(entry.trackId)}`);
      seenTracks.set(entry.trackId, rel);
    }

    check(
      ["complete_guidance", "deliberate_scope_exclusion", "exact_supported_deferral"].includes(entry.treatment),
      `${label}: treatment must be one of the three supported treatments`
    );

    // All eleven participant-treatment elements must be present. timing and
    // handoff may be an explicit null — an omitted key is not the same as a
    // considered "no timing rule applies".
    for (const element of REQUIRED_ELEMENTS) {
      const present = Object.prototype.hasOwnProperty.call(entry, element);
      check(present, `${label}: missing required participant element "${element}"`);
      if (present && !["timing", "handoff"].includes(element)) {
        check(entry[element] !== null, `${label}: "${element}" is required and may not be null`);
      }
    }

    // Bilingual completeness on every participant-facing pair.
    for (const key of [...REQUIRED_ELEMENTS, "routeLabel", "nextSteps"]) {
      if (entry[key]) checkBilingual(entry[key], `${label}.${key}`);
    }

    // The renderable list the Briefcase draws.
    const steps = entry.nextSteps;
    check(steps && Array.isArray(steps.en) && steps.en.length >= 3, `${label}: nextSteps.en needs at least 3 concrete actions`);
    check(steps && Array.isArray(steps.es) && steps.es.length >= 3, `${label}: nextSteps.es needs at least 3 concrete actions`);

    // An exact destination is what separates guidance from a referral.
    const destination = entry.destination;
    check(destination && String(destination.name ?? "").trim().length > 0, `${label}: destination.name must name an exact court, agency, prosecutor, clerk, program or resource`);
    check(
      destination && ["court", "agency", "prosecutor", "clerk", "program", "resource"].includes(destination.kind),
      `${label}: destination.kind must be one of the supported destination kinds`
    );

    // Committed authority must be cited.
    check(Array.isArray(entry.authority) && entry.authority.length > 0, `${label}: authority[] must cite the committed legal design`);
    for (const citation of entry.authority ?? []) {
      check(String(citation.citation ?? "").trim().length > 0, `${label}: an authority entry has no citation`);
      check(String(citation.sourceRef ?? "").trim().length > 0, `${label}: authority "${citation.citation}" has no sourceRef`);
    }

    // A guidance, exclusion or deferral route never opens payment and never
    // becomes sellable. This is the "no unsupported route becomes sellable" and
    // "no packet credit or payment is consumed" guarantee, asserted per entry.
    check(entry.paymentAllowed === false, `${label}: paymentAllowed must be false on a non-packet route`);
    check(entry.sellable === false, `${label}: sellable must be false on a non-packet route`);

    // Participant-facing language.
    walkStrings(entry, label, (text, at) => {
      if (at.endsWith(".sourceRef") || at.includes(".authority[")) return; // provenance, not participant copy
      if (at.endsWith(".trackId") || at.endsWith(".jobId") || at.endsWith(".treatment")) return;
      if (at.endsWith(".kind") || at.endsWith(".url")) return;
      const lower = text.toLowerCase();
      for (const phrase of PROHIBITED_PHRASES) {
        check(!lower.includes(phrase), `${at}: participant text contains internal vocabulary "${phrase}"`);
      }
      for (const promise of PROHIBITED_PROMISES) {
        check(!lower.includes(promise), `${at}: participant text makes a prohibited outcome promise "${promise}"`);
      }
      check(!BARE_REFERRAL.test(text), `${at}: a bare referral is not a treatment — "${text.slice(0, 60)}"`);
    });
  }
}

// --- coverage: every assigned track reaches exactly one treatment ------------

for (const st of inScopeStates) {
  const assigned = assignedByState.get(st);
  for (const [trackId, treatment] of assigned.tracks) {
    check(seenTracks.has(trackId), `${st}:${trackId} (${treatment}) is assigned to lane B but is not terminalized in any guidance packet`);
  }
}

// No packet may terminalize a track lane B was never assigned.
for (const [trackId, file] of seenTracks) {
  const assignedAnywhere = laneBJobs.some((j) => j.trackIds.includes(trackId)) || promotedGuidanceTracks.has(trackId);
  check(assignedAnywhere, `${file}: terminalizes "${trackId}", which is not assigned to lane B`);
}

// --- deferrals carry a stated condition --------------------------------------

const deferralDirAbs = path.join(rootDir, DEFERRAL_DIR);
const deferralFiles = fs.existsSync(deferralDirAbs)
  ? fs.readdirSync(deferralDirAbs).filter((f) => f.endsWith(".md"))
  : [];

const deferralTracks = [...assignedByState.entries()]
  .flatMap(([st, e]) => [...e.tracks].filter(([, t]) => t === "exact_supported_deferral").map(([trackId]) => ({ st, trackId })))
  .filter(({ st }) => inScopeStates.includes(st));

for (const { st, trackId } of deferralTracks) {
  const documented = deferralFiles.some((f) => {
    const body = read(`${DEFERRAL_DIR}/${f}`);
    return body.includes(trackId);
  });
  check(documented, `${st}:${trackId} is an exact_supported_deferral with no deferral statement under ${DEFERRAL_DIR}`);
}

for (const file of deferralFiles) {
  const body = read(`${DEFERRAL_DIR}/${file}`).toLowerCase();
  // A deferral doc is an internal record, so build vocabulary is allowed there;
  // what it must not do is be vague about what the participant is told.
  check(
    body.includes("what the participant is told") || body.includes("participant"),
    `${DEFERRAL_DIR}/${file}: a deferral must state what the participant is told`
  );
}

// --- report -------------------------------------------------------------------

const scope = partition ? `partition ${partition}` : "all lane-B states";
console.log(
  `guidance terminalization (${scope}): ${packetFiles.length} packet file(s), ` +
    `${seenTracks.size} track(s) terminalized, ${deferralFiles.length} deferral statement(s), ${checks} assertions.`
);

if (failures.length > 0) {
  console.error(`\nverify-rcap-guidance-terminalization FAILED — ${failures.length} problem(s):\n`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("Every assigned track reaches exactly one complete, bilingual, non-sellable treatment.");
