import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = process.cwd();
const LANDING = "design-handoff/expungement-ai-frontend/files-20/Expungement-Landing-Full.html";
const COPY = "src/app/expungement-ai/landing-approved-copy.ts";
const INTERACTIONS = "src/app/expungement-ai/ExpungementLandingInteractions.tsx";
const HANDOFF = "src/app/expungement-ai/ExpungementLandingHandoff.tsx";
const UTILS = "src/app/expungement-ai/landing-handoff-utils.ts";
const LAYOUT = "src/app/expungement-ai/layout.tsx";
const CANONICAL = "docs/product-flows/expungement-ai-website-copy.md";
const REPORT = "data/expungement-ai/reports/plain-language-copy-audit.json";

const { APPROVED_LANDING_COPY_EN, APPROVED_LANDING_COPY_ES } = await import("../src/app/expungement-ai/landing-approved-copy.ts");

const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const landing = read(LANDING);
const copySource = read(COPY);
const interactions = read(INTERACTIONS);
const handoff = read(HANDOFF);
const utils = read(UTILS);
const canonical = read(CANONICAL);
const report = fs.existsSync(path.join(ROOT, REPORT)) ? read(REPORT) : "";
const errors = [];

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

const removedTestimonialPhrases = [
  "In their words",
  "What people said after using Expungement.ai",
  "People who cleared their record with Expungement.ai",
  "Tanya R.",
  "Marcus D.",
  "Lisa F.",
  "Verified quote",
  "Verified product stage"
];

for (const [surface, source] of [
  ["landing source", landing],
  ["approved localization", copySource],
  ["canonical homepage copy", canonical],
  ["landing handoff", handoff],
  ["landing handoff utilities", utils],
  ["metadata and structured-data source", `${read(LAYOUT)}\n${handoff}`],
  ["generated participant-copy inventory", report]
]) {
  for (const phrase of removedTestimonialPhrases) {
    requireCondition(!source.toLowerCase().includes(phrase.toLowerCase()), `${surface} still contains removed testimonial phrase ${JSON.stringify(phrase)}.`);
  }
}

requireCondition(!/\btesti(?:monial)?(?:-|_|\b)/i.test(landing), "Landing markup or CSS still contains testimonial selectors or names.");
requireCondition(!/\btesti(?:monial)?(?:-|_|\b)/i.test(utils), "Landing transformation still contains testimonial filtering or asset rewriting.");
for (const index of [1, 2, 3]) {
  for (const extension of ["jpg", "webp"]) {
    requireCondition(!fs.existsSync(path.join(ROOT, `public/expungement-ai/testimonial-${index}.${extension}`)), `Orphaned testimonial-${index}.${extension} still exists.`);
  }
}
requireCondition(/<section class="state">[\s\S]*?<\/section>\s*<section class="faqsec" id="faq">/i.test(landing), "Removing testimonials left an unexpected wrapper or section gap before Questions.");

const heroStory = landing.match(/<div class="hero-story"[\s\S]*?<p class="sr-only"[^>]*data-tab-live[^>]*><\/p>\s*<\/div>/i)?.[0] ?? "";
requireCondition(Boolean(heroStory), "Interactive hero product story is missing.");
requireCondition(count(heroStory, /role="tab"/g) === 3, "Hero product story must have exactly three tabs.");
requireCondition(count(heroStory, /aria-selected="true"/g) === 1, "Hero product story must start with exactly one selected state.");
requireCondition(count(heroStory, /role="tabpanel"/g) === 3, "Hero product story must have exactly three panels.");
requireCondition(!/class="story-choices"[^>]*aria-hidden=/i.test(heroStory), "Visible hero example choices are hidden from screen readers.");
for (const key of ["hero_story_guided", "hero_story_briefcase", "hero_story_packet"]) {
  requireCondition(heroStory.includes(`data-i18n="${key}"`), `Hero product story is missing ${key}.`);
}
requireCondition(!/(eligible|qualif(?:y|ies|ied)|participant name|case number)/i.test(heroStory), "Hero example contains a fake result or participant data.");

requireCondition(count(landing, /data-section-link="(?:how-it-works|what-you-get|pricing|privacy|faq)"/g) === 10, "Desktop and mobile navigation must each expose all five active-section links.");
requireCondition(landing.includes("class=\"nav-indicator\""), "Moving active-navigation rule is missing.");
requireCondition(interactions.includes("aria-current\", \"location\""), "Active navigation does not expose its current section accessibly.");
requireCondition(!interactions.includes("pushState("), "Scroll state must not churn browser history.");

