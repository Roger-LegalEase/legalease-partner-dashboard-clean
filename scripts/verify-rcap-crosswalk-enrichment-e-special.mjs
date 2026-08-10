// Lane verifier for the E-SPECIAL evidence package.
//
// Enforces the special-lane contract on data/rcap-ledger/e2-evidence/E-SPECIAL.json:
// no forced statute equivalence, no fee provision promoted to relief authority,
// no new-track proposal without a distinct mechanism, no denominator decision
// without evidence, no secondary source treated as primary authority, and no
// unresolved record without its exact missing evidence. Repository sources must
// resolve (pinned `path@ref` sources resolve at the ref), and a lane that
// recorded no web access may not cite the web.
//
//   node scripts/verify-rcap-crosswalk-enrichment-e-special.mjs
//
// Not wired into package.json — Terminal A owns shared test-chain wiring.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = path.join(rootDir, "data/rcap-ledger/e2-evidence/E-SPECIAL.json");

const failures = [];
const checks = [];
function check(name, condition, detail) {
  if (condition) checks.push(name);
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

if (!fs.existsSync(evidencePath)) {
  console.error("Missing data/rcap-ledger/e2-evidence/E-SPECIAL.json");
  process.exit(1);
}
const doc = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const findings = doc.findings || [];

const EXPECTED_SUBJECT_KEYS = [
  "E-SPECIAL-AK-as-12-55-085",
  "E-SPECIAL-LA-trafficking-fee-exempt",
  "E-SPECIAL-MS-dui-nonadjudication",
  "E-SPECIAL-PA-rule-490-790",
  "E-SPECIAL-PA-vacatur",
  "E-SPECIAL-SD-juvenile-pins",
];

check(
  "all six special subjects are present exactly once",
  findings.length === 6 &&
    JSON.stringify(findings.map((f) => f.jobId).sort()) === JSON.stringify([...EXPECTED_SUBJECT_KEYS].sort()),
  findings.map((f) => f.jobId).join(", ")
);
check("the lane pins its frozen inputs", Boolean(doc.baseCommit) && Boolean(doc.queueSha256) && Boolean(doc.e2ContentHash));

// --- statute-equivalence guard -------------------------------------------------
// AS 12.55.078 and AS 12.55.085 must never be equated: the AK finding may not
// map the pathway onto ak-sej, and its text must distinguish the mechanisms.
const ak = findings.find((f) => f.jobId === "E-SPECIAL-AK-as-12-55-085");
check(
  "no forced statute equivalence (AK 12.55.078 vs 12.55.085)",
  Boolean(ak) &&
    !JSON.stringify(ak.proposedMapping ?? null).includes("ak-sej") &&
    /different mechanism|distinct/i.test(String(ak.statuteDistinction ?? "")) &&
    ak.proposedDisposition !== "mapped_to_registry_track",
  "the AK finding equates or maps the two statutes"
);

// --- fee-vs-relief guard -------------------------------------------------------
// The LA finding must name a relief authority that is not a fee provision, and
// must explicitly classify the fee material as non-relief.
const la = findings.find((f) => f.jobId === "E-SPECIAL-LA-trafficking-fee-exempt");
check(
  "no fee provision treated as relief authority",
  Boolean(la) &&
    /97[78]/.test(String(la.operativeAuthority?.citation ?? "")) &&
    !/983/.test(String(la.operativeAuthority?.citation ?? "")) &&
    /not relief authority/i.test(String(la.authorityClassification ?? "")),
  "the LA finding's operative authority is missing, is a fee provision, or fails to distinguish fee from relief"
);

// --- new-track guard -----------------------------------------------------------
// Any proposedRegistryTrack must carry a distinct mechanism rationale; and no
// finding may alter the denominator: every denominatorEffect must exist and
// must start from no change by this lane.
for (const f of findings) {
  if (f.proposedRegistryTrack) {
    check(
      `${f.jobId}: new-track proposal carries a distinct mechanism`,
      Boolean(f.proposedRegistryTrack.mechanismAuthority?.length) && Boolean(f.proposedRegistryTrack.why),
      "proposal lacks mechanismAuthority or rationale"
    );
  }
}
check(
  "no denominator decision without evidence",
  findings.every(
    (f) => /^none/i.test(String(f.denominatorEffect ?? "")) && (f.evidence ?? []).length >= 2
  ),
  "a finding changes the denominator or decides it on thin evidence"
);

// --- secondary-source guard ----------------------------------------------------
// A secondary source (advocacy summary, practice guide) may appear only inside
// an absence proof or as context; no resolved mapping may rest on one, and any
// finding whose evidence names a known secondary source must either be
// unresolved or carry independent primary/committed support.
const SECONDARY_MARKERS = [/community legal services/i, /clsphila/i, /advocacy/i, /practice guide/i, /justia/i, /nolo/i];
for (const f of findings) {
  const secondaryItems = (f.evidence ?? []).filter((e) =>
    SECONDARY_MARKERS.some((rx) => rx.test(String(e.quote ?? "") + String(e.value ?? "")))
  );
  if (secondaryItems.length > 0 && f.outcome !== "unresolved") {
    const independent = (f.evidence ?? []).length > secondaryItems.length;
    check(`${f.jobId}: secondary source not treated as primary authority`, independent, "only secondary support");
  }
}
const pk = findings.find((f) => f.jobId === "E-SPECIAL-PA-vacatur");
check(
  "the PA vacatur finding does not promote its secondary source",
  Boolean(pk) && pk.outcome === "unresolved" && pk.proposedMapping === null && String(pk.operativeAuthority?.citation) === "not established",
  "path-k resolved on a secondary source"
);

// --- unresolved guard ----------------------------------------------------------
check(
  "every unresolved record names exact missing evidence",
  findings.filter((f) => f.outcome === "unresolved").every((f) => (f.exactMissingEvidence ?? []).length >= 1),
  "an unresolved finding has no exactMissingEvidence"
);
check(
  "every resolved or terminal record has an approval owner and runtime/denominator effects",
  findings.every((f) => f.approvalOwner && f.runtimeEffect && f.denominatorEffect && f.currentness),
  "a finding is missing required treatment fields"
);

// --- evidence hygiene (mirrors the intake contract) ---------------------------
check(
  "every finding carries at least two evidence entries",
  findings.every((f) => (f.evidence ?? []).length >= 2),
  "a finding has fewer than two evidence entries"
);
const webless = doc.webAccessAvailable === false;
for (const f of findings) {
  for (const e of f.evidence ?? []) {
    const src = String(e.source ?? "");
    if (/^https?:/i.test(src)) {
      check(`${f.jobId}: no web citation from a webless lane`, !webless, src);
      continue;
    }
    const token = src.split(/[\s(]/)[0].replace(/[,;]$/, "");
    const pinned = /^(.+?)@([0-9a-f]{7,40})$/.exec(token);
    if (pinned) {
      let ok = true;
      try {
        execFileSync("git", ["cat-file", "-e", `${pinned[2]}:${pinned[1]}`], { cwd: rootDir, stdio: "ignore" });
      } catch {
        ok = false;
      }
      check(`${f.jobId}: pinned source resolves (${pinned[1].slice(0, 40)})`, ok, `${token} does not resolve`);
    } else {
      check(
        `${f.jobId}: source resolves in tree (${token.slice(0, 40)})`,
        fs.existsSync(path.join(rootDir, token)),
        `${token} missing`
      );
    }
  }
}

// --- report --------------------------------------------------------------------
for (const name of checks) console.log(`  ok  ${name}`);
if (failures.length > 0) {
  console.error("\nE-SPECIAL verification failed:");
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
console.log(`\n${checks.length} checks passed.`);
console.log(`findings     ${findings.length}`);
console.log(`resolved     ${findings.filter((f) => f.outcome === "resolved").length}`);
console.log(`terminal     ${findings.filter((f) => f.outcome === "terminal").length}`);
console.log(`unresolved   ${findings.filter((f) => f.outcome === "unresolved").length}`);
