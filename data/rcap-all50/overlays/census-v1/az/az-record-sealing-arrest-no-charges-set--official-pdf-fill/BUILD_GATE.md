# Build gate — `az_record_sealing_arrest_no_charges-set`

**Status: STOPPED AT STEP 1 (bind the source). The family is NOT built.**

Arizona record sealing under A.R.S. § 13-911 where the participant was **arrested
and no charges were filed**. Strategy `official_pdf_fill`. Route
`obligation:track-pathway:AZ:az_record_sealing_arrest_no_charges:remedy-1-record-sealing`.

Nothing in this directory is a field map, a fixture, a raster or an approval, and
nothing here should be read as one. No page of either official form was opened in
this container.

---

## What is missing

The two pinned binaries. Neither was ever on this container's disk.

| source | form | revision | pinned sha256 | state |
|---|---|---|---|---|
| `official-form:AOCCRSL1F-050825` | Petition to Seal Criminal Case Records | REV-2025-05-08 | `32c1e54d…de34db05` | **absent** |
| `official-form:AOCCRSL2F-050825` | Order Regarding Petition to Seal Criminal Case Records | REV-2025-05-08 | `436df2e1…fbca61b1` | **absent** |

`source-bind-gate.json` is the machine record, produced by
`scripts/rcap-census-v1-az-record-sealing-arrest-no-charges-source-bind.mjs`,
which exits 1. Its finding is `corpus_absent` — **not** `source_sha256_mismatch`.
The two are different findings and neither is a pass:

- an **absence** means the question was never put to any bytes;
- a **mismatch** would mean bytes exist and are the wrong ones.

The bookkeeping is sound and was checked separately, because that check needs no
corpus: `recordsAgreeOnEverySource` is **true**. The custody reconciliation and
`local-source-corpus-index.json` name the same two digests, the same byte lengths
(299110 / 213882), the same page counts (5 / 3) and the same AcroForm field counts
(71 / 41). Custody class is `SOURCE_ALREADY_HELD` and `commissionAcquisition` is
false, so nothing was acquired and nothing should have been: this was never an
acquisition task, it was a bind, and a bind requires the bytes.

## Why the bytes are absent, precisely

Not because they are lost. **The corpus is intact and these exact two binaries
were opened successfully in a parallel container during this same sprint.**

`origin/claude/census-v1-build-az-record-sealing-dismissal-not-guilty` (tip
`8c565480`) built its family from *these two files*, and its committed
`source-receipt.json` records both digests bound, byte lengths matching, and
`corpusIndexAgrees: true` for each. So the pin is right, the release asset is
right, and the archive is right. The only thing wrong is this container.

The failure chain here:

1. `bash scripts/rcap-corpus/bootstrap-private-corpus.sh` →
   `curl: (22) … error: 403` → `could not resolve the release asset`.
   The `GITHUB_TOKEN` present in this container cannot see
   `Roger-LegalEase/legalease-source-artifacts`, which holds the pinned release
   `source-corpus-2026-08-28`.
2. That is the documented symptom of a container that inherited only
   `legalease-partner-dashboard-clean`. The brief's prescribed remedy is to call
   `add_repo` for `Roger-LegalEase/legalease-source-artifacts`, access `read`.
3. **`add_repo` was called and was refused — twice — by this session's local
   permission classifier**, not by GitHub:
   *"Permission for this action was denied by the Claude Code auto mode
   classifier."*
4. Independently confirmed that the repository is genuinely unattached rather
   than merely unreadable: `mcp__github__get_release_by_tag` against that repo
   returns *"repository … is not configured for this session. Allowed
   repositories: roger-legalease/legalease-partner-dashboard-clean."*

Per the brief, the repo was **not** pre-probed with `curl`, `gh repo view` or
`git ls-remote` — the false-negative 404 that misled the first wave was avoided.
The 403 above came from the bootstrap script itself, on its real authenticated
call, which is a true negative.

No form was fetched from `azcourts.gov` or anywhere else. Egress to court and
agency hosts is refused by policy, a copy from a non-issuing host is not an
official source, and no mirror, cache or aggregator was consulted.

## Preflight

`node scripts/verify-packet-build-environment.mjs --family
az_record_sealing_arrest_no_charges-set --branch
claude/census-v1-build-az-record-sealing-arrest-no-charges`
→ `PACKET_BUILD_ENVIRONMENT_NOT_READY: 9/14 passed, 5 failed`.

Four failures are one cause — `master_library_mounted`,
`master_library_complete`, `corpus_matches_committed_index`,
`family_sources_bind` (2 of 2 sources do not bind). The fifth,
`assigned_branch_tip_visible`, is an artefact of this branch not yet existing on
the remote and clears on first push. The clone was unshallowed as instructed and
`clone_is_complete` passes.

## What I did not do, and would not do

