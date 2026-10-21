import { existsSync } from "node:fs";
import path from "node:path";
import type { PartnerLandingPageTemplateProps } from "@/components/partners/PartnerLandingPageTemplate";
import { partnerIntake } from "./routes";
import type { PartnerRecord } from "./types";
import { MVLP_PARTNER_SLUG } from "./mvlp-routing";

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
  if (partner.partnerSlug === MVLP_PARTNER_SLUG) {
    return buildMvlpLandingPageData(partner);
  }
  const isWeMustVote = partner.partnerSlug === "we-must-vote";
  const state = isWeMustVote ? "Mississippi" : fullStateName(partner.targetState ?? partner.state);
  const counties = countyOptionsForPartner(partner, state);
  const organizationName = isWeMustVote ? "We Must Vote" : partner.organizationName ?? partner.partnerName;
  const serviceArea = isWeMustVote ? "Mississippi" : partner.serviceArea ?? partner.targetCounty ?? partner.region ?? state;
  const programName = isWeMustVote ? "Mississippi Expungement Workflow" : partner.programName ?? `${organizationName} Record-Clearing Access Program`;
  const programDescription =
    isWeMustVote
      ? "Help Mississippi residents start a guided record review, prepare a source-backed expungement packet, and understand filing next steps."
      : partner.programDescription ??
    partner.programGoal ??
    "Start with a free screening and get a clearer next step for record-clearing support.";
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
    eyebrow: isWeMustVote ? "Mississippi expungement access" : `${serviceArea} record-clearing access`,
    landingPageHeadline: isWeMustVote
      ? "Clear your Mississippi record with We Must Vote + LegalEase."
      : `Start your ${serviceArea} record-clearing screening.`,
    landingPageSubheadline: isWeMustVote
      ? "Start a guided Mississippi record review, prepare a draft expungement packet where the workflow supports it, and see filing next steps in plain English."
      : `${organizationName} and LegalEase help residents start with plain-language screening and a practical next step.`,
    primaryCtaLabel: isWeMustVote ? "Start Mississippi Record Review" : "Start My Free Screening",
    primaryCtaHref: partnerIntake(partner.partnerSlug),
    secondaryCtaLabel: isWeMustVote ? "Sign In or Open Briefcase" : "See How It Works",
    secondaryCtaHref: isWeMustVote ? "/briefcase" : "#how-it-works",
    trustLine: isWeMustVote ? "Free to start. Mississippi-only launch workflow. Save and return from your Briefcase." : "Free to start. Plain-language guidance. Built for record-clearing access.",
    trustChips: isWeMustVote ? ["Mississippi workflow only", "Packet PDF downloads", "Confirm before filing checklist"] : ["No legal advice promises", "Private screening flow", `${state} service area`],
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
    quoteAttribution: isWeMustVote ? "We Must Vote" : organizationName,
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
        body: isWeMustVote ? "Share Mississippi case basics and what you know about the arrest, charge, or court outcome." : "Share basic information about location, record type, and what you know.",
        imageUrl: assetPath("wemustvote", "task_checklist_and_assistant_illustration.png")
      },
      {
        title: isWeMustVote ? "Complete the Mississippi packet flow" : "Get plain-language guidance",
        body: isWeMustVote ? "LegalEase uses your answers to prepare a Mississippi packet preview where the workflow supports it." : "LegalEase helps identify the next route based on your answers and program scope.",
        imageUrl: assetPath("wemustvote", "friendly_consultation_with_a_roadmap_of_guidance.png")
      },
      {
        title: isWeMustVote ? "Download and review next steps" : "Follow the path",
        body: isWeMustVote ? "Review the filing next steps, fee summary, Confirm before filing checklist, safety disclaimer, and downloadable PDFs." : "Continue with the next step where support is available.",
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
        answer: isWeMustVote ? "If your answers fit the launch scope, you can continue into the Mississippi petition information form, generate a saved packet, review filing next steps, and download LegalEase and court filing PDFs." : "You receive a next step based on your location, record-clearing need, and the current program scope."
      }
    ],
    finalCtaHeadline: isWeMustVote ? "Ready to start your Mississippi record review?" : "Ready to find your next step?",
    finalCtaBody: isWeMustVote ? "Create or return to your LegalEase Briefcase as you move through the We Must Vote Mississippi workflow." : `Start with a free ${serviceArea} screening through ${organizationName} and LegalEase.`,
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

// MVLP: an explicit, scoped configuration for the dynamic route (Vercel
// previews and any host other than the production partner domain, which
// serves the generated static page). Same template, MVLP theme and copy;
// nothing here changes We Must Vote or the generic fallback. The purple is
// measured from the supplied wordmark; the light accent is derived from it.
const MVLP_BRAND_COLOR = "#6D378F";
const MVLP_ACCENT_COLOR = "#B48CD3";

