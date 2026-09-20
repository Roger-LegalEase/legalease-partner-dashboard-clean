// Executable render worker.
//
//   node scripts/rcap-render-worker.mjs --once        one cycle, then exit
//   node scripts/rcap-render-worker.mjs --loop        poll until stopped
//
// Runs against the Supabase stack named by the environment
// (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — staging or a local
// stack, never production credentials on a build machine). In a container,
// RCAP_WORKER_CONTAINER_DIGEST carries the image digest recorded on every
// artifact; local runs derive a stable local digest.
//
// The worker performs no network access during render: rendering is pure
// pdf-lib over server-held packet data. Storage and database traffic happen
// before and after the render step, never inside it.

import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { register } from "node:module";
import { resolveClaimSeconds, runRenderWorkerLoop } from "./lib/rcap-render-worker-loop.mjs";
const isExecutable = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isExecutable) register("./lib/ts-esm-loader.mjs", import.meta.url);

const { runWorkerCycle, localContainerDigest } = await import("../src/lib/rcap/render/render-worker.ts");
const queue = await import("../src/lib/rcap/render/job-queue.ts");
const { getPacketArtifactStorage } = await import("../src/lib/rcap/render/artifact-storage.ts");
const { renderRcapPacketPdf } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");
const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { PACKET_RENDERER_KIND } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");
const { isPersonalizedDeliveryRoute, renderPersonalizedClaim } = await import("../src/lib/rcap/render/personalized-packet.ts");

export async function renderClaimPacket(claim) {
  // A personalized route renders on the personalized path or it does not
  // render. renderPersonalizedClaim refuses loudly when the route's authority
  // is stale, missing or bound to bytes that moved; that refusal is the
  // correct outcome and it must reach the caller unconverted.
  if (isPersonalizedDeliveryRoute(claim.routeId)) return renderPersonalizedClaim(claim);

  /*
   * The invariant, asserted rather than assumed.
   *
   * Mississippi reached this line for real. Route membership used to depend on
   * the owner's paid-consumer successor decision still matching the
   * specification bytes, so when the §4.2 document-contract work moved those
   * bytes the route stopped being personalized and an MS claim arrived here --
   * at the legacy renderer, which AGENTS.md records as not an approved
   * commercial fulfillment path. No exception was thrown, because as far as
   * the dispatcher knew this was simply not a personalized route.
   *
   * Membership is now static, so this cannot recur by that route. The check
   * stays anyway: it costs one set lookup and it makes the next attempt to
   * make membership conditional fail here, loudly, instead of downgrading a
   * participant's packet quietly.
   */
  if (isPersonalizedDeliveryRoute(claim.routeId)) {
    throw new Error(
      `${claim.routeId} is a personalized delivery route and must never render through the legacy packet `
      + "renderer. If its fulfillment authority is unavailable, that is a refusal to be reported, not a "
      + "renderer to be substituted."
    );
  }

  const { getRcapDocumentPacket } = await import("../src/lib/rcap/documents/source-repository.ts");
  const packet = await getRcapDocumentPacket(claim.packetId);
  if (!packet) throw new Error(`packet ${claim.packetId} not found`);
  return renderRcapPacketPdf(packet, "full");
}

async function main() {
  const mode = process.argv.includes("--loop") ? "loop" : "once";
  const workerId = `${os.hostname()}-${process.pid}`;

  let claimSeconds;
  try {
    claimSeconds = resolveClaimSeconds();
  } catch (error) {
    console.error(`rcap-render-worker: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }

  const storage = getPacketArtifactStorage();
  if (!storage) {
    console.error("rcap-render-worker: Supabase is not configured; the worker has no storage or queue to run against.");
    process.exit(2);
  }

  const deps = {
    queue: {
      claim: (id, kinds, seconds) => queue.claimNextRenderJob(id, kinds, seconds),
      startRender: (jobId, token) => queue.startRender(jobId, token),
      startValidation: (jobId, token) => queue.startValidation(jobId, token),
      fail: (jobId, token, code, detail, retryable) => queue.failRenderJob(jobId, token, code, detail, retryable),
      finalize: (input) => queue.finalizeRenderJob(input),
      releaseExpired: () => queue.releaseExpiredRenderClaims(),
      requeueRetryable: () => queue.requeueRetryableRenderJobs()
    },
    storage,
    renderer: { render: renderClaimPacket },
    allowlists: {
      // packet_document_v1 composes its own document and carries no source
      // binary; a job naming a source SHA is outside this worker's authority.
      allowedSourceShas: new Set(),
      knownProfileVersions: new Set(getAllJurisdictionProfiles().map((profile) => String(profile.profileVersion))),
      supportedRendererKinds: new Set([PACKET_RENDERER_KIND])
    },
    workerId,
    containerDigest: process.env.RCAP_WORKER_CONTAINER_DIGEST ?? localContainerDigest(workerId),
    claimSeconds
  };

  if (mode === "once") {
    const result = await runWorkerCycle(deps);
    console.log(JSON.stringify(result));
    return;
  }
  console.log(`rcap-render-worker ${workerId} polling; SIGTERM/SIGINT drains and stops`);
  await runRenderWorkerLoop({ runCycle: () => runWorkerCycle(deps), idleDelayMs: 3000 });
  process.exit(0);
}

if (isExecutable) await main();
