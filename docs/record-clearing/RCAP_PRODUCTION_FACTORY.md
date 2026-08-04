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
| `npm run rcap:factory:scaffold -- <jobId>` | Print the isolated branch/worktree scaffold plan. State-changing scaffold behavior requires its explicit apply flag. |
| `npm run rcap:factory:inspect-pdf -- <source>` | Emit deterministic structural, field, widget, coordinate, ownership-candidate, and SHA-256 metadata for a PDF. |
| `npm run rcap:factory:validate-job -- <jobId>` | Enforce the job's path boundary, then run only its focused acceptance commands. |
| `npm run rcap:factory:generate-review -- <jobId>` | Rebuild the job's synthetic review PDF, page images, checklists, hashes, and tracked manifest. |
| `npm run rcap:factory:integrate-wave -- <waveId>` | Print the captain-only regeneration and full integration gates. Execution requires `--execute --captain-ack`. |
| `npm run rcap:factory:test` | Run the factory's focused deterministic and safety tests. |

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
- implementation records and review manifests:
  `data/record-clearing/implementation-tranches/`
- runtime and promotion posture:
  the track registry, packet capability registry, promotion matrix, and final
  review signoff

The planner emits jobs in nine lanes:

1. legal-design normalization
2. source acquisition
3. custom pleading
4. AcroForm fill
5. flat-PDF overlay
6. composed route
7. guidance implementation
8. legal-output review
9. staging promotion

Every job has:

`jobId`, `lane`, `jurisdiction`, `trackIds`, `strategyFamily`, `baseCommit`,
`dependencies`, `ownedPaths`, `forbiddenPaths`, `requiredInputs`,
`expectedOutputs`, `focusedValidation`, `integrationValidation`, `model`,
`effort`, `status`, `commitSubject`, and `stopCondition`.

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

The integration captain alone may regenerate shared derived registries, run the
normal test suite and promotion gates, integrate a whole wave, and resolve
cross-job ordering. A worker never runs a full suite as a substitute for its
focused acceptance command.

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

The scaffold records the worker's actual starting commit separately from the
manifest's provenance commit. Validation uses that scaffold start for the
worker diff and verifies the manifest base remains an ancestor.

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
