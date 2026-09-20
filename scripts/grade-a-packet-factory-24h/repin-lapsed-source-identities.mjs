#!/usr/bin/env node
/**
 * RE-PIN A LAPSED SOURCE IDENTITY. GENERALLY, AND ONLY WHEN IT IS TRUE.
 *
 * A source receipt pins each committed record by whole-file SHA-256. A shared
 * record -- the legal-design track registry holds every track in the country --
 * is edited by unrelated work, and every receipt pinning that file lapses at
 * once. One correct single-track correction to a Colorado fee waiver demoted
 * twenty-one COMPLETE_PACKET_PROVEN families across twelve jurisdictions, none
 * of them Colorado. Terminal fell from 216 to 195. Not a byte of those packets,
 * not one of their own track entries, changed.
 *
 * The demotion is mechanically right and substantively spurious, and it will
 * recur on every shared-record correction the staged border remediation makes.
 *
 * WHAT THIS IS NOT. It is not a weakening of the pin. The whole-file SHA-256
 * stays exactly as strict as it was: no coarser digest, no excepted file, no
 * allowlist, no "shared records are exempt". The pin is the obligation. This
 * tool does the comparison the pin exists to force -- honestly, on recovered
 * bytes -- and records the result. Where the comparison fails it REFUSES, and
 * a refusal here is a correct outcome: the family's verification genuinely
 * lapsed on something that matters and it owes a fresh read.
 *
 * THE DOCTRINE IT SERVES. `onlyChangeIsAnIdentityRefresh()` in generate.mjs
 * reads a receipt as unmoved when the only change is an `identityRefresh`
 * block, and refuses a block whose `anchorsCompared` is 0 or whose
 * `anchorsCompared !== anchorsIdentical`. So a block may be written only after:
 *
 *   1. the blob carrying the OLD pin is RECOVERED FROM HISTORY -- never
 *      reconstructed, never approximated, never assumed to be "the parent
 *      commit". If it cannot be recovered, the family is not refreshed and
 *      this tool says why;
 *   2. the entries THIS FAMILY DEPENDS ON are extracted from both versions,
 *      decided from the family's own records rather than by string-matching its
 *      id across the file;
 *   3. those entries are compared object-for-object, order-independent, and
 *      counted.
 *
 * SHAPE, NOT NAMES. Receipts hold pins under at least five array names --
 * committedRecords, groundingRecords, committedLegalRecords, evidence,
 * heldFormComponents -- so every walk here keys on shape (an object with a
 * repository path and a sha256) via the shared walker in
 * scripts/rcap-packet-completeness/identity-refresh.mjs. Naming two of five
 * silently skipped every family pinning under the other three.
 *
 * A PATH WITH NO ADAPTER IS A REFUSAL, NOT A GUESS. Deciding which entries a
 * family depends on requires knowing how a record is structured. Each shared
 * record gets an adapter that says how to index it and how to read a family's
 * scope out of the family's own receipt. A drifted record with no adapter is
 * reported and refused; adding a record is adding one adapter, not relaxing a
 * rule.
 *
 * ALL OR NOTHING, PER FAMILY. A family whose receipt pins two drifted records
 * and gets one refreshed still lapses on the other, while now carrying a block
 * asserting it was repaired. generate.mjs records that exact failure ("three
 * families half-repaired and re-lapsing on the next run"). So every drifted pin
 * in a family must refresh, or none of them is written.
 *
 * A RE-PIN GRANTS NOTHING. It restores a family's identity proof. It approves
 * no packet, sets no verdict, opens no route, and carries no acceptance. The
 * block it writes is source-bound by construction and is checked against
 * annotationIsSourceBound() before it is written.
 *
 * Usage:
 *   node scripts/grade-a-packet-factory-24h/repin-lapsed-source-identities.mjs
 *   ... --apply                      write the receipts (default is dry-run)
 *   ... --family <id>                restrict to one family (repeatable)
 *   ... --report <path>              write the machine-readable run report
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { eachPin, annotationIsSourceBound } from "../rcap-packet-completeness/identity-refresh.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

export const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/** Deep key sort, so object-for-object comparison does not depend on key order. */
const sortDeep = (v) => Array.isArray(v) ? v.map(sortDeep)
  : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])])) : v);

/** The canonicalisation the existing receipts already declare, kept verbatim. */
export const CANONICALISATION = "keys sorted recursively, JSON.stringify with no spacing, one trailing newline, UTF-8";
export const canonical = (v) => `${JSON.stringify(sortDeep(v))}\n`;
export const canonicalSha256 = (v) => sha256(Buffer.from(canonical(v), "utf8"));

const isDigest = (d) => /^[0-9a-f]{64}$/.test(String(d ?? ""));

/** A refusal carries the reason a reader needs; it is never swallowed. */
export class Refusal extends Error {
  constructor(why, detail = null) { super(why); this.name = "Refusal"; this.why = why; this.detail = detail; }
}

const git = (args, { encoding = "utf8", maxBuffer = 1 << 28 } = {}) =>
  execFileSync("git", args, { cwd: ROOT, encoding, maxBuffer, stdio: ["ignore", "pipe", "pipe"] });

/* ------------------------------------------------------------------ *
 * Recover the blob carrying the old pin, from history, or refuse
 * ------------------------------------------------------------------ */

/*
 * Three ways a pin can be resolved back to bytes, tried in order of directness.
 * None of them reconstructs anything: every byte returned came out of the object
 * database, and every identifier reported here came out of a git command.
 *
 * A pin that resolves to nothing is not "probably the parent commit". It is
 * unrecoverable, and the family it belongs to is left lapsed.
 */
const recoveryCache = new Map();

export function recoverBytesByDigest(repoPath, digest) {
  const key = `${repoPath}\u0000${digest}`;
  if (recoveryCache.has(key)) return recoveryCache.get(key);
  const answer = recoverUncached(repoPath, digest);
  recoveryCache.set(key, answer);
  return answer;
}

function recoverUncached(repoPath, digest) {
  /* (1) The pin is itself a git object id. */
  if (/^[0-9a-f]{40}$/.test(digest)) {
    try {
      if (git(["cat-file", "-t", digest]).trim() === "blob") {
        const bytes = git(["cat-file", "blob", digest], { encoding: "buffer" });
        return { bytes, recovery: { method: "git cat-file blob <pin-is-a-blob-id>", blobId: digest } };
      }
    } catch { /* not an object here; fall through */ }
  }
  if (!isDigest(digest)) {
    return { bytes: null, why: `the pinned digest ${JSON.stringify(digest)} is neither a SHA-256 nor a git object id` };
  }

  /* (2) Every version of this path in history, newest first, deduplicated by
   *     blob id and hashed until one matches the pin. */
  let commits = [];
  try { commits = git(["rev-list", "--all", "--", repoPath]).split("\n").filter(Boolean); }
  catch { commits = []; }

  const seen = new Map();           // blobId -> first commit that carried it
  const order = [];
  for (const commit of commits) {
    let blobId = "";
    try { blobId = git(["rev-parse", `${commit}:${repoPath}`]).trim(); } catch { continue; }
    if (!/^[0-9a-f]{40}$/.test(blobId)) continue;
    if (!seen.has(blobId)) { seen.set(blobId, commit); order.push(blobId); }
  }
  let hashed = 0;
  for (const blobId of order) {
    let bytes;
    try { bytes = git(["cat-file", "blob", blobId], { encoding: "buffer" }); } catch { continue; }
    hashed += 1;
    if (sha256(bytes) === digest) {
      return {
        bytes,
        recovery: {
          method: "git rev-list --all -- <path>, deduplicated by blob id, each blob hashed until the pin matched",
          blobId,
          commit: seen.get(blobId),
          commitsWithThisPath: commits.length,
          distinctBlobs: order.length,
          blobsHashed: hashed
        }
      };
    }
  }
  return {
    bytes: null,
    why: `no version of ${repoPath} in this repository's history hashes to ${digest}`,
    searched: { commitsWithThisPath: commits.length, distinctBlobs: order.length, blobsHashed: hashed }
  };
}

/* ------------------------------------------------------------------ *
 * Adapters: how a shared record is indexed, and how a family's own
 * records name the entries it depends on
 * ------------------------------------------------------------------ */

const REGISTRY = "data/record-clearing/legal-design-track-registry.json";

