import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
import sharp from "sharp";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = process.cwd();
const files = {
  page: "src/app/expungement-ai/page.tsx",
  home: "src/app/expungement-ai/home-v3/ExpungementHomeV3.tsx",
  header: "src/app/expungement-ai/home-v3/HomepageHeader.tsx",
  hero: "src/app/expungement-ai/home-v3/HeroVideo.tsx",
  path: "src/app/expungement-ai/home-v3/SectionPath.tsx",
  documents: "src/app/expungement-ai/home-v3/PacketDocumentSet.tsx",
  privacy: "src/app/expungement-ai/home-v3/PrivacyLedger.tsx",
  wilma: "src/app/expungement-ai/home-v3/WilmaPreview.tsx",
  coverage: "src/app/expungement-ai/home-v3/CoverageMatrix.tsx",
  coverageData: "src/app/expungement-ai/home-v3/coverage-data.ts",
  coverageTypes: "src/app/expungement-ai/home-v3/coverage-types.ts",
  faq: "src/app/expungement-ai/home-v3/FaqAccordion.tsx",
  styles: "src/app/expungement-ai/home-v3/ExpungementHomeV3.module.css",
  modal: "src/app/expungement-ai/sample-packet/SamplePacketModal.tsx",
  copy: "src/app/expungement-ai/landing-approved-copy.ts",
  canonical: "docs/product-flows/expungement-ai-website-copy.md",
  report: "data/expungement-ai/reports/plain-language-copy-audit.json"
};

const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const source = Object.fromEntries(Object.entries(files).map(([key, value]) => [key, read(value)]));
const runtimeSource = [source.page, source.home, source.header, source.hero, source.path, source.documents, source.privacy, source.wilma, source.coverage, source.coverageData, source.coverageTypes, source.faq, source.styles, source.modal, source.copy].join("\n");
const errors = [];

const { APPROVED_LANDING_COPY_EN, APPROVED_LANDING_COPY_ES } = await import("../src/app/expungement-ai/landing-approved-copy.ts");

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

