import { z } from "zod";
import type { PartnerWeeklyReportData } from "@/lib/reports/partner-weekly-report-data";

export type WeeklyReportNarrative = {
  engagementLevel: string;
  executiveSummary: string;
  biggestOpportunity: string;
  recommendedAction: string;
  strongestStage: {
    stage: string;
    readout: string;
  };
  weakestStage: {
    stage: string;
    readout: string;
    recommendedFix: string;
  };
  whatWorked: string[];
  needsAttention: string[];
  userSupportThemes: string[];
  recommendedContentUpdate: string;
  suggestedCampaignAdjustment: string;
};

const narrativeSchema = z.object({
  engagementLevel: z.string().min(1),
  executiveSummary: z.string().min(1),
  biggestOpportunity: z.string().min(1),
  recommendedAction: z.string().min(1),
  strongestStage: z.object({
    stage: z.string().min(1),
    readout: z.string().min(1)
  }),
  weakestStage: z.object({
    stage: z.string().min(1),
    readout: z.string().min(1),
    recommendedFix: z.string().min(1)
  }),
  whatWorked: z.array(z.string().min(1)).length(3),
  needsAttention: z.array(z.string().min(1)).length(3),
  userSupportThemes: z.array(z.string().min(1)).length(4),
  recommendedContentUpdate: z.string().min(1),
  suggestedCampaignAdjustment: z.string().min(1)
});

export async function generateWeeklyReportNarrative(report: PartnerWeeklyReportData): Promise<WeeklyReportNarrative> {
  const fallback = buildFallbackNarrative(report);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: process.env.OPENAI_REPORT_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [
              "You write concise partner-facing weekly reports for LegalEase.",
              "Use operational language. Do not give legal advice.",
              "Use the phrase likely eligible only as a screening result.",
              "Do not imply screening is a legal determination.",
              "Do not guarantee filing acceptance, court approval, expungement, sealing, record restriction, or outcomes.",
              "Return only valid JSON matching the requested fields."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Generate weekly report narrative JSON.",
              report: summarizeReportForNarrative(report),
              requiredShape: {
                engagementLevel: "short phrase such as steady or strong",
                executiveSummary: "2 short sentences",
                biggestOpportunity: "short phrase",
                recommendedAction: "short sentence",
                strongestStage: { stage: "stage name", readout: "short sentence" },
                weakestStage: { stage: "stage name", readout: "short sentence", recommendedFix: "short sentence" },
                whatWorked: ["three short observations"],
                needsAttention: ["three short issues"],
                userSupportThemes: ["four short themes"],
                recommendedContentUpdate: "short sentence",
                suggestedCampaignAdjustment: "short sentence"
              }
            })
          }
        ],
        temperature: 0.2,
        max_output_tokens: 900
      })
    });

    if (!response.ok) {
      return fallback;
    }

    const body = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const parsedJson = extractJson(readResponseText(body));
    const parsed = narrativeSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return fallback;
    }
    return sanitizeNarrative(parsed.data);
  } catch {
    return fallback;
  }
}

function readResponseText(body: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (body.output_text) {
    return body.output_text;
  }
  return body.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("\n")
    .trim() ?? "";
}

function summarizeReportForNarrative(report: PartnerWeeklyReportData) {
  return {
    partnerName: report.partnerName,
    reportingPeriod: report.reportingPeriod,
    atAGlance: report.atAGlance,
    funnel: report.funnel.map((stage) => ({
      label: stage.label,
      count: stage.count,
      percent: stage.percent
    })),
    mainDropOff: report.weeklySnapshot.find((metric) => metric.label === "Main drop-off point"),
    bottlenecks: report.bottlenecks,
    campaignNames: report.campaignNames,
    recentActivityCount: report.recentActivityCount
  };
}

function extractJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("No narrative response.");
  }
  const withoutFence = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(withoutFence);
}