/**
 * The legal-design track registry: global authority fields plus a `tracks`
 * array keyed by trackId.
 *
 * Scope is read from the family's OWN records, in this order of authority:
 *
 *   - the pin's `recordId`. The receipt states there, explicitly, which entries
 *     of this record it binds: `<prefix>:<trackId>[+<trackId>...]`, and a
 *     component may carry a sub-anchor (`me-seal-gen:maine-wide-packet-
 *     instruction`), so each component resolves by its longest `:`-prefix that
 *     is a real trackId. A component that resolves to nothing is a REFUSAL --
 *     the receipt names an entry the record does not have.
 *   - the receipt's `routeKeys`. `obligation:<mode>:<JUR>:<trackId>[:<pathway>]`
 *     for track-only and track-pathway routes; other modes (research-decision-
 *     route, runtime-contract-cohort) name a cohort or decision id at that
 *     position which is NOT a trackId. Those are recorded, not guessed at, and
 *     not silently dropped: the pathway or cohort they name lives inside a
 *     track object that is compared whole, or outside `tracks` altogether in
 *     the global metadata, which is also compared whole.
 *
 * This is deliberately not "find the family id in the file". The Maine
 * runtime-contract-cohort family binds track `me-seal-gen` and its id contains
 * `juvenile-sealing`, which is not a track at all; the Oklahoma family names
 * eight tracks across sixteen route keys. String-matching an id would get both
 * wrong in opposite directions.
 *
 * GLOBAL METADATA IS AN ANCHOR. Everything outside `tracks` -- the readiness
 * ceiling, the master-library authority, the plan of record -- is authority
 * every route reads, so it is compared as one anchor rather than assumed
 * irrelevant. If it moves, this refuses and names the fields. A tool that
 * quietly ignored it would let a change to the ceiling ride in under a re-pin.
 */
const registryAdapter = {
  recordPath: REGISTRY,
  describe: "committed legal-design track registry (global authority fields + tracks[] keyed by trackId)",

  index(doc, side) {
    if (!doc || typeof doc !== "object" || !Array.isArray(doc.tracks)) {
      throw new Refusal(`the ${side} registry has no tracks array; it is not the record this adapter describes`);
    }
    const byId = new Map();
    for (const t of doc.tracks) {
      const id = t?.trackId;
      if (typeof id !== "string") throw new Refusal(`the ${side} registry holds a track with no trackId`);
      if (byId.has(id)) throw new Refusal(`the ${side} registry holds duplicate track ${id}; an anchor that is not unique cannot be compared`);
      byId.set(id, t);
    }
    return byId;
  },

  scopeFrom({ receipt, pin, currentDoc }) {
    const byId = this.index(currentDoc, "current");
    const resolve = (component) => {
      const parts = String(component).split(":");
      for (let n = parts.length; n > 0; n -= 1) {
        const candidate = parts.slice(0, n).join(":");
        if (byId.has(candidate)) return { trackId: candidate, subAnchor: parts.slice(n).join(":") || null };
      }
      return null;
    };

    const anchors = new Set();
    const fromRecordId = [];
    const recordId = typeof pin.recordId === "string" ? pin.recordId : "";
    const suffix = recordId.includes(":") ? recordId.slice(recordId.indexOf(":") + 1) : "";
    for (const component of suffix.split("+").filter(Boolean)) {
      const hit = resolve(component);
      if (!hit) {
        throw new Refusal(
          `the receipt's recordId names ${JSON.stringify(component)}, which is no track in the current registry`,
          { recordId, component }
        );
      }
      anchors.add(hit.trackId);
      fromRecordId.push(hit.subAnchor ? `${hit.trackId} (sub-anchor ${hit.subAnchor})` : hit.trackId);
    }

    const fromRouteKeys = [];
    const routeSegmentsThatAreNotTracks = [];
    for (const routeKey of receipt.routeKeys ?? []) {
      const s = String(routeKey).split(":");
      const hit = (s[3] && byId.has(s[3])) ? { trackId: s[3] }
        : (s[3] && s[4] && byId.has(`${s[3]}:${s[4]}`)) ? { trackId: `${s[3]}:${s[4]}` } : null;
      if (hit) { anchors.add(hit.trackId); if (!fromRouteKeys.includes(hit.trackId)) fromRouteKeys.push(hit.trackId); }
      else routeSegmentsThatAreNotTracks.push(routeKey);
    }

    if (anchors.size === 0) {
      throw new Refusal("the family's own records name no entry in this record, so there is nothing to compare", { recordId, routeKeys: receipt.routeKeys ?? [] });
    }
    return {
      anchorIds: [...anchors].sort(),
      derivation: {
        fromPinRecordId: fromRecordId,
        fromReceiptRouteKeys: fromRouteKeys,
        routeKeysNamingNoTrackDirectly: routeSegmentsThatAreNotTracks,
        globalMetadataComparedAsOneAnchor: true
      }
    };
  },

  anchorsOf(doc, scope, side) {
    const byId = this.index(doc, side);
    const out = new Map();
    /* Everything the record holds that is not a track. Compared whole, so a
     * pathway, cohort or ceiling living outside `tracks` cannot move unseen. */
    const { tracks: _tracks, ...globalMetadata } = doc;
    out.set("registryGlobalMetadata", globalMetadata);
    for (const id of scope.anchorIds) {
      if (!byId.has(id)) {
        throw new Refusal(`anchor track ${id} is absent from the ${side} registry; the entry this family binds left the record and it owes a fresh read`, { anchor: `track:${id}`, side });
      }
      out.set(`track:${id}`, byId.get(id));
    }
    return out;
  }
};

const PACKET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";

/* Packet manifests bind complete packet-set records and every shared/default
 * field outside packetSets. Scope comes from explicit receipt identifiers and
 * route tracks, never from a substring of the family name. Schema extensions
 * with unknown per-packet dependency semantics refuse until supported. */
const packetManifestAdapter = {
  recordPath: PACKET_MANIFESTS,
  describe: "packet-set manifests (complete scoped packet sets + shared/default metadata)",
  index(doc, side) {
    if (!doc || doc.schemaVersion !== 1 || !Array.isArray(doc.packetSets)) {
      throw new Refusal(`the ${side} packet manifest has an unsupported schema`);
    }
    const allowed = new Set(["packetSetId", "trackId", "jurisdiction", "version", "components",
      "participantActionRequired", "requiredBeforeFiling", "packetSetCompleteness", "factoryV2RouteProductization"]);
    const byId = new Map();
    for (const entry of doc.packetSets) {
      if (!entry || typeof entry.packetSetId !== "string" || !entry.packetSetId
        || typeof entry.trackId !== "string" || !entry.trackId || !Array.isArray(entry.components)) {
        throw new Refusal(`the ${side} packet manifest has an unidentifiable packet set`);
      }
      if (byId.has(entry.packetSetId)) throw new Refusal(`duplicate packet set ${entry.packetSetId} in ${side} manifest`);
      const unknown = Object.keys(entry).filter((key) => !allowed.has(key));
      if (unknown.length) throw new Refusal(`ambiguous packet dependencies in ${entry.packetSetId}: unsupported fields ${unknown.join(", ")}`);
      byId.set(entry.packetSetId, entry);
    }
    return byId;
  },
  scopeFrom({ receipt, pin, currentDoc }) {
    const byId = this.index(currentDoc, "current");
    const anchors = new Set(); const declarations = [];
    const add = (id, basis) => {
      if (!byId.has(id)) throw new Refusal(`${basis} names unavailable packet set ${JSON.stringify(id)}`);
      anchors.add(id); declarations.push({ basis, packetSetId: id });
    };
    if (pin.recordId != null) {
      const match = /^(?:packet-set-manifest|legal-design-packet-set-manifests):(.+)$/.exec(pin.recordId);
      if (!match) throw new Refusal(`ambiguous packet-manifest recordId ${JSON.stringify(pin.recordId)}`);
      for (const id of match[1].split("+")) add(id, "pin.recordId");
    }
    if (receipt.packetSetId != null) add(receipt.packetSetId, "receipt.packetSetId");
    if (typeof receipt.familyId === "string" && byId.has(receipt.familyId)) add(receipt.familyId, "receipt.familyId exact packetSetId");
    for (const key of receipt.routeKeys ?? []) {
      const parts = String(key).split(":");
      if (parts[0] !== "obligation" || !["track-only", "track-pathway"].includes(parts[1]) || !parts[3]) {
        throw new Refusal(`ambiguous manifest dependency for route ${JSON.stringify(key)}`);
      }
      const matches = [...byId.values()].filter((entry) => entry.trackId === parts[3] && entry.jurisdiction === parts[2]);
      if (!matches.length) throw new Refusal(`route ${JSON.stringify(key)} names no current packet-set track`);
      if (matches.length > 1) throw new Refusal(`route ${JSON.stringify(key)} has ambiguous packet-set dependencies`);
      for (const entry of matches) add(entry.packetSetId, `receipt.routeKeys:${key}`);
    }
    if (!anchors.size) throw new Refusal("the receipt declares no unambiguous packet-manifest dependency");
    return { anchorIds: [...anchors].sort(), derivation: { declarations, globalMetadataComparedAsOneAnchor: true } };
  },
  anchorsOf(doc, scope, side) {
    const byId = this.index(doc, side);
    const { packetSets: _packetSets, ...shared } = doc;
    const out = new Map([["packetManifestSharedMetadata", shared]]);
    const identifiers = new Map();
    const register = (value, id) => {
      if (typeof value !== "string" || !value) return;
      if (!identifiers.has(value)) identifiers.set(value, new Set());
      identifiers.get(value).add(id);
    };
    for (const [id, entry] of byId) {
      register(id, id); register(entry.trackId, id);
      for (const component of entry.components) register(component.componentId, id);
    }
    const pending = new Set(scope.anchorIds);
    const dependencyKey = (key) => /(?:ref(?:erence)?s?|dependsOn|inheritsFrom|extends|defaultPacketSet(?:Id)?|(?:packetSet|packetFamily|component)Ids?)$/i.test(key);
    const dependencies = (value, key = "") => {
      if (value != null && dependencyKey(key) && typeof value !== "string" && !Array.isArray(value)) {
        throw new Refusal(`ambiguous structured dependency ${key} in ${side} manifest`);
      }
      if (typeof value === "string") {
        const targets = identifiers.get(value);
        if (targets?.size > 1) throw new Refusal(`ambiguous dependency identifier ${JSON.stringify(value)} in ${side} manifest`);
        for (const id of targets ?? []) pending.add(id);
        if (dependencyKey(key) && !identifiers.has(value)) throw new Refusal(`ambiguous or unavailable dependency ${key}=${JSON.stringify(value)} in ${side} manifest`);
      } else if (Array.isArray(value)) value.forEach((item) => dependencies(item, key));
      else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => dependencies(v, k));
    };
    dependencies(shared);
    for (const id of pending) {
      if (!byId.has(id)) throw new Refusal(`packet set ${id} is absent from the ${side} manifest`);
      if (out.has(`packetSet:${id}`)) continue;
      const entry = byId.get(id);
      out.set(`packetSet:${id}`, entry);
      dependencies(entry);
    }
    return out;
  }
};

