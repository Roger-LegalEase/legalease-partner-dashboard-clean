import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FinalImpactReportNarrative } from "@/lib/reports/generate-final-impact-report-narrative";
import type {
  FinalImpactFunnelStage,
  FinalImpactReportData,
  FinalImpactTableRow
} from "@/lib/reports/partner-final-impact-report-data";

const templatePath = path.join(process.cwd(), "src", "lib", "reports", "templates", "legalese-final-impact-report.html");

export async function renderFinalImpactReportHtml(report: FinalImpactReportData, narrative: FinalImpactReportNarrative) {
  const template = await readFile(templatePath, "utf8");
  const html = template
    .replaceAll("We Must Vote", escapeHtml(report.partnerName))
    .replaceAll("Harris County, Texas", escapeHtml(report.stateLabel))
    .replaceAll("March 1 – May 31, 2026", escapeHtml(report.reportPeriod))
    .replaceAll("June 5, 2026", escapeHtml(report.reportDate))
    .replace("[Partner Contact Name] &nbsp;·&nbsp; [Title] &nbsp;·&nbsp; [Email]", "Partner team &nbsp;·&nbsp; Reporting contact &nbsp;·&nbsp; partner@legalease.com")
    .replace("Record-Clearing<br>Access Pilot<br><em>Final Impact Report</em>", "Partner<br>Impact Program<br><em>Final Impact Report</em>")
    .replace("90-Day Pilot · Final Impact Report", `${escapeHtml(report.dateRangeLabel)} · Final Impact Report`)
    .replace("90-Day Pilot Results at a Glance", "Final Impact Results at a Glance")
    .replace("90-Day Record-Clearing Access Pilot", "Partner Final Impact Report")
    .replace("90-Day Pilot Final Impact Report", "Partner Final Impact Report");

  return replaceUnresolvedTokens(
    replaceComplianceLanguage(
      replaceSectionBlocks(html, report, narrative)
    )
  );
}

function replaceSectionBlocks(html: string, report: FinalImpactReportData, narrative: FinalImpactReportNarrative) {
  return html
    .replace(/<div class="sb-hero">[\s\S]*?<\/div>\s*<\/div>\s*<div class="cv-content">/, `${renderHeroStats(report)}\n    </div>\n\n    <div class="cv-content">`)
    .replace(/<!-- EXECUTIVE SUMMARY -->[\s\S]*?<!-- PILOT TIMELINE -->/, `${renderExecutiveSummary(narrative)}\n\n        <!-- PILOT TIMELINE -->`)
    .replace(/<!-- WHAT WORKED -->[\s\S]*?<!-- COMPLIANCE -->/, `${renderKeyOutcomes(narrative)}\n\n        <!-- COMPLIANCE -->`)
    .replace(/<div class="comp">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div class="cv-R">/, `${renderComplianceNote()}\n      </div>\n\n      <div class="cv-R">`)
    .replace(/<!-- FULL FUNNEL -->[\s\S]*?<div class="div"><\/div>/, `${renderFunnel(report)}\n\n        <div class="div"></div>`)
    .replace(/<!-- ROUTING SUMMARY -->[\s\S]*?<\/table>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="cv-ft">/, `${renderRoutingSummary(report)}\n      </div>\n    </div>\n  </div>\n\n  <div class="cv-ft">`)
    .replace(/<!-- FULL METRICS TABLE -->[\s\S]*?<!-- OUTCOME DETAIL -->/, `${renderCompleteMetrics(report)}\n\n        <!-- OUTCOME DETAIL -->`)
    .replace(/<!-- OUTCOME DETAIL -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- RIGHT -->/, `${renderOutcomeDetail(report)}\n        </div>\n      </div>\n\n      <!-- RIGHT -->`)
    .replace(/<!-- DROP-OFF ANALYSIS -->[\s\S]*?<!-- PARTNER OUTREACH PERFORMANCE -->/, `${renderDropOffAnalysis(narrative)}\n\n        <!-- PARTNER OUTREACH PERFORMANCE -->`)
    .replace(/<!-- PARTNER OUTREACH PERFORMANCE -->[\s\S]*?<!-- FILING READINESS BREAKDOWN -->/, `${renderPartnerOutreach(report, narrative)}\n\n        <!-- FILING READINESS BREAKDOWN -->`)
    .replace(/<!-- FILING READINESS BREAKDOWN -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="pf">/, `${renderFilingReadiness(report)}\n      </div>\n    </div>\n  </div>\n\n  <div class="pf">`)
    .replace(/<!-- OPERATIONAL LESSONS -->[\s\S]*?<!-- RECOMMENDATIONS FOR WMV -->/, `${renderOperationalLessons(narrative)}\n\n        <!-- RECOMMENDATIONS FOR WMV -->`)
    .replace(/<!-- RECOMMENDATIONS FOR WMV -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- RIGHT COLUMN -->/, `${renderRecommendations(narrative)}\n      </div>\n\n      <!-- RIGHT COLUMN -->`)
    .replace(/<!-- EXPANSION OPTIONS -->[\s\S]*?<!-- SUGGESTED NARRATIVE -->/, `${renderExpansionOptions(narrative)}\n\n        <!-- SUGGESTED NARRATIVE -->`)
    .replace(/<!-- SUGGESTED NARRATIVE -->[\s\S]*?<!-- NEXT STEPS -->/, `${renderFunderNarrative(narrative)}\n\n        <!-- NEXT STEPS -->`)
    .replace(/<!-- NEXT STEPS -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="pf">/, `${renderNextSteps(narrative)}\n      </div>\n    </div>\n  </div>\n  <div class="pf">`);
}

