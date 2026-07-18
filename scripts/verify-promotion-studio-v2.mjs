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
  contentDocToPlainText,
  generatePromotionCampaign,
  guardGeneratedCampaign,
  guardPromotionDraftForApproval,
  PROMOTION_RATE_LIMIT_PER_POST,
  PROMOTION_RATE_LIMIT_PER_USER,
  reservePromotionGenerationAttempt
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
const { BRAND_PALETTES, buildSocialCardElement } = await import("../src/lib/content/social-card.ts");

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
const cardInput = {
  template: "state_resource",
  destination: "expungement_ai",
  width: 1200,
  height: 630,
  title: "A saved headline",
  subtitle: "A saved subtitle",
  stateCode: "MS"
};
assert(
  JSON.stringify(buildSocialCardElement(cardInput)) === JSON.stringify(buildSocialCardElement(cardInput)),
  "Identical social-card inputs must render deterministically."
);
assert(BRAND_PALETTES.expungement_ai.wordmark === "Expungement.ai" && BRAND_PALETTES.legalease_partner.wordmark === "LegalEase Partner", "Destination branding must remain explicit and distinct.");

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
const oversizedPlain = contentDocToPlainText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(20_000) }] }] });
assert(oversizedPlain.length === 20_000, "Plain-text projection must remain deterministic before the server-side source cap is applied.");

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
assert(captured.request.max_output_tokens === 12_000, "Every provider request must have a bounded output-token budget.");
assert(!Object.hasOwn(captured.request, "tools"), "No web-search or external tool may be enabled.");
assert(captured.options.timeout > 0, "Provider request must have a finite timeout.");
assert(captured.request.model === "configured-model", "Model must come from configuration, not a source constant.");
const providerInput = JSON.parse(captured.request.input);
assert(
  JSON.stringify(Object.keys(providerInput).sort()) === JSON.stringify(["campaignControls", "channelRules", "savedArticle"]),
  "The provider request must have an exact top-level data boundary."
);
assert(
  JSON.stringify(Object.keys(providerInput.savedArticle).sort()) ===
    JSON.stringify(["author", "bodyText", "canonicalUrl", "contentType", "ctas", "destination", "excerpt", "featuredImage", "jurisdiction", "legalSensitive", "partner", "subject", "subtitle", "title"]),
  "The savedArticle provider payload must expose only the reviewed source inventory."
);
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

const durableAuditRows = [];
const clock = { now: Date.parse("2026-07-18T12:00:00.000Z") };
for (let index = 0; index < PROMOTION_RATE_LIMIT_PER_USER; index += 1) {
  const simulatedInstance = makeAuditClient(durableAuditRows, clock);
  const allowed = await reservePromotionGenerationAttempt(simulatedInstance, {
    actorId: "11111111-1111-4111-8111-111111111111",
    actorRole: "editor",
    postId: `22222222-2222-4222-8222-22222222222${index}`,
    now: clock.now
  });
  assert(allowed.ok, "Each allowed attempt must be durably reserved before provider invocation.");
  clock.now += 1_000;
}
const afterSimulatedRestart = await reservePromotionGenerationAttempt(makeAuditClient(durableAuditRows, clock), {
  actorId: "11111111-1111-4111-8111-111111111111",
  actorRole: "editor",
  postId: "33333333-3333-4333-8333-333333333333",
  now: clock.now
});
assert(!afterSimulatedRestart.ok && afterSimulatedRestart.limitedBy === "user", "A new server instance must retain the durable per-user limit.");
assert(afterSimulatedRestart.retryAfterSeconds > 0, "The durable limit must return a stable Retry-After interval.");

const postAuditRows = [];
for (let index = 0; index < PROMOTION_RATE_LIMIT_PER_POST; index += 1) {
  const allowed = await reservePromotionGenerationAttempt(makeAuditClient(postAuditRows, clock), {
    actorId: `44444444-4444-4444-8444-44444444444${index}`,
    actorRole: "editor",
    postId: "55555555-5555-4555-8555-555555555555",
    now: clock.now + index
  });
  assert(allowed.ok, "Distinct users within the post limit must be allowed.");
}
const postLimited = await reservePromotionGenerationAttempt(makeAuditClient(postAuditRows, clock), {
  actorId: "66666666-6666-4666-8666-666666666666",
  actorRole: "editor",
  postId: "55555555-5555-4555-8555-555555555555",
  now: clock.now + 100
});
assert(!postLimited.ok && postLimited.limitedBy === "post", "The durable per-post limit must apply across users and instances.");

