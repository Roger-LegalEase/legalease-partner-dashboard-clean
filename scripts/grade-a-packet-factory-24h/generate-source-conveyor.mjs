#!/usr/bin/env node
/**
 * The source conveyor, its acquisition manifest, and the integration clock.
 *
 *   node scripts/grade-a-packet-factory-24h/generate-source-conveyor.mjs [--check]
 *
 * The binding constraint on this factory is not worker capacity. It is source
 * identity: 47 families of 346 hold their bytes and 256 do not. So the conveyor
 * gets sixteen lanes and the builders wait on it, rather than the other way
 * round.
 *
 * Sixteen lanes, four operations:
 *
 *   DISC01-06  a label becomes a document identity, with an exact official URL.
 *              Six lanes because this is where the queue actually is.
 *   SRC01-04   a named form or pinned hash is reconciled against bytes already
 *              held. These four keep the identifiers they have always had.
 *   ACQ01-03   an exact URL becomes bytes, a hash and a receipt, through the
 *              batch workflow. Bounded by a workflow run, so three suffice.
 *   PROMO01-03 a receipt becomes custody, and custody releases a family.
 *
 * The operations are a pipeline but never a queue: DISC hands a URL to ACQ the
 * moment it has one, SRC binds a held byte without waiting for any acquisition,
 * and PROMO releases a family the moment its last source binds.
 *
 * The manifest is built only from official URLs this repository already
 * records. An obligation without one is not a manifest gap to be filled with a
 * guessed address; it is DISC work, and it says so.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const DIR = "data/rcap-grade-a/packet-factory-24h";
const PROMPTS = "docs/rcap/grade-a/packet-factory-24h";
const MASTER = `${DIR}/MASTER_QUEUE.json`;
const ACTIVE = `${DIR}/ACTIVE_ASSIGNMENTS.json`;
const CONVEYOR = `${DIR}/SOURCE_CONVEYOR_ASSIGNMENTS.json`;
const MANIFEST = `${DIR}/SOURCE_ACQUISITION_MANIFEST.json`;
const CI_STATE = `${DIR}/CONTINUOUS_INTEGRATION_STATE.json`;
const ACQUIRE_SCRIPT = "scripts/rcap-acquire-official-source.mjs";
const BATCH_WORKFLOW = ".github/workflows/rcap-official-source-acquisition-batch.yml";
const RECEIPT_SOURCES = [
  "data/rcap-grade-a/source-acquisition/wave-1/acquired.json",
  "data/rcap-grade-a/source-acquisition/wave-2/acquired.json"
];

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

const master = read(MASTER);
const active = read(ACTIVE);
const familyById = new Map(master.families.map((f) => [f.familyId, f]));

/* The host allowlist has one authority: the acquisition script. Read it from
 * there rather than restating it, so a second list cannot drift from the first. */
