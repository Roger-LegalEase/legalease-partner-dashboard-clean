import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import ts from "typescript";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  APPROVED_LANDING_COPY_EN,
  APPROVED_LANDING_COPY_ES
} = await import("../src/app/expungement-ai/landing-approved-copy.ts");
const { EXPUNGEMENT_COPY } = await import("../src/lib/expungement-ai/localization.ts");

const ROOT = process.cwd();
const LANDING_COPY = "src/app/expungement-ai/landing-approved-copy.ts";
const LANDING_LAYOUT = "src/app/expungement-ai/layout.tsx";
const SAMPLE_MODAL = "src/app/expungement-ai/sample-packet/SamplePacketModal.tsx";
const SAMPLE_DATA = "src/app/expungement-ai/sample-packet/sample-packet-demo.ts";
const PUBLIC_WILMA_ROUTE = "src/app/api/expungement-ai/wilma/public-chat/route.ts";
const CONTENT_BRAND = "src/components/content/brand.ts";
const HOME_V3_TSX = [
  "src/app/expungement-ai/home-v3/ExpungementHomeV3.tsx",
  "src/app/expungement-ai/home-v3/HeroVideo.tsx",
  "src/app/expungement-ai/home-v3/HomepageHeader.tsx",
  "src/app/expungement-ai/home-v3/PacketDocumentSet.tsx",
  "src/app/expungement-ai/home-v3/PrivacyLedger.tsx",
  "src/app/expungement-ai/home-v3/WilmaPreview.tsx",
  "src/app/expungement-ai/home-v3/CoverageMatrix.tsx",
  "src/app/expungement-ai/home-v3/FaqAccordion.tsx"
];
const MARKETING_TSX = [
  ...HOME_V3_TSX,
  "src/app/expungement-ai/how-it-works/page.tsx",
  "src/app/expungement-ai/pricing/page.tsx",
  "src/app/expungement-ai/resources/page.tsx",
  "src/app/expungement-ai/resources/[jurisdiction]/page.tsx",
  "src/app/expungement-ai/blog/page.tsx",
  "src/app/expungement-ai/authors/[slug]/page.tsx",
  "src/app/expungement-ai/screening/page.tsx",
  "src/app/expungement-ai/start/page.tsx",
  "src/components/expungement-ai/state-landing/StateLandingPage.tsx",
  "src/components/content/SurfaceCta.tsx",
  CONTENT_BRAND
];

const errors = [];
const inventoried = [];
const prohibited = [
  [/\beligibility check\b/i, "legacy eligibility-check claim"],
  [/\b(?:check my eligibility|check if you qualify|check my record free|see if you qualify|begin eligibility check)\b/i, "legacy primary CTA"],
  [/\b(?:may qualify|appears eligible|you qualify)\b/i, "qualification claim"],
  [/\b(?:court-ready packet|packet-generating matter)\b/i, "legacy packet claim"],
  [/\b(?:clear your record|path to clear your record|path to clear it)\b/i, "outcome-led record-clearing claim"],
  [/\b(?:free )?screening tool\b/i, "retired screening-tool terminology"],
  [/\$2,?500\b/i, "lawyer-price comparison"],
  [/\b(?:less than a lawyer|why \$50 instead of thousands|lawyer-price comparison)\b/i, "lawyer-price comparison"],
  [/\battorney-reviewed (?:in every state|document logic)\b/i, "unsubstantiated attorney-review claim"],
  [/\bsitting state legislator\b/i, "unsubstantiated credential"],
  [/\bpeople who cleared their record with expungement\.ai\b/i, "unverified testimonial claim"],
  [/(?:in their words|what people said after using expungement\.ai|Tanya R\.|Marcus D\.|Lisa F\.|verified quote|verified product stage)/i, "removed testimonial content"],
  [/\b1 in 3\b/i, "unsupported statistic"],
  [/\b(?:three|3|ten|10)[ -]?minute(?:s)?\b/i, "unverified completion-time claim"],
  [/\byour information stays private\b/i, "vague privacy claim"],
  [/\bstays private and is never sold\b/i, "vague privacy claim"],
  [/\b(?:VERIFY(?: BEFORE ADDING)?|LEGAL REVIEW(?: AND SOURCE DATE REQUIRED)?|OPTIONAL CREDENTIAL FORMAT|OPTIONAL EVIDENCE BLOCK|USE ONLY IF|COPY NOT PRESENT IN THE SUPPLIED EXPORT|PUBLISH ONLY VERIFIED)\b/, "editorial marker"],
  [/\[(?:verified quote|verified product stage|insert[^\]]*|placeholder[^\]]*)\]/i, "editorial placeholder"],
  [/\b(?:engine|runtime|route id|pathway id|profile version|result code|renderer|render job|artifact|queued? job|worker|entitlement|binding|schema|question id|field id|exact-match mapping|staging scoped|feature flag|migration|webhook|provider event|session id|implementation notes?)\b/i, "internal implementation phrase"],
  [/\b(?:packet_ready(?:_with_caution)?|paymentallowed|guidance_only|needs_more_info|not_yet|hard_stop)\b/i, "raw internal value"],
  [/\b[a-z]+(?:_[a-z0-9]+)+\b/, "snake_case value"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i, "raw UUID"],
  [/\b[0-9a-f]{40,64}\b/i, "raw SHA or digest"],
  [/(?:Supabase|Stripe)(?:Error| error| request failed| API)/i, "raw provider error"],
  [/\{\s*"[A-Za-z0-9_]+"\s*:/, "raw JSON"],
  [/—/, "em dash"]
];

