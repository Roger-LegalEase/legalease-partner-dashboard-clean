#!/usr/bin/env node
/**
 * Each lane type asked its own contract, and the two contradictions closed.
 *
 * The factory had a browser requirement in the one environment that cannot
 * obtain one. ENV-RAS01 established the Playwright CDN answers HTTP 403 from
 * inside Codex; setup nonetheless tried to fetch a Chromium and failed the
 * whole phase on it, which leaves every lane with no corpus at all -- a far
 * worse outcome than a lane that cannot draw a picture. And the source-conveyor
 * gate treated the packet runtime as part of source readiness, so DISC, SRC,
 * ACQ and PROMO were being held to a toolchain none of them uses.
 *
 * The split: Codex installs dependencies and restores the corpus; rendering
 * happens centrally on a runner with a browser. What is NOT split is the proof.
 * No family becomes PASS_COMPLETE without a hash-bound RASTER_PASS, and L4
 * below is the check that says so.
 *
 *   node scripts/grade-a-packet-factory-24h/verify-lane-contracts.mjs
 *   node scripts/grade-a-packet-factory-24h/verify-lane-contracts.mjs --mutations
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { acceptedRasterFor, candidateRowsByFamily, inventoryIsInspectable, ACCEPTANCE } from "./acceptance-identity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATIONS = process.argv.includes("--mutations");
const SETUP = "scripts/codex-cloud/setup-packet-factory.sh";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";
const PROMPTS = "docs/rcap/grade-a/packet-factory-24h";
const DIR = "data/rcap-grade-a/packet-factory-24h";
const RASTER_WORKFLOW = ".github/workflows/rcap-packet-raster-acceptance-batch.yml";

const results = [];
const check = (id, title, ok, observed) => results.push({ id, title, ok, observed });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => { try { return JSON.parse(read(rel)); } catch { return null; } };

/* ---- L1. Codex setup requires no browser -------------------------------- */
/*
 * Comments are stripped first. The setup script explains at length why it does
 * NOT reach for these, and a check that cannot tell an explanation from an
 * instruction fires on the fix -- which happened once already, on this exact
 * shape, when a refusal message naming apt-get tripped a scan for apt-get.
 */
const setupText = read(SETUP);
/*
 * Prose is neutralised; a variable reference is not.
 *
 * Stripping every double-quoted string killed the message in `fail "...do not
 * fall back to apt-get..."` -- which is the point, since a prohibition is not
 * an instruction. But it also killed `[ -n "$RCAP_CHROMIUM_PATH" ]`, because
 * "$VAR" is how shell references a variable, and the scan went blind to exactly
 * the requirement it exists to forbid. The mutation caught that.
 *
 * So a quoted string is stripped only when it contains no $ reference. Prose
 * disappears; `"$RCAP_CHROMIUM_PATH"` stays.
 */
const setupCommands = setupText
  .split("\n").filter((l) => !/^\s*#/.test(l)).join("\n")
  .replace(/"(?:[^"\\]|\\.)*"/g, (m) => (m.includes("$") ? m : '""'))
  .replace(/'[^']*'/g, "''");
const FORBIDDEN_IN_SETUP = [
  { what: "playwright install", re: /playwright\s+install/ },
  { what: "apt-get", re: /\bapt-get\b/ },
  { what: "pdftoppm", re: /\bpdftoppm\b/ },
  { what: "RCAP_CHROMIUM_PATH", re: /RCAP_CHROMIUM_PATH/ }
];
const setupReaches = FORBIDDEN_IN_SETUP.filter((f) => f.re.test(setupCommands)).map((f) => f.what);
// Positive control: the corpus restore must still be there, or "requires no
// browser" would also be true of a setup script that does nothing at all.
const setupStillRestores = /npm ci/.test(setupCommands) && /LEGALEASE_CODEX_CLOUD_READY/.test(setupText);
check("L1", "Codex setup installs dependencies and restores the corpus, and requires no browser",
  setupReaches.length === 0 && setupStillRestores,
  `${setupReaches.length} browser reach(es)${setupReaches.length ? `: ${setupReaches.join(", ")}` : ""}; still installs deps and restores the corpus: ${setupStillRestores}`);

/* ---- L2. no source-lane preflight requires a rasterizer ------------------ */
const preflightText = read(PREFLIGHT);
const rasterOptIn = /REQUIRE_RASTERIZER/.test(preflightText)
  && /--require-rasterizer/.test(preflightText);
const probe = spawnSync(process.execPath, [PREFLIGHT, "--codex-cloud"], { cwd: ROOT, encoding: "utf8" });
const probeText = `${probe.stdout ?? ""}${probe.stderr ?? ""}`;
const rasterSkipped = /^\s*-\s+page_rasterizer_available\s+not applicable/m.test(probeText);
const producesVerdict = /PACKET_BUILD_ENVIRONMENT_(READY|NOT_READY):/.test(probeText);
// A skipped check must never be counted as a pass; the preflight's own
// arithmetic already separates them, and this asserts it still does.
const skippedNotCounted = /skippedAreNotPasses|results\.length - skipped\.length/.test(preflightText);
check("L2", "a source-lane preflight treats the rasterizer as not applicable, and skipped is not a pass",
  rasterOptIn && rasterSkipped && producesVerdict && skippedNotCounted,
  `opt-in flag: ${rasterOptIn}; skipped in a source-lane run: ${rasterSkipped}; verdict line: ${producesVerdict}; skipped excluded from passes: ${skippedNotCounted}`);

