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
import { makeEmitter } from "../lib/generator-emit.mjs";
import { hostAllowed, ALLOWED_HOST_SUFFIXES, ALLOWED_EXACT_HOSTS, REFUSED_HOSTS } from "../lib/official-host-policy.mjs";

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
/*
 * DISC-settled acquisition candidates handed to the ACQ lanes. Each candidate
 * carries an exact official URL a DISC or SRC lane settled from committed
 * records — never a guessed address — and the conveyor's own contract says the
 * hand-off to ACQ happens the moment the URL is known. Reading only the two
 * receipt files meant every one of these settled URLs (eighteen txcourts.gov
 * nondisclosure forms among them) sat outside the manifest indefinitely.
 *
 * Admission is corroboration-gated: a candidate URL enters only when at least
 * CORROBORATION_THRESHOLD distinct non-candidate committed files also carry it,
 * because the handoff files themselves match the candidate marker and never
 * count toward their own admission.
 */
const HANDOFF_CANDIDATE_SOURCES = [
  "data/rcap-grade-a/source-acquisition/packet-factory-24h/acq01/handoff-candidates.json",
  "data/rcap-grade-a/source-acquisition/packet-factory-24h/acq02/handoff-candidates.json",
  "data/rcap-grade-a/source-acquisition/packet-factory-24h/acq03/handoff-candidates.json"
];

/*
 * Manifest entries a lane established by reading the document, not by counting
 * files.
 *
 * The evidence sweep admits a URL when two committed files carry it, which is
 * the right bar for an address inferred from the repository's own records. It
 * is the wrong bar for an address a lane settled by opening the document at it
 * and reading the form number off the face: that is stronger evidence than any
 * number of files repeating a guess, and it is routinely carried by one file or
 * none.
 *
 * ACQ established five such addresses, wrote them into the manifest, and the
 * next chain run erased all five -- because the manifest is regenerated from
 * scratch and nothing regenerated them. So they are read from the lane's own
 * committed return, which is durable, and the manifest becomes a function of
 * the return rather than a place work is stored.
 *
 * The admission rule is narrow: `exactBinaryUrlEstablished` true, a `sourceId`,
 * an `officialUrl`, and at least one obligation key. Everything after that --
 * HTTPS, host policy, jurisdiction, duplicate URL, duplicate source id -- is
 * the same gate every other entry passes through, unchanged.
 */
const LANE_ESTABLISHED_ENTRY_RETURNS = [
  "data/rcap-grade-a/fable-packet-factory/returns/FABLE_ACQ_SOURCE_ADDRESSES.json"
];

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

const master = read(MASTER);
const active = read(ACTIVE);
const familyById = new Map(master.families.map((f) => [f.familyId, f]));

/* The host allowlist has one authority: the acquisition script. Read it from
 * there rather than restating it, so a second list cannot drift from the first. */
const acquireText = fs.readFileSync(path.join(ROOT, ACQUIRE_SCRIPT), "utf8");
/* One host policy, imported. This file used to re-derive it by regex over the
 * acquisition script's own source text -- a third copy that could silently
 * disagree with the other two. C13 found `.us`, an open-registration TLD, on
 * the suffix list; a policy expressed three times is a policy corrected once.
 */
const ALLOWED_EXACT_HOST_NAMES = new Set(ALLOWED_EXACT_HOSTS.keys());

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
      `Download only from an approved official government host: ${[...ALLOWED_HOST_SUFFIXES, "state.<code>.us"].join(", ")}. An unofficial mirror is refused even when the official host is slow.`,
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

