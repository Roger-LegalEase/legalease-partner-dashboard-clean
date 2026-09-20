import { type GradeAPacket } from "@/lib/rcap/grade-a/composer";
import { renderGradeAPacketPdf, type PacketVariant } from "@/lib/rcap/grade-a/renderer";
import {
  specificationCaseIdentifierFactId, type PacketSpecification
} from "@/lib/rcap/grade-a/packet-specification";
import {
  assemblePacketWithGuide, guideDocuments, guideStopConditions,
  type GuideLocale, type GuideMatter
} from "@/lib/rcap/supplemental/guide-renderer";
import {
  supplementalGuideFor, supplementalGuideIdentityFor, type SupplementalGuideIdentity
} from "@/lib/rcap/supplemental/guide-registry";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";
import { normalizeLocale } from "@/lib/expungement-ai/localization";

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
  /**
   * REQUIRED, AND DELIBERATELY NOT DEFAULTED.
   *
   * It used to be `locale?: GuideLocale` with `?? "en"` below, and every
   * production caller omitted it. So the renderer's careful Spanish behaviour
   * -- refuse an untranslated consequential entry rather than fall back -- was
   * reachable only from a verifier that asked for Spanish explicitly. The paid,
   * sponsored and download paths asked for nothing, got English, and a
   * participant who had chosen Spanish throughout received an English guide
   * with no refusal anywhere, because nobody had asked for Spanish.
   *
   * A default is the wrong shape for this field. "The caller did not say" and
   * "the participant chose English" are different facts, and only one of them
   * should produce an English packet. Making it required turns the omission
   * into a compile error instead of a silent language substitution.
   */
  locale: GuideLocale;
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
  /*
   * The type says this is required; this says so at runtime.
   *
   * The worker loads these modules through a loader that erases types, and the
   * controls do the same, so the compiler's refusal never reaches the process
   * that actually renders a participant's packet. Without this guard an omitted
   * locale falls through to the guide renderer's own `?? "en"` and produces an
   * English packet -- which is precisely the defect the required type was added
   * to end, surviving in the one place it matters.
   */
  if (options.locale !== "en" && options.locale !== "es") {
    throw new ParticipantPacketAssemblyError(options.routeKey,
      `no delivery language was supplied (got ${JSON.stringify(options.locale)}). A packet is rendered in the `
      + "language the matter records, and defaulting to English here would hand a participant who chose Spanish "
      + "an English packet with nothing reporting it. Resolve it with resolveDeliveryLocale for a new artifact, "
      + "or recordedDeliveryLocale when reproducing one.");
  }

  const variant: PacketVariant = options.variant ?? "full";
  const guide = supplementalGuideFor(options.routeKey);
  const identity = supplementalGuideIdentityFor(options.routeKey) ?? null;

  if (!guide) {
    /*
     * The refusal is scoped to the full variant, and only there.
     *
     * A court-only packet is what the clerk receives and carries zero
     * supplemental pages by contract, so its contents do not depend on whether
     * a participant guide exists. Refusing one for want of a guide would make
     * the court-facing subset unavailable over a document that was never going
     * to be in it -- a packet nobody can file because of a page nobody was
     * going to read.
     *
     * The full-packet refusal below is untouched: there the missing guide is
     * the participant's filing instructions, retired from the packet on the
     * promise of a replacement.
     */
    if (variant === "full" && packetRequiresSupplementalGuide(options.specification)) {
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
    locale: options.locale,
    matter: options.matter,
    documents: guideDocuments(packet),
    stops: guideStopConditions(options.specification),
    stopsEs: guide.stopConditionsEs,
    verifiedAt: options.verifiedAt
  });

  return { bytes, variant, guide: identity, guideAssembled: assembled !== null };
}

/**
 * THE LANGUAGE THIS MATTER'S PACKET IS DELIVERED IN.
 *
 * Read from the matter's own durable attribution, which the atomic claim wrote
 * from `consumer_pending_screening_results.locale` -- the language the
 * participant was actually screening in when the pending result was created.
 * That is the product's existing accepted language state, and it is already on
 * the matter; no second preference is invented here.
 *
 * NOT the browser. The render happens in a worker with no session, and a repeat
 * download has to reproduce bytes recorded months earlier. A transient locale
 * read at render time would make the same matter produce different documents on
 * different devices, and make a recorded digest unverifiable the moment someone
 * switched language.
 *
 * GENERATION RESOLVES IT; VERIFICATION REPRODUCES IT.
 *
 * This function belongs to generation. Once an artifact exists it carries the
 * locale it was built with, and the download's re-render reads that recorded
 * value rather than asking again -- otherwise a participant switching language
 * after purchase would make their own stored packet fail its integrity check.
 */
export class DeliveryLocaleUnavailableError extends Error {
  constructor(readonly claimed: unknown) {
    super(
      `this matter records no delivery language that can be rendered (attribution.locale = `
      + `${JSON.stringify(claimed)}). A new packet is rendered in the language the participant was screening in, `
      + "and choosing English on its behalf is how a Spanish-speaking participant receives an English packet with "
      + "nothing reporting it. The claim writes this from consumer_pending_screening_results.locale; a matter "
      + "that carries none needs that recorded before a packet is generated for it."
    );
    this.name = "DeliveryLocaleUnavailableError";
  }
}