function renderHeroStats(report: FinalImpactReportData) {
  return `<div class="sb-hero">
        ${report.heroMetrics.map((metric, index) => `<div class="sb-cell"><div class="sb-n${index === 1 || index === 2 ? " tl" : index >= 4 ? " or" : ""}">${fmt(metric.value)}</div><div class="sb-l">${escapeHtml(metric.label).replace(" ", "<br>")}</div></div>`).join("")}
      </div>`;
}

function renderExecutiveSummary(narrative: FinalImpactReportNarrative) {
  return `<div>
          <div class="ey">Executive Summary</div>
          ${narrative.executiveSummary.map((paragraph, index) => `<p class="bt"${index ? ` style="margin-top:7px;"` : ""}>${escapeHtml(paragraph)}</p>`).join("")}
        </div>`;
}

function renderKeyOutcomes(narrative: FinalImpactReportNarrative) {
  return `<div>
          <div class="sh"><span class="sh-t">Key Outcomes</span><div class="sh-line"></div></div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${narrative.keyOutcomes.map(renderInsight).join("")}
          </div>
        </div>`;
}

function renderComplianceNote() {
  return `<div class="comp">
          <div class="comp-h">Compliance Note</div>
          <div class="comp-t">All screening results in this report are operational indicators based on user-provided information. "Likely eligible" means a user's responses suggested they may be able to continue under the applicable workflow logic. It is not a legal determination, and LegalEase does not guarantee court approval, filing acceptance, expungement, sealing, record restriction, or legal outcomes.</div>
        </div>`;
}

function renderFunnel(report: FinalImpactReportData) {
  const max = report.funnel[0]?.count || 1;
  return `<div>
          <div class="sh"><span class="sh-t">Final Impact Funnel</span><div class="sh-line"></div></div>
          <div class="funnel-h">
            ${report.funnel.map((stage) => renderFunnelStage(stage, max)).join("")}
          </div>
          <div style="font-size:6pt;color:var(--muted);margin-top:5px;font-style:italic;">% shown relative to referrals; final column shows conversion from the prior stage where available.</div>
        </div>`;
}

function renderFunnelStage(stage: FinalImpactFunnelStage, max: number) {
  const width = Math.max(Math.round((stage.count / max) * 100), 8);
  return `<div class="frow">
              <div class="fbar-lbl">${escapeHtml(stage.label)}</div>
              <div class="fbar-wrap"><div class="fbar" style="width:${width}%;background:${colorValue(stage.color)};"><span class="fbar-v">${fmt(stage.count)}</span></div></div>
              <div class="fbar-pct">${stage.percentOfReferrals === null ? "—" : `${stage.percentOfReferrals}%`}</div>
            </div>`;
}

function renderRoutingSummary(report: FinalImpactReportData) {
  return `<div>
          <div class="sh"><span class="sh-t">Routing Outcomes</span><div class="sh-line"></div></div>
          ${renderTable(["Pathway", "Users", "% of Screened"], report.routingRows)}
        </div>`;
}

function renderCompleteMetrics(report: FinalImpactReportData) {
  return `<div>
          <div class="sh"><span class="sh-n">2.1</span><span class="sh-t">Complete Metrics</span><div class="sh-line"></div></div>
          ${renderTable(["Metric", "Count", "Conversion"], report.metricRows)}
        </div>`;
}

