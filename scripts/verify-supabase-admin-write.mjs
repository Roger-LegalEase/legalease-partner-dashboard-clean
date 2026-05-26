import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const partnerSlug = "demo-partner";

loadLocalEnv();

const enabledValue = process.env.ENABLE_SUPABASE_PARTNER_DATA ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

failIf(enabledValue !== "true", "Supabase admin write verification failed: ENABLE_SUPABASE_PARTNER_DATA must be true.");
failIf(!supabaseUrl, "Supabase admin write verification failed: NEXT_PUBLIC_SUPABASE_URL is missing.");
failIf(!serviceRoleKey, "Supabase admin write verification failed: SUPABASE_SERVICE_ROLE_KEY is missing.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const originalPartner = await readPartnerRecord();
failIf(!originalPartner, `Supabase admin write verification failed: ${partnerSlug} was not found.`);

const plan = getVerificationPlan(originalPartner);
const { runPartnerAdminAction } = loadTsModule(path.join(rootDir, "src/lib/partners/admin-action-runner.ts"));
const { updatePartnerQualificationStatus, updatePartnerProvisioningStatus } = loadTsModule(
  path.join(rootDir, "src/lib/partners/partner-repository.ts")
);

let reverted = false;

try {
  const writeResult = await runPartnerAdminAction({
    action: plan.action,
    partnerSlug,
    currentProvisioningStatus: originalPartner.provisioning_status
  });

  failIf(!writeResult.success, `Supabase admin write verification failed: ${writeResult.error ?? writeResult.message}`);
  failIf(!writeResult.persisted || writeResult.mode !== "supabase", "Supabase admin write verification failed: admin action did not persist to Supabase.");

  const changedPartner = await readPartnerRecord();
  failIf(!changedPartner, `Supabase admin write verification failed: ${partnerSlug} disappeared after write.`);
  failIf(
    changedPartner[plan.column] !== plan.expectedValue,
    `Supabase admin write verification failed: expected ${plan.column} to persist as ${plan.expectedValue}.`
  );

  const revertResult =
    plan.column === "qualification_status"
      ? await updatePartnerQualificationStatus(partnerSlug, originalPartner.qualification_status)
      : await updatePartnerProvisioningStatus(partnerSlug, originalPartner.provisioning_status);

  failIf(!revertResult.success || !revertResult.persisted, `Supabase admin write verification failed: could not revert ${plan.column}.`);

  const revertedPartner = await readPartnerRecord();
  failIf(!revertedPartner, `Supabase admin write verification failed: ${partnerSlug} was not found after revert.`);
  failIf(
    revertedPartner[plan.column] !== originalPartner[plan.column],
    `Supabase admin write verification failed: ${plan.column} did not revert to its original value.`
  );

  reverted = true;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Supabase admin write verification failed.");
  process.exit(1);
}

console.log("Supabase admin write verification passed.");
console.log(`Partner tested: ${partnerSlug}`);
console.log("Write confirmed: yes");
console.log(`Reverted: ${reverted ? "yes" : "no"}`);

async function readPartnerRecord() {
  const { data, error } = await supabase
    .from("partner_records")
    .select("partner_slug, qualification_status, provisioning_status")
    .eq("partner_slug", partnerSlug)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase admin write verification failed: ${error.message}`);
  }

  return data;
}

function getVerificationPlan(partner) {
  if (partner.qualification_status !== "qualified") {
    return {
      action: "mark_qualified",
      column: "qualification_status",
      expectedValue: "qualified"
    };
  }

  if (partner.provisioning_status !== "paused") {
    return {
      action: "pause_partner",
      column: "provisioning_status",
      expectedValue: "paused"
    };
  }

  return {
    action: "activate_partner",
    column: "provisioning_status",
    expectedValue: "active"
  };
}

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function failIf(condition, message) {
  if (condition) {
    console.error(message);
    process.exit(1);
  }
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) {
    return cached.exports;
  }

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    return resolveExistingTsFile(path.join(rootDir, "src", request.slice(2)));
  }

  if (request.startsWith(".")) {
    return resolveExistingTsFile(path.resolve(basedir, request));
  }

  return null;
}

function resolveExistingTsFile(candidate) {
  for (const extension of [".ts", ".tsx", ".js"]) {
    if (fs.existsSync(`${candidate}${extension}`)) {
      return `${candidate}${extension}`;
    }
  }

  return null;
}
