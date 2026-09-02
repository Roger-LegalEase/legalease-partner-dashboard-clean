import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHROMIUM_RESOLUTION_ERROR,
  resolveApprovedChromiumExecutable
} from "./lib/approved-chromium.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "approved-chromium-"));

try {
  const rcap = executable("rcap-chromium");
  const playwrightConfigured = executable("configured-playwright-chromium");
  const managed = executable("managed-chromium");
  const system = executable("system-chromium");
  const nonExecutable = path.join(temporaryRoot, "not-executable");
  fs.writeFileSync(nonExecutable, "fixture", { mode: 0o600 });
  const directory = path.join(temporaryRoot, "browser-directory");
  fs.mkdirSync(directory);
  const missing = path.join(temporaryRoot, "missing-chromium");

  assert.deepEqual(resolveApprovedChromiumExecutable({
    env: {
      RCAP_CHROMIUM_PATH: rcap,
      PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: playwrightConfigured
    },
    managedExecutablePath: managed,
    findSystemExecutable: () => system
  }), { executablePath: rcap, pathClass: "environment:RCAP_CHROMIUM_PATH" });

  assert.deepEqual(resolveApprovedChromiumExecutable({
    env: { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: playwrightConfigured },
    managedExecutablePath: managed,
    findSystemExecutable: () => system
  }), { executablePath: playwrightConfigured, pathClass: "environment:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH" });

  assert.deepEqual(resolveApprovedChromiumExecutable({
    env: {}, managedExecutablePath: managed, findSystemExecutable: () => system
  }), { executablePath: managed, pathClass: "playwright-managed" });

  // Managed cache absent, approved system browser present.
  assert.deepEqual(resolveApprovedChromiumExecutable({
    env: {}, managedExecutablePath: missing,
    systemCandidates: ["chromium"], findSystemExecutable: () => system
  }), { executablePath: system, pathClass: "system:chromium" });

  for (const invalid of [missing, nonExecutable, directory]) {
    assert.throws(
      () => resolveApprovedChromiumExecutable({
        env: { RCAP_CHROMIUM_PATH: invalid },
        managedExecutablePath: managed,
        findSystemExecutable: () => system
      }),
      (error) => error instanceof Error && error.message === CHROMIUM_RESOLUTION_ERROR
    );
  }

  // All candidates absent.
  assert.throws(
    () => resolveApprovedChromiumExecutable({
      env: {}, managedExecutablePath: missing,
      systemCandidates: ["chromium"], findSystemExecutable: () => null
    }),
    (error) => error instanceof Error && error.message === CHROMIUM_RESOLUTION_ERROR
  );

  const targetHarnesses = [
    "scripts/capture-first-admin-acceptance.mjs",
    "scripts/capture-internal-admin-access-acceptance.mjs",
    "scripts/capture-onboarding-launch-readiness-acceptance.mjs",
    "scripts/capture-onboarding-page-documents-acceptance.mjs",
    "scripts/capture-rcap-prepared-onboarding-acceptance.mjs",
    "scripts/test-rcap-partner-provisioning-journey.mjs",
    "scripts/clinic-mode/verify-browser.mjs",
    "scripts/security/test-clinic-mobile-accessibility.mjs",
    "scripts/security/test-public-partner-browser-acceptance.mjs",
    "scripts/security/test-sign-out-origin.mjs",
    "scripts/verify-partner-dashboard-rls-isolation.mjs",
    "scripts/verify-legacy-internal-admin-gates.mjs"
  ];
  for (const file of targetHarnesses) {
    assert.deepEqual(harnessResolverFailures(file), [], `${file} omitted the approved resolver`);
  }

  // Required negative control: omitting the resolver from one target harness is
  // detected by the same scanner used above.
  const target = targetHarnesses[0];
  const source = fs.readFileSync(path.join(root, target), "utf8");
  const mutated = source
    .replace(/import \{[^\n]*resolveApprovedChromiumExecutable[^\n]*\} from [^\n]+\n/, "")
    .replaceAll("resolveApprovedChromiumExecutable", "resolverRemoved");
  assert.ok(harnessResolverFailures(target, mutated).length > 0,
    "removing the resolver from a target harness must turn the scanner red");

  console.log(`Approved Chromium resolver passed 9 resolution controls and ${targetHarnesses.length} harness integrations.`);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

function executable(name) {
  const file = path.join(temporaryRoot, name);
  fs.writeFileSync(file, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  return file;
}

function harnessResolverFailures(file, sourceOverride) {
  const source = sourceOverride ?? fs.readFileSync(path.join(root, file), "utf8");
  const failures = [];
  if (!source.includes("resolveApprovedChromiumExecutable")) failures.push("resolver call/import absent");
  if (!source.includes("executablePath: chromiumResolution.executablePath")) failures.push("resolved executablePath not passed to launch");
  return failures;
}
