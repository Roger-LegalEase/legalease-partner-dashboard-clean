import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { userFacingWorkflowGaps } from "@/lib/rcap/documents/filing-next-steps";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/mississippi/types";

export type RcapPacketPdfType = "full" | "court";

export function renderRcapPacketPdfHtml(packet: RcapDocumentPacket, pdfType: RcapPacketPdfType) {
  const courtPacket = renderCourtTemplatePacketHtml(packet);
  return pdfType === "court" ? courtPacket : renderFullPacketHtml(packet, courtPacket);
}

export async function renderRcapPacketPdf(packet: RcapDocumentPacket, pdfType: RcapPacketPdfType): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(renderRcapPacketPdfHtml(packet, pdfType), { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" }
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export function rcapPacketPdfFilename(packet: RcapDocumentPacket, pdfType: RcapPacketPdfType) {
  return `${safeFilename([jurisdictionFor(packet), packet.pathway, pdfType, "packet"].filter(Boolean).join(" "))}.pdf`;
}

function renderFullPacketHtml(packet: RcapDocumentPacket, courtPacketHtml: string) {
  const next = packet.filingNextStepsPacket;
  const confirmItems = next.workflowGaps.length > 0 ? userFacingWorkflowGaps(next.title, next.workflowGaps) : ["No unresolved filing details were identified from the preserved workflow instructions."];
  const fullPages = `
    <section class="le-cover">
      <div class="le-brand"><span class="le-mark">LE</span><span>LegalEase</span></div>
      <p class="le-kicker">Full LegalEase Packet PDF</p>
      <h1>${escapeHtml(jurisdictionFor(packet))} Record Relief Packet</h1>
      <p class="le-subtitle">${escapeHtml(String(packet.pathway).replaceAll("_", " "))}</p>
      <div class="le-grid">
        <div><span>Prepared for</span><strong>${escapeHtml(preparedFor(packet))}</strong></div>
        <div><span>Prepared date</span><strong>${escapeHtml(new Date().toLocaleDateString("en-US"))}</strong></div>
        <div><span>Jurisdiction</span><strong>${escapeHtml(jurisdictionFor(packet))}</strong></div>
        <div><span>Packet type</span><strong>Guided self-help preparation aid</strong></div>
      </div>
      <p class="le-note">Prepared by LegalEase as a guided self-help packet preview. This is not legal advice.</p>
    </section>
    <section class="le-panel">
      <h2>Packet summary</h2>
      <p>This full packet includes draft filing materials, source-template court-facing pages, filing next steps, fee notes, confirm-before-filing items, and the workflow safety disclaimer.</p>
      <p>The court-facing filing pages begin after the LegalEase guidance pages and are formatted from the uploaded jurisdiction-specific template.</p>
    </section>
    <section class="le-panel"><h2>Filing Next Steps</h2><pre>${escapeHtml(next.plainText)}</pre></section>
    <section class="le-panel"><h2>Fee Summary</h2>${list(next.feeSummary)}</section>
    <section class="le-panel"><h2>Confirm Before Filing</h2>${list(confirmItems, "le-confirm")}</section>
    <section class="le-panel"><h2>Safety Disclaimer</h2><p class="le-disclaimer">${escapeHtml(next.safetyDisclaimer)}</p></section>
  `;
  return injectAfterBodyOpen(courtPacketHtml, fullPacketStyles() + fullPages);
}

function renderCourtTemplatePacketHtml(packet: RcapDocumentPacket) {
  const sourceHtml = readTemplate(templatePathFor(packet));
  const htmlWithMode = setTemplateMode(sourceHtml, packet);
  const populated = injectTemplatePopulationScript(htmlWithMode, packet);
  return injectBeforeBodyClose(populated, `<div class="rcap-attachment-checklist"><h2>Required Attachments Checklist</h2>${list(packet.filingNextStepsPacket.requiredDocuments)}</div>`);
}

function templatePathFor(packet: RcapDocumentPacket) {
  if (packet.state === "TX") return "reference/texas-harris/tx-harris-expunction-nondisclosure-forms.html";
  if (packet.state === "PA") return "reference/pennsylvania/pa-petition-expungement-790.html";
  if (packet.state === "DC") return "reference/dc/dc-motion-to-seal-expunge.html";
  if (packet.state === "IL") return "reference/illinois/il-expungement-companion-forms.html";
  return "reference/mississippi/ms-expungement-petitions.html";
}

function setTemplateMode(html: string, packet: RcapDocumentPacket) {
  if (packet.state === "TX") {
    return html.replace(/<body[^>]*>/i, `<body data-tool="${String(packet.pathway).startsWith("nondisclosure_") ? "nondisclosure" : "expunction"}">`);
  }
  if (packet.state === "DC") {
    return html.replace(/<body[^>]*>/i, `<body data-type="${String(packet.pathway).includes("expungement") ? "expunge" : "seal"}">`);
  }
  if (packet.state === "MS") {
    const type = packet.pathway === "felony_conviction" ? "felony" : packet.pathway === "misdemeanor_conviction" ? "misd" : "dismissed";
    return html.replace(/<body[^>]*>/i, `<body data-type="${type}">`);
  }
  if (packet.state === "IL") {
    return injectBeforeHeadClose(html, "<style>@media print{.form{display:block!important}.form:not(.show){display:block!important}.picker{display:none!important}}</style>");
  }
  return html;
}

function injectTemplatePopulationScript(html: string, packet: RcapDocumentPacket) {
  const values = templateValues(packet);
  const script = `<script data-rcap-template-populator>
    (function(){
      const values = ${JSON.stringify(values)};
      for (const [key, value] of Object.entries(values)) {
        document.querySelectorAll('#' + CSS.escape(key) + ', .' + CSS.escape(key)).forEach((el) => {
          if ('value' in el) el.value = value;
          else el.textContent = value;
        });
      }
      document.querySelectorAll('.controls,.picker').forEach((el) => el.remove());
      document.querySelectorAll('input, textarea').forEach((el) => {
        if (el.value) el.setAttribute('value', el.value);
        if (el.tagName === 'TEXTAREA') el.textContent = el.value || el.textContent;
      });
    })();
  </script>`;
  return injectBeforeBodyClose(html, script);
}

function templateValues(packet: RcapDocumentPacket): Record<string, string> {
  const name = preparedFor(packet);
  const county = packet.county ?? "";
  const charge = packet.charge ?? "";
  const arrestDate = packet.arrestDate ?? "";
  const agency = packet.arrestingAgency ?? "";
  const caseNumber = packet.causeNumber ?? packet.agencyCaseNumber ?? "";
  if (packet.state === "TX") {
    return { pname: name, pname2: name, pname2nd: name, f_name: name, s_name: name, v_name: name, o_name: name, causeno: caseNumber, court_no: caseNumber, o_no: caseNumber, f_arrdate: arrestDate, f_agency: agency, f_offense: charge, f_chargeno: packet.agencyCaseNumber ?? "", s_addr: "", f_addr: "", o_court: "DISTRICT COURT" };
  }
  if (packet.state === "DC") {
    return { name1: name, name2: name, name2e: name, name3: name, name4: name, movname: name, caseno: caseNumber, caseno2: caseNumber, caseno3: caseNumber, offense: charge, offdate: packet.offenseDate ?? arrestDate, agency, disp: "See attached record", dispE: "See attached record", argument: packet.generatedPlainText };
  }
  if (packet.state === "PA") {
    return { county, defname: name, fullname: name, docketnum: caseNumber, otn: packet.agencyCaseNumber ?? "", agency, arrdate: arrestDate, compdate: packet.offenseDate ?? "", judge: packet.courtName ?? "", charge, reasons: packet.generatedPlainText, sig: name };
  }
  if (packet.state === "IL") {
    return { "cm-county": county, "cm-name": name, "cm-newcase": caseNumber };
  }
  return { county1: county, county2: county, cause: caseNumber, name1: name, name2: name, name4: name, name5: name, name6: name, name7: name, charge, charge2: charge, arrdate: arrestDate, arrdate2: arrestDate, arrdate3: arrestDate, agency, agency2: agency, agencyno: packet.agencyCaseNumber ?? "", agencyno2: packet.agencyCaseNumber ?? "", dispdate: packet.dispositionDate ?? "", dispdate2: packet.dispositionDate ?? "" };
}

function readTemplate(relativePath: string) {
  return fs.readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), relativePath), "utf8");
}

