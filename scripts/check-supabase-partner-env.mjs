const enabledValue = process.env.ENABLE_SUPABASE_PARTNER_DATA ?? "";
const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const expectedMode = getExpectedRepositoryMode(enabledValue, hasSupabaseUrl, hasServiceRoleKey);

console.log("Supabase partner env check");
console.log(`ENABLE_SUPABASE_PARTNER_DATA value: ${enabledValue || "(empty)"}`);
console.log(`NEXT_PUBLIC_SUPABASE_URL present: ${hasSupabaseUrl ? "yes" : "no"}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY present: ${hasServiceRoleKey ? "yes" : "no"}`);
console.log(`Repository expected mode: ${expectedMode}`);

function getExpectedRepositoryMode(enabled, hasUrl, hasKey) {
  if (enabled !== "true") {
    return "local_seeded";
  }

  return hasUrl && hasKey ? "supabase" : "local_fallback";
}
