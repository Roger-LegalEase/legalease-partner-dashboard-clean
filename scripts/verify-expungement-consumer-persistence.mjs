import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];

const briefcaseRoutes = [
  "src/app/briefcase/page.tsx",
  "src/app/briefcase/matters/page.tsx",
  "src/app/briefcase/documents/page.tsx",
  "src/app/briefcase/reminders/page.tsx",
  "src/app/briefcase/payments/page.tsx",
  "src/app/briefcase/settings/page.tsx"
];
const migrationPath = "supabase/phase-26-consumer-briefcase-items.sql";

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    failures.push(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`.trim());
  }
}

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return [];
  return result.stdout.trim().split(/\r?\n/).filter(Boolean);
}

const packageSource = read("package.json");
const authSource = read("src/lib/expungement-ai/auth.ts");
const briefcaseSource = read("src/lib/expungement-ai/briefcase.ts");
const adapterSource = read("src/lib/expungement-ai/eligibility-adapter.ts");
const migrationSource = exists(migrationPath) ? read(migrationPath) : "";

assert(packageSource.includes('"expungement:verify-consumer-persistence"'), "Missing expungement:verify-consumer-persistence npm script.");
assert(authSource.includes('redirect("/expungement-ai/sign-in")'), "Logged-out Briefcase users must redirect to /expungement-ai/sign-in.");
assert(authSource.includes("getRcapBriefcaseAuthState"), "Consumer auth guard must reuse existing session utility.");

for (const route of briefcaseRoutes) {
  const source = read(route);
  assert(source.includes("requireConsumerBriefcaseSession"), `${route} must require a signed-in consumer session.`);
  assert(!source.includes("BriefcaseAuthGate"), `${route} must redirect logged-out users instead of rendering an auth gate.`);
}

for (const method of ["createBriefcaseItem", "listBriefcaseItems", "getBriefcaseItem", "updateBriefcaseItemStatus"]) {
  assert(briefcaseSource.includes(`export async function ${method}`), `Briefcase adapter missing ${method}.`);
}

assert(adapterSource.includes("saveEligibilityCheckToBriefcase"), "Eligibility checks must remain Briefcase-saveable.");
assert(adapterSource.includes("saveEligibilityResultToBriefcase"), "Eligibility results must remain Briefcase-saveable.");
assert(briefcaseSource.includes("createServerSupabaseAuthClient"), "Briefcase adapter must use request-scoped Supabase auth client.");
assert(!briefcaseSource.includes("SUPABASE_SERVICE_ROLE_KEY"), "Consumer Briefcase adapter must not use service-role keys.");
assert(briefcaseSource.includes("Safe fallback path"), "Fallback behavior must be clearly marked.");

assert(exists(migrationPath), "Consumer Briefcase migration file is missing.");
assert(migrationSource.includes("create table if not exists public.consumer_briefcase_items"), "Migration must create consumer_briefcase_items.");
assert(migrationSource.includes("alter table public.consumer_briefcase_items enable row level security"), "Consumer Briefcase table must enable RLS.");
assert(migrationSource.includes("auth.uid() = user_id"), "Consumer Briefcase RLS must isolate rows by auth.uid() = user_id.");
assert(!migrationSource.includes("partner_"), "Consumer Briefcase migration must not alter partner tables or policies.");

const changedFiles = git(["status", "--short"]).map((line) => line.slice(3).trim());
const forbiddenPrefixes = [
  "src/app/dashboard/partners/",
  "src/app/partner/",
  "src/app/partners/",
  "src/lib/partners/",
  "src/lib/stripe/",
  "src/app/api/stripe/",
  "src/lib/supabase/",
  "vercel.json",
  "next.config",
  ".env",
  ".github/workflows/deploy"
];
for (const file of changedFiles) {
  if (file === migrationPath) continue;
  if (file === "supabase/phase-27-consumer-checkout-metadata.sql") continue;
  if (file === "supabase/phase-28-consumer-packet-generation-status.sql") continue;
  if (file === "supabase/phase-29-consumer-wilma-telemetry.sql") continue;
  for (const prefix of forbiddenPrefixes) {
    assert(!file.startsWith(prefix), `Restricted file changed: ${file}`);
  }
}

run("npm", ["run", "rcap:verify-all51-launch-enabled"]);
run("npm", ["run", "rcap:verify-all51-final-approval"]);
run("npm", ["run", "rcap:verify-encrypted-pdf-rescue"]);
run("npm", ["run", "expungement:verify-consumer-adapter"]);

if (failures.length) {
  console.error("Expungement.ai consumer persistence verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai consumer persistence verification passed.");
console.log("Briefcase routes redirect logged-out users to /expungement-ai/sign-in.");
console.log("Consumer Briefcase adapter create/list/get/update methods are present.");
console.log("consumer_briefcase_items migration exists with owner-scoped RLS.");
console.log("Partner, Stripe, Supabase global auth, billing, secrets, and deployment files are untouched.");
