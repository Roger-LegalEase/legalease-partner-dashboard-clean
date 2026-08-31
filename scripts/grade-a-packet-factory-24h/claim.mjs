#!/usr/bin/env node
/** The single fail-closed claim mechanism for packet families and source obligations. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const DEFAULT_LEDGER = "data/rcap-grade-a/packet-factory-24h/claim-ledger.json";
export const CLOSED_LANE_KINDS = Object.freeze([
  "packet-build", "independent-verification", "repair", "shared-host-repair",
  "source-discovery", "source-reconciliation", "source-acquisition", "source-promotion"
]);
export const LANE_KIND = (lane) => {
  if (/^(VF|WARV|P2V|VS)/.test(lane)) return "independent-verification";
  if (/^(FIX|WAR0[34])/.test(lane)) return "repair";
  if (/^PF/.test(lane)) return "packet-build";
  if (/^WAR01/.test(lane)) return "shared-host-repair";
  if (/^DISC/.test(lane)) return "source-discovery";
  if (/^SRC/.test(lane) || /^WAR02/.test(lane)) return "source-reconciliation";
  if (/^ACQ/.test(lane)) return "source-acquisition";
  if (/^PROMO/.test(lane)) return "source-promotion";
  return "unknown";
};
export const DIGEST_FIELDS = Object.freeze(["subjectType", "subjectId", "itemId", "familyId", "familyIds", "sourceId", "operation", "lane", "laneKind", "released", "releasedAt"]);
export const claimsDigest = (rows) => crypto.createHash("sha256").update(JSON.stringify(rows.map((row) => DIGEST_FIELDS.map((field) => row[field] ?? null)))).digest("hex");

const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
const die = (code, message) => { console.error(message); process.exit(code); };
const read = (ledgerPath) => {
  const absolute = path.resolve(ROOT, ledgerPath);
  if (!fs.existsSync(absolute)) die(3, `CLAIM_LEDGER_ABSENT: ${ledgerPath}`);
  return { absolute, ledger: JSON.parse(fs.readFileSync(absolute, "utf8")) };
};
function validate(ledger) {
  if (ledger.schemaVersion !== "rcap-claim-ledger/v2") die(12, `UNKNOWN_LEDGER_SCHEMA: ${ledger.schemaVersion}`);
  if (!ledger.claimsDigest) die(10, "LEDGER_HAS_NO_DIGEST");
  if (JSON.stringify(ledger.laneKinds) !== JSON.stringify(CLOSED_LANE_KINDS)) die(13, "UNDECLARED_LANE_KIND: ledger vocabulary is not the closed vocabulary");
  if ((ledger.claims ?? []).some((c) => !CLOSED_LANE_KINDS.includes(c.laneKind))) die(13, "UNDECLARED_LANE_KIND: a grant uses an unknown kind");
  const digest = claimsDigest(ledger.claims ?? []);
  if (digest !== ledger.claimsDigest) die(11, `LEDGER_DIGEST_MISMATCH: expected ${ledger.claimsDigest}, computed ${digest}`);
  if (!ledger.generatedAtCommit || git(["cat-file", "-e", `${ledger.generatedAtCommit}^{commit}`]) === null) die(5, `LEDGER_BASE_NOT_IN_CHECKOUT: ${ledger.generatedAtCommit ?? "missing"}`);
  const seen = new Set();
  for (const c of ledger.claims ?? []) {
    const key = `${c.subjectType}\0${c.subjectId}\0${c.operation}`;
    if (seen.has(key)) die(7, `AMBIGUOUS_GRANT: duplicate subject and operation ${c.subjectId} ${c.operation}`);
    seen.add(key);
  }
  return digest;
}
function locate(ledger, lane, subjectId) {
  const kind = LANE_KIND(lane);
  if (kind === "unknown") die(4, `UNKNOWN_LANE: ${lane}`);
  const expectedType = kind.startsWith("source-") ? "source-obligation" : "packet-family";
  const candidates = (ledger.claims ?? []).filter((c) => c.subjectType === expectedType && c.subjectId === subjectId && c.laneKind === kind);
  if (candidates.length === 0) die(6, `NOT_GRANTED: no ${kind} lane holds ${subjectId}`);
  if (candidates.length > 1) die(7, `AMBIGUOUS_GRANT: ${subjectId}`);
  if (candidates[0].lane !== lane) die(8, `GRANTED_ELSEWHERE: ${subjectId} is granted to ${candidates[0].lane}, not ${lane}`);
  return candidates[0];
}
function assertClaim(ledgerPath, lane, subjectId) {
  const { ledger } = read(ledgerPath); const digest = validate(ledger); const grant = locate(ledger, lane, subjectId);
  if (grant.released) die(9, `ALREADY_RELEASED: ${subjectId} at ${grant.releasedAt}`);
  console.log(`CLAIM_OK ${lane} ${subjectId} (${grant.laneKind}, grant set ${digest.slice(0, 16)})`);
}
function release(ledgerPath, lane, subjectId) {
  const { absolute, ledger } = read(ledgerPath); validate(ledger); const grant = locate(ledger, lane, subjectId);
  if (grant.released) die(9, `ALREADY_RELEASED: ${subjectId}`);
  grant.released = true; grant.releasedAt = new Date().toISOString();
  ledger.releases = [...(ledger.releases ?? []), { lane, subjectType: grant.subjectType, subjectId, operation: grant.operation, laneKind: grant.laneKind, releasedAt: grant.releasedAt }];
  ledger.claimsDigest = claimsDigest(ledger.claims);
  fs.writeFileSync(absolute, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`RELEASED ${lane} ${subjectId}`);
}
function status(ledgerPath, lane) {
  const { ledger } = read(ledgerPath); validate(ledger);
  const claims = ledger.claims.filter((c) => (!lane || c.lane === lane) && !c.released);
  console.log(`${claims.length} live grant(s)${lane ? ` for ${lane}` : ""}`);
  for (const c of claims.slice(0, 40)) console.log(`  ${c.lane.padEnd(10)} ${c.laneKind.padEnd(25)} ${c.subjectId}`);
}

const args = process.argv.slice(2); let ledgerPath = DEFAULT_LEDGER;
const li = args.indexOf("--ledger"); if (li >= 0) { ledgerPath = args[li + 1]; args.splice(li, 2); }
const [mode, lane, subjectId] = args;
if (mode === "--assert" && lane && subjectId) assertClaim(ledgerPath, lane, subjectId);
else if (mode === "--release" && lane && subjectId) release(ledgerPath, lane, subjectId);
else if (mode === "--status") status(ledgerPath, lane);
else die(2, "usage: claim.mjs [--ledger path] --assert|--release <LANE> <familyId|itemId> | --status [LANE]");
