#!/usr/bin/env node
// The bounded working view of the 81 retained_problematic PDFs for the finish sprint.
//
//   node scripts/generate-rcap-pdf-finish-workview.mjs
//   node scripts/generate-rcap-pdf-finish-workview.mjs --check
//
// This is a VIEW over the existing canonical register and terminalization queue,
// not a second ledger. It adds exactly one thing they cannot carry: whether each
// family's official source bytes are actually reachable right now.
//
// That distinction matters because the register's `binaryPresent` is computed
// against the family package directory, not against the corpora. A family whose
// package holds no binary is recorded as a missing binary even when its exact
// source — same SHA-256, same byte length — is sitting in the Nationwide tree or
// the Master Library. Twenty-seven of the thirty-seven "missing" families are in
// that position. Treating them as unavailable sends work to a source-acquisition
// lane that has nothing to acquire.
//
// So source presence is re-derived here by hashing the corpora and matching the
// digest already pinned in the asset id. Nothing is trusted from a filename, a
// path convention or a manifest claim; only a matching digest counts.
//
// The corpora are git-ignored and stay that way. What is committed is the
// resolution: which corpus file carries the digest, how many bytes it is, and
// which of the two corpora it came from.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { operationalCorpusPath, OPERATIONAL_CORPUS_RELATIVE, MASTER_LIBRARY_RELATIVE }
  from "./rcap-official-forms/operational-corpus-precondition.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const QUEUE = "data/rcap-all50/gate-b-81-terminalization-queue.json";
const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const OUT = "data/rcap-all50/pdf-finish-workview.json";
const OUT_MD = "docs/record-clearing/pdf-finish-workview.md";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const fail = (m) => { console.error(`FAIL pdf finish workview — ${m}`); process.exit(1); };

const queue = readJson(QUEUE);
const register = readJson(REGISTER);

/**
 * Index every corpus file by content digest.
 *
 * Both corpora are indexed, not just the operational one: a family's official
 * source legitimately lives in either, and which tree holds it is a custody
 * fact worth recording rather than a reason to call the source missing.
 */
function indexCorpora() {
  const roots = [
    { label: "nationwide", dir: (() => { try { return operationalCorpusPath(rootDir); } catch { return abs(OPERATIONAL_CORPUS_RELATIVE); } })() },
    { label: "master_library", dir: abs(MASTER_LIBRARY_RELATIVE) }
  ];
  const index = new Map();
  let files = 0;
  const walk = (dir, label) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, label); continue; }
      let bytes;
      try { bytes = fs.readFileSync(full); } catch { continue; }
      files += 1;
      const digest = crypto.createHash("sha256").update(bytes).digest("hex");
      // First writer wins, and the corpora are walked in a fixed order, so a
      // digest present in both trees always resolves to the same one.
      if (!index.has(digest)) {
        index.set(digest, { corpus: label, path: path.relative(rootDir, full), byteLength: bytes.length });
      }
    }
  };
  for (const { dir, label } of roots) walk(dir, label);
  return { index, files, roots: roots.map((r) => path.relative(rootDir, r.dir)) };
}

const { index: corpus, files: corpusFiles, roots: corpusRoots } = indexCorpora();
if (corpusFiles === 0) {
  fail("no corpus file was readable; the Nationwide tree and the Master Library are both absent, so source presence cannot be re-derived. " +
       "Run where the corpora are mounted rather than recording every family as unavailable.");
}

const recordFor = new Map();
for (const rec of register.records ?? []) recordFor.set(rec.identity, rec);

/**
 * One root blocker per family, chosen by precedence rather than by listing every
 * finding. A family with no reachable source cannot have a classification
 * problem fixed first, so source outranks everything; a retire/repoint decision
 * outranks a render defect because the artifact may not need to exist at all.
 */
