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
assert(route.includes("robots: { index: false, follow: false }"), "ineligible and guessed partner routes must be noindex");

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
assert(loader.includes("listAuthoritativelyPublicPartnerSlugs"), "partner sitemap must share the authoritative loader module");
assert(loader.includes('.eq("status", "live")'), "partner sitemap must require the live publication state");
assert(loader.includes('.eq("landing_page_ready", true)'), "partner sitemap must require a ready public page");
assert(loader.includes('.not("internal_approved_at", "is", null)'), "partner sitemap must require internal approval");
assert(loader.includes('.not("launched_at", "is", null)'), "partner sitemap must require explicit launch");

const intake = read("src/lib/expungement-ai/rcap-partner-intake.ts");
assert(intake.includes("isPartnerActivationAuthorized"), "participant intake must reuse the activation predicate");

const sitemap = read("src/app/sitemap.ts");
assert(!sitemap.includes("rythm-labs-test"), "Rythm Labs must not appear in the sitemap");
assert(!sitemap.includes("/p/"), "partner routes must not be emitted by the public sitemap");

const partnerSitemap = read("src/app/partner-sitemap.xml/route.ts");
assert(partnerSitemap.includes("listAuthoritativelyPublicPartnerSlugs"), "partner sitemap must use authoritative public slugs");
assert(partnerSitemap.includes("productionPartnerAppUrl"), "partner sitemap URLs must stay on the partner host");

const robots = read("src/app/robots.ts");
assert(robots.includes("productionPartnerAppUrl"), "robots must advertise the gated partner sitemap");
assert(robots.includes('"/partner/"'), "robots must disallow signed-in partner workspace routes");

console.log("Public partner publication security verification passed.");
console.log("Five publication and activation combinations fail closed except published plus active.");
console.log("The public route, metadata, robots, and partner sitemap use the same fail-closed authority state.");
