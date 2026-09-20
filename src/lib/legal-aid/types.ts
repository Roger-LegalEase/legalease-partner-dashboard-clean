import type { IntakeAnswers } from "./intake-schema";

export const LEGAL_AID_STAFF_PERMISSIONS = [
  "coordinator", "intake_review", "program_review", "attorney", "notary", "follow_up", "reporting", "export"
] as const;
export type LegalAidStaffPermission = (typeof LEGAL_AID_STAFF_PERMISSIONS)[number];

export const LEGAL_AID_PERMISSION_LABELS: Record<LegalAidStaffPermission, { title: string; responsibility: string }> = {
  coordinator: { title: "Coordinator", responsibility: "Event setup, staff assignments, and questions that need escalation" },
  intake_review: { title: "Intake volunteer", responsibility: "Help applicants answer questions and identify missing information" },
  program_review: { title: "Program reviewer", responsibility: "Review the application under MVLP's service requirements" },
  attorney: { title: "Attorney", responsibility: "Provide legal advice and review the matter and proposed documents" },
  notary: { title: "Notary", responsibility: "Handle the required notarization and return documents to the appropriate person" },
  follow_up: { title: "Follow-up volunteer", responsibility: "Track outstanding tasks and contact participants through approved channels" },
  reporting: { title: "Reporting", responsibility: "See aggregate clinic counts" },
  export: { title: "Case-file export", responsibility: "Export the MVLP case file to MVLP's approved destination" }
};

export type LegalAidEventSummary = {
  id: string;
  partnerSlug: string;
  publicSlug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationName: string;
  geography: string;
  jurisdiction: string | null;
  capacity: number;
  status: string;
  experience: "standard" | "legal_aid";
  policyProfileId: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  appointmentPolicy: "walk_in" | "appointment" | "mixed";
  participantCostNote: string | null;
  publicDescription: string | null;
  registrationOpen: boolean;
  seatsRemaining: number | null;
};

export type RegistrationStatus = "received" | "confirmed" | "waitlisted" | "cancelled" | "declined";

export type ClinicRegistration = {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  preferredContact: "email" | "phone" | "text" | "either";
  languagePreference: string | null;
  assistanceNeeds: string | null;
  createdAt: string;
  confirmedAt: string | null;
  waitlistedAt: string | null;
  cancelledAt: string | null;
};

export type IntakeStatus =
  | "draft" | "submitted" | "needs_information" | "staff_review" | "approved" | "declined_for_program" | "referred" | "withdrawn";

export type IntakeSignatureSummary = {
  id: string;
  statementKey: string;
  statementVersion: string;
  answersVersion: number;
  answersHash: string;
  signerName: string;
  signatureMethod: "typed" | "drawn";
  signedAt: string;
  status: "active" | "superseded";
  current: boolean;
};

export type IntakeDocument = {
  id: string;
  category: "identification" | "court_record" | "income" | "executed_document" | "other";
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  uploadedRole: "participant" | "staff";
  createdAt: string;
  removedAt: string | null;
};

export type InformationRequest = {
  id: string;
  requestText: string;
  status: "open" | "fulfilled" | "withdrawn";
  createdAt: string;
  fulfilledAt: string | null;
};

export type ReviewDecision = {
  id: string;
  decisionType: "program_eligibility" | "attorney_review" | "conflict_engagement";
  outcome: string;
  rationale: string;
  policyBasis: string | null;
  reviewerPermission: string;
  decidedAt: string;
};

export type DocumentTaskStatus =
  | "draft" | "attorney_reviewed" | "ready_for_execution" | "signature_or_notary_pending"
  | "executed_copy_received" | "execution_reviewed" | "ready_to_file" | "filed";

export type DocumentTask = {
  id: string;
  documentKey: string;
  title: string;
  requiredSigner: string;
  executionMethod: string;
  authorityNote: string | null;
  templateVersion: string | null;
  status: DocumentTaskStatus;
  unsignedArtifactSha256: string | null;
  unsignedRenderJobId: string | null;
  executedDocumentId: string | null;
  reviewedAt: string | null;
  filedAt: string | null;
  filingNote: string | null;
  createdAt: string;
};

export type NextStep = {
  id: string;
  title: string;
  detail: string | null;
  status: "pending" | "done" | "cancelled";
  dueAt: string | null;
  ownerEventStaffId: string | null;
  completedAt: string | null;
};

export type ParticipantIntakeView = {
  id: string;
  eventId: string;
  status: IntakeStatus;
  currentVersion: number;
  answersHash: string | null;
  answers: IntakeAnswers;
  legalMatter: string | null;
  ssnHint: string | null;
  signatures: IntakeSignatureSummary[];
  documents: IntakeDocument[];
  openRequests: InformationRequest[];
  nextSteps: NextStep[];
  documentTasks: DocumentTask[];
  submittedAt: string | null;
  lastActivityAt: string;
};

export type StaffIntakeListItem = {
  id: string;
  status: IntakeStatus;
  contactName: string;
  legalMatter: string | null;
  registrationStatus: RegistrationStatus | null;
  attorneyReviewStatus: string;
  programDecision: string | null;
  openRequestCount: number;
  submittedAt: string | null;
  lastActivityAt: string;
};

export type StaffIntakeDetail = ParticipantIntakeView & {
  partnerSlug: string;
  policyProfileId: string;
  intakeSchemaVersion: string;
  registration: ClinicRegistration | null;
  attorneyReviewStatus: string;
  programDecision: string | null;
  externalCaseReference: string | null;
  clinicCaseId: string | null;
  decisions: ReviewDecision[];
  allRequests: InformationRequest[];
  exports: { id: string; exportVersion: number; includesRestricted: boolean; createdAt: string }[];
  permissions: string[];
};
