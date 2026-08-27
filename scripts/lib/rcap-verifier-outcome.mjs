import { spawnSync } from "node:child_process";

const UNAVAILABLE = /(?:\bSKIPPED\b|requires (?:a local PostgreSQL toolchain|native PostgreSQL or the installed PGlite fallback)|no ephemeral PostgreSQL available|No isolated PostgreSQL runtime is available|PGlite command \d+ (?:timed out|returned an invalid response)|ERR_MODULE_NOT_FOUND|Cannot find (?:module|package) ['"]@electric-sql\/pglite|\b(?:EACCES|ENOSPC)\b)/i;

function matches(pattern, value) {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

export function classifyVerifierOutcome({ status, signal = null, error = null, output = "" }, passPattern, failPattern) {
  if (error || signal || UNAVAILABLE.test(output)) return "unavailable";
  if (status === 0) return matches(passPattern, output) ? "green" : "invalid";
  return matches(failPattern, output) ? "red" : "invalid";
}

export function runVerifierOutcome({ verifier, cwd, passPattern, failPattern }) {
  const run = spawnSync(process.execPath, [verifier], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  return {
    state: classifyVerifierOutcome({
      status: run.status,
      signal: run.signal,
      error: run.error,
      output
    }, passPattern, failPattern),
    status: run.status,
    signal: run.signal,
    output
  };
}

export function assertMeaningfulMutationOutcome(outcome) {
  if (outcome.state === "unavailable" || outcome.state === "invalid") {
    const detail = outcome.output.trim().split("\n").slice(0, 20).join("\n") || "no verifier output";
    throw new Error(`Verifier outcome was ${outcome.state}; this is neither a passing base nor a caught mutation:\n${detail}`);
  }
  return outcome.state === "red";
}

export function verifierIsMeaningfullyRed(options) {
  return assertMeaningfulMutationOutcome(runVerifierOutcome(options));
}
