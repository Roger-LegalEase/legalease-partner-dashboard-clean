// Verifier: Expungement.ai state landing pages.
//
//   npm run expungement:verify-state-landing-pages
//
// Proves the state landing system is complete, data-driven, copy-safe, multi-state, and does not
// touch payment / partner surfaces. Imports the REAL TypeScript data builder (via the ts-esm
// loader) so it validates exactly what the pages render.

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { deriveAllStateContent } from "./lib/state-landing-derive.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = process.cwd();
const failures = [];
const fail = (msg) => failures.push(msg);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const dataMod = await import("../src/lib/expungement-ai/state-landing/state-landing-data.ts");
const sitemapMod = await import("../src/app/sitemap.ts");
const generated = (await import("../src/lib/expungement-ai/state-landing/generated-state-content.json")).default;

const {
  listStateLandingSlugs,
  getStateLandingDataBySlug,
  collectLandingStrings,
  jurisdictionCount
} = dataMod;

const EXPECTED_STATE_NAMES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida",
  "Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine",
  "Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska",
  "Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas",
  "Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

// ---------------------------------------------------------------------------------------------
// 1. Route coverage
// ---------------------------------------------------------------------------------------------
const slugs = listStateLandingSlugs();
const allData = slugs.map((s) => getStateLandingDataBySlug(s)).filter(Boolean);

if (slugs.length !== 51) fail(`Expected 51 state landing slugs (50 states + DC), got ${slugs.length}.`);
if (jurisdictionCount() !== 51) fail(`jurisdictionCount() should be 51, got ${jurisdictionCount()}.`);
if (!slugs.includes("district-of-columbia")) fail("DC landing page (district-of-columbia) is missing.");

const names = new Set(allData.map((d) => d.name));
for (const stateName of EXPECTED_STATE_NAMES) {
  if (!names.has(stateName)) fail(`Missing landing page for state: ${stateName}.`);
}
if (!names.has("District of Columbia")) fail("Missing landing page for District of Columbia.");

if (getStateLandingDataBySlug("not-a-real-state") !== null) {
  fail("Unknown slug should resolve to null (page must 404 via notFound), but returned data.");
}

// Page route hardening: dynamicParams=false so unknown slugs are real 404s (no generic fallback).
const pageSrc = read("src/app/expungement-ai/states/[stateSlug]/page.tsx");
if (!/dynamicParams\s*=\s*false/.test(pageSrc)) fail("state page should set `export const dynamicParams = false`.");
if (!/notFound\(\)/.test(pageSrc)) fail("state page should call notFound() for unknown slugs.");
if (!/generateStaticParams/.test(pageSrc)) fail("state page should export generateStaticParams.");

// ---------------------------------------------------------------------------------------------
// 2. Data source integrity — the committed JSON must be a byte-exact projection of the engine
//    profiles (no drift, no generic fallback, no silent MS substitution).
// ---------------------------------------------------------------------------------------------
const { content: rederived, problems } = deriveAllStateContent(root);
for (const problem of problems) fail(`Derivation problem: ${problem}`);
if (JSON.stringify(rederived) !== JSON.stringify(generated.states)) {
  fail("generated-state-content.json is stale — re-run `npm run expungement:build-state-landing-content`.");
}
// Every state's highlights must be its own (unique route set → cannot be a fallback to another state).
const highlightFingerprints = new Map();
for (const d of allData) {
  if (d.pathwayHighlights.length < 2) fail(`${d.name}: fewer than 2 pathway highlights (thin page risk).`);
  const fp = d.pathwayHighlights.join(" || ");
  if (highlightFingerprints.has(fp)) {
    fail(`${d.name} shares an identical pathway-highlight set with ${highlightFingerprints.get(fp)} (possible fallback).`);
  }
  highlightFingerprints.set(fp, d.name);
}

// ---------------------------------------------------------------------------------------------
// 3. Terminology — state-specific vocabulary, not blanket "expungement" everywhere.
// ---------------------------------------------------------------------------------------------
const bySlug = Object.fromEntries(allData.map((d) => [d.slug, d]));
const termText = (slug) => {
  const d = bySlug[slug];
  return d ? `${d.displayTerm} ${d.termBlurb}`.toLowerCase() : "";
};
const requireTerm = (slug, needle) => {
  if (!termText(slug).includes(needle.toLowerCase())) fail(`${slug} landing should use the term "${needle}".`);
};
requireTerm("alaska", "CourtView Removal");
requireTerm("nevada", "Record Sealing");
requireTerm("massachusetts", "CORI Sealing");
requireTerm("pennsylvania", "Limited Access");
requireTerm("pennsylvania", "Summary Expungement");
requireTerm("pennsylvania", "Court Case Expungement");
requireTerm("hawaii", "Administrative Application");
requireTerm("delaware", "Discretionary");

const distinctTerms = new Set(allData.map((d) => d.displayTerm));
if (distinctTerms.size < 4) {
  fail(`Expected several distinct display terms across states, only ${distinctTerms.size} found (thin/cloned risk).`);
}

