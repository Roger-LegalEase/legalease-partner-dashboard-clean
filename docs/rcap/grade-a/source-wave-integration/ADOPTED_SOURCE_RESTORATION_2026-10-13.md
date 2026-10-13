# Exact adopted-source restoration for Source Conveyor

Run 38400916784 attempt 2 reached Generator convergence after successfully
restoring the pinned Master Library. The first generator refused the absent
CR-432 original. This is a separate source-custody installation gap, not a
missing-token failure or permission to relax the generator.

`SOURCE_USER_UPLOAD_ADOPTION_2026-09-11.json` has 22 pinned records. Five files
are already tracked under `reference/`; JDF-615 belongs to the pinned Master
Library. The other 16 are not installed by that bootstrap:

| Original custody | Required records |
|---|---|
| User upload ZIP, 2026-09-11 | CR-432; 4-222; JDF-493, 205, 206, 614; Louisiana CCP arts. 986 and 978.1 (eight files) |
| Partial Nationwide recovery pool | JDF-613 and JDF-492 (two files) |
| ND remote-access acquisition | Supporting declaration, instructions, notice of motion, confidential-information form, office-service declaration (five files) |
| OH acquisition | Superintendence Rules, 2026-08-06, including Appendix D Form 96-C1 (one file) |

The same generator also reads the existing Arizona R-26-0001 attachment
adoption. Its two records share one pinned nine-page file. Restoring that
dependency does not expand or alter any source adoption.

## Restoration contract

After the existing corpus bootstrap, `scripts/rcap-corpus/restore-adopted-sources.py`
checks every record, fetches missing originals and verifies their length and
SHA-256 before installing anything. The original upload archive and every
member must match the existing custody manifest. No verified GitHub mirror
currently exists. CI requires an explicitly approved **private** release locator
in repository variables `SOURCE_ADOPTION_BUNDLE_REPOSITORY` and
`SOURCE_ADOPTION_BUNDLE_RELEASE_TAG`; there is no default or inferred mirror.
These variables identify a custodian-confirmed asset, and do not authorize its
publication. Neither the August 28 Master Library release nor the September 15
recovery repository is a substitute for the September 11 bundle.
The workflow uses the existing `SOURCE_CORPUS_READ_TOKEN` only for this private
read. A local custodian may instead supply `--upload-bundle /private/path/original.zip`.

Recovery-pool and subsequent acquisition URLs can supply only the exact pinned
bytes. A newer or otherwise different PDF is refused, even if its form number
matches. The Master Library file must already exist from the pinned bootstrap.
Missing tracked references are not downloaded over. Existing source files are
never overwritten, symlink/traversal destinations are refused, and all newly
installed files remain ignored by Git. No bytes are written when preflight
finds an unavailable or mismatched source. The unchanged generator validator
then independently rechecks the two adoption manifests.

This restores a finite input set; it neither rebuilds the Nationwide corpus
nor issues legal, source-currency, packet, commercial or Production approval.

## Exact custody request still outstanding at authoring

The Drive connector confirms the original archive's metadata and private
ownership, but authenticated raw-file retrieval failed twice with a provider
dispatch error. A read of the existing private GitHub release confirms that it
has no mirror of this archive. This is **unavailable transport**, not a claim
that the original was lost.

First, an authorized source custodian must download the existing Drive ZIP into
an access-restricted local location, using the same filename without changing
Drive sharing. The local and ZIP-member search found no original copies in the
accessible Codespace source/evidence locations. No archive should be recreated,
and no private release or asset should be published without explicit authorization.

- File: `legalease-source-bundle-20260911.zip`
- Original Drive ID: `1nRGzcS-6P2y2cXdcyp9AEHsowVosnOW-`
- Length: **3,669,331 bytes**
- SHA-256: `6d741583740ba6cdc4daec17d12abcd350257bf3eaea550ecee988bed0cb6d02`
- Original member identities and hashes:
  `data/rcap-grade-a/source-custody/user-upload-20260911/manifest.json`

From the engineering worktree, verify the transferred archive and every original
member without extracting or copying them (replace only the local path):

```bash
PYTHONDONTWRITEBYTECODE=1 python3 - /private/path/legalease-source-bundle-20260911.zip <<'PY'
import json, runpy, sys
from pathlib import Path
m = runpy.run_path('scripts/rcap-corpus/restore-adopted-sources.py')
custody = json.loads(Path(m['CUSTODY']).read_text())
held = m['read_bundle'](Path(sys.argv[1]).read_bytes(), custody)
adoption = json.loads(Path(m['ADOPTION']).read_text())
for row in adoption['sources']:
    if row['heldCorpusPath'].startswith('private/source-imports/user-upload-20260911/'):
        m['verify'](held[row['sha256']], row)
        print(row['sourceId'], row['byteLength'], row['sha256'], row['heldCorpusPath'])
print('PASS: original archive, all 14 members and eight adopted destinations verified; no files written')
PY
```

The eight extraction destinations are the exact `heldCorpusPath` values printed
above: `private/source-imports/user-upload-20260911/<pinned-sha256>.pdf`. Do not
extract directly into the repository or substitute the similarly named JDF-615.
After the existing pinned Master Library bootstrap, install the complete adopted
set with the checked installer:

```bash
python3 scripts/rcap-corpus/restore-adopted-sources.py --upload-bundle /private/path/legalease-source-bundle-20260911.zip
python3 scripts/rcap-corpus/restore-adopted-sources.py --check-only
```

Local transfer alone does not restore a fresh CI runner. The remaining CI custody
action is to designate and authorize a private transport for this **same original
ZIP**, then configure the two locator variables for a confirmed private release
asset bearing the original filename. The existing read token must be allowed to
read that repository. No credential or repository setting is changed by this
implementation. If another transport is selected, adapt only transport acquisition
while preserving archive, member and adoption verification. Until transfer and CI
verification occur, restoration remains REFUSED and downstream checks NOT_RUN.

Do not recreate the ZIP: its archive hash is pinned as well as its members.
In particular, the Louisiana originals are uploaded PDFs; printing their HTML
again would create different bytes. The upload named JDF615(2).pdf is a different
revision/hash from the adopted Master Library JDF-615 and must not replace it.

The complete 22-record expected identity/length/hash table and actual retrieval
observations are preserved with the current engineering evidence under
`source-conveyor-restoration-20261013/`. This custody request must remain open
until the actual archive and restored files verify; a metadata read alone is
not a byte-verification receipt.
