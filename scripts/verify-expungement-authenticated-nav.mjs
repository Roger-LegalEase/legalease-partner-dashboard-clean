import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/components/expungement-ai/ConsumerNav.tsx"), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(source.includes("createBrowserSupabaseClient"), "ConsumerNav must read Supabase browser session.");
assert(source.includes("onAuthStateChange"), "ConsumerNav must respond to auth state changes.");
assert(source.includes("isAuthenticated"), "ConsumerNav must branch on authenticated state.");
assert(source.includes('href="/sign-out"'), "Authenticated nav must expose sign out.");
assert(source.includes('href="/briefcase"'), "Authenticated nav must expose Briefcase/account.");

if (failures.length) {
  console.error("Expungement.ai authenticated nav verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Expungement.ai authenticated nav verifier passed.");
