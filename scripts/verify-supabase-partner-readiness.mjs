import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  ["Schema file", "supabase/partner-journey-os.sql"],
  ["Seed SQL file", "supabase/partner-seed-demo.sql"],
  ["Env example", ".env.example"],
  ["Partner repository", "src/lib/partners/partner-repository.ts"],
  ["Supabase server client", "src/lib/supabase/server.ts"]
];
const requiredSeedSlugs = ["demo-partner", "we-must-vote", "fulton-county"];
const enabledValue = process.env.ENABLE_SUPABASE_PARTNER_DATA ?? "";
const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const expectedMode = getExpectedRepositoryMode(enabledValue, hasSupabaseUrl, hasServiceRoleKey);
const failures = [];

console.log("Supabase partner readiness check");

for (const [label, relativePath] of requiredFiles) {
  const exists = fs.existsSync(path.join(rootDir, relativePath));
  console.log(`${exists ? "PASS" : "FAIL"} ${label}: ${relativePath}`);

  if (!exists) {
    failures.push(`${label} missing: ${relativePath}`);
  }
}

const seedFile = path.join(rootDir, "supabase/partner-seed-demo.sql");
if (fs.existsSync(seedFile)) {
  const seedSql = fs.readFileSync(seedFile, "utf8");
  for (const slug of requiredSeedSlugs) {
    const exists = seedSql.includes(slug);
    console.log(`${exists ? "PASS" : "FAIL"} Seed contains ${slug}`);

    if (!exists) {
      failures.push(`Seed SQL missing: ${slug}`);
    }
  }
}

console.log(`ENABLE_SUPABASE_PARTNER_DATA value: ${enabledValue || "(empty)"}`);
console.log(`NEXT_PUBLIC_SUPABASE_URL present: ${hasSupabaseUrl ? "yes" : "no"}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY present: ${hasServiceRoleKey ? "yes" : "no"}`);
console.log(`Repository expected mode: ${expectedMode}`);
console.log("Live Supabase connection: not attempted by this script");

if (failures.length > 0) {
  console.error("Supabase partner readiness check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Supabase partner readiness check passed.");

function getExpectedRepositoryMode(enabled, hasUrl, hasKey) {
  if (enabled !== "true") {
    return "local_seeded";
  }

  return hasUrl && hasKey ? "supabase" : "local_fallback";
}
