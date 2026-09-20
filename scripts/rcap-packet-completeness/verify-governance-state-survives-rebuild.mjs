#!/usr/bin/env node
/**
 * A rebuild must not silently erase a family's governance state.
 *
 * `product-wiring.json` is regenerated wholesale by whatever writes it. Six keys
 * on its `binding` are not authored by that write -- acceptanceReceipt,
 * lastIndependentVerification, paymentEligible, sponsorshipEligible,
 * whyPaymentIsClosed, maintenanceRelationship -- and a plain rebuild was
 * dropping all six. FIX07 lost a hash-bound RASTER_PASS receipt that way on
 * mn_petition_15218-set; FIX02 reproduced the identical loss on the untouched
 * mn_petition_juvenile_as_adult-set script, with byte-identical fixtures either
 * side. Nothing downstream reported either one, because the fixtures did not
 * move: the loss is visible only by diffing this file against the commit.
 *
 * So that is what this does. Compare every product-wiring.json in the working
 * tree against the same file at HEAD, and fail on any of the six that HEAD
 * carries and the tree does not. A receipt recorded under
 * `acceptanceReceiptWithdrawn` is PRESERVED, not lost -- withdrawal with both
 * digests is the correct outcome when the canonical bytes move, and this check
 * exists to distinguish it from deletion.
 *
 * It says nothing about whether a value is CORRECT. It never asks a build to
 * decide paymentEligible, and it never asks anyone to re-issue a receipt: only
 * the central raster workflow issues one. It asks one question -- did this write
 * throw away what the record already said.
 *
 *   node scripts/rcap-packet-completeness/verify-governance-state-survives-rebuild.mjs
 *   node ... --against <ref>        compare against a ref other than HEAD
 *   node ... --family <familyId>    restrict to one family
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { GOVERNANCE_KEYS, governanceLostBetween } from "./governance-preservation.mjs";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const AGAINST = flag("--against") ?? "HEAD";
const ONLY_FAMILY = flag("--family");

const wirings = execFileSync("git", ["ls-files", "data/rcap-all50/overlays/census-v1/*/*/product-wiring.json"],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }).trim().split("\n").filter(Boolean);
if (wirings.length === 0) {
  throw new Error("git ls-files matched zero product-wiring.json records; the denominator is broken, not the tree");
}

let checked = 0, carryingGovernance = 0, withdrawalsSeen = 0;
const lost = [];
const notMeasured = [];

for (const rel of wirings) {
  let head;
  try { head = JSON.parse(execFileSync("git", ["show", `${AGAINST}:${rel}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })); }
  catch { continue; /* new file at this ref: nothing could have been lost */ }
  const beforeBinding = head.binding ?? null;
  if (ONLY_FAMILY && head.familyId !== ONLY_FAMILY && !rel.includes(ONLY_FAMILY)) continue;
  checked++;
  if (!beforeBinding) continue;
  const held = GOVERNANCE_KEYS.filter((k) => beforeBinding[k] !== undefined);
  if (held.length === 0) continue;
  carryingGovernance++;

  /*
   * A file that is not on disk was not rebuilt -- it was never checked out.
   * Sparse checkout is the norm in this operation: this lane's own worktree
   * materialises two states of fifty-one. Reporting 286 absent records as
   * ERASED would teach every reader to ignore the check, which costs more than
   * the defect it is written for. Absence is a hole in the MEASUREMENT and the
   * exit code turns only on records that are present and have lost something.
   */
  const absolute = path.join(ROOT, rel);
  if (!fs.existsSync(absolute)) {
    notMeasured.push({ rel, why: "not present in the working tree; a file that was never checked out was never rebuilt" });
    continue;
  }
  let now;
  try { now = JSON.parse(fs.readFileSync(absolute, "utf8")); }
  catch (e) {
    notMeasured.push({ rel, why: `present but unreadable (${e.message.slice(0, 60)}); this check cannot tell a truncated checkout from a rebuild` });
    continue;
  }
  if (Array.isArray(now.binding?.acceptanceReceiptWithdrawn)) withdrawalsSeen += now.binding.acceptanceReceiptWithdrawn.length;
  else if (now.binding?.acceptanceReceiptWithdrawn) withdrawalsSeen++;

  const gone = governanceLostBetween(beforeBinding, now.binding ?? {});
  if (gone.length) lost.push({ rel, familyId: head.familyId ?? null, gone });
}

console.log(`product-wiring records compared against ${AGAINST}: ${checked} · carrying governance state: ${carryingGovernance} · withdrawn receipts on the record: ${withdrawalsSeen}`);
if (notMeasured.length) {
  console.log(`\nNOT MEASURED: ${notMeasured.length} record(s) carrying governance state are not readable here, so this run says nothing about them.`);
  for (const n of notMeasured.slice(0, 5)) console.log(`  ${n.rel}\n    ${n.why}`);
  if (notMeasured.length > 5) console.log(`  ... and ${notMeasured.length - 5} more`);
  console.log("  If that is a sparse checkout, widen it and re-run before trusting this result.");
}
if (lost.length === 0) {
  console.log(notMeasured.length
    ? `EVERY_GOVERNANCE_KEY_SURVIVED_WHERE_MEASURABLE (${notMeasured.length} not measured)`
    : "EVERY_GOVERNANCE_KEY_SURVIVED");
  process.exit(0);
}
console.log(`\nERASED BY A REBUILD: ${lost.length} record(s)`);
for (const l of lost) {
  console.log(`  ${l.rel}${l.familyId ? ` (${l.familyId})` : ""}`);
  for (const g of l.gone) console.log(`    lost: ${g.key} — ${g.why}`);
}
console.log("\nEach one is a governance fact deleted by a write that never mentions it, and paymentEligible: false is a "
  + "commercial guard: losing it removes the record that a route is closed. Route the write through "
  + "preserveGovernanceState() in scripts/rcap-packet-completeness/governance-preservation.mjs, restore the values "
  + "verbatim from the ref above, or -- where the canonical bytes genuinely moved -- record the receipt under "
  + "acceptanceReceiptWithdrawn with both digests. Do not re-state a receipt by hand and do not decide "
  + "paymentEligible here.");
process.exit(1);
