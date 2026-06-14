import { getJurisdictionConfig } from "./jurisdictions";
import type { PacketPlan, ReliefTrack } from "./types";

export function planNebraskaPacket(reliefTrack: ReliefTrack): PacketPlan {
  const jurisdiction = getJurisdictionConfig("NE");
  const vocabulary = jurisdiction.vocabulary[reliefTrack];

  if (reliefTrack === "adult_set_aside_conviction") {
    return {
      jurisdictionCode: "NE",
      reliefTrack,
      title: "Nebraska Adult Set-Aside Conviction Packet",
      primaryReliefTerm: vocabulary.primaryReliefTerm,
      requiredForms: [
        {
          formId: "ne_cc_6_11_petition_set_aside_conviction",
          role: "petition",
          required: true
        },
        {
          formId: "ne_cc_6_11_2_order_set_aside_conviction",
          role: "proposed_order",
          required: true
        }
      ],
      requiredAttachments: ["Case record attachment placeholder"],
      signatureRequirements: ["Petitioner signature placeholder"],
      filingInstructions: ["Court filing instruction placeholder"],
      warnings: ["Nebraska set-aside relief is not the same as full expungement."]
    };
  }

  if (reliefTrack === "adult_record_sealing") {
    return {
      jurisdictionCode: "NE",
      reliefTrack,
      title: "Nebraska Adult Record Sealing Packet",
      primaryReliefTerm: vocabulary.primaryReliefTerm,
      requiredForms: [
        {
          formId: "ne_cc_6_12_motion_seal_adult_record",
          role: "motion",
          required: true
        }
      ],
      requiredAttachments: ["Case record attachment placeholder"],
      signatureRequirements: ["Movant signature placeholder"],
      filingInstructions: ["Court filing instruction placeholder"],
      warnings: ["Nebraska record sealing relief is not the same as full expungement."]
    };
  }

  throw new Error(`Unsupported Nebraska relief track: ${reliefTrack}`);
}
