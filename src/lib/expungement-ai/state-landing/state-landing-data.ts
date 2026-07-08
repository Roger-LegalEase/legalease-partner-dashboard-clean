/**
 * State landing page data builder for Expungement.ai.
 *
 * Turns the generated, engine-derived content (generated-state-content.json — a pure projection
 * of src/lib/rcap-engine/compiled/profiles) plus the curated presentation terminology into a
 * complete, copy-safe view model for one state landing page.
 *
 * Design rules baked in here:
 *   - DATA-DRIVEN: per-state term, pathway highlights, and FAQ answers come from the engine data,
 *     so no two pages are thin clones (see the state-specific FAQ answers).
 *   - PRESELECT, NEVER LOCK: the primary CTA deep-links the state's screening route, but a
 *     "Choose a different state" link to the general picker is always present.
 *   - COPY-SAFE: no outcome promises, no "qualify"/"eligible", disclaimers on every page.
 *   - DTC ONLY: CTAs carry no partner slug and no `?session=`, so the flow stays in DTC/$50 mode.
 */

import generated from "./generated-state-content.json";
import { getStateTermOverride } from "@/lib/expungement-ai/state-landing/state-terminology";
import { productionExpungementAiUrl } from "@/lib/app-url";

export type GeneratedStateContent = {
  code: string;
  name: string;
  slug: string;
  primaryConsumerTerm: string;
  avoidUniversalExpungementLabel: boolean;
  allowedStateTerms: string[];
  pathwayHighlights: string[];
};

type GeneratedFile = {
  generatedFrom: string;
  jurisdictionCount: number;
  states: GeneratedStateContent[];
};

const CONTENT = generated as GeneratedFile;

// --- Routing constants (public expungement.ai paths, DTC only) --------------------------------

/** Deep-link the DTC screening flow with a state preselected. Matches StatePicker's link form. */
export function screeningHrefForCode(code: string): string {
  return `/expungement-ai/screening/${code.toUpperCase()}`;
}
/** The general state picker — always reachable so a preselected state is never a lock. */
export const STATE_PICKER_HREF = "/expungement-ai/screening";
export const HOW_IT_WORKS_HREF = "/expungement-ai/how-it-works";
export const BRIEFCASE_HREF = "/briefcase";

// --- Shared "chrome" copy (identical across states; combined with per-state data below) --------

export const STATE_LANDING_CHROME = {
  trustBullets: [
    "Free to start — answer a few plain questions with no card and no account.",
    "$50 only if a self-help packet path may be available and you choose to continue.",
    "Self-help document preparation. Not a law firm, and not legal advice.",
    "The court or agency makes the final decision on your record.",
    "Court, agency, and background-report fees may be separate from the $50."
  ],
  prepareItems: [
    "A state-specific self-help packet, when a path may be available.",
    "A plain-English filing checklist for the court or agency.",
    "Clear next steps written for the route that fits your answers.",
    "Guidance on any outside documents you may need before filing.",
    "Everything saved privately to your Briefcase — no legal representation."
  ],
  mayNeedItems: [
    "A court filing fee, or a fee-waiver request if you cannot pay it.",
    "A certified copy of your disposition or court records, if the court requires one.",
    "A state police or background report, if the process calls for one.",
    "Fingerprints, if the agency requires them.",
    "Service or mailing steps, and a hearing, if your route includes them."
  ],
  howItWorks: [
    "Start a free record-clearing check.",
    "Confirm the state where the arrest, charge, or conviction happened — or change it if needed.",
    "Answer plain-English questions about what happened.",
    "See whether a record-clearing path may be available, based on what you shared.",
    "Create an account only when you want to save your matter or continue.",
    "Pay $50 only if a self-help packet path may be available.",
    "Get your packet and filing checklist, then file with the court or agency yourself."
  ]
} as const;

// --- Per-state derivation ---------------------------------------------------------------------

const BY_SLUG = new Map(CONTENT.states.map((s) => [s.slug, s]));
const BY_CODE = new Map(CONTENT.states.map((s) => [s.code, s]));

/** All landing slugs, sorted by state name — used by generateStaticParams and the verifier. */
export function listStateLandingSlugs(): string[] {
  return [...CONTENT.states].sort((a, b) => a.name.localeCompare(b.name)).map((s) => s.slug);
}

export function jurisdictionCount(): number {
  return CONTENT.states.length;
}

/** Display term for the hero: curated override where a state's vocabulary differs, else derived. */
function displayTermFor(content: GeneratedStateContent): { termLabel: string; termBlurb: string } {
  const override = getStateTermOverride(content.code);
  if (override) return override;

  const terms = content.allowedStateTerms.map((t) => t.toLowerCase());
  let termLabel = "Expungement";
  if (terms.includes("sealing")) termLabel = "Expungement & Sealing";
  else if (terms.includes("set-aside")) termLabel = "Expungement & Set-Aside";
  else if (terms.includes("erasure")) termLabel = "Expungement & Record Erasure";

  const termBlurb = content.avoidUniversalExpungementLabel
    ? `In ${content.name}, record clearing can take more than one form depending on your case.`
    : `In ${content.name}, record clearing is generally handled through ${termLabel.toLowerCase()}.`;
  return { termLabel, termBlurb };
}

export type StateFaqItem = { q: string; a: string };

