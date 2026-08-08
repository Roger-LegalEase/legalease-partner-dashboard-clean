# Edition 1.3 publication — held on the parent chain

Status: **held**, 2026-08-08. Authorized by the project owner, not carried out.
One external file resolves it.

## What is ready

The Edition 1.3 tranche is closed and verified. `rcap-plan-edition-successor`
reads 36 candidates and admits 4:

| Job | Jurisdiction | Kind |
| --- | --- | --- |
| `rcap-hi-hcjdc-159b-technical-structure-and-edition-asset` | HI | new bytes |
| `rcap-de-form-281e-edition-metadata-correction` | DE | metadata correction |
| `rcap-fl-source-identity-resolution-rule-3-989-continuation` | FL | metadata correction |
| `rcap-ma-official-download-automation-blocked` | MA | metadata correction |

32 candidates stay in the deferred backlog, each carrying the exact criterion it
misses. Nothing was admitted on a near miss and nothing was silently dropped.

    tranche manifest sha256  8cb9576282407f6883ea49f1e26360d34649827c922ad7c348b50fbbbadfd432

`rcap-nationwide-master-library-edition-1-3-tranche-1-publication` is `ready`,
captain-scope, and all four of its dependencies are satisfied. The publication
job has not been run, so its expected output does not exist and the job is not
marked complete. A record of a hold is not a record of a publication.

## Why it is held

Edition 1.3's own parent is Edition 1.2, and that link is exact: the retained
archive hashes to the `7edd0a0e…` the authority record pins.

The link above it does not hold. Edition 1.1's archive is pinned at

    sha256  c66ea58a96618e7c8b07406e4e6e6eb14185785e7e00cea48ab038e120d28a99
    bytes   144,123,507

by `authority.json` **and**, independently, by Edition 1.2's own immutable
`00_GOVERNANCE/EDITION_SUMMARY.json`. Two records agree, one of them inside a
published archive that predates the current drop, so the pin is not a stale
transcription that a better copy could correct.

No file in this environment has those bytes. The archive was lost when the
Codespace restart destroyed `/workspaces/legalease-attorney-review-packages/`;
Edition 1.2 survived because a second copy sat under external custody, and
Edition 1.1 had none.

The only Edition 1.1 candidate supplied is a macOS re-compression of the
Edition 1.1 *tree*:

    sha256  4571a8febeeef404abbcb3c7fbe987e7fc266a6b5880d177ded2d7f47804563e
    bytes   144,683,531

Its content is authentic — `unzip -t` clean, all 538 entries in the archive's own
`CHECKSUMS.sha256` verify, and its `EDITION_SUMMARY.json` declares the Edition 1.0
parent digest this repository recorded independently beforehand. But it carries
`__MACOSX/` resource forks: same content, different container, different digest.
An edition is identified by its bytes, so this is not that archive.

The second supplied candidate, named `…Edition_1_1.zip`, is 9 bytes of the ASCII
text `Not Found` — a captured HTTP error page. It is retained under its own name
so the failed retrieval stays on the record.

## What was available and not taken

- Rewriting the pinned digest to match the supplied file. That is falsifying an
  immutability record, and it would now disagree with Edition 1.2's own governance.
- Relaxing the authority verifier to accept a content match. That weakens the gate
  the publication instruction itself depends on.
- Reconstructing Edition 1.1 from Edition 1.2. Expressly forbidden, and it would
  manufacture the very bytes in question.
- Leaving the re-zip at the canonical Edition 1.1 path. It was found there and was
  removed: a file standing at a path under a name whose identity it does not have
  is the possession-is-identity error made physical, and it let the successor plan
  report the grandparent as retained. It is now retained under a name that says
  what it is.

## What resolves it

The **original** `Expungement_AI_RCAP_Master_Library_Edition_1_1.zip`, exactly as
first published, digesting to `c66ea58a…` at 144,123,507 bytes, placed at

    /workspaces/legalease-attorney-review-packages/Expungement_AI_RCAP_Master_Library_Edition_1_1.zip

Then `npm run rcap:verify-master-library-authority` passes, the successor plan
reports lineage complete, and the tranche publishes unchanged — the admitted set,
the deferred set and the tranche manifest digest are all already fixed and do not
depend on this file.

Nothing else is waiting on it. The re-zip establishes that the Edition 1.1
*content* survives, so no asset is at risk while the archive is located.
