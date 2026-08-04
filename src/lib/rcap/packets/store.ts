// Storage and repository ports for packet fulfillment, with two adapters.
//
// Supabase is the production adapter. A local adapter backed by the filesystem
// and an in-process map exists so the HTTP acceptance gate can run in CI, which
// has no Supabase credentials. The local adapter refuses to load in production,
// so it cannot become a silent fallback for a misconfigured deployment.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type FulfillmentStatus = "generating" | "ready" | "failed";

export type FulfillmentRecord = {
  fulfillmentId: string;
  requestKey: string;
  ownerId: string;
  jurisdiction: string;
  trackId: string;
  packetSetId: string;
  packetSetVersion: string;
  status: FulfillmentStatus;
  failureCode: string | null;
  briefcaseItemId: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredArtifactRecord = {
  fulfillmentId: string;
  componentId: string;
  role: string;
  order: number;
  objectPath: string;
  byteSize: number;
  checksumSha256: string;
  mimeType: string;
  fileName: string;
  pageCount: number | null;
  sourceIdentity: string;
  sourceSha256: string | null;
  rendererStrategy: string;
  rendererVersion: string;
  createdAt: string;
};

export interface PacketStoragePort {
  readonly name: string;
  put(objectPath: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(objectPath: string): Promise<Uint8Array>;
}

export interface PacketRepositoryPort {
  readonly name: string;
  findByRequestKey(requestKey: string): Promise<FulfillmentRecord | null>;
  findById(fulfillmentId: string): Promise<FulfillmentRecord | null>;
  create(record: FulfillmentRecord): Promise<FulfillmentRecord>;
  update(fulfillmentId: string, patch: Partial<FulfillmentRecord>): Promise<void>;
  saveArtifact(record: StoredArtifactRecord): Promise<void>;
  listArtifacts(fulfillmentId: string): Promise<readonly StoredArtifactRecord[]>;
  findArtifact(fulfillmentId: string, componentId: string): Promise<StoredArtifactRecord | null>;
}

export type PacketStoreContext = {
  storage: PacketStoragePort;
  repository: PacketRepositoryPort;
};

// ---------------------------------------------------------------------------
// Local adapter — filesystem + in-process map
// ---------------------------------------------------------------------------

const localFulfillments = new Map<string, FulfillmentRecord>();
const localByRequestKey = new Map<string, string>();
const localArtifacts = new Map<string, StoredArtifactRecord[]>();

function localRoot(): string {
  const configured = process.env.RCAP_PACKET_LOCAL_STORAGE_DIR;
  const dir = configured && configured.trim() ? configured : path.join(os.tmpdir(), "rcap-packet-artifacts");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const LocalPacketStorage: PacketStoragePort = {
  name: "local-filesystem",
  async put(objectPath, bytes) {
    assertSafeObjectPath(objectPath);
    // Test-only fault injection, so "storage failure leaves the packet
    // non-ready" can be proven over real HTTP rather than asserted.
    if (process.env.RCAP_PACKET_STORE_FAIL_WRITE === "true") {
      throw new Error("storage_write_failed");
    }
    const target = path.join(localRoot(), objectPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  },
  async get(objectPath) {
    assertSafeObjectPath(objectPath);
    const target = path.join(localRoot(), objectPath);
    if (!fs.existsSync(target)) throw new Error("artifact_not_found");
    return new Uint8Array(fs.readFileSync(target));
  }
};

export const LocalPacketRepository: PacketRepositoryPort = {
  name: "local-memory",
  async findByRequestKey(requestKey) {
    const id = localByRequestKey.get(requestKey);
    return id ? localFulfillments.get(id) ?? null : null;
  },
  async findById(fulfillmentId) {
    return localFulfillments.get(fulfillmentId) ?? null;
  },
  async create(record) {
    localFulfillments.set(record.fulfillmentId, record);
    localByRequestKey.set(record.requestKey, record.fulfillmentId);
    localArtifacts.set(record.fulfillmentId, []);
    return record;
  },
  async update(fulfillmentId, patch) {
    const existing = localFulfillments.get(fulfillmentId);
    if (!existing) return;
    localFulfillments.set(fulfillmentId, { ...existing, ...patch, updatedAt: new Date().toISOString() });
  },
  async saveArtifact(record) {
    const list = localArtifacts.get(record.fulfillmentId) ?? [];
    // Unique on (fulfillment, component): a retry replaces rather than duplicates.
    const without = list.filter((entry) => entry.componentId !== record.componentId);
    without.push(record);
    localArtifacts.set(record.fulfillmentId, without);
  },
  async listArtifacts(fulfillmentId) {
    return [...(localArtifacts.get(fulfillmentId) ?? [])].sort((a, b) => a.order - b.order);
  },
  async findArtifact(fulfillmentId, componentId) {
    return (localArtifacts.get(fulfillmentId) ?? []).find((entry) => entry.componentId === componentId) ?? null;
  }
};

/** Test-only. Clears local state between harness runs. */
export function resetLocalPacketStore(): void {
  localFulfillments.clear();
  localByRequestKey.clear();
  localArtifacts.clear();
}

// ---------------------------------------------------------------------------
// Supabase adapter
// ---------------------------------------------------------------------------

export const PACKET_ARTIFACT_BUCKET = "rcap-document-packets-private";

export const SupabasePacketStorage: PacketStoragePort = {
  name: "supabase-storage",
  async put(objectPath, bytes, contentType) {
    assertSafeObjectPath(objectPath);
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("storage_unavailable");
    const { error } = await client.storage
      .from(PACKET_ARTIFACT_BUCKET)
      .upload(objectPath, bytes, { contentType, cacheControl: "0", upsert: true });
    if (error) throw new Error("storage_write_failed");
  },
  async get(objectPath) {
    assertSafeObjectPath(objectPath);
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("storage_unavailable");
    const { data, error } = await client.storage.from(PACKET_ARTIFACT_BUCKET).download(objectPath);
    if (error || !data) throw new Error("artifact_not_found");
    return new Uint8Array(await data.arrayBuffer());
  }
};

export const SupabasePacketRepository: PacketRepositoryPort = {
  name: "supabase",
  async findByRequestKey(requestKey) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const { data } = await client
      .from("rcap_packet_fulfillments")
      .select("*")
      .eq("request_key", requestKey)
      .maybeSingle();
    return data ? fulfillmentFromRow(data as Record<string, unknown>) : null;
  },
  async findById(fulfillmentId) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const { data } = await client
      .from("rcap_packet_fulfillments")
      .select("*")
      .eq("id", fulfillmentId)
      .maybeSingle();
    return data ? fulfillmentFromRow(data as Record<string, unknown>) : null;
  },
  async create(record) {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("storage_unavailable");
    await client.from("rcap_packet_fulfillments").insert({
      id: record.fulfillmentId,
      request_key: record.requestKey,
      owner_id: record.ownerId,
      jurisdiction: record.jurisdiction,
      track_id: record.trackId,
      packet_set_id: record.packetSetId,
      packet_set_version: record.packetSetVersion,
      status: record.status,
      failure_code: record.failureCode,
      briefcase_item_id: record.briefcaseItemId
    });
    return record;
  },
  async update(fulfillmentId, patch) {
    const client = getSupabaseAdminClient();
    if (!client) return;
    await client
      .from("rcap_packet_fulfillments")
      .update({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.failureCode !== undefined ? { failure_code: patch.failureCode } : {}),
        updated_at: new Date().toISOString()
      })
      .eq("id", fulfillmentId);
  },
  async saveArtifact(record) {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("storage_unavailable");
    await client.from("rcap_packet_artifacts").upsert(
      {
        fulfillment_id: record.fulfillmentId,
        component_id: record.componentId,
        component_role: record.role,
        component_order: record.order,
        object_path: record.objectPath,
        byte_size: record.byteSize,
        checksum_sha256: record.checksumSha256,
        mime_type: record.mimeType,
        file_name: record.fileName,
        page_count: record.pageCount,
        source_identity: record.sourceIdentity,
        source_sha256: record.sourceSha256,
        renderer_strategy: record.rendererStrategy,
        renderer_version: record.rendererVersion
      },
      { onConflict: "fulfillment_id,component_id" }
    );
  },
  async listArtifacts(fulfillmentId) {
    const client = getSupabaseAdminClient();
    if (!client) return [];
    const { data } = await client
      .from("rcap_packet_artifacts")
      .select("*")
      .eq("fulfillment_id", fulfillmentId)
      .order("component_order", { ascending: true });
    return (data ?? []).map((row) => artifactFromRow(row as Record<string, unknown>));
  },
  async findArtifact(fulfillmentId, componentId) {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const { data } = await client
      .from("rcap_packet_artifacts")
      .select("*")
      .eq("fulfillment_id", fulfillmentId)
      .eq("component_id", componentId)
      .maybeSingle();
    return data ? artifactFromRow(data as Record<string, unknown>) : null;
  }
};

/**
 * Chooses the adapter pair.
 *
 * The local adapter is available only outside production and only when
 * explicitly requested, so a production deployment that loses its Supabase
 * configuration fails rather than quietly writing packets to a temp directory.
 */
export function resolvePacketStore(
  environment: Readonly<Record<string, string | undefined>> = process.env
): PacketStoreContext {
  const wantsLocal = environment.RCAP_PACKET_STORE_DRIVER?.trim().toLowerCase() === "local";
  if (wantsLocal) {
    if (environment.NODE_ENV === "production") {
      throw new Error("The local packet store driver is not permitted in production.");
    }
    return { storage: LocalPacketStorage, repository: LocalPacketRepository };
  }
  return { storage: SupabasePacketStorage, repository: SupabasePacketRepository };
}

function fulfillmentFromRow(row: Record<string, unknown>): FulfillmentRecord {
  return {
    fulfillmentId: String(row.id),
    requestKey: String(row.request_key),
    ownerId: String(row.owner_id),
    jurisdiction: String(row.jurisdiction),
    trackId: String(row.track_id),
    packetSetId: String(row.packet_set_id),
    packetSetVersion: String(row.packet_set_version),
    status: row.status as FulfillmentStatus,
    failureCode: row.failure_code == null ? null : String(row.failure_code),
    briefcaseItemId: String(row.briefcase_item_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function artifactFromRow(row: Record<string, unknown>): StoredArtifactRecord {
  return {
    fulfillmentId: String(row.fulfillment_id),
    componentId: String(row.component_id),
    role: String(row.component_role),
    order: Number(row.component_order),
    objectPath: String(row.object_path),
    byteSize: Number(row.byte_size),
    checksumSha256: String(row.checksum_sha256),
    mimeType: String(row.mime_type),
    fileName: String(row.file_name),
    pageCount: row.page_count == null ? null : Number(row.page_count),
    sourceIdentity: String(row.source_identity),
    sourceSha256: row.source_sha256 == null ? null : String(row.source_sha256),
    rendererStrategy: String(row.renderer_strategy),
    rendererVersion: String(row.renderer_version),
    createdAt: String(row.created_at)
  };
}

function assertSafeObjectPath(value: string): void {
  // The component segment allows underscores as well as hyphens. Component IDs
  // are the normalized legal-design component IDs, and those inherit the track
  // ID's separator — Mississippi's tracks are hyphenated, Maryland's are not.
  // Renaming a component to fit a storage path would break the one identifier
  // that ties an artifact back to its authority pin and its blocker-ledger row.
  // An underscore cannot form a traversal, and `..` is still refused outright.
  if (!/^packets\/[0-9a-f-]{36}\/[a-z0-9_-]+\.pdf$/i.test(value) || value.includes("..")) {
    throw new Error("invalid_object_path");
  }
}