/**
 * Worker ownership, derived from the committed assignments rather than dealt out.
 *
 * A family already worked by a session should stay with that session: it has the
 * package's history, its source pack and its defect. Precedence resolves the
 * families that appear in more than one historical assignment — earlier entries
 * win, and the losing assignment is recorded as superseded rather than silently
 * dropped, so a session reading its old shard can see where the family went.
 *
 * Session 6 owns shared code and takes no families. Session 3 is no longer an
 * implementation dependency: every remaining source is hash-verified present.
 */
const WORKER_PRECEDENCE = [
  { assignment: "family-rerender-1.json", session: 7 },
  { assignment: "family-rerender-2.json", session: 8 },
  { assignment: "source-direct.json", session: 11 },
  { assignment: "source-resolution.json", session: 12 }
];
const FALLBACK_SESSION = 5;

const ASSIGNMENT_DIR = "data/rcap-all50/gate-b-assignments";
const workerShards = WORKER_PRECEDENCE.map((w) => {
  const body = readJson(`${ASSIGNMENT_DIR}/${w.assignment}`);
  return { ...w, familyIds: new Set(body.familyIds ?? []), allowedPaths: body.allowedPaths ?? [] };
});

const coversExactly = (allowedPaths, packagePath) =>
  packagePath ? allowedPaths.some((x) => x.replace(/\/\*\*$/, "") === packagePath) : false;

/**
 * Pick the owner for one family.
 *
 * A shard that names the family AND grants its exact package path wins outright.
 * A shard that names it without granting the path is a stale claim — the family
 * moved packages — so it is recorded as superseded instead of being honoured,
 * which is what would otherwise hand a session a family it cannot write to.
 */
function ownerFor(familyId, packagePath) {
  const naming = workerShards.filter((w) => w.familyIds.has(familyId));
  const withPath = naming.filter((w) => coversExactly(w.allowedPaths, packagePath));
  const chosen = withPath[0] ?? naming[0] ?? null;
  const superseded = naming.filter((w) => w !== chosen).map((w) => w.assignment);
  return {
    session: chosen ? chosen.session : FALLBACK_SESSION,
    fromAssignment: chosen ? chosen.assignment : null,
    grantedByAssignmentPath: chosen ? coversExactly(chosen.allowedPaths, packagePath) : false,
    supersededAssignments: superseded,
    derivation: chosen
      ? (coversExactly(chosen.allowedPaths, packagePath)
        ? "the committed assignment names this family and grants its exact package path"
        : "the committed assignment names this family but grants no path for its current package; the path is corrected here")
      : "no committed assignment names this family, so it falls to the overflow worker"
  };
}

/**
 * Where wave 1 left each family.
 *
 * Three states, and the difference matters to whoever reads this next:
 * implementation_complete means a worker produced its current outcome (which for
 * a non-fillable family is legitimately no fixture at all); terminalized means it
 * never needed a customer PDF; active means somebody still has to build one.
 */
const WAVE1 = (() => {
  const file = abs("data/rcap-all50/pdf-finish-wave1-terminalization.json");
  if (!fs.existsSync(file)) return { terminalised: new Map(), jobs: new Map() };
  const body = JSON.parse(fs.readFileSync(file, "utf8"));
  const terminalised = new Map();
  const jobs = new Map();
  for (const row of body.rows ?? []) {
    (row.instrument === "remains_implementation_job" ? jobs : terminalised).set(row.familyId, row);
  }
  return { terminalised, jobs };
})();

// Wave 1's three, plus the three residual commits that finished the last six
// families. A package produced by any of them carries a current implementation
// outcome.
const INTEGRATED_COMMITS = ["d199e04a", "ff60bcd2", "0e40fbd8", "fd4fe257", "db858929", "22d6026d"];
const integratedPackages = new Set();
{
  for (const commit of INTEGRATED_COMMITS) {
    let out = "";
    try {
      out = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", commit],
        { cwd: rootDir, maxBuffer: 1 << 28 }).toString();
    } catch { /* a base without the worker commits still generates */ }
    for (const line of out.split("\n")) {
      const m = line.match(/^(data\/rcap-all50\/overlays\/production\/[^/]+\/[^/]+)\//);
      if (m) integratedPackages.add(m[1]);
    }
  }
}

