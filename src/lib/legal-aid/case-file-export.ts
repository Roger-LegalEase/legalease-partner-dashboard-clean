import "server-only";

import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { LEGAL_AID_BUCKET, buildLegalAidObjectPath } from "./documents";
import { INTAKE_FIELDS, INTAKE_SECTIONS, INTAKE_STATEMENTS, type IntakeAnswers } from "./intake-schema";
import { getStaffIntakeDetail, intakePermissionsFor, revealSsn } from "./intake-service";
import { requireLegalAidDatabase } from "./registration-service";
import { maskSsn } from "./restricted-fields";

// The MVLP case file: the restricted application, its decisions, signatures,
// documents and execution status, as one JSON record and one PDF. It is not
// the court packet and not the participant's instructions. The SSN is masked
// unless the exporting attorney or coordinator explicitly asks for it, which
// is a separate audited reveal.

type CaseFileDocument = {
  schemaVersion: "mvlp-case-file/v1";
  exportedAt: string;
  intakeId: string;
  externalCaseReference: string | null;
  partnerSlug: string;
  policyProfileId: string;
  intakeSchemaVersion: string;
  status: string;
  programDecision: string | null;
  attorneyReviewStatus: string;
  registration: unknown;
  applicant: { name: string; ssn: string };
  answers: { section: string; key: string; label: string; state: string; value: string | null }[];
  signatures: unknown[];
  decisions: unknown[];
  informationRequests: unknown[];
  documents: unknown[];
  documentTasks: unknown[];
  nextSteps: unknown[];
  eligibilitySummary: unknown;
  includesRestricted: boolean;
};

export async function exportCaseFile(input: { intakeId: string; actorUserId: string; includeRestricted: boolean; recipientNote: string | null }): Promise<{ exportId: string; version: number }> {
  const permissions = await intakePermissionsFor(input.intakeId, input.actorUserId);
  if (!permissions.includes("export")) throw new ClinicServiceError("forbidden", "You are not assigned to export case files.");
  if (input.includeRestricted && !permissions.includes("attorney") && !permissions.includes("coordinator")) {
    throw new ClinicServiceError("forbidden", "Only the assigned attorney or coordinator can export the protected value.");
  }
  const detail = await getStaffIntakeDetail(input.intakeId, input.actorUserId);
  const ssn = input.includeRestricted && detail.ssnHint ? await revealSsn(input.intakeId, input.actorUserId, "Case-file export to MVLP's approved destination") : maskSsn(detail.ssnHint);
  const answers = flattenAnswers(detail.answers);
  const record: CaseFileDocument = {
    schemaVersion: "mvlp-case-file/v1",
    exportedAt: new Date().toISOString(),
    intakeId: detail.id,
    externalCaseReference: detail.externalCaseReference,
    partnerSlug: detail.partnerSlug,
    policyProfileId: detail.policyProfileId,
    intakeSchemaVersion: detail.intakeSchemaVersion,
    status: detail.status,
    programDecision: detail.programDecision,
    attorneyReviewStatus: detail.attorneyReviewStatus,
    registration: detail.registration,
    applicant: { name: detail.registration?.contactName ?? "Registered applicant", ssn },
    answers,
    signatures: detail.signatures.map(({ statementKey, statementVersion, answersVersion, answersHash, signerName, signatureMethod, signedAt, status }) => ({
      statementKey, statementVersion, statementText: INTAKE_STATEMENTS.find((statement) => statement.key === statementKey)?.text ?? null, answersVersion, answersHash, signerName, signatureMethod, signedAt, status
    })),
    decisions: detail.decisions,
    informationRequests: detail.allRequests,
    documents: detail.documents,
    documentTasks: detail.documentTasks,
    nextSteps: detail.nextSteps,
    eligibilitySummary: detail.eligibility,
    includesRestricted: input.includeRestricted
  };
  const pdf = await renderCaseFilePdf(record);
  const json = Buffer.from(JSON.stringify(record, null, 2), "utf8");
  const client = getSupabaseAdminClient();
  if (!client) throw new ClinicServiceError("unavailable", "Export storage is not configured.");
  const storage = client.storage.from(LEGAL_AID_BUCKET);
  const pdfPath = buildLegalAidObjectPath(input.intakeId, "exports", "pdf");
  const jsonPath = pdfPath.replace(/\.pdf$/, ".json");
  const [pdfUpload, jsonUpload] = await Promise.all([
    storage.upload(pdfPath, pdf, { contentType: "application/pdf", cacheControl: "0", upsert: false }),
    storage.upload(jsonPath, json, { contentType: "application/json", cacheControl: "0", upsert: false })
  ]);
  if (pdfUpload.error || jsonUpload.error) throw new ClinicServiceError("unavailable", "The case file could not be stored.");
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_record_export", {
    p_intake_id: input.intakeId, p_actor_user_id: input.actorUserId, p_sha256: createHash("sha256").update(pdf).digest("hex"),
    p_storage_path: pdfPath, p_includes_restricted: input.includeRestricted, p_recipient_note: input.recipientNote
  });
  if (result.error) {
    await storage.remove([pdfPath, jsonPath]).catch(() => null);
    if (result.error.message?.includes("forbidden")) throw new ClinicServiceError("forbidden", "You are not assigned to export case files.");
    throw new ClinicServiceError("unavailable", "The export could not be recorded.");
  }
  const exportRow = await db.from("legal_aid_case_exports").select("export_version").eq("id", String(result.data)).maybeSingle();
  return { exportId: String(result.data), version: Number(exportRow.data?.export_version ?? 0) };
}

