/**
 * DEVELOPMENT-ONLY Briefcase matter fixtures for visual QA of the care states.
 *
 * These are illustrative shapes, NOT real saved matters and NOT computed from any answers. They
 * exist only to render the matter-state gallery behind a production-blocked route. The real
 * Briefcase is server data; this branch adds no persistence for sensitive screening answers.
 */
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";

const BASE: ConsumerBriefcaseItem = {
  id: "fixture",
  type: "result",
  title: "Illinois record-clearing check",
  state: "IL",
  status: "check_saved",
  createdAt: "2026-06-01T12:00:00.000Z",
  summary: "Illustrative matter for visual QA.",
  nextSteps: ["Review the details.", "Open the matter for more."],
  paymentAllowed: false,
  packetReady: false,
  pathwayLabel: "Illinois expungement"
};

export const BRIEFCASE_CARE_FIXTURES: readonly ConsumerBriefcaseItem[] = [
  {
    ...BASE,
    id: "fixture-packet-ready",
    status: "packet_ready",
    resultCode: "packet_ready",
    summary: "A packet-ready path was found.",
    nextSteps: ["Generate your self-help packet.", "Review every document before filing."],
    paymentAllowed: true,
    packetReady: true,
    paymentStatus: "unpaid",
    packetStatus: "not_started"
  },
  {
    ...BASE,
    id: "fixture-guidance-only",
    status: "guidance_saved",
    resultCode: "guidance_only",
    packetType: "guidance_packet",
    summary: "Guidance saved for this path.",
    nextSteps: ["Read the filing next steps.", "Ask Wilma to explain the checklist."]
  },
  {
    ...BASE,
    id: "fixture-waiting",
    status: "waiting",
    resultCode: "not_yet",
    summary: "A waiting period may apply before filing.",
    nextSteps: ["Save this result.", "Come back when the waiting period may be complete."]
  },
  {
    ...BASE,
    id: "fixture-needs-attention",
    status: "needs_info",
    resultCode: "needs_more_info",
    summary: "A few more details are needed.",
    nextSteps: ["Add the missing case details.", "Run the check again."]
  },
  {
    ...BASE,
    id: "fixture-denied",
    status: "not_eligible",
    resultCode: "likely_not_eligible",
    summary: "This record may not match a self-help filing path.",
    nextSteps: ["Review the reasons.", "Consider a legal aid or attorney review."]
  },
  {
    ...BASE,
    id: "fixture-completed",
    status: "packet_ready",
    resultCode: "packet_ready",
    summary: "Packet generated and downloaded.",
    nextSteps: ["File your packet with the correct court.", "Keep a copy for your records."],
    paymentAllowed: true,
    packetReady: true,
    paymentStatus: "paid",
    packetStatus: "downloaded"
  }
];
