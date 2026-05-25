import { createClient } from "@supabase/supabase-js";

const requiredPartners = ["demo-partner", "we-must-vote", "fulton-county"];
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