function renderOutcomeDetail(report: FinalImpactReportData) {
  return `<div>
          <div class="sh"><span class="sh-n">2.2</span><span class="sh-t">Outcomes — Where Available</span><div class="sh-line"></div></div>
          ${renderTable(["Outcome Status", "Count", "Status"], report.outcomeRows)}
          <div style="font-size:6.5pt;color:var(--muted);margin-top:5px;font-style:italic;">Outcome data is shown only where updates are available. Pending matters may still be awaiting external court or partner updates.</div>
        </div>`;
}

function renderDropOffAnalysis(narrative: FinalImpactReportNarrative) {
  return `<div>
          <div class="sh"><span class="sh-n">2.3</span><span class="sh-t">Drop-Off Analysis</span><div class="sh-line"></div></div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${narrative.dropOffInsights.map(renderInsight).join("")}
          </div>
        </div>`;
}

function renderPartnerOutreach(report: FinalImpactReportData, narrative: FinalImpactReportNarrative) {
  return `<div>
          <div class="sh"><span class="sh-n">2.4</span><span class="sh-t">Partner Contribution</span><div class="sh-line"></div></div>
          <div class="ic info"><div class="ic-dot"></div><div><div class="ic-t">Partner outreach created the measurable referral base</div><div class="ic-s">${escapeHtml(narrative.partnerContribution)}</div></div></div>
          <div style="margin-top:7px;">${renderTable(["Program", "Referrals", "% of Total"], report.outreachRows)}</div>
        </div>`;
}

function renderFilingReadiness(report: FinalImpactReportData) {
  return `<div>
          <div class="sh"><span class="sh-n">2.5</span><span class="sh-t">Filing Readiness Breakdown</span><div class="sh-line"></div></div>
          <div class="thr" style="gap:6px;">
            <div class="cd gr"><div class="cd-l">Packets Completed</div><div class="cd-v" style="font-size:18pt;">${fmt(report.metrics.packetReady)}</div><div class="cd-s">Ready for filing or review</div></div>
            <div class="cd or"><div class="cd-l">Missing Docs</div><div class="cd-v" style="font-size:18pt;">${fmt(report.metrics.missingDocuments)}</div><div class="cd-s">Need documentation</div></div>
            <div class="cd or"><div class="cd-l">Fee Barrier</div><div class="cd-v" style="font-size:18pt;">${fmt(report.metrics.filingFeeBarrier)}</div><div class="cd-s">Waiver or payment support may be needed</div></div>
          </div>
        </div>`;
}

function renderOperationalLessons(narrative: FinalImpactReportNarrative) {
  return `<div>
          <div class="sh"><span class="sh-n">3.1</span><span class="sh-t">Operational Lessons</span><div class="sh-line"></div></div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${narrative.programLessons.map(renderInsight).join("")}
          </div>
        </div>`;
}

function renderRecommendations(narrative: FinalImpactReportNarrative) {
  return `<div>
          <div class="sh"><span class="sh-n">3.2</span><span class="sh-t">Recommendations</span><div class="sh-line"></div></div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${narrative.recommendations.map((item, index) => renderNumberedItem(index + 1, item)).join("")}
          </div>
        </div>`;
}

function renderExpansionOptions(narrative: FinalImpactReportNarrative) {
  return `<div>
          <div class="sh"><span class="sh-n">4.1</span><span class="sh-t">Path Forward — Three Options</span><div class="sh-line"></div></div>
          <div style="display:flex;flex-direction:column;gap:7px;">
            ${narrative.expansionOptions.map((option, index) => renderExpansionOption(option, index)).join("")}
          </div>
        </div>`;
}

function renderFunderNarrative(narrative: FinalImpactReportNarrative) {
  return `<div>
          <div class="sh"><span class="sh-n">4.2</span><span class="sh-t">What Partners Can Now Say</span><div class="sh-line"></div></div>
          <div class="ob-box">
            <div style="font-size:5.5pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-bottom:6px;">To Funders, Leadership &amp; Public Partners</div>
            <div class="ob-box-t">"${escapeHtml(narrative.funderNarrative)}"</div>
          </div>
        </div>`;
}