/* ---- L3. source-lane prompts carry no packet or raster instruction ------- */
const SOURCE_LANE = /^(DISC|SRC|ACQ|PROMO)\d+\.md$/;
const BUILDER_LANE = /^(PF|FIX)\d+\.md$/;
const promptFiles = fs.existsSync(path.join(ROOT, PROMPTS)) ? fs.readdirSync(path.join(ROOT, PROMPTS)) : [];
const sourcePrompts = promptFiles.filter((f) => SOURCE_LANE.test(f));
const builderPrompts = promptFiles.filter((f) => BUILDER_LANE.test(f));
const RASTER_WORDS = /\braster|\bchromium\b|pdftoppm|BUILT_RASTER_PENDING|RASTER_PASS/i;
const contaminated = sourcePrompts.filter((f) => RASTER_WORDS.test(read(`${PROMPTS}/${f}`)));
// A negative test whose subject cannot exist proves nothing: if there are no
// source prompts to read, "none are contaminated" is true and worthless.
const haveSubjects = sourcePrompts.length >= 16 && builderPrompts.length >= 16;
check("L3", "no source-lane prompt carries a packet or raster instruction, and the builders still do",
  contaminated.length === 0 && haveSubjects && builderPrompts.every((f) => /BUILT_RASTER_PENDING/.test(read(`${PROMPTS}/${f}`))),
  `${sourcePrompts.length} source prompt(s), ${builderPrompts.length} builder prompt(s); ${contaminated.length} contaminated: ${contaminated.slice(0, 3).join(", ")}`);

/* ---- L4. the proof is not weakened -------------------------------------- */
/*
 * The whole risk in moving a gate is that it quietly becomes a waiver. This is
 * the check that refuses that: a family called proven must have a RASTER_PASS,
 * that verdict must come from the central workflow against hash-pinned bytes,
 * and BUILT_RASTER_PENDING must be declared as a workflow state rather than a
 * verdict.
 */
const master = readJson(`${DIR}/MASTER_QUEUE.json`);
const queue = readJson(`${DIR}/RASTER_QUEUE.json`);
const proofProblems = [];
if (!master) proofProblems.push("no master queue");
if (!queue) proofProblems.push("no raster queue; there is nowhere for a RASTER_PASS to come from");
if (!fs.existsSync(path.join(ROOT, RASTER_WORKFLOW))) proofProblems.push("the central raster workflow is absent");
let provenOnBytes = 0;
let unverifiableHere = 0;
if (master && queue) {
  /*
   * A RASTER_PASS proves the family only when the row that carries it covers
   * the family. Eleven families ship several canonical documents and no
   * assembled packet, so their row renders one document and leaves the rest
   * unrendered; nine of those already carry RASTER_PASS. Reading the state
   * alone would let a verdict on Washington's petition stand in for a verdict
   * on the order it is filed with.
   *
   * AND THE ROW HAS TO STILL BE TRUE OF THE BYTES.
   *
   * This built its proven set from two strings -- `currentRasterState` and
   * `coverage.complete` -- and never opened the PDF the row pins. A packet
   * rebuilt after its receipt was accepted keeps both strings and stops being
   * the thing that was rendered, and L4 went on reporting 9/9 over it. The
   * missing test was not missing from the repository: generate-product-wiring
   * has always re-hashed the canonical and the boundary before writing an
   * acceptanceReceipt into a binding, and wrote `acceptanceReceipt: null` when
   * the bytes had moved. The two surfaces disagreed and the weaker one was the
   * gate.
   *
   * That test now lives in ./acceptance-identity.mjs and both surfaces call it.
   * It re-hashes the canonical, the boundary, and every other required document
   * the accepted coverage carries, and it refuses a receipt that covers a
   * document the row does not declare or that leaves one of them out.
   *
   * The one thing it does NOT do is call absence corruption. A worktree that
   * has not checked the fixture out -- sparse checkout has caught nine lanes,
   * and an unmounted Nationwide corpus produced 24 false A1_MISSING_ON_DISK
   * findings in a sibling lane -- cannot say the bytes are valid, and equally
   * cannot say they are wrong. Both refuse the promotion; they are reported
   * apart because mounting the custody and rebuilding the packet are different
   * jobs.
   */
  const inspectable = inventoryIsInspectable(queue);
  if (!inspectable.ok) proofProblems.push(inspectable.why);
  /* Current rows only. A superseded row is not this family's raster state, and
   * one family in the queue holds its only RASTER_PASS there. */
  const candidates = candidateRowsByFamily(queue, { includeSuperseded: false });
  const PROVEN = ["COMPLETE_PACKET_PROVEN"];
  for (const f of master.families) {
    if (!PROVEN.includes(f.state)) continue;
    const acceptance = acceptedRasterFor(ROOT, candidates.get(f.familyId) ?? []);
    if (acceptance.proven) { provenOnBytes += 1; continue; }
    if (acceptance.status === ACCEPTANCE.NO_ACCEPTED_RECEIPT) {
      proofProblems.push(`${f.familyId} is ${f.state} with no RASTER_PASS`);
    } else if (!acceptance.conclusive) {
      unverifiableHere += 1;
      proofProblems.push(`${f.familyId} is ${f.state} and its accepted bytes cannot be verified here (${acceptance.status}): ${acceptance.reasons[0] ?? ""}`);
    } else {
      proofProblems.push(`${f.familyId} is ${f.state} and its accepted receipt no longer describes the bytes on disk (${acceptance.status}): ${acceptance.reasons[0] ?? ""}`);
    }
  }
  if (!(master.stateVocabulary ?? []).includes("BUILT_RASTER_PENDING")) proofProblems.push("BUILT_RASTER_PENDING is not a declared state, so a builder cannot return it");
  if (queue.builtRasterPending?.isNotALaunchVerdict !== true) proofProblems.push("the queue does not state that BUILT_RASTER_PENDING is not a launch verdict");
  if (queue.builtRasterPending?.noPassCompleteWithout !== "RASTER_PASS") proofProblems.push("the queue does not require RASTER_PASS for PASS_COMPLETE");
  for (const r of queue.rows ?? []) {
    if (!/^[0-9a-f]{64}$/.test(String(r.canonicalPdfSha256 ?? ""))) { proofProblems.push(`${r.familyId} is queued with no exact canonical hash`); break; }
  }
}
check("L4", "no family is proven without a RASTER_PASS whose accepted bytes still hash to what it was bound to",
  proofProblems.length === 0,
  `${(queue?.rows ?? []).length} famil(ies) queued; ${provenOnBytes} proven famil(ies) re-hashed to their accepted receipt, ${unverifiableHere} unverifiable on this filesystem; ${proofProblems.length} problem(s): ${proofProblems.slice(0, 3).join(" | ")}`);