/**
 * Alias rows whose implementation landed in the canonical sibling package.
 *
 * Session 8 and Session 7 wrote the -form-en / -support-en directories while the
 * old grant named only the -en alias. The work is valid and nothing else owns
 * those directories, so the path is corrected to where the package actually
 * lives rather than the implementation being refused for a stale grant.
 */
const canonicalPackageFor = (familyId, packagePath) => {
  if (integratedPackages.has(packagePath)) return { path: packagePath, corrected: false };
  const slug = packagePath?.split("/").pop();
  const state = packagePath?.split("/").slice(-2, -1)[0];
  if (!slug || !state) return { path: packagePath, corrected: false };
  const base = slug.replace(/-en$/, "");
  for (const suffix of ["-form-en", "-support-en", "-instructions-en"]) {
    const candidate = `data/rcap-all50/overlays/production/${state}/${base}${suffix}`;
    if (integratedPackages.has(candidate)) return { path: candidate, corrected: true, from: packagePath };
  }
  return { path: packagePath, corrected: false };
};

/**
 * The canonical terminal disposition for a reference-only document.
 *
 * Session 7 recorded implementationStatus "no_fill_reference_only_translation"
 * on the two NC translations. That phrase is useful and stays on the family
 * record, but it is a new coinage: the canonical vocabulary already has
 * `reference_only`, defined in the master list as an instruction, guidance or
 * supporting-process document rather than a filed component. Publishing a second
 * enum for the same meaning would leave two names for one state in the generated
 * register, and whichever a later reader matched on would be a coin toss.
 *
 * Read from the family record rather than keyed to a family id, so any document
 * a court marks reference-only lands here.
 */
const CANONICAL_REFERENCE_ONLY = "reference_only";
const referenceOnlyDetail = (packagePath) => {
  if (!packagePath) return null;
  const record = abs(`${packagePath}/source-record.json`);
  if (!fs.existsSync(record)) return null;
  let body;
  try { body = JSON.parse(fs.readFileSync(record, "utf8")); } catch { return null; }
  const status = String(body.implementationStatus ?? "");
  return /reference_only/.test(status) ? status : null;
};

const ROOT_CAUSE_GROUPS = [
  { id: "launch_safe_terminal_closed", title: "Closed — launch-safe terminal exclusion, source unobtainable and no route reaches it",
    owner: { session: null, lane: "closed, no owner required" } },
  { id: "source_unmaterialized", title: "Official source bytes not reachable in any accessible corpus",
    owner: { session: 3, lane: "source custody and materialization" } },
  { id: "source_identity_never_pinned", title: "No source SHA-256 was ever recorded — identity cannot be settled by acquiring bytes",
    owner: { session: 3, lane: "source custody and materialization" } },
  { id: "not_a_filing_artifact", title: "Captured HTML, index or download page — retire, repoint or guidance",
    owner: { session: 13, lane: "retirement, repoint and guidance" } },
  { id: "render_or_finalizer_defect", title: "Source reachable; artifact carries a render, classification or finalizer defect",
    owner: { session: null, lane: "implementation worker" } }
];

const groupFor = (asset, sourceHit, digestRecorded) => {
  if (asset.launchSafelyTerminal) return "launch_safe_terminal_closed";
  if (!digestRecorded) return "source_identity_never_pinned";
  if (!sourceHit) return "source_unmaterialized";
  if (asset.primaryBucket === "RETIRE_OR_REPOINT") return "not_a_filing_artifact";
  return "render_or_finalizer_defect";
};

