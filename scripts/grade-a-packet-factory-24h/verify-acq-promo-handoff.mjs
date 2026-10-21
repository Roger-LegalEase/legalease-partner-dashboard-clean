#!/usr/bin/env node
/**
 * Does the ACQ -> PROMO handoff actually refuse what it claims to refuse?
 *
 *   node scripts/grade-a-packet-factory-24h/verify-acq-promo-handoff.mjs [--mutations]
 *
 * The materializer compares a receipt's run id and artifact name against the
 * ones it is handed and refuses on a mismatch. It always did. The defect was
 * that NOTHING UPSTREAM WROTE EITHER FIELD, so the comparison could only ever
 * fail, on a difference no one could inspect — a gate that refuses everything
 * is indistinguishable from a gate that refuses nothing, because neither tells
 * you anything about the thing being gated.
 *
 * So this exercises the whole chain against a real temporary artifact: the
 * planner derives the name, the acquisition receipt carries the name and the
 * run id, and the materializer accepts. Then each link is broken in turn and
 * the refusal is required.
 *
 * A positive control runs first. A negative test whose subject cannot exist
 * proves nothing, and this file exists because that is exactly what happened.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hostAllowed, HOST_POLICY_VECTORS } from "../lib/official-host-policy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const MUTATIONS = process.argv.includes("--mutations");
const SUMMARIZER = "scripts/rcap-summarize-source-acquisition-batch.mjs";
const MATERIALIZER = "scripts/rcap-materialize-acquisition-handoff.mjs";
const PLANNER = "scripts/rcap-plan-source-acquisition-batch.mjs";
const ACQUIRE = "scripts/rcap-acquire-official-source.mjs";
const WORKFLOW = ".github/workflows/rcap-official-source-acquisition-batch.yml";

const results = [];
const check = (id, title, ok, observed = "") => { results.push({ id, title, ok, observed }); };

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-handoff-"));
const body = Buffer.from("%PDF-1.4\nnot a real form, only bytes to hash\n");
const bodyPath = path.join(stage, "source-body.pdf");
fs.writeFileSync(bodyPath, body);
const sha = crypto.createHash("sha256").update(body).digest("hex");
const RUN_ID = "33418043514";
const ARTIFACT = "rcap-source-VT-200-00130";

const writeReceipt = (over = {}) => {
  /*
   * A faithful receipt, carrying the keys rcap-acquire-official-source.mjs
   * actually writes. It used to carry six; the materializer read four of them
   * and the fixture therefore could not exercise the fields C13 walked past --
   * outcome, expectedSha256, matchesExpectedSha256, binaryFile, looksLikePdf.
   * A control that is not shaped like the real thing proves the refusals work
   * on a shape nothing produces.
   */
  const receipt = {
    schemaVersion: "rcap-official-source-receipt/v1",
    outcome: "acquired",
    acquisitionRunId: RUN_ID, artifactName: ARTIFACT,
    sha256: sha, expectedSha256: sha, matchesExpectedSha256: true,
    jurisdiction: "VT", formNumber: "200-00130",
    requestedUrl: "https://www.vermontjudiciary.gov/sites/default/files/documents/200-00130.pdf",
    finalResolvedUrl: "https://www.vermontjudiciary.gov/sites/default/files/documents/200-00130.pdf",
    publisherHost: "www.vermontjudiciary.gov",
    binaryFile: path.basename(bodyPath), looksLikePdf: true,
    observedByteLength: fs.statSync(bodyPath).size, contentType: "application/pdf",
    observedPageCount: 1, observedStructuralClass: "acroform",
    bodyCommitted: false, ...over
  };
  for (const [k, v] of Object.entries(over)) if (v === undefined) delete receipt[k];
  const p = path.join(stage, `receipt-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(p, JSON.stringify(receipt, null, 2));
  return p;
};

const materialize = (receiptPath, { runId = RUN_ID, artifactName = ARTIFACT, expected = sha } = {}) => {
  const out = spawnSync(process.execPath, [MATERIALIZER,
    "--run-id", runId, "--artifact-name", artifactName,
    "--input", bodyPath, "--expected-sha256", expected, "--receipt", receiptPath],
    { cwd: ROOT, encoding: "utf8" });
  return { code: out.status, stdout: out.stdout ?? "", stderr: out.stderr ?? "" };
};

/* ---- the chain, end to end -------------------------------------------- */
const plannerText = fs.readFileSync(path.join(ROOT, PLANNER), "utf8");
const acquireText = fs.readFileSync(path.join(ROOT, ACQUIRE), "utf8");
const workflowText = fs.readFileSync(path.join(ROOT, WORKFLOW), "utf8");

const chain = [];
if (!/artifactNameFor/.test(plannerText)) chain.push("the planner derives no artifact name");
if (!/artifactName: artifactNameFor\(e\)/.test(plannerText)) chain.push("the planner does not put the derived name in the matrix");
if (!/both derive artifact name/.test(plannerText)) chain.push("the planner does not prove derived names are unique");
if (!/RCAP_ACQUISITION_RUN_ID/.test(acquireText)) chain.push("the acquisition script does not read a run id");
if (!/acquisitionRunId: acquisitionRunId \|\| null/.test(acquireText)) chain.push("the acquisition script does not record the run id in the receipt");
if (!/artifactName: artifactName \|\| null/.test(acquireText)) chain.push("the acquisition script does not record the artifact name in the receipt");
if (!/GITHUB_ACTIONS === "true"/.test(acquireText)) chain.push("the acquisition script does not require provenance inside a workflow");
/*
 * Scoped to the step that actually runs the acquisition.
 *
 * These three were file-global regexes. C13 deleted RCAP_ACQUISITION_RUN_ID
 * from the acquire step -- the only step that invokes the acquisition script --
 * and H1 stayed green, because an identical line survives in the summarize job,
 * which never runs it. Downstream the acquire script would fail() inside
 * Actions and, under RCAP_TOLERATE_FAILURE=1, exit 0 with a not_acquired
 * receipt. A link checked anywhere in the file is not the link.
 *
 * The workflow is split on step boundaries and the step whose `run:` invokes
 * rcap-acquire-official-source.mjs is the one asked.
 */
const steps = workflowText.split(/\n\s*- name: /).map((b) => `- name: ${b}`);
const acquireStep = steps.find((b) => /run:[^\n]*rcap-acquire-official-source\.mjs/.test(b)) ?? null;
const uploadStep = steps.find((b) => /uses: actions\/upload-artifact/.test(b)) ?? null;
if (!acquireStep) chain.push("no workflow step runs the acquisition script");
else {
  if (!/RCAP_ACQUISITION_RUN_ID: \$\{\{ github\.run_id \}\}/.test(acquireStep)) chain.push("the step that runs the acquisition script is not passed the exact run id");
  if (!/RCAP_ARTIFACT_NAME: \$\{\{ matrix\.entry\.artifactName \}\}/.test(acquireStep)) chain.push("the step that runs the acquisition script is not passed the planner's artifact name");
}
if (!uploadStep) chain.push("no workflow step uploads the artifact");
else if (!/name: \$\{\{ matrix\.entry\.artifactName \}\}/.test(uploadStep)) chain.push("upload-artifact does not use the planner's artifact name");
check("H1", "the planner, the workflow, the acquisition script and the upload all name one string",
  chain.length === 0, `${chain.length} broken link(s): ${chain.slice(0, 2).join(" | ")}`);

/* Positive control FIRST: a complete receipt must be accepted, or every
 * refusal below is meaningless. */
const control = materialize(writeReceipt());
check("H2", "a complete, matching receipt is accepted (the control)",
  control.code === 0 && /ACQ_TO_PROMO_HANDOFF_READY/.test(control.stdout),
  control.code === 0 ? "accepted" : `REFUSED: ${control.stderr.trim().split("\n")[0]}`);

/*
 * H4 exists because H3 was not enough, and the gap was found by review rather
 * than by any check here.
 *
 * The batch workflow asserted in a comment that acquired-source/ -- where the
 * acquisition script writes real fetched PDF bytes -- was gitignored. It was
 * not. Nothing in the chain runs `git add`, so no automated path committed a
 * body, and the invariant held by luck: nobody had run the script locally and
 * then committed in that tree. An assertion in a comment is not an ignore
 * rule, and "sourceBodiesCommitted = 0" was being reported on the strength of
 * one.
 *
 * This asks git, which is the only thing that actually decides.
 */
const acquireOut = /const OUT_DIR = path\.resolve\("([^"]+)"\)/.exec(fs.readFileSync(path.join(ROOT, ACQUIRE), "utf8"))?.[1] ?? null;
/*
 * Asked about a FILE inside the directory, not the bare directory name.
 * A `dir/` pattern matches directories only, so `git check-ignore dir` says
 * "not ignored" while `git check-ignore dir/body.pdf` says it is — and the
 * second is the question that decides whether a fetched body can be
 * committed. The first phrasing had this check failing on a rule that works.
 */
const ignored = (dir) => {
  const r = spawnSync("git", ["check-ignore", "-q", `${dir}/a-fetched-source-body.pdf`], { cwd: ROOT });
  return r.status === 0;
};
check("H4", "the directory the acquisition script writes fetched bytes into is actually gitignored",
  Boolean(acquireOut) && ignored(acquireOut),
  acquireOut ? `${acquireOut}/ ${ignored(acquireOut) ? "is ignored" : "is NOT ignored — fetched bytes could be committed"}` : "the acquisition script names no output directory");

check("H3", "no source body is committed by the handoff",
  !/git (add|commit)/.test(fs.readFileSync(path.join(ROOT, MATERIALIZER), "utf8"))
  && /private\/source-acquisition-handoff/.test(fs.readFileSync(path.join(ROOT, MATERIALIZER), "utf8")),
  "the handoff writes under gitignored private storage and runs no git command");

/*
 * H5. Every field the readers dereference is a field the writer writes.
 *
 * C13 found rcap-summarize-source-acquisition-batch.mjs reading officialUrl,
 * url, byteLength, mediaTypeObserved, pageCount and technology -- six names no
 * receipt has ever carried. Every descriptive field it published per acquired
 * source was therefore null, including the URL, the only field that says which
 * document the bytes are. It gated nothing, so it reported COMPLETE over
 * records that named nothing. This is the same defect class as the original
 * materializer bug, one file over from where that was fixed, which is why it is
 * checked by construction now rather than by looking again.
 */
// Both receipt literals the acquire script writes: the success receipt and the
// not_acquired one fail() writes. Shorthand properties (`sha256,`) count --
// the first pass of this check read only `key:` and reported sha256 itself as
// a field nothing writes.
const receiptKeys = new Set();
for (const m of acquireText.matchAll(/receipt(?:\.json`\), `\$\{JSON\.stringify\()?\s*=?\s*\{([\s\S]*?)\n\};/g)) {
  for (const k of m[1].matchAll(/^\s+([A-Za-z][A-Za-z0-9_]*)\s*[,:]/gm)) receiptKeys.add(k[1]);
}
for (const m of acquireText.matchAll(/^\s+([A-Za-z][A-Za-z0-9_]*)\s*[,:]/gm)) {
  // coverage() and the fail() receipt contribute keys too; taking the file's
  // whole object-key vocabulary keeps this check about names nothing writes
  // ANYWHERE, which is the defect, rather than about literal boundaries.
  receiptKeys.add(m[1]);
}
// Keys the readers attach themselves before reading, so they are legitimately
// absent from the receipt on disk.
const READER_ADDED = new Set(["artifact", "receiptFile"]);
const readerFiles = [
  { file: SUMMARIZER, text: fs.readFileSync(path.join(ROOT, SUMMARIZER), "utf8") },
  { file: MATERIALIZER, text: fs.readFileSync(path.join(ROOT, MATERIALIZER), "utf8") }
];
const unknownReads = [];
let totalReads = 0;
for (const { file, text } of readerFiles) {
  for (const m of text.matchAll(/(?<!["'\/])\br\.([A-Za-z][A-Za-z0-9_]*)|(?<!["'\/])\breceipt\.([A-Za-z][A-Za-z0-9_]*)/g)) {
    const key = m[1] ?? m[2];
    if (READER_ADDED.has(key)) continue;
    totalReads += 1;
    if (!receiptKeys.has(key)) unknownReads.push(`${path.basename(file)} reads receipt.${key}`);
  }
}
check("H5", "every receipt field the summarizer and the materializer read is a field the acquisition script writes",
  unknownReads.length === 0 && receiptKeys.size > 10 && totalReads > 10,
  `${receiptKeys.size} receipt key(s) written, ${totalReads} read, ${unknownReads.length} read that are never written: ${[...new Set(unknownReads)].slice(0, 4).join(", ")}`);

/*
 * H6. The host policy, against hosts.
 *
 * `.us` sat on the allowlist under a comment reading "Only first-party
 * government publishers." It is an open-registration TLD, so
 * rcap-forms-mirror.us was an allowlisted official government publisher, and
 * C13 walked a manifest entry repointed at exactly that host through all ten
 * READY_TO_RUN steps green. No check anywhere asked the policy about a host.
 * These vectors live beside the policy so a future widening has to say which of
 * them it means to change.
 */
const wrongVectors = HOST_POLICY_VECTORS.filter((v) => hostAllowed(v.host) !== v.allowed);
check("H6", "the official-host policy admits every government publisher and refuses every open-registration lookalike",
  wrongVectors.length === 0 && HOST_POLICY_VECTORS.length >= 10,
  `${HOST_POLICY_VECTORS.length} vector(s), ${wrongVectors.length} wrong: ${wrongVectors.map((v) => v.host).join(", ")}`);

for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(3)} ${r.title}${r.ok ? "" : `\n         observed: ${r.observed}`}`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} handoff checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const cases = [
    { name: "a receipt with no acquisitionRunId is refused", receipt: { acquisitionRunId: undefined }, expect: /run id does not match/ },
    { name: "a receipt with no artifactName is refused", receipt: { artifactName: undefined }, expect: /artifact name does not match/ },
    { name: "a receipt from a different run is refused", receipt: { acquisitionRunId: "99999999999" }, expect: /run id does not match/ },
    { name: "a receipt naming a different artifact is refused", receipt: { artifactName: "rcap-source-VT-something-else" }, expect: /artifact name does not match/ },
    { name: "a receipt whose hash does not match the bytes is refused", receipt: { sha256: "0".repeat(64) }, expect: /receipt hash does not match/ },
    { name: "a non-numeric run id on the command line is refused", args: { runId: "not-a-run" }, expect: /exact numeric GitHub Actions run id/ },
    { name: "an empty artifact name on the command line is refused", args: { artifactName: "" }, expect: /exact artifact name is required/ },
    { name: "an expected hash that disagrees with the bytes is refused", args: { expected: "1".repeat(64) }, expect: /is not the hash the receipt pins/ },
    /* The eight above all mutate the materializer's inputs. These are C13's:
     * the receipt fields the materializer used to ignore entirely. */
    { name: "the caller cannot choose which of the receipt's two hashes is measured", receipt: { expectedSha256: "9".repeat(64) }, args: { expected: sha }, expect: /the publisher's document is not the document this dispatch expected/ },
    { name: "a receipt whose pinned hash is not the bytes is refused even when the caller names the bytes", receipt: { expectedSha256: "9".repeat(64) }, args: { expected: "9".repeat(64) }, expect: /the publisher's document is not the document this dispatch expected/ },
    { name: "a receipt with no pinned hash is refused", receipt: { expectedSha256: undefined }, expect: /records no expected SHA-256/ },
    { name: "a not_acquired receipt is refused", receipt: { outcome: "not_acquired" }, expect: /only an acquired source can be promoted/ },
    { name: "a hash-mismatch outcome is refused", receipt: { outcome: "acquired_but_not_the_pinned_document" }, expect: /only an acquired source can be promoted/ },
    { name: "a receipt recording its own hash mismatch is refused", receipt: { matchesExpectedSha256: false }, expect: /did not match the pinned hash/ },
    { name: "a receipt describing a different binary is refused", receipt: { binaryFile: "some-other-document.pdf" }, expect: /the artifact body is/ },
    { name: "a receipt saying the bytes are not a PDF is refused", receipt: { looksLikePdf: false }, expect: /not a PDF/ }
  ];
  /* H4 is checked against git itself, so its mutation removes the ignore rule
   * rather than editing a file the check reads. */
  const gitignorePath = path.join(ROOT, ".gitignore");
  const gitignoreOriginal = fs.readFileSync(gitignorePath);
  fs.writeFileSync(gitignorePath, gitignoreOriginal.toString("utf8").split("\n").filter((l) => l.trim() !== `${acquireOut}/`).join("\n"));
  const withoutRule = ignored(acquireOut ?? "acquired-source");
  fs.writeFileSync(gitignorePath, gitignoreOriginal);
  const restored = fs.readFileSync(gitignorePath).equals(gitignoreOriginal);
  console.log(`  ${!withoutRule ? "detected" : "MISSED  "} [removing the ignore rule for ${acquireOut}/ is caught]`);
  console.log(`  ${restored ? "detected" : "MISSED  "} [.gitignore restored byte-for-byte]`);
  if (withoutRule || !restored) { console.error("\nFAIL H4 mutation"); process.exit(1); }
  let allCaught = true;
  for (const c of cases) {
    const p = writeReceipt(c.receipt ?? {});
    const out = materialize(p, c.args ?? {});
    const refused = out.code !== 0 && c.expect.test(out.stderr);
    if (!refused) allCaught = false;
    console.log(`  ${refused ? "detected" : "MISSED  "} [${c.name}]${refused ? "" : ` — exit ${out.code}, said: ${out.stderr.trim().split("\n")[0] || out.stdout.trim()}`}`);
  }
  fs.rmSync(stage, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "private/source-acquisition-handoff"), { recursive: true, force: true });
  /*
   * H1, H5 and H6 had no mutation at all. C13 counted: all eight cases above
   * mutated the materializer and one mutated .gitignore, so the sentence
   * "eight mutations refuse the ways that chain can break" described a chain
   * that zero of them exercised -- and C13 then deleted a link from the acquire
   * step and watched H1 stay green.
   *
   * Each case here edits a real file, reruns this verifier in a child process,
   * and requires the named check to FAIL. Every file is restored byte-for-byte
   * and the restoration is asserted, because a mutation harness that leaves the
   * tree modified is a worse defect than the one it was testing for.
   */
  const rerun = () => {
    const out = spawnSync(process.execPath, [import.meta.filename], { cwd: ROOT, encoding: "utf8" });
    return `${out.stdout ?? ""}${out.stderr ?? ""}`;
  };
  const chainCases = [
    { name: "H1 sees the run id deleted from the STEP that runs the acquisition (C13's exact mutation)",
      file: WORKFLOW, id: "H1",
      edit: (t) => t.replace(/^(\s*)RCAP_ACQUISITION_RUN_ID: \$\{\{ github\.run_id \}\}\n(\s*RCAP_ARTIFACT_NAME)/m, "$2") },
    { name: "H1 sees the artifact name deleted from the acquisition step",
      file: WORKFLOW, id: "H1",
      edit: (t) => t.replace(/^(\s*)RCAP_ARTIFACT_NAME: \$\{\{ matrix\.entry\.artifactName \}\}\n/m, "") },
    { name: "H1 sees upload-artifact renamed away from the planner's name",
      file: WORKFLOW, id: "H1",
      edit: (t) => t.replace("name: ${{ matrix.entry.artifactName }}\n          path: acquired-source/", "name: rcap-source-fixed-name\n          path: acquired-source/") },
    { name: "H1 sees the acquisition script stop recording the run id",
      file: ACQUIRE, id: "H1",
      edit: (t) => t.replace("acquisitionRunId: acquisitionRunId || null", "acquisitionRunId: null") },
    { name: "H5 sees a reader dereference a field no receipt carries",
      file: SUMMARIZER, id: "H5",
      edit: (t) => t.replace("sha256: r.sha256,", "sha256: r.sha256, officialUrlLegacy: r.officialUrl ?? null,") },
    { name: "H6 sees the open-registration TLD put back on the allowlist",
      file: "scripts/lib/official-host-policy.mjs", id: "H6",
      edit: (t) => t.replace('const ALLOWED_HOST_SUFFIXES = [\n  ".gov",', 'const ALLOWED_HOST_SUFFIXES = [\n  ".us",\n  ".gov",') }
  ];
  for (const c of chainCases) {
    const abs = path.join(ROOT, c.file);
    const original = fs.readFileSync(abs);
    const mutated = c.edit(original.toString("utf8"));
    if (mutated === original.toString("utf8")) {
      console.log(`  MISSED   [${c.name}] — the mutation changed nothing; its subject does not exist`);
      allCaught = false;
      continue;
    }
    fs.writeFileSync(abs, mutated);
    const output = rerun();
    fs.writeFileSync(abs, original);
    const restored = fs.readFileSync(abs).equals(original);
    const caught = new RegExp(`FAIL ${c.id}\\b`).test(output);
    if (!caught || !restored) allCaught = false;
    console.log(`  ${caught ? "detected" : "MISSED  "} [${c.name}]${restored ? "" : " — FILE NOT RESTORED"}`);
  }

  if (!allCaught) { console.error("\nFAIL handoff mutations"); process.exit(1); }
  console.log(`\nOK handoff mutations — ${cases.length + chainCases.length} case(s), every mutation refused.`);
} else {
  fs.rmSync(stage, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "private/source-acquisition-handoff"), { recursive: true, force: true });
}

if (results.some((r) => !r.ok)) process.exit(1);