function injectAfterBodyOpen(html: string, content: string) {
  return html.replace(/(<body[^>]*>)/i, `$1${content}`);
}

function injectBeforeBodyClose(html: string, content: string) {
  return html.includes("</body>") ? html.replace("</body>", `${content}</body>`) : `${html}${content}`;
}

function injectBeforeHeadClose(html: string, content: string) {
  return html.includes("</head>") ? html.replace("</head>", `${content}</head>`) : `${content}${html}`;
}

function fullPacketStyles() {
  return `<style>
    .le-cover,.le-panel{max-width:820px;margin:0 auto 18px;background:#fff;border:1px solid #d9e2ec;border-radius:8px;padding:28px;box-shadow:0 10px 26px rgba(16,42,67,.08);font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#17202a;page-break-after:always}
    .le-brand{display:flex;align-items:center;gap:10px;color:#102a43;font-weight:800}.le-mark{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:8px;background:#102a43;color:#fff}
    .le-kicker{margin:28px 0 8px;color:#0f766e;text-transform:uppercase;letter-spacing:.08em;font-size:9pt;font-weight:800}.le-cover h1{font-size:28pt;line-height:1.08;margin:0;color:#102a43}.le-subtitle{font-size:13pt;color:#5b6876}
    .le-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:18px}.le-grid div{border:1px solid #d9e2ec;border-radius:8px;padding:12px;background:#fbfdff}.le-grid span{display:block;color:#5b6876;font-size:8pt;text-transform:uppercase;letter-spacing:.06em;font-weight:800}.le-grid strong{display:block;margin-top:4px;color:#102a43}
    .le-note,.le-disclaimer{border-left:4px solid #0f766e;background:#f0fdfa;padding:12px;border-radius:6px}.le-panel h2{font-size:16pt;margin:0 0 12px;color:#102a43}.le-panel pre{white-space:pre-wrap;background:#f8fafc;border:1px solid #d9e2ec;border-radius:8px;padding:16px;font-family:Georgia,"Times New Roman",serif;font-size:10.5pt;line-height:1.55}.le-confirm{border-left:4px solid #d97706;background:#fffaf0;padding:12px;border-radius:6px}
    .rcap-attachment-checklist{max-width:820px;margin:0 auto 18px;background:#fff;border:1px solid #111;padding:18px;font-family:Georgia,"Times New Roman",serif;page-break-before:always}
  </style>`;
}

function list(items: string[], className = "") {
  return `<ul${className ? ` class="${className}"` : ""}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function jurisdictionFor(packet: RcapDocumentPacket) {
  if (packet.state === "TX") return "Harris County, Texas";
  if (packet.state === "PA") return "Pennsylvania";
  if (packet.state === "DC") return "District of Columbia";
  if (packet.state === "IL") return "Illinois";
  return "Mississippi";
}

function preparedFor(packet: RcapDocumentPacket) {
  return [packet.petitionerFirstName, packet.petitionerLastName].filter(Boolean).join(" ").trim() || "User";
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "legalease-packet";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