export async function openCaseFileExport(exportId: string, actorUserId: string, format: "pdf" | "json"): Promise<{ bytes: Uint8Array; filename: string; contentType: string }> {
  const db = requireLegalAidDatabase();
  const row = await db.from("legal_aid_case_exports").select("*").eq("id", exportId).maybeSingle();
  if (row.error) throw new ClinicServiceError("unavailable", "The export is temporarily unavailable.");
  if (!row.data) throw new ClinicServiceError("not_found", "Export was not found.");
  const intakeId = String(row.data.intake_id);
  const permissions = await intakePermissionsFor(intakeId, actorUserId);
  if (!permissions.includes("export")) throw new ClinicServiceError("forbidden", "You are not assigned to export case files.");
  if (row.data.includes_restricted && !permissions.includes("attorney") && !permissions.includes("coordinator")) throw new ClinicServiceError("forbidden", "This export includes the protected value.");
  const client = getSupabaseAdminClient();
  if (!client) throw new ClinicServiceError("unavailable", "Export storage is not configured.");
  const pdfPath = String(row.data.storage_path);
  const objectPath = format === "pdf" ? pdfPath : pdfPath.replace(/\.pdf$/, ".json");
  const downloaded = await client.storage.from(LEGAL_AID_BUCKET).download(objectPath);
  if (downloaded.error || !downloaded.data) throw new ClinicServiceError("unavailable", "The export could not be read.");
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  if (format === "pdf" && createHash("sha256").update(bytes).digest("hex") !== String(row.data.sha256)) throw new ClinicServiceError("unavailable", "The export failed its integrity check.");
  await db.rpc("legal_aid_record_access", { p_intake_id: intakeId, p_actor_user_id: actorUserId, p_action: "export_downloaded", p_metadata: { export_id: exportId, format } });
  return { bytes, filename: `mvlp-case-file-v${row.data.export_version}.${format}`, contentType: format === "pdf" ? "application/pdf" : "application/json" };
}

function flattenAnswers(answers: IntakeAnswers) {
  return INTAKE_FIELDS.filter((field) => field.control !== "restricted_ssn" && field.product.requirement !== "derived").map((field) => {
    const answer = answers[field.key];
    return {
      section: INTAKE_SECTIONS.find((section) => section.key === field.section)?.title ?? field.section,
      key: field.key,
      label: field.label,
      state: answer ? answer.state : "unanswered",
      value: answer?.state === "answered" ? (Array.isArray(answer.value) ? answer.value.join(", ") : answer.value ?? null) : null
    };
  });
}

const PAGE = { width: 612, height: 792, margin: 54 };