const SOURCE_DETERMINATIONS = "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json";
export function acceptedAcquisitionIdentity(evidence) {
  return ["ACQUIRED_CURRENT_OFFICIAL_BINARY", "OFFICIAL_SOURCE_ALREADY_HELD", "PASS"].includes(evidence?.result)
    && isDigest(evidence.sha256) && Number.isInteger(evidence.byteLength) && evidence.byteLength > 0
    && typeof evidence.heldCorpusPath === "string" && evidence.heldCorpusPath.trim().length > 0;
}
const sourceDeterminationAdapter = {
  recordPath: SOURCE_DETERMINATIONS,
  describe: "source determinations (whole shared record and exact family reconciliation)",
  index(doc, side) {
    if (doc?.schemaVersion !== "rcap-grade-a-captain-source-identity-determinations/v1"
      || doc.reconciliation42?.schemaVersion !== "rcap-source-reconciliation-42/v1"
      || !Array.isArray(doc.determinations) || !Array.isArray(doc.reconciliation42.families)
      || !Array.isArray(doc.reconciliation42.acquisitionEvidencePaths)) throw new Refusal(`unsupported ${side} source determination schema`);
    const topKeys = new Set(["schemaVersion", "producedBy", "producedOn", "question", "rowsGoverned", "familiesGoverned", "jurisdictions", "rule", "determinations", "reconciliation42", "whatThisDoesNotEstablish"]);
    const sharedKeys = new Set(["schemaVersion", "recordedOn", "rule", "manualAcquisitionCohortUntouchedCount", "laterSourceBlockersKeptSeparate", "acquisitionEvidencePaths", "sharedExactBindings", "families", "rhodeIslandProposedOrder"]);
    if (Object.keys(doc).some(k => !topKeys.has(k)) || Object.keys(doc.reconciliation42).some(k => !sharedKeys.has(k))
      || doc.reconciliation42.acquisitionEvidencePaths.some(p => typeof p !== "string" || !p)) throw new Refusal(`ambiguous ${side} shared source dependencies`);
    const out = new Map();
    for (const row of doc.reconciliation42.families) {
      if (typeof row?.familyId !== "string" || !row.familyId || out.has(row.familyId)) throw new Refusal(`ambiguous ${side} source reconciliation family`);
      out.set(row.familyId, row);
    }
    return out;
  },
  scopeFrom({ receipt, pin, currentDoc }) {
    const byId = this.index(currentDoc, "current");
    const match = /^captain-source-identity-determination:(.+)$/.exec(pin.recordId ?? "");
    const hits = currentDoc.determinations.filter(row => row.id === match?.[1]);
    if (!match || hits.length !== 1 || !byId.has(receipt.familyId)
      || !hits[0].families?.includes(receipt.familyId)) throw new Refusal("source determination pin does not uniquely bind this family");
    const priorProofs = pin.identityRefresh?.anchorScope?.derivation?.excludedAcquisitionEvidence ?? [];
    for (const proof of priorProofs) {
      let bytes;
      try { bytes = fs.readFileSync(path.join(ROOT, proof.path)); }
      catch { throw new Refusal("prior excluded acquisition evidence unavailable"); }
      if (sha256(bytes) !== proof.sha256 || bytes.length !== proof.byteLength
        || !bytes.equals(git(["show", `HEAD:${proof.path}`], { encoding: "buffer" })))
        throw new Refusal("prior excluded acquisition evidence changed");
    }
    const excludedAcquisitionEvidence = [];
    for (const p of currentDoc.reconciliation42.acquisitionEvidencePaths) {
      // Only a committed, single-item acquisition return can prove an added
      // evidence path irrelevant. Every other path stays in the shared anchor.
      let bytes, evidence;
      try {
        bytes = fs.readFileSync(path.join(ROOT, p));
        if (!bytes.equals(git(["show", `HEAD:${p}`], { encoding: "buffer" }))) continue;
        evidence = JSON.parse(bytes);
      } catch { continue; }
      const allowed = new Set(["schemaVersion", "familyId", "itemId", "result", "heldCorpusPath", "sha256", "byteLength", "pageCount", "selectedSourcePages", "sourcePageIdentity", "officialReaderUrl", "currentRemoteBinaryHashMeasured", "independentSourceReview", "packetAcceptanceGranted"]);
      const review = evidence.independentSourceReview;
      if (!acceptedAcquisitionIdentity(evidence)
        || evidence.schemaVersion !== "rcap-source-acquisition-return/v1"
        || typeof evidence.familyId !== "string" || !evidence.familyId || evidence.familyId.includes("::") || evidence.familyId === receipt.familyId
        || typeof evidence.itemId !== "string" || !evidence.itemId.startsWith(`${evidence.familyId}::official-form:`)
        || Object.keys(evidence).some(k => !allowed.has(k))
        || (review && (typeof review !== "object" || Array.isArray(review) || Object.keys(review).some(k => !["path", "sha256", "byteLength"].includes(k)) || typeof review.path !== "string" || !isDigest(review.sha256) || !Number.isInteger(review.byteLength)))
        || Object.entries(evidence).some(([k, v]) => v && typeof v === "object" && !["selectedSourcePages", "independentSourceReview"].includes(k))
        || (evidence.selectedSourcePages && (!Array.isArray(evidence.selectedSourcePages) || evidence.selectedSourcePages.some(p => !Number.isInteger(p))))) continue;
      excludedAcquisitionEvidence.push({ path: p, sha256: sha256(bytes), byteLength: bytes.length, familyId: evidence.familyId, itemId: evidence.itemId });
    }
    return { anchorIds: [receipt.familyId], derivation: { determinationId: match[1], globalMetadataComparedAsOneAnchor: true, excludedAcquisitionEvidence } };
  },
  anchorsOf(doc, scope, side) {
    const byId = this.index(doc, side);
    const { reconciliation42, ...shared } = doc;
    const { families, acquisitionEvidencePaths, ...reconciliationShared } = reconciliation42;
    const excluded = new Set(scope.derivation.excludedAcquisitionEvidence.map(p => p.path));
    const out = new Map([["sourceDeterminationSharedMetadata", { ...shared, reconciliation42: { ...reconciliationShared, acquisitionEvidencePaths: acquisitionEvidencePaths.filter(p => !excluded.has(p)) } }]]);
    for (const id of scope.anchorIds) {
      if (!byId.has(id)) throw new Refusal(`source reconciliation ${id} absent from ${side} record`);
      const row = byId.get(id);
      const supported = new Set(["familyId", "group", "disposition", "sourceReplacements", "exactNextAction"]);
      if (Object.keys(row).some(k => !supported.has(k))) throw new Refusal(`ambiguous source reconciliation dependencies for ${id}`);
      if (row.sourceReplacements && (Array.isArray(row.sourceReplacements) || typeof row.sourceReplacements !== "object"
        || Object.entries(row.sourceReplacements).some(([key, values]) => !key.startsWith("official-form:") || !Array.isArray(values) || values.some(v => typeof v !== "string" || !v.startsWith("official-form:"))))) throw new Refusal(`ambiguous source replacements for ${id}`);
      out.set(`sourceReconciliation:${id}`, row);
    }
    return out;
  }
};

