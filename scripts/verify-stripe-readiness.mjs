import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const requiredStripeEnvVars = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL"
];
const requiredStripePriceEnvVars = [
  "STRIPE_PRICE_STARTER_ACCESS_PROGRAM",
  "STRIPE_PRICE_COMMUNITY_ACCESS_PROGRAM",
  "STRIPE_PRICE_COUNTY_ACCESS_PROGRAM"
];
const bannedProductModules = ["StartApart", "ClaimCoach"];
const approvedProductModules = [
  "Wilma Intake",
  "RecordShield",
  "Expungement.ai",
  "Partner Dashboard",
  "Weekly Reports",
  "Final Impact Report"
];

loadLocalEnv();

const failures = [];
const missingStripeEnv = requiredStripeEnvVars.filter((envVar) => !process.env[envVar]);
const missingStripePrices = requiredStripePriceEnvVars.filter((envVar) => !process.env[envVar]);
const envLocalTracked = isGitTracked(".env.local");
const trackedSecretsFound = stripeSecretsAppearInTrackedFiles();
const productBoundaryFailures = verifyDashboardProductBoundary();

if (missingStripeEnv.length > 0) {
  failures.push(`Missing Stripe env vars: ${missingStripeEnv.join(", ")}.`);
}

if (missingStripePrices.length > 0) {
  failures.push(`Missing Stripe price env vars: ${missingStripePrices.join(", ")}.`);
}

if (envLocalTracked) {
  failures.push(".env.local is tracked by git.");
}

if (!isGitIgnored(".env.local")) {
  failures.push(".env.local is not ignored by git.");
}

if (trackedSecretsFound) {
  failures.push("Stripe secret values appear in tracked files.");
}

failures.push(...productBoundaryFailures);

if (failures.length > 0) {
  console.error("Stripe readiness verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Stripe readiness verification passed.");
console.log("Stripe env: configured");
console.log("Stripe price IDs: configured");
console.log(`.env.local tracked: ${envLocalTracked ? "yes" : "no"}`);
console.log(`Tracked secrets found: ${trackedSecretsFound ? "yes" : "no"}`);
console.log("Dashboard product boundary: record-clearing only");

function stripeSecretsAppearInTrackedFiles() {
  const secretValues = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_WEBHOOK_SECRET
  ].filter((value) => typeof value === "string" && value.length > 0);

  if (secretValues.length === 0) {
    return false;
  }

  for (const file of getTrackedFiles()) {
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      continue;
    }

    const content = fs.readFileSync(absolutePath);
    for (const secret of secretValues) {
      if (content.includes(Buffer.from(secret))) {
        return true;
      }
    }
  }

  return false;
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
