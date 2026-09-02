#!/usr/bin/env node
// The safety property of the partial Nationwide custody, made checkable.
//
//   node scripts/rcap-corpus/verify-partial-custody-cannot-assert-completeness.mjs
//
// THE PROPERTY
//
//   A file in the PARTIAL_NATIONWIDE_RECOVERY_POOL custody may satisfy an
//   INDIVIDUAL official-source obligation, and may never satisfy any assertion
//   that requires the complete operational corpus.
//
// Both halves are checked, and the positive half is not optional. A check that
// only proved the pool cannot assert completeness would be passed just as well
// by staging nothing at all, and would then certify an empty custody as safe
// while the work it was supposed to guard sat undone. So this also proves the
// custody is load-bearing: real obligations bind to it by exact hash.
//
// WHY THE BOOTSTRAP IS TESTED WITH ITS OWN CODE
//
// Assertion 4 does not reimplement the 583-file requirement. It extracts the
// verification program out of scripts/rcap-corpus/bootstrap-private-corpus.sh
// and runs THAT against the partial tree. A reimplementation could drift into
// agreeing with a bootstrap that had been quietly loosened, which is the one
// outcome this check exists to make impossible: if somebody weakens the
// bootstrap to accept a short corpus, this fails.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CUSTODY_TYPE = "PARTIAL_NATIONWIDE_RECOVERY_POOL";
const CUSTODY_ID = "nationwide_recovery_pool_2026_09_02";
const POOL_REL = "private/source-imports/Nationwide_Recovery_Pool_2026-09-02";
const RESERVED_REL = "private/Nationwide Record Clearing";
const RECEIPT_REL = "data/rcap-all50/NATIONWIDE_PARTIAL_CUSTODY_2026-09-02.json";
const INDEX_REL = "data/rcap-all50/local-source-corpus-index.json";
const MANIFEST_REL = "data/rcap-all50/nationwide-restore-manifest.json";
const BOOTSTRAP_REL = "scripts/rcap-corpus/bootstrap-private-corpus.sh";
const FINDINGS_REL = "data/rcap-grade-a/fable-packet-factory/SOURCE_BACKLOG_CLASSIFICATION.json";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const results = [];
const assert = (name, ok, detail) => { results.push({ name, ok: Boolean(ok), detail }); };

const poolAbs = path.join(rootDir, POOL_REL);
const poolMounted = fs.existsSync(poolAbs);
const manifest = readJson(MANIFEST_REL);

/* 1 - the reserved operational path stays absent ---------------------------- */
assert(
  "reserved operational corpus path is not occupied by the partial custody",
  !fs.existsSync(path.join(rootDir, RESERVED_REL)),
  `${RESERVED_REL} must remain absent; it is reserved for the complete ${manifest.files.length}-file corpus.`
);

/* 2 - the receipt declares partial, at the document level and on every row --- */
{
  const receipt = readJson(RECEIPT_REL);
  const rows = receipt.files ?? [];
  const badRows = rows.filter((r) => r.custodyType !== CUSTODY_TYPE || r.completeOperationalCorpus !== false);
  assert(
    "custody receipt declares the partial markers at document level",
    receipt.custodyType === CUSTODY_TYPE && receipt.completeOperationalCorpus === false,
    `custodyType=${receipt.custodyType} completeOperationalCorpus=${receipt.completeOperationalCorpus}`
  );
  assert(
    "custody receipt declares the partial markers on every row",
    rows.length > 0 && badRows.length === 0,
    `${rows.length} row(s), ${badRows.length} missing a marker`
  );
  assert(
    "custody receipt does not claim the complete corpus",
    rows.length < manifest.files.length,
    `${rows.length} staged of ${manifest.files.length} recorded; the shortfall is the point.`
  );
}

/* 3 - the marker travels on every index entry from this custody -------------- */
let poolEntries = [];
{
  const index = readJson(INDEX_REL);
  poolEntries = (index.entries ?? []).filter((e) => e.custody === CUSTODY_ID);
  const declared = (index.custodies ?? []).find((c) => c.id === CUSTODY_ID);
  assert(
    "the source index declares this custody as partial",
    Boolean(declared) && declared.custodyType === CUSTODY_TYPE && declared.completeOperationalCorpus === false,
    declared ? `custodyType=${declared.custodyType} completeOperationalCorpus=${declared.completeOperationalCorpus}` : "custody not declared in the index"
  );
  assert(
    "every index entry from this custody carries the partial marker",
    poolEntries.length > 0 && poolEntries.every((e) => e.custodyType === CUSTODY_TYPE),
    `${poolEntries.length} entries, ${poolEntries.filter((e) => e.custodyType !== CUSTODY_TYPE).length} unmarked`
  );
  /*
   * No index entry from a partial custody may carry a form number. That is what
   * keeps these bytes out of the reconciler's label-matching tiers, so they can
   * bind only by exact hash or by a document somebody read - never by a name
   * that resembles one of the seventy files that are absent.
   */
  assert(
    "no partial-custody entry carries a form number a label matcher could bind",
    poolEntries.every((e) => e.formNumber === null),
    `${poolEntries.filter((e) => e.formNumber !== null).length} entries carry a form number`
  );
}

