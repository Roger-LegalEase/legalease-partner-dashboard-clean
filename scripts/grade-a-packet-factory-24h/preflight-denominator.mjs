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

/*
 * The invocation, because the denominator is a property of the COMMAND and not
 * of the preflight.
 *
 * This took a string family id and ran the preflight with no other flag, and
 * every worker prompt was told to expect that number. But a worker runs
 * --codex-cloud, and cloud mode REPLACES three checks rather than waiving them,
 * so nothing is not-applicable and the roster is fully applicable: the
 * preflight prints 15 where this computed 14. Every builder and verifier prompt
 * has been instructing workers to expect a number their own command does not
 * print.
 *
 * A string is still accepted so an existing caller means what it always meant;
 * an array is the invocation verbatim.
 */
export function invocationArgs(invocation) {
  if (invocation === null || invocation === undefined) return [];
  if (Array.isArray(invocation)) return invocation;
  return ["--family", String(invocation)];
}

/** What the preflight prints when it runs here. Null when it cannot be run. */
export function observedTotal(invocation = null) {
  /*
   * The preflight exits non-zero whenever a check fails -- an unclean worktree
   * is enough -- and execFileSync throws on that, which silently turned this
   * cross-check off exactly when the environment was interesting. The summary
   * line is printed either way, so the output is read regardless of exit code.
   */
  let out = null;
  try {
    const args = [PREFLIGHT, ...invocationArgs(invocation)];
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
/*
 * Memoized on the invocation. The denominator is a fact about a COMMAND, and a
 * generator writing forty-eight prompts asks for the same handful of commands
 * over and over -- each answer costing a full preflight run against the corpus.
 * Uncached, generating the dispatch took longer than the two minutes anyone
 * would wait, which is its own kind of wrong answer.
 */
const denominatorCache = new Map();

export function preflightDenominator(invocation = null) {
  const key = invocationArgs(invocation).join(" ");
  if (denominatorCache.has(key)) return denominatorCache.get(key);
  const declared = declaredCheckCount();
  const observed = observedTotal(invocation);
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
  const result = {
    roster: declared.length,
    applicable: observed.applicable,
    notApplicable: observed.skipped,
    checks: declared,
    mustReturn: `PACKET_BUILD_ENVIRONMENT_READY: ${observed.applicable}/${observed.applicable}`
  };
  denominatorCache.set(key, result);
  return result;
}

/**
 * The denominator for a COMMAND STRING, so a prompt's number and the command
 * printed beside it cannot drift apart.
 *
 * The lane gate and the row gate are different invocations -- the lane gate has
 * no --family and prints 14/14, the row gate has one and prints 15/15 -- and a
 * generator that computed one number stamped it on both. Passing the same
 * string the prompt shows the worker removes the chance to get it wrong: if the
 * command changes, the number follows.
 *
 * Placeholders are substituted with a probe value, because <FAMILY_ID> is what
 * the worker replaces and its identity does not change the roster.
 */
export function denominatorForCommand(command) {
  if (!/verify-packet-build-environment\.mjs/.test(command)) {
    throw new Error(`not a packet-build preflight invocation, so it has no denominator: ${command.slice(0, 60)}`);
  }
  const args = [];
  if (/--family\s+\S/.test(command)) args.push("--family", "__denominator_probe__");
  if (/--codex-cloud/.test(command)) args.push("--codex-cloud");
  return preflightDenominator(args);
}
