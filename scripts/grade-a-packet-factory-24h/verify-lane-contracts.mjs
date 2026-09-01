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
if (master && queue) {
  /*
   * A RASTER_PASS proves the family only when the row that carries it covers
   * the family. Eleven families ship several canonical documents and no
   * assembled packet, so their row renders one document and leaves the rest
   * unrendered; nine of those already carry RASTER_PASS. Reading the state
   * alone would let a verdict on Washington's petition stand in for a verdict
   * on the order it is filed with.
   */
  const passed = new Set((queue.rows ?? [])
    .filter((r) => r.currentRasterState === "RASTER_PASS" && r.coverage?.complete === true)
    .map((r) => r.familyId));
  const PROVEN = ["PASS_COMPLETE", "VERIFIED_PASS", "LEGAL_REVIEW_READY", "LEGAL_APPROVED", "PRODUCT_PATH_PENDING", "COMPLETE_PACKET_PROVEN"];
  for (const f of master.families) {
    if (PROVEN.includes(f.state) && !passed.has(f.familyId)) {
      proofProblems.push(`${f.familyId} is ${f.state} with no RASTER_PASS`);
    }
  }
  if (!(master.stateVocabulary ?? []).includes("BUILT_RASTER_PENDING")) proofProblems.push("BUILT_RASTER_PENDING is not a declared state, so a builder cannot return it");
  if (queue.builtRasterPending?.isNotALaunchVerdict !== true) proofProblems.push("the queue does not state that BUILT_RASTER_PENDING is not a launch verdict");
  if (queue.builtRasterPending?.noPassCompleteWithout !== "RASTER_PASS") proofProblems.push("the queue does not require RASTER_PASS for PASS_COMPLETE");
  for (const r of queue.rows ?? []) {
    if (!/^[0-9a-f]{64}$/.test(String(r.canonicalPdfSha256 ?? ""))) { proofProblems.push(`${r.familyId} is queued with no exact canonical hash`); break; }
  }
}
check("L4", "no family is proven without a hash-bound RASTER_PASS from the central workflow",
  proofProblems.length === 0,
  `${(queue?.rows ?? []).length} famil(ies) queued; ${proofProblems.length} problem(s): ${proofProblems.slice(0, 3).join(" | ")}`);

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
  const chosen = String(r.canonicalPdfPath ?? "").split("/").pop();
  if (r.coverage.complete === true && (r.coverage.documents ?? []).length > 1) {
    coverageProblems.push(`${r.familyId} claims complete coverage over ${r.coverage.documents.length} documents while rendering one`);
  }
  if (chosen && !(r.coverage.rastered ?? []).includes(chosen)) {
    coverageProblems.push(`${r.familyId} renders ${chosen} but does not list it as covered`);
  }
}
const partial = (queue?.rows ?? []).filter((r) => r.coverage && r.coverage.complete === false);
check("L7", "every queued row states which documents its verdict covers, and a partial verdict is not a family verdict",
  coverageProblems.length === 0 && (queue?.rows ?? []).length > 0,
  `${(queue?.rows ?? []).length} row(s), ${partial.length} with partial coverage; ${coverageProblems.length} problem(s): ${coverageProblems.slice(0, 3).join(" | ")}`);

/* ---- L6. a gate nobody can run may not be treated as one that passed ----- */
/*
 * The raster workflow is dispatchable only from the default branch -- that is
 * how GitHub scopes workflow_dispatch -- and it is not on main yet. Dispatching
 * it from the Captain branch answers 404, which I confirmed by trying. So the
 * visual gate is built and unreachable, and those are different states.
 *
 * The risk is not that somebody notices; it is that somebody does not, and
 * relaxes PASS_COMPLETE because "the raster never passes anyway". This refuses
 * that directly: while the workflow is unreachable, a family in a proven state
 * is a family proven by a gate that cannot have run.
 */
const reach = queue?.workflowReachability ?? null;
const reachProblems = [];
if (!reach) reachProblems.push("the queue does not record whether the raster workflow can actually be dispatched");
else {
  const proven = (master?.families ?? []).filter((f) => ["PASS_COMPLETE", "VERIFIED_PASS", "LEGAL_REVIEW_READY", "LEGAL_APPROVED", "PRODUCT_PATH_PENDING", "COMPLETE_PACKET_PROVEN"].includes(f.state));
  if (reach.presentOnDefaultBranch !== true && proven.length > 0) {
    reachProblems.push(`${proven.length} famil(ies) are in a proven state while the raster workflow is undispatchable, so their verdict cannot have come from it`);
  }
  if (typeof reach.consequence !== "string" || !/RASTER_PASS/.test(reach.consequence)) {
    reachProblems.push("the recorded consequence does not say what being unreachable costs");
  }
}
check("L6", "the raster gate's reachability is recorded, and no family is proven while it cannot be dispatched",
  reachProblems.length === 0,
  `present on default branch: ${reach?.presentOnDefaultBranch}; ${reachProblems.length} problem(s): ${reachProblems.slice(0, 2).join(" | ")}`);

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
    { name: "a packet marked PASS_COMPLETE with no RASTER_PASS is caught", id: "L4", file: `${DIR}/MASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); const f = j.families.find((x) => x.state === "VERIFY_PENDING") ?? j.families[0]; f.state = "PASS_COMPLETE"; return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "dropping BUILT_RASTER_PENDING from the vocabulary is caught", id: "L4", file: `${DIR}/MASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); j.stateVocabulary = j.stateVocabulary.filter((x) => x !== "BUILT_RASTER_PENDING"); return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "a queued PDF with no exact hash is caught", id: "L4", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); j.rows[0].canonicalPdfSha256 = null; return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "moving the canary out of the raster workflow is caught", id: "L5", file: RASTER_WORKFLOW,
      edit: (t) => t.replace(/rcap-raster-canary\.mjs/g, "rcap-raster-nothing.mjs") },
    { name: "a family proven while the raster gate cannot be dispatched is caught", id: "L6", file: `${DIR}/MASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); (j.families.find((x) => x.state === "VERIFY_PENDING") ?? j.families[0]).state = "COMPLETE_PACKET_PROVEN"; return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "dropping the reachability record is caught", id: "L6", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); delete j.workflowReachability; return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "dropping a row's coverage declaration is caught", id: "L7", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t); delete j.rows[0].coverage; return `${JSON.stringify(j, null, 2)}\n`; } },
    { name: "a partial row claiming to cover the whole family is caught", id: "L7", file: `${DIR}/RASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t);
        const r = j.rows.find((x) => x.coverage && x.coverage.complete === false);
        if (!r) return t;               // no subject: reported as MISSED, never as a pass
        r.coverage.complete = true; return `${JSON.stringify(j, null, 2)}\n`; } },
    /* Constructs its own subject: no family is PROVEN today, so a mutation that
     * only flipped coverage would be a check over zero subjects. This promotes
     * a family whose row covers one of several documents and asserts L4 refuses. */
    { name: "promoting a family whose raster verdict covers one of several documents is caught", id: "L4", file: `${DIR}/MASTER_QUEUE.json`,
      edit: (t) => { const j = JSON.parse(t);
        const q = JSON.parse(fs.readFileSync(path.join(ROOT, `${DIR}/RASTER_QUEUE.json`), "utf8"));
        const partialPass = q.rows.find((r) => r.currentRasterState === "RASTER_PASS" && r.coverage?.complete === false);
        if (!partialPass) return t;
        const fam = j.families.find((x) => x.familyId === partialPass.familyId);
        if (!fam) return t;
        fam.state = "PASS_COMPLETE"; return `${JSON.stringify(j, null, 2)}\n`; } }
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
