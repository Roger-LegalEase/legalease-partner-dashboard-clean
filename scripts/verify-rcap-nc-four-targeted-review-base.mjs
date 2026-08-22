#!/usr/bin/env node
// The bounded check for the four-family targeted review base.
//
//   node scripts/verify-rcap-nc-four-targeted-review-base.mjs
//
// Deliberately narrow. Forty-eight families hold approvals over bytes nobody has
// touched, and re-deriving their evidence here would spend a great deal of work
// re-proving what is already proven — and risk disturbing it. So this asks only
// the questions the four corrected families raise, plus one question about the
// 48: are their approvals still binding?
//
// The substantive question for these four is inverted from every other family on
// the board. Everywhere else evidence proves an artifact is right. Here it has to
// prove the artifact is ABSENT: a court-designated non-filing translation must
// carry no participant values at all, so a raster of a participant artifact would
// be evidence that the defect survived.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NC = "data/rcap-all50/overlays/production/north-carolina";
const FREEZE = "0ed171216480b43f6e67848f1a3b3947caf59641";
const SIDECAR_DIR = "data/rcap-all50/gate-b-sidecars/nc-four-terminal";
const VISUAL_DIR = "docs/record-clearing/pdf-visual-evidence/nc-four-terminal";
const CONSUMPTION = "data/rcap-all50/pdf-review-consumption.json";
const DISPATCH = "data/rcap-all50/pdf-nc-four-freeze-dispatch.json";

const EXPECTED = [
  "NC:aoc-cr-287-form-es", "NC:aoc-cr-287-form-vi",
  "NC:aoc-cr-288-form-es", "NC:aoc-cr-288-form-vi"
];
const ENGLISH = [`${NC}/aoc-cr-287-form-en`, `${NC}/aoc-cr-288-form-en`];

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));
const sha256 = (p) => (fs.existsSync(abs(p))
  ? crypto.createHash("sha256").update(fs.readFileSync(abs(p))).digest("hex") : null);
const git = (...a) => execFileSync("git", a, { cwd: rootDir, maxBuffer: 1 << 28 }).toString().trim();

const problems = [];
const ok = [];
const check = (cond, pass, failMsg) => (cond ? ok.push(pass) : problems.push(failMsg));

// 1 — the implementation the evidence describes has not moved.
{
  const moved = git("diff", "--name-only", FREEZE, "HEAD", "--", "data/rcap-all50/overlays/production")
    .split("\n").filter(Boolean).filter((p) => !p.endsWith("artifact-provenance.json"));
  check(moved.length === 0, "no implementation byte moved since the freeze",
    `${moved.length} implementation path(s) moved since the freeze: ${moved.slice(0, 3).join(", ")}`);
  for (const dir of ENGLISH) {
    const e = git("diff", "--name-only", FREEZE, "HEAD", "--", dir).split("\n").filter(Boolean);
    check(e.length === 0, `${path.basename(dir)} unchanged`, `${dir} moved ${e.length} path(s)`);
  }
}

// 2 — the correction actually holds on disk: nothing participant-bearing left.
for (const familyId of EXPECTED) {
  const dir = `${NC}/${familyId.split(":").pop()}`;
  const participant = ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf",
    "contact-sheet/blank-vs-filled.pdf", "fixtures/negative.json",
    "contact-sheet/contact-sheet-proof.json", "reports/protected-fields-scan.json"]
    .filter((rel) => fs.existsSync(abs(`${dir}/${rel}`)));
  check(participant.length === 0, `${familyId} carries no participant artifact or stale proof`,
    `${familyId} still carries ${participant.length}: ${participant.join(", ")}`);
}