function buildFallbackNarrative(report: PartnerWeeklyReportData): WeeklyReportNarrative {
  const strongest = findStrongestStage(report);
  const weakest = findWeakestStage(report);
  return {
    engagementLevel: "steady",
    executiveSummary: `This week, ${report.partnerName} showed steady referral activity with ${report.atAGlance.pageVisits.thisWeek.toLocaleString()} page visits, ${report.atAGlance.intakeStarts.thisWeek.toLocaleString()} intake starts, and ${report.atAGlance.screenings.thisWeek.toLocaleString()} completed screenings. ${report.atAGlance.likelyEligible.thisWeek.toLocaleString()} people had a likely eligible screening result based on the information they provided.`,
    biggestOpportunity: "help more referred people complete screening",
    recommendedAction: "Send a reminder to people who were referred but have not completed screening.",
    strongestStage: {
      stage: strongest.label,
      readout: `${strongest.count.toLocaleString()} people reached this stage${strongest.percent === null ? "." : `, equal to ${strongest.percent}% of page visits.`}`
    },
    weakestStage: {
      stage: weakest.label,
      readout: `${weakest.count.toLocaleString()} people reached this stage${weakest.percent === null ? "." : `, equal to ${weakest.percent}% of page visits.`}`,
      recommendedFix: "Use a short reminder and a clear document checklist before the next reporting period."
    },
    whatWorked: [
      "Partner referrals continued to move people into the LegalEase intake flow.",
      "Screening completion created a clearer view of who may be ready to continue.",
      "RecordShield and Expungement.ai starts show movement beyond initial intake."
    ],
    needsAttention: [
      "Some referred people have not completed screening.",
      "Some people need clearer preparation steps before paperwork can be completed.",
      "Outcome reporting remains available only where filings and updates have been received."
    ],
    userSupportThemes: report.supportThemes,
    recommendedContentUpdate: "Add a short preparation checklist that explains what information people should have before starting.",
    suggestedCampaignAdjustment: "Shift next week's message from general awareness to completion of the next step."
  };
}

function findStrongestStage(report: PartnerWeeklyReportData) {
  const stages = report.funnel.filter((stage) => stage.percent !== null);
  return stages.reduce((best, stage) => ((stage.percent ?? 0) > (best.percent ?? 0) ? stage : best), stages[0] ?? report.funnel[0]);
}

function findWeakestStage(report: PartnerWeeklyReportData) {
  const stages = report.funnel.filter((stage) => stage.percent !== null);
  return stages.reduce((weakest, stage) => ((stage.percent ?? 100) < (weakest.percent ?? 100) ? stage : weakest), stages[0] ?? report.funnel[0]);
}

function sanitizeNarrative(narrative: WeeklyReportNarrative): WeeklyReportNarrative {
  const fix = (value: string) =>
    value
      .replace(/\blikely eligible\b/gi, "__LIKELY_ELIGIBLE__")
      .replace(/\beligible\b/gi, "likely eligible")
      .replace(/__LIKELY_ELIGIBLE__/g, "likely eligible")
      .replace(/\bineligible\b/gi, "not likely eligible")
      .replace(/\bapproved\b/gi, "moved forward")
      .replace(/\bdenied\b/gi, "did not move forward")
      .replace(/\bguarantee(?:d|s)?\b/gi, "show");

  return {
    engagementLevel: fix(narrative.engagementLevel),
    executiveSummary: fix(narrative.executiveSummary),
    biggestOpportunity: fix(narrative.biggestOpportunity),
    recommendedAction: fix(narrative.recommendedAction),
    strongestStage: {
      stage: fix(narrative.strongestStage.stage),
      readout: fix(narrative.strongestStage.readout)
    },
    weakestStage: {
      stage: fix(narrative.weakestStage.stage),
      readout: fix(narrative.weakestStage.readout),
      recommendedFix: fix(narrative.weakestStage.recommendedFix)
    },
    whatWorked: narrative.whatWorked.map(fix),
    needsAttention: narrative.needsAttention.map(fix),
    userSupportThemes: narrative.userSupportThemes.map(fix),
    recommendedContentUpdate: fix(narrative.recommendedContentUpdate),
    suggestedCampaignAdjustment: fix(narrative.suggestedCampaignAdjustment)
  };
}
