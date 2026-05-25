import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedFile = path.join(rootDir, "supabase/partner-seed-demo.sql");
const requiredContent = [
  "partner_records",
  "partner_assets",
  "partner_metrics",
  "demo-partner",
  "we-must-vote",
  "fulton-county"
];

try {
  const sql = fs.readFileSync(seedFile, "utf8");
  const missing = requiredContent.filter((item) => !sql.includes(item));

  if (missing.length > 0) {
    console.error("Partner seed SQL check failed.");
    console.error(`Missing required content: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("Partner seed SQL check passed.");
  console.log(`Validated ${path.relative(rootDir, seedFile)}.`);
} catch (error) {
  console.error("Partner seed SQL check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
