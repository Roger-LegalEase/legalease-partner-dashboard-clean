import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { register } from "node:module";

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
  faq: "src/app/expungement-ai/home-v3/FaqAccordion.tsx",
  styles: "src/app/expungement-ai/home-v3/ExpungementHomeV3.module.css",
  modal: "src/app/expungement-ai/sample-packet/SamplePacketModal.tsx",
  copy: "src/app/expungement-ai/landing-approved-copy.ts",
  canonical: "docs/product-flows/expungement-ai-website-copy.md",
  report: "data/expungement-ai/reports/plain-language-copy-audit.json"
};

const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const source = Object.fromEntries(Object.entries(files).map(([key, value]) => [key, read(value)]));
const runtimeSource = [source.page, source.home, source.header, source.hero, source.path, source.documents, source.privacy, source.wilma, source.coverage, source.faq, source.styles, source.modal, source.copy].join("\n");
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
requireCondition(source.hero.includes("max-width: 640px"), "Hero video does not use the mobile poster-only rule.");
requireCondition(source.hero.includes("aria-pressed={manuallyPaused}"), "Pause control does not accurately expose manually paused state.");
requireCondition(source.hero.includes("heroVideoLayer") && source.hero.includes('aria-hidden="true"'), "Decorative video is not hidden from assistive technology.");
requireCondition(!source.hero.includes("controls"), "Native video controls must not render over the designed control.");

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

const jurisdictionLiteral = source.coverage.match(/const jurisdictions = \[([^\]]+)\]/)?.[1] ?? "";
const jurisdictions = [...jurisdictionLiteral.matchAll(/"([A-Z]{2})"/g)].map((match) => match[1]);
requireCondition(jurisdictions.length === 51 && new Set(jurisdictions).size === 51 && jurisdictions.includes("DC"), "Coverage matrix must contain exactly 50 states plus D.C.");
requireCondition(source.coverage.includes("aria-label={names[code][locale]}") && source.coverage.includes("aria-pressed={active}"), "Coverage cells do not announce full localized names and selected state.");
for (const columns of ["repeat(13", "repeat(10", "repeat(6"]) requireCondition(source.styles.includes(columns), `Coverage responsive grid is missing ${columns}.`);

requireCondition(count(source.faq, /^\s*\["[^\n]+/gm) === 7, "FAQ must contain the seven repository-approved questions.");
requireCondition(source.faq.includes("aria-expanded={expanded}") && source.faq.includes("aria-controls={panelId}"), "FAQ buttons do not expose accordion state.");

const enKeys = Object.keys(APPROVED_LANDING_COPY_EN).sort();
const esKeys = Object.keys(APPROVED_LANDING_COPY_ES).sort();
requireCondition(JSON.stringify(enKeys) === JSON.stringify(esKeys), "English and Spanish homepage dictionaries are not in parity.");
for (const key of [
  "v3_announce", "hero_facts_label", "video_pause", "video_play", "barrier_work", "guided_caption",
  "document_set_label", "privacy_practices_label", "wl_illustrative", "coverage_matrix_label", "coverage_selected"
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
  wilma: "bounded illustrative explanation with no input or API call",
  testimonials: "absent",
  englishKeys: enKeys.length,
  spanishKeys: esKeys.length
}, null, 2));
