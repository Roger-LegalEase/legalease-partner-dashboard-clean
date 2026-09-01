/**
 * Public state-resource adapter — the ONLY door between the record-clearing engine and a public
 * resources page. Fail-closed by construction.
 *
 * WHY THIS EXISTS AND WHY IT IS NARROW
 * ------------------------------------
 * There is exactly one legal-rules source of truth in this repo (the compiled engine profiles).
 * This module does not create a second one. It also deliberately does NOT reuse the engine's
 * `projectPublicProfile()` / `PublicJurisdictionProfile`: despite the name, that projection passes
 * `copyGuardrails` straight through, and in several compiled profiles that field contains raw
 * internal source-corpus text (source PDF/RTF filenames, "train Wilma with this core logic", QA
 * prose). It is a *screening* contract, not a *publishing* contract.
 *
 * Instead we build on the already-live, already-verified public projection used by the state
 * landing pages (src/lib/expungement-ai/state-landing/state-landing-data.ts). Exactly seven fields
 * cross the boundary from the engine: code, name, slug, primaryConsumerTerm,
 * avoidUniversalExpungementLabel, allowedStateTerms, and pathwayHighlights (pathway *labels* only).
 *
 * Two gates, both fail-closed:
 *   1. APPROVAL GATE — a jurisdiction only renders if the state-promotion manifest marks it
 *      approved and live for the Expungement.ai channel. An unapproved state 404s.
 *   2. LEAK GATE — assertNoInternalLeak() re-checks the assembled payload for internal markers
 *      before it can be handed to a page. If anything internal ever reaches this layer, the page
 *      throws rather than rendering.
 *
 * If you need a new field on a resources page, add it to the LOCKED allowlist here deliberately,
 * and extend scripts/verify-content-state-resources.mjs — do not reach into the engine from a page.
 */

import {
  getStateLandingDataByCode,
  getStateLandingDataBySlug,
  listStateLandingSlugs,
  type StateLandingData
} from "@/lib/expungement-ai/state-landing/state-landing-data";
import { getStatePromotionRecord } from "@/lib/rcap/state-promotion-manifest";
import { productionExpungementAiUrl } from "@/lib/app-url";

/**
 * The LOCKED layer: derived from the approved engine projection. Nothing here is editable in the
 * CMS, and the CMS renders it read-only so an editor cannot contradict the engine.
 */
export type LockedStateLayer = {
  code: string;
  name: string;
  slug: string;
  /** The state's own vocabulary, e.g. "expungement", "sealing", "set-aside". */
  displayTerm: string;
  termBlurb: string;
  allowedStateTerms: string[];
  /** Pathway LABELS only — never summaries, rule clauses, source refs, or provability data. */
  pathwayHighlights: string[];
  screeningHref: string;
  statePickerHref: string;
};

