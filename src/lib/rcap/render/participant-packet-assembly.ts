import { type GradeAPacket } from "@/lib/rcap/grade-a/composer";
import { renderGradeAPacketPdf, type PacketVariant } from "@/lib/rcap/grade-a/renderer";
import { type PacketSpecification } from "@/lib/rcap/grade-a/packet-specification";
import {
  assemblePacketWithGuide, guideDocuments, guideStopConditions,
  type GuideLocale, type GuideMatter
} from "@/lib/rcap/supplemental/guide-renderer";
import {
  supplementalGuideFor, supplementalGuideIdentityFor, type SupplementalGuideIdentity
} from "@/lib/rcap/supplemental/guide-registry";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";

/**
 * THE ONE PLACE A PARTICIPANT'S PACKET IS ASSEMBLED.
 *
 * Three production sites render the bytes a participant can receive:
 *
 *   src/lib/rcap/render/personalized-packet.ts   the worker's claim render
 *   src/lib/expungement-ai/packet-generation.ts  the sponsored/consumer artifact
 *   src/lib/expungement-ai/packet-generation.ts  the download's re-render check
 *
 * They must agree exactly. The third re-renders and compares the result against
 * a digest recorded when the artifact was made, so a rule applied at generation
 * and not at verification does not merely diverge -- it makes every download of
 * a correctly generated packet fail its own integrity check. Three copies of
 * "assemble the guide where there is one" is three chances to get that wrong,
 * and they would drift in the direction nobody tests.
 *
 * So the rule lives here once, and all three call this.
 *
 * WHAT IT DECIDES
 *
 * Guide lookup, the full/court-only variant, retirement of the legacy guidance
 * page, supplemental rendering and the final assembly. Everything it decides,
 * it decides from the route and the specification -- never from a caller's
 * opinion about whether a guide should be included.
 *
 * WHEN A ROUTE HAS NO GUIDE
 *
 * It renders exactly as it did before §7: `renderGradeAPacketPdf` directly, not
 * an assembly with zero guide pages. Those are not the same bytes -- the
 * assembler builds a new document and copies pages into it -- and most routes
 * have recorded artifact digests that must keep verifying. A route without a
 * guide is not a degraded route; it is a route §7 has not reached.
 *
 * WHEN A ROUTE IS GUIDE-REQUIRED AND HAS NO GUIDE, IT REFUSES
 *
 * "Guide-required" is not a policy invented here. It is read from the
 * specification: a component marked `supersededBy: "supplemental_guide"` is a
 * page that has been written out of the packet on the promise that a guide
 * replaces it. Assembling that route without its guide would either ship the
 * retired page beside a guide that is supposed to have replaced it, or drop it
 * with nothing in its place -- a packet missing the pages that say where to
 * file. Both are worse than refusing, and refusing is recoverable.
 */

/**
 * What a participant's own download is.
 *
 * Named once so the worker, the artifact builder and the download's re-render
 * check cannot disagree about it by each writing `"full"` in their own call.
 * A court-only assembly is a deliberate, separate request.
 */
export const PARTICIPANT_DELIVERY_VARIANT: PacketVariant = "full";

export type ParticipantPacketAssembly = {
  bytes: Buffer;
  variant: PacketVariant;
  /** The guide actually assembled, or null where the route has none. */
  guide: SupplementalGuideIdentity | null;
  /** True where a guide was drawn into these bytes. */
  guideAssembled: boolean;
};

export type ParticipantPacketAssemblyOptions = {
  routeKey: string;
  specification: PacketSpecification;
  variant?: PacketVariant;
  locale?: GuideLocale;
  matter?: GuideMatter;
  verifiedAt?: string;
};

export class ParticipantPacketAssemblyError extends Error {
  constructor(readonly routeKey: string, message: string) {
    super(`${routeKey}: ${message}`);
    this.name = "ParticipantPacketAssemblyError";
  }
}

/**
 * Whether this route's specification has already written a component out of the
 * packet in favour of the shared guide.
 */
export function packetRequiresSupplementalGuide(specification: PacketSpecification): boolean {
  return specification.documents.some((document) =>
    (document as { supersededBy?: string }).supersededBy === "supplemental_guide");
}

export async function assembleParticipantPacket(
  packet: GradeAPacket,
  options: ParticipantPacketAssemblyOptions
): Promise<ParticipantPacketAssembly> {
  const variant: PacketVariant = options.variant ?? "full";
  const guide = supplementalGuideFor(options.routeKey);
  const identity = supplementalGuideIdentityFor(options.routeKey) ?? null;

  if (!guide) {
    if (packetRequiresSupplementalGuide(options.specification)) {
      throw new ParticipantPacketAssemblyError(options.routeKey,
        "the specification retires a component in favour of the shared §7 guide, and no guide is registered for "
        + "this route. Assembling it would ship a packet whose filing instructions were removed on the promise "
        + "of a replacement that is not here. Register the route's guide, or withdraw the supersession.");
    }
    return {
      bytes: await renderGradeAPacketPdf(packet, { variant }),
      variant,
      guide: null,
      guideAssembled: false
    };
  }

  /*
   * A court-only packet asks for no guide and gets none. It is not a failure
   * and it is not a refusal: `guideBelongsInPacket` is the single decision, the
   * assembler skips the supplemental pages, and nothing is superseded, because
   * nothing has replaced the guidance for a download that never carried it.
   */
  const assembled = variant === "court_only" ? null : guide;

  const bytes = await assemblePacketWithGuide(packet, assembled, {
    routeKey: options.routeKey,
    variant,
    locale: options.locale ?? "en",
    matter: options.matter,
    documents: guideDocuments(packet),
    stops: guideStopConditions(options.specification),
    stopsEs: guide.stopConditionsEs,
    verifiedAt: options.verifiedAt
  });

  return { bytes, variant, guide: identity, guideAssembled: assembled !== null };
}

/**
 * What the guide's cover panel says about this matter.
 *
 * Shared by all three production sites, because a cover panel that differs
 * between generation and the download's re-render is a digest mismatch on a
 * packet where nothing is actually wrong.
 *
 * Every value comes from the protected verification or the job identity.
 * Nothing is looked up and nothing is invented: a field the snapshot does not
 * establish is passed as null, which the renderer prints in terms rather than
 * filling with something plausible.
 */
export function participantGuideMatter(
  snapshot: PacketVerificationSnapshot,
  packetId: string
): GuideMatter {
  const answers: Record<string, unknown> = {
    ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers,
    ...snapshot.packetAnswers, ...snapshot.serverFacts
  };
  const plain = (id: string): string | null => {
    const answer = answers[id];
    const value = answer && typeof answer === "object" && !Array.isArray(answer)
      ? ((answer as { unknown?: boolean }).unknown === true ? undefined : (answer as { value?: unknown }).value)
      : answer;
    if (typeof value === "string" && value.trim()) return value;
    return typeof value === "number" ? String(value) : null;
  };
  return {
    preparedFor: plain("participant_full_legal_name"),
    preparedOn: snapshot.verifiedAt ?? null,
    jurisdiction: snapshot.jurisdiction ?? null,
    courtOrAgency: plain("court_name"),
    caseOrMatter: plain("cause_number"),
    remedy: snapshot.pathwayId ?? null,
    packetId
  };
}

/** The bytes alone, for the callers that only ever wanted a PDF. */
export async function renderParticipantPacketPdf(
  packet: GradeAPacket,
  options: ParticipantPacketAssemblyOptions
): Promise<Buffer> {
  return (await assembleParticipantPacket(packet, options)).bytes;
}
