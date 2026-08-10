// Isolated packet render worker.
//
// Runs outside Vercel, in a container. Every external capability it needs is
// injected as a port, so this module performs no I/O of its own and can be
// exercised end to end against fakes. It also means the module is safe to
// import before phase-49 is applied: nothing here touches a table until
// runRenderJobOnce is actually called with a real queue port.
//
// Order of operations is the whole point of the file:
//
//   claim -> guard inputs -> render -> write -> READ BACK -> validate -> mark
//
// The read-back is not ceremony. Validating the buffer you just produced proves
// only that you produced it; validating bytes fetched back out of storage
// proves the object exists and is retrievable, which is what "ready" has to
// mean. The current generate path skips all of this and reports ready from an
// in-memory string.
//
// This worker never moves credit. Credit is consumed by
// consume_rcap_packet_credit(), which independently re-checks that the job
// reached artifact_validated with a stored checksum. A worker bug therefore
// cannot spend a partner's allocation.

import {
  guardRenderInputs,
  mayConsumeCredit,
  shouldRetry,
  validateRenderedPdf,
  type RenderJob,
  type RenderJobErrorCode
} from "./job-contract";

/** Queue operations. Backed by packet_render_jobs in production. */
export interface RenderQueuePort {
  /** Atomic claim. Returns null when nothing is claimable for these kinds. */
  claim(workerId: string, rendererKinds: readonly string[]): Promise<RenderJob | null>;
  /** Advance status. Implementations must let the database reject illegal moves. */
  transition(
    jobId: string,
    to: RenderJob["status"],
    patch?: Partial<
      Pick<
        RenderJob,
        "outputStoragePath" | "outputSha256" | "normalizedOutputSha256" | "pageCount" | "errorCode"
      >
    >
  ): Promise<void>;
}

/** Private object storage. No public URLs are ever produced. */
export interface RenderStoragePort {
  write(objectPath: string, bytes: Uint8Array): Promise<void>;
  /** Must fetch from storage, not return a cached buffer. */
  read(objectPath: string): Promise<Uint8Array>;
}

/** The renderer. Receives only server-derived facts; never caller input. */
export interface RendererPort {
  render(input: {
    job: RenderJob;
    sourceSha256: string;
    profileId: string;
    profileVersion: string;
  }): Promise<Uint8Array>;
  countPages(bytes: Uint8Array): number;
}

export interface HashPort {
  sha256(bytes: Uint8Array): string;
  /** Digest with harmless metadata variance normalized away. */
  normalizedSha256(bytes: Uint8Array): string;
}

export interface RenderWorkerConfig {
  workerId: string;
  rendererKinds: readonly string[];
  /** Digests the worker is permitted to render. Nothing else is accepted. */
  allowedSourceSha256: readonly string[];
  knownProfileVersions: Readonly<Record<string, readonly string[]>>;
  storageBucket: string;
  /** Expected page counts by profile id, where the profile pins one. */
  expectedPageCounts?: Readonly<Record<string, number>>;
}

export interface RenderWorkerPorts {
  queue: RenderQueuePort;
  storage: RenderStoragePort;
  renderer: RendererPort;
  hash: HashPort;
}

export type RenderWorkerOutcome =
  | { kind: "idle" }
  | { kind: "validated"; jobId: string; outputSha256: string; pageCount: number }
  | { kind: "failed"; jobId: string; errorCode: RenderJobErrorCode; requeued: boolean };

/**
 * Object path is derived entirely from server-held facts. No participant value,
 * caller-supplied name or user input contributes to it, so a crafted input
 * cannot steer a write outside the bucket prefix.
 */
export function renderObjectPath(job: Pick<RenderJob, "id" | "packetId">): string {
  return `packets/${job.packetId}/${job.id}.pdf`;
}

export async function runRenderJobOnce(
  config: RenderWorkerConfig,
  ports: RenderWorkerPorts
): Promise<RenderWorkerOutcome> {
  const job = await ports.queue.claim(config.workerId, config.rendererKinds);
  if (!job) return { kind: "idle" };

  const fail = async (errorCode: RenderJobErrorCode): Promise<RenderWorkerOutcome> => {
    // A retryable failure returns the job to the queue; a terminal one records
    // the reason and stops, rather than reproducing the same refusal forever.
    const requeue = shouldRetry(job, errorCode);
    await ports.queue.transition(job.id, "failed", { errorCode });
    if (requeue) await ports.queue.transition(job.id, "queued");
    return { kind: "failed", jobId: job.id, errorCode, requeued: requeue };
  };

  // Guard before rendering. An unwhitelisted source or unknown profile is
  // refused here, so nothing unrecognised ever reaches the renderer.
  const guard = guardRenderInputs({
    sourceSha256: job.sourceSha256,
    profileId: job.profileId,
    profileVersion: job.profileVersion,
    allowedSourceSha256: config.allowedSourceSha256,
    knownProfileVersions: config.knownProfileVersions
  });
  if (!guard.ok) return fail(guard.errorCode ?? "source_not_whitelisted");

  await ports.queue.transition(job.id, "rendering");

  let bytes: Uint8Array;
  try {
    bytes = await ports.renderer.render({
      job,
      sourceSha256: job.sourceSha256,
      profileId: job.profileId,
      profileVersion: job.profileVersion
    });
  } catch {
    return fail("render_failed");
  }

  const objectPath = `${config.storageBucket}/${renderObjectPath(job)}`;
  const expectedSha256 = ports.hash.sha256(bytes);

  try {
    await ports.storage.write(objectPath, bytes);
  } catch {
    return fail("storage_write_failed");
  }

  await ports.queue.transition(job.id, "validating");

  // Read back from storage. Validating the in-memory buffer would prove nothing
  // about whether the object landed or can be retrieved.
  let storedBytes: Uint8Array;
  try {
    storedBytes = await ports.storage.read(objectPath);
  } catch {
    return fail("storage_readback_failed");
  }

  const validation = validateRenderedPdf({
    bytes: storedBytes,
    expectedSha256,
    actualSha256: ports.hash.sha256(storedBytes),
    expectedPageCount: config.expectedPageCounts?.[job.profileId] ?? null,
    countPages: ports.renderer.countPages
  });
  if (!validation.ok) return fail(validation.errorCode ?? "invalid_pdf_output");

  await ports.queue.transition(job.id, "artifact_validated", {
    outputStoragePath: objectPath,
    outputSha256: expectedSha256,
    normalizedOutputSha256: ports.hash.normalizedSha256(storedBytes),
    pageCount: validation.pageCount ?? null
  });

  return {
    kind: "validated",
    jobId: job.id,
    outputSha256: expectedSha256,
    pageCount: validation.pageCount ?? 0
  };
}

/**
 * Re-asserts the credit gate at the point of use.
 *
 * The database function is the authority and re-checks independently; this is
 * the caller-side guard so an application path cannot reach credit consumption
 * with a job that has not been validated.
 */
export function assertCreditEligible(job: Pick<RenderJob, "status" | "outputStoragePath" | "outputSha256">): void {
  if (!mayConsumeCredit(job)) {
    throw new Error(
      "refusing to consume credit: render job has no validated stored artifact"
    );
  }
}
