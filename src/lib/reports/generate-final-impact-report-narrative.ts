import { z } from "zod";
import type { FinalImpactReportData } from "@/lib/reports/partner-final-impact-report-data";

export type FinalImpactReportNarrative = {
  executiveSummary: string[];
  keyOutcomes: Array<{ title: string; detail: string; tone: "good" | "warn" | "info" }>;
  dropOffInsights: Array<{ title: string; detail: string; tone: "good" | "warn" | "info" }>;
  partnerContribution: string;
  programLessons: Array<{ title: string; detail: string; tone: "good" | "warn" | "info" }>;
  recommendations: string[];
  expansionOptions: Array<{ label: string; title: string; detail: string; investment: string }>;
  funderNarrative: string;
  nextSteps: string[];
};

const narrativeSchema = z.object({
  executiveSummary: z.array(z.string().min(1)).length(2),
  keyOutcomes: z.array(z.object({
    title: z.string().min(1),
    detail: z.string().min(1),
    tone: z.enum(["good", "warn", "info"])
  })).length(3),
  dropOffInsights: z.array(z.object({
    title: z.string().min(1),
    detail: z.string().min(1),
    tone: z.enum(["good", "warn", "info"])
  })).length(4),
  partnerContribution: z.string().min(1),
  programLessons: z.array(z.object({
    title: z.string().min(1),
    detail: z.string().min(1),
    tone: z.enum(["good", "warn", "info"])
  })).length(5),
  recommendations: z.array(z.string().min(1)).length(4),
  expansionOptions: z.array(z.object({
    label: z.string().min(1),
    title: z.string().min(1),
    detail: z.string().min(1),
    investment: z.string().min(1)
  })).length(3),
  funderNarrative: z.string().min(1),
  nextSteps: z.array(z.string().min(1)).length(5)
});

export async function generateFinalImpactReportNarrative(report: FinalImpactReportData): Promise<FinalImpactReportNarrative> {
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
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: process.env.OPENAI_REPORT_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [
              "You write executive, funder-ready final impact reports for LegalEase partner programs.",
              "Use operational language and avoid legal advice.",
              "Use likely eligible only as a screening result.",
              "Do not present screening as a legal determination.",
              "Do not guarantee court outcomes, filing acceptance, expungement, sealing, record restriction, or relief.",
              "Do not overstate impact. Return only valid JSON matching the requested fields."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Generate final impact report narrative JSON.",
              report: summarizeReportForNarrative(report),
              requiredShape: {
                executiveSummary: ["two polished short paragraphs"],
                keyOutcomes: [{ title: "short", detail: "short", tone: "good|warn|info" }],
                dropOffInsights: [{ title: "short", detail: "short", tone: "good|warn|info" }],
                partnerContribution: "one short paragraph",
                programLessons: [{ title: "short", detail: "short", tone: "good|warn|info" }],
                recommendations: ["four direct recommendations"],
                expansionOptions: [{ label: "Option A", title: "short", detail: "short", investment: "short" }],
                funderNarrative: "one quotable paragraph",
                nextSteps: ["five next steps"]
              }
            })
          }
        ],
        temperature: 0.2,
        max_output_tokens: 1600
      })
    });

    if (!response.ok) {
      return fallback;
    }

    const body = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const parsed = narrativeSchema.safeParse(extractJson(readResponseText(body)));
    if (!parsed.success) {
      return fallback;
    }
    return sanitizeNarrative(parsed.data);
  } catch {
    return fallback;
  }
}

function summarizeReportForNarrative(report: FinalImpactReportData) {
  return {
    partnerName: report.partnerName,
    stateLabel: report.stateLabel,
    reportPeriod: report.reportPeriod,
    metrics: report.metrics,
    funnel: report.funnel,
    dropOffPoints: report.dropOffPoints,
    campaignNames: report.campaignNames,
    topStates: report.topStates
  };
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

function extractJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("No final impact narrative response.");
  }
  return JSON.parse(trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());
}

