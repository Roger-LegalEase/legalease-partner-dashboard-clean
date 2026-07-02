import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/components/expungement-ai/screening/QuestionField.tsx"), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(source.includes("function DateOrUnknownField"), "date_or_unknown must render the custom date field.");
assert(source.includes("Month") && source.includes("Day") && source.includes("Year"), "Date field must expose month/day/year controls.");
assert(source.includes("Array.from({ length: 90 }"), "Date field must expose an old-case year selector.");
assert(source.includes("toIsoDate"), "Date field must map controls to ISO date.");
assert(source.includes('return `${year}-${month}-${day}`'), "Date answer must remain YYYY-MM-DD.");
assert(source.includes("Number.isNaN(date.getTime())"), "Invalid dates must be blocked.");

if (failures.length) {
  console.error("Expungement.ai date year selector verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Expungement.ai date year selector verifier passed.");
