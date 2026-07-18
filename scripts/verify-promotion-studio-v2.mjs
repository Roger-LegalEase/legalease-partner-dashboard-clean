/** Promotion Studio v2 contract, grounding, security, and regression verification. */
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  promotionGenerationInputSchema,
  promotionGenerationOutputSchema
} = await import("../src/lib/content/promotion-generation-contract.ts");
const {
  checkPromotionGenerationRateLimit,
  contentDocToPlainText,
  generatePromotionCampaign,
  guardGeneratedCampaign,
  resetPromotionGenerationRateLimitForTests
} = await import("../src/lib/content/promotion-generation.ts");
const {
  PROMOTION_CHANNEL_REGISTRY,
  buildPromotionTrackedUrl,
  defaultPromotionTracking,
  normalizeHashtags,
  recommendedPromotionTemplate,
  verifiedMentionHandles
} = await import("../src/lib/content/promotion-studio.ts");
const { SOCIAL_CHANNELS, SOCIAL_ASSET_SIZES, SOCIAL_CHANNEL_LIMITS } = await import(
  "../src/lib/content/types.ts"
);

// --- Central channel contract ------------------------------------------------------------------
assert(SOCIAL_CHANNELS.length === 7, "All seven promotion channels must remain present.");
for (const channel of SOCIAL_CHANNELS) {
  const rule = PROMOTION_CHANNEL_REGISTRY[channel];
  assert(Boolean(rule), `${channel} must have one centralized channel rule.`);
  assert(rule.limit === SOCIAL_CHANNEL_LIMITS[channel], `${channel} must reuse the strict server limit.`);
  assert(Object.keys(rule.variantLabels).length === 4, `${channel} must retain four copy variants.`);
}
assert(PROMOTION_CHANNEL_REGISTRY.email.variantLabels.primaryCaption === "Subject line", "Email primary copy must be labeled Subject line.");
assert(PROMOTION_CHANNEL_REGISTRY.partner_kit.variantLabels.partnerCaption.includes("email/newsletter"), "Partner kit mappings must be explicit.");

const expectedTracking = {
  linkedin: ["linkedin", "social"],
  x: ["x", "social"],
  facebook: ["facebook", "social"],
  instagram: ["instagram", "social"],
  threads: ["threads", "social"],
  email: ["newsletter", "email"],
  partner_kit: ["partner", "partner"]
};
for (const channel of SOCIAL_CHANNELS) {
  const tracking = defaultPromotionTracking(channel, "A Useful Article!");
  assert(tracking.utmSource === expectedTracking[channel][0], `${channel} UTM source must be deterministic.`);
  assert(tracking.utmMedium === expectedTracking[channel][1], `${channel} UTM medium must be deterministic.`);
  assert(tracking.utmCampaign === "a-useful-article", "UTM campaign must derive from normalized slug.");
  const tracked = new URL(buildPromotionTrackedUrl("https://example.test/article?ref=one", channel, tracking));
  assert(tracked.searchParams.get("ref") === "one", "Tracking must preserve canonical query parameters.");
  assert(tracked.searchParams.get("utm_campaign") === "a-useful-article", "Tracked URL must use the stable campaign.");
}

assert(
  JSON.stringify(normalizeHashtags(["record clearing", "#RecordClearing", "second-chances"], "linkedin")) ===
    JSON.stringify(["#RecordClearing", "#SecondChances"]),
  "Hashtags must normalize #, spacing, case, and duplicates."
);
const mentions = verifiedMentionHandles(["Known Partner", "Unknown Partner"], { "Known Partner": "@known" });
assert(mentions.handles[0] === "@known", "A verified handle may be applied.");
assert(mentions.unresolved.includes("Unknown Partner") && !mentions.handles.includes("@unknownpartner"), "An unverified candidate must never become a guessed handle.");
assert(recommendedPromotionTemplate("state_resource") === "state_resource", "State resources must recommend the state-resource template.");
assert(SOCIAL_ASSET_SIZES.length === 3, "Landscape, square, and portrait assets must remain configured.");

