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

## Captain-owned research evidence

Sessions B and D return immutable research bundles and manifests. The captain
validates their committed bytes, manifest digest, jurisdiction partition and
slot count, then derives production readiness bundles without rewriting the
raw evidence. Session B contributes 12 jurisdictions and 182 mechanism rows;
Session D contributes 12 jurisdictions and 131 keyed mechanism rows.

Session D also returned one immutable adjudication artifact and manifest. The
captain verifies the artifact and manifest hashes, the parent research commit,
and byte identity of the original bundle before adoption. The adjudication may
replace source identities or add a typed blocker only where it expressly
resolves or narrows that field. It does not rewrite the research bundle,
normalize a state, create a track, or make a readiness record production-ready.

The derived bundle uses `rcap-normalization-readiness-bundle/v1` and includes:

- authority edition, exact review archive entry, revision, review date, and
  review SHA-256;
- a read-only materialization receipt binding the portable archive locator,
  archive SHA, temporary path, observed review SHA, and verification command;
- the controlling-review precedence decision;
- every reviewed mechanism slot and the expected source-ID set;
- retained form IDs, exact open questions, official-primary-authority refresh
  requirements, and approved retrieval methods.

Validate a separately materialized candidate bundle without editing the
registry:

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

`mechanism-inventory-v1` hashes the jurisdiction's mechanism-inventory array
only. It encodes compact UTF-8 JSON, recursively sorts object keys, sorts rows
by stable `sourceId`, and sorts scalar arrays unless the review expressly
marks their order legally substantive. It excludes volatile retrieval
timestamps and local materialization destinations. Absolute filesystem paths
and duplicate source IDs are rejected. `canonicalMechanismInventorySha256` is
the SHA-256 of those canonical bytes, and
`canonicalPayloadByteCount` records their length.

`researchSuppliedInventorySha256` is preserved separately because the two
research sessions used different evidence-hash algorithms. It is reproduced
as an evidence check but is not substituted for the repository-wide canonical
hash.

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
- `mechanism_inventory_count_conflict`
- `mechanism_count_counsel_addendum_required`
- `reviewed_through_librarian_correction_required`
- `codification_authority_unverified`
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

Pennsylvania has no planner special case. Its completed normalization is a
terminal child backed by its integrated memo and worker commit. That completion
does not permit a different jurisdiction lacking the readiness inputs to be
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

Both research bundles, the Session D adjudication, and the hash-bound
UT/VT/WV counsel structure adoption are committed, and all 24 jurisdictions
are represented exactly once with 313 total denominator rows. Counsel closed
the UT, VT and WV mechanism-count blockers without authorizing normalization:
Utah has 14 substantive tracks plus one adjacent routing node; Vermont's 14
source slots crosswalk to 11 substantive tracks; and West Virginia has 10
substantive tracks plus two shared-procedure nodes. West Virginia's
substantive review date is 2026-08-01 and 2026-08-02 is the packaging date, so
the librarian date blocker is also closed. Track-specific source,
legal-design, technical, and release blockers remain preserved. Tennessee
retains `codification_authority_unverified`; Public Chapter 268 is verified,
but the current codified text is not. The court-staff-only certification
remains outside participant generation.

The adjudication supplies official source identities for South Carolina,
Vermont and Wyoming and narrows Tennessee's official-source record. South
Carolina retains the corrected SCCA 223A1 and SCCA 223D1 identities, the
March 7, 2029 section 17-1-65 deadline, and the sentence-completion clock under
section 56-5-750(F). Vermont's stipulation treatment is procedural rather than
an independent remedy, and its three no-conviction routes compose one
alternative mechanism while preserving unit-level filings, forms, timelines,
and stop conditions. Wyoming uses the official `wyoleg.gov` title PDFs rather
than secondary publishers.

The exact Edition 1.2 archive is not materialized in this checkout, and the raw
research evidence does not carry the per-review byte counts required by the
source-materialization contract. Twenty-three states therefore remain
`legal_review_materialization_required`; Tennessee also retains its
codification blocker. Reserved jobs are not treated as claimed or ready until
their exact review bytes are locally materialized, size-checked, hash-verified
and read-only.

Every one of the 24 current readiness records now has a distinct canonical
materialization owner in
`data/record-clearing/production-factory/legal-review-materialization-contract.json`.
The normalization child depends on that jurisdiction's materialization child
and on the nationwide readiness foundation. The materialization child remains
blocked until the exact Edition 1.2 archive is available and verifies; that
exact external input makes only the bounded materialization job ready. The job
becomes completed, and the normalization dependency clears, only after the
exact review bytes, title, MIME, read-only destination, and verifier-issued
receipt all agree. A claim, portable locator, carried-forward research hash,
or contract row is not a receipt and cannot clear the blocker.

The review-specific verifier enforces one active review and zero addenda for
the assigned jurisdiction, the exact archive and review hashes, Markdown MIME,
jurisdiction identity, confined archive/destination paths, exact job
ownership, non-linked read-only bytes, and an exact receipt. Tennessee retains
`codification_authority_unverified` after materialization. Utah, Vermont, and
West Virginia likewise retain their route-, form-, notice-, exclusion-,
local-practice-, and once-per-lifetime questions; materialization closes no
unrelated blocker.