function buildMvlpLandingPageData(partner: PartnerRecord): PartnerLandingPageTemplateProps {
  const organizationName = "Mississippi Volunteer Lawyers Project";
  const register = `/p/${partner.partnerSlug}/clinics`;
  const illustration = (filename: string) => assetPath("wemustvote", `assets/wemustvote/${filename}`);
  return {
    partnerSlug: partner.partnerSlug,
    partnerName: "MVLP",
    organizationName,
    partnerLogoUrl: partner.logoUrl ?? "/assets/partners/mvlp/mvlp-logo.png",
    legaleaseLogoUrl: assetPath("legalease", "legalease-logo-2025-ob-cropped.png"),
    state: "Mississippi",
    counties: ["Mississippi"],
    serviceArea: "Mississippi",
    programName: "Self-Representation Expungement Clinics",
    programDescription: "Register for an MVLP expungement clinic, complete your application, and work with the MVLP team on your next steps.",
    eyebrow: "MVLP \u00d7 LegalEase",
    landingPageHeadline: "Get help taking the next step with your record.",
    landingPageSubheadline: "Register for an MVLP expungement clinic, complete your intake, and work with the MVLP team on your next steps.",
    primaryCtaLabel: "Register for a clinic",
    primaryCtaHref: register,
    secondaryCtaLabel: "Continue my application",
    secondaryCtaHref: `/p/${partner.partnerSlug}/continue`,
    trustLine: "Free to register. Your application stays private. Registering is not a promise of legal help: MVLP reviews every application.",
    trustChips: ["Mississippi clinics", "Free to register", "Save and return anytime"],
    heroImageUrl: illustration("hero-record-clearing-path.png"),
    helpItems: [
      { title: "Old arrest", body: "You have an old arrest and want to know whether it may still matter.", imageUrl: illustration("icon-old-arrest.png") },
      { title: "Charged, not convicted", body: "You were charged, but the case did not end in a conviction.", imageUrl: illustration("icon-charged-not-convicted.png") },
      { title: "Past conviction", body: "You have a conviction and want to understand whether there may be a path forward.", imageUrl: illustration("icon-past-conviction.png") },
      { title: "Not sure what shows up", body: "You want to know what an employer, landlord, school, or licensing agency may see.", imageUrl: illustration("icon-not-sure-what-shows-up.png") }
    ],
    promiseItems: [
      { title: "Free to register", body: "Choose a clinic and tell us how to reach you. You do not need every answer before you start.", imageUrl: illustration("promise-free-to-start.png") },
      { title: "Plain-English steps", body: "Your application asks simple questions, saves your progress, and shows what is still needed.", imageUrl: illustration("promise-plain-language-guidance.png") },
      { title: "Real people review your application", body: "MVLP staff and volunteer attorneys review your application and tell you what comes next.", imageUrl: illustration("promise-right-next-step.png") }
    ],
    quoteText: "Many people wait because the process feels confusing, expensive, or out of reach. MVLP clinics give Mississippians a trusted place to start, with volunteer attorneys and a clear plan for what happens next.",
    quoteAttribution: `${organizationName} \u00b7 Self-Representation Expungement Clinics`,
    comparisonColumns: [
      { title: "MVLP + LegalEase", body: "Free registration, one private application, review by MVLP staff and volunteer attorneys, and clear instructions for signing, notarizing, and filing.", imageUrl: illustration("comparison/comparison-wemustvote-legalease.png") },
      { title: "Figuring it out alone", body: "Confusing court language, missing paperwork, and no clear place to start.", imageUrl: illustration("comparison/comparison-figure-it-out-alone.png") },
      { title: "Waiting or guessing", body: "Opportunities may be delayed and it can be hard to know what to do next.", imageUrl: illustration("comparison/comparison-waiting-or-guessing.png") }
    ],
    howItWorksSteps: [
      { title: "Register for a clinic", body: "Choose a clinic date and tell us how to reach you.", imageUrl: illustration("task_checklist_and_assistant_illustration.png") },
      { title: "Complete your application", body: "Answer the MVLP intake questions about your case, household, and income. Save and return anytime.", imageUrl: illustration("friendly_consultation_with_a_roadmap_of_guidance.png") },
      { title: "MVLP review, documents, and next steps", body: "MVLP staff review your application and a volunteer attorney reviews your case. If MVLP can help, you receive documents to review and sign, notary instructions where required, and clear next steps for filing.", imageUrl: illustration("following_the_path_to_success.png") }
    ],
    whatYouNeedItems: [
      "Your full legal name and date of birth",
      "A phone number or email where MVLP can reach you",
      "Case information: the county, the charge, and how the case ended, if you know it",
      "Household and income information",
      "Any court paperwork you already have"
    ],
    faqItems: [
      { question: "Is it free?", answer: "Registration and the application are free. MVLP tells you about any court, record, or notary costs that apply to your case." },
      { question: "Will an attorney help me?", answer: "At the clinic, volunteer attorneys give legal advice, review your documents, and explain how to file. You file your own case; the clinic does not include courtroom representation." },
      { question: "Will registering clear my record?", answer: "No. Registering saves your place and starts your application. MVLP reviews every application and decides whether it can help. A court makes the final decision on your record." },
      { question: "Is LegalEase a law firm?", answer: "No. LegalEase provides the software MVLP uses to organize registrations, applications, documents, and follow-up. LegalEase does not provide legal advice." }
    ],
    finalCtaHeadline: "Ready to take the next step?",
    finalCtaBody: "Register for an MVLP clinic and start your application today. Registration does not guarantee assistance, eligibility, or any court outcome.",
    finalCtaImageUrl: illustration("following_the_path_to_success.png"),
    brandColor: MVLP_BRAND_COLOR,
    accentColor: MVLP_ACCENT_COLOR
  };
}