// ---------------------------------------------------------------------------------------------
// 4. CTA routing + multi-state behavior
// ---------------------------------------------------------------------------------------------
const PARTNER_MARKERS = ["we-must-vote", "/documents/", "?session=", "/partners/", "partnerSlug"];
for (const d of allData) {
  const expected = `/expungement-ai/screening/${d.code}`;
  if (d.hero.ctaPrimaryHref !== expected) {
    fail(`${d.name}: primary CTA should route to ${expected}, got ${d.hero.ctaPrimaryHref}.`);
  }
  if (d.changeStateHref !== "/expungement-ai/screening") {
    fail(`${d.name}: "change state" link should be the general picker /expungement-ai/screening.`);
  }
  for (const marker of PARTNER_MARKERS) {
    if (d.hero.ctaPrimaryHref.includes(marker) || d.changeStateHref.includes(marker)) {
      fail(`${d.name}: CTA leaks partner/DTC-unsafe marker "${marker}".`);
    }
  }
  // Preselection must not be a lock: the general picker link + a "different state" affordance exist.
  if (!/different state/i.test(d.changeStateLabel)) {
    fail(`${d.name}: missing a "choose a different state" affordance (state lock risk).`);
  }
  // No copy may tell the user they can only check this one state.
  const joined = collectLandingStrings(d).join(" ").toLowerCase();
  if (joined.includes(`only check ${d.name.toLowerCase()}`) || joined.includes("can only check this state")) {
    fail(`${d.name}: copy implies the user may only check this one state.`);
  }
  // Multi-state must be explicitly reassured somewhere on the page.
  if (!joined.includes("another") || !joined.includes("briefcase")) {
    fail(`${d.name}: page should reassure users they can check another case from Briefcase.`);
  }
}

// Briefcase itself still offers a "check another / new guided check" path for other states.
const briefcaseShell = read("src/components/expungement-ai/BriefcaseShell.tsx");
if (!briefcaseShell.includes("/expungement-ai/check") || !briefcaseShell.includes("briefcase.new_check")) {
  fail("BriefcaseShell no longer offers a 'New guided check' path — multi-state Briefcase regressed.");
}
const briefcaseViews = read("src/components/expungement-ai/BriefcaseViews.tsx");
if (!briefcaseViews.includes("/expungement-ai/check")) {
  fail("BriefcaseViews empty-state CTA no longer routes to the picker (/expungement-ai/check).");
}

// ---------------------------------------------------------------------------------------------
// 5. Copy / legal safety
// ---------------------------------------------------------------------------------------------
const SAFE_CONTEXTS = [
  "not a law firm",
  "not legal advice",
  "no legal representation",
  "not legal representation",
  "no guaranteed court outcome",
  "no guaranteed outcome",
  "there is no guaranteed",
  "cannot guarantee",
  "does not guarantee",
  "no attorney"
];
const BANNED = [
  ["qualif", "qualify/qualified"],
  ["eligib", "eligible/eligibility"],
  ["elegib", "elegible/elegibilidad"],
  ["calific", "califica/calificar"],
  ["approved", "approved"],
  ["aprobad", "aprobado"],
  ["guarante", "guarantee/guaranteed"],
  ["garantiz", "garantizado"],
  ["law firm", "law firm"],
  ["legal advice", "legal advice"],
  ["legal representation", "legal representation"],
  ["attorney", "attorney"],
  ["evaluator", "evaluator"],
  ["engine decides", "engine decides"],
  ["we decide", "we decide"]
];

function neutralize(text) {
  let out = text.toLowerCase();
  for (const safe of SAFE_CONTEXTS) out = out.split(safe).join(" ");
  return out;
}
function scanCopy(label, text) {
  const cleaned = neutralize(text);
  if (text.includes("—")) fail(`${label}: em dash present: "${text.trim().slice(0, 120)}"`);
  if (/^(?:Situation|Remedy|Tool|Pathway|Path|Family|Regime)\s+[A-Z0-9]+\b/i.test(text.trim())) {
    fail(`${label}: internal option label present: "${text.trim().slice(0, 120)}"`);
  }
  for (const [stem, human] of BANNED) {
    if (cleaned.includes(stem)) fail(`${label}: avoid-list term (${human}) present: "${text.trim().slice(0, 120)}"`);
  }
}

for (const d of allData) {
  for (const s of collectLandingStrings(d)) scanCopy(`${d.name} copy`, s);
  // Required disclaimers on every page.
  const joined = collectLandingStrings(d).join(" ").toLowerCase();
  if (!joined.includes("not a law firm")) fail(`${d.name}: missing "not a law firm" disclaimer.`);
  if (!joined.includes("self-help")) fail(`${d.name}: missing "self-help" framing.`);
  if (!joined.includes("final decision")) fail(`${d.name}: missing court/agency final-decision disclaimer.`);
  if (!joined.includes("may be available")) fail(`${d.name}: missing "a path may be available" framing.`);
}