const acquireText = fs.readFileSync(path.join(ROOT, ACQUIRE_SCRIPT), "utf8");
const allowBlock = /const ALLOWED_HOST_SUFFIXES = \[([\s\S]*?)\];/.exec(acquireText);
const refuseBlock = /const REFUSED_HOSTS = new Set\(\[([\s\S]*?)\]\);/.exec(acquireText);
const exactBlock = /const ALLOWED_EXACT_HOSTS = new Map\(\[([\s\S]*?)\n\]\);/.exec(acquireText);
if (!allowBlock || !refuseBlock || !exactBlock) { console.error("cannot read the host policy from the acquisition script"); process.exit(1); }
const ALLOWED_HOST_SUFFIXES = [...allowBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const REFUSED_HOSTS = new Set([...refuseBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
/* Exact hostnames, allowed one at a time. Read from the same authority, and
 * deliberately kept apart from the suffix list: the Illinois judiciary's
 * storage host is one hostname, and its parent suffix belongs to every tenant
 * of that service. */
const ALLOWED_EXACT_HOSTS = new Set([...exactBlock[1].matchAll(/\["([^"]+)", \{/g)].map((m) => m[1]));
const hostAllowed = (host) => ALLOWED_EXACT_HOSTS.has(host)
  || ALLOWED_HOST_SUFFIXES.some((s) => host === s.replace(/^\./, "") || host.endsWith(s));

/* ---- the sixteen lanes, read from the dispatch that owns them -------------- */
const OPERATIONS = [
  {
    prefix: "DISC", lanes: 6, operation: "exact-source-identity",
    never: ["download", "promote", "commit a source body"],
    mustRecord: [
      "official publisher", "exact title", "form number", "revision",
      "official URL", "jurisdiction", "intended packet role",
      "statewide or local"
    ],
    handOff: "ACQ, the moment an exact official URL is known — never at the end of the lane",
    refusals: [
      "A source identity without an exact official URL is not settled. Record it STOPPED naming the office that publishes it.",
      "NEVER guess a form number, a revision or a URL. A plausible address is worse than an absent one because ACQ will fetch it."
    ]
  },
  {
    prefix: "SRC", lanes: 4, operation: "held-inventory-reconciliation",
    never: ["fetch", "promote without a hash match", "commit a source body"],
    mustRecord: ["custody path", "SHA-256", "byte size", "MIME", "page count", "technology"],
    handOff: "PROMO where the byte is held and binds; DISC where the identity itself is wrong",
    refusals: [
      "A form the corpus already carries needs no acquisition. Bind it and say so.",
      "A named form number that is not in the corpus is a DISC or ACQ obligation, never a bind."
    ]
  },
  {
    prefix: "ACQ", lanes: 3, operation: "official-acquisition",
    never: ["accept a URL DISC has not settled", "download from an unapproved host", "commit a source body"],
    mustRecord: ["SHA-256", "MIME", "page count", "technology (acroform, xfa, flat)", "byte size", "artifact name"],
    handOff: "PROMO, on the uploaded artifact and its receipt",
    refusals: [
      "Consume only exact official URLs supplied by DISC. A URL you composed yourself is refused.",
      `Download only from an approved official government host: ${ALLOWED_HOST_SUFFIXES.join(", ")}. An unofficial mirror is refused even when the official host is slow.`,
      "The body leaves as a workflow artifact. Nothing is committed."
    ]
  },
  {
    prefix: "PROMO", lanes: 3, operation: "promotion-and-release",
    never: ["build a packet", "promote without comparing SHA-256", "release a family whose last source did not bind"],
    mustRecord: ["receipt verified", "SHA-256 compared", "custody record", "inventory entry", "families released"],
    handOff: "Captain, who assigns every released family to an available builder immediately",
    refusals: [
      "Bytes treated as promoted without a SHA-256 comparison are refused. A promotion is a release, and a released family goes to a builder that will open the file.",
      "A SHA mismatch is a refusal, never a warning.",
      "Update the source inventory through the existing authority. Do not write a parallel register."
    ]
  }
];

const laneRows = new Map();
for (const x of active.assignments) {
  if (x.itemKind !== "sourceObligation") continue;
  laneRows.set(x.assignmentId, x);
}

const conveyorLanes = [];
for (const op of OPERATIONS) {
  for (let i = 1; i <= op.lanes; i += 1) {
    const id = `${op.prefix}${String(i).padStart(2, "0")}`;
    const dispatched = laneRows.get(id);
    if (!dispatched) { console.error(`lane ${id} is described here and not dispatched in ${ACTIVE}`); process.exit(1); }
    conveyorLanes.push({
      assignmentId: id,
      operation: op.operation,
      status: dispatched.itemCount > 0 ? "ACTIVE" : "QUEUED_EMPTY",
      obligations: dispatched.itemCount,
      familiesReleasedByThisLane: dispatched.familiesUnblockedCount ?? 0,
      familiesAdvancedButNotReleasedHere: (dispatched.familiesAdvancedButNotReleasedHere ?? []).length,
      issuingHosts: dispatched.issuingHosts ?? [],
      mustRecord: op.mustRecord,
      never: op.never,
      handOff: op.handOff,
      refusals: op.refusals,
      continueAfterFailure: "An obligation that cannot be settled is one STOPPED row naming exactly what is missing. The lane continues to the next obligation. One failure never stops a lane.",
      ownedPaths: dispatched.ownedPaths,
      prohibitedPaths: dispatched.prohibitedPaths,
      promptFile: dispatched.promptFile
    });
  }
}

/* ---- the acquisition manifest, from URLs this repository already records --- */
const urlRecords = [];
for (const rel of RECEIPT_SOURCES) {
  if (!fs.existsSync(path.join(ROOT, rel))) continue;
  const doc = read(rel);
  for (const r of doc.records ?? []) {
    if (!r.officialUrl) continue;
    urlRecords.push({
      officialUrl: r.officialUrl,
      jurisdiction: r.jurisdiction ?? ((r.obligationKeys?.[0]?.match(/^([a-z]{2})[-_]/)?.[1] ?? "").toUpperCase() || null),
      sourceId: r.documentReceiptId ?? r.formNumber ?? r.officialTitle ?? null,
      formNumber: r.formNumber ?? null,
      officialTitle: r.officialTitle ?? null,
      issuingAuthority: r.issuingAuthority ?? null,
      urlKind: r.officialUrlKind ?? "UNSTATED",
      expectedSha256: /^[0-9a-f]{64}$/.test(String(r.sha256 ?? "")) ? r.sha256 : null,
      obligationKeys: r.obligationKeys ?? [],
      recordedIn: rel
    });
  }
}

/*
 * Official URLs already corroborated in committed evidence.
 *
 * The manifest was built only from the two acquisition-receipt files, so a URL
 * this repository has recorded elsewhere — in a treatment, an evidence brief, a
 * composed route — was invisible to it. The single highest-leverage blocked
 * document, the Texas statement of inability that gates ten families, has an
 * exact txcourts.gov address repeated across dozens of committed records and
 * was not queued for acquisition at all.
 *
 * CORROBORATION IS THE GATE. A URL in one file is a guess with a filename:
 * Illinois has two candidate addresses that appear only in a record whose own
 * name says candidate, with no expected hash and nothing else agreeing. So a
 * URL enters the manifest from evidence only when at least two DISTINCT
 * committed files carry it, and candidate records are excluded from the count
 * rather than merely noted.
 */
const EVIDENCE_ROOTS = ["data/rcap-all50", "data/rcap-grade-a", "data/record-clearing"];
const CANDIDATE_MARKER = /route-obligation-census-candidate|-candidate\.json$|\/candidate/i;
const URL_RE = /https:\/\/[^\s"'\\)]+\.pdf/gi;

function corroboratedUrls() {
  const seen = new Map();
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) { walk(rel); continue; }
      if (!e.name.endsWith(".json")) continue;
      let body = null;
      try { body = fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { continue; }
      const isCandidate = CANDIDATE_MARKER.test(rel);
      for (const m of body.matchAll(URL_RE)) {
        const url = m[0].replace(/[.,;]+$/, "");
        if (!seen.has(url)) seen.set(url, { url, files: new Set(), candidateOnlyFiles: new Set() });
        (isCandidate ? seen.get(url).candidateOnlyFiles : seen.get(url).files).add(rel);
      }
    }
  };
  for (const r of EVIDENCE_ROOTS) walk(r);
  return [...seen.values()].map((x) => ({
    url: x.url,
    corroboratingFiles: [...x.files].sort(),
    candidateOnlyFiles: [...x.candidateOnlyFiles].sort(),
    corroboration: x.files.size
  }));
}

const evidenceUrls = corroboratedUrls();
const CORROBORATION_THRESHOLD = 2;

const manifestEntries = [];
const manifestRefused = [];
const seenUrl = new Set();
const seenSourceId = new Set();
for (const r of urlRecords) {
  const refuse = (reason) => manifestRefused.push({ officialUrl: r.officialUrl, sourceId: r.sourceId, reason, recordedIn: r.recordedIn });
  let parsed = null;
  try { parsed = new URL(r.officialUrl); } catch { refuse("not a parsable URL"); continue; }
  if (parsed.protocol !== "https:") { refuse("not HTTPS"); continue; }
  const host = parsed.hostname.toLowerCase();
  if (REFUSED_HOSTS.has(host)) { refuse(`${host} is a commercial form site, not the issuing body`); continue; }
  if (!hostAllowed(host)) { refuse(`${host} is not an allowlisted official government host`); continue; }
  if (!r.jurisdiction) { refuse("no jurisdiction"); continue; }
  if (!r.sourceId) { refuse("no source identity"); continue; }
  if (!r.formNumber && !r.officialTitle) { refuse("neither a form number nor an official title"); continue; }
  if (seenUrl.has(r.officialUrl)) { refuse("duplicate URL"); continue; }
  if (seenSourceId.has(r.sourceId)) { refuse("duplicate source id"); continue; }
  if (ALLOWED_EXACT_HOSTS.has(host) && !r.expectedSha256) {
    refuse(`${host} is allowed as an exact hostname only with an expected SHA-256; the address alone does not identify the document`);
    continue;
  }
  seenUrl.add(r.officialUrl);
  seenSourceId.add(r.sourceId);
  manifestEntries.push({
    sourceId: r.sourceId,
    jurisdiction: r.jurisdiction,
    formNumber: r.formNumber ?? r.officialTitle,
    officialTitle: r.officialTitle,
    issuingAuthority: r.issuingAuthority,
    officialUrl: r.officialUrl,
    urlKind: r.urlKind,
    expectedSha256: r.expectedSha256,
    host,
    commitBody: false,
    obligationKeys: r.obligationKeys,
    recordedIn: r.recordedIn
  });
}
manifestEntries.sort((a, b) => a.sourceId.localeCompare(b.sourceId));

/* An obligation with no recorded URL is DISC work, not a manifest hole. */
const totalObligations = conveyorLanes.reduce((n, l) => n + l.obligations, 0);
const obligationsWithRecordedUrl = new Set(manifestEntries.flatMap((e) => e.obligationKeys)).size;

const manifest = {
  schemaVersion: "rcap-source-acquisition-manifest/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-source-conveyor.mjs",
  what: "Every exact official URL this repository already records, as one batch acquisition job each.",
  whatItIsNot: "It is not the whole source backlog. An obligation with no recorded official URL is DISC work; putting a guessed address here would send ACQ to fetch it.",
  consumedBy: BATCH_WORKFLOW,
  hostAllowlistAuthority: ACQUIRE_SCRIPT,
  allowedHostSuffixes: ALLOWED_HOST_SUFFIXES,
  allowedExactHosts: [...ALLOWED_EXACT_HOSTS].sort(),
  exactHostRule: "An exact host is matched by full equality and never by suffix. ilcourtsaudio.blob.core.windows.net is allowed; *.blob.core.windows.net is not, because that suffix belongs to every tenant of the service. An entry on this list requires official judiciary provenance, is restricted to its own jurisdiction, and requires an exact SHA-256 at dispatch.",
  refusedHosts: [...REFUSED_HOSTS].sort(),
  rules: [
    "HTTPS only.",
    "An approved official government host only.",
    "A jurisdiction on every entry.",
    "A form number or an official title on every entry.",
    "One URL once. One source id once.",
    "No entry may request that a source body be committed."
  ],
  maxParallel: 20,
  bodiesCommitted: 0,
  evidenceSweep: {
    rule: `A URL enters from committed evidence only when at least ${CORROBORATION_THRESHOLD} distinct non-candidate files carry it. One file is a guess with a filename.`,
    roots: EVIDENCE_ROOTS,
    distinctUrlsSeen: evidenceUrls.length,
    corroborated: evidenceUrls.filter((u) => u.corroboration >= CORROBORATION_THRESHOLD).length,
    candidateOnly: evidenceUrls.filter((u) => u.corroboration < CORROBORATION_THRESHOLD && u.candidateOnlyFiles.length > 0).length,
    topCorroborated: evidenceUrls.filter((u) => u.corroboration >= CORROBORATION_THRESHOLD)
      .sort((a, b) => b.corroboration - a.corroboration).slice(0, 10)
      .map((u) => ({ url: u.url, corroboration: u.corroboration, alreadyInManifest: manifestEntries.some((e) => e.officialUrl === u.url) })),
    whyThisExists: "The Texas statement of inability gates ten families, has an exact txcourts.gov address in dozens of committed records, and was never queued because the manifest read only the two acquisition-receipt files."
  },
  counts: {
    entries: manifestEntries.length,
    refused: manifestRefused.length,
    urlRecordsRead: urlRecords.length,
    sourceObligationsTotal: totalObligations,
    obligationsCoveredByARecordedUrl: obligationsWithRecordedUrl,
    obligationsNeedingDiscoveryFirst: totalObligations - obligationsWithRecordedUrl
  },
  entries: manifestEntries,
  refused: manifestRefused
};

/* ---- the integration clock ------------------------------------------------ */
const now = new Date();
const plus = (m) => new Date(now.getTime() + m * 60000).toISOString();
const byState = master.byState ?? {};
const countIn = (s) => master.families.filter((f) => f.state === s).length;
const sourceReady = countIn("SOURCE_READY");
const verifyPending = countIn("VERIFY_PENDING") + countIn("VERIFYING");
const repairRequired = countIn("REPAIR_REQUIRED");

const ELASTIC = [
  { when: "VERIFY_PENDING > 20", creates: ["VF09", "VF10", "VF11", "VF12"], measured: verifyPending, threshold: 20, triggered: verifyPending > 20 },
  { when: "FAIL_REPAIR_REQUIRED > 20", creates: ["FIX05", "FIX06", "FIX07", "FIX08"], measured: repairRequired, threshold: 20, triggered: repairRequired > 20 },
  { when: "SOURCE_READY > 80", creates: ["PF17", "PF18", "PF19", "PF20", "PF21", "PF22", "PF23", "PF24"], measured: sourceReady, threshold: 80, triggered: sourceReady > 80 }
];

const ciState = {
  schemaVersion: "rcap-continuous-integration-state/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-source-conveyor.mjs",
  generatedAt: now.toISOString(),
  captainHead: git(["rev-parse", "HEAD"]),
  cadence: {
    integrateEvery: "three completed worker returns, or twenty minutes, whichever comes first",
    releaseIntoBuildersEvery: "five families released by PROMO, or thirty minutes, whichever comes first",
    nextIntegrationDeadline: plus(20),
    nextSourceReleaseDeadline: plus(30),
    everyCheckpointMust: [
      "inspect the exact changed paths of each return",
      "integrate the returns that touch only their own owned paths",
      "regenerate the live queue",
      "assign every newly source-ready family",
      "send every newly completed family straight to independent verification",
      "send every verification failure straight to repair",
      "release the lane's ownership the moment its return is integrated"
    ],
    everyCheckpointMustNot: [
      "wait for a source lane to finish its whole assignment",
      "wait for a wave",
      "write a broad narrative memo"
    ]
  },
  elasticCapacity: {
    rule: "No executable work may remain while an eligible lane is unassigned.",
    thresholds: ELASTIC,
    builderExpansionRule: "Assign a released family to an existing builder where ownership permits. Create PF17+ only when SOURCE_READY exceeds the capacity of the existing sixteen."
  },
  claimAndCollision: {
    oneOwnerPerFamily: "A family has one current owner. A second claim is refused, not queued.",
    oneWriterPerSharedHost: "A shared build host has one writer. Its importers read it and do not edit it.",
    verifierClaimRule: "A verifier claims only unclaimed families it neither built nor repaired.",
    repairerMayNotVerifyItself: "A repair worker may not independently verify its own output. The reverification goes to a third party.",
    ownershipReleasedOnIntegration: "A completed lane releases ownership immediately on integration, so its families are assignable in the same checkpoint."
  },
  liveCounts: {
    liveFamilyDenominator: master.families.length,
    sourceReady,
    sourceBlocked: countIn("SOURCE_BLOCKED"),
    legalBlocked: countIn("LEGAL_BLOCKED"),
    verifyPending,
    repairRequired,
    byState
  },
  commercialRoutesOpened: 0,
  productionTouched: false,
  grantsNothing: "An integration cadence integrates. It approves no packet, promotes no route and opens nothing."
};

const conveyor = {
  schemaVersion: "rcap-source-conveyor/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-source-conveyor.mjs",
  question: "What actually stands between 47 buildable families and 346?",
  answer: `Source identity. ${totalObligations} obligations across ${countIn("SOURCE_BLOCKED")} families, and ${totalObligations - obligationsWithRecordedUrl} of them do not yet have an official URL to fetch.`,
  captainHead: ciState.captainHead,
  preservedFactoryLanes: {
    rule: "The thirty-two packet lanes are preserved. Nothing here rewrites PF01-PF16, FIX01-FIX04 or VF01-VF08, and SRC01-SRC04 keep their identifiers and take the reconciliation operation.",
    packetBuild: active.assignments.filter((x) => x.lane === "packet-build").map((x) => x.assignmentId),
    rapidRepair: active.assignments.filter((x) => x.lane === "rapid-repair").map((x) => x.assignmentId),
    independentVerification: active.assignments.filter((x) => x.lane === "independent-verification").map((x) => x.assignmentId),
    heldInventoryReconciliation: conveyorLanes.filter((l) => l.assignmentId.startsWith("SRC")).map((l) => l.assignmentId)
  },
  operations: OPERATIONS.map((o) => ({ prefix: o.prefix, lanes: o.lanes, operation: o.operation, never: o.never, handOff: o.handOff })),
  lanes: conveyorLanes,
  totals: {
    sourceLanes: conveyorLanes.length,
    disc: conveyorLanes.filter((l) => l.assignmentId.startsWith("DISC")).length,
    src: conveyorLanes.filter((l) => l.assignmentId.startsWith("SRC")).length,
    acq: conveyorLanes.filter((l) => l.assignmentId.startsWith("ACQ")).length,
    promo: conveyorLanes.filter((l) => l.assignmentId.startsWith("PROMO")).length,
    obligations: totalObligations,
    familiesReleased: conveyorLanes.reduce((n, l) => n + l.familiesReleasedByThisLane, 0),
    manifestEntries: manifestEntries.length
  },
  batchWorkflow: BATCH_WORKFLOW,
  manifest: MANIFEST,
  integrationState: CI_STATE,
  commercialRoutesOpened: 0,
  productionTouched: false,
  grantsNothing: "A promoted source is a held byte with a custody record. It builds no packet, proves no packet complete and opens no commercial route."
};

/* ---- refusals ------------------------------------------------------------- */
const problems = [];
if (conveyorLanes.length !== 16) problems.push(`${conveyorLanes.length} source lanes, expected 16`);
if (conveyor.totals.disc !== 6) problems.push(`${conveyor.totals.disc} DISC lanes, expected 6`);
if (conveyor.totals.src !== 4) problems.push(`${conveyor.totals.src} SRC lanes, expected 4`);
if (conveyor.totals.acq !== 3) problems.push(`${conveyor.totals.acq} ACQ lanes, expected 3`);
if (conveyor.totals.promo !== 3) problems.push(`${conveyor.totals.promo} PROMO lanes, expected 3`);
if (manifestEntries.some((e) => e.commitBody !== false)) problems.push("a manifest entry asks for a source body to be committed");
if (JSON.stringify(conveyor).includes("__") || JSON.stringify(manifest).includes("TODO")) problems.push("a placeholder survived into an output");
for (const l of conveyorLanes) if (!fs.existsSync(path.join(ROOT, l.promptFile))) problems.push(`${l.assignmentId} has no prompt at ${l.promptFile}`);
if (problems.length) {
  console.error(`source conveyor: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (CHECK) {
  console.log(`source conveyor current: ${conveyorLanes.length} lanes (${conveyor.totals.disc} DISC, ${conveyor.totals.src} SRC, ${conveyor.totals.acq} ACQ, ${conveyor.totals.promo} PROMO), ${totalObligations} obligations, ${manifestEntries.length} manifest entr(ies).`);
  process.exit(0);
}

fs.writeFileSync(path.join(ROOT, CONVEYOR), `${JSON.stringify(conveyor, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, CI_STATE), `${JSON.stringify(ciState, null, 2)}\n`);

console.log(`Wrote ${CONVEYOR}`);
console.log(`Wrote ${MANIFEST}`);
console.log(`Wrote ${CI_STATE}`);
console.log("");
console.log(`  16 source lanes: 6 DISC · 4 SRC · 3 ACQ · 3 PROMO`);
console.log(`  ${totalObligations} obligations · ${manifestEntries.length} ready to acquire · ${manifest.counts.obligationsNeedingDiscoveryFirst} need discovery first · ${manifestRefused.length} URL(s) refused`);
console.log(`  next integration ${ciState.cadence.nextIntegrationDeadline} · next source release ${ciState.cadence.nextSourceReleaseDeadline}`);