function read(relativePath) { return fs.readFileSync(path.join(ROOT, relativePath), "utf8"); }
function decode(value) {
  return value.replace(/&middot;/g, "·").replace(/&copy;/g, "©").replace(/&#10003;/g, "✓")
    .replace(/&#10005;/g, "✕").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function addCandidate(surface, value) {
  const text = decode(String(value ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text && /[A-Za-zÁ-ÿ]/.test(text)) inventoried.push({ surface, text });
}
function scan(surface, value) {
  const text = decode(String(value ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return;
  for (const [pattern, label] of prohibited) if (pattern.test(text)) errors.push(`${surface}: ${label}: ${JSON.stringify(text.slice(0, 240))}`);
}
function requireCondition(condition, message) { if (!condition) errors.push(message); }

function inventoryTsStrings(relativePath) {
  const source = read(relativePath);
  const ast = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) addCandidate(relativePath, node.text);
    if (ts.isTemplateExpression(node)) {
      addCandidate(relativePath, node.head.text);
      for (const span of node.templateSpans) addCandidate(relativePath, span.literal.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}

function inventoryRenderedTsx(relativePath) {
  const source = read(relativePath);
  const ast = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visibleProperties = new Set(["title", "description", "headline", "subheadline", "label", "body", "text", "answer", "question", "summary", "cta", "ctaLabel", "helperText", "alt"]);
  const visit = (node) => {
    if (ts.isJsxText(node)) addCandidate(relativePath, node.text);
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText(ast).toLowerCase();
      if (["aria-label", "aria-description", "alt", "title", "body", "fallback", "label", "placeholder"].includes(name)) addCandidate(`${relativePath} accessibility or attribute`, node.initializer.text);
    }
    if (ts.isPropertyAssignment(node)) {
      const name = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : "";
      if (visibleProperties.has(name) && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) addCandidate(relativePath, node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}

function inventoryNamedCopyConstants(relativePath) {
  for (const match of read(relativePath).matchAll(/\b[A-Z][A-Z0-9_]*_COPY\s*=\s*(["'`])([\s\S]*?)\1/g)) addCandidate(relativePath, match[2]);
}

inventoryTsStrings(LANDING_COPY);
inventoryTsStrings(SAMPLE_MODAL);
inventoryTsStrings(SAMPLE_DATA);
for (const relativePath of MARKETING_TSX) inventoryRenderedTsx(relativePath);
inventoryNamedCopyConstants(PUBLIC_WILMA_ROUTE);
for (const [key, entry] of Object.entries(EXPUNGEMENT_COPY)) {
  if (key.startsWith("wilma.") || key.startsWith("briefcase.empty_") || key.startsWith("start.") || key.startsWith("nav.")) {
    addCandidate(`English localization ${key}`, entry.en);
    addCandidate(`Spanish localization ${key}`, entry.es);
  }
}
for (const match of read(LANDING_LAYOUT).matchAll(/\b(?:title|description):\s*(?:\r?\n\s*)?"([^"]+)"/g)) addCandidate("Expungement.ai metadata", match[1]);
for (const candidate of inventoried) scan(candidate.surface, candidate.text);

const enKeys = Object.keys(APPROVED_LANDING_COPY_EN).sort();
const esKeys = Object.keys(APPROVED_LANDING_COPY_ES).sort();
requireCondition(JSON.stringify(enKeys) === JSON.stringify(esKeys), `English and Spanish keys differ. Missing ES: ${enKeys.filter((key) => !(key in APPROVED_LANDING_COPY_ES)).join(", ")}; missing EN: ${esKeys.filter((key) => !(key in APPROVED_LANDING_COPY_EN)).join(", ")}`);
for (const key of enKeys) {
  requireCondition(Boolean(APPROVED_LANDING_COPY_EN[key]?.trim()), `English key ${key} is empty.`);
  requireCondition(Boolean(APPROVED_LANDING_COPY_ES[key]?.trim()), `Spanish key ${key} is empty.`);
}

requireCondition(APPROVED_LANDING_COPY_EN.hero_h1 === "The law is complicated. Your next step should not be.", "Hero is missing the approved headline.");
for (const phrase of ["free guided check", "review your information", "$50", "generate it"]) requireCondition(APPROVED_LANDING_COPY_EN.hero_sub.toLowerCase().includes(phrase.toLowerCase()), `Hero description is missing ${JSON.stringify(phrase)}.`);

const primaryCtaKeys = ["announce_cta", "nav_cta", "m_cta", "hero_cta1", "prob_cta", "elig_cta", "how_cta", "pr_cta", "fn_cta", "ft_check", "sticky_cta"];
for (const key of primaryCtaKeys) {
  requireCondition(APPROVED_LANDING_COPY_EN[key] === "Start free", `English primary CTA ${key} is not Start free.`);
  requireCondition(APPROVED_LANDING_COPY_ES[key] === "Comenzar gratis", `Spanish primary CTA ${key} is not Comenzar gratis.`);
}

requireCondition(/No account to begin/i.test(APPROVED_LANDING_COPY_EN.hero_micro), "Hero does not state that no account is needed to begin.");
requireCondition(/No payment to start/i.test(APPROVED_LANDING_COPY_EN.hero_micro), "Hero does not state that no payment is needed to start.");
requireCondition(/Briefcase is free/i.test(APPROVED_LANDING_COPY_EN.strip_p3), "The Briefcase is not described as free.");
requireCondition(APPROVED_LANDING_COPY_EN.pr_h2 === "$50 for one supported self-help packet.", "Pricing does not state $50 for one supported self-help packet.");
requireCondition(/Court filing fees are separate/i.test(APPROVED_LANDING_COPY_EN.pr_fine), "Pricing does not state that court filing fees are separate.");
requireCondition(/No subscription/i.test(APPROVED_LANDING_COPY_EN.pr_fine), "Pricing does not state that there is no subscription.");
for (const key of ["fn_micro", "sticky_sl", "hero_micro"]) requireCondition(!APPROVED_LANDING_COPY_EN[key].includes("&middot;"), `${key} would expose an HTML entity after locale hydration.`);
requireCondition(!APPROVED_LANDING_COPY_ES.hero_micro.includes("&middot;"), "Spanish hero microcopy would expose an HTML entity after locale hydration.");
requireCondition(/Self-help document preparation/i.test(APPROVED_LANDING_COPY_EN.hero_disclaimer), "The self-help boundary is missing from the hero.");
requireCondition(/Not a law firm/i.test(APPROVED_LANDING_COPY_EN.hero_disclaimer), "The not-a-law-firm boundary is missing from the hero.");
requireCondition(/court or agency makes the final decision/i.test(APPROVED_LANDING_COPY_EN.hero_disclaimer), "The final decision-maker is missing from the hero.");

const homeSource = HOME_V3_TSX.map(read).join("\n");
requireCondition(/function StartFreeLink[\s\S]*?href="\/expungement-ai\/start"/.test(homeSource), "Reusable Start free CTA does not open the guided-check entry.");
requireCondition((homeSource.match(/<StartFreeLink\b/g) ?? []).length >= 5, "Canonical sections do not expose the expected Start free actions.");
for (const match of homeSource.matchAll(/href="(\/expungement-ai\/start)"/g)) requireCondition(match[1] === "/expungement-ai/start", `Start free points to ${match[1]}.`);

const sampleIsReal = fs.existsSync(path.join(ROOT, SAMPLE_MODAL)) && fs.existsSync(path.join(ROOT, SAMPLE_DATA));
const sampleTriggers = (homeSource.match(/data-sample-packet-trigger="true"/g) ?? []).length;
requireCondition(sampleIsReal && sampleTriggers === 2, "Hero and footer must open the real local sanitized sample preview exactly twice.");
requireCondition(homeSource.includes('id="what-you-get"'), "The What you get navigation target is missing.");
requireCondition(homeSource.includes('/expungement-ai#what-you-get'), "Navigation or footer does not link to What you get.");
requireCondition(read(CONTENT_BRAND).includes('primary: { label: "Start free", href: "/expungement-ai/start"'), "Shared Expungement.ai content CTA does not use Start free or the guided-check entry.");
requireCondition(!/testi(?:monial)?/i.test(homeSource), "Testimonials render without verified quotes and consent.");
requireCondition(!/\[(?:verified|placeholder|insert)/i.test(homeSource), "An editorial placeholder renders.");
requireCondition(homeSource.includes('href="/privacy"') && homeSource.includes('href="/terms"'), "Privacy or terms link is missing.");
requireCondition(fs.existsSync(path.join(ROOT, "src/app/privacy/page.tsx")) && fs.existsSync(path.join(ROOT, "src/app/terms/page.tsx")), "Privacy or terms route does not exist.");

const profiles = JSON.parse(read("src/lib/expungement-ai/frontend/profiles/all51.json"));
requireCondition(Object.keys(profiles).length === 51 && Boolean(profiles.DC), "The 50 states and D.C. claim is not supported by 51 public profiles.");

const layout = read(LANDING_LAYOUT);
for (const value of [
  "Expungement.ai | Free guided record-clearing check",
  "Start a free guided check. If a supported self-help packet is available, review your information before paying $50 to generate it."
]) requireCondition(layout.includes(value), `Metadata is missing approved value: ${value}`);

const mutations = [
  "packet_ready_with_caution", "paymentAllowed", "saved question ID", "render job",
  "Reference 123e4567-e89b-42d3-a456-426614174000", "Supabase error: row missing", "Stripe error: request failed",
  "Check if you qualify", "Use the free screening tool", "$2,500", "About 1 in 3 adults",
  "VERIFY BEFORE ADDING", "Copy with an em dash — here"
];
for (const mutation of mutations) if (!prohibited.some(([pattern]) => pattern.test(mutation))) errors.push(`Mutation was not detected: ${mutation}`);

if (errors.length) {
  console.error("Expungement.ai website-copy verification failed.");
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  homepageVersion: "v3",
  visibleStringsInventoried: inventoried.length,
  uniqueVisibleStrings: new Set(inventoried.map(({ text }) => text)).size,
  englishKeys: enKeys.length,
  spanishKeys: esKeys.length,
  startFreeUses: (homeSource.match(/<StartFreeLink\b/g) ?? []).length,
  mutationsDetected: mutations.length,
  samplePacket: "hero and footer use local sanitized preview",
  trustCredential: "omitted pending public evidence",
  testimonials: "absent",
  evidenceBlock: "omitted pending sourced evidence"
}, null, 2));