for (const scopedInput of [
  { mode: "regenerate_selected", channels: ["linkedin"], generateAssetPlan: false },
  { mode: "regenerate_selected", channels: ["x"], field: "primaryCaption", generateAssetPlan: false },
  { mode: "regenerate_selected", channels: ["x"], field: "primaryCaption", shortenToLimit: true, generateAssetPlan: false }
]) {
  let scopedRequest;
  await generatePromotionCampaign({
    source,
    input: scopedInput,
    apiKey: "test-only",
    model: "configured-model",
    client: { responses: { async create(request) { scopedRequest = request; return { output_text: JSON.stringify(output) }; } } }
  });
  const scopedProviderInput = JSON.parse(scopedRequest.input);
  assert(Object.keys(scopedProviderInput.channelRules).length === 1, "Partial generation must send rules for only the requested channel.");
  const expectedTokenLimit = scopedInput.field ? 2_000 : 6_000;
  assert(scopedRequest.max_output_tokens === expectedTokenLimit && scopedRequest.store === false, "Every partial mode must use its smaller provider token budget.");
  if (scopedInput.field) {
    assert(scopedRequest.instructions.includes(`only ${scopedInput.field}`), "Field generation must instruct the provider to leave unrelated variants empty.");
  }
}
assert(Object.keys(providerInput.channelRules).length === 7, "Full campaign generation must request all seven channels.");

