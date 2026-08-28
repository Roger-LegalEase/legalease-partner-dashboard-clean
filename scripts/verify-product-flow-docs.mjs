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
  "Start a free guided check",
  "Start with a free guided check. If a self-help packet is available for your matter, it costs $50 to generate.",
  "A path may be available",
  "Save this matter and continue",
  "Create an account or sign in",
  "free Briefcase",
  "Briefcase",
  "Packet path available",
  "Your Briefcase is free. Complete your packet information and pay only when you're ready to generate your packet.",
  "$50 one time when you are ready to generate this packet",
  "Complete packet information",
  "Complete packet information before payment",
  "Review for accuracy",
  "$50 one time for this matter.",
  "Pay $50 and generate my packet.",
  "Checkout is not created before this action.",
  "expungement_packet",
  "5000 cents in USD",
  "signed Stripe event -> exact matter payment record -> exact matter entitlement -> durable render job",
  "Payment confirmed",
  "Preparing packet",
  "Packet ready",
  "A separate new matter requires a separate payment.",
  "Sponsored RCAP authority never calls the consumer payment writer."
]);

requirePhrases("docs/product-flows/rcap-partner-portal-user-flow.md", [
  // Account-first partner model.
  "Start your record-clearing screening",
  "Create account",
  "account-first",
  "No payment language",
  "Verify email",
  // Accuracy review + the four result lanes.
  "Let's make sure we have this right",
  "Continue to packet builder",
  "Continue to my Briefcase",
  "View my next steps",
  "View my Briefcase",
  // Commercial bypass + packet flow.
  "Skip Stripe Payment Gate",
  "bypass payment",
  "State-Specific Packet Builder",
  "Generate my packet",
  "Download my packet",
  // Cap accounting rule.
  "Packet generated counts against the partner cap",
  "does not count against the partner cap"
]);

requirePhrases("docs/product-flows/README.md", [
  "source of truth",
  "no account wall before the free check",
  "no duplicate screening after signup",
  "DTC keeps the Briefcase and packet-information builder free",
  "Stripe appears only at the final accuracy review",
  "one personalized packet set for one exact matter for $50",
  "partner-covered users bypass Stripe"
]);

if (exists("docs/product-flows/expungement-ai-dtc-user-flow.md")) {
  const dtc = read("docs/product-flows/expungement-ai-dtc-user-flow.md");
  const orderedMarkers = [
    "## Direct-to-consumer flow",
    "**Start a free guided check**",
    "**Review the authoritative result**",
    "**Create an account or sign in**",
    "**Open the free Briefcase matter**",
    "**Complete packet information before payment**",
    "**Review for accuracy**",
    "**Create a matter-bound Checkout Session**",
    "**Confirm payment and generate**",
    "**Download, reopen, and follow up**"
  ];
  let priorIndex = -1;
  for (const marker of orderedMarkers) {
    const markerIndex = dtc.indexOf(marker);
    assert(markerIndex >= 0, `DTC flow is missing ordered stage: ${marker}`);
    assert(markerIndex > priorIndex, `DTC flow stage is out of order: ${marker}`);
    priorIndex = markerIndex;
  }

  assert(
    !dtc.includes("Generate my packet — $50") && !dtc.includes("Generate my packet - $50"),
    "The canonical DTC flow must use the approved final CTA without an em-dash or hyphen price construction."
  );
}

if (failures.length) {
  console.error("Product flow docs verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Product flow docs verifier passed.");