// --- Strict browser request contract ------------------------------------------------------------
const validInput = { mode: "regenerate_all", objective: "Education", tone: "Educational" };
assert(promotionGenerationInputSchema.safeParse(validInput).success, "The documented generation request must be accepted.");
for (const forbidden of ["articleTitle", "articleBody", "authorIdentity", "canonicalUrl", "legalApprovalState", "publishedStatus", "unknown"]) {
  assert(
    !promotionGenerationInputSchema.safeParse({ ...validInput, [forbidden]: "browser-controlled" }).success,
    `Strict generation input must reject ${forbidden}.`
  );
}

// --- Saved source conversion -------------------------------------------------------------------
const plain = contentDocToPlainText({
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Approved article fact." }] },
    { type: "cta", attrs: { label: "Start a free check", href: "https://example.test/check", ctaId: "cta-1" } },
    // An unknown/internal node must contribute nothing to provider text.
    { type: "internalStateEngine", attrs: { secret: "DO_NOT_SEND" } }
  ]
});
assert(plain.includes("Approved article fact") && plain.includes("Start a free check"), "Plain-text source must include saved body and CTA label.");
assert(!plain.includes("DO_NOT_SEND") && !plain.includes("internalStateEngine"), "Internal state-engine fields must never reach provider text.");
assert(!/<[a-z][\s\S]*>/i.test(plain), "Provider body source must be plain text, never HTML.");

// --- Official SDK request contract + second Zod validation ------------------------------------
const source = providerSource();
const output = generatedCampaign();
let captured = null;
const fakeClient = {
  responses: {
    async create(request, options) {
      captured = { request, options };
      return { output_text: JSON.stringify(output) };
    }
  }
};
const generated = await generatePromotionCampaign({
  source,
  input: validInput,
  apiKey: "test-only",
  model: "configured-model",
  client: fakeClient
});
assert(promotionGenerationOutputSchema.safeParse(generated.output).success, "Provider output must be revalidated by strict Zod.");
assert(captured.request.store === false, "Responses API requests must set store:false.");
assert(!Object.hasOwn(captured.request, "tools"), "No web-search or external tool may be enabled.");
assert(captured.options.timeout > 0, "Provider request must have a finite timeout.");
assert(captured.request.model === "configured-model", "Model must come from configuration, not a source constant.");
const providerInput = JSON.parse(captured.request.input);
assert(providerInput.savedArticle.title === source.title, "The provider must receive the server-loaded saved title.");
assert(providerInput.savedArticle.bodyText === source.bodyText, "The provider must receive clean saved body text.");
for (const excluded of [
  "authUserId",
  "staffId",
  "approvalStaffId",
  "auditHistory",
  "consentReference",
  "privateMediaPath",
  "stateEngine",
  "commandCenterSecret",
  "supabaseCredential",
  "createdBy",
  "sourceVersion",
  "legalApproved"
]) {
  assert(!JSON.stringify(providerInput).includes(excluded), `Provider input must exclude ${excluded}.`);
}

let invalidFailed = false;
try {
  await generatePromotionCampaign({
    source,
    input: validInput,
    apiKey: "test-only",
    model: "configured-model",
    client: { responses: { async create() { return { output_text: JSON.stringify({ brief: {}, channels: {} }) }; } } }
  });
} catch (error) {
  invalidFailed = error?.code === "invalid_provider_output";
}
assert(invalidFailed, "Invalid provider output must fail closed instead of producing partial suggestions.");

let timeoutFailed = false;
try {
  await generatePromotionCampaign({
    source,
    input: validInput,
    apiKey: "test-only",
    model: "configured-model",
    client: { responses: { async create() { throw new Error("request timed out"); } } }
  });
} catch (error) {
  timeoutFailed = /timed out/i.test(error.message);
}
assert(timeoutFailed, "A provider timeout must fail without fabricating a campaign.");