/*
 * The WV compiled profile is a shared record, but this receipt does not bind
 * the profile as an undifferentiated blob. The composed-treatment builder
 * re-reads five statements from it: the shared fee statement, the selected
 * pathway identity and substance, the legal-aid referral, and the
 * rehabilitation label. The current WV ownership correction changed the
 * inventory metadata for SCA-C903 in this profile. That is a different
 * source input, and this family has no SCA-C903 component; it is the only
 * transition this adapter is allowed to set aside.
 *
 * Everything else in the profile remains an anchor: the route pathway, all
 * shared routing/rule data, all source sections, the packet-generator rules
 * and the non-SCA-C903 inventory. An unknown field, duplicate identity, a
 * changed route/shared rule, or a differently shaped SCA-C903 transition is a
 * refusal. This is deliberately one route adapter, not a compiled-profile
 * framework or a global exemption.
 */
const WV_COMPILED_PROFILE = "src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json";
const WV_PROFILE_FAMILY = "composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement";
const WV_PROFILE_ROUTE_KEY = "obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement";
const WV_PROFILE_ROUTE_ID = "sex-trafficking-victim-vacatur-and-expungement";
const WV_C903_GOVERNED_PATHWAY_ID = "first-offense-drug-possession-conditional-discharge-relief";
const WV_PROFILE_RECORD_ID = `compiled-profile:WV-west-virginia#${WV_PROFILE_ROUTE_ID}`;
const WV_PROFILE_DETAIL_TITLE = "Sex-trafficking victim vacatur and expungement";
const WV_PROFILE_SOURCE_ANCHORS = Object.freeze({
  feeRulePrefix: "For 61-11-26 conviction expungement, the circuit clerk charges the same fee as filing a civil action, and a person who receives an expungement order must pay a $100 West Virginia State Police processing fee.",
  pathwayId: WV_PROFILE_ROUTE_ID,
  pathwaySummaryPrefix: "A person convicted of prostitution, or adjudicated delinquent, as a direct result of being a trafficking victim may petition the circuit court in the county of conviction or juvenile adjudication to vacate the conviction/adjudication and expunge the record.",
  legalAidReferral: "West Virginia has a special relief route for prostitution records caused by sex trafficking. This can involve vacating the conviction or juvenile adjudication, so it should be routed to legal aid or an attorney.",
  rehabilitationLabel: "rehabilitation_not_required_61_14_9"
});

const WV_PROFILE_TOP_KEYS = new Set([
  "schemaVersion", "profileVersion", "questionLifecycle", "jurisdiction", "source", "terminology",
  "flowStages", "questions", "caseOutcomeOptions", "pathways", "orderedDecisionRules",
  "waitingPeriodRules", "exclusionRules", "packetGenerator", "resultPresentationContract",
  "copyGuardrails", "sourceSections", "frontendContract", "qa"
]);
const WV_PROFILE_SOURCE_KEYS = new Set([
  "sourcePolicy", "references", "sourceCorpusSha256", "sourceCorpusChars", "selectedOfficialEdition",
  "historicalComparisonBindings", "sourceCorpusBindingNote", "allFolderFiles"
]);
const WV_PROFILE_PACKET_KEYS = new Set([
  "architecture", "legacyGeneratorAllowed", "genericLegalFallbackAllowed", "pathways", "requiredInputs",
  "sourceFormStatements", "attachments", "filingDestinationRules", "serviceAndNoticeRules", "feeRules",
  "hearingAndObjectionRules", "postFilingRules", "formInventory", "allSourceFiles", "generatorSelectionContract"
]);
const WV_C903_IDENTITIES = Object.freeze({
  historical: Object.freeze({
    fileName: "SCA-C-903.pdf",
    relativePath: "LegalEase West Virginia/SCA-C-903.pdf",
    extension: ".pdf",
    kind: "official_form_or_packet",
    sha256: "242048f1ff5b2e795ca43900bec6d9c353c59950bffd3c7776374ff1cc6c7035",
    byteLength: 112484
  }),
  current: Object.freeze({
    fileName: "SCA-C-903.pdf",
    relativePath: "STATES/WV/02_PACKET_FORMS/WV__FORM__SCA-C903__sca-c903-motion-for-expungement-after-acquittal-or-dismissal__REV-2010-04__EN.pdf",
    extension: ".pdf",
    kind: "official_form_or_packet",
    sha256: "bbfcd767b02230300e2164a40cc2d81967c87fb9b7ddf4f0677622e1319fe878",
    byteLength: 23275
  })
});
const WV_C903_SOURCE_SELECTION = Object.freeze({
  sourceId: "official-form:SCA-C903",
  formNumber: "SCA-C903",
  revision: "REV-2010-04",
  custody: "master_library",
  custodyRoot: "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  relativePath: WV_C903_IDENTITIES.current.relativePath,
  sha256: WV_C903_IDENTITIES.current.sha256,
  byteLength: WV_C903_IDENTITIES.current.byteLength,
  pageCount: 3,
  structuralClassObserved: "flat_pdf",
  encrypted: true,
  acroFormPresent: false,
  acroFieldCount: 0,
  xfaPresent: false,
  role: "current individual source input used by the WV route ownership correction"
});
const WV_C903_HISTORICAL_BINDING = Object.freeze({
  sourceId: "official-form:SCA-C903",
  formNumber: "SCA-C903",
  revisionPrinted: "04/01/2010",
  custody: "nationwide_recovery_pool_2026_09_02",
  path: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase West Virginia/SCA-C-903.pdf",
  relativePath: "LegalEase West Virginia/SCA-C-903.pdf",
  sha256: WV_C903_IDENTITIES.historical.sha256,
  byteLength: WV_C903_IDENTITIES.historical.byteLength,
  pageCount: 2,
  structuralClassObserved: "acroform",
  encrypted: false,
  acroFormPresent: true,
  acroFieldCount: 25,
  role: "retained comparison history; not the current route binding"
});
const WV_C903_BINDING_NOTE = "sourceCorpusSha256 remains the pre-existing compiled-profile aggregate and is not recomputed by this correction; the selected SCA-C903 binding is an individual Master Library source input and does not assert a complete operational Nationwide corpus.";

const wvClone = (value) => structuredClone(value);
const wvKeys = (value) => Object.keys(value ?? {}).sort();
const wvRequireObject = (value, message) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Refusal(message);
  return value;
};
const wvRequireExactKeys = (value, allowed, side, label) => {
  wvRequireObject(value, `the ${side} WV compiled profile has no ${label} object`);
  const unknown = wvKeys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Refusal(`ambiguous ${side} WV compiled profile ${label} fields: ${unknown.join(", ")}`);
  return value;
};
const wvC903Marker = (value) => value && typeof value === "object" && (
  value.fileName === "SCA-C-903.pdf" || value.formNumber === "SCA-C903" || value.sourceId === "official-form:SCA-C903"
  || (typeof value.relativePath === "string" && (value.relativePath.includes("SCA-C-903") || value.relativePath.includes("SCA-C903")))
  || (typeof value.path === "string" && (value.path.includes("SCA-C-903") || value.path.includes("SCA-C903")))
);
const wvExpectedC903 = (side) => side === "recovered historical" ? WV_C903_IDENTITIES.historical : WV_C903_IDENTITIES.current;
const wvValidateC903Identity = (value, side, label) => {
  wvRequireObject(value, `the ${side} ${label} SCA-C903 entry is not an object`);
  const expected = wvExpectedC903(side);
  const expectedEntry = {
    fileName: expected.fileName,
    relativePath: expected.relativePath,
    extension: expected.extension,
    kind: expected.kind,
    sha256: expected.sha256,
    sizeBytes: expected.byteLength
  };
  if (canonical(value) !== canonical(expectedEntry)) {
    throw new Refusal(`the ${side} ${label} SCA-C903 entry is not the complete recorded ${side === "recovered historical" ? "historical" : "current"} binding`);
  }
};
const wvFilterC903 = (values, side, label, { requireOne = false } = {}) => {
  if (!Array.isArray(values)) throw new Refusal(`the ${side} WV compiled profile ${label} is not an array`);
  const marked = values.filter(wvC903Marker);
  if (marked.length > 1 || (requireOne && marked.length !== 1)) {
    throw new Refusal(`ambiguous ${side} SCA-C903 entries in ${label}: expected ${requireOne ? "one" : "at most one"}, found ${marked.length}`);
  }
  marked.forEach((value) => wvValidateC903Identity(value, side, label));
  return values.filter((value) => !wvC903Marker(value));
};
const wvValidateCurrentC903Selection = (source, side) => {
  if (side === "current" && [
    "selectedOfficialEdition",
    "historicalComparisonBindings",
    "sourceCorpusBindingNote"
  ].some((key) => !Object.hasOwn(source, key))) {
    throw new Refusal("the current WV compiled profile must carry all three recorded SCA-C903 custody-selection fields");
  }
  if (source.selectedOfficialEdition !== undefined) {
    if (side !== "current" || canonical(source.selectedOfficialEdition) !== canonical(WV_C903_SOURCE_SELECTION)) {
      throw new Refusal(`the ${side} WV compiled profile carries an unexpected selected SCA-C903 binding`);
    }
  }
  if (source.historicalComparisonBindings !== undefined) {
    if (side !== "current" || !Array.isArray(source.historicalComparisonBindings)
      || source.historicalComparisonBindings.length !== 1
      || canonical(source.historicalComparisonBindings[0]) !== canonical(WV_C903_HISTORICAL_BINDING)) {
      throw new Refusal(`the ${side} WV compiled profile carries an unexpected historical SCA-C903 binding`);
    }
  }
  if (source.sourceCorpusBindingNote !== undefined
    && (side !== "current" || source.sourceCorpusBindingNote !== WV_C903_BINDING_NOTE)) {
    throw new Refusal(`the ${side} WV compiled profile carries an unexpected source-corpus binding note`);
  }
};

