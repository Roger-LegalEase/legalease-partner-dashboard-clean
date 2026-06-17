import { verifyOverlayFactory } from "./rcap-all50-overlay-factory-lib.mjs";

const result = verifyOverlayFactory();
const { summary } = result.manifest;

if (!result.passed) {
  console.error("RCAP all-50 overlay factory verification failed:");
  for (const failure of result.failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP all-50 overlay factory verification passed.");
console.log(`Total forms found: ${summary.totalFormsFound}`);
console.log(`Mapped forms: ${summary.mappedForms}`);
console.log(`Rendered samples: ${summary.renderedSamples}`);
console.log(`Partial maps: ${summary.partialMaps}`);
console.log(`Blocked XFA: ${summary.blockedXfa}`);
console.log(`Blocked encrypted: ${summary.blockedEncrypted}`);
console.log(`Blocked unreadable: ${summary.blockedUnreadable}`);
console.log(`Visual review pending: ${summary.visualReviewPending}`);