/* 4 - the bootstrap's OWN verifier still refuses this tree ------------------- */
{
  const sh = fs.readFileSync(path.join(rootDir, BOOTSTRAP_REL), "utf8");
  const start = sh.indexOf("  node -e '", sh.indexOf("verify every recorded file"));
  const end = sh.indexOf(`' "$NATIONWIDE_MANIFEST" "$NATIONWIDE_ROOT"`, start);
  const program = start === -1 || end === -1 ? null : sh.slice(start + "  node -e '".length, end);

  assert(
    "the bootstrap's Nationwide verification program is still extractable",
    Boolean(program),
    "If this fails the bootstrap has been restructured and this assertion must be re-pointed, not deleted."
  );
  assert(
    "the bootstrap still exits non-zero on a short or mismatched corpus",
    Boolean(program) && /if \(missing \|\| mismatched\) process\.exit\(1\)/.test(program),
    "The 583-file requirement is that line. Its removal is what this asserts against."
  );

  if (program && poolMounted) {
    const run = spawnSync(process.execPath, ["-e", program, path.join(rootDir, MANIFEST_REL), poolAbs], { encoding: "utf8" });
    const reported = /(\d+) verified, (\d+) absent, (\d+) mismatched/.exec(run.stdout ?? "");
    assert(
      "the bootstrap's own verifier REFUSES the partial custody",
      run.status === 1,
      `exit ${run.status}: ${(run.stdout ?? "").trim().split("\n").pop()}`
    );
    assert(
      "it refuses because files are absent, not because bytes are wrong",
      Boolean(reported) && Number(reported[3]) === 0 && Number(reported[2]) > 0,
      reported ? `${reported[1]} verified, ${reported[2]} absent, ${reported[3]} mismatched` : "verifier produced no count"
    );
  }
}

/* 5 - the completeness precondition refuses it, despite the right shape ------ */
if (poolMounted) {
  const mod = await import(`file://${path.join(rootDir, "scripts/rcap-official-forms/operational-corpus-precondition.mjs")}`);
  assert(
    "the operational corpus precondition exposes a completeness measurement",
    typeof mod.corpusCompleteness === "function",
    "corpusCompleteness must exist for the refusal below to be possible"
  );

  const before = process.env.OFFICIAL_FORMS_SOURCE_DIR;
  process.env.OFFICIAL_FORMS_SOURCE_DIR = poolAbs;
  let corpus;
  try {
    corpus = await mod.resolveOperationalCorpus(rootDir, { requireManifestGenerator: false });
  } finally {
    if (before === undefined) delete process.env.OFFICIAL_FORMS_SOURCE_DIR;
    else process.env.OFFICIAL_FORMS_SOURCE_DIR = before;
  }

  /* The trap this closes: the partial pool passes every SHAPE test. If it did
   * not, the refusal below would be proving something easier than the real
   * hazard. */
  assert(
    "the partial custody does pass the shape test (so the refusal below is the real one)",
    corpus.shape === "operational_nationwide",
    `shape=${corpus.shape}`
  );
  assert(
    "the partial custody is REFUSED as the operational corpus",
    corpus.evaluable === false && corpus.refusals.some((r) => r.code === "operational_corpus_incomplete"),
    `evaluable=${corpus.evaluable} refusals=${corpus.refusals.map((r) => r.code).join(",") || "(none)"}`
  );
  assert(
    "the refusal names the shortfall in the corpus's own terms",
    corpus.completeness && corpus.completeness.complete === false && corpus.completeness.absent > 0,
    corpus.completeness
      ? `${corpus.completeness.verified}/${corpus.completeness.required} verified, ${corpus.completeness.absent} absent, ${corpus.completeness.mismatched} mismatched`
      : "no completeness measurement"
  );
}

/* 6 - THE POSITIVE HALF: an individual obligation does bind ------------------ */
{
  const findings = readJson(FINDINGS_REL);
  const byPathAndHash = new Set(poolEntries.map((e) => `${e.path} ${e.sha256}`));
  const nationwide = [];
  for (const entry of findings.entries ?? []) {
    for (const a of entry.artifacts ?? []) {
      const held = a.held ?? {};
      if (held.custody !== "NATIONWIDE_RECORD_CLEARING") continue;
      nationwide.push({ id: a.artifactId, bound: byPathAndHash.has(`${held.pathInArchive} ${held.sha256}`) });
    }
  }
  const bound = nationwide.filter((a) => a.bound);
  assert(
    "an INDIVIDUAL source obligation is satisfiable from this custody by exact hash",
    bound.length > 0,
    `${bound.length} of ${nationwide.length} Nationwide-custody artifacts now reach held bytes at their exact recorded path and hash. `
    + "A custody that bound nothing would pass every assertion above and be worthless; this is what stops that."
  );
}

/* ------------------------------------------------------------------ verdict */

if (!poolMounted) {
  console.log(`NOTE ${POOL_REL} is not mounted; the assertions that need the bytes were skipped.`);
  console.log("     Run scripts/rcap-corpus/stage-nationwide-recovery-pool.mjs to mount it.");
}
let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}`);
  console.log(`       ${r.detail}`);
  if (!r.ok) failed += 1;
}
console.log(`${results.length - failed}/${results.length} assertions passed`);
if (failed > 0) {
  console.error(`REFUSED: ${failed} assertion(s) failed. The partial custody's safety property is not established.`);
  process.exit(1);
}
