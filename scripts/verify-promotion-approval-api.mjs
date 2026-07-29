/** Direct API regression coverage for approval reset and grounding enforcement. */
import { register } from "node:module";

register("./lib/next-server-loader.mjs", import.meta.url);
register("./lib/ts-esm-loader.mjs", import.meta.url);
register("./lib/content-social-approval-test-loader.mjs", import.meta.url);

const { POST } = await import("../src/app/api/internal/content/social/[postId]/route.ts");
const { getSocialApprovalTestState, resetSocialApprovalTestState } = await import(
  "./lib/content-social-approval-test-doubles.mjs"
);

const POST_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const base = {
  channel: "linkedin",
  primaryCaption: "Read the saved article.",
  alternateCaption: "Explore the saved article.",
  founderVoiceCaption: "A saved editorial perspective.",
  partnerCaption: "Share the saved article.",
  hashtags: ["#RecordClearing"],
  mentionTags: [],
  utmSource: "linkedin",
  utmMedium: "social",
  utmCampaign: "saved-article",
  socialAssetId: null
};

resetSocialApprovalTestState({
  guardIssues: [{ severity: "blocker", code: "guarantee_language", channel: "linkedin", field: "primaryCaption", message: "Unsafe claim." }]
});
let response = await post({ ...base, approvalState: "approved" });
assert(response.status === 422 && (await response.json()).code === "promotion_grounding_blocked", "A direct approval call must reject grounding blockers.");
assert(getSocialApprovalTestState().upserts.length === 0, "Blocked approval must persist nothing.");

resetSocialApprovalTestState();
response = await post({ ...base, approvalState: "approved" });
assert(response.status === 200, "A source-grounded direct approval call should succeed.");
assert(getSocialApprovalTestState().upserts[0][0].approval_state === "approved", "Approval must remain an explicit server write.");

resetSocialApprovalTestState({ post: { legal_sensitive: true, legal_approved_at: null } });
response = await post({ ...base, approvalState: "approved" });
assert(response.status === 422 && (await response.json()).code === "legal_review_required", "Legal-sensitive direct approval must fail before legal review.");

const existing = {
  post_id: POST_ID,
  channel: "linkedin",
  primary_caption: base.primaryCaption,
  alternate_caption: base.alternateCaption,
  founder_voice_caption: base.founderVoiceCaption,
  partner_caption: base.partnerCaption,
  hashtags: base.hashtags,
  mention_tags: base.mentionTags,
  utm_source: base.utmSource,
  utm_medium: base.utmMedium,
  utm_campaign: base.utmCampaign,
  social_asset_id: null,
  approval_state: "approved"
};
for (const patch of [
  { primaryCaption: "Changed saved copy." },
  { hashtags: ["#SecondChances"] },
  { mentionTags: ["Partner name"] },
  { utmSource: "changed-source" },
  { socialAssetId: ASSET_ID }
]) {
  resetSocialApprovalTestState({ existingDrafts: [existing], validAssetIds: [ASSET_ID] });
  response = await post({ ...base, ...patch, approvalState: "approved" });
  const body = await response.json();
  assert(response.status === 200 && body.approvalReset.includes("linkedin"), `Changing ${Object.keys(patch)[0]} must reset approval.`);
  assert(getSocialApprovalTestState().upserts[0][0].approval_state === "draft", "A changed approved channel must persist as draft.");
}

console.log("Promotion approval API verification passed.");
console.log("Direct calls: grounding/legal blockers reject before persistence; copy, hashtags, mentions, UTMs, and assets reset approval.");

async function post(channel) {
  return POST(
    new Request(`http://localhost/api/internal/content/social/${POST_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channels: [channel] })
    }),
    { params: Promise.resolve({ postId: POST_ID }) }
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
