/**
 * Shared publishing platform — core contracts (isomorphic).
 *
 * One content system serves two public destinations: Expungement.ai (consumer) and LegalEase
 * Partner (partner/B2B). Keeping the vocabulary here (no server-only guard) lets the CMS client,
 * the server routes, the public renderers, and the verifiers reference one source of truth —
 * the same convention as src/lib/analytics/event-names.ts.
 *
 * Design rules baked in here:
 *   - STRUCTURED SOURCE OF TRUTH: the editor stores a validated block document (ContentDoc), not
 *     an HTML blob. Public HTML is derived server-side by an allowlisting renderer, so a
 *     compromised or buggy editor can never inject markup into a public page.
 *   - FAIL CLOSED: unknown status, role, destination, or block type is rejected, never rendered.
 *   - LEGAL REVIEW IS NOT OPTIONAL for substantive legal content (see requiresLegalReview).
 */

// --- Destinations ------------------------------------------------------------------------------

export const CONTENT_DESTINATIONS = ["expungement_ai", "legalease_partner"] as const;
export type ContentDestination = (typeof CONTENT_DESTINATIONS)[number];

const destinationSet = new Set<string>(CONTENT_DESTINATIONS);
export function isContentDestination(value: unknown): value is ContentDestination {
  return typeof value === "string" && destinationSet.has(value);
}

// --- Content types -----------------------------------------------------------------------------