/* ---- addresses a lane established by reading the document ----------------- */
const laneEstablished = new Map();
const supersededSourceIds = new Map();
for (const rel of LANE_ESTABLISHED_ENTRY_RETURNS) {
  if (!fs.existsSync(path.join(ROOT, rel))) continue;
  const doc = read(rel);
  for (const e of doc.manifestEntriesAdded?.entries ?? []) {
    if (e.exactBinaryUrlEstablished !== true) continue;
    if (!e.sourceId || !e.officialUrl) continue;
    if (!(e.obligationKeys ?? []).length) continue;
    laneEstablished.set(e.officialUrl, { ...e, recordedIn: e.recordedIn ?? rel });
    /*
     * Repointing, not adding. An acquisition receipt can record a landing page
     * that never yielded the binary -- Michigan's MC 227 is queued at the SCAO
     * forms index, and the hosted fetch failed there. A lane that later finds
     * the direct binary must REPLACE that entry: adding a second one leaves the
     * broken address live and trips the duplicate-source-id refusal, and
     * editing the receipt file would falsify a record of what was fetched. So
     * the entry declares what it supersedes and the receipt-derived record is
     * dropped here, with the supersession carried onto the surviving entry.
     */
    if (e.supersedesSourceId) supersededSourceIds.set(e.supersedesSourceId, e.officialUrl);
    urlRecords.push({
      officialUrl: e.officialUrl,
      jurisdiction: e.jurisdiction ?? null,
      sourceId: e.sourceId,
      formNumber: e.formNumber ?? null,
      officialTitle: e.officialTitle ?? null,
      issuingAuthority: e.issuingAuthority ?? null,
      urlKind: e.urlKind ?? "UNSTATED",
      expectedSha256: /^[0-9a-f]{64}$/.test(String(e.expectedSha256 ?? "")) ? e.expectedSha256 : null,
      obligationKeys: e.obligationKeys,
      recordedIn: e.recordedIn ?? rel,
      /* Read from the document, so the file-count bar does not apply. */
      establishedByDocumentRead: true
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

/*
 * This sweep reads data/rcap-grade-a and writes into data/rcap-grade-a, so
 * without this exclusion it corroborates itself: a URL recorded in one real
 * evidence file and then echoed into this generator's own manifest counts as
 * two distinct files and crosses the threshold on the strength of its own
 * record. The `refused` array made it worse, because a URL rejected FOR HAVING
 * ONE SOURCE was promoted by the record of its own rejection.
 *
 * The same defect was found and fixed in generate-url-promotion-candidates.mjs.
 * It was still live here, and the corroboration counts drifted upward on every
 * run -- 193 committed, 205 on the next run -- which is what a measurement
 * reading its own echo looks like. Generator convergence is what found it.
 */
const SELF_WRITTEN = [
  "SOURCE_URL_PROMOTION_CANDIDATES.json", "SOURCE_IDENTITY_FINDINGS.json",
  "SOURCE_ACQUISITION_MANIFEST.json", "SOURCE_CONVEYOR_ASSIGNMENTS.json", "STALE_LANE_RETURNS.json"
];
const isSelfWritten = (rel) => SELF_WRITTEN.some((n) => rel.endsWith(`/${n}`));

function corroboratedUrls() {
  const seen = new Map();
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) { walk(rel); continue; }
      if (!e.name.endsWith(".json")) continue;
      if (isSelfWritten(rel)) continue;
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

/* ---- DISC-settled candidates, admitted under the corroboration gate -------- */
const evidenceByUrl = new Map(evidenceUrls.map((u) => [u.url, u]));
const slugPart = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
const candidateRowsByUrl = new Map();
for (const rel of HANDOFF_CANDIDATE_SOURCES) {
  if (!fs.existsSync(path.join(ROOT, rel))) continue;
  const doc = read(rel);
  for (const c of doc.candidates ?? []) {
    if (!c.officialUrl) continue;
    if (!candidateRowsByUrl.has(c.officialUrl)) candidateRowsByUrl.set(c.officialUrl, { rows: [], recordedIn: new Set() });
    const g = candidateRowsByUrl.get(c.officialUrl);
    g.rows.push(c);
    g.recordedIn.add(rel);
  }
}
/*
 * A held-edition hash that two DIFFERENT URLs both claim is a set-level pin —
 * the hash of the held bundle, not of either document behind either address.
 * Pinning it onto a URL manufactures a guaranteed mismatch (the Florida landing
 * pages already demonstrated what a wrong pin does to a batch). Only a hash
 * unique to exactly one URL is carried as that URL's expected hash; the rest
 * enter unpinned and the acquired bytes' own hash is authoritative.
 */
const candidateShaClaims = new Map();
for (const [url, g] of candidateRowsByUrl) {
  for (const sha of new Set(g.rows.map((r) => r.expectedSha256).filter((s) => /^[0-9a-f]{64}$/.test(String(s ?? ""))))) {
    if (!candidateShaClaims.has(sha)) candidateShaClaims.set(sha, new Set());
    candidateShaClaims.get(sha).add(url);
  }
}
const CANDIDATE_URL_KIND = {
  official_artifact_url: "DIRECT_OFFICIAL_BINARY",
  containing_bundle_url: "CONTAINING_BUNDLE_URL",
  official_landing_page: "OFFICIAL_LANDING_PAGE"
};
const seenReceiptUrls = new Set(urlRecords.map((r) => r.officialUrl));
for (const [url, g] of [...candidateRowsByUrl.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  if (seenReceiptUrls.has(url)) continue; // already carried by an acquisition receipt; the receipt record wins
  const first = g.rows[0];
  const evidence = evidenceByUrl.get(url);
  const corroboration = evidence?.corroboration ?? 0;
  const distinctShas = [...new Set(g.rows.map((r) => r.expectedSha256).filter((s) => /^[0-9a-f]{64}$/.test(String(s ?? ""))))];
  const pin = distinctShas.length === 1 && (candidateShaClaims.get(distinctShas[0])?.size ?? 0) === 1 ? distinctShas[0] : null;
  let stem = "";
  try { stem = path.basename(new URL(url).pathname).replace(/\.[a-z0-9]+$/i, ""); } catch { /* refused below as unparsable */ }
  urlRecords.push({
    officialUrl: url,
    jurisdiction: first.jurisdiction ?? null,
    sourceId: `${slugPart(first.formNumber)}-${slugPart(decodeURIComponent(stem))}`.slice(0, 70).replace(/-+$/, ""),
    formNumber: first.formNumber ?? null,
    officialTitle: String(first.sourceId ?? "").replace(/^official-form:/, "") || null,
    issuingAuthority: first.issuingAuthority ?? null,
    urlKind: CANDIDATE_URL_KIND[first.urlKind] ?? "UNSTATED",
    expectedSha256: pin,
    expectedSha256Note: pin ? null : (distinctShas.length > 0
      ? `held-edition hash(es) ${distinctShas.map((s) => s.slice(0, 12)).join(", ")} are set-level pins claimed by more than one URL; unpinned here, the acquired bytes' own hash is authoritative and PROMO recomputes`
      : null),
    obligationKeys: [...new Set(g.rows.map((r) => r.itemId).filter(Boolean))].sort(),
    recordedIn: [...g.recordedIn].sort().join(", "),
    corroboration: { nonCandidateFiles: corroboration, examples: (evidence?.corroboratingFiles ?? []).slice(0, 3) },
    corroborationFailure: corroboration < CORROBORATION_THRESHOLD
      ? `corroborated by ${corroboration} distinct non-candidate committed file(s); the threshold is ${CORROBORATION_THRESHOLD} and a candidate file never counts toward its own admission`
      : null
  });
}

/* A record a lane-established entry supersedes never reaches the manifest. */
const supersededRecords = [];
for (let i = urlRecords.length - 1; i >= 0; i--) {
  const replacedBy = supersededSourceIds.get(urlRecords[i].sourceId);
  if (!replacedBy || urlRecords[i].officialUrl === replacedBy) continue;
  supersededRecords.push({ sourceId: urlRecords[i].sourceId, officialUrl: urlRecords[i].officialUrl, replacedBy, recordedIn: urlRecords[i].recordedIn });
  urlRecords.splice(i, 1);
}

const manifestEntries = [];
const manifestRefused = [];
const seenUrl = new Set();
const seenSourceId = new Set();
for (const r of urlRecords) {
  const refuse = (reason) => manifestRefused.push({ officialUrl: r.officialUrl, sourceId: r.sourceId, reason, recordedIn: r.recordedIn });
  if (r.corroborationFailure) { refuse(r.corroborationFailure); continue; }
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
  if (ALLOWED_EXACT_HOST_NAMES.has(host) && !r.expectedSha256) {
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
    recordedIn: r.recordedIn,
    ...(r.expectedSha256Note ? { expectedSha256Note: r.expectedSha256Note } : {}),
    ...(r.corroboration ? { corroboration: r.corroboration } : {}),
    /*
     * A lane that established the address by reading the document wrote the
     * grounds down with it -- the printed edition, the statute, why one binary
     * answers two labels, and exactly what it did and did not exercise. Carrying
     * only the URL forward would strip the reviewable part and leave an address
     * that looks guessed.
     */
    ...(laneEstablished.has(r.officialUrl)
      ? (({ sourceId, jurisdiction, formNumber, officialTitle, issuingAuthority, officialUrl,
            urlKind, expectedSha256, host, commitBody, obligationKeys, recordedIn, ...rest }) => rest)(
          laneEstablished.get(r.officialUrl))
      : {})
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
  allowedHostSuffixes: [...ALLOWED_HOST_SUFFIXES, "state.<code>.us (the delegated state-government namespace; bare .us is open registration and is refused)"],
  allowedExactHosts: [...ALLOWED_EXACT_HOST_NAMES].sort(),
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
  refused: manifestRefused,
  supersededByALaterAddress: supersededRecords.sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
  /*
   * Obligations swept for and NOT found: no committed evidence carries an exact
   * official artifact URL, so they go to the DISC lane — never to a guessed
   * address here, and never straight to a human while DISC has not run.
   */
  discPending: [
    {
      jurisdiction: "DE",
      formNumber: "Form 281",
      obligation: "the Delaware Form 281 expungement petition's exact official artifact URL",
      sweepFinding: "committed evidence carries only landing pages — courts.delaware.gov/forms/ (9 files), courts.delaware.gov/superior/expungement.aspx (15 files), courts.delaware.gov/forms/list.aspx?ag=Superior%20Court&cat=Expungement (2 files) — and no URL containing '281' on any Delaware host. FACTORY_MEMORY warns the held 'FORM-281' bytes actually print Form 281E (the charge-sheet continuation); the identity itself needs DISC before any address is trusted.",
      nextLane: "DISC",
      whyNotHere: "no corroborated exact URL exists in committed evidence, and a plausible address is worse than an absent one because ACQ will fetch it"
    },
    {
      jurisdiction: "MO",
      formNumber: "FI-05",
      obligation: "the Missouri Confidential Case Filing Information Sheet (FI-05) exact official artifact URL — SRR-001, a one-row family release gating six MO families",
      sweepFinding: "SOURCE_RELATIONSHIP_REGISTRY records officialArtifactUrl null with sourceState SOURCE_SCOPE_AND_VERSION_AMBIGUITY: St. Louis County publishes FI-05 while the 7th Circuit names the analogous form FI-50, and the recorded source page stlcountycourts.com is not an allowlisted official government host. Committed MO evidence otherwise carries only courts.mo.gov landing pages (page.jsp?id=191585, 242 files) and revisor.mo.gov statutes — no exact FI-05 artifact URL on an allowlisted host.",
      nextLane: "DISC",
      whyNotHere: "no corroborated exact URL exists, the only recorded publisher host is off-allowlist, and statewide-versus-local scope is unsettled (SRR-001); DISC and Captain settle scope and alias before any acquisition"
    }
  ]
};

/* ---- the integration clock ------------------------------------------------ */
const now = new Date();
const plus = (m) => new Date(now.getTime() + m * 60000).toISOString();
const byState = master.byState ?? {};
/*
 * Counting a state fails closed on a name the vocabulary does not declare.
 *
 * The repair trigger asked for "REPAIR_REQUIRED". The state is
 * FAIL_REPAIR_REQUIRED. So it counted zero every time it ran, and
 * "FAIL_REPAIR_REQUIRED > 20" could never fire no matter how deep the repair
 * queue got -- a threshold that reads a name nothing writes is a threshold that
 * is switched off, and it looks exactly like a quiet day. Twenty-six families
 * were in that state when this was found.
 *
 * This is the same defect class as the batch summarizer reading five field
 * names no receipt carries. A misspelled key returns undefined or zero and says
 * nothing, so the only defence is to refuse a name that is not declared.
 */
const countIn = (s) => {
  if (!(master.stateVocabulary ?? []).includes(s)) {
    console.error(`REFUSED: "${s}" is not a declared queue state. Declared: ${(master.stateVocabulary ?? []).join(", ")}`);
    console.error("A threshold that reads an undeclared state counts zero and reports a quiet day.");
    process.exit(1);
  }
  return master.families.filter((f) => f.state === s).length;
};
const sourceReady = countIn("SOURCE_READY");
const verifyPending = countIn("VERIFY_PENDING") + countIn("VERIFYING");
const repairRequired = countIn("FAIL_REPAIR_REQUIRED");

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

const EMIT = makeEmitter({ root: ROOT, check: CHECK, label: "source conveyor" });
EMIT.emit(CONVEYOR, `${JSON.stringify(conveyor, null, 2)}\n`);
EMIT.emit(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
EMIT.emit(CI_STATE, `${JSON.stringify(ciState, null, 2)}\n`);
EMIT.finish();
if (CHECK) process.exit(0);

console.log(`Wrote ${CONVEYOR}`);
console.log(`Wrote ${MANIFEST}`);
console.log(`Wrote ${CI_STATE}`);
console.log("");
console.log(`  16 source lanes: 6 DISC · 4 SRC · 3 ACQ · 3 PROMO`);
console.log(`  ${totalObligations} obligations · ${manifestEntries.length} ready to acquire · ${manifest.counts.obligationsNeedingDiscoveryFirst} need discovery first · ${manifestRefused.length} URL(s) refused`);
console.log(`  next integration ${ciState.cadence.nextIntegrationDeadline} · next source release ${ciState.cadence.nextSourceReleaseDeadline}`);