const wvSourceStable = (doc, side) => {
  const source = wvRequireExactKeys(doc.source, WV_PROFILE_SOURCE_KEYS, side, "source");
  wvValidateCurrentC903Selection(source, side);
  const out = wvClone(source);
  delete out.selectedOfficialEdition;
  delete out.historicalComparisonBindings;
  delete out.sourceCorpusBindingNote;
  out.allFolderFiles = wvFilterC903(out.allFolderFiles, side, "source.allFolderFiles", { requireOne: true });
  return out;
};

const wvPacketGeneratorStable = (doc, side) => {
  const packet = wvRequireExactKeys(doc.packetGenerator, WV_PROFILE_PACKET_KEYS, side, "packetGenerator");
  if (!Array.isArray(packet.pathways)) throw new Refusal(`the ${side} WV packetGenerator has no pathways array`);
  const pathwayIds = packet.pathways.map((entry) => entry?.pathwayId);
  if (pathwayIds.some((id) => typeof id !== "string" || !id) || new Set(pathwayIds).size !== pathwayIds.length) {
    throw new Refusal(`ambiguous ${side} WV packetGenerator pathway identities`);
  }
  const out = wvClone(packet);
  out.formInventory = wvFilterC903(out.formInventory, side, "packetGenerator.formInventory", { requireOne: true });
  out.allSourceFiles = wvFilterC903(out.allSourceFiles, side, "packetGenerator.allSourceFiles", { requireOne: true });
  out.pathways = out.pathways.map((entry) => {
    if (entry.pathwayId !== WV_C903_GOVERNED_PATHWAY_ID) return entry;
    entry.formCandidates = wvFilterC903(entry.formCandidates, side, `packetGenerator.pathways:${entry.pathwayId}.formCandidates`, { requireOne: true });
    return entry;
  });
  return out;
};

const wvSharedProfile = (doc, side) => {
  const out = wvClone(doc);
  delete out.source;
  delete out.packetGenerator;
  delete out.pathways;
  delete out.sourceSections;
  wvRequireExactKeys(doc, WV_PROFILE_TOP_KEYS, side, "top-level");
  return out;
};

const wvPathways = (doc, side) => {
  if (!Array.isArray(doc.pathways)) throw new Refusal(`the ${side} WV compiled profile has no pathways array`);
  const out = new Map();
  for (const entry of doc.pathways) {
    if (!entry || typeof entry.id !== "string" || !entry.id) throw new Refusal(`the ${side} WV compiled profile has an unidentifiable pathway`);
    if (out.has(entry.id)) throw new Refusal(`ambiguous ${side} WV compiled profile pathway ${entry.id}`);
    out.set(entry.id, entry);
  }
  return out;
};

const wvPacketPathways = (doc, side) => {
  if (!Array.isArray(doc.packetGenerator?.pathways)) throw new Refusal(`the ${side} WV packetGenerator has no pathways array`);
  const out = new Map();
  for (const entry of doc.packetGenerator.pathways) {
    if (!entry || typeof entry.pathwayId !== "string" || !entry.pathwayId) throw new Refusal(`the ${side} WV packetGenerator has an unidentifiable pathway`);
    if (out.has(entry.pathwayId)) throw new Refusal(`ambiguous ${side} WV packetGenerator pathway ${entry.pathwayId}`);
    out.set(entry.pathwayId, entry);
  }
  return out;
};

const wvSourceSections = (doc, side) => {
  if (!Array.isArray(doc.sourceSections)) throw new Refusal(`the ${side} WV compiled profile has no sourceSections array`);
  const out = new Map();
  for (const section of doc.sourceSections) {
    if (!section || typeof section.title !== "string" || !section.title) throw new Refusal(`the ${side} WV source section has no title`);
    if (out.has(section.title)) throw new Refusal(`ambiguous ${side} WV source section ${section.title}`);
    out.set(section.title, section);
  }
  return out;
};

const compiledProfileAdapter = {
  recordPath: WV_COMPILED_PROFILE,
  describe: "WV compiled profile (route pathway and all relevant shared dependencies; explicit SCA-C903 inventory transition)",

  index(doc, side) {
    wvRequireExactKeys(doc, WV_PROFILE_TOP_KEYS, side, "top-level");
    if (doc.schemaVersion !== "2.0.0" || doc.jurisdiction?.code !== "WV") {
      throw new Refusal(`the ${side} record is not the WV compiled profile schema this adapter describes`);
    }
    const pathways = wvPathways(doc, side);
    const packetPathways = wvPacketPathways(doc, side);
    const sections = wvSourceSections(doc, side);
    const sourceC903 = doc.source.allFolderFiles.find(wvC903Marker);
    const packetC903Inventory = doc.packetGenerator.formInventory.find(wvC903Marker);
    const packetC903AllSource = doc.packetGenerator.allSourceFiles.find(wvC903Marker);
    wvValidateC903Identity(sourceC903, side, "source.allFolderFiles");
    wvValidateC903Identity(packetC903Inventory, side, "packetGenerator.formInventory");
    wvValidateC903Identity(packetC903AllSource, side, "packetGenerator.allSourceFiles");
    const out = new Map([
      ["compiledProfile:sharedCore", wvSharedProfile(doc, side)],
      ["compiledProfile:sourceStable", wvSourceStable(doc, side)],
      ["compiledProfile:packetGeneratorStable", wvPacketGeneratorStable(doc, side)],
      ["compiledProfile:sourceSections", wvClone(doc.sourceSections)],
      ["compiledProfile:source:allFolderFiles:SCA-C-903.pdf", sourceC903],
      ["compiledProfile:packetGenerator:formInventory:SCA-C-903.pdf", packetC903Inventory],
      ["compiledProfile:packetGenerator:allSourceFiles:SCA-C-903.pdf", packetC903AllSource],
      ["compiledProfile:source:selectedOfficialEdition", doc.source?.selectedOfficialEdition ?? null],
      ["compiledProfile:source:historicalComparisonBindings", doc.source?.historicalComparisonBindings ?? null],
      ["compiledProfile:source:sourceCorpusBindingNote", doc.source?.sourceCorpusBindingNote ?? null]
    ]);
    for (const [id, entry] of pathways) out.set(`compiledProfile:pathway:${id}`, entry);
    for (const [id, entry] of packetPathways) out.set(`compiledProfile:packetGeneratorPathway:${id}`, entry);
    for (const [title, entry] of sections) out.set(`compiledProfile:sourceSection:${title}`, entry);
    return out;
  },

  scopeFrom({ receipt, pin, currentDoc }) {
    if (receipt.familyId !== WV_PROFILE_FAMILY || pin.recordId !== WV_PROFILE_RECORD_ID
      || pin.pathInRepository !== WV_COMPILED_PROFILE) {
      throw new Refusal("compiled-profile pin does not uniquely bind the assigned WV sex-trafficking route");
    }
    if (!Array.isArray(receipt.routeKeys) || receipt.routeKeys.length !== 1 || receipt.routeKeys[0] !== WV_PROFILE_ROUTE_KEY) {
      throw new Refusal("the WV compiled-profile receipt has an ambiguous or unrelated route key");
    }
    const indexed = this.index(currentDoc, "current");
    const pathway = indexed.get(`compiledProfile:pathway:${WV_PROFILE_ROUTE_ID}`);
    const packetPathway = indexed.get(`compiledProfile:packetGeneratorPathway:${WV_PROFILE_ROUTE_ID}`);
    const detail = indexed.get(`compiledProfile:sourceSection:${WV_PROFILE_DETAIL_TITLE}`);
    if (!pathway || !packetPathway || !detail) {
      throw new Refusal("the WV compiled profile does not uniquely expose the route pathway, packet-generator pathway and pathway-detail section");
    }
    if (pathway.id !== WV_PROFILE_SOURCE_ANCHORS.pathwayId
      || typeof pathway.summary !== "string" || !pathway.summary.startsWith(WV_PROFILE_SOURCE_ANCHORS.pathwaySummaryPrefix)
      || !Array.isArray(pathway.ruleClauses)
      || !pathway.ruleClauses.some((value) => typeof value === "string" && value.includes(WV_PROFILE_SOURCE_ANCHORS.legalAidReferral))
      || !pathway.ruleClauses.some((value) => typeof value === "string" && value.includes(WV_PROFILE_SOURCE_ANCHORS.rehabilitationLabel))
      || !Array.isArray(currentDoc.packetGenerator?.feeRules)
      || !currentDoc.packetGenerator.feeRules.some((value) => typeof value === "string" && value.includes(WV_PROFILE_SOURCE_ANCHORS.feeRulePrefix))
      || typeof detail.text !== "string" || !detail.text.includes(WV_PROFILE_SOURCE_ANCHORS.legalAidReferral)
      || !detail.text.includes(WV_PROFILE_SOURCE_ANCHORS.rehabilitationLabel)) {
      throw new Refusal("the WV compiled profile no longer contains all five builder anchor statements this route relies on");
    }
    return {
      anchorIds: [
        "compiledProfile:sharedCore",
        "compiledProfile:sourceStable",
        "compiledProfile:packetGeneratorStable",
        `compiledProfile:pathway:${WV_PROFILE_ROUTE_ID}`,
        "compiledProfile:sourceSections"
      ],
      derivation: {
        recordId: WV_PROFILE_RECORD_ID,
        familyId: receipt.familyId,
        routeKey: WV_PROFILE_ROUTE_KEY,
        pathwayId: WV_PROFILE_ROUTE_ID,
        builderAnchorStatements: [
          { name: "shared fee rule", statement: WV_PROFILE_SOURCE_ANCHORS.feeRulePrefix, dependency: "compiledProfile:packetGeneratorStable" },
          { name: "pathway id", statement: WV_PROFILE_SOURCE_ANCHORS.pathwayId, dependency: `compiledProfile:pathway:${WV_PROFILE_ROUTE_ID}` },
          { name: "pathway summary", statement: WV_PROFILE_SOURCE_ANCHORS.pathwaySummaryPrefix, dependency: `compiledProfile:pathway:${WV_PROFILE_ROUTE_ID}` },
          { name: "legal-aid referral", statement: WV_PROFILE_SOURCE_ANCHORS.legalAidReferral, dependency: "compiledProfile:sourceSections" },
          { name: "rehabilitation label", statement: WV_PROFILE_SOURCE_ANCHORS.rehabilitationLabel, dependency: "compiledProfile:sourceSections" }
        ],
        excludedKnownTransition: {
          kind: "unrelated-SCA-C903-source-inventory-correction",
          reason: "this custom-pleading route binds no SCA-C903 component; only the selected/current and retained historical SCA-C903 inventory metadata moved",
          fields: [
            "source.selectedOfficialEdition",
            "source.historicalComparisonBindings",
            "source.sourceCorpusBindingNote",
            "source.allFolderFiles:SCA-C-903.pdf",
            "packetGenerator.formInventory:SCA-C-903.pdf",
            "packetGenerator.allSourceFiles:SCA-C-903.pdf",
            "packetGenerator.pathways[first-offense-drug-possession-conditional-discharge-relief].formCandidates:SCA-C-903.pdf"
          ]
        },
        sharedDependenciesComparedAsSeparateAnchors: true
      }
    };
  },

  anchorsOf(doc, scope, side) {
    const indexed = this.index(doc, side);
    const out = new Map();
    for (const id of scope.anchorIds) {
      if (!indexed.has(id)) throw new Refusal(`the ${side} WV compiled profile lacks required anchor ${id}`);
      out.set(id, indexed.get(id));
    }
    return out;
  }
};