// --- Deterministic grounding guard --------------------------------------------------------------
const unsafe = generatedCampaign();
unsafe.channels.linkedin.primaryCaption = "Acme Foundation guarantees 75% success for 42 people by January 5, 2030. The law requires a 9 month waiting period. \"Jordan promised every case would disappear\". @guessed https://unknown.test";
unsafe.channels.x.primaryCaption = "x".repeat(281);
unsafe.channels.facebook.mentionCandidates = ["Invented Person"];
const grounding = guardGeneratedCampaign(source, unsafe);
for (const code of ["new_percentage", "new_number", "new_date", "unknown_url", "guarantee_language", "legal_claim", "fabricated_quote", "unverified_handle", "unknown_name", "over_limit"]) {
  assert(grounding.some((issue) => issue.code === code), `Grounding guard must report ${code}.`);
}
const safeGrounding = guardGeneratedCampaign(source, generatedCampaign());
assert(!safeGrounding.some((issue) => issue.code === "new_number"), "Numbers already present in the article must remain allowed.");
const datedSource = { ...source, bodyText: `${source.bodyText} Updated January 5, 2030 with 42 examples.`, partner: "Acme Foundation" };
const datedOutput = generatedCampaign();
datedOutput.channels.linkedin.primaryCaption = "Acme Foundation shared 42 examples updated January 5, 2030. https://expungement.ai/blog/guide";
const datedIssues = guardGeneratedCampaign(datedSource, datedOutput, ["linkedin"]);
assert(!datedIssues.some((issue) => ["new_number", "new_date", "unknown_name", "unknown_url"].includes(issue.code)), "Existing numbers, dates, partner names, and canonical URLs must remain allowed.");
assert(grounding.filter((issue) => issue.code === "unknown_name").every((issue) => issue.severity === "blocker"), "Fabricated organizations must block approval.");
const approvalGuard = guardPromotionDraftForApproval(source, "linkedin", {
  primaryCaption: "You qualify and Acme Foundation guarantees a result.",
  alternateCaption: null,
  founderVoiceCaption: null,
  partnerCaption: null,
  mentionTags: ["@guessed"]
});
assert(approvalGuard.some((issue) => issue.code === "guarantee_language"), "The server approval guard must reject qualification and guarantee claims.");
assert(approvalGuard.some((issue) => issue.code === "unverified_handle"), "The server approval guard must reject guessed handles.");

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
assert(generateRoute.indexOf("if (!loaded || !promotionPostIsInScope") < generateRoute.indexOf("rateLimit = await reservePromotionGenerationAttempt"), "Rejected or cross-partner requests must not consume a provider attempt.");
assert(!generateRoute.includes("content_social_drafts\").upsert"), "Generation must not save suggestions automatically.");
assert(generation.includes("store: false") && generation.includes("zodTextFormat"), "Official Responses structured output must be strict and non-stored.");
assert(generation.includes("max_output_tokens: maxOutputTokens"), "Provider output tokens must be explicitly bounded for every mode.");
assert(generation.includes('action: "promotion_generation_started"') && !generation.includes("new Map<"), "Rate limiting must use durable append-only audit reservations, never process memory.");
assert(generation.includes("partner: partnerAttribution") && !generation.includes("partner: post.partner_slug"), "Internal partner slugs must never become provider copy.");
assert(generation.includes("contentDocToPlainText(doc).slice(0, BODY_TEXT_LIMIT)"), "Saved body text must be capped before entering the provider payload.");
assert(!/model:\s*["'`]gpt-/i.test(generation), "No model name may be hardcoded in source.");
assert(!/console\.(log|info|debug)\([^)]*(prompt|bodyText|output_text)/.test(generation), "Prompts and generated bodies must not be logged.");

assert(socialRoute.includes("draftContentChanged") && socialRoute.includes('approvalState = "draft"'), "Changing approved copy/settings/assets must reset approval server-side.");
assert(socialRoute.includes("requiresLegalReview") && socialRoute.includes("legal_review_required"), "Legally sensitive promotion approval must require article legal approval.");
assert(socialRoute.includes("guardPromotionDraftForApproval") && socialRoute.includes("promotion_grounding_blocked"), "Grounding blockers must be enforced by the approval API.");
assert(sendRoute.includes("approvedOnly: true") && sendRoute.includes("notOlderThan: post.updated_at"), "Only approved, non-stale channels may enter handoff.");
assert(sendRoute.includes('denyUnlessContentCapability("social.send"'), "Command Center handoff must retain social.send.");
assert(commandCenter.includes('configured: false, reason: "disabled"'), "Disabled delivery must remain an honest disconnected state.");
assert(composer.includes("if (!props.commandCenter.connected || !props.canSend) return"), "Disconnected UI must make no send request.");
assert(composer.includes("Nothing has been applied or saved yet"), "Generated suggestions must require human Apply.");
assert(composer.includes("forms[channel].approvalState === \"approved\""), "Approved fields must be excluded from suggestion application.");
assert(composer.includes('generationMode === "fill_empty"') && composer.includes("valueForField"), "Fill-empty mode must preserve populated fields.");
assert(composer.includes("suggestionScope.channels.includes(channel)") && composer.includes("suggestionScope.fields.includes(field)"), "Partial generation must never apply another channel or variant.");
assert(composer.includes("articleDirty") && composer.includes("Save the article before regenerating"), "Unsaved article changes must block generation.");

assert(assetsRoute.includes("SOCIAL_ASSET_SIZES.map") && assetsRoute.includes("content_social_assets"), "Asset action must persist all three deterministic variants.");
assert(assetsRoute.includes("/api/content/social-asset/") && !assetsRoute.includes("storage_path"), "Asset records must use an opaque public renderer URL without Storage paths.");
assert(assetsRoute.includes("mediaNotice") && assetsRoute.includes("permission state does not allow social promotion"), "Unsupported featured-media permission must be disclosed rather than silently ignored.");
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

function makeAuditClient(rows, clock) {
  return {
    from(table) {
      assert(table === "content_audit_events", "Durable metering must use only content_audit_events.");
      const filters = [];
      const builder = {
        select() { return builder; },
        eq(column, value) { filters.push((row) => row[column] === value); return builder; },
        gte(column, value) { filters.push((row) => Date.parse(row[column]) >= Date.parse(value)); return builder; },
        order() { return builder; },
        insert(value) {
          rows.push({ ...value, created_at: new Date(clock.now).toISOString() });
          return Promise.resolve({ error: null });
        },
        then(resolve) {
          return Promise.resolve({ data: rows.filter((row) => filters.every((filter) => filter(row))), error: null }).then(resolve);
        }
      };
      return builder;
    }
  };
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