resetPromotionGenerationRateLimitForTests();
for (let index = 0; index < 5; index += 1) {
  assert(checkPromotionGenerationRateLimit("user:post", 1_000 + index).ok, "First five explicit generations must fit the rate limit.");
}
const limited = checkPromotionGenerationRateLimit("user:post", 2_000);
assert(!limited.ok && limited.retryAfterSeconds > 0, "Per-user/per-post rate limiting must return a clear retry interval.");

// --- Deterministic grounding guard --------------------------------------------------------------
const unsafe = generatedCampaign();
unsafe.channels.linkedin.primaryCaption = "Acme Foundation guarantees 75% success by January 5, 2030. https://unknown.test";
unsafe.channels.x.primaryCaption = "x".repeat(281);
unsafe.channels.facebook.mentionCandidates = ["Invented Person"];
const grounding = guardGeneratedCampaign(source, unsafe);
for (const code of ["new_percentage", "new_date", "unknown_url", "guarantee_language", "unknown_name", "over_limit"]) {
  assert(grounding.some((issue) => issue.code === code), `Grounding guard must report ${code}.`);
}
const safeGrounding = guardGeneratedCampaign(source, generatedCampaign());
assert(!safeGrounding.some((issue) => issue.code === "new_number"), "Numbers already present in the article must remain allowed.");

// --- Route, editing, approval, staleness, assets, and disconnected invariants ------------------
const generateRoute = read("src/app/api/internal/content/promotion/[postId]/generate/route.ts");
const socialRoute = read("src/app/api/internal/content/social/[postId]/route.ts");
const sendRoute = read("src/app/api/internal/content/promotion/[postId]/send/route.ts");
const assetsRoute = read("src/app/api/internal/content/promotion/[postId]/assets/route.ts");
const assetRenderRoute = read("src/app/api/internal/content/promotion/[postId]/assets/render/route.ts");
const publicAssetRoute = read("src/app/api/content/social-asset/[postId]/route.ts");
const composer = read("src/components/content/admin/SocialComposer.tsx");
const generation = read("src/lib/content/promotion-generation.ts");
const commandCenter = read("src/lib/content/command-center.ts");
const phase43 = read("supabase/phase-43-content-platform.sql");

