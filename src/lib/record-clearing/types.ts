export type JurisdictionCode = "NE" | "PA" | "DC";

export type ReliefTrack = "adult_set_aside_conviction" | "adult_record_sealing";

export type TemplateGrade =
  | "official_pdf_unaltered"
  | "authorized_computer_duplicate"
  | "local_official_form"
  | "legal_ops_custom_pleading"
  | "html_replica_or_unverified";

export type TemplateLifecycle =
  | "legacy_live"
  | "shadow_only"
  | "preview_only"
  | "replacement_candidate"
  | "verified_replacement"
  | "retired";

export type PdfClassification =
  | "acroform_clean"
  | "acroform_dirty"
  | "xfa_pdf"
  | "flat_pdf"
  | "scanned_pdf"
  | "encrypted_or_locked"
  | "unreadable"
  | "unknown"
  | "manual_review";

export type MappingMode = "acroform" | "overlay" | "hybrid" | "manual_review";

export type LegalOpsApprovalStatus = "pending" | "approved" | "rejected";

export type FieldMapStatus = "draft" | "visual_review_required" | "complete" | "verified";

export type RenderPurpose = "shadow_verification" | "final_filing";

export interface OfficialPdfTemplate {
  jurisdictionCode: JurisdictionCode;
  formId: string;
  formNumber: string;
  officialName: string;
  sourceUrl: string | null;
  revisionDate: string | null;
  sourceFolderName: string;
  relativePath: string;
  sourceHash: string;
  blankSourceHash: string;
  pdfClassification: PdfClassification;
  recommendedMappingMode: MappingMode;
  templateGrade: TemplateGrade;
  templateLifecycle: TemplateLifecycle;
  productionReady: boolean;
  legalOpsApprovalStatus: LegalOpsApprovalStatus;
  fieldMapStatus: FieldMapStatus;
  reliefTracks: ReliefTrack[];
  courtFacingTitle: string;
}

export interface OverlayInstruction {
  page: number;
  x: number;
  y: number;
  textKey: string;
  fontSize?: number;
  label?: string;
}

export interface FieldMap {
  formId: string;
  mappingMode: MappingMode;
  fields?: Record<string, string>;
  overlays?: OverlayInstruction[];
}

export interface PacketPlanForm {
  formId: string;
  role: "petition" | "proposed_order" | "motion";
  required: boolean;
}

export interface PacketPlan {
  jurisdictionCode: JurisdictionCode;
  reliefTrack: ReliefTrack;
  title: string;
  primaryReliefTerm: string;
  requiredForms: PacketPlanForm[];
  requiredAttachments: string[];
  signatureRequirements: string[];
  filingInstructions: string[];
  warnings: string[];
}

export interface QaResult {
  passed: boolean;
  failures: string[];
  warnings: string[];
}

export interface RenderInput {
  template: OfficialPdfTemplate;
  fieldMap: FieldMap;
  sourcePdfPath: string;
  outputDirectory: string;
  outputFileName?: string;
  purpose: RenderPurpose;
  shadowMode: boolean;
  sampleData: Record<string, string>;
}

export interface RenderResult {
  rendered: boolean;
  status: "shadow_rendered" | "blocked" | "field_mapping_needed";
  generationMethod: MappingMode;
  outputPath: string | null;
  blankSourceHash: string;
  outputHash: string | null;
  warnings: string[];
  errors: string[];
}

export interface AuditManifest {
  packetId: string;
  product: "record_clearing";
  jurisdictionCode: JurisdictionCode;
  reliefTrack: ReliefTrack;
  workflowVersion: string;
  formsUsed: Array<{
    formId: string;
    formNumber: string;
    officialName: string;
  }>;
  templateGrades: Record<string, TemplateGrade>;
  templateLifecycles: Record<string, TemplateLifecycle>;
  generationMethods: Record<string, MappingMode>;
  blankSourceHashes: Record<string, string>;
  outputHashes: Record<string, string | null>;
  qaResult: QaResult;
  createdAt: string;
}