/* ---- L7. a row states what its verdict covers ---------------------------- */
/*
 * The queue picked its canonical fixture with a substring match over a sorted
 * listing, and "canonical--CC-1201-primary-filing.pdf" sorts before
 * "canonical.pdf". Nine families were queued to render one component of a
 * multi-component packet -- four pages of an eight-page Virginia packet -- and
 * the resulting verdict would have been written into the row as the FAMILY's.
 * Eleven more ship several canonical documents with no assembled packet, so one
 * row can only ever cover one of them.
 *
 * Neither is fixed by picking a better file. The row has to say what it covers,
 * and L4 has to read that rather than the state alone.
 */
const coverageProblems = [];
for (const r of queue?.rows ?? []) {
  if (!r.coverage) { coverageProblems.push(`${r.familyId} does not declare what its verdict covers`); continue; }
  if (typeof r.coverage.complete !== "boolean") coverageProblems.push(`${r.familyId} declares coverage without a complete flag`);
  /*
   * Complete means every canonical document is rendered -- not that there is
   * only one. This read `documents.length > 1` implies incomplete, which held
   * while a row rendered a single document and became false the moment rows
   * began rendering their whole set: eleven correctly-complete rows were
   * reported as lying about their coverage.
   */
  const documents = r.coverage.documents ?? [];
  const rastered = r.coverage.rastered ?? [];
  const uncovered = documents.filter((x) => !rastered.includes(x));
  if (r.coverage.complete === true && uncovered.length > 0) {
    coverageProblems.push(`${r.familyId} claims complete coverage while ${uncovered.length} of its ${documents.length} document(s) go unrendered: ${uncovered.join(", ")}`);
  }
  if (r.coverage.complete === false && uncovered.length === 0) {
    coverageProblems.push(`${r.familyId} renders every document it names and still declares partial coverage`);
  }
  /*
   * The row's primary canonical, identified by its PATH and not by its
   * basename.
   *
   * This took `canonicalPdfPath.split("/").pop()` and looked for that string in
   * `coverage.rastered`. Coverage names each document the way the queue's
   * fixture listing names it, which is the basename only while a family keeps
   * its fixtures flat in `fixtures/`. Two Ohio families render
   * `tracks/<track>/rendered/canonical/canonical.pdf` per track, so the
   * basename "canonical.pdf" is neither unique nor what coverage lists, and
   * this reported a correctly-covered row as uncovered.
   *
   * Matching on the full path is strictly stricter than matching on a
   * basename -- four documents named canonical.pdf no longer satisfy each
   * other -- and a row whose documents do not contain its own primary
   * canonical is now a problem rather than a silent fallback.
   */
  const primary = (r.documents ?? []).find((d) => d.role === "canonical" && d.path === r.canonicalPdfPath);
  if (r.canonicalPdfPath && (r.documents ?? []).length && !primary) {
    coverageProblems.push(`${r.familyId} names ${r.canonicalPdfPath} as its canonical and does not carry it as a canonical document`);
  }
  const chosen = primary?.name ?? String(r.canonicalPdfPath ?? "").split("/").pop();
  if (chosen && !rastered.includes(chosen)) {
    coverageProblems.push(`${r.familyId} renders ${chosen} but does not list it as covered`);
  }
  const named = (r.documents ?? []).filter((x) => x.role === "canonical").map((x) => x.name);
  if (r.documents && named.length && documents.length && named.some((x) => !documents.includes(x))) {
    coverageProblems.push(`${r.familyId} renders a canonical document its coverage does not list`);
  }
}
const partial = (queue?.rows ?? []).filter((r) => r.coverage && r.coverage.complete === false);
check("L7", "every queued row states which documents its verdict covers, and a partial verdict is not a family verdict",
  coverageProblems.length === 0 && (queue?.rows ?? []).length > 0,
  `${(queue?.rows ?? []).length} row(s), ${partial.length} with partial coverage; ${coverageProblems.length} problem(s): ${coverageProblems.slice(0, 3).join(" | ")}`);

/* ---- L8. a packet whose bytes are not reproducible cannot hold a receipt --- */
/*
 * PF-C found this and it is worse than a nuisance: pdf-lib stamps the wall
 * clock into a document it creates, so two builds of the SAME family from the
 * SAME inputs differ. Measured here on two empty documents 1.1s apart: 257 of
 * 583 bytes differ, because the date string shifts every following byte offset
 * and the xref table cascades. PF-C reported six bytes; it is six bytes of date
 * and everything they move.
 *
 * A RASTER_PASS is bound to a SHA-256. If a rebuild that changed nothing
 * changes the hash, the receipt silently stops describing the family, and the
 * queue's carry-forward -- which compares exactly those hashes -- throws the
 * verdict away. The gate would keep working and keep losing its own evidence.
 *
 * Proving reproducibility means building twice, which needs the corpus and
 * minutes per family. This asserts the precondition instead, which is exact and
 * free: a builder that creates a PDF must stamp a fixed date into it. The two
 * shared assemblers already do (ND_PACKET_PDF_DATE); the census-v1 builders
 * each roll their own assembly and eight of them do not.
 */
