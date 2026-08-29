import "server-only";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  GRADE_A_AUTHORITY_SCHEMA_VERSION,
  GRADE_A_EVALUABLE_SCHEMA_VERSIONS,
  type AuthorityHistoryEntry,
  type GradeAFulfillmentRecord
} from "@/lib/rcap/fulfillment/grade-a-authority";

/**
 * The one canonical controlling registry of Grade-A fulfillment records.
 *
 * There is exactly one of these. Every runtime list, profile flag, admin view
 * and projection that says anything about commercial eligibility is generated
 * from this file and may not be authored independently — a second hand-written
 * list is a second authority, and two authorities is the failure this contract
 * exists to remove.
 *
 * Loading is fail-closed in both directions:
 *
 *   * a missing, unreadable or malformed registry binds no route, so every
 *     admission point sees UNSUPPORTED_ROUTE and denies;
 *   * a record that fails structural validation is dropped rather than repaired,
 *     because a half-understood authority record is not a weaker authority — it
 *     is an unknown one.
 *
 * Records are frozen on the way out. Two concurrent readers get the same frozen
 * object graph and neither can mutate what the other is evaluating.
 */

const REGISTRY_PATH = "data/rcap-grade-a/fulfillment-authority-registry.json";

export type RegistryLoadProblem = {
  recordId: string | null;
  problem: string;
};

export type GradeAFulfillmentRegistry = {
  schemaVersion: string;
  generatedFrom: string;
  /** Current (non-superseded) record per route, the only ones that decide. */
  current: ReadonlyMap<string, GradeAFulfillmentRecord>;
  /** Every version of every route, newest first, for audit reads. */
  history: ReadonlyMap<string, readonly GradeAFulfillmentRecord[]>;
  problems: readonly RegistryLoadProblem[];
};

const EMPTY_REGISTRY: GradeAFulfillmentRegistry = Object.freeze({
  schemaVersion: GRADE_A_AUTHORITY_SCHEMA_VERSION,
  generatedFrom: REGISTRY_PATH,
  current: new Map<string, GradeAFulfillmentRecord>(),
  history: new Map<string, readonly GradeAFulfillmentRecord[]>(),
  problems: Object.freeze([]) as readonly RegistryLoadProblem[]
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/**
 * The hash a history entry must carry: the record's own content with the history
 * chain itself removed. Excluding history is what makes the chain checkable —
 * a hash over a structure containing its own hash cannot be recomputed.
 */
export function fulfillmentRecordSha256(record: GradeAFulfillmentRecord): string {
  const content: Record<string, unknown> = { ...(record as unknown as Record<string, unknown>) };
  delete content.history;
  return crypto.createHash("sha256").update(stableStringify(content)).digest("hex");
}

/** Key-sorted JSON so a hash depends on content and never on key order. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.keys(value as Record<string, unknown>).sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
  return `{${entries.join(",")}}`;
}

const REQUIRED_TOP_LEVEL_KEYS = [
  "schemaVersion", "recordId", "routeId", "jurisdiction", "pathwayId", "packetFamilyId",
  "serviceDisposition", "version", "effectiveFrom", "supersededBy", "supersededAt",
  "revocation", "legalAuthority", "packetSpecification", "officialSources", "provider",
  "fixture", "artifactValidation", "visualReview", "outputLegalApproval",
  "finalVerification", "history"
];

/**
 * Structural validation only. Whether a record's proofs are sufficient is the
 * authority's question, not the loader's — a record that is well-formed and
 * proves nothing loads fine and then denies everything, which is the correct
 * behaviour and keeps the two concerns from blurring.
 */
export function validateRecordStructure(candidate: unknown): string[] {
  const problems: string[] = [];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return ["record is not an object"];
  }
  const record = candidate as Record<string, unknown>;

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in record)) problems.push(`missing required key ${key}`);
  }
  if (!GRADE_A_EVALUABLE_SCHEMA_VERSIONS.includes(record.schemaVersion as (typeof GRADE_A_EVALUABLE_SCHEMA_VERSIONS)[number])) {
    problems.push(`schemaVersion ${String(record.schemaVersion)} is not one of ${GRADE_A_EVALUABLE_SCHEMA_VERSIONS.join(", ")}`);
  }
  if (typeof record.version !== "number" || !Number.isInteger(record.version) || record.version < 1) {
    problems.push("version must be an integer >= 1");
  }
  if (typeof record.routeId !== "string" || !record.routeId.includes(":")) {
    problems.push("routeId must be <JURISDICTION>:<pathwayId>");
  } else if (typeof record.jurisdiction === "string" && !record.routeId.startsWith(`${record.jurisdiction}:`)) {
    problems.push(`routeId ${record.routeId} does not begin with jurisdiction ${record.jurisdiction}`);
  }
  if (!Array.isArray(record.officialSources)) problems.push("officialSources must be an array");
  if (!Array.isArray(record.history) || record.history.length === 0) {
    problems.push("history must be a non-empty array; an unattributed authority is a defect");
  }

  return problems;
}

/**
 * History is append-only and hash-chained. Each entry names the record hash it
 * produced and the hash it superseded, so a rewritten past shows up as a broken
 * link rather than as a plausible story.
 */
