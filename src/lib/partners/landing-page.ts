import { existsSync } from "node:fs";
import path from "node:path";
import type { PartnerLandingPageTemplateProps } from "@/components/partners/PartnerLandingPageTemplate";
import { partnerIntake } from "./routes";
import type { PartnerRecord } from "./types";

const mississippiCounties = [
  "Adams County",
  "Alcorn County",
  "Amite County",
  "Attala County",
  "Benton County",
  "Bolivar County",
  "Calhoun County",
  "Carroll County",
  "Chickasaw County",
  "Choctaw County",
  "Claiborne County",
  "Clarke County",
  "Clay County",
  "Coahoma County",
  "Copiah County",
  "Covington County",
  "DeSoto County",
  "Forrest County",
  "George County",
  "Grenada County",
  "Harrison County",
  "Hinds County",
  "Holmes County",
  "Jackson County",
  "Jones County",
  "Lafayette County",
  "Lauderdale County",
  "Lee County",
  "Leflore County",
  "Lowndes County",
  "Madison County",
  "Marshall County",
  "Monroe County",
  "Neshoba County",
  "Oktibbeha County",
  "Panola County",
  "Pearl River County",
  "Pike County",
  "Rankin County",
  "Sunflower County",
  "Tate County",
  "Tippah County",
  "Tunica County",
  "Warren County",
  "Washington County",
  "Yalobusha County",
  "Yazoo County"
];

