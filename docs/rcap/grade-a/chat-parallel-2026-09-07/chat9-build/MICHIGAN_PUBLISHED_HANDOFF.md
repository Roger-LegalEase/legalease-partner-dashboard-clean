# Chat 9: two Michigan packet builds, September 7, 2026

This commit publishes the actual tested MC227 adapter, both family wrappers, 60-test suite, PDF-byte/pixel verifier and full two-pass build driver. It does not claim that the bulk PDF/map/raster candidate files have already been published in GitHub.

## Exact complete candidate bytes

Drive file `1efGjhkj7GH-txjCZi18PZevrIfKtkiTa`, `CHAT9_MICHIGAN_COMPLETE_CANDIDATES_2026-09-07.zip`: 13,978,404 bytes; SHA256 `6b76a312068c6249b7b93f360b783b0c272c90912682e4cc1208bfa222408622`. Uploaded, downloaded back and rehashed successfully through connected Drive.

The archive contains 111 scoped candidate files, `CANDIDATE_MANIFEST.json` and `candidate.patch`. Patch SHA256 `c7b6957d8b596e222ea703c109e001df79238727a5a46bbb7551f2389a5930b6`, 10,494,297 bytes. `git apply --check` and actual `git apply` both exit 0 in a clean scratch tree; all 111 resulting file SHA256 values match the manifest. No fonts, dependencies or private corpus are included. The exact held public MC227 blank is included.

The patch is relative to the recorded base and includes the core code also committed here. A should skip already-identical core paths after checking manifest hashes, install the remaining exact bytes, and refuse any conflicting path rather than overwrite newer work. Read back installed source/output hashes. Do not relabel an older repository PDF as this candidate.

## Actual build results

Families: `mi_setaside_application-set` and `mi_setaside_first_owi-set`. Ordinary: eight variants, 36 pages. First OWI: two variants, eight pages. Total: ten complete PDFs, 44 pages. Every packet retains all four MC227 pages; continuation sheets appear only where item 1, 3 or 4 exceeds four rows. No unrelated order or fee form is inserted.

60 Node tests pass. Both complete wrappers ran twice, four renderer exit codes 0. Both post-render byte-proof passes also exit 0. All 60 files across the two family directories are byte-identical. There are 230 unchanged protected-region pixel comparisons and 223 matching text-widget extractions. Complete visual inspection covers 23 unique full-page rasters and all 44 output-page instances. Both unmodified completeness CLI calls exit 0 / PASS_COMPLETE. These are author-run tests, not independent approval.

```sh
node scripts/build-census-v1-mi_setaside_application-set.mjs
node scripts/build-census-v1-mi_setaside_first_owi-set.mjs
node --test scripts/rcap-packet-recovery/chat9/test-michigan.mjs
python scripts/rcap-packet-recovery/chat9/inspect-michigan.py
python scripts/rcap-packet-recovery/chat9/verify-michigan-builds.py
node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family mi_setaside_application-set
node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family mi_setaside_first_owi-set
```

All commands, exit codes, log hashes, per-input hashes and every generated family-file hash are in the archived `repeat-build-proof.json`. Node 22.16, pdf-lib and PyMuPDF/NumPy were exercised. Shared imports were reconciled to current GitHub blob identities; old recovery archives are not represented as current checkouts.

## Source and implementation

MC227 / INST MC227 revision 3/25, four pages, 374474 bytes; SHA256 `9fec389975f06640aff057fbace9375866f64761c33e30c86e9798609f93b8a7`. Exact held bytes recovered from Actions run 33603361022, artifact 9836069874; acquisition ZIP SHA256 `442f6164eba2d149fc495fd38d40ec82769c9f280e9bab8c7833684970427095`. Current official source pages were examined; fresh web byte equality/source approval is not claimed.

The MC227-only adapter reuses existing shared fitting, metadata and active-content sanitizer functions. No shared renderer was forked or modified. The old hard-form host crashed on dangling annotations from repeated case-number widgets; the existing sanitizer already handles that case. All 106 original fields are classified, including the repeated identity/case fields. Section-qualified map identities distinguish repeated row numbers across items 1, 3 and 4 without changing source field IDs or labels.

Ordinary routes and item 2.c first-OWI remain distinct. An earlier OWI application, including a denied one, conflicts with item 2.c and is refused. Unknown substantive answers, fee-relief requests and protected-field injections are refused. Signatures, notarization, hearing details and completed-service certifications stay blank. Certified convictions and RI-008 are explicitly not supplied. These synthetic review fixtures do not infer legal eligibility or assert that attachments exist.

## Remaining requirements

Bulk source/PDF/map/raster publication pending; Chat 10 independent review pending; A integration/central raster/terminal accounting pending. Runtime/generation remain disabled. No terminal delta claimed.

MC227 instruction 11 prints AG PO Box 30212; the current AG expungement FAQ directs packets to PO Box 30217. The participant guide preserves and discloses that conflict and requires confirmation before mailing. The receiving division directory gives 313-456-0240. No external inquiry or counsel approval was invented. For real filing, obtain certified records and fingerprints, resolve missing identifiers/prosecutor destination, personally execute the oath and certify service only after it occurs.

Official sources: https://www.courts.michigan.gov/siteassets/forms/scao-approved/mc227.pdf ; https://www.michigan.gov/ag/initiatives/expungement-assistance/questions ; https://www.michigan.gov/ag/ag-contact-directory .

The three assigned Minnesota families are not included in this Michigan batch. No other worker's family or shared state was changed.