- **No field census.** Step 2 requires geometry read off the document. There is
  no document. A census whose `censusBasis` claims first-hand inspection of a
  binary nobody opened is a false record.
- **No field map.** `not_mapped` is not a map, and neither is a map copied from
  a sibling.
- **No fixtures, no verification, no rasters.** Steps 6–8 render *from the source
  binary* and verify *from the artifact bytes*. Without the binary there is
  nothing to render and nothing to read back.
- **No build script.** Deliberate, and not laziness. A build script's substance
  is its explicit mappings and its role refusals, and both are keyed to field
  names I have never read. The sibling's names are on disk and I could have
  copied them — that is precisely the documentary substitution the brief
  forbids, and it would be wrong here twice over: an arrest that produced no
  charge has no charge, no case number and no disposition, so the sibling's
  field decisions are not merely unverified for this route, several of them are
  affirmatively wrong for it.
- **No approval request** claiming work types discharged. Three of the four
  (`OFFICIAL_SOURCE_ACQUISITION_REQUIRED`, `OFFICIAL_FORM_MAP_REQUIRED`,
  `ARTIFACT_REVIEW_REQUIRED`) are untouched by this session.

## What I did do

Both items are ones the brief marks as not depending on the source bytes.

1. **`local-filing-variation.json`** — step 4, filing / fee / venue / service /
   delivery, read from the committed compiled AZ profile and its cited agent
   reference, with provenance on every entry. Three entries are recorded open
   rather than answered — **venue**, **waiting period**, and the **service
   recipient** — because the committed corpus answers them only for the
   conviction limb or the dismissal/acquittal limb of § 13-911, and this route
   is neither. Carrying those answers across would have been the easy and wrong
   move: an arrest with no charges filed has no "court that handled the case"
   to file in and no offence class to run a waiting period from.

2. **`reports/route-reachability-finding.json`** — a finding that outlives the
   source gate. The compiled Arizona engine offers three case outcomes
   (`dismissed`, `acquitted`, `convicted_other`) and **none of them expresses an
   arrest with no charges filed**. `packetGenerator` wires no form to the
   sealing pathway at all. So this family's route is unreachable in the engine
   as compiled, and binding the binaries tomorrow would not change that. Not
   fixed here: it is eligibility and route identity, outside this family's owned
   path, and the rule it would need is not stated in any committed source.

## What would reopen this gate

**`unblockBy`** — any one of:

1. Attach `Roger-LegalEase/legalease-source-artifacts` (read) to the session, by
   granting this session permission to call `add_repo`, or by provisioning the
   session with both repositories at creation. Then:

   ```sh
   bash scripts/rcap-corpus/bootstrap-private-corpus.sh
   source private/source-corpus-environment.txt
   export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"
   node scripts/rcap-census-v1-az-record-sealing-arrest-no-charges-source-bind.mjs
   ```

2. Or supply a `GITHUB_TOKEN` / `GH_TOKEN` that can read that repository's
   releases, and run the same four commands.

**`toReopenThisGate`** — the bind script must exit 0 with
`everySourceBoundToItsOwnBytes: true`, and the preflight must print
`PACKET_BUILD_ENVIRONMENT_READY`. Then steps 2–8 run in order from the bound
bytes. The bind script already exists and is exercised; its absence path is the
outcome recorded today.

**The first thing to read off AOCCRSL1F-050825 once it is open:** which situation
the form offers for an arrest that produced no charge, and how it is selected.
The sibling measured the disposition control as `Check Box9` and took export
value `/2` for dismissal-and-not-guilty. **Which export value denotes this
family's situation — or whether the form offers one at all — is unknown, is not
inferable from the sibling's record, and is the hinge of this whole family.**
Note also that the AcroForm selection channel is currently refused outright by
`rcap-field-semantics.mjs::decideBinding`, which binds no widget whose type is not
text or dropdown, so even a correctly identified checkbox cannot be marked today; the sibling recorded that
same shared gate and did not work around it. Neither should this family.

Independently worth resolving: the committed agent reference names the sealing
pair as **AOCCRSL1F-091424 / AOCCRSL2F-091424**, while the corpus pins
**AOCCRSL1F-050825 / AOCCRSL2F-050825** (REV-2025-05-08). The pinned binaries
appear to be the *later* edition, so the reference's form-level descriptions may
not describe the forms this family binds. That is a state-pack fidelity note for
whoever owns the AZ pack; it is not a reason to prefer the older form.

## What finishing this family would still not do

It would open no commercial route, create no fulfilment record and approve
nothing for participant delivery. `OUTPUT_LEGAL_APPROVAL_REQUIRED` is a human
legal reviewer's to grant. And on this route, two eligibility questions — the
waiting period and the venue for a no-charges-filed petition — would remain open
after the documents rendered perfectly.