export function buildPartnerLandingPageData(partner: PartnerRecord): PartnerLandingPageTemplateProps {
  const state = partner.partnerSlug === "we-must-vote" ? "Mississippi" : fullStateName(partner.targetState ?? partner.state);
  const counties = countyOptionsForPartner(partner, state);
  const organizationName = partner.organizationName ?? partner.partnerName;
  const serviceArea = partner.serviceArea ?? partner.targetCounty ?? partner.region ?? state;
  const programName = partner.programName ?? `${organizationName} Record-Clearing Access Program`;
  const programDescription =
    partner.programDescription ??
    partner.programGoal ??
    "Start with a free screening and get a clearer next step for record-clearing support.";
  const isWeMustVote = partner.partnerSlug === "we-must-vote";
  const isFulton = partner.partnerSlug === "fulton-county";
  const brandColor = isWeMustVote ? "#1f3f8f" : isFulton ? "#1f5f4b" : "#18233f";
  const accentColor = isWeMustVote ? "#f4b740" : isFulton ? "#64b68a" : "#2f9e9a";

  return {
    partnerSlug: partner.partnerSlug,
    partnerName: partner.partnerName,
    organizationName,
    partnerLogoUrl: partner.logoUrl,
    legaleaseLogoUrl: assetPath("legalease", "legalease-logo-2025-ob-cropped.png"),
    state,
    counties,
    serviceArea,
    programName,
    programDescription,
    eyebrow: `${serviceArea} record-clearing access`,
    landingPageHeadline: isWeMustVote
      ? "Clear your record. Protect your future. Start with a free screening."
      : `Start your ${serviceArea} record-clearing screening.`,
    landingPageSubheadline: isWeMustVote
      ? "We Must Vote and LegalEase help Mississippi residents understand what may be possible and what to do next."
      : `${organizationName} and LegalEase help residents start with plain-language screening and a practical next step.`,
    primaryCtaLabel: "Start My Free Screening",
    primaryCtaHref: partnerIntake(partner.partnerSlug),
    secondaryCtaLabel: "See How It Works",
    secondaryCtaHref: "#how-it-works",
    trustLine: "Free to start. Plain-language guidance. Built for record-clearing access.",
    trustChips: ["No legal advice promises", "Private screening flow", `${state} service area`],
    heroImageUrl: assetPath("wemustvote", "hero-record-clearing-path.png"),
    helpItems: [
      {
        title: "Old arrest",
        body: "Start with a screening even if you are not sure whether an old arrest still appears.",
        imageUrl: assetPath("wemustvote", "icon-old-arrest.png")
      },
      {
        title: "Charged, not convicted",
        body: "Get routed based on what happened, where it happened, and what information is available.",
        imageUrl: assetPath("wemustvote", "icon-charged-not-convicted.png")
      },
      {
        title: "Past conviction",
        body: "Learn whether a record-clearing path may be available under the program scope.",
        imageUrl: assetPath("wemustvote", "icon-past-conviction.png")
      },
      {
        title: "Not sure what shows up",
        body: "You do not have to know the exact legal category to begin a first screening.",
        imageUrl: assetPath("wemustvote", "icon-not-sure-what-shows-up.png")
      }
    ],
    promiseItems: [
      {
        title: "Free to start",
        body: "Begin with a screening before you spend time trying to decode the process alone.",
        imageUrl: assetPath("wemustvote", "promise-free-to-start.png")
      },
      {
        title: "Plain-language guidance",
        body: "The flow asks direct questions and explains the next step in everyday language.",
        imageUrl: assetPath("wemustvote", "promise-plain-language-guidance.png")
      },
      {
        title: "The right next step",
        body: "LegalEase routes people based on location, record-clearing need, and available program support.",
        imageUrl: assetPath("wemustvote", "promise-right-next-step.png")
      }
    ],
    quoteText: isWeMustVote
      ? "Record clearing is civic access. This partnership helps people understand where to begin."
      : "A clear screening path helps residents move from uncertainty to action.",
    quoteAttribution: isWeMustVote ? "We Must Vote Action Fund" : organizationName,
    comparisonColumns: [
      {
        title: `${organizationName} + LegalEase`,
        body: "A guided screening path, partner context, and a clear next step.",
        imageUrl: assetPath("wemustvote", "comparison-wemustvote-legalease.png")
      },
      {
        title: "Figuring it out alone",
        body: "Searching forms, court pages, and rules without knowing which path fits.",
        imageUrl: assetPath("wemustvote", "comparison-figure-it-out-alone.png")
      },
      {
        title: "Waiting or guessing",
        body: "Missing a possible next step because the process feels too confusing to start.",
        imageUrl: assetPath("wemustvote", "comparison-waiting-or-guessing.png")
      }
    ],
    howItWorksSteps: [
      {
        title: "Answer a few screening questions",
        body: "Share basic information about location, record type, and what you know.",
        imageUrl: assetPath("wemustvote", "task_checklist_and_assistant_illustration.png")
      },
      {
        title: "Get plain-language guidance",
        body: "LegalEase helps identify the next route based on your answers and program scope.",
        imageUrl: assetPath("wemustvote", "friendly_consultation_with_a_roadmap_of_guidance.png")
      },
      {
        title: "Follow the path",
        body: "Continue with the next step where support is available.",
        imageUrl: assetPath("wemustvote", "following_the_path_to_success.png")
      }
    ],
    whatYouNeedItems: [
      "The state and county where the record happened",
      "What you remember about the charge, arrest, or case",
      "Whether there was a conviction, dismissal, or unknown outcome",
      "A way to receive follow-up instructions"
    ],
    faqItems: [
      {
        question: "Is this legal advice?",
        answer: "No. LegalEase provides screening, routing, document workflow support, and information based on program scope. It does not guarantee eligibility or outcomes."
      },
      {
        question: "What if I do not know my county?",
        answer: "Start with the best information you have. The screening can still help identify what information may be needed next."
      },
      {
        question: "Is it free to start?",
        answer: "Yes. The partner landing page begins with a free screening path."
      },
      {
        question: "What happens after screening?",
        answer: "You receive a next step based on your location, record-clearing need, and the current program scope."
      }
    ],
    finalCtaHeadline: "Ready to find your next step?",
    finalCtaBody: `Start with a free ${serviceArea} screening through ${organizationName} and LegalEase.`,
    finalCtaImageUrl: assetPath("wemustvote", "following_the_path_to_success.png"),
    brandColor,
    accentColor
  };
}

function countyOptionsForPartner(partner: PartnerRecord, state: string) {
  if (partner.targetCounty) {
    return [partner.targetCounty];
  }

  if (partner.partnerSlug === "fulton-county" || partner.organizationName?.toLowerCase().includes("fulton")) {
    return ["Fulton County"];
  }

  if (state === "Mississippi") {
    return mississippiCounties;
  }

  return [partner.serviceArea ?? partner.region ?? state];
}

function fullStateName(value: string) {
  const states: Record<string, string> = {
    AL: "Alabama",
    GA: "Georgia",
    IL: "Illinois",
    DC: "District of Columbia",
    MS: "Mississippi"
  };

  return states[value] ?? value;
}

function assetPath(partnerSlug: string, filename: string) {
  const publicPath = `/assets/partners/${partnerSlug}/${filename}`;
  const filePath = path.join(process.cwd(), "public", publicPath);
  return existsSync(filePath) ? publicPath : undefined;
}