export const ADAPTERS = new Map([
  [REGISTRY, registryAdapter],
  [PACKET_MANIFESTS, packetManifestAdapter],
  [SOURCE_DETERMINATIONS, sourceDeterminationAdapter],
  [WV_COMPILED_PROFILE, compiledProfileAdapter]
]);

/* ------------------------------------------------------------------ *
 * The comparison
 * ------------------------------------------------------------------ */

/**
 * Compare the entries a family depends on across one record's drift.
 * Order-independent (keys sorted recursively before serialising) and
 * object-for-object (whole anchor objects, not selected fields).
 */
export function compareAnchors({ adapter, oldDoc, currentDoc, scope }) {
  const before = adapter.anchorsOf(oldDoc, scope, "recovered historical");
  const after = adapter.anchorsOf(currentDoc, scope, "current");

  const names = [...new Set([...before.keys(), ...after.keys()])].sort();
  const detail = [];
  const differing = [];
  const identicalAnchorSha256 = {};
  for (const name of names) {
    const a = canonical(before.get(name));
    const b = canonical(after.get(name));
    if (a === b) { detail.push(`${name}: identical`); identicalAnchorSha256[name] = sha256(Buffer.from(a, "utf8")); }
    else { detail.push(`${name}: DIFFERS`); differing.push(name); }
  }
  return {
    anchorsCompared: names.length,
    anchorsIdentical: names.length - differing.length,
    anchorNames: names,
    anchorDetail: detail,
    differing,
    identicalAnchorSha256,
    canonicalisation: CANONICALISATION
  };
}

/** What differed, in enough words for a human to act on without rerunning. */
export function describeDifference({ adapter, oldDoc, currentDoc, scope, differing }) {
  const before = adapter.anchorsOf(oldDoc, scope, "recovered historical");
  const after = adapter.anchorsOf(currentDoc, scope, "current");
  return differing.map((name) => {
    const a = before.get(name), b = after.get(name);
    const keys = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].sort()
      .filter((k) => canonical(a?.[k]) !== canonical(b?.[k]));
    return {
      anchor: name,
      changedFields: keys,
      historicalCanonicalSha256: canonicalSha256(a),
      currentCanonicalSha256: canonicalSha256(b),
      firstChangedFieldHistorical: keys.length ? String(JSON.stringify(a?.[keys[0]])).slice(0, 400) : null,
      firstChangedFieldCurrent: keys.length ? String(JSON.stringify(b?.[keys[0]])).slice(0, 400) : null
    };
  });
}

/* ------------------------------------------------------------------ *
 * Which pins actually drifted, measured rather than read off a summary
 * ------------------------------------------------------------------ */

/*
 * The queue row is a summary. The measurement is recomputing each pinned record
 * and comparing it to the pin -- which is the obligation itself, not a proxy.
 *
 * ONE CORRECTION TO THE SUMMARY'S METHOD: a path that is not checked out in a
 * sparse worktree is not a missing source. It is resolved from HEAD before it
 * is called missing, because reporting an unmaterialised path as drift is a
 * defect in the resolver rather than a fact about custody.
 */
/*
 * A PIN'S PATH IS NOT ALWAYS REPOSITORY-RELATIVE, AND A PATH THIS TOOL CANNOT
 * RESOLVE IS NOT A MISSING SOURCE.
 *
 * Receipts pin against at least three bases: the repository, the master library
 * named by `corpusRootFromEnvironment` (`pathInArchive`), and a private custody
 * mount a pin names itself (`mountedHere`). Resolving everything under the
 * repository root reports held bytes as absent -- a defect in the resolver
 * rather than a fact about custody -- and reporting a source missing on that
 * basis is exactly the mistake the standing rules call out. So each pin is
 * resolved against the bases its own receipt declares, and the base that
 * answered is reported alongside the bytes.
 */
const contentCache = new Map();
function basesFor(receipt, pin) {
  const bases = [];
  const corpusVar = typeof receipt?.corpusRootFromEnvironment === "string" ? receipt.corpusRootFromEnvironment : "MASTER_LIBRARY_SOURCE_DIR";
  const corpus = process.env[corpusVar];
  if (typeof pin?.mountedHere === "string") bases.push({ root: path.resolve(ROOT, pin.mountedHere), why: "the mount this pin names" });
  if (typeof pin?.pathInArchive === "string" && corpus) bases.push({ root: corpus, why: `$${corpusVar}` });
  bases.push({ root: ROOT, why: "repository root" });
  if (corpus) bases.push({ root: corpus, why: `$${corpusVar}` });
  bases.push({ root: path.join(ROOT, "private"), why: "the private custody mount" });
  return bases;
}

export function currentBytesOf(repoPath, { receipt = null, pin = null } = {}) {
  const cacheKey = `${repoPath}\u0000${receipt?.familyId ?? ""}`;
  if (contentCache.has(cacheKey)) return contentCache.get(cacheKey);
  let answer = { bytes: null, from: "absent", triedBases: [] };
  const bases = path.isAbsolute(repoPath)
    ? [{ root: null, why: "absolute custody path" }]
    : basesFor(receipt, pin);
  for (const base of bases) {
    answer.triedBases.push(base.why);
    try { answer = { bytes: fs.readFileSync(base.root === null ? repoPath : path.join(base.root, repoPath)), from: `working tree (${base.why})`, triedBases: answer.triedBases }; break; }
    catch { /* try the next base */ }
  }
  /* A repository path that is simply not materialised in a sparse checkout. */
  if (answer.bytes === null && !path.isAbsolute(repoPath)) {
    try { answer = { bytes: git(["show", `HEAD:${repoPath}`], { encoding: "buffer" }), from: "HEAD (path not materialised in this sparse checkout)", triedBases: answer.triedBases }; }
    catch { /* genuinely unresolvable here */ }
  }
  contentCache.set(cacheKey, answer);
  return answer;
}