const buildersDir = path.join(ROOT, "scripts");
const builders = fs.existsSync(buildersDir)
  ? fs.readdirSync(buildersDir).filter((f) => /^build-census-v1-.*\.mjs$/.test(f))
  : [];
const unstamped = [];
for (const f of builders) {
  const t = read(`scripts/${f}`);
  if (!/PDFDocument\.create\(\)/.test(t)) continue;
  /* Stamped inline, or delegated to the shared stamper. Matching only the
   * inline call reported all eight as unstamped the moment they were fixed. */
  if (/setCreationDate\s*\(/.test(t)) continue;
  if (/stampDeterministic\s*\(/.test(t) && /rcap-deterministic-pdf-date\.mjs/.test(t)) continue;
  unstamped.push(f.replace(/^build-census-v1-|\.mjs$/g, ""));
}
const passed = new Set((queue?.rows ?? []).filter((r) => r.currentRasterState === "RASTER_PASS").map((r) => r.familyId));
const unstampedWithReceipt = unstamped.filter((f) => passed.has(f));
check("L8", "no family holds a raster receipt while its builder stamps the wall clock into the packet",
  builders.length > 0 && unstampedWithReceipt.length === 0,
  `${builders.length} builder(s) scanned; ${unstamped.length} create a PDF with no fixed date; ${unstampedWithReceipt.length} of those hold a RASTER_PASS: ${unstampedWithReceipt.slice(0, 4).join(", ")}`);

/* ---- L9. the strongest verdict requires the whole obligation set ---------- */
/*
 * VF15 and VF16 read nine Washington families off one host and returned
 * opposite verdicts: four FAIL_REPAIR_REQUIRED and five
 * PASS_COMPLETE_INDEPENDENT. The packets are materially identical and the
 * verifiers were both careful. They disagreed because they scored DIFFERENT
 * OBLIGATION SETS -- VF15 ran all fifteen proof obligations and failed four of
 * them; VF16 ran the nine completeness counters, and FILING_DESTINATION,
 * FEE_AND_WAIVER, SERVICE, SELF_HELP_STOP and ROUTE_OPTIONS appear nowhere in
 * its return. All five of VF16's families ship no participant-instructions.md,
 * which is exactly what failed VF15's four.
 *
 * Nothing was promoted -- the master queue holds all nine as
 * FAIL_REPAIR_REQUIRED -- so this is a near miss rather than a loss. It is
 * still the shape that promotes a family it should not: the strongest verdict
 * in the vocabulary, awarded over a narrower reading, indistinguishable in the
 * record from one awarded over the whole.
 *
 * A verifier may always score less and say so. What it may not do is call the
 * result PASS_COMPLETE_INDEPENDENT.
 */
const PROOF_OBLIGATIONS = [
  "ROUTE_IDENTITY", "SOURCE_IDENTITY", "COMPONENT_SET", "KNOWN_PREFILLS",
  "REQUIRED_BEFORE_FILING", "ROUTE_OPTIONS", "REPEATING_ROWS", "PROTECTED_FIELDS",
  "ARTIFACTS", "PAGE_ORDER", "CLIPPING_AND_OVERLAP", "FILING_DESTINATION",
  "FEE_AND_WAIVER", "SERVICE", "SELF_HELP_STOP",
];
const verdictProblems = [];
let passRowsSeen = 0;
const factoryDir = path.join(ROOT, DIR);
const laneDirs = fs.existsSync(factoryDir)
  ? fs.readdirSync(factoryDir).filter((x) => fs.existsSync(path.join(factoryDir, x, "rows.json")))
  : [];
for (const lane of laneDirs) {
  let doc;
  try { doc = JSON.parse(fs.readFileSync(path.join(factoryDir, lane, "rows.json"), "utf8")); } catch { continue; }
  if (doc.laneKind && doc.laneKind !== "independent-verification") continue;
  const scored = new Set(JSON.stringify(doc).match(/[A-Z][A-Z_]{4,}/g) ?? []);
  for (const row of doc.rows ?? []) {
    if (row.verdict !== "PASS_COMPLETE_INDEPENDENT") continue;
    passRowsSeen += 1;
    const unscored = PROOF_OBLIGATIONS.filter((o) => !scored.has(o));
    if (unscored.length) {
      verdictProblems.push(`${lane}/${row.itemId ?? "a row"} claims PASS_COMPLETE_INDEPENDENT without scoring ${unscored.length} obligation(s): ${unscored.slice(0, 5).join(", ")}`);
    }
  }
}
check("L9", "a PASS_COMPLETE_INDEPENDENT verdict scored every proof obligation, not a subset of them",
  verdictProblems.length === 0,
  `${laneDirs.length} lane return(s), ${passRowsSeen} PASS row(s); ${verdictProblems.length} problem(s): ${verdictProblems.slice(0, 2).join(" | ")}`);

/* ---- L6. a gate nobody can run may not be treated as one that passed ----- */
/*
 * The raster workflow is dispatchable only from the default branch -- that is
 * how GitHub scopes workflow_dispatch. When this was written the workflow was
 * not on main, dispatching it from the Captain branch answered 404, and the
 * whole contract could be expressed as one branch-wide conjunction: while the
 * workflow is unreachable, a family in a proven state is a family proven by a
 * gate that cannot have run.
 *
 * Then the workflow landed on main (a97e5d043 recorded it, #169 merged it), the
 * queue's presentOnDefaultBranch went true -- and that conjunction became
 * unfalsifiable. `presentOnDefaultBranch !== true` is now permanently false, so
 * from that commit on NO promotion could fail L6. The check went on reporting
 * ok while measuring nothing about any family, and its own negative control --
 * promote a family and watch L6 refuse -- began reporting MISSED, which is how
 * this was found.
 *
 * A gate whose reachability is global answers a global question once. What the
 * contract has to ask, now that the answer is yes, is family by family: this
 * family is proven -- was the gate actually dispatched FOR IT, and did the
 * receipt come back from the run of the workflow L5 governs, bound to the bytes
 * the row pins?
 *
 * That is not L4's question. L4 reads `currentRasterState === "RASTER_PASS"`
 * and the row's coverage: a row that simply asserts the string, with no receipt
 * behind it at all, satisfies L4 completely. The provenance of the verdict --
 * which run, which workflow, which bytes, which job conclusion -- is read
 * nowhere else in this file, and it is exactly what "the gate could be
 * dispatched" means once dispatching is possible.
 *
 * Deliberately NOT asserted here: receipt-side coverage. Thirteen rows carry an
 * older receipt shape with no documentsCovered/coversTheWholeFamily, five of
 * them under proven families. Whether a verdict covers the whole family is
 * L4's and L7's property, measured on the row, and answering it a second time
 * from a field the older receipts never carried would fail five families over a
 * schema drift rather than over anything about the gate.
 */
const PROVEN_STATES = ["COMPLETE_PACKET_PROVEN"];
const reach = queue?.workflowReachability ?? null;
const reachProblems = [];
const provenFamilies = (master?.families ?? []).filter((f) => PROVEN_STATES.includes(f.state));
const rowByFamily = new Map((queue?.rows ?? []).map((r) => [r.familyId, r]));
const dispatchedRuns = new Set((queue?.rows ?? [])
  .filter((r) => r.rasterReceipt?.workflow === RASTER_WORKFLOW && /^[0-9]+$/.test(String(r.rasterReceipt?.workflowRunId ?? "")))
  .map((r) => String(r.rasterReceipt.workflowRunId)));
if (!reach) reachProblems.push("the queue does not record whether the raster workflow can actually be dispatched");
else {
  if (reach.presentOnDefaultBranch !== true && provenFamilies.length > 0) {
    reachProblems.push(`${provenFamilies.length} famil(ies) are in a proven state while the raster workflow is undispatchable, so their verdict cannot have come from it`);
  }
  if (typeof reach.consequence !== "string" || !/RASTER_PASS/.test(reach.consequence)) {
    reachProblems.push("the recorded consequence does not say what being unreachable costs");
  }
  /*
   * The record is a boolean in a data file. Believing it is what disabled this
   * check for a day; so a claim of reachability has to be corroborated by a
   * dispatch that actually happened, and cannot rest on its own assertion.
   */
  if (reach.presentOnDefaultBranch === true && dispatchedRuns.size === 0) {
    reachProblems.push("the queue claims the raster workflow is dispatchable and no row carries a receipt from any run of it, so the claim rests on nothing");
  }
}
/*
 * Per family: a proven family must be able to point at the run that proved it.
 */
let receiptBacked = 0;
for (const f of provenFamilies) {
  const row = rowByFamily.get(f.familyId);
  if (!row) {
    reachProblems.push(`${f.familyId} is ${f.state} with no row in the raster queue, so the gate has nothing to be dispatched against`);
    continue;
  }
  const receipt = row.rasterReceipt ?? null;
  if (!receipt) {
    reachProblems.push(`${f.familyId} is ${f.state} on a ${row.currentRasterState} row carrying no receipt, so nothing shows the gate was ever dispatched for it`);
    continue;
  }
  const flaws = [];
  if (receipt.workflow !== RASTER_WORKFLOW) flaws.push(`its receipt names ${receipt.workflow ?? "no workflow"} rather than the central raster workflow`);
  if (!/^[0-9]+$/.test(String(receipt.workflowRunId ?? ""))) flaws.push("its receipt names no dispatched run");
  if (receipt.verdict !== "RASTER_PASS") flaws.push(`its receipt returned ${receipt.verdict ?? "no verdict"}`);
  if (receipt.jobConclusion !== "success") flaws.push(`the job that produced it concluded ${receipt.jobConclusion ?? "nothing"}`);
  if (receipt.boundToCanonicalSha256 !== row.canonicalPdfSha256) flaws.push("its receipt is bound to bytes other than the ones the row pins");
  if (flaws.length) reachProblems.push(`${f.familyId} is ${f.state} and ${flaws.join("; ")}`);
  else receiptBacked += 1;
}
check("L6", "the raster gate's reachability is recorded and corroborated, and every proven family names the run of it that proved it",
  reachProblems.length === 0,
  `present on default branch: ${reach?.presentOnDefaultBranch}; ${dispatchedRuns.size} dispatched run(s) behind the queue; ${receiptBacked}/${provenFamilies.length} proven famil(ies) backed by a receipt; ${reachProblems.length} problem(s): ${reachProblems.slice(0, 2).join(" | ")}`);

/* ---- L5. the canary and the controls stayed with the rendering ----------- */
const rasterWf = fs.existsSync(path.join(ROOT, RASTER_WORKFLOW)) ? read(RASTER_WORKFLOW) : "";
const wfProblems = [];
if (!/rcap-raster-canary\.mjs/.test(rasterWf)) wfProblems.push("the raster workflow runs no canary");
if (!/--negative-controls/.test(rasterWf)) wfProblems.push("the raster workflow runs no negative controls");
if (!/needs:\s*(\[[^\]]*canary|canary)/.test(rasterWf)) wfProblems.push("the render does not depend on the canary, so a batch could report green from a runner that cannot render");
if (/rcap-raster-canary\.mjs/.test(read(".github/workflows/rcap-source-conveyor-ready.yml"))) wfProblems.push("the source-conveyor gate is still running the packet canary");
check("L5", "the canary and the negative controls live with the rendering, and the render depends on them",
  wfProblems.length === 0, `${wfProblems.length} problem(s): ${wfProblems.slice(0, 2).join(" | ")}`);

for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id} ${r.title}${r.ok ? "" : `\n         observed: ${r.observed}`}`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} lane-contract checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const rerun = () => {
    const o = spawnSync(process.execPath, [import.meta.filename], { cwd: ROOT, encoding: "utf8" });
    return `${o.stdout ?? ""}${o.stderr ?? ""}`;
  };
  /* A digest of the right shape that names bytes nothing on disk holds. */
  const MOVED_DIGEST = "0".repeat(63) + "1";
  /* A row under a family the master queue calls proven, matching a predicate.
   * Built from the data rather than named, so the case survives repairs. */
  const provenRow = (queueDoc, predicate) => {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, `${DIR}/MASTER_QUEUE.json`), "utf8"));
    const proven = new Set((m.families ?? []).filter((x) => x.state === "COMPLETE_PACKET_PROVEN").map((x) => x.familyId));
    return (queueDoc.rows ?? []).find((r) => proven.has(r.familyId)
      && r.currentRasterState === "RASTER_PASS" && r.rasterReceipt && predicate(r)) ?? null;
  };
  const cases = [
    { name: "Codex setup invoking playwright install is caught", id: "L1", file: SETUP,
      edit: (t) => t.replace("echo \"Browser: not provisioned here", "npx --yes playwright install chromium\necho \"Browser: not provisioned here") },
    { name: "Codex setup invoking apt-get is caught", id: "L1", file: SETUP,
      edit: (t) => t.replace("echo \"Browser: not provisioned here", "apt-get install -y chromium\necho \"Browser: not provisioned here") },
    { name: "Codex setup reaching for pdftoppm is caught", id: "L1", file: SETUP,
      edit: (t) => t.replace("echo \"Browser: not provisioned here", "pdftoppm -r 72 page.pdf out\necho \"Browser: not provisioned here") },
    { name: "Codex setup requiring RCAP_CHROMIUM_PATH is caught", id: "L1", file: SETUP,
      edit: (t) => t.replace("echo \"Browser: not provisioned here", "[ -n \"$RCAP_CHROMIUM_PATH\" ] || fail no browser\necho \"Browser: not provisioned here") },
    /*
     * Anchored to the check it means, not to the first guard in the file.
     * This was `t.replace("if (!REQUIRE_RASTERIZER) {", ...)`, which takes the
     * FIRST occurrence. Two more opt-in guards were added above
     * page_rasterizer_available since -- browser_environment_exported and
     * build_time_rasterizer_available -- so the mutation began flipping a
     * different check, page_rasterizer_available went on reporting "not
     * applicable", and L2 passed against a preflight that had been mutated to
     * demand a rasterizer of every lane. The suite reported MISSED rather than
     * a pass, which is how this was found.
     */
    { name: "a preflight that requires a rasterizer of every lane is caught", id: "L2", file: PREFLIGHT,
      edit: (t) => {
        const at = t.indexOf('"page_rasterizer_available"');
        if (at < 0) return t;                       // subject gone: MISSED, never a pass
        const guard = "if (!REQUIRE_RASTERIZER) {";
        const g = t.indexOf(guard, at);
        if (g < 0) return t;
        return `${t.slice(0, g)}if (false) {${t.slice(g + guard.length)}`;
      } },
    { name: "a source-lane prompt carrying a raster instruction is caught", id: "L3", file: `${PROMPTS}/${sourcePrompts[0] ?? "DISC01.md"}`,
      edit: (t) => `${t}\n\nRender the pages and return BUILT_RASTER_PENDING.\n` },
    /* Reads the queue to pick a family with NO passing row. This took the first
     * VERIFY_PENDING family, which stopped being a subject once every queued
     * row reached RASTER_PASS: the family it picked already had one, promoting
     * it was legitimate, and the case reported MISSED. */
    { name: "a packet marked COMPLETE_PACKET_PROVEN with no RASTER_PASS is caught", id: "L4", file: `${DIR}/MASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t);
        const q = JSON.parse(fs.readFileSync(path.join(ROOT, `${DIR}/RASTER_QUEUE.json`), "utf8"));
        const passed = new Set(q.rows.filter((r) => r.currentRasterState === "RASTER_PASS").map((r) => r.familyId));
        const f = j.families.find((x) => !passed.has(x.familyId));
        if (!f) return t;
        f.state = "COMPLETE_PACKET_PROVEN"; return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "dropping BUILT_RASTER_PENDING from the vocabulary is caught", id: "L4", file: `${DIR}/MASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); j.stateVocabulary = j.stateVocabulary.filter((x) => x !== "BUILT_RASTER_PENDING"); return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "a queued PDF with no exact hash is caught", id: "L4", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); j.rows[0].canonicalPdfSha256 = null; return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "moving the canary out of the raster workflow is caught", id: "L5", file: RASTER_WORKFLOW,
      edit: (t) => t.replace(/rcap-raster-canary\.mjs/g, "rcap-raster-nothing.mjs") },
    /*
     * Repointed at what L6 reads, in the same spirit as the F29 and F13 cases.
     *
     * This was `promote the first VERIFY_PENDING family and watch L6 refuse`,
     * and it reported MISSED for two compounding reasons. The check's only
     * substantive clause was guarded on `presentOnDefaultBranch !== true`,
     * which went permanently false the day the workflow landed on main; and the
     * family it promotes -- ar-misdemeanor-dwi-seal-set today -- has held a
     * complete-coverage RASTER_PASS with a receipt since run 33495068504, so
     * promoting it is not the false provenance the case names. Every check in
     * the file passed under that mutation, L4 included, because nothing was
     * actually violated.
     *
     * So the forbidden state is now reconstructed on the side that still
     * varies: families stay proven, and the queue records the gate as
     * undispatchable underneath them.
     */
    { name: "a family proven while the queue records the raster gate as undispatchable is caught", id: "L6", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t);
        if (!j.workflowReachability) return t;
        j.workflowReachability.presentOnDefaultBranch = false;
        return `${JSON.stringify(j, null, 2)}\n`; } },
    /*
     * The provenance half, and the one L4 is blind to: L4 reads the row's
     * `currentRasterState` string and its coverage, so a row that asserts
     * RASTER_PASS with no receipt behind it satisfies L4 and is exactly a
     * verdict from a gate nobody can show ran.
     */
    { name: "a proven family whose row carries no receipt from the raster gate is caught", id: "L6", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t);
        const m = JSON.parse(fs.readFileSync(path.join(ROOT, `${DIR}/MASTER_QUEUE.json`), "utf8"));
        const provenIds = new Set((m.families ?? [])
          .filter((f) => f.state === "COMPLETE_PACKET_PROVEN")
          .map((f) => f.familyId));
        const row = (j.rows ?? []).find((r) => provenIds.has(r.familyId) && r.rasterReceipt);
        if (!row) return t;
        delete row.rasterReceipt;
        return `${JSON.stringify(j, null, 2)}\n`; } },
    /* Receipts minted somewhere other than the workflow L5 governs prove
     * nothing about the gate, and leave the reachability claim uncorroborated. */
    { name: "receipts attributed to a workflow other than the raster gate are caught", id: "L6", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t);
        let touched = 0;
        for (const r of j.rows ?? []) {
          if (!r.rasterReceipt?.workflow) continue;
          r.rasterReceipt.workflow = ".github/workflows/some-other-workflow.yml";
          touched += 1;
        }
        return touched ? `${JSON.stringify(j, null, 2)}\n` : t; } },
    { name: "dropping the reachability record is caught", id: "L6", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); delete j.workflowReachability; return `${JSON.stringify(j, null, 2)}\n`; } },
    /*
     * Removes the stamp from a builder that HOLDS a receipt, rather than
     * looking for an unstamped one. Searching was right only while eight
     * builders were unstamped; the moment they were fixed the search found
     * nothing and the case reported "its subject does not exist" -- which is
     * the harness refusing to call an empty mutation a pass.
     */
    { name: "a receipt on a family whose builder is not reproducible is caught", id: "L8",
      file: "scripts/build-census-v1-co_motion_seal_nonconviction-set.mjs",
      edit: (t) => t.replace(/^\s*stampDeterministic\([^)]*\);\s*$/m, "") },
    { name: "dropping a row's coverage declaration is caught", id: "L7", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); delete j.rows[0].coverage; return `${JSON.stringify(j, null, 2)}\n`; } },
    /* Restores the verdict Captain withdrew. Its subject is built rather than
     * found: every PASS row in the tree now scores the full set, so a case that
     * looked for a narrow one would have nothing to mutate. */
    { name: "the strongest verdict awarded over a subset of the obligations is caught", id: "L9",
      file: `${DIR}/vf16/rows.json`,
      edit: (t) => { const j = JSON.parse(t);
        const r = (j.rows ?? []).find((x) => x.verdictClaimedByLane === "PASS_COMPLETE_INDEPENDENT");
        if (!r) return t;
        r.verdict = "PASS_COMPLETE_INDEPENDENT";
        return `${JSON.stringify(j, null, 2)}\n`; } },
    /* Makes a row partial and then has it claim completeness. Searching for an
     * existing partial row worked only while eleven existed; once every row
     * rendered its whole set there was nothing to find and the case reported
     * that its subject does not exist. */
    { name: "a partial row claiming to cover the whole family is caught", id: "L7", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t);
        const r = j.rows.find((x) => x.coverage);
        if (!r) return t;
        r.coverage.documents = [...(r.coverage.documents ?? []), "an-unrendered-second-document.pdf"];
        r.coverage.complete = true;
        return `${JSON.stringify(j, null, 2)}\n`; } },
    /* Constructs its own subject: no family is PROVEN today, so a mutation that
     * only flipped coverage would be a check over zero subjects. This promotes
     * a family whose row covers one of several documents and asserts L4 refuses. */
    /*
     * Reconstructed on the raster queue rather than hunted for in the master
     * queue, and for the reason the L6 case above was moved: this case used to
     * look for a family whose row already carried the forbidden shape — a
     * partial-coverage RASTER_PASS, or no pass at all — and promote it. Both
     * subjects vanished the moment the queue reached 117 of 117 RASTER_PASS
     * with complete coverage on every row, and the case reported MISSED: the
     * mutation changed nothing, so L4 was never asked the question.
     *
     * A control whose subject is whatever the data happens to contain stops
     * being a control the moment the data improves, and improving data is the
     * point. So the forbidden pairing is BUILT here instead: a family stays
     * proven, and the row underneath it stops covering the whole packet. That
     * is exactly the state L4 refuses, and it can be constructed from any
     * proven family, so the case keeps a subject for as long as one exists.
     */
    /*
     * ---- the five cases the byte binding has to discriminate -------------
     *
     * All five are built on the QUEUE, never on a packet. A control that
     * rewrote a delivered PDF to prove a point would be changing bytes this
     * lane holds no grant for, and a restore-afterwards is not a defence: the
     * family's fixtures are the thing under measurement. Moving the pin is
     * exactly as decisive and touches nothing a participant receives.
     *
     * `provenRow` picks a subject from whatever is proven today, so these keep
     * a subject for as long as one exists rather than being anchored to a
     * family that may be repaired out from under them.
     */
    { name: "a proven family whose canonical moved under its accepted receipt is caught", id: "L4", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => {
        const j = JSON.parse(t);
        const row = provenRow(j, (r) => r.canonicalPdfPath && /^[0-9a-f]{64}$/.test(String(r.rasterReceipt?.boundToCanonicalSha256 ?? "")));
        if (!row) return t;
        /* The pin moves consistently everywhere the row states it, so the row
         * is internally coherent and the ONLY thing wrong is that no such bytes
         * exist on disk. Anything less would be caught by the row/receipt
         * disagreement rule instead, and would prove nothing about re-hashing. */
        const moved = MOVED_DIGEST;
        for (const d of row.documents ?? []) if (d.role === "canonical" && d.path === row.canonicalPdfPath) d.sha256 = moved;
        row.canonicalPdfSha256 = moved;
        row.rasterReceipt.boundToCanonicalSha256 = moved;
        return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "a proven family whose boundary moved under its accepted receipt is caught", id: "L4", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => {
        const j = JSON.parse(t);
        const row = provenRow(j, (r) => r.boundaryPdfPath && /^[0-9a-f]{64}$/.test(String(r.rasterReceipt?.boundToBoundarySha256 ?? "")));
        if (!row) return t;
        const moved = MOVED_DIGEST;
        for (const d of row.documents ?? []) if (d.role === "boundary" && d.path === row.boundaryPdfPath) d.sha256 = moved;
        row.boundaryPdfSha256 = moved;
        row.rasterReceipt.boundToBoundarySha256 = moved;
        return `${JSON.stringify(j, null, 2)}\n`; } },
    /* Absence is not corruption and this case does not claim it is -- it
     * asserts only that an unverifiable family is NOT COUNTED VERIFIED, which
     * is the half a promotion turns on. The message L4 prints for it names
     * mounting the custody rather than rebuilding the packet. */
    { name: "a proven family whose required document is not on disk is not counted verified", id: "L4", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => {
        const j = JSON.parse(t);
        const row = provenRow(j, (r) => r.canonicalPdfPath);
        if (!row) return t;
        const gone = `${row.canonicalPdfPath.replace(/\.pdf$/, "")}--a-fixture-no-checkout-here-holds.pdf`;
        for (const d of row.documents ?? []) if (d.path === row.canonicalPdfPath) d.path = gone;
        row.canonicalPdfPath = gone;
        return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "a receipt covering a document the row does not declare is caught", id: "L4", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => {
        const j = JSON.parse(t);
        const row = provenRow(j, (r) => Array.isArray(r.rasterReceipt?.documentsCovered));
        if (!row) return t;
        row.rasterReceipt.documentsCovered = ["a-document-from-some-other-family.pdf"];
        return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "a receipt that says it did not cover the whole family is caught", id: "L4", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => {
        const j = JSON.parse(t);
        const row = provenRow(j, (r) => r.rasterReceipt?.coversTheWholeFamily === true);
        if (!row) return t;
        row.rasterReceipt.coversTheWholeFamily = false;
        return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "promoting a family whose raster verdict covers one of several documents is caught", id: "L4", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t);
        const m = JSON.parse(fs.readFileSync(path.join(ROOT, `${DIR}/MASTER_QUEUE.json`), "utf8"));
        const PROVEN = new Set(["COMPLETE_PACKET_PROVEN"]);
        const proven = new Set(m.families.filter((x) => PROVEN.has(x.state)).map((x) => x.familyId));
        const row = j.rows.find((r) => proven.has(r.familyId) && r.currentRasterState === "RASTER_PASS" && r.coverage?.complete === true);
        if (!row) return t;
        row.coverage.complete = false;
        row.coverage.notRastered = [...(row.coverage.notRastered ?? []), "a-companion-document-this-verdict-never-measured.pdf"];
        return `${JSON.stringify(j, null, 2)}\n`; } }
  ];
  let allCaught = true;
  for (const c of cases) {
    const abs = path.join(ROOT, c.file);
    const original = fs.readFileSync(abs);
    const mutated = c.edit(original.toString("utf8"));
    if (mutated === original.toString("utf8")) {
      console.log(`  MISSED   [${c.id}] ${c.name} — the mutation changed nothing; its subject does not exist`);
      allCaught = false; continue;
    }
    fs.writeFileSync(abs, mutated);
    const out = rerun();
    fs.writeFileSync(abs, original);
    const restored = fs.readFileSync(abs).equals(original);
    const caught = new RegExp(`FAIL ${c.id}\\b`).test(out);
    if (!caught || !restored) allCaught = false;
    console.log(`  ${caught ? "detected" : "MISSED  "} [${c.id}] ${c.name}${restored ? "" : " — FILE NOT RESTORED"}`);
  }
  if (!allCaught) { console.error("\nFAIL lane-contract mutations"); process.exit(1); }
  console.log(`\nOK lane-contract mutations — ${cases.length} case(s), every mutation caught.`);
}

if (results.some((r) => !r.ok)) process.exit(1);
console.log("\nLANE_CONTRACTS_HELD");