/**
 * The view keeps the full original 81, not just what is still open.
 *
 * Once a family reaches a launch-safe terminal exclusion the canonical queue
 * drops it — correctly, because no session should be sent after it. But the
 * sprint's question is "where did each of the 81 end up", and a view that
 * silently shrinks to 71 cannot answer it: the ten would look like they were
 * never there rather than like they were finished.
 */
const terminalisedRecords = (register.records ?? []).filter((r) => r.launchSafelyTerminal);
const queuedIds = new Set(queue.assets.map((a) => a.assetId));
const scope = [
  ...queue.assets,
  ...terminalisedRecords.filter((r) => !queuedIds.has(r.identity)).map((r) => ({
    assetId: r.identity,
    jurisdiction: r.jurisdiction,
    familyId: (r.familyIds ?? [])[0] ?? null,
    familyIds: r.familyIds ?? [],
    formId: r.formId,
    familyPackagePath: null,
    primaryBucket: "LAUNCH_SAFE_TERMINAL",
    primaryBlocker: r.launchSafeTerminalReason ?? "official source unreachable",
    terminalOutcome: r.launchSafeTerminalDisposition,
    terminalTarget: "launch-safe terminal exclusion — never platform_ready",
    doneCondition: "already terminal: no obtainable source, and no track, packet family or sellable pathway reaches it",
    mustPacket: false,
    ownedPaths: [],
    launchSafelyTerminal: true
  }))
];

const families = scope.map((asset) => {
  // Two assets carry sha256_unrecorded_in_repo rather than a digest. That is a
  // third source state, not a variant of absent: nothing was ever pinned, so a
  // content match is impossible in principle and acquiring bytes would not
  // settle identity either. It is called out rather than folded into "absent",
  // which would imply a corpus search could resolve it.
  const digest = String(asset.assetId).split("|").pop();
  const digestRecorded = /^[0-9a-f]{64}$/.test(digest);
  const hit = digestRecorded ? (corpus.get(digest) ?? null) : null;
  const rec = recordFor.get(asset.assetId) ?? null;
  const group = groupFor(asset, hit, digestRecorded);
  return {
    familyId: asset.familyId,
    familyIds: asset.familyIds ?? [],
    assetId: asset.assetId,
    jurisdiction: asset.jurisdiction,
    formId: asset.formId,
    packagePath: asset.familyPackagePath ?? null,
    artifactPaths: asset.familyPackagePath
      ? ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]
        .map((rel) => `${asset.familyPackagePath}/${rel}`)
      : [],
    sourceRecordPath: asset.familyPackagePath ? `${asset.familyPackagePath}/source-record.json` : null,
    rootCauseGroup: group,
    rootBlocker: group === "source_unmaterialized"
      ? "official source bytes are not present in any accessible corpus"
      : group === "source_identity_never_pinned"
        ? "no source SHA-256 was ever recorded for this asset, so no corpus match can establish its identity"
        : asset.primaryBlocker,
    sourceAvailability: hit
      ? { status: "present_and_hash_verified", corpus: hit.corpus, resolvedPath: hit.path,
          sha256: digest, byteLength: hit.byteLength }
      : digestRecorded
        ? { status: "absent_from_every_accessible_corpus", corpus: null, resolvedPath: null,
            sha256: digest, byteLength: null }
        : { status: "no_digest_ever_recorded", corpus: null, resolvedPath: null,
            sha256: null, byteLength: null },
    registerSaysBinaryPresent: rec ? rec.binaryPresent === true : null,
    registerAndCorpusDisagree: rec ? (rec.binaryPresent === false && Boolean(hit)) : false,
    currentnessStatus: asset.currentnessStatus ?? null,
    mapOrProfileStatus: asset.currentArtifactStatus ?? null,
    censusStatus: asset.sourceStatus ?? null,
    classificationStatus: asset.subtype ?? "not_flagged",
    artifactStatus: asset.currentArtifactStatus ?? null,
    evidenceStatus: { sidecar: asset.sidecarStatus ?? null, visual: asset.allPageEvidenceStatus ?? null },
    reviewStatus: asset.reviewStatus ?? null,
    primaryBucket: asset.primaryBucket,
    terminalOutcome: asset.terminalOutcome,
    terminalTarget: asset.terminalTarget,
    terminalExitCondition: asset.doneCondition,
    mustPacket: asset.mustPacket === true,
    ownerLane: group === "render_or_finalizer_defect" || group === "not_a_filing_artifact"
      ? (() => {
          const canonical = canonicalPackageFor(asset.familyId, asset.familyPackagePath);
          const o = ownerFor(asset.familyId, asset.familyPackagePath);
          const terminal = WAVE1.terminalised.get(asset.familyId) ?? null;
          const job = WAVE1.jobs.get(asset.familyId) ?? null;
          // An integrated package outranks a wave-1 job listing. That listing is a
          // snapshot of what was outstanding when wave 1 ran; a family a worker
          // has since finished is complete, and leaving it "active" because an
          // older record still names it would keep the queue permanently open.
          const complete = !terminal && integratedPackages.has(canonical.path);
          const state = terminal ? "terminalized" : complete ? "implementation_complete" : "active";
          return {
            session: state === "active" ? (job ? job.assignedTo ?? o.session : o.session) : null,
            // Who the family was assigned to, regardless of where wave 1 left it.
            // The wave-1 record selects its rows from this, so clearing `session`
            // on a terminalized family cannot make that family invisible to the
            // pass that terminalized it.
            assignedSession: o.session,
            lane: state === "active" ? "implementation worker" : state,
            waveOneState: state,
            terminalInstrument: terminal?.instrument ?? null,
            canonicalTerminalDisposition: referenceOnlyDetail(canonical.path)
              ? CANONICAL_REFERENCE_ONLY : (terminal?.instrument ?? null),
            familyLocalImplementationStatus: referenceOnlyDetail(canonical.path),
            canonicalSuccessor: terminal?.canonicalSuccessor ?? null,
            allowedPackagePath: canonical.path,
            packagePathCorrectedFrom: canonical.corrected ? canonical.from : null,
            fromAssignment: o.fromAssignment,
            grantedByAssignmentPath: o.grantedByAssignmentPath,
            supersededAssignments: o.supersededAssignments,
            derivation: o.derivation
          };
        })()
      : ROOT_CAUSE_GROUPS.find((g) => g.id === group).owner,
    ownedPaths: asset.ownedPaths ?? []
  };
});

