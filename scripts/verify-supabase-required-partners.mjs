import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredPartners = ["demo-partner", "we-must-vote", "fulton-county"];

loadLocalEnv();

const enabledValue = process.env.ENABLE_SUPABASE_PARTNER_DATA ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (enabledValue !== "true") {
  console.log("Required Supabase partner verification skipped: ENABLE_SUPABASE_PARTNER_DATA is not true.");
  process.exit(0);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.log("Required Supabase partner verification skipped: Supabase credentials are incomplete.");
  console.log(`NEXT_PUBLIC_SUPABASE_URL present: ${supabaseUrl ? "yes" : "no"}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY present: ${serviceRoleKey ? "yes" : "no"}`);
  process.exit(0);
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
  .order("partner_slug", { ascending: true });

if (error) {
  console.error("Required Supabase partner verification failed.");
  console.error(error.message);
  process.exit(1);
}

const foundSlugs = new Set((data ?? []).map((partner) => partner.partner_slug));
const found = requiredPartners.filter((slug) => foundSlugs.has(slug));
const missing = requiredPartners.filter((slug) => !foundSlugs.has(slug));

console.log("Required Supabase partner verification completed.");
console.log(`Found required partners: ${found.length > 0 ? found.join(", ") : "(none)"}`);
console.log(`Missing required partners: ${missing.length > 0 ? missing.join(", ") : "(none)"}`);

if (missing.length > 0) {
  process.exit(1);
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
