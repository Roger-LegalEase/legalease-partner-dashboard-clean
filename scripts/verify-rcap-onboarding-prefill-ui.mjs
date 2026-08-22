import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const internal = read(
  "src/app/internal/partners/onboarding/[partnerSlug]/Phase1PrefillPanel.tsx"
);
const home = read("src/app/partner/onboarding/Phase1OnboardingHome.tsx");
const section = read(
  "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
);
const staffSection = read(
  "src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx"
);
const review = read(
  "src/app/partner/onboarding/review/OnboardingReviewClient.tsx"
);

for (const text of [
  "Import known partner data",
  "Add structured suggestion",
  "Suggestion review",
  "Apply preview",
  "Apply selected",
  "Select all approved and conflict-free",
  "Preview as partner",
  "Conflict",
  "Approve",
  "Reject",
  "Supersede"
]) {
  assert.match(internal, new RegExp(text));
}
assert.match(internal, /overflow-x-auto/);
assert.match(internal, /min-w-\[1100px\]/);
assert.match(internal, /window\.confirm/);
// The prepared banner's wording lives in the canonical partner copy contract, not inline
// in the component. Assert both halves: the contract owns the sentence, and the home reads
// it from there rather than keeping a second copy that can drift.
const partnerCopy = read("src/lib/partners/onboarding/partner-copy.ts");
assert.match(partnerCopy, /Your starting setup is ready to review/);
assert.match(partnerCopy, /Review prepared setup/);
assert.match(home, /PREPARED_BANNER/);
assert.match(home, /from "@\/lib\/partners\/onboarding\/partner-copy"/);
assert.doesNotMatch(
  home,
  /"Your starting setup is ready to review"/,
  "the home should read the banner from the contract, not restate it"
);
assert.match(home, /hasPendingPrefill/);
const presentation = read(
  "src/lib/partners/onboarding/implementation-presentation.ts"
);
assert.match(presentation, /Pre-filled, review needed/);
assert.match(section, /Pre-filled by LegalEase\. Please review\./);
assert.match(section, /Save and Continue/);
assert.match(staffSection, /read the submitted or approved implementation record/);
assert.match(review, /Pre-filled information needs review/);
assert.match(review, /pendingPrefillSections\.length > 0/);

for (const forbidden of [
  "sourceReferenceId",
  "sourceLabel",
  "confidence",
  "internal reviewer",
  "meeting notes",
  "email excerpts"
]) {
  assert.equal(
    `${home}\n${section}\n${review}`.includes(forbidden),
    false,
    `Partner UI must not expose ${forbidden}`
  );
}

console.log(
  "RCAP onboarding prefill UI verification passed: internal review/apply/conflict UX and calm partner pending-review/confirmation states."
);
