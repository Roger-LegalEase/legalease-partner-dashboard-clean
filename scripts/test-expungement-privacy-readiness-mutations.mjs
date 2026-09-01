#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const root = process.cwd();
const target = "src/lib/expungement-ai/privacy/processor-config.ts";
const erasureTarget = "src/lib/expungement-ai/privacy/processor-erasure.ts";
const migrationTarget = "supabase/migrations/20260901180000_account_deletion_partial_state.sql";
const absoluteTarget = path.join(root, target);
const absoluteErasureTarget = path.join(root, erasureTarget);
const absoluteMigrationTarget = path.join(root, migrationTarget);
const original = fs.readFileSync(absoluteTarget);
const erasureOriginal = fs.readFileSync(absoluteErasureTarget);
const migrationOriginal = fs.readFileSync(absoluteMigrationTarget);

registerTrackedMutation("test-expungement-privacy-readiness-mutations.mjs", [target, erasureTarget, migrationTarget]);
const restore = () => {
  fs.writeFileSync(absoluteTarget, original);
  fs.writeFileSync(absoluteErasureTarget, erasureOriginal);
  fs.writeFileSync(absoluteMigrationTarget, migrationOriginal);
};
const disposeRestore = registerMutationRestore(restore);

const requiredCheck = '  if (!analyticsToken) missing.push("PRIVACY_ANALYTICS_PROCESSOR_TOKEN");';
const source = original.toString("utf8");
if (!source.includes(requiredCheck)) {
  console.error("Privacy readiness mutation could not find the analytics-token check.");
  process.exitCode = 1;
} else {
  try {
    fs.writeFileSync(
      absoluteTarget,
      source.replace(requiredCheck, "  // mutation: analytics processor token check omitted")
    );
    const child = spawnSync(process.execPath, ["scripts/verify-participant-data-rights.mjs"], {
      cwd: root,
      encoding: "utf8",
      timeout: 300_000,
      maxBuffer: 100 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" }
    });
    const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
    const expected = "PRIVACY_ANALYTICS_PROCESSOR_TOKEN is required by the shared processor-readiness contract";
    if (child.error?.code === "ETIMEDOUT" || child.signal) {
      console.error("Privacy readiness mutation verifier timed out.");
      process.exitCode = 1;
    } else if (child.status === 0) {
      console.error("Privacy readiness mutation survived: the verifier stayed green after a processor check was omitted.");
      process.exitCode = 1;
    } else if (!output.includes(expected)) {
      console.error("Privacy readiness mutation turned red for the wrong reason.");
      console.error(output);
      process.exitCode = 1;
    } else {
      console.log("Privacy readiness mutation caught: omitting one required processor check turns the behavioral verifier red.");
    }

    restore();
    const transportCheck = " && localOrTestProcessorHost(parsed.hostname)";
    if (!source.includes(transportCheck)) {
      console.error("Privacy readiness mutation could not find the secure processor-transport check.");
      process.exitCode = 1;
    } else {
      fs.writeFileSync(
        absoluteTarget,
        source.replace(transportCheck, " /* mutation: external plaintext processor allowed */")
      );
      const transportChild = spawnSync(process.execPath, ["scripts/verify-participant-data-rights.mjs"], {
        cwd: root,
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 100 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" }
      });
      const transportOutput = `${transportChild.stdout ?? ""}${transportChild.stderr ?? ""}`;
      const transportExpected = "refuses insecure non-local processor transport";
      if (transportChild.error?.code === "ETIMEDOUT" || transportChild.signal) {
        console.error("Privacy transport mutation verifier timed out.");
        process.exitCode = 1;
      } else if (transportChild.status === 0) {
        console.error("Privacy transport mutation survived: external plaintext processor endpoints stayed green.");
        process.exitCode = 1;
      } else if (!transportOutput.includes(transportExpected)) {
        console.error("Privacy transport mutation turned red for the wrong reason.");
        console.error(transportOutput);
        process.exitCode = 1;
      } else {
        console.log("Privacy readiness mutation caught: external plaintext processor transport turns the behavioral verifier red.");
      }
    }

    restore();
    const requestTypeGate = "          and request_type = 'account_deletion'\n";
    const migrationSource = migrationOriginal.toString("utf8");
    if (!migrationSource.includes(requestTypeGate)) {
      console.error("Privacy readiness mutation could not find the account-deletion partial-state gate.");
      process.exitCode = 1;
    } else {
      fs.writeFileSync(
        absoluteMigrationTarget,
        migrationSource.replace(requestTypeGate, "          -- mutation: partial state broadened to every privacy request\n")
      );
      const partialStateChild = spawnSync(process.execPath, ["scripts/verify-participant-data-rights.mjs"], {
        cwd: root,
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 100 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" }
      });
      const partialStateOutput = `${partialStateChild.stdout ?? ""}${partialStateChild.stderr ?? ""}`;
      const partialStateExpected = "partial-state transitions remain account-deletion-only";
      if (partialStateChild.error?.code === "ETIMEDOUT" || partialStateChild.signal) {
        console.error("Privacy partial-state mutation verifier timed out.");
        process.exitCode = 1;
      } else if (partialStateChild.status === 0) {
        console.error("Privacy partial-state mutation survived: matter deletion was accepted as resumable partial work.");
        process.exitCode = 1;
      } else if (!partialStateOutput.includes(partialStateExpected)) {
        console.error("Privacy partial-state mutation turned red for the wrong reason.");
        console.error(partialStateOutput);
        process.exitCode = 1;
      } else {
        console.log("Privacy readiness mutation caught: broadening partial state beyond account deletion turns the verifier red.");
      }
    }

    restore();
    const compatibilityFallback = "  return env[LEGACY_PRIVACY_PROCESSOR_CONFIG_NAMES[name]];";
    if (!source.includes(compatibilityFallback)) {
      console.error("Privacy readiness mutation could not find the legacy processor-config fallback.");
      process.exitCode = 1;
    } else {
      fs.writeFileSync(
        absoluteTarget,
        source.replace(compatibilityFallback, "  return undefined; // mutation: legacy deployment config ignored")
      );
      const compatibilityChild = spawnSync(process.execPath, ["scripts/verify-participant-data-rights.mjs"], {
        cwd: root,
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 100 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" }
      });
      const compatibilityOutput = `${compatibilityChild.stdout ?? ""}${compatibilityChild.stderr ?? ""}`;
      const compatibilityExpected = "legacy processor environment remains supported during migration";
      if (compatibilityChild.error?.code === "ETIMEDOUT" || compatibilityChild.signal) {
        console.error("Privacy processor compatibility mutation verifier timed out.");
        process.exitCode = 1;
      } else if (compatibilityChild.status === 0) {
        console.error("Privacy processor compatibility mutation survived: established deployment variables were ignored.");
        process.exitCode = 1;
      } else if (!compatibilityOutput.includes(compatibilityExpected)) {
        console.error("Privacy processor compatibility mutation turned red for the wrong reason.");
        console.error(compatibilityOutput);
        process.exitCode = 1;
      } else {
        console.log("Privacy readiness mutation caught: dropping established processor variables turns the verifier red.");
      }
    }

    restore();
    const exclusiveLeasePredicate =
      "    where public.participant_account_deletion_run_leases.lease_token = excluded.lease_token\n" +
      "       or public.participant_account_deletion_run_leases.lease_expires_at <= clock_timestamp()";
    if (!migrationSource.includes(exclusiveLeasePredicate)) {
      console.error("Privacy readiness mutation could not find the exclusive deletion-run lease predicate.");
      process.exitCode = 1;
    } else {
      fs.writeFileSync(
        absoluteMigrationTarget,
        migrationSource.replace(exclusiveLeasePredicate, "    where true -- mutation: overlapping deletion runners allowed")
      );
      const leaseChild = spawnSync(process.execPath, ["scripts/verify-participant-data-rights.mjs"], {
        cwd: root,
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 100 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" }
      });
      const leaseOutput = `${leaseChild.stdout ?? ""}${leaseChild.stderr ?? ""}`;
      const leaseExpected = "concurrent retries converge on one live ledger and one destructive runner";
      if (leaseChild.error?.code === "ETIMEDOUT" || leaseChild.signal) {
        console.error("Privacy deletion-run lease mutation verifier timed out.");
        process.exitCode = 1;
      } else if (leaseChild.status === 0) {
        console.error("Privacy deletion-run lease mutation survived: overlapping destructive runners stayed green.");
        process.exitCode = 1;
      } else if (!leaseOutput.includes(leaseExpected)) {
        console.error("Privacy deletion-run lease mutation turned red for the wrong reason.");
        console.error(leaseOutput);
        process.exitCode = 1;
      } else {
        console.log("Privacy readiness mutation caught: overlapping destructive deletion runners turn the verifier red.");
      }
    }

    restore();
    const asynchronousAcceptanceGate = "response.status === 202";
    const erasureSource = erasureOriginal.toString("utf8");
    if (!erasureSource.includes(asynchronousAcceptanceGate)) {
      console.error("Privacy readiness mutation could not find the asynchronous processor-acceptance gate.");
      process.exitCode = 1;
    } else {
      fs.writeFileSync(
        absoluteErasureTarget,
        erasureSource.replace(asynchronousAcceptanceGate, "false /* mutation: 202 treated as completed */")
      );
      const acceptedChild = spawnSync(process.execPath, ["scripts/verify-participant-data-rights.mjs"], {
        cwd: root,
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 100 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" }
      });
      const acceptedOutput = `${acceptedChild.stdout ?? ""}${acceptedChild.stderr ?? ""}`;
      const acceptedExpected = "an asynchronously accepted erasure remains sent and outstanding";
      if (acceptedChild.error?.code === "ETIMEDOUT" || acceptedChild.signal) {
        console.error("Privacy asynchronous-acceptance mutation verifier timed out.");
        process.exitCode = 1;
      } else if (acceptedChild.status === 0) {
        console.error("Privacy asynchronous-acceptance mutation survived: a queued processor erasure settled deletion.");
        process.exitCode = 1;
      } else if (!acceptedOutput.includes(acceptedExpected)) {
        console.error("Privacy asynchronous-acceptance mutation turned red for the wrong reason.");
        console.error(acceptedOutput);
        process.exitCode = 1;
      } else {
        console.log("Privacy readiness mutation caught: asynchronous processor acceptance cannot settle deletion.");
      }
    }
  } finally {
    restore();
    disposeRestore();
  }
}