function count(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

requireCondition(source.page.includes("<ExpungementHomeV3"), "The marketing route does not render the V3 homepage.");
requireCondition(!source.page.includes("ExpungementLandingHandoff"), "The legacy landing handoff still renders underneath V3.");

const orderedSections = [
  "<HeroVideo", 'id="barrier"', 'id="guided-check"', 'id="how-it-works"', 'id="briefcase"', 'id="what-you-get"',
  'id="pricing"', 'id="privacy"', 'id="wilma"', 'id="coverage"', 'id="faq"'
];
let previousIndex = -1;
for (const marker of orderedSections) {
  const index = source.home.indexOf(marker);
  requireCondition(index > previousIndex, `Homepage section marker ${marker} is missing or out of canonical order.`);
  previousIndex = index;
}
requireCondition(count(source.home, /<SamplePacketModal\s*\/>/g) === 1, "The sanitized sample packet modal must mount exactly once.");
requireCondition(count(source.home, /data-sample-packet-trigger="true"/g) === 1 && count(source.hero, /data-sample-packet-trigger="true"/g) === 1, "Hero and footer sample CTAs must use the real sanitized preview.");

for (const phrase of [
  "In their words", "What people said after using Expungement.ai", "People who cleared their record with Expungement.ai",
  "Tanya R.", "Marcus D.", "Lisa F.", "Verified quote", "Verified product stage"
]) {
  for (const [surface, value] of [["V3 runtime", runtimeSource], ["canonical copy", source.canonical], ["participant-copy report", source.report]]) {
    requireCondition(!value.toLowerCase().includes(phrase.toLowerCase()), `${surface} contains removed testimonial phrase ${JSON.stringify(phrase)}.`);
  }
}
requireCondition(!/testi(?:monial)?/i.test(runtimeSource), "V3 runtime contains a testimonial component, selector, or copy.");

for (const id of ["how-it-works", "what-you-get", "pricing", "privacy", "faq"]) {
  requireCondition(source.header.includes(`[\"${id}\"`), `Navigation is missing ${id}.`);
}
requireCondition(source.header.includes("IntersectionObserver"), "Header state does not use threshold-based observation.");
requireCondition(source.header.includes('aria-current={activeSection === id ? "location"'), "Active navigation does not expose aria-current=location.");
requireCondition(!source.header.includes("pushState("), "Active navigation must not churn browser history.");
requireCondition(source.header.includes('role="dialog"') && source.header.includes('aria-modal="true"'), "The mobile menu is not exposed as a modal panel.");
requireCondition(source.header.includes('event.key === "Tab"') && source.header.includes('event.key === "Escape"'), "The mobile menu lacks keyboard containment or Escape handling.");

for (const marker of ["<video", "autoPlay", "muted", "loop", "playsInline", "poster=", "expungement-ai-hero-approved.mp4"]) {
  requireCondition(source.hero.includes(marker), `Hero video is missing ${marker}.`);
}
requireCondition(source.hero.includes("prefers-reduced-motion: reduce"), "Hero video does not detect reduced motion.");
requireCondition(source.hero.includes("saveData"), "Hero video does not honor Save-Data.");
requireCondition(source.hero.includes("max-width: 900px"), "Hero video does not use the tablet/mobile poster-only rule.");
requireCondition(source.hero.includes("aria-pressed={manuallyPaused}"), "Pause control does not accurately expose manually paused state.");
requireCondition(source.hero.includes("heroVideoLayer") && source.hero.includes('aria-hidden="true"'), "Decorative video is not hidden from assistive technology.");
requireCondition(!source.hero.includes("controls"), "Native video controls must not render over the designed control.");
requireCondition(source.hero.includes('data-hero-overlay="true"') && source.hero.includes('data-hero-copy="true"'), "Hero geometry is not exposed to the browser verifier.");
requireCondition(source.styles.includes("width: clamp(46%, calc(16.45vw + 426px), 58%)"), "Desktop hero overlay does not use the accepted responsive 46% composition.");
requireCondition(source.styles.includes("clamp(40px, 4.17vw, 72px)"), "Hero copy does not use the reviewed 40px to 72px left shift.");

for (const asset of [
  "public/expungement-ai/hero/expungement-ai-hero-approved.mp4",
  "public/expungement-ai/hero/expungement-ai-hero-poster.jpg",
  "public/expungement-ai/hero/expungement-ai-hero-poster.webp",
  "public/expungement-ai/hero/expungement-ai-hero-poster-mobile.jpg",
  "public/expungement-ai/hero/expungement-ai-hero-poster-mobile.webp"
]) {
  requireCondition(fs.existsSync(path.join(ROOT, asset)), `Missing hero media asset ${asset}.`);
}
const ffprobe = spawnSync("ffprobe", [
  "-v", "error", "-show_entries", "stream=codec_name,codec_type,width,height,pix_fmt,r_frame_rate", "-of", "json",
  path.join(ROOT, "public/expungement-ai/hero/expungement-ai-hero-approved.mp4")
], { encoding: "utf8" });
if (ffprobe.error?.code === "ENOENT") {
  const media = fs.readFileSync(path.join(ROOT, "public/expungement-ai/hero/expungement-ai-hero-approved.mp4"));
  const mediaText = media.toString("latin1");
  const mediaHash = crypto.createHash("sha256").update(media).digest("hex");
  requireCondition(mediaHash === "89c84e00e917ec56c9668542d3f52355731c104aa18aaa17d99f8197fcca7bbe", "Production hero bytes differ from the locally ffprobe-verified approved encode.");
  requireCondition(mediaText.indexOf("moov") > 0 && mediaText.indexOf("moov") < mediaText.indexOf("mdat"), "Production hero does not expose a fast-start MP4 atom order.");
  requireCondition(mediaText.includes("avc1") && !mediaText.includes("soun"), "Production hero fallback inspection did not find H.264 video-only media.");
} else {
  requireCondition(ffprobe.status === 0, `ffprobe failed for the production hero: ${ffprobe.stderr || ffprobe.stdout || ffprobe.error?.message}`);
}
if (ffprobe.status === 0) {
  const streams = JSON.parse(ffprobe.stdout).streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  requireCondition(streams.every((stream) => stream.codec_type !== "audio"), "Production hero still has an audio stream.");
  requireCondition(video?.codec_name === "h264" && video?.width === 1600 && video?.height === 900 && video?.pix_fmt === "yuv420p" && video?.r_frame_rate === "30/1", "Production hero encoding does not match the approved optimized profile.");
}

requireCondition(source.path.includes('aria-hidden="true"'), "Orange routes are not decorative to assistive technology.");
requireCondition(source.path.includes("<rect"), "Orange route terminus square is missing.");
for (const value of ["stroke-linecap: square", "stroke-linejoin: miter", "--path: 760ms", "cubic-bezier(.7, 0, .3, 1)"]) {
  requireCondition(source.styles.includes(value), `Motion or path token is missing: ${value}.`);
}
requireCondition(!/(parallax|scroll-jacking|typewriter|spring|particle|cursor-follow|countdown|pulseBtn|@keyframes\s+(?:drift|float|breathe))/i.test(runtimeSource), "A prohibited motion pattern remains in V3.");

requireCondition(source.home.includes('src="/expungement-ai/shot-eligibility.webp"'), "Current guided-check evidence is missing.");
requireCondition(source.home.includes('src="/expungement-ai/shot-briefcase.webp"'), "Current Briefcase evidence is missing.");
requireCondition(!runtimeSource.includes("shot-result-reference-only"), "The retired result-reference screenshot is public.");
requireCondition(count(source.documents, /^\s*\["[^\n]+/gm) === 5, "Document set must expose five conditional document categories.");
requireCondition(source.documents.includes("aria-pressed={active}"), "Document-set selection has no accessible state.");

requireCondition(source.wilma.includes("wl_illustrative") && source.wilma.includes("wl_safe"), "Wilma is not persistently labeled illustrative and bounded.");
requireCondition(!/<(?:input|textarea)\b|contentEditable/i.test(source.wilma), "Wilma demo exposes a fake or open-ended input.");
requireCondition(!/\bfetch\s*\(/.test([source.wilma, source.documents, source.privacy, source.coverage, source.faq].join("\n")), "An illustrative homepage control calls an API.");
requireCondition(source.home.includes("wilma-portrait.png") && source.wilma.includes("assets/wilma.png"), "Wilma does not use the approved transparent repository art.");
requireCondition(!source.home.includes("wilma-avatar.webp") && !source.wilma.includes("wilma-avatar.webp"), "Wilma still references the baked-checkerboard homepage asset.");
requireCondition(!/\.wilmaPortrait\s*\{[^}]*position:\s*absolute/s.test(source.styles), "Wilma portrait is still absolutely positioned over editorial copy.");
requireCondition(source.home.includes("wilmaSectionIndex") && source.styles.includes(".wilmaSectionIndex") && source.styles.includes("position: static"), "Wilma section index is not isolated in normal flow.");
requireCondition(source.wilma.includes('data-speaker="visitor"') && source.wilma.includes('data-speaker="wilma"') && source.wilma.includes('data-wilma-footer="true"'), "Wilma conversation lacks stable reading order or an in-card disclaimer.");

const wilmaAsset = path.join(ROOT, "design-handoff/legalease-homepage/assets/wilma-portrait.png");
const wilmaMetadata = await sharp(wilmaAsset).metadata();
const wilmaStats = await sharp(wilmaAsset).stats();
requireCondition(wilmaMetadata.hasAlpha === true && wilmaStats.isOpaque === false, "Approved Wilma portrait does not have genuine transparency.");

const compiledProfiles = fs.readdirSync(path.join(ROOT, "src/lib/rcap-engine/compiled/profiles")).filter((file) => /^[A-Z]{2}-.+\.json$/.test(file));
const jurisdictions = compiledProfiles.map((file) => file.slice(0, 2));
requireCondition(jurisdictions.length === 51 && new Set(jurisdictions).size === 51 && jurisdictions.includes("DC"), "Coverage source must contain exactly 50 states plus D.C.");
requireCondition(source.coverageData.includes("getAllJurisdictionProfiles") && source.coverageData.includes("projectPublicProfile"), "Coverage summaries are not derived from the public guided-check projection at build time.");
requireCondition(source.coverageData.includes("questions.length") && source.coverageData.includes("question.translations?.es?.prompt"), "Coverage summaries do not derive state counts and bilingual public prompts.");
requireCondition(source.coverageData.includes("summaries.length !== 51") && source.coverageData.includes("uniqueCodes.size !== 51"), "Coverage build-time data does not enforce 51 unique jurisdictions.");
requireCondition(!source.coverage.includes("coverage_glance_suffix") && !source.copy.includes("at a glance") && !source.copy.includes("de un vistazo"), "The generic at-a-glance card remains in the homepage.");
requireCondition(source.coverage.includes('role="listbox"') && source.coverage.includes('role="option"') && source.coverage.includes("aria-selected={active}"), "Coverage cells do not expose localized single-selection semantics.");
for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]) requireCondition(source.coverage.includes(key), `Coverage keyboard handling is missing ${key}.`);
requireCondition(source.coverage.includes("coverage_selected_announcement") && source.coverage.includes('aria-live="polite"'), "Coverage selection changes are not announced.");
requireCondition(source.coverage.includes("/expungement-ai/screening/${selected.code.toLowerCase()}"), "Coverage CTA does not enter the existing selected-state screening route.");
for (const columns of ["repeat(13", "repeat(10", "repeat(6"]) requireCondition(source.styles.includes(columns), `Coverage responsive grid is missing ${columns}.`);

requireCondition(source.home.includes("wm_white.png") && source.home.includes('href="/legalease"'), "Footer does not use the official white LegalEase lockup and existing homepage route.");
requireCondition(source.home.includes('alt=""') && source.home.includes("footer_legalease_link_label"), "Footer LegalEase logo does not avoid duplicate accessible wording.");
const legalEaseLogo = path.join(ROOT, "design-handoff/legalease-homepage/assets/wm_white.png");
const legalEaseMetadata = await sharp(legalEaseLogo).metadata();
const { data: legalEasePixels, info: legalEaseInfo } = await sharp(legalEaseLogo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let logoColorTotal = 0;
let logoColorSamples = 0;
for (let offset = 0; offset < legalEasePixels.length; offset += legalEaseInfo.channels) {
  if (legalEasePixels[offset + 3] < 64) continue;
  logoColorTotal += legalEasePixels[offset] + legalEasePixels[offset + 1] + legalEasePixels[offset + 2];
  logoColorSamples += 3;
}
requireCondition(legalEaseMetadata.hasAlpha === true && logoColorSamples > 0 && logoColorTotal / logoColorSamples > 245, "LegalEase footer lockup is not the approved white transparent asset.");

requireCondition(count(source.faq, /^\s*\["[^\n]+/gm) === 7, "FAQ must contain the seven repository-approved questions.");
requireCondition(source.faq.includes("aria-expanded={expanded}") && source.faq.includes("aria-controls={panelId}"), "FAQ buttons do not expose accordion state.");

const enKeys = Object.keys(APPROVED_LANDING_COPY_EN).sort();
const esKeys = Object.keys(APPROVED_LANDING_COPY_ES).sort();
requireCondition(JSON.stringify(enKeys) === JSON.stringify(esKeys), "English and Spanish homepage dictionaries are not in parity.");
for (const key of [
  "v3_announce", "hero_facts_label", "video_pause", "video_play", "barrier_work", "guided_caption",
  "document_set_label", "privacy_practices_label", "wl_illustrative", "coverage_matrix_label", "coverage_selected",
  "coverage_guided_heading", "coverage_question_count", "coverage_topics_heading", "coverage_start_state",
  "coverage_no_account", "coverage_packet_boundary", "coverage_selected_announcement",
  "footer_legalease_label", "footer_legalease_link_label"
]) {
  requireCondition(Boolean(APPROVED_LANDING_COPY_EN[key]?.trim()), `English V3 copy is missing ${key}.`);
  requireCondition(Boolean(APPROVED_LANDING_COPY_ES[key]?.trim()), `Spanish V3 copy is missing ${key}.`);
}

for (const route of ["/expungement-ai/start", "/expungement-ai/sign-in?mode=signin", "/privacy", "/terms", "mailto:help@expungement.ai"]) {
  requireCondition(runtimeSource.includes(route), `Preserved public route is missing: ${route}.`);
}

if (errors.length) {
  console.error("Expungement.ai homepage V3 interaction verification failed.");
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  homepageVersion: "v3",
  canonicalSections: 13,
  navigationSections: 5,
  jurisdictionCells: jurisdictions.length,
  faqItems: 7,
  hero: "approved silent H.264 with poster, reduced-motion, Save-Data, mobile fallback, and keyboard control",
  samplePacket: "sanitized local preview",
  wilma: "balanced normal-flow composition with approved transparent art and no input or API call",
  coverage: "build-time public-profile summaries with bilingual state-specific counts, topics, and routes",
  legalEaseFooter: "official white lockup linked to /legalease",
  testimonials: "absent",
  englishKeys: enKeys.length,
  spanishKeys: esKeys.length
}, null, 2));
