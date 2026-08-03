// Packet fulfillment lifecycle.
//
// The single rule: a packet becomes ready only after every required component
// has been rendered, parsed as a real PDF, and durably stored. A failure at
// rendering, parsing or storage leaves the packet non-ready.
//
// Idempotency is keyed on the request, so a retry returns the existing
// fulfillment rather than producing a second set of artifacts, a second
// Briefcase item, or a second usage count.

import crypto from "node:crypto";
import { assemblePacketPdf, type AssembledPacket } from "@/lib/rcap/packets/assemble";
import { renderPacketComponent } from "@/lib/rcap/packets/engines/index";
import { PacketRenderError } from "@/lib/rcap/packets/engines/types";
import { getPacketCapability } from "@/lib/rcap/jurisdictions/packet-capability";
import { RELIEF_TRACKS } from "@/lib/rcap/packets/registry";
import { resolvePacket, type PacketResolutionRequest, type ResolvedPacket } from "@/lib/rcap/packets/resolve";
import {
  resolvePacketStore,
  type FulfillmentRecord,
  type PacketStoreContext,
  type StoredArtifactRecord
} from "@/lib/rcap/packets/store";
import { isFilingPacketOutcome } from "@/lib/rcap/packets/types";

export type FulfillmentFailureCode =
  | "resolution_failed"
  | "not_runtime_enabled"
  | "render_failed"
  | "invalid_artifact"
  | "storage_failed";

export class PacketFulfillmentError extends Error {
  constructor(readonly code: FulfillmentFailureCode, message: string, readonly detail: Record<string, unknown> = {}) {
    super(message);
    this.name = "PacketFulfillmentError";
  }
}

export type FulfillmentResult = {
  fulfillmentId: string;
  status: FulfillmentRecord["status"];
  reused: boolean;
  jurisdiction: string;
  trackId: string;
  outputStrategy: ResolvedPacket["outputStrategy"];
  runtimeStatus: ResolvedPacket["runtimeStatus"];
  packetSetId: string;
  packetSetVersion: string;
  /** Where the participant goes to see this packet. */
  briefcaseItemId: string;
  destination: string;
  isFilingPacket: boolean;
  customerDeliverableDescription: string;
  components: readonly {
    componentId: string;
    role: string;
    order: number;
    fileName: string;
    pageCount: number | null;
    sourceIdentity: string;
    sourceSha256: string | null;
    rendererStrategy: string;
    downloadPath: string;
    warnings: readonly string[];
  }[];
};

export type FulfillmentRequest = PacketResolutionRequest & {
  ownerId: string;
  /** Stable across retries of the same logical request. */
  requestKey?: string;
  rootDir?: string;
  store?: PacketStoreContext;
};