function buildFaq(content: GeneratedStateContent, termLabel: string): StateFaqItem[] {
  const { name, pathwayHighlights } = content;
  const routeList = pathwayHighlights.slice(0, 3).join("; ");
  return [
    {
      q: `Is this expungement, sealing, or another kind of record clearing in ${name}?`,
      a: `${name} handles record clearing as ${termLabel}. Common routes here include: ${routeList}. Your free check points you to the route that fits your answers.`
    },
    {
      q: `Can Expungement.ai prepare the ${name} paperwork for me?`,
      a: `When a path may be available, we prepare a self-help packet and a filing checklist built for ${name}. We are not a law firm and do not file for you — you review and file the paperwork yourself.`
    },
    {
      q: `What if I don't have my ${name} court records?`,
      a: `That's common. Your next-steps packet explains how to request a certified disposition or case records from the court, and where they fit in the ${name} process.`
    },
    {
      q: "Are court fees included in the $50?",
      a: "No. The $50 is a self-help packet fee only. Court filing fees, agency fees, and background-report costs are set by the government and may be separate. Fee-waiver guidance is included when it may apply."
    },
    {
      q: "Will the court definitely clear my record?",
      a: `No one can promise that. In ${name}, the court or agency makes the final decision — there is no guaranteed court outcome. We prepare self-help paperwork and next steps, not a result.`
    },
    {
      q: "What if my case is very recent or still open?",
      a: `Some ${name} routes have waiting periods, and open cases usually have to close first. If timing isn't right yet, your check explains what may change and when a path may be available later.`
    },
    {
      q: "What if I have more than one case, or a case in another state?",
      a: `You can check as many cases as you need. Each record is saved as its own matter, and you can start another free check for a different state any time from your Briefcase — starting here never locks you into ${name}.`
    }
  ];
}

export type StateLandingData = {
  code: string;
  name: string;
  slug: string;
  displayTerm: string;
  termBlurb: string;
  allowedStateTerms: string[];
  pathwayHighlights: string[];
  hero: {
    eyebrow: string;
    headline: string;
    sub: string;
    ctaPrimaryLabel: string;
    ctaPrimaryHref: string;
    ctaSecondaryLabel: string;
    ctaSecondaryHref: string;
    howItWorksHref: string;
  };
  changeStateLabel: string;
  changeStateHref: string;
  briefcaseHref: string;
  routesIntro: string;
  trustBullets: readonly string[];
  prepareItems: readonly string[];
  mayNeedItems: readonly string[];
  howItWorks: readonly string[];
  faq: StateFaqItem[];
  seo: {
    title: string;
    description: string;
    canonical: string;
    ogTitle: string;
    ogDescription: string;
  };
};

export function getStateLandingDataBySlug(slug: string): StateLandingData | null {
  const content = BY_SLUG.get(slug);
  if (!content) return null;
  return buildStateLandingData(content);
}

export function getStateLandingDataByCode(code: string): StateLandingData | null {
  const content = BY_CODE.get(code.toUpperCase());
  if (!content) return null;
  return buildStateLandingData(content);
}

function buildStateLandingData(content: GeneratedStateContent): StateLandingData {
  const { name, code, slug, pathwayHighlights, allowedStateTerms } = content;
  const { termLabel, termBlurb } = displayTermFor(content);
  const canonical = `${productionExpungementAiUrl}/states/${slug}`;

  const headline = `Clear a record in ${name} with self-help paperwork built for your next step.`;
  const sub = `${termBlurb} Answer a few plain questions for free and see whether a path may be available — based on what you share, not a sales pitch.`;

  return {
    code,
    name,
    slug,
    displayTerm: termLabel,
    termBlurb,
    allowedStateTerms,
    pathwayHighlights,
    hero: {
      eyebrow: `${name} record clearing`,
      headline,
      sub,
      ctaPrimaryLabel: "Start free record-clearing check",
      ctaPrimaryHref: screeningHrefForCode(code),
      ctaSecondaryLabel: "See how it works",
      ctaSecondaryHref: HOW_IT_WORKS_HREF,
      howItWorksHref: HOW_IT_WORKS_HREF
    },
    changeStateLabel: "Wrong state? Choose a different state",
    changeStateHref: STATE_PICKER_HREF,
    briefcaseHref: BRIEFCASE_HREF,
    routesIntro: `Common record-clearing routes in ${name} include:`,
    trustBullets: STATE_LANDING_CHROME.trustBullets,
    prepareItems: STATE_LANDING_CHROME.prepareItems,
    mayNeedItems: STATE_LANDING_CHROME.mayNeedItems,
    howItWorks: STATE_LANDING_CHROME.howItWorks,
    faq: buildFaq(content, termLabel),
    seo: {
      title: `${name} Record Clearing (${termLabel}) — Free Check | Expungement.ai`,
      description: `See whether a record-clearing path may be available in ${name}. Free plain-English check, self-help packets when a path fits, $50 only if you continue. Not a law firm; the court decides.`,
      canonical,
      ogTitle: `${name} Record Clearing — Start a Free Check`,
      ogDescription: `${name} record clearing as ${termLabel}. Free check, self-help packet if a path may be available, court fees separate.`
    }
  };
}

/** Every visible string a landing page can render, flattened — used by the copy-safety verifier. */
export function collectLandingStrings(data: StateLandingData): string[] {
  return [
    data.displayTerm,
    data.termBlurb,
    data.routesIntro,
    data.changeStateLabel,
    data.hero.eyebrow,
    data.hero.headline,
    data.hero.sub,
    data.hero.ctaPrimaryLabel,
    data.hero.ctaSecondaryLabel,
    ...data.pathwayHighlights,
    ...data.trustBullets,
    ...data.prepareItems,
    ...data.mayNeedItems,
    ...data.howItWorks,
    ...data.faq.flatMap((f) => [f.q, f.a]),
    data.seo.title,
    data.seo.description,
    data.seo.ogTitle,
    data.seo.ogDescription
  ];
}