/**
 * FAIL CLOSED. This is the NEW-ARTIFACT path.
 *
 * It used to end in `normalizeLocale`, which answers "en" for absent,
 * malformed and unsupported alike -- so a matter whose claim never wrote a
 * locale, or wrote `fr`, produced an English packet indistinguishable from one
 * a participant chose. That is the exact failure the locale binding was added
 * to end, reintroduced one layer down.
 *
 * `normalizeLocale` stays as it is: answering "en" for anything unrecognised is
 * right for interface copy, where the alternative is a blank page. It is wrong
 * here, where the alternative is a refusal someone can act on.
 *
 * A REGIONED TAG IS NOT UNSUPPORTED. `es-MX` is Spanish, and
 * `normalizeLocale` would have called it English, because it compares against
 * the literal string "es". The primary subtag decides.
 */
export function resolveDeliveryLocale(artifactRefs: Record<string, unknown> | undefined | null): GuideLocale {
  const attribution = artifactRefs?.attribution;
  const claimed = attribution && typeof attribution === "object"
    ? (attribution as { locale?: unknown }).locale
    : undefined;
  if (typeof claimed !== "string") throw new DeliveryLocaleUnavailableError(claimed);
  const primary = claimed.trim().toLowerCase().split(/[-_]/)[0];
  if (primary !== "en" && primary !== "es") throw new DeliveryLocaleUnavailableError(claimed);
  return primary;
}

/**
 * The locale an existing artifact was rendered in.
 *
 * `packetLocale` is recorded at generation. Its absence means the artifact
 * predates this field, and those were all rendered in English -- so English is
 * the correct answer for them, and it is a statement about the past rather than
 * a default for the present.
 *
 * DELIBERATELY LENIENT, UNLIKE `resolveDeliveryLocale`.
 *
 * The two answer different questions. That one is asked before an artifact
 * exists, where guessing hands someone the wrong language; this one is asked
 * about an artifact that already exists, where the language is a historical
 * fact and refusing would take a packet away from the participant who bought
 * it. A repeat download is not the place to discover a policy.
 */
export function recordedDeliveryLocale(artifactRefs: Record<string, unknown> | undefined | null): GuideLocale {
  const recorded = artifactRefs?.packetLocale;
  return normalizeLocale(typeof recorded === "string" ? recorded : null);
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
/**
 * A calendar date a participant can read, from an ISO instant.
 *
 * The cover's PREPARED ON was drawing `verifiedAt` unchanged, so it printed
 * `2026-09-03T15:00:00.000Z` on the page. The controls never saw it because
 * their sample matter passes an already-formatted string.
 *
 * Month names come from a fixed table rather than `Intl`. These bytes are
 * hashed at generation and re-rendered at download, and ICU data differs
 * between Node builds and between the application and the worker image -- a
 * date formatted by the platform is a date that can change underneath a
 * recorded digest.
 */
const MONTHS: Record<GuideLocale, ReadonlyArray<string>> = {
  en: ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
};

export function participantGuideDate(value: string | null | undefined, locale: GuideLocale): string | null {
  if (!value) return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return null;
  const day = at.getUTCDate();
  const month = MONTHS[locale][at.getUTCMonth()];
  const year = at.getUTCFullYear();
  return locale === "es" ? `${day} de ${month} de ${year}` : `${month} ${day}, ${year}`;
}

export function participantGuideMatter(
  snapshot: PacketVerificationSnapshot,
  packetId: string,
  locale: GuideLocale,
  specification?: PacketSpecification
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
  /*
   * The case number, from the fact the ROUTE DECLARES. One id, not a search.
   *
   * This read `cause_number` alone, and Mississippi non-conviction calls it
   * `case_number` -- so the cover printed "Not established for this route - ask
   * the clerk or filing office" for the number printed on every pleading behind
   * it, in the participant's own hands.
   *
   * The first repair tried `case_number`, then `cause_number`, then
   * `docket_number`, and took whichever the snapshot answered. That is a better
   * guess and still a guess: a matter carrying two of them for unrelated
   * reasons would have its cover decided by the order someone happened to write
   * the list in. `specificationCaseIdentifierFactId` asks the route instead --
   * its caption contract where it draws one, else the id it declares -- and a
   * route that declares none gets the honest "not established" line.
   */
  const declaredCaseIdentifier = specification
    ? specificationCaseIdentifierFactId(specification)
    : undefined;
  const caseNumber = declaredCaseIdentifier ? plain(declaredCaseIdentifier) : null;

  return {
    preparedFor: plain("participant_full_legal_name"),
    preparedOn: participantGuideDate(snapshot.verifiedAt, locale),
    jurisdiction: snapshot.jurisdiction ?? null,
    courtOrAgency: plain("court_name"),
    caseOrMatter: caseNumber,
    /*
     * The route's own label, not its id. `pathwayId` is a slug --
     * "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal" --
     * and printing it under REMEDY put a URL fragment on the cover of a legal
     * packet. The specification carries the sentence a person wrote.
     */
    /*
     * The remedy in the packet's own language.
     *
     * It printed `pathwayId` -- a slug -- until this was corrected, and then
     * printed the English label on a Spanish cover, because the specification
     * carried no Spanish one. A reviewer writes `pathwayLabelEs`; where none
     * exists the field is null and the renderer says the remedy is not
     * established in this language, rather than printing English on a Spanish
     * page or inventing a legal translation here.
     */
    remedy: locale === "es"
      ? specification?.pathwayLabelEs ?? null
      : specification?.pathwayLabel ?? null,
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
