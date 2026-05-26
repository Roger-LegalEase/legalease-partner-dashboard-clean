import { spawnSync } from "node:child_process";
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
const requiredPartners = ["demo-partner", "we-must-vote", "fulton-county"];
const approvedProductModules = [
  "Wilma Intake",
  "RecordShield",
  "Expungement.ai",
  "Partner Dashboard",
  "Weekly Reports",
  "Final Impact Report"
];
const bannedProductModules = ["StartApart", "ClaimCoach"];

loadLocalEnv();

const failures = [];
const envLocalPath = path.join(rootDir, ".env.local");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabledValue = process.env.ENABLE_SUPABASE_PARTNER_DATA ?? "";

if (!supabaseUrl) {
  failures.push("NEXT_PUBLIC_SUPABASE_URL is missing.");
}

if (!serviceRoleKey) {
  failures.push("SUPABASE_SERVICE_ROLE_KEY is missing.");
}

if (enabledValue !== "true") {
  failures.push("ENABLE_SUPABASE_PARTNER_DATA must be true.");
}

if (!fs.existsSync(envLocalPath)) {
  failures.push(".env.local does not exist locally.");
}

const envLocalTracked = isGitTracked(".env.local");
if (envLocalTracked) {
  failures.push(".env.local is tracked by git.");
}

if (!isGitIgnored(".env.local")) {
  failures.push(".env.local is not ignored by git.");
}

if (serviceRoleKey && serviceRoleKeyAppearsInTrackedFiles(serviceRoleKey)) {
  failures.push("Supabase service role key appears in tracked files.");
}

const foundPartners = await getSupabasePartnerSlugs();
const missingPartners = requiredPartners.filter((slug) => !foundPartners.has(slug));
if (missingPartners.length > 0) {
  failures.push(`Required partners missing from Supabase: ${missingPartners.join(", ")}.`);
}

const productBoundaryFailures = verifyDashboardProductBoundary();
failures.push(...productBoundaryFailures);

if (failures.length > 0) {
  console.error("Partner Journey OS production readiness verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Partner Journey OS production readiness verification passed.");
console.log("Supabase env: configured");
console.log(`.env.local tracked: ${envLocalTracked ? "yes" : "no"}`);
console.log("Required partners: present");
console.log("Dashboard product boundary: record-clearing only");

async function getSupabasePartnerSlugs() {
  if (!supabaseUrl || !serviceRoleKey) {
    return new Set();
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase
    .from("partner_records")
    .select("partner_slug")
    .in("partner_slug", requiredPartners);

  if (error) {
    failures.push(`Required partner Supabase read failed: ${error.message}`);
    return new Set();
  }

  return new Set((data ?? []).map((partner) => partner.partner_slug));
}

function verifyDashboardProductBoundary() {
  const boundaryFailures = [];
  const dashboardDataPath = path.join(rootDir, "src/lib/partner-dashboard-data.ts");
  const source = fs.readFileSync(dashboardDataPath, "utf8");
  const { productStarts } = loadTsModule(dashboardDataPath);
  const productNames = productStarts.map((product) => product.name);

  for (const banned of bannedProductModules) {
    if (source.includes(banned) || productNames.includes(banned)) {
      boundaryFailures.push(`${banned} appears in the partner dashboard product modules.`);
    }
  }

  const approvedSet = new Set(approvedProductModules);
  const productSet = new Set(productNames);
  const unexpectedProducts = productNames.filter((name) => !approvedSet.has(name));
  const missingProducts = approvedProductModules.filter((name) => !productSet.has(name));

  if (unexpectedProducts.length > 0) {
    boundaryFailures.push(`Unapproved dashboard product modules found: ${unexpectedProducts.join(", ")}.`);
  }

  if (missingProducts.length > 0) {
    boundaryFailures.push(`Approved dashboard product modules missing: ${missingProducts.join(", ")}.`);
  }

  if (productNames.length !== approvedProductModules.length) {
    boundaryFailures.push("Dashboard product module count does not match the approved record-clearing boundary.");
  }

  return boundaryFailures;
}

function serviceRoleKeyAppearsInTrackedFiles(key) {
  for (const file of getTrackedFiles()) {
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      continue;
    }

    const content = fs.readFileSync(absolutePath);
    if (content.includes(Buffer.from(key))) {
      return true;
    }
  }

  return false;
}

function getTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: rootDir,
    encoding: "utf8"
  });
  const output = result.stdout ?? "";

  if (result.status !== 0 && output.length === 0) {
    throw result.error ?? new Error("Unable to list tracked git files.");
  }

  return output.split("\0").filter(Boolean);
}

function isGitTracked(file) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", file], {
    cwd: rootDir,
    encoding: "utf8"
  });

  return result.status === 0;
}

function isGitIgnored(file) {
  const result = spawnSync("git", ["check-ignore", "-q", file], {
    cwd: rootDir,
    encoding: "utf8"
  });

  return result.status === 0;
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
