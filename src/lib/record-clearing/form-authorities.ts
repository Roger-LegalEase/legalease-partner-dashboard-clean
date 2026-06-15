import type { OfficialPdfTemplate } from "./types";

export const nebraskaOfficialPdfTemplates: OfficialPdfTemplate[] = [
  {
    jurisdictionCode: "NE",
    formId: "ne_cc_6_11_petition_set_aside_conviction",
    formNumber: "CC 6:11",
    officialName: "Petition to Set Aside Criminal Conviction",
    sourceUrl: null,
    revisionDate: null,
    sourceFolderName: "LegalEase Nebraska",
    relativePath: "LegalEase Nebraska/CC-6-11.pdf",
    sourceHash: "c0dcc5c093790f0a54199ab6769876d1c124485cea5de08fb8fc783e9f6a5492",
    blankSourceHash: "c0dcc5c093790f0a54199ab6769876d1c124485cea5de08fb8fc783e9f6a5492",
    pdfClassification: "acroform_dirty",
    recommendedMappingMode: "hybrid",
    templateGrade: "official_pdf_unaltered",
    templateLifecycle: "shadow_only",
    productionReady: false,
    legalOpsApprovalStatus: "pending",
    fieldMapStatus: "visual_review_required",
    reliefTracks: ["adult_set_aside_conviction"],
    courtFacingTitle: "Petition to Set Aside Criminal Conviction"
  },
  {
    jurisdictionCode: "NE",
    formId: "ne_cc_6_11_2_order_set_aside_conviction",
    formNumber: "CC 6:11.2",
    officialName: "Order Setting Aside a Criminal Conviction",
    sourceUrl: null,
    revisionDate: null,
    sourceFolderName: "LegalEase Nebraska",
    relativePath: "LegalEase Nebraska/CC-6-11-2.pdf",
    sourceHash: "8bfa884d66c2d485fc28acfae865075bdb02ae7d6b7a3de839c0248464e767b6",
    blankSourceHash: "8bfa884d66c2d485fc28acfae865075bdb02ae7d6b7a3de839c0248464e767b6",
    pdfClassification: "acroform_dirty",
    recommendedMappingMode: "hybrid",
    templateGrade: "official_pdf_unaltered",
    templateLifecycle: "shadow_only",
    productionReady: false,
    legalOpsApprovalStatus: "pending",
    fieldMapStatus: "draft",
    reliefTracks: ["adult_set_aside_conviction"],
    courtFacingTitle: "Order Setting Aside a Criminal Conviction"
  },
  {
    jurisdictionCode: "NE",
    formId: "ne_cc_6_12_motion_seal_adult_record",
    formNumber: "CC 6:12",
    officialName: "Motion to Seal an Adult Criminal Record",
    sourceUrl: null,
    revisionDate: null,
    sourceFolderName: "LegalEase Nebraska",
    relativePath: "LegalEase Nebraska/CC-6-12.pdf",
    sourceHash: "68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28",
    blankSourceHash: "68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28",
    pdfClassification: "acroform_dirty",
    recommendedMappingMode: "hybrid",
    templateGrade: "official_pdf_unaltered",
    templateLifecycle: "shadow_only",
    productionReady: false,
    legalOpsApprovalStatus: "pending",
    fieldMapStatus: "draft",
    reliefTracks: ["adult_record_sealing"],
    courtFacingTitle: "Motion to Seal an Adult Criminal Record"
  }
];

export function getNebraskaTemplateByFormId(formId: string): OfficialPdfTemplate {
  const template = nebraskaOfficialPdfTemplates.find((item) => item.formId === formId);
  if (!template) throw new Error(`Unknown Nebraska official PDF template: ${formId}`);
  return template;
}