/*
 * A PIN THE RECEIPT ITSELF DECLARES UNMEASURABLE IS NOT DRIFT.
 *
 * Some pins carry `mountedHere: false` and say so in their own words -- the
 * Colorado receipt's are "quoted from ... and NOT re-hashed by this build; that
 * custody is not mounted in any packet-factory container, so this is a record
 * and not a measurement". Recomputing such a pin is impossible anywhere, so
 * calling it drifted would refuse every family holding one, forever, for a
 * reason that has nothing to do with the shared-record edit being repaired.
 * They are separated out and reported rather than silently skipped: an
 * unmeasured pin is a fact a reader is owed, it is simply not a lapse.
 */
export function driftedPinsOf(receipt) {
  const drifted = [];
  const unmeasurable = [];
  eachPin(receipt, (pin, at) => {
    if (!isDigest(pin.sha256)) return;
    if (pin.mountedHere === false) {
      unmeasurable.push({ path: at, sha256: pin.sha256, custody: pin.custody ?? null, receiptSays: pin.digestProvenance ?? "this pin declares mountedHere: false" });
      return;
    }
    const { bytes, from, triedBases } = currentBytesOf(at, { receipt, pin });
    if (bytes === null) { drifted.push({ pin, at, now: null, from, triedBases, missing: true }); return; }
    const now = sha256(bytes);
    if (now !== pin.sha256) drifted.push({ pin, at, now, bytes, from, triedBases, missing: false });
  });
  drifted.unmeasurable = unmeasurable;
  return drifted;
}

/* ------------------------------------------------------------------ *
 * The doctrine's own normalisation, replicated as a self-check
 * ------------------------------------------------------------------ */

/*
 * generate.mjs decides whether a receipt moved by normalising away the
 * identityRefresh blocks -- and the sha256 and byteLength of exactly the
 * records carrying one -- and asking whether the two versions are then equal.
 * This replicates that so a receipt is never written unless it will read as
 * unmoved, and so a stray edit anywhere else in the receipt is caught here
 * rather than by a demotion three hours later.
 */
/*
 * Deliberately NOT the shared walker. generate.mjs carries its own five-key
 * list, and this check is only worth anything if it walks exactly what the
 * decider walks: a pin the shared walker sees under `declaredPath` and the
 * decider does not would be refreshed here and still read as movement there.
 */
const DOCTRINE_PIN_PATH_KEYS = ["path", "pathInRepository", "pathInPack", "pathInArchive", "recordPath"];
const doctrineEachPin = (node, visit) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const x of node) doctrineEachPin(x, visit); return; }
  const key = DOCTRINE_PIN_PATH_KEYS.map((k) => node[k]).find((v) => typeof v === "string");
  if (key && typeof node.sha256 === "string") visit(node, key);
  for (const v of Object.values(node)) doctrineEachPin(v, visit);
};

export function doctrineNormalise(text, refreshedPathsFromCurrent) {
  let doc;
  try { doc = JSON.parse(text); } catch { return null; }
  doctrineEachPin(doc, (rec, at) => {
    if (!refreshedPathsFromCurrent.has(at)) return;
    delete rec.identityRefresh;
    delete rec.sha256;
    delete rec.byteLength;
  });
  return JSON.stringify(doc);
}

export function doctrineRefreshedPaths(currentDoc) {
  const out = new Set();
  let refused = false;
  doctrineEachPin(currentDoc, (rec, at) => {
    const r = rec.identityRefresh;
    if (!r) return;
    if (!(r.anchorsCompared > 0) || r.anchorsCompared !== r.anchorsIdentical) { refused = true; return; }
    out.add(at);
  });
  return refused ? null : out;
}