// 3 — both legs cover exactly the same four families, no more and no fewer.
const sidecarFamilies = new Set();
const visualFamilies = new Set();
for (const familyId of EXPECTED) {
  const dir = `${NC}/${familyId.split(":").pop()}`;
  if (fs.existsSync(abs(`${dir}/artifact-provenance.json`))) sidecarFamilies.add(familyId);
}
if (fs.existsSync(abs(VISUAL_DIR))) {
  for (const file of fs.readdirSync(abs(VISUAL_DIR)).filter((f) => f.endsWith(".json"))) {
    let body;
    try { body = readJson(`${VISUAL_DIR}/${file}`); } catch { continue; }
    if (body.familyId) visualFamilies.add(body.familyId);
  }
}
check(sidecarFamilies.size === 4, "sidecar leg covers exactly 4 families", `sidecar leg covers ${sidecarFamilies.size}`);
check(visualFamilies.size === 4, "visual leg covers exactly 4 families", `visual leg covers ${visualFamilies.size}`);
const same = EXPECTED.every((f) => sidecarFamilies.has(f) && visualFamilies.has(f));
check(same, "both legs cover the identical family set",
  `the two legs disagree — sidecars ${[...sidecarFamilies].join(",")} vs visual ${[...visualFamilies].join(",")}`);

// 4 — both legs bind THIS freeze, and agree with it on the source digest.
{
  const dispatch = readJson(DISPATCH);
  const bySource = new Map(dispatch.families.map((f) => [f.familyId, f.sourceSha256]));
  for (const familyId of EXPECTED) {
    const dir = `${NC}/${familyId.split(":").pop()}`;
    const sidecar = fs.existsSync(abs(`${dir}/artifact-provenance.json`))
      ? readJson(`${dir}/artifact-provenance.json`) : null;
    check(sidecar != null, `${familyId} has a current terminal sidecar`, `${familyId} has no sidecar`);
    if (sidecar) {
      const blob = JSON.stringify(sidecar);
      check(blob.includes(FREEZE), `${familyId} sidecar binds the corrected freeze`,
        `${familyId} sidecar does not name freeze ${FREEZE.slice(0, 12)}`);
      const want = bySource.get(familyId);
      if (want) {
        check(blob.includes(want), `${familyId} sidecar carries the freeze's source digest`,
          `${familyId} sidecar does not carry the source digest the freeze pins`);
      }
    }
    const visual = fs.existsSync(abs(VISUAL_DIR))
      ? fs.readdirSync(abs(VISUAL_DIR)).filter((f) => f.endsWith(".json"))
        .map((f) => readJson(`${VISUAL_DIR}/${f}`)).find((b) => b.familyId === familyId)
      : null;
    check(visual != null, `${familyId} has a current terminal visual manifest`, `${familyId} has no visual manifest`);
    if (visual) {
      const blob = JSON.stringify(visual);
      check(blob.includes(FREEZE), `${familyId} visual manifest binds the corrected freeze`,
        `${familyId} visual manifest does not name freeze ${FREEZE.slice(0, 12)}`);
      const want = bySource.get(familyId);
      if (want) {
        check(blob.includes(want), `${familyId} visual manifest carries the freeze's source digest`,
          `${familyId} visual manifest does not carry the source digest the freeze pins`);
      }
    }
  }
}

// 5 — the 48 approvals still bind the bytes they were given.
{
  const consumption = readJson(CONSUMPTION);
  const approved = consumption.rows.filter((r) => r.verdict === "approved_platform_ready");
  const drifted = approved.filter((r) => !r.pinsStillMatching);
  // Count asserted as an invariant, not a snapshot. This read "48" while the four
  // were still under review; once they were approved the same healthy state
  // failed the check. What must hold is that every reviewed outcome is approved
  // and still binding, whatever the running total.
  const rejected = consumption.rows.filter((r) => r.verdict !== "approved_platform_ready");
  check(rejected.length === 0, `all ${consumption.rows.length} reviewed outcomes are approved`,
    `${rejected.length} reviewed outcome(s) are not approved: ${rejected.slice(0, 3).map((r) => r.familyId).join(", ")}`);
  check(drifted.length === 0, `all ${approved.length} approvals still bind their reviewed bytes`,
    `${drifted.length} approval(s) no longer bind: ${drifted.slice(0, 3).map((r) => r.familyId).join(", ")}`);
}

for (const line of ok) console.log(`  ok   ${line}`);
if (problems.length) {
  console.error(`\nverify-rcap-nc-four-targeted-review-base FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}
console.log(`\nOK nc-four targeted review base — ${ok.length} checks hold: implementation unmoved since ${FREEZE.slice(0, 12)}, ` +
  "both evidence legs cover the identical four families and bind this freeze and its source digests, no participant artifact or stale proof survives, and all 48 approvals still bind.");
