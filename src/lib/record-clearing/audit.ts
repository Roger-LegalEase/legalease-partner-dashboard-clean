import type { AuditManifest, OfficialPdfTemplate, QaResult, ReliefTrack, RenderResult } from "./types";

export interface AuditManifestInput {
  packetId: string;
  jurisdictionCode: "NE";
  reliefTrack: ReliefTrack;
  workflowVersion: string;
  templates: OfficialPdfTemplate[];
  renderResults: RenderResult[];
  qaResult: QaResult;
  createdAt?: string;
}

export function buildAuditManifest(input: AuditManifestInput): AuditManifest {
  return {
    packetId: input.packetId,
    product: "record_clearing",
    jurisdictionCode: input.jurisdictionCode,
    reliefTrack: input.reliefTrack,
    workflowVersion: input.workflowVersion,
    formsUsed: input.templates.map((template) => ({
      formId: template.formId,
      formNumber: template.formNumber,
      officialName: template.officialName
    })),
    templateGrades: Object.fromEntries(input.templates.map((template) => [template.formId, template.templateGrade])),
    templateLifecycles: Object.fromEntries(input.templates.map((template) => [template.formId, template.templateLifecycle])),
    generationMethods: Object.fromEntries(input.renderResults.map((result, index) => [input.templates[index]?.formId ?? `form_${index}`, result.generationMethod])),
    blankSourceHashes: Object.fromEntries(input.templates.map((template) => [template.formId, template.blankSourceHash])),
    outputHashes: Object.fromEntries(input.renderResults.map((result, index) => [input.templates[index]?.formId ?? `form_${index}`, result.outputHash])),
    qaResult: input.qaResult,
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}
