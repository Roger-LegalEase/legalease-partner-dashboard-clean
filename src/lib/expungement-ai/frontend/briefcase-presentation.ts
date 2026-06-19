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
 *   - denied          -> the record may not qualify (most sensitive; extra-care copy)
 *   - completed       -> the self-help packet was generated and downloaded
 *   - packet_ready    -> a packet can be generated
 *   - saved           -> a plain saved check
 */
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";

export type MatterCareState =
  | "packet_ready"
  | "guidance_only"
  | "waiting"
  | "needs_attention"
  | "denied"
  | "completed"
  | "saved";

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

export function matterCareState(item: ConsumerBriefcaseItem): MatterCareState {
  const rc = item.resultCode;

  if (item.packetStatus === "downloaded") return "completed";

  if (rc === "guidance_only" || item.packetType === "guidance_packet" || (item.status === "guidance_saved" && rc !== "not_covered_yet")) {
    return "guidance_only";
  }
  if (item.status === "packet_ready" || rc === "packet_ready" || rc === "packet_ready_with_caution" || item.packetReady) {
    return "packet_ready";
  }
  if (item.status === "waiting" || rc === "not_yet") return "waiting";
  if (item.status === "not_eligible" || item.status === "hard_stop" || rc === "likely_not_eligible" || rc === "hard_stop") {
    return "denied";
  }
  if (item.status === "needs_info" || item.status === "needs_review" || rc === "needs_more_info" || rc === "needs_review" || rc === "not_covered_yet") {
    return "needs_attention";
  }
  return "saved";
}

const PRESENTATION: Record<MatterCareState, Omit<MatterCarePresentation, "careState">> = {
  packet_ready: {
    badge: "Packet ready",
    tone: "positive",
    blurb: "Your self-help packet is ready to generate. Review every document before filing.",
    showCallout: false
  },
  guidance_only: {
    badge: "Guidance saved",
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
      "This record may not qualify for self-help filing right now. That is not the end of the road. A legal aid office or an attorney can review your specific situation.",
    showCallout: true
  },
  completed: {
    badge: "Completed",
    tone: "positive",
    blurb: "You have downloaded your packet. The next step is filing it yourself with the court.",
    showCallout: true
  },
  saved: {
    badge: "Saved",
    tone: "neutral",
    blurb: "Saved privately to your Briefcase.",
    showCallout: false
  }
};

export function matterCarePresentation(item: ConsumerBriefcaseItem): MatterCarePresentation {
  const careState = matterCareState(item);
  return { careState, ...PRESENTATION[careState] };
}
