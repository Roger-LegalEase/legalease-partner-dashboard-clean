import { isFieldMapComplete } from "./field-maps";
import { getJurisdictionConfig } from "./jurisdictions";
import type { FieldMap, OfficialPdfTemplate, PacketPlan, QaResult, RenderPurpose, RenderResult } from "./types";

export interface QaInput {
  packetPlan: PacketPlan;
  templates: OfficialPdfTemplate[];
  fieldMaps: FieldMap[];
  renderResults: RenderResult[];
  purpose: RenderPurpose;
  shadowMode: boolean;
  outputTextSamples: string[];
}

export function runRecordClearingQa(input: QaInput): QaResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const jurisdiction = getJurisdictionConfig(input.packetPlan.jurisdictionCode);
  const textToCheck = [
    input.packetPlan.title,
    input.packetPlan.primaryReliefTerm,
    ...input.templates.map((template) => `${template.formNumber} ${template.officialName} ${template.courtFacingTitle}`),
    ...input.outputTextSamples
  ].join(" ");

  const prohibitedTerms = jurisdiction.vocabulary[input.packetPlan.reliefTrack].prohibitedTerms;
  if (containsAnyTerm(textToCheck, prohibitedTerms)) {
    failures.push("Nebraska set-aside/sealing court-facing output must not use generic expungement terminology.");
  }

  const formIds = new Set(input.templates.map((template) => template.formId));
  if (formIds.has("ne_cc_6_11_petition_set_aside_conviction") && formIds.has("ne_cc_6_12_motion_seal_adult_record")) {
    failures.push("Nebraska CC 6:11 set-aside and CC 6:12 sealing cannot be collapsed into one generic workflow.");
  }

  for (const template of input.templates) {
    if (!template.blankSourceHash || template.blankSourceHash !== template.sourceHash) failures.push(`${template.formId} is missing a blank source hash.`);
    if (template.templateGrade === "html_replica_or_unverified") failures.push(`${template.formId} uses blocked Grade E template material.`);
    if (template.templateLifecycle === "verified_replacement") failures.push(`${template.formId} must not be marked verified_replacement in shadow mode.`);
    if (template.pdfClassification === "xfa_pdf") failures.push(`${template.formId} is XFA and must be blocked.`);
    if (template.pdfClassification === "encrypted_or_locked") failures.push(`${template.formId} is encrypted/locked and must be blocked.`);
    if (template.pdfClassification === "scanned_pdf") failures.push(`${template.formId} is scanned and must be blocked from auto-generation.`);
  }

  for (const fieldMap of input.fieldMaps) {
    if (!fieldMap) failures.push("Field map is missing.");
    if (fieldMap && !isFieldMapComplete(fieldMap)) warnings.push(`${fieldMap.formId} field map is draft and requires human visual mapping.`);
  }

  if (!input.shadowMode) failures.push("New official PDF output must run in shadow mode only for this vertical slice.");
  if (input.purpose === "final_filing") failures.push("Final filing output is not allowed for Nebraska replacement candidates.");

  for (const renderResult of input.renderResults) {
    if (renderResult.outputHash && renderResult.outputHash === renderResult.blankSourceHash && renderResult.status === "shadow_rendered") {
      warnings.push("Output hash matches blank source hash; no field values or overlays were applied.");
    }
  }

  if (/LegalEase|RCAP|Expungement\.ai/i.test(input.outputTextSamples.join(" "))) {
    failures.push("Court form pages must not include product branding.");
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings
  };
}

function containsAnyTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
