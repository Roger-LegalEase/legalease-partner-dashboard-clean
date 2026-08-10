// The render worker.
//
// Runs outside the request path — in a container, or locally under
// scripts/rcap-render-worker.mjs — and is trusted with nothing that determines
// the output: it claims a job the server issued, renders from server-derived
// facts, uploads to the private bucket, re-reads the exact stored bytes, and
// hands both hash sets to the canonical finalization transaction. Every
// mutation it performs presents the claim's fencing token, so a superseded or
// expired claimant can do nothing.
//
// Delivery is not here, on purpose. The worker's token is never authority to
// issue or record delivery; that belongs to the authenticated download route.
//
// Crash idempotence: a crash at any boundary leaves a job the lifecycle
// recovers — an expired claim is released or failed retryably, a re-render of
// the same input converges on the same artifact identity, an upload that finds
// its object already present re-reads and verifies instead of duplicating, and
// a finalization retry after a committed transaction returns the recorded
// outcome without consuming anything further.
//
// All dependencies are injectable so verifiers can exercise every failure
// boundary; the defaults are the production implementations.

import { createHash } from "node:crypto";
import {
  assertClaimAcceptable,
  buildArtifactStoragePath,
  RenderContractError,
  sha256,
  validateRenderOutput,
  computeNormalizedFingerprint,
  type RenderJobClaim
} from "@/lib/rcap/render/job-contract";
import type { PacketArtifactStorage } from "@/lib/rcap/render/artifact-storage";
import type { FinalizeOutcome } from "@/lib/rcap/render/job-queue";

export type WorkerQueuePort = {
  claim(workerId: string, rendererKinds: string[], claimSeconds: number): Promise<RenderJobClaim | null>;
  startRender(jobId: string, fencingToken: string): Promise<boolean>;
  startValidation(jobId: string, fencingToken: string): Promise<boolean>;
  fail(jobId: string, fencingToken: string, errorCode: string, errorDetail: string, retryable: boolean): Promise<string | null>;
  finalize(input: {
    jobId: string;
    fencingToken: string;
    outputStoragePath: string;
    localSha256: string;
    localNormalizedSha256: string;
    storedSha256: string;
    storedNormalizedSha256: string;
    outputByteCount: number;
    outputPageCount: number;
    containerDigest: string;
  }): Promise<FinalizeOutcome | null>;
  releaseExpired(): Promise<number>;
  requeueRetryable(): Promise<number>;
};

export type WorkerRenderPort = {
  /** Renders the packet for a claim from server-held data only. */
  render(claim: RenderJobClaim): Promise<Buffer>;
};

export type WorkerAllowlists = {
  allowedSourceShas: ReadonlySet<string>;
  knownProfileVersions: ReadonlySet<string>;
  supportedRendererKinds: ReadonlySet<string>;
};

export type RenderWorkerDeps = {
  queue: WorkerQueuePort;
  storage: PacketArtifactStorage;
  renderer: WorkerRenderPort;
  allowlists: WorkerAllowlists;
  workerId: string;
  containerDigest: string;
  claimSeconds?: number;
};

export type WorkerCycleResult =
  | { outcome: "idle" }
  | { outcome: "finalized"; jobId: string; accountingResult: string; deliveryEligibility: string }
  | { outcome: "failed"; jobId: string; errorCode: string; disposition: string | null };

/**
 * One full claim-to-finalize cycle. Housekeeping first (expired leases, due
 * retries), then at most one job.
 */
