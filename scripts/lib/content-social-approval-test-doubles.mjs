import { NextResponse } from "next/server";

const USER_ID = "11111111-1111-4111-8111-111111111111";
let state;
resetSocialApprovalTestState();

export function resetSocialApprovalTestState(overrides = {}) {
  state = {
    session: { userId: USER_ID, role: "primary_admin", partnerSlug: null, ...(overrides.session ?? {}) },
    deniedCapability: overrides.deniedCapability ?? null,
    post: {
      post_id: "22222222-2222-4222-8222-222222222222",
      slug: "saved-article",
      destination: "expungement_ai",
      content_type: "blog_article",
      status: "approved",
      title: "Saved article",
      subtitle: null,
      canonical_url: null,
      published_at: null,
      partner_slug: null,
      legal_sensitive: false,
      legal_approved_at: null,
      updated_at: "2026-07-18T12:00:00.000Z",
      version: 4,
      jurisdiction_code: null,
      featured_media_id: null,
      content_authors: null,
      ...(overrides.post ?? {})
    },
    existingDrafts: [...(overrides.existingDrafts ?? [])],
    validAssetIds: new Set(overrides.validAssetIds ?? []),
    guardIssues: [...(overrides.guardIssues ?? [])],
    upserts: [],
    gateCalls: []
  };
}

export function getSocialApprovalTestState() {
  return { ...state, upserts: state.upserts.map((rows) => structuredClone(rows)), gateCalls: [...state.gateCalls] };
}

export async function denyUnlessContentCapability(capability) {
  state.gateCalls.push(capability);
  if (state.deniedCapability === capability) {
    return { denied: NextResponse.json({ success: false, error: "Denied." }, { status: 403 }) };
  }
  return { denied: null, session: state.session };
}

export function getSupabaseAdminClient() {
  return { from: (table) => query(table) };
}

function query(table) {
  let operation = "select";
  let payload = null;
  const filters = [];
  const builder = {
    select() { return builder; },
    eq(column, value) { filters.push((row) => row[column] === value); return builder; },
    in(column, values) { filters.push((row) => values.includes(row[column])); return builder; },
    order() { return builder; },
    upsert(rows) { operation = "upsert"; payload = rows; state.upserts.push(rows); return builder; },
    then(resolve) {
      let data = [];
      if (table === "content_social_drafts") data = operation === "upsert" ? payload : state.existingDrafts.filter((row) => filters.every((filter) => filter(row)));
      if (table === "content_social_assets") data = [...state.validAssetIds].map((social_asset_id) => ({ social_asset_id, post_id: state.post.post_id })).filter((row) => filters.every((filter) => filter(row)));
      return Promise.resolve({ data, error: null }).then(resolve);
    }
  };
  return builder;
}

export async function loadPromotionPost() { return state.post; }
export function promotionPostIsInScope(session, post) { return !session.partnerSlug || session.partnerSlug === post.partner_slug; }
export function canonicalUrlForPost() { return "https://expungement.ai/blog/saved-article"; }
export function defaultCampaignName(post) { return post.slug; }
export async function loadPromotionProviderSource() { return { post: state.post, source: { title: state.post.title } }; }
export function guardPromotionDraftForApproval() { return state.guardIssues; }
export function buildTrackedLink(url) { return url; }
export function getSafeRequestId() { return "promotion-approval-verifier"; }
export function logSecurityError() {}
export function logSecurityInfo() {}
export function logSecurityWarn() {}