function renderNextSteps(narrative: FinalImpactReportNarrative) {
  return `<div>
          <div class="sh"><span class="sh-n">4.3</span><span class="sh-t">Recommended Next Steps</span><div class="sh-line"></div></div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${narrative.nextSteps.map((item) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--gray-bg);border-radius:4px;border:1px solid var(--gray-line);">
              <div style="width:13px;height:13px;border:1.5px solid var(--gray-line);border-radius:2px;flex-shrink:0;"></div>
              <div style="font-size:7.5pt;color:var(--text);">${escapeHtml(item)}</div>
            </div>`).join("")}
          </div>
          <div style="margin-top:10px;background:var(--orange);border-radius:6px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:8pt;font-weight:800;color:var(--white);">Ready to plan the next phase?</div>
              <div style="font-size:7pt;color:rgba(255,255,255,0.8);margin-top:2px;">Use this report to align on the next reporting period.</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:7.5pt;font-weight:700;color:var(--white);">LegalEase</div>
              <div style="font-size:6.5pt;color:rgba(255,255,255,0.75);line-height:1.55;">Partner reporting<br>expungement.ai</div>
            </div>
          </div>
        </div>`;
}

function renderInsight(item: { title: string; detail: string; tone: "good" | "warn" | "info" }) {
  return `<div class="ic ${item.tone}"><div class="ic-dot"></div><div><div class="ic-t">${escapeHtml(item.title)}</div><div class="ic-s">${escapeHtml(item.detail)}</div></div></div>`;
}

function renderNumberedItem(index: number, text: string) {
  return `<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 10px;background:var(--gray-bg);border-radius:4px;border:1px solid var(--gray-line);">
              <div style="font-size:6pt;font-weight:800;color:var(--white);background:var(--navy);border-radius:2px;width:14px;height:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${index}</div>
              <div style="font-size:7.5pt;color:var(--text);line-height:1.4;">${escapeHtml(text)}</div>
            </div>`;
}

function renderExpansionOption(option: { label: string; title: string; detail: string; investment: string }, index: number) {
  const primary = index === 0;
  return `<div style="background:${primary ? "var(--navy)" : "var(--gray-bg)"};border:${primary ? "none" : "1px solid var(--gray-line)"};border-radius:7px;padding:13px 14px;">
              <div style="font-size:5.5pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${primary ? "var(--teal)" : "var(--orange)"};margin-bottom:5px;">${escapeHtml(option.label)}</div>
              <div style="font-size:8pt;font-weight:700;color:${primary ? "var(--white)" : "var(--navy)"};margin-bottom:4px;">${escapeHtml(option.title)}</div>
              <div style="font-size:7pt;color:${primary ? "rgba(255,255,255,0.65)" : "var(--muted)"};line-height:1.5;">${escapeHtml(option.detail)}</div>
              <div style="margin-top:6px;font-size:6.5pt;color:${primary ? "var(--teal)" : "var(--orange)"};font-weight:600;">${escapeHtml(option.investment)}</div>
            </div>`;
}

function renderTable(headers: [string, string, string], rows: FinalImpactTableRow[]) {
  return `<table class="tbl">
            <thead><tr><th>${escapeHtml(headers[0])}</th><th class="r">${escapeHtml(headers[1])}</th><th class="r">${escapeHtml(headers[2])}</th></tr></thead>
            <tbody>
              ${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td class="r tl">${fmt(row.count)}</td><td class="r mu">${escapeHtml(row.conversion)}</td></tr>`).join("")}
            </tbody>
          </table>`;
}

function replaceComplianceLanguage(html: string) {
  return html
    .replaceAll("Likely<br>Eligible", "Likely<br>Eligible")
    .replaceAll("Not eligible / future", "May not be ready right now")
    .replaceAll("% of eligible", "% of likely eligible")
    .replaceAll("identified as likely eligible", "received a likely eligible screening result")
    .replaceAll("eligibility language", "screening-result language")
    .replaceAll("who is eligible", "who may be likely eligible based on screening")
    .replaceAll("does not guarantee eligibility", "does not guarantee screening results")
    .replaceAll("Denied", "Not moved forward")
    .replaceAll("Petition denied", "No favorable update reported");
}

function replaceUnresolvedTokens(html: string) {
  return html.replace(/\[[^\]]+\]/g, "—");
}

function colorValue(color: FinalImpactFunnelStage["color"]) {
  const colors = {
    navy: "var(--navy)",
    navyMid: "var(--navy-mid)",
    teal: "var(--teal)",
    green: "var(--green)",
    amber: "var(--amber)",
    orange: "var(--orange)"
  };
  return colors[color];
}

function fmt(value: number) {
  return value.toLocaleString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
