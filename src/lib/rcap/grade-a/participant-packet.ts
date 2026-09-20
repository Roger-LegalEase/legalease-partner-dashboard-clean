import { composeGradeAPacket, type GradeAMatter, type GradeAPacket } from "@/lib/rcap/grade-a/composer";
import type { PacketSpecification } from "@/lib/rcap/grade-a/packet-specification";
import {
  composeIlProstitutionJVacateParticipantPacket
} from "@/lib/rcap/grade-a/families/il-prostitution-j-vacate-set";

/**
 * One entry point for composing a participant's own copy of a packet.
 *
 * Most families are composed straight from their specification, because the
 * specification carries the sentences. A family whose approved documents were
 * composed by its own builder — Illinois's one custom-pleading track is the
 * first — cannot be, because the specification describes those documents rather
 * than reproducing them; composing from it would hand a participant text no
 * review ever approved. Such a family registers its own participant composer
 * here, and everything else keeps the behaviour it has today, including the
 * refusals: an unregistered family that declares a pleading but composes no
 * pleading caption still fails at the renderer, which is the correct answer.
 *
 * Registration composes documents. It approves nothing, opens no route and
 * creates no fulfillment record.
 */

type ParticipantPacketComposer = (
  specification: PacketSpecification,
  matter: GradeAMatter
) => GradeAPacket;

const PARTICIPANT_FAMILY_COMPOSERS: ReadonlyMap<string, ParticipantPacketComposer> = new Map([
  ["il-prostitution-j-vacate-set", composeIlProstitutionJVacateParticipantPacket]
]);

/** True when this family composes its participant copy through its own composer. */
export function hasParticipantFamilyComposer(packetFamily: string): boolean {
  return PARTICIPANT_FAMILY_COMPOSERS.has(packetFamily);
}

/**
 * Compose the packet a participant receives, from a specification and that
 * participant's verified facts. Signature-compatible with composeGradeAPacket.
 */
export function composeParticipantDeliveryPacket(
  specification: PacketSpecification,
  matter: GradeAMatter
): GradeAPacket {
  const familyComposer = PARTICIPANT_FAMILY_COMPOSERS.get(specification.packetFamily);
  return familyComposer
    ? familyComposer(specification, matter)
    : composeGradeAPacket(specification, matter);
}
