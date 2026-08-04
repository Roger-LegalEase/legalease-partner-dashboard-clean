# RCAP normalization-readiness contract

This contract turns the active legal review in Master Library Edition 1.2 into
a portable, hash-bound input for one jurisdiction normalization job. It is an
integration-owned authority-input layer. It does not normalize a jurisdiction,
approve a proposed legal strategy, publish a new edition, or make a packet
runtime-ready.

## Controlling inputs

The committed authority audit already identifies one active legal review for
each of the 24 remaining non-Pennsylvania jurisdictions:

- `data/record-clearing/master-library/authority.json` pins Edition 1.2 and its
  immutable archive hash;
- `data/record-clearing/master-library/repository-asset-audit.json` pins each
  review's exact archive entry, revision, and SHA-256;
- `data/record-clearing/production-factory/normalization-readiness-input.json`
  partitions research ownership and receives captain-approved bundles; and
- `data/record-clearing/production-factory/job-claims.json` reserves exact
  compiled jobs so two sessions cannot receive the same jurisdiction.

The original active legal review controls when no Edition 1.2 addendum exists.
An addendum is not required merely because a jurisdiction is entering the
normalization queue.

An authority identity in the committed audit is not local byte availability.
The twelve Session B identity confirmations are retained in the input registry,
but each deliberately says that a portable materialization receipt is still
required; a confirmation from another Codespace is not silently treated as the
current worker's readable file.
The review must be materialized from the portable Edition locator into the
assigned temporary path, verified against the pinned hash, and exposed
read-only. No worker may rely on another Codespace's absolute path or copy a
review permanently into its state output directory.

## Captain-owned research bundle

Sessions B and D return one JSON bundle per reserved jurisdiction. The captain
validates it before adding it to the `bundles` array. A bundle uses
`rcap-normalization-readiness-bundle/v1` and includes:

- authority edition, exact review archive entry, revision, review date, and
  review SHA-256;
- a read-only materialization receipt binding the portable archive locator,
  archive SHA, temporary path, observed review SHA, and verification command;
- the controlling-review precedence decision;
- every reviewed mechanism slot and the expected source-ID set;
- retained form IDs, exact open questions, official-primary-authority refresh
  requirements, and approved retrieval methods.

Validate a returned bundle without editing the registry:

```sh
node scripts/verify-rcap-normalization-readiness.mjs --bundle path/to/bundle.json
```

The integration captain, not a research session, owns the committed readiness
registry.

## Mechanism inventory

Each reviewed slot contains these exact fields:

- `sourceId`
- `reviewSlot`
- `legalMechanismName`
- `classification` (`relief` or `non_relief`)
- `candidateFilingActor`
- `candidateDestination`
- `referencedStatutesOrRules`
- `referencedOfficialForms`
- `unresolvedQuestions`

The canonical payload binds schema version, authority edition, jurisdiction,
controlling-review SHA, and rows. Row keys have fixed ordering; string arrays
and rows are sorted; duplicates are rejected. Retrieval timestamps and
absolute Codespace paths are outside the payload and forbidden in inventory
rows. `mechanismInventorySha256` is the SHA-256 of that canonical payload.

The inventory is a denominator for normalization. Preserving a review's
proposed classification, actor, destination, or strategy does not adopt it as
final legal design.

`expectedReviewSlots` and `expectedSourceIds` must each reconcile exactly to
the inventory. A missing slot, extra slot, duplicate source ID, duplicate
review slot, or changed hash fails closed.

## Data-derived states

The planner derives, rather than assigns by jurisdiction, these states:

- `legal_review_materialization_required`
- `legal_review_hash_mismatch`
- `mechanism_inventory_required`
- `mechanism_inventory_hash_mismatch`
- `expected_source_ids_required`
- `official_authority_refresh_required`
- `ready_for_normalization`
- `normalization_in_progress`
- `normalization_complete`

A job becomes `ready_for_normalization` only after the one active review is
materialized and hash-verified, its complete inventory and expected source IDs
reconcile, primary-authority refresh requirements are explicitly recorded,
and review precedence is resolved. The nationwide readiness foundation must
also be complete before the compiled child becomes `ready`.

`shell_download_blocked` is not `authority_absent`. A browser-accessible
official page with a captured hash can satisfy the same section's refresh
requirement. `authority_absent` and `authority_archive_inconsistent` remain
distinct fail-closed states.

Pennsylvania's already-scaffolded assignment is represented by its exact
`in_progress` claim rather than a jurisdiction-specific planner exception.
That transition does not permit a new job lacking the readiness inputs to be
scaffolded.

## Exact-job claims

Every reserved child has one exact `jobId`, jurisdiction, owner session, and
claim state. Conflicting jurisdiction owners or duplicate job IDs invalidate
the plan. When a reserved job becomes ready, scaffolding requires its owner:

```sh
npm run rcap:factory:scaffold -- \
  rcap-ky-legal-design-normalization \
  --session SESSION_B \
  --apply
```

The command creates a complete linked Git worktree. The claim does not make a
blocked job ready and does not allow the worker to edit shared readiness or
claim registries.

## Current fail-closed posture

The Edition 1.2 review identities are known for all 24 jurisdictions. The
portable archive and the Session B / Session D mechanism-inventory bundles are
not materialized in this integration checkout, so none of the 24 new children
is currently scaffoldable. The first eight remain reserved; they are not
executed or falsely promoted by this foundation change.