async function renderCaseFilePdf(record: CaseFileDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;
  const line = (text: string, options: { size?: number; font?: typeof font; color?: [number, number, number] } = {}) => {
    const size = options.size ?? 10;
    const used = options.font ?? font;
    const wrapped = wrap(sanitize(text), used, size, PAGE.width - PAGE.margin * 2);
    for (const segment of wrapped) {
      if (y < PAGE.margin + size) { page = pdf.addPage([PAGE.width, PAGE.height]); y = PAGE.height - PAGE.margin; }
      page.drawText(segment, { x: PAGE.margin, y, size, font: used, color: rgb(...(options.color ?? [0.1, 0.1, 0.15])) });
      y -= size + 4;
    }
  };
  const heading = (text: string) => { y -= 8; line(text, { size: 13, font: bold, color: [0.43, 0.22, 0.56] }); y -= 2; };

  line("Mississippi Volunteer Lawyers Project — Case file", { size: 16, font: bold, color: [0.43, 0.22, 0.56] });
  line(`Exported ${record.exportedAt} · Application ${record.intakeId}${record.externalCaseReference ? ` · MVLP reference ${record.externalCaseReference}` : ""}`, { size: 9, color: [0.4, 0.4, 0.45] });
  line("Restricted MVLP case file. Not the court packet and not the participant's instructions.", { size: 9, color: [0.4, 0.4, 0.45] });
  heading("Applicant");
  line(`Name: ${record.applicant.name}`);
  line(`Social Security number: ${record.applicant.ssn}${record.includesRestricted ? " (included at the exporter's request; audited)" : " (masked)"}`);
  line(`Application status: ${record.status} · Program decision: ${record.programDecision ?? "none recorded"} · Attorney review: ${record.attorneyReviewStatus}`);
  let currentSection = "";
  heading("Application answers");
  for (const answer of record.answers) {
    if (answer.section !== currentSection) { currentSection = answer.section; y -= 4; line(currentSection, { font: bold, size: 10.5 }); }
    const shown = answer.state === "answered" ? (answer.value ?? "") : answer.state === "unknown" ? "I don't know" : answer.state === "not_applicable" ? "Not applicable" : "— unanswered —";
    line(`${answer.label}: ${shown}`);
  }
  heading("Signatures");
  for (const signature of record.signatures as { statementKey: string; statementText: string | null; signerName: string; signatureMethod: string; signedAt: string; status: string; answersVersion: number }[]) {
    line(`${signature.statementKey} (${signature.status}, answers v${signature.answersVersion}) — signed ${signature.signedAt} by ${signature.signerName} (${signature.signatureMethod})`);
    if (signature.statementText) line(`"${signature.statementText}"`, { size: 9, color: [0.35, 0.35, 0.4] });
  }
  heading("Decisions");
  const decisions = record.decisions as { decisionType: string; outcome: string; rationale: string; policyBasis: string | null; reviewerPermission: string; decidedAt: string }[];
  if (decisions.length === 0) line("No decisions recorded.");
  for (const decision of decisions) line(`${decision.decidedAt} · ${decision.decisionType} → ${decision.outcome} (${decision.reviewerPermission}${decision.policyBasis ? `, ${decision.policyBasis}` : ""}): ${decision.rationale}`);
  heading("Information requests");
  const requests = record.informationRequests as { createdAt: string; status: string; requestText: string }[];
  if (requests.length === 0) line("None.");
  for (const request of requests) line(`${request.createdAt} · ${request.status}: ${request.requestText}`);
  heading("Documents");
  const documents = record.documents as { category: string; originalFilename: string; uploadedRole: string; createdAt: string }[];
  if (documents.length === 0) line("None.");
  for (const document of documents) line(`${document.category} · ${document.originalFilename} (${document.uploadedRole}, ${document.createdAt})`);
  heading("Document execution");
  const tasks = record.documentTasks as { title: string; status: string; requiredSigner: string; executionMethod: string; filedAt: string | null }[];
  if (tasks.length === 0) line("No document tasks.");
  for (const task of tasks) line(`${task.title}: ${task.status} · signer ${task.requiredSigner} · ${task.executionMethod}${task.filedAt ? ` · filed ${task.filedAt}` : ""}`);
  heading("Next steps");
  const steps = record.nextSteps as { title: string; status: string; dueAt: string | null; detail: string | null }[];
  if (steps.length === 0) line("None.");
  for (const step of steps) line(`${step.title} (${step.status}${step.dueAt ? `, due ${step.dueAt}` : ""})${step.detail ? `: ${step.detail}` : ""}`);
  return pdf.save();
}

function sanitize(text: string): string {
  return text.replace(/[^\x20-\x7E -ÿ—·→"]/g, "?");
}

function wrap(text: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) { current = candidate; continue; }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