export async function fulfillPacket(request: FulfillmentRequest): Promise<FulfillmentResult> {
  const store = request.store ?? resolvePacketStore();
  const rootDir = request.rootDir ?? process.cwd();

  // 1. Resolve capability, and 2. validate required inputs. Both happen inside
  // resolvePacket, which throws before anything is created.
  const resolved = resolvePacket(request);

  // A track that is not runtime enabled may only be fulfilled when it is an
  // explicitly permitted technical fixture. Even then, a stale source or a
  // deliberate disable still blocks: those are withdrawals of readiness, not
  // the absence of approval a fixture is allowed to stand in for.
  const blockedOutright =
    resolved.runtimeStatus === "stale_blocked" || resolved.runtimeStatus === "temporarily_disabled";
  const permittedFixture =
    resolved.track.technicalFixture && request.allowTechnicalFixtures === true && !blockedOutright;
  if (resolved.runtimeStatus !== "packet_ready" && resolved.runtimeStatus !== "guidance_ready" && !permittedFixture) {
    throw new PacketFulfillmentError("not_runtime_enabled", "This relief track is not enabled for generation.", {
      jurisdiction: resolved.track.jurisdiction,
      trackId: resolved.track.trackId,
      runtimeStatus: resolved.runtimeStatus
    });
  }

  const requestKey =
    request.requestKey?.trim() ||
    defaultRequestKey({
      ownerId: request.ownerId,
      jurisdiction: resolved.track.jurisdiction,
      trackId: resolved.track.trackId,
      packetSetVersion: resolved.packetSetVersion
    });

  // 3. Create or reuse the idempotent generation record.
  const existing = await store.repository.findByRequestKey(requestKey);
  if (existing && existing.status === "ready") {
    const artifacts = await store.repository.listArtifacts(existing.fulfillmentId);
    return describe(existing, resolved, artifacts, true);
  }

  const fulfillmentId = existing?.fulfillmentId ?? crypto.randomUUID();
  const briefcaseItemId = existing?.briefcaseItemId ?? crypto.randomUUID();
  const now = new Date().toISOString();

  if (!existing) {
    await store.repository.create({
      fulfillmentId,
      requestKey,
      ownerId: request.ownerId,
      jurisdiction: resolved.track.jurisdiction,
      trackId: resolved.track.trackId,
      packetSetId: resolved.packetSetId,
      packetSetVersion: resolved.packetSetVersion,
      // 4. Generating.
      status: "generating",
      failureCode: null,
      briefcaseItemId,
      createdAt: now,
      updatedAt: now
    });
  } else {
    await store.repository.update(fulfillmentId, { status: "generating", failureCode: null });
  }

  const stored: StoredArtifactRecord[] = [];
  const warningsByComponent = new Map<string, readonly string[]>();

  for (const component of resolved.components) {
    // 5. Render.
    let rendered;
    try {
      rendered = await renderPacketComponent({
        component,
        jurisdiction: resolved.track.jurisdiction,
        geography: resolved.geographicRestrictions.resolvedGeography,
        facts: request.facts ?? {},
        rootDir
      });
    } catch (error) {
      await store.repository.update(fulfillmentId, { status: "failed", failureCode: "render_failed" });
      if (error instanceof PacketRenderError) {
        throw new PacketFulfillmentError("render_failed", "A packet component could not be produced.", {
          componentId: component.componentId,
          renderCode: error.code
        });
      }
      throw new PacketFulfillmentError("render_failed", "A packet component could not be produced.", {
        componentId: component.componentId
      });
    }

    // 6 and 7. Validate bytes and MIME, and parse when the artifact is a PDF.
    if (
      rendered.mimeType !== "application/pdf" ||
      rendered.bytes.byteLength === 0 ||
      !rendered.validation.parsed ||
      !hasPdfSignature(rendered.bytes)
    ) {
      await store.repository.update(fulfillmentId, { status: "failed", failureCode: "invalid_artifact" });
      throw new PacketFulfillmentError("invalid_artifact", "A rendered component was not a readable PDF.", {
        componentId: component.componentId
      });
    }

    // 8. Store the immutable artifact.
    const objectPath = `packets/${fulfillmentId}/${component.componentId}.pdf`;
    try {
      await store.storage.put(objectPath, rendered.bytes, rendered.mimeType);
    } catch {
      await store.repository.update(fulfillmentId, { status: "failed", failureCode: "storage_failed" });
      throw new PacketFulfillmentError("storage_failed", "A packet component could not be stored.", {
        componentId: component.componentId
      });
    }

    // 9. Record source hash, renderer version and packet-set version.
    const record: StoredArtifactRecord = {
      fulfillmentId,
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      objectPath,
      byteSize: rendered.bytes.byteLength,
      checksumSha256: crypto.createHash("sha256").update(rendered.bytes).digest("hex"),
      mimeType: rendered.mimeType,
      fileName: rendered.fileName,
      pageCount: rendered.pageCount,
      sourceIdentity: rendered.sourceIdentity,
      sourceSha256: rendered.sourceSha256,
      rendererStrategy: rendered.rendererStrategy,
      rendererVersion: rendered.rendererVersion,
      createdAt: new Date().toISOString()
    };

    try {
      await store.repository.saveArtifact(record);
    } catch {
      await store.repository.update(fulfillmentId, { status: "failed", failureCode: "storage_failed" });
      throw new PacketFulfillmentError("storage_failed", "A packet component could not be recorded.", {
        componentId: component.componentId
      });
    }

    stored.push(record);
    warningsByComponent.set(component.componentId, rendered.warnings);
  }

  // 10. Ready, only now that every component is stored.
  await store.repository.update(fulfillmentId, { status: "ready", failureCode: null });
  const ready = (await store.repository.findById(fulfillmentId)) ?? {
    fulfillmentId,
    requestKey,
    ownerId: request.ownerId,
    jurisdiction: resolved.track.jurisdiction,
    trackId: resolved.track.trackId,
    packetSetId: resolved.packetSetId,
    packetSetVersion: resolved.packetSetVersion,
    status: "ready" as const,
    failureCode: null,
    briefcaseItemId,
    createdAt: now,
    updatedAt: new Date().toISOString()
  };

  return describe(ready, resolved, stored, false, warningsByComponent);
}

