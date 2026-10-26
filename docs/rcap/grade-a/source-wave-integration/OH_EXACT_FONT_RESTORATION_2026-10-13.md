# Ohio exact Arial runtime restoration

Both Source Conveyor and factory validation stopped at the original Ohio mapping's
private Arial input. The existing September 14 custody record, source receipt,
reviewed mapping, document geometry and rendered-output hashes remain unchanged.

Both jobs now install `cabextract` with their existing PDF inspection tools and
run the same `scripts/rcap-corpus/restore-oh-exact-font.py` before convergence.
It authenticates the original custody and source receipts, downloads only from
the two URLs already in that custody record, and verifies the complete package
before extracting Arial to memory. It never executes the installer. The extracted
font must match both its length and SHA-256 before either file is installed.
Existing destination bytes are verified and never overwritten. Paths must be
ignored, untracked private files without symlinks.

| Original | Bytes | SHA-256 |
| --- | ---: | --- |
| arial32.exe | 554208 | 85297a4d146e9c87ac6f74822734bdee5f4b2a722d7eaa584b7f2cbf76f478f6 |
| Arial.TTF | 275572 | 35c0f3559d8db569e36c31095b8a60d441643d95f59139de40e23fada819b833 |

Both files remain under ignored `private/source-imports/oh-exact-fonts-20260914/`.
The complete original package is retained. Neither file is committed, uploaded
as a workflow artifact, or redistributed by this change. This follows the existing
custody's installation/use scope and [Core Fonts EULA](https://corefonts.sourceforge.net/eula.htm);
no new legal or commercial approval is claimed. ArialMT 2.82 identity is established
by the exact original bytes bound in the existing custody, not a substitute font.

The 15 targeted tests require the real pinned original package; no positive is
skipped when it is absent. They cover exact installation, idempotence, both
recorded upstream transports, missing/mismatched packages and extracted fonts,
changed receipts, existing conflicting files, symlinks, unignored and tracked
paths. The readiness summary also requires both restoration and its guards.
A fresh disposable local checkout fetched the original from the recorded primary
upstream and verified both exact hashes and lengths. No PDF is regenerated.

Local full Ohio mapping verification separately requires the original official
rules PDF, which is absent from this Codespace's private source-acquisition path.
Fresh CI already restores that prerequisite before the font step; its actual
convergence result, including any subsequent missing dependency, remains the
integration verdict. A font restoration pass does not grant packet acceptance,
conveyor readiness, commercial authority or Production permission.
