// Audits the seven correction branches against the correction index.
//
// The correction cycle's central promise is that it changed the 61 families
// review returned and nothing else. That promise is only worth as much as the
// check behind it, so this compares each branch against the lane head it was
// cut from, family by family, and reports any family that changed without
// being on the list -- or that was on the list and did not change.
//
// An approved family whose bytes moved would silently invalidate its approval;
// a held family whose bytes moved would silently reopen its hold. Both are
// failures here.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRODUCTION = "data/rcap-all50/overlays/production";
const D0_V2 = "b412f543";

const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const gitQuiet = (args) => { try { return git(args); } catch { return null; } };

const index = JSON.parse(fs.readFileSync(
  path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/correction-index.json"), "utf8"));

const approved = new Set(index.preservedTechnicalApproved);
const held = new Set(index.preservedHeldOnSourceOrDesign);

// The D0-v2 commit is cherry-picked onto each lane head, so it carries a
// different sha on every branch and ancestry says nothing. What matters is
// whether the branch carries the corrected tooling, so the blobs are compared
// directly.
const D0_V2_FILES = [
  "scripts/rcap-official-forms/rcap-active-content.mjs",
  "scripts/rcap-official-forms/rcap-contact-sheet.mjs",
  "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
  "scripts/rcap-official-forms/d0-canary-forms.mjs",
  "scripts/rcap-official-forms/d0-canary-verify.mjs",
  "scripts/rcap-official-forms/d0-corpus-flag-audit.mjs"
];
const blobAt = (ref, file) => gitQuiet(["rev-parse", `${ref}:${file}`]);
const d0v2Blobs = Object.fromEntries(D0_V2_FILES.map((f) => [f, blobAt(D0_V2, f)]));

function d0v2ToolingOn(ref) {
  const mismatched = D0_V2_FILES.filter((f) => blobAt(ref, f) !== d0v2Blobs[f]);
  return { carriesD0v2Tooling: mismatched.length === 0, mismatched };
}

const lanes = [];
for (const [lane, route] of Object.entries(index.laneCorrectionBranches)) {
  const from = route.head;
  const to = `origin/${route.to}`;
  const head = gitQuiet(["rev-parse", "--verify", to]);
  if (!head) { lanes.push({ lane, branch: route.to, pushed: false }); continue; }

  const expected = new Set(index.families
    .filter((f) => f.lane === lane && f.rerenderRequired)
    .map((f) => `${f.stateSlug}/${f.familyId.split(":")[1]}`));

  // Which families' bytes actually moved between the reviewed lane head and
  // the correction branch.
  const changedFiles = (gitQuiet(["diff", "--name-only", from, to, "--", PRODUCTION]) ?? "")
    .split("\n").filter(Boolean);
  const changedFamilies = new Set();
  const stateLevelFiles = [];
  for (const p of changedFiles) {
    const m = p.match(new RegExp(`^${PRODUCTION}/([^/]+)/([^/]+)/`));
    if (m) changedFamilies.add(`${m[1]}/${m[2]}`);
    else stateLevelFiles.push(p);
  }

  const unexpected = [...changedFamilies].filter((f) => !expected.has(f)).sort();
  const missing = [...expected].filter((f) => !changedFamilies.has(f)).sort();

  // Map any unexpected change back to the disposition it would have broken.
  const familyIdOf = (slugPath) => {
    const fam = index.preservedTechnicalApproved.concat(index.preservedHeldOnSourceOrDesign)
      .find((id) => slugPath.endsWith(`/${id.split(":")[1]}`));
    return fam ?? null;
  };
  const brokenApprovals = unexpected.map(familyIdOf).filter((id) => id && approved.has(id));
  const brokenHolds = unexpected.map(familyIdOf).filter((id) => id && held.has(id));

  lanes.push({
    lane,
    branch: route.to,
    pushed: true,
    head,
    fromLaneHead: from,
    ...d0v2ToolingOn(to),
    expectedRerender: expected.size,
    familiesChanged: changedFamilies.size,
    stateLevelFilesChanged: stateLevelFiles.length,
    unexpectedlyChanged: unexpected,
    expectedButUnchanged: missing,
    approvalsBroken: brokenApprovals,
    holdsBroken: brokenHolds,
    pass: unexpected.length === 0 && missing.length === 0 && d0v2ToolingOn(to).carriesD0v2Tooling
  });
}

const totals = {
  branchesPushed: lanes.filter((l) => l.pushed).length,
  branchesWithD0v2Tooling: lanes.filter((l) => l.carriesD0v2Tooling).length,
  familiesExpected: lanes.reduce((n, l) => n + (l.expectedRerender ?? 0), 0),
  familiesChanged: lanes.reduce((n, l) => n + (l.familiesChanged ?? 0), 0),
  unexpectedChanges: lanes.reduce((n, l) => n + (l.unexpectedlyChanged?.length ?? 0), 0),
  expectedButUnchanged: lanes.reduce((n, l) => n + (l.expectedButUnchanged?.length ?? 0), 0),
  approvalsPreserved: approved.size,
  approvalsBroken: lanes.reduce((n, l) => n + (l.approvalsBroken?.length ?? 0), 0),
  holdsPreserved: held.size,
  holdsBroken: lanes.reduce((n, l) => n + (l.holdsBroken?.length ?? 0), 0)
};

const out = { schema: "rcap-d-corrections-v2-audit/v1", d0v2: D0_V2, totals, lanes };
const outPath = path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/corrections-audit.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);

console.log(JSON.stringify(totals, null, 2));
for (const l of lanes) {
  console.log(`${l.pass === true ? "PASS" : (l.pushed ? "FAIL" : "MISSING")}  ${l.lane}  ${l.branch}  `
    + `changed=${l.familiesChanged ?? "-"}/${l.expectedRerender ?? "-"}  d0v2Tooling=${l.carriesD0v2Tooling ?? "-"}`);
  for (const f of l.unexpectedlyChanged ?? []) console.log(`        UNEXPECTED ${f}`);
  for (const f of l.expectedButUnchanged ?? []) console.log(`        EXPECTED BUT UNCHANGED ${f}`);
}
const allPass = lanes.every((l) => l.pass === true);
console.log(allPass ? "\nAUDIT PASSED" : "\nAUDIT FAILED");
process.exitCode = allPass ? 0 : 1;