/** The EDITABLE layer, authored in the CMS. Never contains legal rules. */
export type StateEditorialLayer = {
  intro: string | null;
  overview: string | null;
  featuredImage: { src: string; alt: string } | null;
  faqs: { question: string; answer: string }[];
  relatedSlugs: string[];
  partnerQuote: string | null;
  partnerSlug: string | null;
  announcement: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type PublicStateResource = {
  locked: LockedStateLayer;
  editorial: StateEditorialLayer;
  seo: {
    title: string;
    description: string;
    canonical: string;
    ogTitle: string;
    ogDescription: string;
  };
  disclaimer: string;
};

export const EMPTY_EDITORIAL: StateEditorialLayer = {
  intro: null,
  overview: null,
  featuredImage: null,
  faqs: [],
  relatedSlugs: [],
  partnerQuote: null,
  partnerSlug: null,
  announcement: null,
  seoTitle: null,
  seoDescription: null,
  ctaLabel: null,
  ctaHref: null
};

/**
 * Substrings that must never appear in anything we hand to a public page. These are the field
 * names and tell-tales of the internal engine corpus. Checked against the serialized payload.
 */
export const INTERNAL_LEAK_MARKERS = [
  "copyGuardrails",
  "sourceCorpusSha256",
  "sourceCorpusChars",
  "sourceSections",
  "sourcePolicy",
  "sourceRef",
  "sourceEvidenceRefs",
  "lawrenceRatification",
  "lawrence_review",
  "orderedDecisionRules",
  "sourceConditionText",
  "suggestedResultCode",
  "frontendAction",
  "frontendContract",
  "frontendBranch",
  "packetGenerator",
  "generatorSelectionContract",
  "formInventory",
  "formCandidates",
  "resultPresentationContract",
  "reviewStatus",
  "corpus-unit",
  "train Wilma",
  "SOURCE FILE",
  "sha256",
  "qa:",
  "waitingRules",
  "exclusionRules",
  "ruleClauses",
  "triggerFields",
  "hiddenQuestion"
] as const;

/**
 * The publishing gate. A jurisdiction is publishable only when the promotion manifest says it has
 * been approved for live on the Expungement.ai channel. Anything else — including a state that is
 * merely "built" — is not public.
 */
export function isJurisdictionPublishable(code: string): boolean {
  const record = getStatePromotionRecord(code);
  if (!record) return false;
  return Boolean(
    record.liveEnabled &&
      record.approvedForLive &&
      record.promotionStatus === "live" &&
      record.approvedChannels?.expungementAi
  );
}

/** Every jurisdiction slug approved for a public resources page. Sorted, stable. */
export function listPublishableJurisdictionSlugs(): string[] {
  return listStateLandingSlugs().filter((slug) => {
    const data = getStateLandingDataBySlug(slug);
    if (!data) return false;
    return isJurisdictionPublishable(data.code);
  });
}

/** Lightweight directory rows for /resources and the partner resource directory. */
export function listPublishableJurisdictions(): { code: string; name: string; slug: string; displayTerm: string }[] {
  return listPublishableJurisdictionSlugs()
    .map((slug) => getStateLandingDataBySlug(slug))
    .filter((data): data is StateLandingData => Boolean(data))
    .map((data) => ({
      code: data.code,
      name: data.name,
      slug: data.slug,
      displayTerm: data.displayTerm
    }));
}

function toLockedLayer(data: StateLandingData): LockedStateLayer {
  // Field-by-field. Never spread the source object — a spread is how internal fields escape.
  return {
    code: data.code,
    name: data.name,
    slug: data.slug,
    displayTerm: data.displayTerm,
    termBlurb: data.termBlurb,
    allowedStateTerms: [...data.allowedStateTerms],
    pathwayHighlights: [...data.pathwayHighlights],
    screeningHref: `/expungement-ai/screening/${data.code.toUpperCase()}`,
    statePickerHref: "/expungement-ai/screening"
  };
}

/**
 * Build the public payload for one jurisdiction, or null if the slug is unknown or not approved.
 * The editorial layer is passed in by the caller (loaded from content_state_editorial); this
 * module owns the locked layer and the leak check.
 */
export function getPublicStateResource(
  slug: string,
  editorial: StateEditorialLayer = EMPTY_EDITORIAL
): PublicStateResource | null {
  const data = getStateLandingDataBySlug(slug);
  if (!data) return null;
  if (!isJurisdictionPublishable(data.code)) return null;

  const locked = toLockedLayer(data);
  const canonical = `${productionExpungementAiUrl}/resources/${locked.slug}`;

  const resource: PublicStateResource = {
    locked,
    editorial,
    seo: {
      title: editorial.seoTitle?.trim() || `${locked.name} Record Clearing Resources | Expungement.ai`,
      description:
        editorial.seoDescription?.trim() ||
        `Plain-language ${locked.name} record-clearing resources. Learn how ${locked.displayTerm} works in ${locked.name}, what to prepare, and how to start a free screening. Self-help only, not legal advice.`,
      canonical,
      ogTitle: `${locked.name} Record Clearing Resources`,
      ogDescription: `How record clearing works in ${locked.name}, in plain language. Self-help document preparation, not legal advice.`
    },
    // Fixed copy — an editor cannot author or remove the disclaimer.
    disclaimer:
      "Record-clearing rules change and vary by state and by case. This page is general information, not legal advice, and a record-clearing path may or may not be available in your situation. LegalEase is not a law firm. The court or agency makes the final decision."
  };

  assertNoInternalLeak(resource);
  return resource;
}

export function getPublicStateResourceByCode(
  code: string,
  editorial: StateEditorialLayer = EMPTY_EDITORIAL
): PublicStateResource | null {
  const data = getStateLandingDataByCode(code);
  if (!data) return null;
  return getPublicStateResource(data.slug, editorial);
}

/**
 * Final backstop. Serializes the payload and refuses to return it if any internal marker appears.
 * Throws rather than returning a redacted object: a leak is a bug, and a page that would leak
 * should fail loudly in CI and in the build, not quietly render.
 */
export function assertNoInternalLeak(payload: unknown): void {
  const serialized = JSON.stringify(payload ?? {});
  const hits = INTERNAL_LEAK_MARKERS.filter((marker) =>
    serialized.toLowerCase().includes(marker.toLowerCase())
  );
  if (hits.length) {
    throw new Error(
      `Internal engine data reached the public state-resource layer (markers: ${hits.join(", ")}). Refusing to render.`
    );
  }
}