// One root blocker and one owner each — asserted, not assumed.
{
  const seen = new Set();
  for (const f of families) {
    if (!f.rootBlocker) fail(`${f.familyId} has no root blocker`);
    if (!f.rootCauseGroup) fail(`${f.familyId} has no root-cause group`);
    if (!f.terminalExitCondition) fail(`${f.familyId} has no terminal exit condition`);
    const key = f.assetId;
    if (seen.has(key)) fail(`${key} appears twice; a family may have exactly one owner`);
    seen.add(key);
  }
  // Ownership is only useful if it is total, single and writable. All three are
  // asserted, because an unowned family stalls silently and a doubly-owned
  // package corrupts whichever session writes second.
  const implementation = families.filter((f) => f.ownerLane.lane === "implementation worker");
  const complete = families.filter((f) => f.ownerLane.lane === "implementation_complete");
  const terminalisedRows = families.filter((f) => f.ownerLane.lane === "terminalized");
  const byPackage = new Map();
  for (const f of implementation) {
    if (!f.ownerLane.session) fail(`${f.familyId} has no owner session`);
    if (!f.packagePath) fail(`${f.familyId} has no package path to own`);
    const prior = byPackage.get(f.packagePath);
    if (prior && prior !== f.ownerLane.session) {
      fail(`${f.packagePath} is owned by session ${prior} and session ${f.ownerLane.session}; one package has one writer`);
    }
    byPackage.set(f.packagePath, f.ownerLane.session);
  }
  const accounted = implementation.length + complete.length + terminalisedRows.length;
  if (accounted !== register.totals.problematicPdfsTotal) {
    fail(`${accounted} famil(ies) accounted for (${implementation.length} active, ${complete.length} complete, ${terminalisedRows.length} terminalized) against a retained count of ${register.totals.problematicPdfsTotal}`);
  }
  const denominator = register.totals.problematicPdfsTotal + (register.totals.launchSafelyTerminal ?? 0);
  if (families.length !== denominator) {
    fail(`built ${families.length} families; the register's retained (${register.totals.problematicPdfsTotal}) plus launch-safely-terminal (${register.totals.launchSafelyTerminal ?? 0}) is ${denominator}`);
  }
}