export function validateHistoryChain(record: GradeAFulfillmentRecord): string[] {
  const problems: string[] = [];
  const history = record.history as AuthorityHistoryEntry[];

  let previousHash: string | null = null;
  let previousVersion = 0;
  for (const entry of history) {
    if (entry.version <= previousVersion) {
      problems.push(`history version ${entry.version} does not increase from ${previousVersion}`);
    }
    if (entry.supersedesRecordSha256 !== previousHash) {
      problems.push(`history version ${entry.version} claims to supersede ${entry.supersedesRecordSha256 ?? "nothing"} but the previous entry produced ${previousHash ?? "nothing"}`);
    }
    if (!entry.changedBy || !String(entry.changedBy).trim()) {
      problems.push(`history version ${entry.version} has no changedBy; every authority change names who or what made it`);
    }
    if (!entry.reason || !String(entry.reason).trim()) {
      problems.push(`history version ${entry.version} has no reason`);
    }
    previousHash = entry.recordSha256;
    previousVersion = entry.version;
  }

  const last = history[history.length - 1];
  if (last) {
    if (last.version !== record.version) {
      problems.push(`the newest history entry is version ${last.version} but the record is version ${record.version}`);
    }
    const actual = fulfillmentRecordSha256(record);
    if (last.recordSha256 !== actual) {
      problems.push(`the newest history entry records hash ${last.recordSha256} but the record hashes to ${actual}`);
    }
  }

  return problems;
}

let cached: GradeAFulfillmentRegistry | null = null;

function loadFromDisk(): GradeAFulfillmentRegistry {
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(process.cwd(), REGISTRY_PATH), "utf8");
  } catch {
    return EMPTY_REGISTRY;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_REGISTRY;
  }

  return buildRegistry(parsed);
}

/**
 * Exported so a verifier can build a registry from a deliberately corrupted copy
 * and prove each structural rule bites, without writing that copy to disk.
 */
export function buildRegistry(parsed: unknown): GradeAFulfillmentRegistry {
  const document = parsed as { schemaVersion?: unknown; records?: unknown } | null;
  if (!document || typeof document !== "object" || !Array.isArray(document.records)) {
    return EMPTY_REGISTRY;
  }
  if (!GRADE_A_EVALUABLE_SCHEMA_VERSIONS.includes(document.schemaVersion as (typeof GRADE_A_EVALUABLE_SCHEMA_VERSIONS)[number])) {
    return EMPTY_REGISTRY;
  }

  const problems: RegistryLoadProblem[] = [];
  const byRoute = new Map<string, GradeAFulfillmentRecord[]>();
  const seenRecordIds = new Set<string>();

  for (const candidate of document.records) {
    const structural = validateRecordStructure(candidate);
    const record = candidate as GradeAFulfillmentRecord;
    const recordId = typeof record?.recordId === "string" ? record.recordId : null;

    if (structural.length > 0) {
      for (const problem of structural) problems.push({ recordId, problem });
      continue;
    }
    if (recordId && seenRecordIds.has(recordId)) {
      problems.push({ recordId, problem: "duplicate recordId" });
      continue;
    }
    const chain = validateHistoryChain(record);
    if (chain.length > 0) {
      for (const problem of chain) problems.push({ recordId, problem });
      continue;
    }
    if (recordId) seenRecordIds.add(recordId);

    const bucket = byRoute.get(record.routeId) ?? [];
    if (bucket.some((existing) => existing.version === record.version)) {
      problems.push({ recordId, problem: `duplicate version ${record.version} for route ${record.routeId}` });
      continue;
    }
    bucket.push(deepFreeze(record));
    byRoute.set(record.routeId, bucket);
  }

  const current = new Map<string, GradeAFulfillmentRecord>();
  const history = new Map<string, readonly GradeAFulfillmentRecord[]>();

  for (const [routeId, versions] of byRoute) {
    const ordered = [...versions].sort((a, b) => b.version - a.version);
    history.set(routeId, Object.freeze(ordered));

    const live = ordered.filter((record) => !record.supersededBy);
    if (live.length > 1) {
      // Two live versions is an ambiguous authority, and an ambiguous authority
      // is not a weaker one — it binds nothing.
      problems.push({ recordId: null, problem: `route ${routeId} has ${live.length} non-superseded versions; exactly one may be current` });
      continue;
    }
    if (live.length === 1) current.set(routeId, live[0]);
  }

  return Object.freeze({
    schemaVersion: GRADE_A_AUTHORITY_SCHEMA_VERSION,
    generatedFrom: REGISTRY_PATH,
    current,
    history,
    problems: Object.freeze(problems)
  });
}

export function loadFulfillmentRegistry(): GradeAFulfillmentRegistry {
  if (!cached) cached = loadFromDisk();
  return cached;
}

/** Test-only: drop the process cache so a verifier can reload after a fixture write. */
export function resetFulfillmentRegistryCache(): void {
  cached = null;
}

/** The current record for a route, or null. Null is the unsupported-route case. */
export function getCurrentFulfillmentRecord(routeId: string): GradeAFulfillmentRecord | null {
  return loadFulfillmentRegistry().current.get(routeId) ?? null;
}

export function listCurrentFulfillmentRecords(): readonly GradeAFulfillmentRecord[] {
  return Object.freeze([...loadFulfillmentRegistry().current.values()].sort((a, b) => a.routeId.localeCompare(b.routeId)));
}

export function getFulfillmentRecordHistory(routeId: string): readonly GradeAFulfillmentRecord[] {
  return loadFulfillmentRegistry().history.get(routeId) ?? Object.freeze([]);
}

export const GRADE_A_REGISTRY_PATH = REGISTRY_PATH;