/** Would generate.mjs read this rewrite as an identity refresh only? */
export function readsAsUnmoved(beforeText, afterText) {
  let current;
  try { current = JSON.parse(afterText); } catch { return { ok: false, why: "the rewritten receipt is not JSON" }; }
  const paths = doctrineRefreshedPaths(current);
  if (paths === null) return { ok: false, why: "a pin carries an identityRefresh whose anchorsCompared is 0 or does not equal anchorsIdentical; the doctrine refuses it and it still reads as movement" };
  if (paths.size === 0) return { ok: false, why: "no pin carries a usable identityRefresh block" };
  const a = doctrineNormalise(beforeText, paths);
  const b = doctrineNormalise(afterText, paths);
  if (a === null || b === null) return { ok: false, why: "one side is not parseable JSON" };
  if (a !== b) return { ok: false, why: "the receipt changed somewhere other than the refreshed pins' sha256, byteLength and identityRefresh; that is a re-binding, not a re-pin" };
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Plan one family
 * ------------------------------------------------------------------ */

export function planFamily({ familyId, directory, on = new Date() }) {
  const receiptPath = `${directory}/source-receipt.json`;
  const abs = path.join(ROOT, receiptPath);
  let beforeText;
  try { beforeText = fs.readFileSync(abs, "utf8"); }
  catch { return { familyId, directory, outcome: "REFUSED", why: `no receipt at ${receiptPath}` }; }

  /* A receipt with uncommitted edits has no trustworthy "before" for the
   * doctrine's comparison, which runs against a committed base. */
  const dirty = spawnSync("git", ["diff", "--quiet", "HEAD", "--", receiptPath], { cwd: ROOT });
  if (dirty.status !== 0) {
    return { familyId, directory, receiptPath, outcome: "REFUSED", why: "the receipt has uncommitted changes; a re-pin must start from the committed receipt" };
  }
  return planReceipt({ familyId, directory, receiptPath, beforeText, on });
}

/**
 * The comparison itself, over one receipt's text. Separated from planFamily so
 * the same code path can be driven from a receipt recovered at any commit --
 * which is how the tests exercise it after the tree has already been re-pinned,
 * and how a reviewer can re-run a past decision without restoring the tree.
 */
export function planReceipt({ familyId, directory, receiptPath, beforeText, on = new Date() }) {
  if (beforeText !== `${JSON.stringify(JSON.parse(beforeText), null, 2)}\n`) {
    return { familyId, directory, receiptPath, outcome: "REFUSED", why: "the receipt is not two-space-indented JSON with a trailing newline; rewriting it would reformat bytes this tool has no business touching" };
  }

  const receipt = JSON.parse(beforeText);
  const drifted = driftedPinsOf(receipt);
  const unmeasurablePins = drifted.unmeasurable ?? [];
  if (drifted.length === 0) {
    return {
      familyId, directory, receiptPath, outcome: "NOTHING_TO_DO",
      why: `every measurable pin in this receipt already matches the bytes it names${unmeasurablePins.length ? `; ${unmeasurablePins.length} pin(s) declare their own custody unmounted and were not measured` : ""}`,
      unmeasurablePins
    };
  }

  const records = [];
  for (const d of drifted) {
    const record = { path: d.at, pinned: d.pin.sha256, now: d.missing ? "MISSING" : d.now, resolvedFrom: d.from, recordId: d.pin.recordId ?? null };
    if (d.missing) {
      record.outcome = "REFUSED";
      record.triedBases = d.triedBases;
      record.why = `the pinned record resolved under none of the bases this receipt declares (${d.triedBases.join(", ")}) nor at HEAD; an unresolved source is a different failure and is not a re-pin`;
      records.push(record); continue;
    }
    const adapter = ADAPTERS.get(d.at);
    if (!adapter) {
      record.outcome = "REFUSED";
      record.why = `no adapter describes ${d.at}, so which entries this family depends on cannot be decided; guessing the scope would make the comparison meaningless`;
      records.push(record); continue;
    }
    record.adapter = adapter.describe;

    const recovered = recoverBytesByDigest(d.at, d.pin.sha256);
    if (!recovered.bytes) {
      record.outcome = "REFUSED";
      record.why = `the blob carrying the old pin could not be recovered: ${recovered.why}`;
      record.searched = recovered.searched ?? null;
      records.push(record); continue;
    }
    record.recovery = recovered.recovery;

    try {
      const oldDoc = JSON.parse(recovered.bytes.toString("utf8"));
      const currentDoc = JSON.parse(d.bytes.toString("utf8"));
      const scope = adapter.scopeFrom({ receipt, pin: d.pin, currentDoc });
      record.scope = scope;
      const comparison = compareAnchors({ adapter, oldDoc, currentDoc, scope });
      record.anchorsCompared = comparison.anchorsCompared;
      record.anchorsIdentical = comparison.anchorsIdentical;
      record.anchorDetail = comparison.anchorDetail;

      if (comparison.differing.length > 0) {
        record.outcome = "REFUSED";
        record.why = `${comparison.differing.length} of ${comparison.anchorsCompared} entries this family binds changed between the recovered historical record and the current one: ${comparison.differing.join(", ")}`;
        record.differences = describeDifference({ adapter, oldDoc, currentDoc, scope, differing: comparison.differing });
        records.push(record); continue;
      }
      if (!(comparison.anchorsCompared > 0)) {
        record.outcome = "REFUSED";
        record.why = "no anchor was compared; a refresh with anchorsCompared 0 proves nothing and the doctrine refuses it";
        records.push(record); continue;
      }

      /* Which entries of this shared record moved that this family does NOT
       * bind. Stated so the note says what actually happened rather than only
       * what did not. */
      const movedElsewhere = typeof adapter.index === "function"
        ? (() => {
            const a = adapter.index(oldDoc, "recovered historical");
            const b = adapter.index(currentDoc, "current");
            return [...new Set([...a.keys(), ...b.keys()])].sort()
              .filter((id) => canonical(a.get(id)) !== canonical(b.get(id)));
          })()
        : [];

      record.outcome = "REFRESHABLE";
      record.was = { sha256: d.pin.sha256, byteLength: typeof d.pin.byteLength === "number" ? d.pin.byteLength : recovered.bytes.length };
      record.becomes = { sha256: d.now, byteLength: d.bytes.length };
      record.entriesThatMovedInThisRecord = movedElsewhere;
      record.identicalAnchorSha256 = comparison.identicalAnchorSha256;
      record.canonicalisation = comparison.canonicalisation;
      record.on = on;
      records.push(record);
    } catch (err) {
      record.outcome = "REFUSED";
      record.why = err instanceof Refusal ? err.why : `comparison failed: ${err.message}`;
      if (err instanceof Refusal && err.detail) record.detail = err.detail;
      records.push(record);
    }
  }

  const refused = records.filter((r) => r.outcome === "REFUSED");
  if (refused.length > 0) {
    return {
      familyId, directory, receiptPath, unmeasurablePins, outcome: "REFUSED",
      why: refused.length === records.length
        ? refused.map((r) => `${r.path}: ${r.why}`).join(" | ")
        : `${refused.length} of ${records.length} drifted records could not be refreshed, and a half-refreshed receipt asserts a repair that did not happen: ${refused.map((r) => `${r.path}: ${r.why}`).join(" | ")}`,
      records
    };
  }
  return { familyId, directory, receiptPath, outcome: "REFRESHABLE", records, unmeasurablePins, beforeText };
}

/* ------------------------------------------------------------------ *
 * Write it
 * ------------------------------------------------------------------ */

export function composeRefreshedReceipt(plan) {
  const receipt = JSON.parse(plan.beforeText);
  const byPathAndPin = new Map(plan.records.map((r) => [`${r.path}\u0000${r.was.sha256}`, r]));
  const applied = [];
  eachPin(receipt, (pin, at) => {
    const record = byPathAndPin.get(`${at}\u0000${pin.sha256}`);
    if (!record) return;
    const block = {
      refreshedOn: new Date(record.on).toISOString().slice(0, 10),
      was: { sha256: record.was.sha256, byteLength: record.was.byteLength },
      why: `The record was rewritten around this receipt's anchors. ${record.entriesThatMovedInThisRecord.length} named entr${record.entriesThatMovedInThisRecord.length === 1 ? "y" : "ies"} moved between the blob carrying the previous pin and the bytes on disk (${record.entriesThatMovedInThisRecord.join(", ") || "none"}), and this receipt anchors no entry that moved: every entry it binds, and this record's global authority fields, were recovered from that blob and compared object-for-object, order-independent, against the current record, and all ${record.anchorsCompared} were identical.`,
      anchorsCompared: record.anchorsCompared,
      anchorDetail: record.anchorDetail,
      anchorsIdentical: record.anchorsIdentical,
      identicalAnchorSha256: record.identicalAnchorSha256,
      canonicalisation: record.canonicalisation,
      anchorScope: record.scope,
      entriesThatMovedInThisRecord: record.entriesThatMovedInThisRecord,
      recoveredFrom: record.recovery,
      previousIdentityRefresh: pin.identityRefresh ? structuredClone(pin.identityRefresh) : null,
      whatThisDoesNotClaim: "Nothing about the packet's bytes, its obligations, its counters or its verdict. It restores an identity binding that lapsed on an edit to entries this family does not bind, and it opens no route and grants no approval."
    };
    const shape = annotationIsSourceBound(block);
    if (!shape.ok) throw new Refusal(`refusing to write a block that is not a source-identity note: ${shape.why}`);
    pin.sha256 = record.becomes.sha256;
    pin.byteLength = record.becomes.byteLength;
    pin.identityRefresh = block;
    applied.push({ path: at, was: record.was.sha256, now: record.becomes.sha256 });
  });
  if (applied.length !== plan.records.length) {
    throw new Refusal(`planned ${plan.records.length} pin refreshes but matched ${applied.length} pins in the receipt`);
  }
  return { text: `${JSON.stringify(receipt, null, 2)}\n`, applied };
}

export function applyFamily(plan) {
  const { text, applied } = composeRefreshedReceipt(plan);
  const verdict = readsAsUnmoved(plan.beforeText, text);
  if (!verdict.ok) throw new Refusal(`the rewritten receipt would still read as a moved family: ${verdict.why}`);
  const abs = path.join(ROOT, plan.receiptPath);
  const onDisk = fs.readFileSync(abs, "utf8");
  if (onDisk !== plan.beforeText) throw new Refusal("the receipt changed while this family was being planned; refusing a stale write");
  fs.writeFileSync(abs, text);
  return {
    applied,
    receiptBeforeSha256: sha256(Buffer.from(plan.beforeText, "utf8")),
    receiptAfterSha256: sha256(Buffer.from(text, "utf8"))
  };
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

export function lapsedFamilies() {
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, QUEUE), "utf8"));
  const rows = Object.values(queue).filter(Array.isArray).flat().filter((r) => r && typeof r === "object" && r.familyId);
  return rows.filter((r) => r.verificationLapsedBecause).map((r) => ({
    familyId: r.familyId,
    directory: r.directory,
    jurisdiction: r.jurisdiction,
    queueSaid: r.verificationLapsedBecause
  }));
}

function main(argv) {
  const apply = argv.includes("--apply");
  const only = new Set(argv.flatMap((a, i) => a === "--family" ? [argv[i + 1]] : []).filter(Boolean));
  const reportAt = argv.includes("--report") ? argv[argv.indexOf("--report") + 1] : null;

  const families = lapsedFamilies().filter((f) => only.size === 0 || only.has(f.familyId));
  const rows = [];
  for (const f of families) {
    if (!f.directory) { rows.push({ familyId: f.familyId, outcome: "REFUSED", why: "the queue row names no directory" }); continue; }
    let plan;
    try { plan = planFamily({ familyId: f.familyId, directory: f.directory }); }
    catch (err) { rows.push({ familyId: f.familyId, directory: f.directory, outcome: "REFUSED", why: err instanceof Refusal ? err.why : err.message }); continue; }

    /* The queue's summary against this tool's own measurement. */
    const queuePaths = (f.queueSaid.allDriftedRecords ?? [f.queueSaid]).map((d) => d.path).sort();
    const measured = (plan.records ?? []).map((r) => r.path).sort();
    if (JSON.stringify(queuePaths) !== JSON.stringify(measured)) {
      plan.queueSummaryDisagreesWithMeasurement = { queueSaid: queuePaths, measured };
    }

    if (plan.outcome === "REFRESHABLE" && apply) {
      try { Object.assign(plan, applyFamily(plan)); plan.outcome = "REFRESHED"; }
      catch (err) { plan.outcome = "REFUSED"; plan.why = err instanceof Refusal ? err.why : err.message; }
    }
    delete plan.beforeText;
    rows.push(plan);
  }

  const summary = rows.reduce((acc, r) => { acc[r.outcome] = (acc[r.outcome] ?? 0) + 1; return acc; }, {});
  const report = { tool: "repin-lapsed-source-identities", ranAt: new Date().toISOString(), applied: apply, summary, families: rows };
  if (reportAt) fs.writeFileSync(path.isAbsolute(reportAt) ? reportAt : path.join(ROOT, reportAt), `${JSON.stringify(report, null, 2)}\n`);

  for (const r of rows) {
    const counts = (r.records ?? []).map((x) => `${x.path.split("/").pop()} ${x.anchorsCompared ?? "-"}/${x.anchorsIdentical ?? "-"}`).join("; ");
    console.log(`${r.outcome.padEnd(13)} ${r.familyId}  [${counts}]${r.why ? `\n              ${r.why}` : ""}`);
  }
  console.log(JSON.stringify(summary));
  return rows.some((r) => r.outcome === "REFUSED") ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
