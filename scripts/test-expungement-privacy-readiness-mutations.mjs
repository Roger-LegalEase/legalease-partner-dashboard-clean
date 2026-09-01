#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const root = process.cwd();
const target = "src/lib/expungement-ai/privacy/processor-config.ts";
const absoluteTarget = path.join(root, target);
const original = fs.readFileSync(absoluteTarget);

registerTrackedMutation("test-expungement-privacy-readiness-mutations.mjs", [target]);
const restore = () => fs.writeFileSync(absoluteTarget, original);
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
  } finally {
    restore();
    disposeRestore();
  }
}