assert(generateRoute.includes('denyUnlessContentCapability("social.draft"'), "Generation API must require social.draft before parsing.");
assert(generateRoute.indexOf("denyUnlessContentCapability") < generateRoute.indexOf("readJsonBody"), "Generation auth gate must run before body parsing.");
assert(generateRoute.includes("loadPromotionProviderSource(client, postId)"), "Generation must load the saved post server-side.");
assert(generateRoute.includes("promotionPostIsInScope"), "Generation must enforce partner scope.");
assert(!generateRoute.includes("content_social_drafts\").upsert"), "Generation must not save suggestions automatically.");
assert(generation.includes("store: false") && generation.includes("zodTextFormat"), "Official Responses structured output must be strict and non-stored.");
assert(!/model:\s*["'`]gpt-/i.test(generation), "No model name may be hardcoded in source.");
assert(!/console\.(log|info|debug)\([^)]*(prompt|bodyText|output_text)/.test(generation), "Prompts and generated bodies must not be logged.");

assert(socialRoute.includes("draftContentChanged") && socialRoute.includes('approvalState = "draft"'), "Changing approved copy/settings/assets must reset approval server-side.");
assert(socialRoute.includes("requiresLegalReview") && socialRoute.includes("legal_review_required"), "Legally sensitive promotion approval must require article legal approval.");
assert(sendRoute.includes("approvedOnly: true") && sendRoute.includes("notOlderThan: post.updated_at"), "Only approved, non-stale channels may enter handoff.");
assert(sendRoute.includes('denyUnlessContentCapability("social.send"'), "Command Center handoff must retain social.send.");
assert(commandCenter.includes('configured: false, reason: "disabled"'), "Disabled delivery must remain an honest disconnected state.");
assert(composer.includes("if (!props.commandCenter.connected || !props.canSend) return"), "Disconnected UI must make no send request.");
assert(composer.includes("Nothing has been applied or saved yet"), "Generated suggestions must require human Apply.");
assert(composer.includes("forms[channel].approvalState === \"approved\""), "Approved fields must be excluded from suggestion application.");
assert(composer.includes('generationMode === "fill_empty"') && composer.includes("valueForField"), "Fill-empty mode must preserve populated fields.");
assert(composer.includes("articleDirty") && composer.includes("Save the article before regenerating"), "Unsaved article changes must block generation.");

assert(assetsRoute.includes("SOCIAL_ASSET_SIZES.map") && assetsRoute.includes("content_social_assets"), "Asset action must persist all three deterministic variants.");
assert(assetsRoute.includes("/api/content/social-asset/") && !assetsRoute.includes("storage_path"), "Asset records must use an opaque public renderer URL without Storage paths.");
assert(assetRenderRoute.includes("createSignedUrl") && assetRenderRoute.includes("permission_status"), "The renderer must use featured media only after a server-side permission check.");
assert(assetRenderRoute.includes('"cache-control": "private, no-store"'), "Draft asset rendering must remain private and uncached.");
assert(publicAssetRoute.includes("isPubliclyVisibleStatus") && publicAssetRoute.includes('status: 404'), "The public asset renderer must 404 for non-public posts.");
assert(composer.includes("Not connected") && composer.includes("Export promotion package"), "Disconnected drafting and export must stay available.");
assert(composer.includes("disabled={!props.commandCenter.connected"), "Disconnected Send must stay disabled.");

assert(phase43.includes("content_social_drafts") && phase43.includes("content_social_assets") && phase43.includes("content_audit_events"), "Studio must reuse Phase 43 tables.");
assert(!fs.existsSync(path.join(rootDir, "supabase/phase-44-promotion-studio.sql")), "Promotion Studio must not introduce a Phase 44 migration.");

if (failures.length) {
  console.error("Promotion Studio v2 verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Promotion Studio v2 verification passed.");
console.log("AI: strict server-loaded source, Responses API store:false, no tools, timeout, rate limit, and second Zod validation.");
console.log("Safety: grounding blockers, legal gate, approval reset, staleness, partner scope, and no automatic save/send.");
console.log("Product: seven channels, four variants, deterministic UTMs/assets, verified mentions, manual fallback, export, and disconnected state.");

function providerSource() {
  return {
    title: "A guide with 3 practical steps",
    subtitle: "Saved source only",
    excerpt: "Three source-grounded ideas.",
    bodyText: "The saved article contains 3 practical steps and names LegalEase Editorial.",
    contentType: "resource_guide",
    destination: "expungement_ai",
    subject: { category: "Education", tags: ["Record clearing"] },
    author: { name: "LegalEase Editorial", title: "Editorial team", organization: "LegalEase" },
    jurisdiction: null,
    partner: null,
    canonicalUrl: "https://expungement.ai/blog/guide",
    featuredImage: { alt: "Editorial illustration", caption: null },
    ctas: [{ label: "Learn about the process", href: "https://expungement.ai/check" }],
    legalSensitive: true
  };
}

function generatedCampaign() {
  const channel = (name) => ({
    primaryCaption: `${name} shares the saved article's 3 practical steps.`,
    alternateCaption: `${name} offers a source-grounded guide from LegalEase Editorial.`,
    founderVoiceCaption: `LegalEase Editorial explains the saved guide.`,
    partnerCaption: `Share this saved educational guide with your community.`,
    hashtags: ["#RecordClearing", "#AccessToJustice"],
    mentionCandidates: ["LegalEase Editorial"]
  });
  return {
    brief: {
      classification: "How-to guide",
      objective: "Education",
      primaryAudience: "People exploring record-clearing information",
      secondaryAudience: null,
      keyMessage: "The saved guide contains 3 practical steps.",
      supportingPoints: ["Saved source", "Plain language", "Practical steps"],
      tone: "Educational",
      cta: "Learn about the process"
    },
    channels: Object.fromEntries(SOCIAL_CHANNELS.map((name) => [name, channel(name)])),
    assetPlan: [{ template: "editorial_cover", headline: "A practical guide", subheadline: null, recommendedSizes: ["og", "square", "portrait"] }]
  };
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