// Static JSX copy in the shared template must also be clean (hero/final CTA hard-coded strings).
const componentSrc = read("src/components/expungement-ai/state-landing/StateLandingPage.tsx");
const jsxText = componentSrc.replace(/[<>{}]/g, " ");
scanCopy("StateLandingPage.tsx static copy", jsxText);
if (!/not a law firm/i.test(componentSrc)) fail("StateLandingPage.tsx should carry the not-a-law-firm disclaimer.");

// ---------------------------------------------------------------------------------------------
// 6. SEO
// ---------------------------------------------------------------------------------------------
const canonicals = new Set();
const titles = new Set();
for (const d of allData) {
  const { title, description, canonical, ogTitle, ogDescription } = d.seo;
  if (!title) fail(`${d.name}: missing SEO title.`);
  if (!title.includes(d.name)) fail(`${d.name}: SEO title should include the state name.`);
  if (!description || description.length < 50) fail(`${d.name}: SEO description too short/missing.`);
  if (description.length > 210) fail(`${d.name}: SEO description too long (${description.length} chars).`);
  if (canonical !== `https://expungement.ai/states/${d.slug}`) fail(`${d.name}: wrong canonical (${canonical}).`);
  if (!ogTitle || !ogDescription) fail(`${d.name}: missing Open Graph title/description.`);
  if (canonicals.has(canonical)) fail(`${d.name}: duplicate canonical ${canonical}.`);
  if (titles.has(title)) fail(`${d.name}: duplicate SEO title (thin page).`);
  canonicals.add(canonical);
  titles.add(title);
}

// generateMetadata must set canonical.
if (!/alternates:\s*{\s*canonical/.test(pageSrc)) fail("state page generateMetadata should set alternates.canonical.");

// Sitemap includes every state page.
// The sitemap became async in phase 43 (it now also lists published blog posts, which are a database
// read). `await` works on both a promise and a plain array, so this assertion holds either way.
const sitemap = await sitemapMod.default();
const sitemapUrls = new Set(sitemap.map((e) => e.url));
for (const d of allData) {
  if (!sitemapUrls.has(`https://expungement.ai/states/${d.slug}`)) {
    fail(`${d.name}: not present in sitemap.`);
  }
}

// ---------------------------------------------------------------------------------------------
// 7. Similarity / thin-page protection
// ---------------------------------------------------------------------------------------------
const fingerprints = new Set();
for (const d of allData) {
  const fp = `${d.displayTerm}|${d.pathwayHighlights.join(",")}|${d.faq[0]?.a ?? ""}`;
  if (fingerprints.has(fp)) fail(`${d.name}: page content is a near-duplicate of another state (thin page).`);
  fingerprints.add(fp);
  if (!d.hero.headline.includes(d.name)) fail(`${d.name}: hero headline is not state-specific.`);
  if (!d.faq.some((f) => f.a.includes(d.name))) fail(`${d.name}: no FAQ answer references the state (thin page).`);
}

// ---------------------------------------------------------------------------------------------
// 8. Domain / product safety
// ---------------------------------------------------------------------------------------------
const proxySrc = read("src/proxy.ts");
if (!/pathname\.startsWith\("\/states\/"\)/.test(proxySrc)) {
  fail("proxy.ts is missing the /states/ → /expungement-ai mapping (state pages would 404).");
}
// The partner host must still land on the /partners route group. Phase 43 replaced the inline
// single-path ternary with legalEasePartnerPath() (an allowlist mirroring expungementAiPath), so
// this asserts the invariant — partner host maps "/" to /partners and never leaks another
// route group — rather than pinning the old one-line implementation.
if (!/host === "legaleasepartner\.com"[\s\S]*?return legalEasePartnerPath\(pathname\)/.test(proxySrc)) {
  fail("proxy.ts partner host mapping (legaleasepartner.com → legalEasePartnerPath) changed unexpectedly.");
}
if (!/function legalEasePartnerPath[\s\S]*?return pathname === "\/" \? "\/partners" : `\/partners\$\{pathname\}`/.test(proxySrc)) {
  fail("legalEasePartnerPath must map the partner host root to /partners and prefix every allowlisted path with /partners.");
}
// State pages must not import or trigger any payment/checkout logic.
for (const [label, src] of [["page.tsx", pageSrc], ["StateLandingPage.tsx", componentSrc]]) {
  if (/checkout|createCheckout|stripe|ConsumerCheckoutButton/i.test(src)) {
    fail(`${label} references payment/checkout logic — state pages must stay marketing-only.`);
  }
}

// ---------------------------------------------------------------------------------------------
if (failures.length > 0) {
  console.error("Expungement.ai state landing pages verification FAILED.");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("Expungement.ai state landing pages verifier passed.");
console.log(`Verified ${allData.length} jurisdictions (50 states + DC): data-driven from engine profiles,`);
console.log("state-specific terminology, preselect-not-lock CTAs, copy-safe, SEO + sitemap complete,");
console.log("no thin clones, no payment/partner surface touched.");
