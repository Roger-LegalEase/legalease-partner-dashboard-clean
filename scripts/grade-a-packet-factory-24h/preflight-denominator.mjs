#!/usr/bin/env node
/**
 * How many checks the packet-build preflight actually runs.
 *
 * Every dispatch tells its workers "it must print PACKET_BUILD_ENVIRONMENT_READY:
 * N/N", and that N was written out by hand in eleven places. Adding a fifteenth
 * check turned all eleven into instructions to expect a number the preflight no
 * longer prints -- and a worker told to expect 14/14 that sees 15/15 has no way
 * to tell an improvement from a regression.
 *
 * So the number is read from the preflight itself, and cross-checked against
 * what the preflight prints when it runs. Two channels, because counting
 * registrations in source is a guess about the code and running it is a fact
 * about one environment; they must agree.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";

/** Registrations counted in the preflight's own source. */
export function declaredCheckCount() {
  const text = fs.readFileSync(path.join(ROOT, PREFLIGHT), "utf8");
  return [...text.matchAll(/^check\(\n\s*"([a-z0-9_]+)"/gm)].map((m) => m[1]);
}

/** What the preflight prints when it runs here. Null when it cannot be run. */
export function observedTotal(family = null) {
  /*
   * The preflight exits non-zero whenever a check fails -- an unclean worktree
   * is enough -- and execFileSync throws on that, which silently turned this
   * cross-check off exactly when the environment was interesting. The summary
   * line is printed either way, so the output is read regardless of exit code.
   */
  let out = null;
  try {
    const args = family ? [PREFLIGHT, "--family", family] : [PREFLIGHT];
    out = execFileSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    out = e?.stdout ? String(e.stdout) : null;
  }
  if (out === null) return null;
  try {
    const m = /PACKET_BUILD_ENVIRONMENT_(?:READY|NOT_READY):\s*(\d+)\/(\d+)\s+passed,\s*(\d+)\s+failed,\s*(\d+)\s+not applicable/.exec(out);
    if (!m) return null;
    // The printed denominator is the APPLICABLE set. Adding the
    // not-applicable ones back recovers the whole roster, which is what the
    // source-side count registers.
    return { applicable: Number(m[2]), skipped: Number(m[4]), roster: Number(m[2]) + Number(m[4]) };
  } catch { return null; }
}

/**
 * The denominator a worker prompt may state, and the proof it is right.
 *
 * `family` scopes the run the way a worker actually invokes it, because the
 * applicable set depends on the invocation: a family-scoped run has no
 * assigned-branch check to make, and counting that absence as a pass is the
 * inflation this exists to prevent.
 */
export function preflightDenominator(family = null) {
  const declared = declaredCheckCount();
  const observed = observedTotal(family);
  if (observed === null) {
    throw new Error("the preflight produced no summary line; no dispatch may state a denominator it could not read");
  }
  if (observed.roster !== declared.length) {
    throw new Error(
      `the preflight registers ${declared.length} checks and accounts for ${observed.roster} `
      + `(${observed.applicable} applicable + ${observed.skipped} not applicable); `
      + "one of the two is wrong and no dispatch may state a denominator until they agree"
    );
  }
  return {
    roster: declared.length,
    applicable: observed.applicable,
    notApplicable: observed.skipped,
    checks: declared,
    mustReturn: "PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing"
  };
}
