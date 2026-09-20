import "server-only";

import { createHash } from "node:crypto";

import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";
import {
  composablePacketSpecificationFor,
  packetSpecificationForTrack,
  type PacketSpecification
} from "@/lib/rcap/grade-a/packet-specification";
import { composeGradeAPacket, GradeAPacketCompositionError, planIncludedDocuments } from "@/lib/rcap/grade-a/composer";

/**
 * Render preflight: proving, before the participant is charged, that the exact
 * verified matter can actually produce the exact packet.
 *
 * The Product Contract already refuses Checkout without a current final
 * verification, and that verification proves the ROUTE is still right. It does
 * not prove the packet is RENDERABLE: a matter can hold a complete, consistent,
 * correctly routed fact set and still be missing something one of the
 * specification's documents reads, or be bound to a specification whose legal
 * sections are not decided. Discovering either after payment means taking $50
 * and then failing to deliver, which is the one outcome the pre-payment
 * completeness boundary exists to prevent.
 *
 * So this runs the real composer over the real verified facts and throws the
 * result away. It is not a deliverable and cannot become one:
 *
 *   - nothing is persisted, stored or uploaded;
 *   - no entitlement, payment record or packet credit is touched;
 *   - no artifact id, download path or private URL is produced;
 *   - the composed value is discarded inside this function and never returned.
 *
 * What is returned is a verdict and a hash of the canonical render input, so
 * the thing the participant paid against can be compared with the thing that is
 * later rendered. The hash is derived from the verified snapshot rather than
 * stored beside it, so it cannot drift away from the facts it describes: if the
 * snapshot changes the hash changes, and the render refuses.
 */

export type RenderPreflightReadyDetail = {
  renderInputHash: string;
  routeKey: string;
  specificationId: string;
  specificationVersion: string;
  packetFamily: string;
  trackId: string;
  documentIds: string[];
  factIds: string[];
};

export type RenderPreflightOutcome =
  | ({ ready: true } & RenderPreflightReadyDetail)
  | { ready: false; reason: string; missingFactIds: string[] };

export type RenderPreflightInput = {
  snapshot: PacketVerificationSnapshot;
  verificationHash: string;
  /**
   * Every fact the verified snapshot holds, from all four of its fact maps.
   * Typed loosely because the snapshot is jsonb: each value is flattened to
   * the single string the composer reads, and anything that flattens to
   * nothing is simply absent, which the composer then refuses on.
   */
  facts: Readonly<Record<string, unknown>>;
};

export function renderPreflightRouteKey(snapshot: PacketVerificationSnapshot) {
  return `${snapshot.jurisdiction}:${snapshot.pathwayId ?? ""}`;
}

/**
 * The canonical render input: exactly what the renderer will be given, in a
 * stable order, with the identity of the thing being rendered alongside it.
 *
 * The facts are included by value. Two matters with the same route and the
 * same specification but different answers are different render inputs, which
 * is the whole point — the hash names what the participant bought.
 */
function canonicalRenderInput(input: {
  routeKey: string;
  specification: PacketSpecification;
  verificationHash: string;
  facts: Record<string, string>;
  documentIds: string[];
}) {
  return {
    schemaVersion: "expungement-ai/render-input/v1",
    routeKey: input.routeKey,
    specificationId: input.specification.specificationId,
    specificationVersion: input.specification.specificationVersion,
    specificationSha256: input.specification.specificationSha256 ?? "",
    packetFamily: input.specification.packetFamily,
    trackId: input.specification.trackId,
    documentIds: [...input.documentIds].sort(),
    verificationHash: input.verificationHash,
    facts: Object.fromEntries(Object.keys(input.facts).sort().map((id) => [id, input.facts[id]]))
  };
}

export function renderInputHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Flatten an answer to the single string the composer reads. */
function factText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ").trim();
  if (typeof value === "object") return String((value as { value?: unknown }).value ?? "").trim();
  return String(value).trim();
}

/**
 * Run the preflight. Every refusal names what is missing rather than reporting
 * a bare failure, because the participant is about to be told either that they
 * may pay or that they may not.
 */
