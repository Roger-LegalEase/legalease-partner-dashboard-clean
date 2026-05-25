import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/lib/partners/partner-repository.ts",
  "src/app/api/internal/partners/admin-action/route.ts",
  "src/lib/partners/admin-actions.ts"
];

const requiredActions = [
  "mark_qualified",
  "mark_payment_complete",
  "move_to_provisioning",
  "activate_partner",
  "pause_partner",
  "mark_asset_ready",
  "mark_asset_active",
  "add_internal_note"
];

const requiredRepositoryFunctions = [
  "updatePartnerPaymentStatus",
  "updatePartnerQualificationStatus",
  "updatePartnerProvisioningStatus",
  "updatePartnerAssetStatus",
  "addPartnerEvent",
  "addPartnerInternalNote",
  "activatePartner",
  "pausePartner"
];

try {
  for (const file of requiredFiles) {
    assert(fs.existsSync(path.join(rootDir, file)), `Missing required file: ${file}`);
  }

  const adminActionsSource = readSource("src/lib/partners/admin-actions.ts");
  const repositorySource = readSource("src/lib/partners/partner-repository.ts");
  const routeSource = readSource("src/app/api/internal/partners/admin-action/route.ts");
  const combinedSource = `${adminActionsSource}\n${repositorySource}\n${routeSource}`;

  for (const action of requiredActions) {
    assert(combinedSource.includes(action), `Missing required admin action: ${action}`);
  }

  for (const functionName of requiredRepositoryFunctions) {
    assert(repositorySource.includes(`function ${functionName}`), `Missing repository write function: ${functionName}`);
  }

  for (const mode of ["local_seeded", "local_fallback", "supabase"]) {
    assert(repositorySource.includes(mode), `Missing write mode: ${mode}`);
  }

  assert(repositorySource.includes("persisted: false"), "Missing persisted false fallback result.");
  assert(repositorySource.includes("Supabase partner data is disabled"), "Missing disabled Supabase fallback message.");
  assert(repositorySource.includes("Supabase is not configured"), "Missing unconfigured Supabase fallback message.");

  console.log("Partner write layer smoke test passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Partner write layer smoke test failed.");
  process.exit(1);
}

function readSource(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