/** 13. Reads only what was stored. Never renders. */
export async function readStoredComponent(input: {
  fulfillmentId: string;
  componentId: string;
  store?: PacketStoreContext;
}): Promise<{ record: StoredArtifactRecord; bytes: Uint8Array } | null> {
  const store = input.store ?? resolvePacketStore();
  const record = await store.repository.findArtifact(input.fulfillmentId, input.componentId);
  if (!record) return null;
  const bytes = await store.storage.get(record.objectPath);
  return { record, bytes };
}

/**
 * 14. The participant's actual deliverable: one assembled PDF.
 *
 * Reads only what was durably stored and binds it in packet order. It never
 * renders, so an assembled packet can never contain a component the fulfilment
 * did not produce and store, and it never invents a component that failed.
 *
 * `caseReference` names the file. The review harness passes the synthetic case
 * number so a reviewer can tell two samples apart on disk. Runtime has no case
 * number to pass — participant facts are not persisted — so it falls back to a
 * short slice of the fulfilment id, which identifies the packet without
 * carrying anything about the person.
 */
export async function readAssembledPacket(input: {
  fulfillmentId: string;
  caseReference?: string;
  store?: PacketStoreContext;
}): Promise<AssembledPacket | null> {
  const store = input.store ?? resolvePacketStore();
  const record = await store.repository.findById(input.fulfillmentId);
  if (!record || record.status !== "ready") return null;

  const artifacts = await store.repository.listArtifacts(input.fulfillmentId);
  if (artifacts.length === 0) return null;

  const components = [];
  for (const artifact of [...artifacts].sort((a, b) => a.order - b.order)) {
    components.push({
      componentId: artifact.componentId,
      role: artifact.role,
      order: artifact.order,
      bytes: await store.storage.get(artifact.objectPath)
    });
  }

  const track = RELIEF_TRACKS.find(
    (entry) => entry.jurisdiction === record.jurisdiction && entry.trackId === record.trackId
  );
  const capability = getPacketCapability(record.jurisdiction);

  return assemblePacketPdf({
    jurisdiction: record.jurisdiction,
    jurisdictionName: capability?.name ?? record.jurisdiction,
    packetName: track?.assembledPacketName ?? record.packetSetId,
    caseReference: input.caseReference?.trim() || record.fulfillmentId.slice(0, 8),
    title: track?.assembledPacketTitle ?? `${record.jurisdiction} record-clearing packet`,
    components
  });
}

export async function getFulfillment(
  fulfillmentId: string,
  store: PacketStoreContext = resolvePacketStore()
): Promise<FulfillmentRecord | null> {
  return store.repository.findById(fulfillmentId);
}

function describe(
  record: FulfillmentRecord,
  resolved: ResolvedPacket,
  artifacts: readonly StoredArtifactRecord[],
  reused: boolean,
  warnings?: Map<string, readonly string[]>
): FulfillmentResult {
  return {
    fulfillmentId: record.fulfillmentId,
    status: record.status,
    reused,
    jurisdiction: record.jurisdiction,
    trackId: record.trackId,
    outputStrategy: resolved.outputStrategy,
    runtimeStatus: resolved.runtimeStatus,
    packetSetId: record.packetSetId,
    packetSetVersion: record.packetSetVersion,
    briefcaseItemId: record.briefcaseItemId,
    // 12. The destination for the exact Briefcase item.
    destination: `/briefcase/packets/${record.fulfillmentId}`,
    isFilingPacket: isFilingPacketOutcome(resolved.outputStrategy),
    customerDeliverableDescription: resolved.customerDeliverableDescription,
    components: [...artifacts]
      .sort((a, b) => a.order - b.order)
      .map((artifact) => ({
        componentId: artifact.componentId,
        role: artifact.role,
        order: artifact.order,
        fileName: artifact.fileName,
        pageCount: artifact.pageCount,
        sourceIdentity: artifact.sourceIdentity,
        sourceSha256: artifact.sourceSha256,
        rendererStrategy: artifact.rendererStrategy,
        downloadPath: `/api/rcap/packets/${record.fulfillmentId}/components/${artifact.componentId}`,
        warnings: warnings?.get(artifact.componentId) ?? []
      }))
  };
}

function defaultRequestKey(input: {
  ownerId: string;
  jurisdiction: string;
  trackId: string;
  packetSetVersion: string;
}): string {
  return crypto
    .createHash("sha256")
    .update([input.ownerId, input.jurisdiction, input.trackId, input.packetSetVersion].join("|"))
    .digest("hex");
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength > 5 &&
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
  );
}
