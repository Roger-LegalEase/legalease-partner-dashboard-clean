import "server-only";

// Authorized packet delivery.
//
// This is the whole of the download decision, separated from the HTTP route so
// the identical logic is exercised end-to-end by the delivery verifier. The
// route wraps it with the repository's session auth; nothing here trusts the
// caller — every fact is re-derived from the database and storage.
//
// Delivery-event semantics:
//   delivery_authorized     authorization passed and the stored object was
//                           opened and hash-verified
//   transmission_started    the response stream began producing bytes
//   transmission_completed  the stream closed cleanly, without source error,
//                           response error, or observed client abort
//   transmission_aborted    the client went away mid-stream
//   transmission_failed     the pipeline broke for any other reason
// headersSent alone is never evidence, server stream completion never implies
// a human opened or saved the file, and repeat transmission consumes nothing.

import { isDeliverable, sha256, type DeliveryEventType } from "@/lib/rcap/render/job-contract";
import type { PacketArtifactStorage } from "@/lib/rcap/render/artifact-storage";
import type { RenderJobRow } from "@/lib/rcap/render/job-queue";
import { governPacketDownloadAdmission } from "@/lib/rcap/render/commercial-admission";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";

export type DeliveryPorts = {
  getJob(jobId: string): Promise<RenderJobRow | null>;
  /** True only when this authenticated user owns the briefcase item the job serves. */
  userOwnsBriefcaseItem(userId: string, briefcaseItemId: string): Promise<boolean>;
  /**
   * The consumer briefcase item's CURRENT final verification, read server-side.
   *
   * This is deliberately the live record rather than a hash snapshotted onto the
   * job row at enqueue: a verification that was current when the job was queued
   * is not evidence that it is current now, and a material edit since then must
   * close the door. Returning null denies.
   */
  getCurrentVerification?(consumerBriefcaseItemId: string): Promise<{
    snapshot: PacketVerificationSnapshot;
    hash: string;
    ownerUserId: string;
    matterId: string;
    alreadyDownloaded: boolean;
  } | null>;
  storage: PacketArtifactStorage;
  recordEvent(input: {
    jobId: string;
    eventType: DeliveryEventType;
    actorUserId: string | null;
    requestContext?: Record<string, unknown>;
  }): Promise<string | null>;
};

export type DeliveryDecision =
  | { ok: true; job: RenderJobRow; bytes: Buffer; filename: string }
  | { ok: false; status: number; code: string; message: string };

/**
 * Authorization plus artifact integrity, in order, all fail-closed. Returns
 * the verified bytes; the caller streams them and reports stream fate.
 */
