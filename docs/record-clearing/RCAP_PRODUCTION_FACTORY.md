# RCAP production factory

The production factory turns the repository's current record-clearing authority,
normalized tracks, source state, implementation proofs, and promotion posture
into bounded jobs for independent Opus and Codex workers. It derives work; it
does not create a second legal registry or change a legal conclusion.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run rcap:factory:plan` | Print the deterministic queue and integration waves as JSON. |
| `npm run rcap:factory:status` | Show jurisdiction progress and the first exact blocker. Add `-- --tracks`, `-- --jurisdiction MS`, or `-- --json` for detail. |
| `npm run rcap:factory:prompt -- <jobId> --model opus\|codex` | Compile the short worker prompt from one job manifest. |
| `npm run rcap:factory:scaffold -- <jobId>` | Print the isolated branch/worktree scaffold plan. `--apply` creates a complete linked Git worktree, not just its reported marker path; retain it through integration. |
| `npm run rcap:factory:inspect-pdf -- <source>` | Emit deterministic structural, field, widget, coordinate, ownership-candidate, and SHA-256 metadata for a PDF. |
| `npm run rcap:factory:validate-job -- <jobId>` | Enforce the job's path boundary, then run only its focused acceptance commands. |
| `npm run rcap:factory:generate-review -- <jobId>` | Rebuild the job's synthetic review PDF, page images, checklists, hashes, and tracked manifest. |
| `npm run rcap:factory:integrate-wave -- <waveId>` | Print the captain-only regeneration and full integration gates. Execution requires `--execute --captain-ack`. |
| `npm run rcap:factory:test` | Run the factory's focused deterministic and safety tests. |
| `npm run rcap:verify-normalization-readiness` | Validate the 24-jurisdiction review, inventory, authority-refresh, and exact-claim foundation. |

Run `plan`, `prompt`, `status`, PDF inspection, validation dry checks, and wave
dry runs from the repository root. All JSON output is stable: no current time,
absolute checkout path, random identifier, or directory enumeration order is
allowed into a manifest.

## Source model

The planner reads these existing sources of truth:

- Master Library authority:
  `data/record-clearing/master-library/authority.json`
- normalized tracks and packet sets:
  `data/record-clearing/legal-design-track-registry.json` and
  `data/record-clearing/legal-design-packet-set-manifests.json`
- track/source relationships:
  `data/record-clearing/legal-design-track-source-relationships.json`
- authoritative blockers and acquisition work:
  `data/record-clearing/master-library/authoritative-blocker-ledger.json` and
  `data/record-clearing/master-library/source-acquisition-queue.json`
- normalization review identities, bundle inputs, and exact-job claims:
  `data/record-clearing/master-library/repository-asset-audit.json`,
  `data/record-clearing/production-factory/normalization-readiness-input.json`,
  and `data/record-clearing/production-factory/job-claims.json`
- the reconciled 100-percent plan and 109-document acquisition-intelligence
  dossier under `planning/record-clearing-100-percent/`
- implementation records and review manifests:
  `data/record-clearing/implementation-tranches/`
- runtime and promotion posture:
  the track registry, packet capability registry, promotion matrix, and final
  review signoff

The planner emits jobs in ten lanes:

1. platform foundation
2. legal-design normalization
3. source authority/acquisition
4. custom pleading
5. AcroForm fill
6. flat-PDF overlay
7. composed route
8. guidance implementation
9. legal-output review
10. staging promotion

Every job has:

`jobId`, `parentJobId`, `canonicalWave`, `canonicalLane`, `lane`,
`jurisdiction`, `trackIds`, `strategyFamily`, `baseCommit`, `dependencies`,
`ownedPaths`, `integrationOwnedOutputs`, `forbiddenPaths`, `requiredInputs`, `expectedOutputs`,
`requiredOutputFields`, and, where applicable, `regressionVerifier`,
`participantPacketProofRequired`, `sourceMaterializationInputs`, or
`normalizationReadiness`; a reserved child also carries `assignmentClaim`,
`focusedValidation`, `integrationValidation`, `model`, `effort`,
`executionScope`, `status`, `commitSubject`, and `stopCondition`.
Source jobs additionally carry exact `acquisitionIds` or `reconciliationIds`.
Their generated prompt names those assignment IDs and `downloadedSourceCount`
as required top-level output fields; no-download reconciliation jobs also pin
the expected count to zero. The planner rejects duplicate assignment or
omission, and the focused validator enforces the declared fields without
weakening strategy-specific safeguards.

The 197 compiled mechanical jobs do not replace the canonical plan's 72 parent
jobs. Every compiled child carries exactly one canonical parent, wave, and lane.
The exact canonical track partition is 240 parent `tracks`, five Maryland
`authorityOnlyRoutes`, and five completed Mississippi Tranche 1 tracks: 250
unique normalized tracks with no omission, duplicate, or invented ID.

`parentJobId` is the child's single deterministic execution owner. A
jurisdiction-bounded mechanical child may aggregate tracks represented by more
than one canonical family parent; implementation ownership is selected by
canonical-lane match, then greatest matching-track count, then lexical parent
ID. This aggregation keeps the compiled child queue without pretending that
child bundles define canonical track coverage; the 250-track canonical
partition is verified independently.

Authority work retains ten distinct families:
`in_repo_identity_reconciliation`, `public_official_download`,
`official_download_automation_blocked`, `direct_issuer_request`,
`commercial_license`, `local_form_scope_correction`,
`source_identity_resolution`, `not_required_design_reconciliation`,
`superseded_source_replacement`, and the captain-only `edition_publication`
record for Master Library Edition 1.3. These are never flattened into “source
missing.”

Paths are normalized repository-relative POSIX paths. Validations are explicit
command arrays. A wave contains a stable `waveId`, ordered `jobIds`, and
captain-only integration commands.

## Worker and captain boundary

Workers:

1. scaffold one job;
2. use the compiled prompt rather than a nationwide framework prompt;
3. change only `ownedPaths`;
4. run `validate-job`, which runs only focused checks;
5. stage explicit paths and create the job's requested commit;
6. stop at the manifest's stop condition.

`scaffold --apply` creates the worker's complete linked Git checkout at
`worktreePath`. The separately reported marker and workspace paths are
metadata, not the checkout and not disposable generated output. Keep the
worktree, branch, and scaffold metadata until the integration captain has
integrated the commit. Focused validation fails closed on a factory worker
branch/worktree when its scaffold marker is absent.

Only ready `executionScope: worker` jobs may compile a worker prompt or
scaffold. Blocked, completed, captain, and human jobs fail closed at both
boundaries. Completed children remain visible for provenance but wave
integration never treats them as worker branches.

The integration captain alone may regenerate shared derived registries and
production-factory review manifests, run the normal test suite and promotion
gates, integrate a whole wave, and resolve cross-job ordering. A worker never
runs a full suite as a substitute for its focused acceptance command.

The validator fails closed on:

- exact, ancestor, or descendant overlap between active jobs;
- edits outside `ownedPaths` or under `forbiddenPaths`;
- another jurisdiction's memo;
- any existing immutable Master Library edition;
- generated global registries;
- runtime route, authentication, Supabase, Stripe, deployment, or production
  environment paths;
- packet capability, `packet_ready`, jurisdiction enablement, and launch-gate
  changes;
- broad staging or deployment commands.

Focused source-output checks also require local-form jobs to preserve local
scope and request legal-design reconciliation, and prohibit a commercial
license job from enabling generation without an adopted license pinned by
SHA-256.

The scaffold records the worker's actual starting commit separately from the
manifest's provenance commit. It also anchors the complete assigned job to the
captain-owned scaffold workspace outside the worker checkout. Validation uses
that immutable assignment even when correct completion removes the job from a
newly compiled pending queue; changing the marker and recomputing its local
hash cannot replace the captain-owned assignment. Validation uses the scaffold
start for the worker diff and verifies the manifest base remains an ancestor.

Every packet implementation job, including process guidance, owns or receives
a dedicated committed regression verifier. The verifier is an explicit output
and focused command and must cover positive fixtures, typed stops,
deterministic component and assembled-PDF bytes, field ownership, prohibited
content, required components, page counts and hashes, and runtime-disabled
behavior. A plan check or generated review manifest alone is insufficient.

Official-PDF readiness distinguishes an authority asset known to an edition
from locally materialized bytes. Registry `presence` metadata never makes a
worker ready. The integration-owned portable projection at
`data/record-clearing/production-factory/official-pdf-source-assignment-projection.json`
dispositions every production-queue identity exactly once. Only its
`exact_worker_assignable` rows may enter a child assignment. Each assigned job
carries the projection hash, exact source-identity keys, document IDs, track
and component uses, expected SHA-256 and byte count, archive-relative path,
portable locator, destination, read-only worker policy, materialization state,
and exact verification command. No private or host-specific source path is a
worker contract. The job stays blocked until every binary is materialized in a
sealed external root and hash-, size-, and MIME-verified, every dependency is
completed, and no required component has an unresolved or terminal
disposition.

All 53 currently assignable identities map exactly once across 18 canonical
children. Fifty-one authorize bounded new implementation work. Maryland
`CC-DC-CR-148` and `MDJ-008` are separately marked materialization-only inside
the existing Maryland supporting-components assignment because their renderer
is already complete; their missing bytes remain named external inputs and do
not reopen or replace that completed implementation.

The scaffold writes the exact assignment to the ignored worker-local
`tmp/rcap-factory/job.json`. The marker is anchored to the captain-owned job
manifest and repeats the projection hash, exact identities, hashes, tracks,
components, owned paths, expected outputs, verifier, implementation family,
and runtime-disabled invariant. It rejects missing or terminal identities,
cross-document substitution, broadened tracks/components, projection drift,
source destinations outside the portable contract, pre-existing source
destinations, and outputs outside job ownership. The integration checkout does
not have or commit a global marker.

Legal-review materialization uses the existing platform-foundation lane and
the jurisdiction's canonical normalization parent. The portable contract at
`data/record-clearing/production-factory/legal-review-materialization-contract.json`
derives 24 exact owner jobs from current readiness data. Each assignment pins
one active review, zero addenda, its title and Markdown MIME, review and
archive hashes, portable archive and entry locators, materialization
destination, verifier receipt, downstream normalization child, exact session
claim, and stop condition. An exact verified archive makes only the bounded
materialization child ready. The child becomes completed only when the review
and exact receipt verify. Missing archives, review/title/hash/MIME/jurisdiction
drift, duplicate active reviews, unexpected addenda, path/ownership escape,
links, writable bytes, or receipt drift fail closed. The contract assigns
materialization work; it neither copies review text into the plan nor
authorizes research or normalization.

New-jurisdiction normalization likewise stays blocked until the active
controlling review is materialized and checksum-verified, the complete
mechanism inventory and expected source-ID set reconcile to a deterministic
hash, review precedence is resolved, and primary-authority refresh
requirements are explicitly recorded. The 24 remaining review identities are
derived from the Edition 1.2 authority audit; the planner no longer contains a
Pennsylvania-only readiness branch. Retrieval records keep shell blocking
separate from browser-accessible official authority; a `curl` 403 does not
become `authority_absent` when the exact issuing page remains available
through the approved browser retrieval channel.

Session reservations are exact job claims. A reserved ready job requires the
matching `--session` value at scaffold time. Duplicate job claims or two
session owners for one normalization jurisdiction invalidate the plan. Claims
reserve routing only: they do not satisfy readiness or allow a blocked child
to be scaffolded. The complete bundle and hashing rules are documented in
`RCAP_NORMALIZATION_READINESS_CONTRACT.md`.

## PDF inspection and review artifacts

PDF inspection reports the source SHA-256, page count, structure class,
AcroForm field names, widget types, page rectangles, export values, multiline
fields, duplicate names, signature blocks, and probable participant and
third-party fields. Probable ownership is a review candidate only. The
inspector never changes an ownership approval.

Review generation writes reproducible binary artifacts below
`artifacts/rcap-factory/reviews/<jobId>/`, which remains ignored. The tracked
manifest is
`data/record-clearing/production-factory/review-manifests/<jobId>.json`.
It records packet hashes, page counts, page image hashes, and separate
technical and visual checklists. Rebuilding identical inputs must produce
identical bytes and manifest content.

The tracked production-factory review manifest is an
`integrationOwnedOutputs` artifact. It may contain fail-closed production
enablement state, so workers never own, create, stage, or commit it. Workers
commit reproducible fixtures, packet hashes, and legal recommendations; the
captain runs `rcap:factory:generate-review` after integration. Protected-content
validation remains strict and grants no worker exemption for production state.

## Completion dashboard

The dashboard reports, for each known track:

- normalized
- authority pinned
- implementation complete
- technical proof passed
- visual proof passed
- legal recommendation complete
- counsel adopted
- staging passed
- production enabled
- exact blocker

Jurisdictions without normalized tracks remain visible. Completion is 100
percent only when all 51 jurisdictions are normalized and every track has a
terminal disposition: production enabled or an explicit terminal legal
disposition. A state-level review alone cannot make the dashboard complete.
