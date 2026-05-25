import { createClient } from "@supabase/supabase-js";

const enabledValue = process.env.ENABLE_SUPABASE_PARTNER_DATA ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (enabledValue !== "true") {
  console.log("Live Supabase read skipped: ENABLE_SUPABASE_PARTNER_DATA is not true.");
  process.exit(0);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.log("Live Supabase read skipped: Supabase credentials are incomplete.");
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
  .select("partner_slug, partner_name")
  .limit(10);

if (error) {
  console.error("Live Supabase read failed.");
  console.error(error.message);
  process.exit(1);
}

const partners = data ?? [];
console.log("Live Supabase read passed.");
console.log(`Partner count returned: ${partners.length}`);
console.log(`Partner slugs: ${partners.map((partner) => partner.partner_slug).join(", ") || "(none)"}`);