export const CONTENT_TYPES = [
  "blog_article",
  "product_announcement",
  "founder_note",
  "partner_insight",
  "partner_story",
  "testimonial_story",
  "state_resource",
  "downloadable_resource",
  "resource_guide"
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

const contentTypeSet = new Set<string>(CONTENT_TYPES);
export function isContentType(value: unknown): value is ContentType {
  return typeof value === "string" && contentTypeSet.has(value);
}

/**
 * Content types that carry substantive legal meaning. These can never reach `published` without a
 * recorded legal-review approval. The CMS enforces this in the workflow layer; the migration
 * enforces it again with a CHECK constraint so a direct DB write cannot bypass it.
 */
export const LEGAL_REVIEW_REQUIRED_TYPES = ["state_resource", "resource_guide"] as const;

const legalReviewTypeSet = new Set<string>(LEGAL_REVIEW_REQUIRED_TYPES);

/**
 * Legal review is required when the content type is inherently legal, OR when an editor has
 * flagged the post as legally sensitive (eligibility explanations, waiting periods, filing
 * guidance, legal-effect claims, immigration content can appear in any content type).
 */
export function requiresLegalReview(contentType: ContentType, legalSensitive: boolean): boolean {
  return legalReviewTypeSet.has(contentType) || legalSensitive;
}

// --- Publication workflow ----------------------------------------------------------------------

export const CONTENT_STATUSES = [
  "draft",
  "in_editorial_review",
  "changes_requested",
  "in_legal_review",
  "approved",
  "scheduled",
  "published",
  "updated",
  "archived"
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

const statusSet = new Set<string>(CONTENT_STATUSES);
export function isContentStatus(value: unknown): value is ContentStatus {
  return typeof value === "string" && statusSet.has(value);
}

/** Statuses whose content is readable by the public. Everything else is invisible off-CMS. */
export const PUBLIC_STATUSES = ["published", "updated"] as const;

const publicStatusSet = new Set<string>(PUBLIC_STATUSES);
export function isPubliclyVisibleStatus(value: unknown): boolean {
  return typeof value === "string" && publicStatusSet.has(value);
}

/**
 * Legal workflow transition table. Any transition not listed here is rejected.
 * `scheduled -> published` is performed by the scheduler, not a human.
 */
export const CONTENT_TRANSITIONS: Readonly<Record<ContentStatus, readonly ContentStatus[]>> = {
  draft: ["in_editorial_review", "archived"],
  in_editorial_review: ["changes_requested", "in_legal_review", "approved", "archived"],
  changes_requested: ["draft", "in_editorial_review", "archived"],
  in_legal_review: ["changes_requested", "approved", "archived"],
  approved: ["scheduled", "published", "changes_requested", "archived"],
  scheduled: ["published", "approved", "changes_requested", "archived"],
  published: ["updated", "archived"],
  updated: ["published", "archived"],
  archived: ["draft"]
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return CONTENT_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Content roles -----------------------------------------------------------------------------

export const CONTENT_ROLES = [
  "primary_admin",
  "editor",
  "legal_reviewer",
  "social_manager",
  "contributor",
  "partner_contributor",
  "viewer"
] as const;
export type ContentRole = (typeof CONTENT_ROLES)[number];

const roleSet = new Set<string>(CONTENT_ROLES);
export function isContentRole(value: unknown): value is ContentRole {
  return typeof value === "string" && roleSet.has(value);
}

export const CONTENT_CAPABILITIES = [
  "content.read",
  "content.create",
  "content.edit_any",
  "content.edit_own",
  "content.submit_for_review",
  "content.editorial_approve",
  "content.legal_approve",
  "content.publish",
  "content.schedule",
  "content.archive",
  "content.restore_version",
  "media.upload",
  "media.manage",
  "social.draft",
  "social.approve",
  "social.send",
  "taxonomy.manage",
  "roles.manage"
] as const;
export type ContentCapability = (typeof CONTENT_CAPABILITIES)[number];

/**
 * Role -> capability matrix. Enforced server-side on every write, and mirrored by RLS in
 * supabase/phase-43-content-platform.sql. `partner_contributor` is deliberately the narrowest
 * role: it may only touch drafts owned by its own partner organization (RLS scopes the rows).
 */
export const ROLE_CAPABILITIES: Readonly<Record<ContentRole, readonly ContentCapability[]>> = {
  primary_admin: [...CONTENT_CAPABILITIES],
  editor: [
    "content.read",
    "content.create",
    "content.edit_any",
    "content.edit_own",
    "content.submit_for_review",
    "content.editorial_approve",
    "content.publish",
    "content.schedule",
    "content.archive",
    "content.restore_version",
    "media.upload",
    "media.manage",
    "social.draft",
    "social.approve",
    "taxonomy.manage"
  ],
  legal_reviewer: ["content.read", "content.legal_approve", "content.submit_for_review"],
  social_manager: ["content.read", "media.upload", "social.draft", "social.approve", "social.send"],
  contributor: [
    "content.read",
    "content.create",
    "content.edit_own",
    "content.submit_for_review",
    "media.upload"
  ],
  partner_contributor: ["content.read", "content.create", "content.edit_own", "content.submit_for_review"],
  // READ-ONLY REPORTING ROLE — PUBLISHED CONTENT ONLY.
  // "content.read" here means what the public can see, not the CMS's unpublished work. RLS enforces
  // it: content_posts_select_content_team admits a viewer only to published/updated rows. A viewer
  // is the account most likely to be handed out freely, so it must never be the widest embargo
  // blast radius in the system.
  viewer: ["content.read"]
};

export function roleHasCapability(role: ContentRole, capability: ContentCapability): boolean {
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

// --- Structured document model (the editing source of truth) ------------------------------------

/**
 * A ProseMirror/Tiptap-shaped document, restricted to an allowlist of blocks we can render safely.
 * The renderer (src/lib/content/renderer.ts) walks this tree; anything not described here is
 * dropped rather than rendered. Never store editor-produced HTML as the source of truth.
 */

export const CONTENT_MARKS = ["bold", "italic", "link", "code", "strike"] as const;
export type ContentMarkType = (typeof CONTENT_MARKS)[number];

export type ContentMark =
  | { type: "bold" | "italic" | "code" | "strike" }
  | { type: "link"; attrs: { href: string; title?: string | null } };

export type ContentTextNode = {
  type: "text";
  text: string;
  marks?: ContentMark[];
};

export const IMAGE_LAYOUTS = ["inline", "wide", "full"] as const;
export type ImageLayout = (typeof IMAGE_LAYOUTS)[number];

export const CALLOUT_TONES = ["info", "tip", "warning", "legal"] as const;
export type CalloutTone = (typeof CALLOUT_TONES)[number];

export type ContentNode =
  | ContentTextNode
  | { type: "paragraph"; content?: ContentTextNode[] }
  | { type: "heading"; attrs: { level: 2 | 3 | 4 }; content?: ContentTextNode[] }
  | { type: "bulletList"; content?: Extract<ContentNode, { type: "listItem" }>[] }
  | { type: "orderedList"; content?: Extract<ContentNode, { type: "listItem" }>[] }
  | { type: "listItem"; content?: ContentNode[] }
  | { type: "blockquote"; content?: ContentNode[] }
  | { type: "pullQuote"; attrs: { attribution?: string | null }; content?: ContentTextNode[] }
  | { type: "horizontalRule" }
  | { type: "table"; content?: Extract<ContentNode, { type: "tableRow" }>[] }
  | { type: "tableRow"; content?: Extract<ContentNode, { type: "tableCell" | "tableHeader" }>[] }
  | { type: "tableCell"; content?: ContentNode[] }
  | { type: "tableHeader"; content?: ContentNode[] }
  | {
      type: "image";
      attrs: {
        mediaId: string;
        src: string;
        alt: string;
        layout: ImageLayout;
        caption?: string | null;
        credit?: string | null;
        width?: number | null;
        height?: number | null;
      };
    }
  | {
      type: "gallery";
      attrs: {
        items: {
          mediaId: string;
          src: string;
          alt: string;
          caption?: string | null;
          credit?: string | null;
        }[];
      };
    }
  | { type: "callout"; attrs: { tone: CalloutTone; title?: string | null }; content?: ContentNode[] }
  | { type: "cta"; attrs: { label: string; href: string; ctaId: string; variant?: "primary" | "secondary" } }
  | { type: "sourceList"; attrs: { sources: { label: string; href?: string | null }[] } }
  | { type: "relatedContent"; attrs: { slugs: string[] } }
  | { type: "legalDisclaimer"; attrs: { variant: "self_help" | "not_legal_advice" | "state_specific" } };

export type ContentDoc = {
  type: "doc";
  content: ContentNode[];
};

export const EMPTY_DOC: ContentDoc = { type: "doc", content: [] };

/** Block node names the renderer knows. Used by the renderer and asserted by the verifier. */
export const ALLOWED_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "pullQuote",
  "horizontalRule",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "image",
  "gallery",
  "callout",
  "cta",
  "sourceList",
  "relatedContent",
  "legalDisclaimer"
] as const;

// --- Media -------------------------------------------------------------------------------------

export const MEDIA_PERMISSION_STATES = [
  "owned",
  "licensed",
  "partner_approved",
  "user_consented",
  "editorial_use",
  "unknown"
] as const;
export type MediaPermission = (typeof MEDIA_PERMISSION_STATES)[number];

const permissionSet = new Set<string>(MEDIA_PERMISSION_STATES);
export function isMediaPermission(value: unknown): value is MediaPermission {
  return typeof value === "string" && permissionSet.has(value);
}

export const ALLOWED_MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type MediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

const mimeSet = new Set<string>(ALLOWED_MEDIA_MIME_TYPES);
export function isAllowedMediaMimeType(value: unknown): value is MediaMimeType {
  return typeof value === "string" && mimeSet.has(value);
}

/** 12 MB. GIFs are capped harder (see validateMediaUpload) because animated GIFs blow up pages. */
export const MAX_MEDIA_BYTES = 12 * 1024 * 1024;
export const MAX_GIF_BYTES = 3 * 1024 * 1024;
export const MIN_FEATURED_IMAGE_WIDTH = 1200;

// --- Social promotion --------------------------------------------------------------------------

export const SOCIAL_CHANNELS = [
  "linkedin",
  "x",
  "facebook",
  "instagram",
  "threads",
  "email",
  "partner_kit"
] as const;
export type SocialChannel = (typeof SOCIAL_CHANNELS)[number];

const channelSet = new Set<string>(SOCIAL_CHANNELS);
export function isSocialChannel(value: unknown): value is SocialChannel {
  return typeof value === "string" && channelSet.has(value);
}

/** Hard per-channel caption limits. Enforced server-side before a promotion package can be sent. */
export const SOCIAL_CHANNEL_LIMITS: Readonly<Record<SocialChannel, number>> = {
  linkedin: 3000,
  x: 280,
  facebook: 2000,
  instagram: 2200,
  threads: 500,
  email: 5000,
  partner_kit: 5000
};

export const SOCIAL_ASSET_SIZES = [
  { key: "og", width: 1200, height: 630 },
  { key: "square", width: 1080, height: 1080 },
  { key: "portrait", width: 1080, height: 1350 }
] as const;
export type SocialAssetSizeKey = (typeof SOCIAL_ASSET_SIZES)[number]["key"];

export const SOCIAL_TEMPLATES = [
  "editorial_cover",
  "founder_note",
  "partner_spotlight",
  "quote_card",
  "product_announcement",
  "state_resource"
] as const;
export type SocialTemplate = (typeof SOCIAL_TEMPLATES)[number];

const templateSet = new Set<string>(SOCIAL_TEMPLATES);
export function isSocialTemplate(value: unknown): value is SocialTemplate {
  return typeof value === "string" && templateSet.has(value);
}

export const SOCIAL_APPROVAL_STATES = ["draft", "approved", "sent", "failed"] as const;
export type SocialApprovalState = (typeof SOCIAL_APPROVAL_STATES)[number];

// --- Command Center outbound contract ------------------------------------------------------------

export const OUTBOX_STATUSES = ["pending", "sending", "sent", "failed", "dead"] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const CONTENT_EVENT_TYPES = [
  "content.promotion.requested",
  "content.published",
  "content.unpublished"
] as const;
export type ContentEventType = (typeof CONTENT_EVENT_TYPES)[number];

/**
 * The signed envelope delivered to the Command Center. The receiving side verifies `signature`
 * over the canonical JSON of everything else, rejects a stale `issued_at`, and de-duplicates on
 * `idempotency_key`. Documented for the receiver in
 * docs/COMMAND_CENTER_CONTENT_INTEGRATION_HANDOFF.md.
 */
export type ContentEventEnvelope = {
  event_id: string;
  event_type: ContentEventType;
  idempotency_key: string;
  issued_at: string;
  source: "legalease_content";
  payload: Record<string, unknown>;
};

// --- Public view models --------------------------------------------------------------------------

export type PublicAuthor = {
  slug: string;
  name: string;
  title: string | null;
  organization: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export type PublicArticle = {
  slug: string;
  destination: ContentDestination;
  contentType: ContentType;
  title: string;
  subtitle: string | null;
  html: string;
  readingMinutes: number;
  publishedAt: string;
  updatedAt: string | null;
  author: PublicAuthor | null;
  featuredImage: { src: string; alt: string; caption: string | null; credit: string | null } | null;
  tags: string[];
  seo: {
    title: string;
    description: string;
    canonical: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string | null;
  };
};
