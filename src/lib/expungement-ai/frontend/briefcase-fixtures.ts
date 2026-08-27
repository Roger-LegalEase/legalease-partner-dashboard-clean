/**
 * DEVELOPMENT-ONLY Briefcase matter fixtures for visual QA of the care states.
 *
 * These are illustrative shapes, NOT real saved matters and NOT computed from any answers. They
 * exist only to render the matter-state gallery behind a production-blocked route. The real
 * Briefcase is server data; this branch adds no persistence for sensitive screening answers.
 */
import type { BriefcasePresentationItem } from "@/lib/expungement-ai/briefcase-presentation-authority";

const BASE: BriefcasePresentationItem = {
  id: "fixture",
  authorityStatus: "trusted_source",
  unavailableReason: null,
  title: "Illinois record-clearing check",
  jurisdiction: "IL",
  createdAt: "2026-06-01T12:00:00.000Z",
  resultCode: null,
  pathwayId: "illinois-expungement",
  pathwayLabel: "Illinois expungement",
  summary: "Illustrative matter for visual QA.",
  nextSteps: ["Review the details.", "Open the matter for more."],
  checklist: [],
  packetType: null,
  selectedTrackId: null,
  treatmentClassification: null,
  verificationStatus: "trusted_source",
  packetProgress: "unavailable",
  packetDraft: { status: "unavailable" },
  paymentState: "unpaid",
  artifact: { status: "absent", canDownload: false, documents: [] }
};

const AVAILABLE_PACKET_DRAFT: Extract<BriefcasePresentationItem["packetDraft"], { status: "available" }> = {
  status: "available",
  capturedAt: "2026-06-01T12:00:00.000Z",
  initialAnswers: {},
  screeningAnswers: {},
  prefilledAnswers: {},
  packetAnswers: {},
  serverFacts: { jurisdiction: "IL", pathway_id: "illinois-expungement" },
  requiredInputIds: [],
  missingInputIds: [],
  questions: [],
  builderQuestions: [],
  verificationSummary: [],
  verificationContext: [],
  verificationManifest: {
    schemaVersion: "expungement-ai/verification-review-manifest/v1",
    factKeys: [],
    systemContextKeys: []
  },
  packetPlan: null,
  expectedComponents: [],
  reviewSafety: { safe: false, reason: "visual_fixture_only" }
};

export const BRIEFCASE_CARE_FIXTURES: readonly BriefcasePresentationItem[] = [
  {
    ...BASE,
    id: "fixture-packet-ready",
    resultCode: "packet_ready",
    summary: "A packet-ready path was found.",
    nextSteps: ["Generate your self-help packet.", "Review every document before filing."],
    packetType: "custom_pleading",
    packetProgress: "not_started",
    packetDraft: AVAILABLE_PACKET_DRAFT
  },
  {
    ...BASE,
    id: "fixture-guidance-only",
    resultCode: "guidance_only",
    packetType: "guidance_packet",
    summary: "Guidance saved for this path.",
    nextSteps: ["Read the filing next steps.", "Ask Wilma to explain the checklist."]
  },
  {
    ...BASE,
    id: "fixture-waiting",
    resultCode: "not_yet",
    summary: "A waiting period may apply before filing.",
    nextSteps: ["Save this result.", "Come back when the waiting period may be complete."]
  },
  {
    ...BASE,
    id: "fixture-needs-attention",
    resultCode: "needs_more_info",
    summary: "A few more details are needed.",
    nextSteps: ["Add the missing case details.", "Run the check again."]
  },
  {
    ...BASE,
    id: "fixture-denied",
    resultCode: "likely_not_eligible",
    summary: "This record may not match a self-help filing path.",
    nextSteps: ["Review the reasons.", "Consider a legal aid or attorney review."]
  },
  {
    ...BASE,
    id: "fixture-completed",
    resultCode: "packet_ready",
    summary: "Packet generated and downloaded.",
    nextSteps: ["File your packet with the correct court.", "Keep a copy for your records."],
    packetType: "custom_pleading",
    verificationStatus: "verified",
    packetProgress: "verified",
    paymentState: "paid",
    artifact: {
      status: "ready",
      canDownload: true,
      source: "source_driven_packet_plan",
      packetId: "fixture-packet",
      packetPlanId: "illinois-expungement",
      generatedAt: "2026-06-01T12:30:00.000Z",
      documents: [{ kind: "full", fileName: "fixture-packet.pdf", downloadPath: "/dev/fixture-packet.pdf" }]
    }
  }
];