export async function authorizePacketDownload(
  ports: DeliveryPorts,
  input: { jobId: string; userId: string | null }
): Promise<DeliveryDecision> {
  // 1. Identity.
  if (!input.userId) {
    return { ok: false, status: 401, code: "unauthenticated", message: "Sign in to download your packet." };
  }
  if (!input.jobId || !/^[0-9a-f-]{36}$/i.test(input.jobId)) {
    return { ok: false, status: 404, code: "not_found", message: "This packet does not exist." };
  }

  // 2. Job identity.
  const job = await ports.getJob(input.jobId);
  if (!job) {
    return { ok: false, status: 404, code: "not_found", message: "This packet does not exist." };
  }

  // 3. Ownership. The briefcase item is the participant's durable claim to
  // this packet; a job without one is not served to anyone. Cross-partner and
  // cross-person requests die here without learning anything else about the job.
  if (!job.briefcaseItemId) {
    return { ok: false, status: 403, code: "unauthorized", message: "This packet is not available for download." };
  }
  const owns = await ports.userOwnsBriefcaseItem(input.userId, job.briefcaseItemId);
  if (!owns) {
    return { ok: false, status: 403, code: "unauthorized", message: "This packet is not available for download." };
  }

  // 4. Delivery eligibility — the accounting fact. A technically valid
  // artifact that is accounting-blocked (a lost cap race, a missing
  // entitlement) is refused here, before any storage read.
  if (!isDeliverable(job)) {
    return {
      ok: false,
      status: 409,
      code: "not_deliverable",
      message: "This packet is not ready to download."
    };
  }

  // 5. Artifact integrity, from the bytes, now. The stored path and hash are
  // claims; the object is the evidence. A missing object, a corrupted or
  // replaced object, or an object that is not this job's artifact all fail
  // closed with a recorded delivery_failed.
  if (!job.outputStoragePath || !job.outputSha256) {
    return { ok: false, status: 409, code: "artifact_missing", message: "This packet is not ready to download." };
  }
  if (!job.outputStoragePath.includes(job.id) || !job.outputStoragePath.includes(job.outputSha256)) {
    await ports.recordEvent({ jobId: job.id, eventType: "transmission_failed", actorUserId: input.userId, requestContext: { reason: "path_identity_mismatch" } });
    return { ok: false, status: 409, code: "artifact_identity_mismatch", message: "This packet could not be verified." };
  }
  const bytes = await ports.storage.read(job.outputStoragePath);
  if (!bytes) {
    await ports.recordEvent({ jobId: job.id, eventType: "transmission_failed", actorUserId: input.userId, requestContext: { reason: "object_missing" } });
    return { ok: false, status: 409, code: "artifact_unavailable", message: "This packet could not be retrieved." };
  }
  if (sha256(bytes) !== job.outputSha256) {
    await ports.recordEvent({ jobId: job.id, eventType: "transmission_failed", actorUserId: input.userId, requestContext: { reason: "hash_mismatch" } });
    return { ok: false, status: 409, code: "artifact_corrupt", message: "This packet could not be verified." };
  }
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    await ports.recordEvent({ jobId: job.id, eventType: "transmission_failed", actorUserId: input.userId, requestContext: { reason: "not_pdf" } });
    return { ok: false, status: 409, code: "artifact_corrupt", message: "This packet could not be verified." };
  }

  // 6. Grade-A commercial admission, through the ONE shared download treatment.
  //
  // Everything above is necessary and none of it is sufficient: denying
  // anonymous callers, wrong users, unclaimed jobs, accounting-blocked jobs and
  // substituted artifacts never asks whether this route was proven to deliver a
  // packet at all. This surface used to stop at those, which meant a route the
  // authority denies could still hand over bytes through a job id.
  //
  // It is placed last on purpose. The integrity checks above are cheap, local
  // and specific, and reaching this point means the object is genuinely this
  // job's artifact; refusing here is then a statement about commercial
  // authority rather than about the file.
  const exactIllinoisRoute = job.routeId === "IL:felony-prostitution-relief";
  if (ports.getCurrentVerification || exactIllinoisRoute) {
    // Sponsored enqueue deliberately has no consumer-payment binding. Its
    // participant-owned Briefcase item still supplies the current verification.
    const consumerItemId = job.consumerBriefcaseItemId ?? (exactIllinoisRoute ? job.briefcaseItemId : null);
    if (!consumerItemId) {
      return { ok: false, status: 403, code: "unauthorized", message: "This packet is not available for download." };
    }
    const current = await ports.getCurrentVerification?.(consumerItemId);
    if (!current) {
      // No current verification is a denial, not a pass. "We cannot see the
      // current verification" and "the verification is current" are different
      // statements.
      return { ok: false, status: 409, code: "verification_not_current", message: "This packet must be reviewed again before it can be downloaded." };
    }
    if (current.ownerUserId !== input.userId) {
      return { ok: false, status: 403, code: "unauthorized", message: "This packet is not available for download." };
    }
    if ((exactIllinoisRoute || `${current.snapshot.jurisdiction}:${current.snapshot.pathwayId}` === "IL:felony-prostitution-relief")
      && (job.routeId !== `${current.snapshot.jurisdiction}:${current.snapshot.pathwayId}` || job.matterId !== current.matterId)) {
      return { ok: false, status: 403, code: "route_binding_mismatch", message: "This packet is not available for download." };
    }
    try {
      governPacketDownloadAdmission({
        jurisdiction: current.snapshot.jurisdiction,
        pathwayId: current.snapshot.pathwayId,
        participantUserId: input.userId,
        matterId: current.matterId,
        matterOwnerUserId: current.ownerUserId,
        verificationSnapshot: current.snapshot,
        verificationHash: current.hash,
        artifactSha256: job.outputSha256,
        repeatDownload: current.alreadyDownloaded
      });
    } catch (error) {
      await ports.recordEvent({
        jobId: job.id,
        eventType: "transmission_failed",
        actorUserId: input.userId,
        requestContext: { reason: "commercial_admission_denied" }
      });
      return {
        ok: false,
        status: 403,
        code: "commercial_admission_denied",
        message: "This packet is not available for download.",
        ...(error instanceof Error ? {} : {})
      };
    }
  }

  return { ok: true, job, bytes, filename: packetDownloadFilename(job) };
}

/**
 * Wraps verified bytes in a Response whose stream fate is recorded honestly:
 * delivery_authorized after the object was opened and verified (that already
 * happened), transmission_started when the stream begins producing bytes,
 * transmission_completed only when it closes cleanly, transmission_aborted on
 * client cancel. A cancelled stream can never record transmission_completed:
 * the settled flag is flipped exactly once.
 */
export async function streamAuthorizedPacket(
  ports: DeliveryPorts,
  decision: Extract<DeliveryDecision, { ok: true }>,
  input: { userId: string; requestContext?: Record<string, unknown>; chunkSize?: number }
): Promise<Response> {
  const { job, bytes, filename } = decision;

  await ports.recordEvent({
    jobId: job.id,
    eventType: "delivery_authorized",
    actorUserId: input.userId,
    requestContext: input.requestContext
  });

  const CHUNK = input.chunkSize ?? 64 * 1024;
  let offset = 0;
  let settled = false;
  let transmitting = false;

  const body = new ReadableStream<Uint8Array>({
    pull: (controller) => {
      if (!transmitting) {
        transmitting = true;
        void ports.recordEvent({
          jobId: job.id,
          eventType: "transmission_started",
          actorUserId: input.userId,
          requestContext: input.requestContext
        });
      }
      if (offset < bytes.length) {
        controller.enqueue(new Uint8Array(bytes.subarray(offset, Math.min(offset + CHUNK, bytes.length))));
        offset += CHUNK;
        return;
      }
      controller.close();
      if (!settled) {
        settled = true;
        // The source produced every byte and the response accepted them.
        void ports.recordEvent({
          jobId: job.id,
          eventType: "transmission_completed",
          actorUserId: input.userId,
          requestContext: input.requestContext
        });
      }
    },
    cancel: () => {
      if (!settled) {
        settled = true;
        void ports.recordEvent({
          jobId: job.id,
          eventType: "transmission_aborted",
          actorUserId: input.userId,
          requestContext: input.requestContext
        });
      }
    }
  });

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(bytes.length),
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store, private"
    }
  });
}

export function packetDownloadFilename(job: RenderJobRow) {
  const base = job.routeId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "packet";
  return `${base}-packet.pdf`;
}
