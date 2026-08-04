# RCAP source-materialization contract

Status: normative foundation contract

Schema: `rcap-source-materialization-requirement/v1`
Worker verifier: `scripts/verify-rcap-materialized-source.mjs`

## Purpose and boundary

Official-form packet work may occur in a separate Codespace only after every
required source binary has been projected into that worker's checkout,
measured from its current local bytes, and exposed under the assigned
read-only path. Registry metadata is evidence about an asset; it is not the
asset. In particular, `presence: present` can describe measurements made in a
different environment and never makes a packet worker ready.

This contract defines availability and integrity. It does not:

- acquire or reconstruct a private corpus;
- download a form from an issuing authority;
- publish or modify a Master Library archive;
- decide source currency, legal authority, licensing, or document role;
- approve a field map, packet, jurisdiction, route, or deployment; or
- alter packet release readiness, enable runtime, or promote a track.

The cross-Codespace interface is an exact immutable assignment plus a portable
locator. A host-specific `private/` tree is never the interface. Legacy
assignments that use `private/...` as a canonical path, locator entry, or
materialization destination are contract-incomplete and remain blocked until
integration regenerates a portable descriptor.

## Independent state facets

The following states are deliberately not collapsed into one availability
flag:

| Facet | State | Meaning |
| --- | --- | --- |
| Authority | `authority_asset_known` | An adopted authority edition identifies the exact asset. |
| Registry | `registry_metadata_present` | Repository metadata records the identity and expected measurements. |
| Binary | `binary_materialization_required` | Current local bytes have not passed verification. |
| Binary | `binary_unavailable` | The assigned destination or approved locator has no readable binary. |
| Binary | `binary_materialized` | A regular local file exists inside the authorized root. |
| Binary | `binary_size_mismatch` | Current local byte length differs from the pin. |
| Binary | `binary_hash_mismatch` | Current local SHA-256 differs from the pin. |
| Binary | `binary_media_type_mismatch` | Byte-sniffed media type differs from the pin. |
| Binary | `binary_hash_verified` | Current local bytes match size, SHA-256, and media-type pins. |
| Access | `worker_read_authorized` | The exact verified file is mode `0444` beneath a sealed mode-`0555` boundary. |
| Readiness | `worker_ready` | Every required source has passed all preceding local checks. |

`authority_asset_known` does not imply `registry_metadata_present`.
`registry_metadata_present` does not imply `binary_materialized`.
`binary_materialized` does not imply `binary_hash_verified`.
`binary_hash_verified` does not imply `worker_read_authorized`.
One ready source does not imply that a multi-source job is `worker_ready`.

A carried-forward registry measurement is recorded as
`carried_forward_registry_measurement`. It pins what must be observed, but it
never satisfies local verification. A successful worker-side check records
`freshly_verified_local_bytes`.

## Exact source descriptor

An approved source adapter must receive one immutable descriptor per exact
source identity. The descriptor binds:

- authority edition and immutable archive SHA-256;
- jurisdiction;
- document ID;
- document role;
- canonical authority path;
- expected SHA-256;
- expected byte count;
- expected media type;
- repository `sourcePath` as evidence only;
- a portable archive, connector, or approved locator;
- a repository-relative materialization destination;
- `worker_read_only_no_modify` treatment;
- the exact verification command;
- `retain_until_worker_integration_then_captain_managed_cleanup`;
- expectation and verification provenance; and
- every assigned track/component usage of the identity.

Version 1 gates official-PDF work and accepts only byte-sniffed
`application/pdf`. ZIP/DOCX, OLE/DOC, and other container formats require a
separate parser-backed contract rather than magic-byte inference.

The descriptor must additionally carry:

```json
{
  "schemaVersion": "rcap-source-materialization-requirement/v1",
  "identityBindingStatus": "exact_pinned_identity",
  "authorityAssetState": "authority_asset_known",
  "registryState": "registry_metadata_present",
  "provenance": {
    "registryPath": "data/record-clearing/source-artifact-registry.json",
    "freshLocalVerification": false,
    "registryPresenceConfersReadiness": false
  }
}
```

Document ID alone is not an identity. An ID must reconcile to one jurisdiction,
role, edition, canonical path, hash, size, media type, and assigned
destination. Ambiguous duplicate IDs, a missing role, fuzzy title matching,
or conflicting path claims fail as `unknown_source_identity`.

Identical source bytes shared by several packet components are installed once.
Every track/component usage remains in the provenance receipt. Two identities
that claim one destination with conflicting hash, size, media type, role, or
authority information fail closed.

## Trust anchors

The worker-side command resolves the requirement from
`tmp/rcap-factory/job.json`, verifies its `assignedJobSha256`, and treats CLI
values only as assertions against the assigned source:

```sh
node scripts/verify-rcap-materialized-source.mjs \
  --document-id <assigned-document-id> \
  --sha256 <assigned-lowercase-sha256> \
  --bytes <assigned-byte-count>
```

The factory's `validate-job` command must run first so the local scaffold
assignment is checked against the integration captain's immutable assignment
manifest. The verifier independently hashes and compares that captain-owned
anchor; a locally recomputed marker self-hash is insufficient. A worker cannot
authorize a different identity by changing CLI
arguments, adding an arbitrary path, or editing registry metadata.

The local projection root is supplied through
`RCAP_SOURCE_MATERIALIZATION_ROOT` or `--materialization-root`. There is no
repository-root fallback, and the host-local root is never persisted.

The worker CLI is verify-only. It has no download, extraction, copy,
overwrite, or permission-changing mode. Packet workers are prohibited from
materializing, reconstructing, or acquiring their own sources.

## Portable locator and adapter behavior

A portable locator has the form:

```text
approved-logical-scheme://normalized/entry/path.pdf
```

It contains no absolute `/workspaces/...` path, drive path, credentials,
query, fragment, empty segment, `.` segment, `..` segment, backslash, control
character, or encoded path traversal. A separate Codespace maps the logical
scheme to a local read-only archive/connector adapter at runtime. No absolute
host path is persisted in a descriptor or receipt.

An archive adapter must:

1. open the exact pinned Master Library archive read-only;
2. verify its SHA-256 before exposing an entry;
3. reject duplicate normalized names, archive symlinks, path traversal,
   decompression bombs, and entries outside the requested identity;
4. expose only the one bounded entry selected by the exact descriptor; and
5. leave the archive's bytes, metadata, name, and permissions unchanged.

A connector adapter must authenticate outside the descriptor, redact
credentials, and return bytes for the exact approved locator identity. Tokens,
participant data, source contents, absolute host paths, and credentials are
never logged.

The reusable `materializeVerifiedSource` export accepts a pre-resolved locator
root only from an integration/source adapter. It is not an acquisition client.
It requires the descriptor to match exactly one entry in an authorized
catalog. The resolver also supplies a receipt binding the same authority
edition and archive SHA-256 with
`freshly_verified_read_only_authority_container`.

## Confined installation

Before writing, the materialization root must already exist as a real
mode-`0700` directory controlled exclusively by the integration adapter.
Packet workers do not run concurrently with this pre-worker phase. The
adapter then:

1. rejects absolute, Windows, UNC, backslash, encoded, or dot-segment paths;
2. inspects every destination ancestor with `lstat`;
3. rejects symbolic links, hard-link aliases, non-regular files, and paths
   whose real location escapes the authorized root;
4. opens the approved locator source read-only and without following links;
5. measures current size, SHA-256, and byte-sniffed media type;
6. holds the source descriptor open, bounds the read to the exact pinned byte
   count, and writes an `O_EXCL`/`O_NOFOLLOW` temporary file inside the
   destination directory;
7. verifies the temporary file again and removes all write bits;
8. publishes it with an exclusive hard-link operation that cannot replace an
   existing path;
9. removes the temporary name;
10. verifies the final destination again from current bytes; and
11. seals the root and every destination ancestor to mode `0555` before
    evaluating worker read authorization.

An existing exact read-only destination is verified in place and reused. An
existing mismatch is preserved byte-for-byte and mode-for-mode: the adapter
must never overwrite, delete, chmod, rename over, or otherwise repair it.
Hash, size, media-type, path, link, or permission drift fails closed.

The implementation requires mode `0444` on each file and mode `0555` on the
complete root-to-parent chain as the portable file-level signal.
Because an owner can sometimes change mode bits, production orchestration
should additionally expose materialized inputs through a read-only mount or
equivalent ACL. Factory ownership and forbidden paths remain mandatory; mode
bits do not authorize worker mutation.

## Provenance receipt

The deterministic receipt records only non-sensitive, portable facts:

- edition, jurisdiction, document ID, and role;
- canonical authority path;
- expected and freshly observed SHA-256, byte count, and media type;
- authority archive SHA-256 and credential-free logical portable locator;
- repository evidence path and exact verification command;
- scaffold job, base commit, and captain-owned assignment-manifest hash;
- logical locator scheme, never its host resolution or credentials;
- root-relative materialization destination;
- expectation basis and local verification basis;
- read-only treatment and retention policy;
- usage bindings;
- each reached state; and
- a canonical receipt SHA-256.

Receipts intentionally omit wall-clock time and absolute roots so the same
remote integration branch, exact commit, job ID, and portable locator produce
the same receipt in another Codespace. Operational logs may add a timestamp
outside the canonical receipt, but it cannot replace byte verification.

## All-source readiness

For required sources `S`:

```text
worker_ready(S) =
  S is non-empty
  AND every identity is exact and authorized
  AND every destination is binary_materialized
  AND every current byte stream is binary_hash_verified
  AND every destination is worker_read_authorized
```

Deduplication is by exact source identity, never by filename or title.
Physical bytes may be shared across components while provenance mappings stay
distinct and covered by the immutable authorization digest. If any required
source is missing or mismatched, the aggregate job remains
`binary_materialization_required`.

## Factory contract

Official-PDF implementation jobs must:

- depend on `rcap-nationwide-source-materialization-contract`;
- remain blocked while any descriptor says
  `binary_materialization_required`;
- list every materialization destination as an exact required input;
- include one exact verifier command per unique source;
- own a dedicated packet regression verifier; and
- prohibit workers from downloading, reconstructing, editing, or replacing a
  source.

The planner may change a job to ready only after an integration-owned
materialization step produces matching receipts for every required source and
regenerates the immutable assignment with `binary_hash_verified`,
`worker_read_authorized`, and `worker_ready`. Registry `presence`, a
carried-forward hash, an accessible `private/` path, or a satisfied acquisition
job cannot substitute for those receipts.

At the baseline that introduced this foundation, legacy generated claims still
carry registry-era `private/...` paths and omit several descriptor bindings.
Those jobs correctly remain blocked. Shared planner and schema files are
integration-owned rather than worker-owned, so the integration captain must
regenerate those claims from this contract before selecting an official-PDF
worker.

Materialization readiness remains separate from authority clearance, source
currency, license permission, packet implementation proof, technical proof,
visual proof, counsel adoption, persistence, staging, and promotion.

## Retention and cleanup

Verified inputs are retained read-only until the worker commit has been
integrated and the integration captain releases the worktree. Only the
captain-managed cleanup process may remove that local projection. Cleanup
never deletes, edits, repacks, renames, or changes a Master Library archive or
its connector source.
