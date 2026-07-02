import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const requiredFiles = [
  "docs/product-flows/expungement-ai-dtc-user-flow.md",
  "docs/product-flows/rcap-partner-portal-user-flow.md",
  "docs/product-flows/README.md",
  "docs/product-flows/source-pdfs/Expungement.ai User Flow.pdf",
  "docs/product-flows/source-pdfs/Co-Branded Partner Portal User Flow.pdf"
];

for (const file of requiredFiles) {
  assert(exists(file), `Missing required product-flow file: ${file}`);
}

const requirePhrases = (file, phrases) => {
  if (!exists(file)) return;
  const text = read(file);
  for (const phrase of phrases) {
    assert(text.includes(phrase), `${file} must include: ${phrase}`);
  }
};

requirePhrases("docs/product-flows/expungement-ai-dtc-user-flow.md", [
  "Check for free",
  "No account required yet",
  "A path may be available",
  "Generate my packet — $50",
  "Create account",
  "Verify email",
  "Stripe payment",
  "Briefcase",
  "State-Specific Packet Builder",
  "Generate my packet",
  "Download my packet"
]);

requirePhrases("docs/product-flows/rcap-partner-portal-user-flow.md", [
  "Check for free",
  "No payment language",
  "Continue to my Briefcase",
  "Create account",
  "Verify email",
  "Skip Stripe Payment Gate",
  "bypass payment",
  "State-Specific Packet Builder",
  "Generate my packet",
  "Download my packet"
]);

requirePhrases("docs/product-flows/README.md", [
  "source of truth",
  "no account wall before the free check",
  "no duplicate screening after signup",
  "DTC requires Stripe",
  "partner-covered users bypass Stripe"
]);

if (failures.length) {
  console.error("Product flow docs verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Product flow docs verifier passed.");