export function renderPreflight(input: RenderPreflightInput): RenderPreflightOutcome {
  const routeKey = renderPreflightRouteKey(input.snapshot);
  if (!input.snapshot.pathwayId) {
    return { ready: false, reason: "no_pathway_bound", missingFactIds: [] };
  }
  if (!input.verificationHash) {
    return { ready: false, reason: "no_verification_hash", missingFactIds: [] };
  }

  // The exact commercial packet family and document set, by route AND by the
  // server-owned track. A route match alone is not enough where two
  // legal-design tracks share a runtime pathway.
  const trackId = String(input.snapshot.selectedTrackId ?? "").trim();
  const composable = composablePacketSpecificationFor(routeKey);
  if (!composable) {
    // Either no specification is registered for this route, or its legal
    // sections are not decided. Both are holds, and neither may be discovered
    // after payment.
    return { ready: false, reason: "no_composable_specification_for_route", missingFactIds: [] };
  }
  if (!trackId || !packetSpecificationForTrack(routeKey, trackId)) {
    // A route match alone is not enough where two legal-design tracks share a
    // runtime pathway: the specification must also name the server-owned track
    // this matter was verified against.
    return { ready: false, reason: "specification_track_mismatch", missingFactIds: [] };
  }
  const specification: PacketSpecification = composable;

  const facts: Record<string, string> = {};
  for (const [id, value] of Object.entries(input.facts)) {
    const text = factText(value);
    if (text) facts[id] = text;
  }

  /*
   * THE PLANNER DECIDES THIS, not a second copy of its rule.
   *
   * `documentIds` goes into the render-input hash, which is what names the
   * thing the participant bought. A list built here by re-implementing the
   * include rule is a promise about a packet this file has not composed, and
   * the two had already drifted: this filter counted `required` plus one named
   * `includeWhen`, so a component selected by any OTHER condition -- South
   * Dakota's enforcement motion, for one -- was composed into the packet and
   * absent from the hash that was supposed to describe it. Adding a third
   * requirement would have widened that gap rather than closing it.
   *
   * So the question is asked once, of the function that answers it for the
   * composer too.
   */
  const documentIds = planIncludedDocuments(specification, facts)
    .included.map((document) => document.documentId);

  try {
    // The real composition, over the real facts. The value is deliberately not
    // captured: this call is a question ("would the renderer accept this?"),
    // not a production step, and nothing downstream may reach its output.
    composeGradeAPacket(specification, {
      routeKey,
      jurisdiction: input.snapshot.jurisdiction,
      pathwayId: input.snapshot.pathwayId,
      facts,
      verificationHash: input.verificationHash,
      verifiedAt: input.snapshot.verifiedAt,
      generationPurpose: "participant_delivery"
    });
  } catch (error) {
    if (error instanceof GradeAPacketCompositionError) {
      // Two different refusals wear the same error type: a fact is absent, or
      // the facts are present but the route's own rules reject them. Telling
      // them apart matters, because one is answered by collecting more and the
      // other by correcting what was collected.
      return error.missingFactIds.length > 0
        ? { ready: false, reason: "render_input_incomplete", missingFactIds: [...error.missingFactIds].sort() }
        : { ready: false, reason: `render_input_invalid: ${error.message}`, missingFactIds: [] };
    }
    return { ready: false, reason: "renderer_refused_input", missingFactIds: [] };
  }

  const canonical = canonicalRenderInput({
    routeKey,
    specification,
    verificationHash: input.verificationHash,
    facts,
    documentIds
  });

  return {
    ready: true,
    renderInputHash: renderInputHash(canonical),
    routeKey,
    specificationId: specification.specificationId,
    specificationVersion: specification.specificationVersion,
    packetFamily: specification.packetFamily,
    trackId: specification.trackId,
    documentIds: [...documentIds].sort(),
    factIds: Object.keys(facts).sort()
  };
}

/**
 * READY_TO_PURCHASE.
 *
 * Checkout does not open because a questionnaire reached 100%. It opens
 * because this exact matter is ready to be bought: the owner and the matter
 * are confirmed, the route still verifies, and the packet the money is for can
 * actually be produced from the facts the verification is bound to.
 */
export type ReadyToPurchase =
  | { ready: true; renderInputHash: string; detail: RenderPreflightReadyDetail }
  | { ready: false; reason: string; missingFactIds: string[] };

export function readyToPurchase(input: RenderPreflightInput): ReadyToPurchase {
  const preflight = renderPreflight(input);
  if (!preflight.ready) return preflight;
  const detail: RenderPreflightReadyDetail = {
    renderInputHash: preflight.renderInputHash,
    routeKey: preflight.routeKey,
    specificationId: preflight.specificationId,
    specificationVersion: preflight.specificationVersion,
    packetFamily: preflight.packetFamily,
    trackId: preflight.trackId,
    documentIds: preflight.documentIds,
    factIds: preflight.factIds
  };
  return { ready: true, renderInputHash: preflight.renderInputHash, detail };
}

export class ConsumerCheckoutRenderPreflightError extends Error {
  constructor(readonly reason: string, readonly missingFactIds: string[]) {
    super(`this matter is not ready to purchase: ${reason}`);
    this.name = "ConsumerCheckoutRenderPreflightError";
  }
}