const journey = landing.match(/<div class="journey"[\s\S]*?<\/div>\s*<div class="cta-wrap">/i)?.[0] ?? "";
requireCondition(count(journey, /class="jstep(?: is-current)?"/g) === 3, "Three-step story must keep all three steps in server-rendered markup.");
requireCondition(count(journey, /data-journey-step="[012]"/g) === 3, "Each journey heading must be an interactive step control.");
requireCondition(/\.jstep\{[^}]*opacity:1;transform:none/i.test(landing), "Journey steps are hidden until JavaScript runs.");
requireCondition(interactions.includes("--journey-progress"), "Journey rail does not respond to reading progress.");

const briefcase = landing.match(/<div class="brief-demo"[\s\S]*?<p class="sr-only"[^>]*data-tab-live[^>]*><\/p>\s*<\/div>/i)?.[0] ?? "";
requireCondition(Boolean(briefcase), "Inline Example Briefcase is missing.");
requireCondition(briefcase.includes('data-i18n="brief_demo_label"'), "Inline Briefcase is not visibly labeled as an example.");
requireCondition(count(briefcase, /role="tab"/g) === 4, "Example Briefcase must have exactly four tabs.");
requireCondition(count(briefcase, /role="tabpanel"/g) === 4, "Example Briefcase must have exactly four panels.");
requireCondition(/href="#briefcase-demo"/.test(landing) && utils.includes('href="/expungement-ai#briefcase-demo"'), "See how the Briefcase works does not reach the inline demo.");
requireCondition(!/(cleared|approved|granted)/i.test(briefcase), "Example Briefcase implies a successful legal outcome.");

const wilma = landing.match(/<section class="wilma">[\s\S]*?<\/section>/i)?.[0] ?? "";
requireCondition(wilma.includes('id="wilma-explainer-toggle"'), "Wilma explainer control is missing.");
requireCondition(wilma.includes('data-i18n="wl_q"') && wilma.includes('data-i18n="wl_a"'), "Wilma approved question or response is missing.");
requireCondition(wilma.includes('data-i18n="wl_safe"'), "Wilma self-help disclaimer is not persistently rendered.");
requireCondition(!/<(?:input|textarea)\b|contenteditable=/i.test(wilma), "Wilma marketing example exposes an open-ended input.");
requireCondition(!handoff.includes("WilmaBubble"), "The public landing still mounts the live arbitrary-question Wilma widget.");

requireCondition(!/\bfetch\s*\(/.test(interactions), "Homepage interaction controller calls an API.");
requireCondition(!/setInterval\s*\(|autoplay/i.test(interactions), "Homepage interactions autoplay or loop.");
requireCondition(interactions.includes("prefers-reduced-motion: reduce"), "Interaction controller does not honor reduced-motion preferences.");
requireCondition(/@media\(prefers-reduced-motion:reduce\)/.test(landing), "Landing CSS has no reduced-motion treatment.");
requireCondition(!/(pulseBtn|@keyframes drift|class="sky"|class="cloud)/.test(landing), "Decorative looping hero animation remains.");

const enKeys = Object.keys(APPROVED_LANDING_COPY_EN).sort();
const esKeys = Object.keys(APPROVED_LANDING_COPY_ES).sort();
requireCondition(JSON.stringify(enKeys) === JSON.stringify(esKeys), "English and Spanish interaction dictionaries are not in parity.");
for (const key of [
  "hero_story_tabs_label", "hero_story_guided", "hero_story_briefcase", "hero_story_packet",
  "brief_demo_label", "brief_demo_s0", "brief_demo_s1", "brief_demo_s2", "brief_demo_s3",
  "brief_demo_n0", "brief_demo_n1", "brief_demo_n2", "brief_demo_n3", "wl_action", "wl_action_close"
]) {
  requireCondition(Boolean(APPROVED_LANDING_COPY_EN[key]?.trim()), `English interaction copy is missing ${key}.`);
  requireCondition(Boolean(APPROVED_LANDING_COPY_ES[key]?.trim()), `Spanish interaction copy is missing ${key}.`);
}

if (errors.length) {
  console.error("Expungement.ai homepage-interaction verification failed.");
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  testimonials: "removed from rendered copy, accessibility copy, localization, metadata, structured-data sources, generated inventory, and assets",
  heroStates: 3,
  activeNavigationSections: 5,
  journeySteps: 3,
  briefcaseStates: 4,
  wilma: "constrained approved explanation with no open-ended input",
  apiCallsFromDemos: 0,
  englishKeys: enKeys.length,
  spanishKeys: esKeys.length,
  newMotionDependency: false
}, null, 2));