const counts = families.reduce((acc, f) => {
  acc.byGroup[f.rootCauseGroup] = (acc.byGroup[f.rootCauseGroup] ?? 0) + 1;
  acc.bySource[f.sourceAvailability.status] = (acc.bySource[f.sourceAvailability.status] ?? 0) + 1;
  if (f.registerAndCorpusDisagree) acc.registerUnderstatesSourceBy += 1;
  return acc;
}, { byGroup: {}, bySource: {}, registerUnderstatesSourceBy: 0 });

const record = {
  schemaVersion: "rcap-pdf-finish-workview/v1",
  generatedBy: "scripts/generate-rcap-pdf-finish-workview.mjs",
  isNotASecondLedger:
    "a view over data/rcap-all50/problematic-pdf-register.json and the 81-asset terminalization queue. It introduces no status, no denominator and no ownership that those two do not already carry — only re-derived source reachability.",
  denominator: {
    platform_ready: register.totals.platformReady,
    retired: register.totals.retiredFromOperationalInventory,
    retained_problematic: register.totals.problematicPdfsTotal,
    retained_missing_per_register: register.totals.missingPdfBinaries
  },
  corpus: { roots: corpusRoots, filesIndexed: corpusFiles },
  sourceReDerivation: {
    method: "every corpus file hashed; matched against the SHA-256 already pinned in each asset id. A filename, a path convention or a manifest claim never counts as a match.",
    presentAndHashVerified: counts.bySource.present_and_hash_verified ?? 0,
    absentFromEveryAccessibleCorpus: counts.bySource.absent_from_every_accessible_corpus ?? 0,
    noDigestEverRecorded: counts.bySource.no_digest_ever_recorded ?? 0,
    registerRecordsMissingButCorpusHasIt: counts.registerUnderstatesSourceBy,
    whyTheyDisagree:
      "the register's binaryPresent asks whether the family package directory holds the binary. That is the right question for the package and the wrong question for the sprint: it reports a family as a missing binary while its exact bytes sit in the corpora, sending work to an acquisition lane with nothing to acquire.",
    thisMovesNoCount:
      "retained_missing stays as the register computes it. This records what is reachable; only a canonical generator may move a count."
  },
  rootCauseGroups: ROOT_CAUSE_GROUPS.map((g) => ({ ...g, familyCount: counts.byGroup[g.id] ?? 0 })),
  assignmentRevision: "pdf-finish-69/r1",
  captainBaseSha: "92304539dbad4c5ff58cff5ec554e0d2d4bf3008",
  workerOwnership: {
    derivedFrom: WORKER_PRECEDENCE.map((w) => `${w.assignment} -> session ${w.session}`),
    overflowSession: FALLBACK_SESSION,
    sharedCodeOwner: 6,
    sourceIsNoLongerAnImplementationDependency:
      "every remaining implementation source is hash-verified present in the corpora and shipped in a session pack, so no worker waits on source custody",
    perSession: families
      .filter((f) => f.ownerLane.lane === "implementation worker")
      .reduce((acc, f) => { acc[f.ownerLane.session] = (acc[f.ownerLane.session] ?? 0) + 1; return acc; }, {})
  },
  /**
   * Three queues, not one number.
   *
   * retained_problematic stops distinguishing between "nobody has built this"
   * and "it is built and waiting to be looked at", and those need completely
   * different people. Implementation is finished; what is left is evidence and
   * review, and saying so is the difference between a board that looks stalled
   * and one that shows where the work actually sits.
   */
  queues: (() => {
    const complete = families.filter((f) => f.ownerLane.lane === "implementation_complete");
    const stale = (v) => !v || /none|absent|no |not /i.test(String(v));
    const evidence = complete.filter(
      (f) => stale(f.evidenceStatus?.sidecar) || stale(f.evidenceStatus?.visual));
    const review = complete.filter((f) => !/approved/i.test(String(f.reviewStatus ?? "")));
    return {
      IMPLEMENTATION_QUEUE: families.filter((f) => f.ownerLane.lane === "implementation worker").length,
      EVIDENCE_QUEUE: evidence.length,
      REVIEW_QUEUE: review.length,
      derivation: "evidence: an implementation-complete family whose sidecar or all-page visual evidence is absent or stale. review: an implementation-complete family carrying no current approval.",
      noneOfTheseArePlatformReady:
        "implementation-complete is not platform_ready. Promotion needs current evidence AND an independent approval of these exact bytes; neither is implied by the code being written."
    };
  })(),
  waveOne: {
    activeImplementationFamilies: families.filter((f) => f.ownerLane.lane === "implementation worker").length,
    implementationComplete: families.filter((f) => f.ownerLane.lane === "implementation_complete").length,
    terminalizedOrDeduplicated: families.filter((f) => f.ownerLane.lane === "terminalized").length,
    packagePathsCorrectedToCanonicalSibling: families.filter((f) => f.ownerLane.packagePathCorrectedFrom).length,
    activeAreNotPlatformReady:
      "the remaining families still require implementation, evidence and independent review. Nothing here promotes anything."
  },
  totals: { families: families.length, ...counts },
  families
};

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`]];

const md = [];
md.push("# RCAP PDF finish — bounded work view of the 81");
md.push("");
md.push(`Generated by \`scripts/generate-rcap-pdf-finish-workview.mjs\`. A view over the canonical register and the 81-asset queue, not a second ledger.`);
md.push("");
md.push(`Source re-derived by hashing ${corpusFiles} corpus files: **${record.sourceReDerivation.presentAndHashVerified} present and hash-verified**, **${record.sourceReDerivation.absentFromEveryAccessibleCorpus} absent from every accessible corpus**. ${record.sourceReDerivation.registerRecordsMissingButCorpusHasIt} families the register records as a missing binary have their exact bytes in a corpus.`);
md.push("");
for (const g of record.rootCauseGroups) {
  md.push(`## ${g.title} — ${g.familyCount}`);
  md.push("");
  md.push("| family | jurisdiction | root blocker | source | terminal outcome |");
  md.push("| --- | --- | --- | --- | --- |");
  for (const f of families.filter((x) => x.rootCauseGroup === g.id)) {
    md.push(`| \`${f.familyId}\` | ${f.jurisdiction} | ${String(f.rootBlocker).slice(0, 70)} | ${f.sourceAvailability.status === "present_and_hash_verified" ? f.sourceAvailability.corpus : "absent"} | ${f.terminalOutcome} |`);
  }
  md.push("");
}
outputs.push([OUT_MD, `${md.join("\n")}\n`]);

let stale = 0;
for (const [rel, body] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === body) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-pdf-finish-workview.mjs`);

console.log(
  `OK pdf finish workview — 81 families in ${record.rootCauseGroups.length} root-cause group(s); ` +
  `source ${record.sourceReDerivation.presentAndHashVerified} present / ${record.sourceReDerivation.absentFromEveryAccessibleCorpus} absent ` +
  `across ${corpusFiles} indexed corpus files; ${record.sourceReDerivation.registerRecordsMissingButCorpusHasIt} register/corpus disagreement(s)`
);
