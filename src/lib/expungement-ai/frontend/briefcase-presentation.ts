/**
 * Presentation mapping for Briefcase matter "care states".
 *
 * SAFETY: this does NOT decide eligibility, packet readiness, or payment. It reads the
 * engine-provided status/resultCode already stored on a matter and chooses how to PRESENT it
 * (badge, tone, supportive copy). It never computes an outcome from a user's answers.
 *
 * The care states map the Briefcase design spec's sensitive states onto the data we have:
 *   - guidance_only   -> guidance saved, no packet to buy
 *   - waiting         -> a waiting period may apply (offer a reminder)
 *   - needs_attention -> we need more from the user, or the record type is not supported yet
 *   - denied          -> the record may not match a self-help path (most sensitive; extra-care copy)
 *   - completed       -> the self-help packet was generated and downloaded
 *   - packet_ready    -> a packet can be generated
 *   - saved           -> a plain saved check
 */
import type { BriefcasePresentationItem } from "@/lib/expungement-ai/briefcase-presentation-authority";

export type MatterCareState =
  | "packet_ready"
  | "guidance_only"
  | "waiting"
  | "needs_attention"
  | "denied"
  | "completed"
  | "unavailable"
  | "saved";

export type HumanMatterState =
  | "Guided check saved"
  | "Next steps saved"
  | "We need a little more information"
  | "You may need to wait before taking the next step"
  | "A self-help packet may be available"
  | "Packet details in progress"
  | "Packet facts complete"
  | "Ready to generate"
  | "Payment confirmed"
  | "Preparing packet"
  | "Packet ready"
  | "Filed"
  | "Waiting on the court"
  | "Decision received"
  | "Matter details unavailable";

export type MatterTone = "positive" | "info" | "wait" | "attention" | "care" | "neutral";

export type MatterCarePresentation = {
  careState: MatterCareState;
  /** Short, gentle pill label (never a harsh "denied"). */
  badge: string;
  tone: MatterTone;
  /** One supportive sentence shown as a calm callout for the sensitive states. */
  blurb: string;
  /** Whether to surface the supportive callout (the sensitive/care states). */
  showCallout: boolean;
};

export function matterCareState(item: BriefcasePresentationItem): MatterCareState {
  const rc = item.resultCode;

  if (item.authorityStatus === "unavailable") return "unavailable";
  if (item.artifact.status === "ready") return "completed";
  if ((rc === "packet_ready" || rc === "packet_ready_with_caution") && item.packetDraft.status === "unavailable") {
    return "unavailable";
  }

  if (rc === "guidance_only" || item.packetType === "guidance_packet") {
    return "guidance_only";
  }
  if (rc === "packet_ready" || rc === "packet_ready_with_caution") {
    return "packet_ready";
  }
  if (rc === "not_yet") return "waiting";
  if (rc === "likely_not_eligible" || rc === "hard_stop") {
    return "denied";
  }
  if (rc === "needs_more_info" || rc === "needs_review" || rc === "not_covered_yet") {
    return "needs_attention";
  }
  return "saved";
}

/** Consumer vocabulary derived from persisted matter milestones. */
export function humanMatterState(item: BriefcasePresentationItem): HumanMatterState {
  if (item.authorityStatus === "unavailable") return "Matter details unavailable";
  if (item.artifact.status === "ready") return "Packet ready";
  if ((item.resultCode === "packet_ready" || item.resultCode === "packet_ready_with_caution")
    && item.packetDraft.status === "unavailable") return "Matter details unavailable";

  if (item.resultCode === "guidance_only" || item.resultCode === "not_covered_yet" || item.packetType === "guidance_packet") {
    return "Next steps saved";
  }
  if (item.resultCode === "needs_more_info" || item.resultCode === "needs_review") return "We need a little more information";
  if (item.resultCode === "not_yet") return "You may need to wait before taking the next step";

  if (item.resultCode === "packet_ready" || item.resultCode === "packet_ready_with_caution") {
    if (item.packetProgress === "verified") return item.paymentState === "paid" ? "Payment confirmed" : "Ready to generate";
    if (item.packetProgress === "facts_complete") return "Packet facts complete";
    if (item.packetProgress === "in_progress") return "Packet details in progress";
    return "A self-help packet may be available";
  }
  return "Guided check saved";
}

const PRESENTATION: Record<MatterCareState, Omit<MatterCarePresentation, "careState">> = {
  packet_ready: {
    badge: "Packet ready",
    tone: "positive",
    blurb: "Your self-help packet is ready to generate. Review every document before filing.",
    showCallout: false
  },
  guidance_only: {
    badge: "Next steps saved",
    tone: "info",
    blurb: "We saved step-by-step guidance for your state. There is no packet to buy for this path.",
    showCallout: false
  },
  waiting: {
    badge: "Waiting period",
    tone: "wait",
    blurb: "You may need to wait before filing. We can remind you when it may be time to check again.",
    showCallout: true
  },
  needs_attention: {
    badge: "Needs your attention",
    tone: "attention",
    blurb: "We need a little more before this can move forward. Open it to see what to add.",
    showCallout: true
  },
  denied: {
    badge: "Extra care",
    tone: "care",
    blurb:
      "This record may not match a self-help filing path right now. That is not the end of the road. A legal aid office or an attorney can review your specific situation.",
    showCallout: true
  },
  completed: {
    badge: "Completed",
    tone: "positive",
    blurb: "You have downloaded your packet. The next step is filing it yourself with the court.",
    showCallout: true
  },
  unavailable: {
    badge: "Details unavailable",
    tone: "neutral",
    blurb: "We could not verify this matter's saved details right now.",
    showCallout: true
  },
  saved: {
    badge: "Saved",
    tone: "neutral",
    blurb: "Saved privately to your Briefcase.",
    showCallout: false
  }
};

export function matterCarePresentation(item: BriefcasePresentationItem): MatterCarePresentation {
  const careState = matterCareState(item);
  return { careState, ...PRESENTATION[careState] };
}
