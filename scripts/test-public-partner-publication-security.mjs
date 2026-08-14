import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");
const { isPublicPartnerEligible } = await import(
  "../src/lib/partners/partner-public-eligibility.ts"
);

const active = {
  paymentStatus: "paid",
  qualificationStatus: "qualified",
  provisioningStatus: "provisioned"
};
const inactive = { ...active, provisioningStatus: "paused" };
const published = {
  status: "live",
  landingPageReady: true,
  internalApprovedAt: "2026-08-14T12:00:00.000Z",
  launchedAt: "2026-08-14T12:05:00.000Z"
};
const privatePublication = {
  ...published,
  status: "ready_to_launch",
  launchedAt: null
};

const cases = [
  ["missing partner", { activation: null, publication: null }, false],
  ["private and inactive", { activation: inactive, publication: privatePublication }, false],
  ["published but inactive", { activation: inactive, publication: published }, false],
  ["private but active", { activation: active, publication: privatePublication }, false],
  ["published and active", { activation: active, publication: published }, true]
];

for (const [name, facts, expected] of cases) {
  assert.equal(isPublicPartnerEligible(facts), expected, `${name} eligibility mismatch`);
}

assert.equal(
  isPublicPartnerEligible({
    activation: active,
    publication: { ...published, landingPageReady: false }
  }),
  false,
  "an unreviewed landing page must stay private"
);
assert.equal(
  isPublicPartnerEligible({
    activation: active,
    publication: { ...published, internalApprovedAt: null }
  }),
  false,
  "a live-looking row without internal approval must fail closed"
);

const route = read("src/app/p/[partnerSlug]/page.tsx");
assert(route.includes('export const dynamic = "force-dynamic"'), "public partner pages must remain dynamic");
assert(route.includes("getAuthoritativelyPublicPartnerRecord"), "route must use the shared eligibility loader");
assert(route.includes("notFound();"), "ineligible partner routes must use Next.js notFound");
assert(!route.includes("PartnerNotFound"), "route must not confirm an internal partner record exists");

const loader = read("src/lib/partners/public-partner-page.ts");
for (const field of [
  "payment_status",
  "qualification_status",
  "provisioning_status",
  "landing_page_ready",
  "internal_approved_at",
  "launched_at"
]) {
  assert(loader.includes(field), `public eligibility loader must read ${field}`);
}
assert(loader.includes("return undefined"), "lookup errors must fail closed");

const intake = read("src/lib/expungement-ai/rcap-partner-intake.ts");
assert(intake.includes("isPartnerActivationAuthorized"), "participant intake must reuse the activation predicate");

const sitemap = read("src/app/sitemap.ts");
assert(!sitemap.includes("rythm-labs-test"), "Rythm Labs must not appear in the sitemap");
assert(!sitemap.includes("/p/"), "partner routes must not be emitted by the public sitemap");

console.log("Public partner publication security verification passed.");
console.log("Five publication and activation combinations fail closed except published plus active.");
console.log("The public route uses notFound, remains dynamic, and is absent from sitemap generation.");