function buildFallbackNarrative(report: FinalImpactReportData): FinalImpactReportNarrative {
  const { metrics } = report;
  const screenedRate = pct(metrics.screenings, metrics.referrals);
  const likelyRate = pct(metrics.likelyEligible, metrics.screenings);
  const filedRate = pct(metrics.filedMatters, metrics.packetReady);
  const outcomeRate = pct(metrics.outcomesAvailable, metrics.filedMatters);
  const productDropOff = Math.max(metrics.likelyEligible - metrics.productStarts, 0);

  return {
    executiveSummary: [
      `Across ${report.reportPeriod}, ${report.partnerName} referred ${fmt(metrics.referrals)} people into LegalEase, with ${fmt(metrics.screenings)} completed screenings and ${fmt(metrics.likelyEligible)} people receiving a likely eligible screening result based on their answers.`,
      `The program created a clear view of movement from referral through paperwork and filing: ${fmt(metrics.packetReady)} people completed packet steps, ${fmt(metrics.filedMatters)} matters were filed where available, and outcomes were visible for ${fmt(metrics.outcomesAvailable)} filed matters. Screening results are operational indicators and are not legal determinations.`
    ],
    keyOutcomes: [
      {
        title: `${screenedRate}% of referrals completed screening`,
        detail: `${fmt(metrics.screenings)} of ${fmt(metrics.referrals)} referred users completed the screening flow, giving the partner a measurable view of demand and next-step needs.`,
        tone: "good"
      },
      {
        title: `${likelyRate}% of screened users were likely eligible`,
        detail: `${fmt(metrics.likelyEligible)} people had a likely eligible screening result based on user-provided information, without treating screening as a final legal decision.`,
        tone: "good"
      },
      {
        title: `${fmt(metrics.filedMatters)} matters reached filing`,
        detail: `${fmt(metrics.filedMatters)} of ${fmt(metrics.packetReady)} completed packets were filed where available, a ${filedRate}% packet-to-filing movement rate.`,
        tone: "info"
      }
    ],
    dropOffInsights: [
      {
        title: `Referral to screening: ${fmt(Math.max(metrics.referrals - metrics.screenings, 0))} people still need follow-up`,
        detail: "The first operational opportunity is a reminder sequence for people who were referred but did not complete screening.",
        tone: "warn"
      },
      {
        title: `Likely eligible to started: ${fmt(productDropOff)} people did not start a product workflow`,
        detail: "The largest mid-funnel opportunity is helping people gather information and understand the next step after screening.",
        tone: "warn"
      },
      {
        title: `Packet ready to filed: ${fmt(Math.max(metrics.packetReady - metrics.filedMatters, 0))} packets need filing support`,
        detail: "Completed paperwork still requires follow-through, review, filing logistics, and support for fee or documentation barriers.",
        tone: "warn"
      },
      {
        title: `Outcomes visible for ${outcomeRate}% of filed matters`,
        detail: "Outcome reporting is useful where available, but many filed matters remain pending external court updates.",
        tone: "info"
      }
    ],
    partnerContribution: `${report.partnerName} contributed the outreach, trust, and referral context that made the program measurable. Campaigns including ${report.campaignNames.slice(0, 3).join(", ") || "partner outreach"} created the top of the funnel and helped LegalEase identify where users needed additional support.`,
    programLessons: [
      {
        title: "Targeted partner outreach creates measurable demand",
        detail: "Campaign and referral activity produced a clear funnel from awareness to screening, paperwork, and filing where available.",
        tone: "good"
      },
      {
        title: "Plain-language screening improves coordination",
        detail: "The screening flow helped separate likely eligible users, needs-review users, and people who may need a future pathway.",
        tone: "good"
      },
      {
        title: "Documentation is the main post-screening barrier",
        detail: "People who appear ready to continue often need case, court, or record information before they can complete paperwork.",
        tone: "warn"
      },
      {
        title: "Filing support matters before scale",
        detail: "Completed packets still require operational support for filing logistics, review, and fee-related barriers.",
        tone: "warn"
      },
      {
        title: "The dashboard makes partner accountability visible",
        detail: "The partner can now see where referrals moved forward, where people paused, and what to improve next.",
        tone: "info"
      }
    ],
    recommendations: [
      "Add a short preparation checklist before intake so users know what information to gather.",
      "Run a re-engagement campaign for people with likely eligible screening results who did not start a product workflow.",
      "Create a filing support process for packet-ready users who have not yet filed.",
      "Use the next phase to test targeted partner outreach, reminders, and clinic support against the largest drop-off points."
    ],
    expansionOptions: [
      {
        label: "Option A — Renew and Optimize",
        title: "Second reporting cycle with workflow improvements",
        detail: "Run another partner cycle with preparation guidance, reminder campaigns, and filing support added to the process.",
        investment: "Best for near-term continuation"
      },
      {
        label: "Option B — Regional Scale-Up",
        title: "Expand referrals across priority states or programs",
        detail: "Use the current funnel data to expand outreach while tracking state-level performance and filing movement.",
        investment: "Best for larger partner coalitions"
      },
      {
        label: "Option C — Funder-Backed Program",
        title: "Package the model for philanthropic or government support",
        detail: "Use the final impact report to support funding conversations around access, workforce readiness, and record-clearing infrastructure.",
        investment: "Best for funder and agency conversations"
      }
    ],
    funderNarrative: `In ${report.reportPeriod}, ${report.partnerName} referred ${fmt(metrics.referrals)} people into a structured LegalEase access program, completed ${fmt(metrics.screenings)} screenings, identified ${fmt(metrics.likelyEligible)} likely eligible users based on screening, completed ${fmt(metrics.packetReady)} packets, and filed ${fmt(metrics.filedMatters)} matters where available. The program now has a measurable funnel, clear drop-off points, and a practical next-phase plan.`,
    nextSteps: [
      "Review this final impact report with partner leadership.",
      "Confirm the largest drop-off point to address first.",
      "Prepare a re-engagement campaign for users who need the next step.",
      "Identify filing support resources for packet-ready users.",
      "Select the next-phase model and reporting period."
    ]
  };
}

function sanitizeNarrative(narrative: FinalImpactReportNarrative): FinalImpactReportNarrative {
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
    executiveSummary: narrative.executiveSummary.map(fix),
    keyOutcomes: narrative.keyOutcomes.map((item) => ({ ...item, title: fix(item.title), detail: fix(item.detail) })),
    dropOffInsights: narrative.dropOffInsights.map((item) => ({ ...item, title: fix(item.title), detail: fix(item.detail) })),
    partnerContribution: fix(narrative.partnerContribution),
    programLessons: narrative.programLessons.map((item) => ({ ...item, title: fix(item.title), detail: fix(item.detail) })),
    recommendations: narrative.recommendations.map(fix),
    expansionOptions: narrative.expansionOptions.map((item) => ({
      label: fix(item.label),
      title: fix(item.title),
      detail: fix(item.detail),
      investment: fix(item.investment)
    })),
    funderNarrative: fix(narrative.funderNarrative),
    nextSteps: narrative.nextSteps.map(fix)
  };
}

function pct(value: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

function fmt(value: number) {
  return value.toLocaleString();
}
