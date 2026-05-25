import { readFile } from "node:fs/promises";
import path from "node:path";
import type { WeeklyReportNarrative } from "@/lib/reports/generate-weekly-report-narrative";
import type { PartnerWeeklyReportData } from "@/lib/reports/partner-weekly-report-data";

const templatePath = path.join(process.cwd(), "src", "lib", "reports", "templates", "legalese-weekly-report.html");

export async function renderWeeklyReportHtml(report: PartnerWeeklyReportData, narrative: WeeklyReportNarrative) {
  const template = await readFile(templatePath, "utf8");
  const strongest = narrative.strongestStage;
  const weakest = narrative.weakestStage;
  const mainDropOff = report.weeklySnapshot.find((metric) => metric.label === "Main drop-off point");
  const routed = report.routing.find((item) => item.label === "Expungement.ai")?.thisWeek ?? 0;

  const html = replaceSequential(
    replaceNamed(template, [
      ["[Partner Organization]", report.partnerName],
      ["[Partner Organization]", report.partnerName],
      ["[Start Date]", report.reportingPeriod.startDate],
      ["[End Date]", report.reportingPeriod.endDate],
      ["[strong / steady / early / slower-than-expected]", narrative.engagementLevel],
      ["[improving intake completion / increasing referrals / reducing drop-off]", narrative.biggestOpportunity],
      ["[specific action]", narrative.recommendedAction],
      ["[Step]", textValue(mainDropOff?.thisWeek ?? "Screening")],
      ["[Stage]", strongest.stage],
      ["[# / %]", strongest.readout],
      ["[Stage]", weakest.stage],
      ["[# / %]", weakest.readout],
      ["[reason 1]", "missing documents"],
      ["[reason 2]", "unclear case information"],
      ["[reason 3]", "follow-up timing"],
      ["[Specific operational fix, e.g. Add SMS reminder within 24 hours of intake start for users who did not complete screening.]", weakest.recommendedFix],
      ["[Observation 1]", narrative.whatWorked[0]],
      ["[Observation 2]", narrative.whatWorked[1]],
      ["[Observation 3]", narrative.whatWorked[2]],
      ["[Issue 1]", narrative.needsAttention[0]],
      ["[Issue 2]", narrative.needsAttention[1]],
      ["[Issue 3]", narrative.needsAttention[2]],
      ["[Theme 1]", narrative.userSupportThemes[0]],
      ["[Theme 2]", narrative.userSupportThemes[1]],
      ["[Theme 3]", narrative.userSupportThemes[2]],
      ["[Theme 4]", narrative.userSupportThemes[3]],
      ["[Add FAQ / update landing page / create explainer / add Wilma prompt / send reminder message]", narrative.recommendedContentUpdate],
      ["[Issue]", "Outcome updates are still pending for some filed matters"],
      ["[Fix]", "Track follow-up dates and update outcomes when available"],
      ["[Action 1 — e.g. Add \"What You Need Before You Start\" section to campaign landing page]", report.legalEaseActions[0]?.text],
      ["[Action 2 — e.g. Add 24-hour SMS reminder for incomplete intake users]", report.legalEaseActions[1]?.text],
      ["[Action 3 — e.g. Create Wilma FAQ explaining screening versus eligibility determination]", report.legalEaseActions[2]?.text],
      ["[Action 1 — e.g. Send second outreach email]", report.partnerActions[0]?.text],
      ["[Action 2 — e.g. Post campaign reminder on Facebook and Instagram]", report.partnerActions[1]?.text],
      ["[Action 3 — e.g. Share flyer QR code with staff and community partners]", report.partnerActions[2]?.text],
      ["[One clear recommendation — e.g. Shift next week's messaging from general awareness to completion: \"Started your intake? Your next step is still available. Complete your screening today.\"]", narrative.suggestedCampaignAdjustment],
      ["[Yes / No]", "Yes"],
      ["[date]", report.reportingPeriod.startDate],
      ["[Yes / No]", "Yes"],
      ["[date]", report.reportingPeriod.startDate],
      ["[Yes / No]", report.campaignNames.length ? "Yes" : "No"],
      ["[Yes / No]", "Yes"],
      ["[Yes / No]", report.campaignNames.some((name) => /clinic/i.test(name)) ? "Yes" : "No"]
    ]),
    [
      {
        token: "[#]",
        values: buildNumberValues(report, routed)
      },
      {
        token: "[%]",
        values: report.funnel.slice(1).map((stage) => stage.percent === null ? "—" : `${stage.percent}%`)
      },
      {
        token: "[Brief note]",
        values: [
          "Campaign traffic from partner referrals",
          "People beginning intake after referral",
          "Completed required screening questions",
          mainDropOff?.note ?? "Continue targeted reminders"
        ]
      }
    ]
  );

  return html
    .replaceAll("Likely Eligible", "Likely eligible")
    .replaceAll("likely eligible users", "likely eligible users")
    .replaceAll("Week [#] of 12", `Week ${report.reportingPeriod.weekNumber} of ${report.reportingPeriod.totalWeeks}`)
    .replaceAll("Week [#] complete", `Week ${report.reportingPeriod.weekNumber} complete`)
    .replace(/\[[^\]]+\]/g, "—");
}

function replaceNamed(source: string, replacements: Array<[string, string | number | undefined]>) {
  return replacements.reduce((html, [token, value]) => html.replace(token, escapeHtml(textValue(value))), source);
}

function replaceSequential(source: string, groups: Array<{ token: string; values: Array<string | number> }>) {
  return groups.reduce((html, group) => {
    let index = 0;
    return html.replaceAll(group.token, () => escapeHtml(textValue(group.values[index++] ?? "—")));
  }, source);
}

function buildNumberValues(report: PartnerWeeklyReportData, routed: number) {
  const glance = report.atAGlance;
  const values: Array<string | number> = [
    report.reportingPeriod.weekNumber,
    report.reportingPeriod.weekNumber,
    report.reportingPeriod.weekNumber,
    glance.pageVisits.thisWeek,
    glance.pageVisits.cumulative,
    glance.intakeStarts.thisWeek,
    glance.intakeStarts.cumulative,
    glance.screenings.thisWeek,
    glance.likelyEligible.thisWeek,
    glance.pageVisits.thisWeek,
    glance.intakeStarts.thisWeek,
    glance.screenings.thisWeek,
    glance.likelyEligible.thisWeek,
    report.atAGlance.screenings.thisWeek - report.atAGlance.likelyEligible.thisWeek,
    routed
  ];

  report.weeklySnapshot
    .filter((metric) => typeof metric.thisWeek === "number" && typeof metric.cumulative === "number")
    .forEach((metric) => {
      values.push(metric.thisWeek, metric.cumulative);
    });

  report.funnel.forEach((stage) => values.push(stage.count));
  report.routing.forEach((route) => values.push(route.thisWeek, route.cumulative));
  values.push(report.recentActivityCount);
  report.weekAheadTargets.forEach((target) => values.push(target.target));
  return values;
}

function textValue(value: string | number | undefined) {
  return String(value ?? "—");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
