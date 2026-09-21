#!/usr/bin/env node
// ENV-007 C1 — prove the control tree is the reviewed control plane.
//
// Runs from control/, before any database credential and before any
// network-capable write step. It opens no socket and reads no secret: it hashes
// files in the tree it was started from and compares them to the manifest that
// tree carries.
//
// Environment:
//   RCAP_CONTROL_DIR                     absolute path of the control checkout
//   RCAP_CONTROL_SHA                     github.sha — the commit control/ was checked out at
//   RCAP_AUTHORIZED_INFRASTRUCTURE_SHA   the non-secret authorized value
//   RCAP_TOOLS_SHA                       the tools_sha input, now a label only
//
// Exit 1 with CONTROL_PLANE_AUTHORITY_INVALID or
// INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID. There is no third outcome.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUTHORIZED_MANIFEST_HASH,
  CONTROL_ROOT,
  REQUIRED_CONTROL_FILES,
  RETIRED_TOOLS_COMMIT_PREFIX,
  evaluateControlPlane,
  evaluateToolsShaLabel
} from "./control/rcap-execution-authority.mjs";
import { loadManifest, computeManifestHash } from "./lib/rcap-migration-manifest.mjs";

const selfRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const controlDir = path.resolve(process.env.RCAP_CONTROL_DIR || selfRoot);
const controlSha = (process.env.RCAP_CONTROL_SHA || "").trim();
const authorizedSha = (process.env.RCAP_AUTHORIZED_INFRASTRUCTURE_SHA || "").trim();
const toolsSha = (process.env.RCAP_TOOLS_SHA || "").trim();

console.log("CONTROL PLANE AUTHORITY");
console.log(`  control tree     ${controlDir}`);
console.log(`  control commit   ${controlSha || "<empty>"}`);

// The script must be executing FROM the control tree. If these differ, some
// other tree is running orchestration code and the boundary is already lost.
if (path.resolve(selfRoot) !== controlDir) {
  console.error("::error::CONTROL_PLANE_AUTHORITY_INVALID");
  console.error("CONTROL_PLANE_AUTHORITY_INVALID");
  console.error(`  this script is executing from ${selfRoot}, not from the control tree ${controlDir}`);
  process.exit(1);
}
if (path.basename(controlDir) !== CONTROL_ROOT) {
  console.log(`  note: the control checkout is not named "${CONTROL_ROOT}" (${path.basename(controlDir)})`);
}

const manifest = loadManifest(controlDir);
const manifestHash = computeManifestHash(manifest);
// Keyed by the manifest's own repository-relative path, so nothing here
// reconstructs a filename the manifest did not state.
const migrationHashes = Object.fromEntries(
  (manifest.migrations ?? []).map((m) => [m.path, m.sha256])
);

const control = evaluateControlPlane({
  controlDir,
  controlSha,
  authorizedSha,
  migrationsRootDir: "",
  migrationHashes,
  requiredFiles: REQUIRED_CONTROL_FILES,
  authorizedManifestHash: AUTHORIZED_MANIFEST_HASH,
  manifestHash
});

const tools = evaluateToolsShaLabel({ toolsSha, controlSha });

for (const rel of REQUIRED_CONTROL_FILES) {
  console.log(`  ${fs.existsSync(path.join(controlDir, rel)) ? "ok  " : "FAIL"} control carries ${rel}`);
}
console.log(`  ${manifestHash === AUTHORIZED_MANIFEST_HASH ? "ok  " : "FAIL"} manifest hash ${manifestHash}`);
for (const m of control.migrationsChecked) {
  console.log(`  ${m.match ? "ok  " : "FAIL"} ${m.basename} ${m.actual}`);
}
console.log(`  ${control.importsControlManifest ? "ok  " : "FAIL"} the migration runner imports ./lib/rcap-migration-manifest.mjs from this tree`);
console.log(`  ${tools.ok ? "ok  " : "FAIL"} tools_sha names the control plane and is never a checkout target`);
console.log(`  ok   the retired ${RETIRED_TOOLS_COMMIT_PREFIX} runner cannot be selected: no phase checks out tools_sha`);

if (!control.ok) {
  console.error("::error::CONTROL_PLANE_AUTHORITY_INVALID");
  console.error("CONTROL_PLANE_AUTHORITY_INVALID");
  for (const r of control.reasons) console.error(`  - ${r}`);
  process.exit(1);
}
if (!tools.ok) {
  console.error("::error::INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID");
  console.error("INFRASTRUCTURE_EXECUTION_AUTHORITY_INVALID");
  for (const r of tools.reasons) console.error(`  - ${r}`);
  process.exit(1);
}
console.log("CONTROL_PLANE_AUTHORITY_PROVEN");
