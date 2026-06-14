export const recordClearingProduct = {
  productId: "record_clearing",
  displayName: "Record clearing",
  shadowEngineEnabled: true,
  liveEngineEnabled: false
} as const;

export function isTemplateAllowedForNewEngineFinalFiling(template: {
  templateGrade: string;
  templateLifecycle: string;
}, qaPassed: boolean): boolean {
  const allowedGrades = new Set([
    "official_pdf_unaltered",
    "authorized_computer_duplicate",
    "local_official_form",
    "legal_ops_custom_pleading"
  ]);
  return allowedGrades.has(template.templateGrade) && template.templateLifecycle === "verified_replacement" && qaPassed;
}

export function isTemplateAllowedForShadowVerification(template: {
  templateLifecycle: string;
}): boolean {
  return template.templateLifecycle === "replacement_candidate";
}