export async function runWorkerCycle(deps: RenderWorkerDeps): Promise<WorkerCycleResult> {
  if (!deps.containerDigest.trim()) {
    throw new Error("The worker refuses to run without a container digest to record on its artifacts.");
  }

  await deps.queue.releaseExpired();
  await deps.queue.requeueRetryable();

  const claim = await deps.queue.claim(
    deps.workerId,
    [...deps.allowlists.supportedRendererKinds],
    deps.claimSeconds ?? 600
  );
  if (!claim) return { outcome: "idle" };

  // The claim came from the server's atomic claim function, so its id is
  // server-issued by construction; everything else is checked against the
  // server-held allowlists before any work happens.
  try {
    assertClaimAcceptable(claim, {
      knownJobIds: new Set([claim.id]),
      allowedSourceShas: deps.allowlists.allowedSourceShas,
      knownProfileVersions: deps.allowlists.knownProfileVersions,
      supportedRendererKinds: deps.allowlists.supportedRendererKinds
    });
  } catch (error) {
    const code = error instanceof RenderContractError ? error.errorCode : "render_failed";
    const disposition = await deps.queue.fail(claim.id, claim.fencingToken, code, String(error), false);
    return { outcome: "failed", jobId: claim.id, errorCode: code, disposition };
  }

  try {
    const started = await deps.queue.startRender(claim.id, claim.fencingToken);
    if (!started) {
      return { outcome: "failed", jobId: claim.id, errorCode: "job_not_claimable", disposition: null };
    }

    // Render to a local buffer (the "temporary local artifact"): nothing is
    // uploaded before the local output validates.
    const bytes = await deps.renderer.render(claim);
    const local = await validateRenderOutput(
      { jobId: claim.id, bytes, containerDigest: deps.containerDigest },
      { expectedPageSize: { width: 612, height: 792 } }
    );
    if (!local.ok) {
      const disposition = await deps.queue.fail(claim.id, claim.fencingToken, local.errorCode, local.detail, true);
      return { outcome: "failed", jobId: claim.id, errorCode: local.errorCode, disposition };
    }

    const validationStarted = await deps.queue.startValidation(claim.id, claim.fencingToken);
    if (!validationStarted) {
      return { outcome: "failed", jobId: claim.id, errorCode: "job_not_claimable", disposition: null };
    }

    const storagePath = buildArtifactStoragePath({
      partnerId: claim.partnerId,
      matterId: claim.matterId,
      jobId: claim.id,
      outputSha256: local.outputSha256
    });

    const uploaded = await deps.storage.upload(storagePath, bytes);
    if (!uploaded.ok && !/exists|duplicate|409/i.test(uploaded.reason)) {
      const disposition = await deps.queue.fail(claim.id, claim.fencingToken, "storage_write_failed", uploaded.reason, true);
      return { outcome: "failed", jobId: claim.id, errorCode: "storage_write_failed", disposition };
    }
    // An already-present object is a crashed previous attempt of this same
    // content-addressed path; the re-read below decides whether it is the
    // artifact or garbage.

    const stored = await deps.storage.read(storagePath);
    if (!stored) {
      const disposition = await deps.queue.fail(claim.id, claim.fencingToken, "storage_readback_failed", "stored object missing on re-read", true);
      return { outcome: "failed", jobId: claim.id, errorCode: "storage_readback_failed", disposition };
    }

    const storedSha = sha256(stored);
    let storedNormalized: string;
    try {
      storedNormalized = await computeNormalizedFingerprint(stored);
    } catch {
      // Unparseable stored bytes can never finalize; hand the database a
      // fingerprint that cannot match so the checksum gate fails closed.
      storedNormalized = sha256(Buffer.concat([stored, Buffer.from("unparseable")]));
    }

    const outcome = await deps.queue.finalize({
      jobId: claim.id,
      fencingToken: claim.fencingToken,
      outputStoragePath: storagePath,
      localSha256: local.outputSha256,
      localNormalizedSha256: local.normalizedOutputSha256,
      storedSha256: storedSha,
      storedNormalizedSha256: storedNormalized,
      outputByteCount: local.byteCount,
      outputPageCount: local.pageCount,
      containerDigest: deps.containerDigest
    });

    if (!outcome) {
      return { outcome: "failed", jobId: claim.id, errorCode: "render_failed", disposition: null };
    }
    return {
      outcome: "finalized",
      jobId: claim.id,
      accountingResult: outcome.accountingResult,
      deliveryEligibility: outcome.deliveryEligibility
    };
  } catch (error) {
    const disposition = await deps.queue.fail(
      claim.id,
      claim.fencingToken,
      "render_failed",
      error instanceof Error ? error.message : String(error),
      true
    );
    return { outcome: "failed", jobId: claim.id, errorCode: "render_failed", disposition };
  }
}

/** A stable digest for uncontainerized local runs; containers set their own. */
export function localContainerDigest(seed: string) {
  return `local:${createHash("sha256").update(seed).digest("hex").slice(0, 32)}`;
}
