> **Status note, added by the build that finished this family.** This finding is
> unrevised and nothing in it is contradicted. Two of its §7 open items are now
> answered: item 1 by `scripts/rcap-corpus/build-tooling-readable-rendition.py`
> and the `readable_rendition_stage_declared` preflight check, so an
> encrypted-source family CAN now render a filled artifact; item 2 is reported to
> the Captain and the shared index is still not edited. Item 3 remains open. The
> current state of the family is `handoff.md`.

# ca-1203-4-set — the source-fidelity question, resolved

**Short answer: the official binaries are readable directly, and nothing in this
family needs a derivative. Measure off the official form. The `unreadable`
classification in the corpus index is a true statement about pdf-lib 1.17.1 and
a false statement about the documents.**

Evidence: `reports/source-fidelity-official-vs-rescued.json`, produced by
`scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py`. That script
reads only; it writes no PDF and does not touch the committed derivatives.

## 1. The gate the predecessor stopped at is now open

All five sources bind by exact SHA-256 against the mounted Master Library. The
predecessor's `UNVERIFIABLE_BYTES_ABSENT` finding was true of its container and
is not true of this one; the corpus is recovered with
`bash scripts/rcap-corpus/bootstrap-private-corpus.sh`.

| Form | Pinned SHA-256 | Bytes | Size | Pages | Fields |
|---|---|---|---|---|---|
| CR-180 | `06c1b643…c98bbdbe` | bound exact | 110684 | 3 | 81 |
| CR-181 | `f737503a…95ce504` | bound exact | 110123 | 2 | 58 |
| CR-106 | `f8a37a9a…bf190c5a` | bound exact | 104278 | 2 | 48 |
| MC-025 | `b0ca1509…94f6f0af` | bound exact | 104832 | 1 | 12 |
| MC-031 | `defc9108…95191075` | bound exact | 109506 | 1 | 18 |

Every page of every form is 612×792 with `CropBox == MediaBox` and `/Rotate 0`.
No rotated page, no offset crop box: page coordinates and user-space coordinates
coincide throughout, so a measured rectangle needs no transform.

## 2. Exactly what the encryption is

All five carry the `/Standard` security handler with **an empty user password**
and `/P -1084`. This is permissions-only ("owner password") encryption — the
kind a publisher applies to stop editing, not to stop reading. Nothing is
secret; every one of them opens with no password in any implementation of the
standard handler.

| Form | `/V` | `/R` | Cipher | Key |
|---|---|---|---|---|
| CR-180 | 5 | 6 | AESV3 | 256-bit |
| CR-181 | 5 | 6 | AESV3 | 256-bit |
| CR-106 | 4 | 4 | AESV2 | 128-bit |
| MC-025 | 4 | 4 | RC4 (`/V2`), `/EncryptMetadata false` | 128-bit |
| MC-031 | 4 | 4 | RC4 (`/V2`), `/EncryptMetadata false` | 128-bit |

`/P -1084` decodes to: printing **allowed**, high-quality printing **allowed**,
accessibility extraction **allowed**, **filling in form fields allowed** — and
content modification, copy/extraction, annotation and page assembly denied.

That matters for this build specifically. `qpdf` reports `modify_form = True` on
all five: **filling these forms is the one modification the documents themselves
permit.** An official_pdf_fill strategy is operating inside the publisher's
stated permissions, not around them. It is only the *reading library* that is
the obstacle.

## 3. Why the corpus index says "unreadable"

`data/rcap-all50/local-source-corpus-index.json` records all five as
`structuralClassObserved: "unreadable"` with
`loadError: "Expected instance of PDFDict, but got instance of undefined"`.

That error was reproduced here exactly. pdf-lib 1.17.1 — the repository's only
PDF library — has no decryption support at all. `PDFDocument.load(bytes)` throws
`Input document to PDFDocument.load is encrypted`; with
`{ ignoreEncryption: true }` it proceeds to parse the still-encrypted object
streams as though they were plaintext, fails on every indirect reference, and
surfaces the `PDFDict … undefined` message. The message describes pdf-lib's
capability, not the document's condition.

Read through an implementation that supports the standard handler (qpdf 12.3.2
via pikepdf), all five open on the first try with an empty password.

**Recommendation to the Captain:** `structuralClassObserved: "unreadable"` is
misleading for these entries and probably for the other encrypted sources across
the corpus. A value such as `encrypted_permissions_only_readable` — carrying the
handler, `/V`, `/R` and the fact that the user password is empty — would say the
true thing. I have not edited that index: it is a shared manifest and outside
this family's owned path.

## 4. How each derivative was produced, and by what

From `data/rcap-all50/overlays/encrypted-pdf-rescue-report.json`, corroborated
against `scripts/rescue-encrypted-rcap-pdfs.mjs`:

- **Produced** 2026-06-17T17:53:41Z, by `qpdf` at `/usr/bin/qpdf`, method
  `qpdf_decrypt`, invocation `qpdf --decrypt <input> <output>`. No `--password`
  argument was needed or supplied, which is itself confirmation that the user
  password is empty.
- **Read from** the *operational* tree
  `private/Nationwide Record Clearing/LegalEase California/cr180.pdf` (and
  `cr181.pdf`, `cr106.pdf`) — a different tree from the Master Library bound
  above.
- **Source unchanged**: `sourceSha256Before == sourceSha256After` for each.
- No errors; each was reclassified `dirty_acroform` after rescue.

`qpdf --decrypt` is a structural transform: it rewrites the object layer without
re-rendering content. It is the least-lossy of the four methods that script
tries (the others — `mutool clean`, Ghostscript, and a rasterise-and-recombine
fallback — all rewrite or destroy content).

**The one assertion the predecessor could not check, I checked.** The rescue
report claims it read bytes whose SHA-256 is `06c1b643…c98bbdbe`. That is
precisely the pinned official hash, and I verified that hash against the Master
Library copy myself. So the derivative's *input* is provably the same document
as the official binary this family names — and, incidentally, the operational
tree and the Master Library held byte-identical copies of these three forms.

## 5. Do the derivatives match the official binaries, field by field?

Yes — exactly, on every dimension compared.

| Form | Pages | Terminal fields | Field-set delta | Widget geometry delta | Page content streams |
|---|---|---|---|---|---|
| CR-180 | 3 = 3 | 81 = 81 | none | none | identical on all 3 pages |
| CR-181 | 2 = 2 | 58 = 58 | none | none | identical on both pages |
| CR-106 | 2 = 2 | 48 = 48 | none | none | identical on both pages |

Compared per terminal field, by fully-qualified name: `/FT`, `/Ff`, `/MaxLen`,
widget count, and every widget's `/Rect` and page index — plus per page,
`MediaBox`, `CropBox`, `/Rotate`, and the SHA-256 of the concatenated content
stream. `fieldsOnlyInOfficial`, `fieldsOnlyInDerivative`, `fieldDifferences`,
`pageGeometry` and `contentStreamChangedPages` are all empty for all three.

The identical content-stream hashes are the strongest single result: the drawn
page — every rule, every caption, every stroked box the field map would be
measured against — survived the rescue byte-for-byte.

The derivatives differ from the official binaries in exactly one respect, which
is the intended one: the encryption and its permission bits are gone
(`modifyOther` and `extract` become true).

**MC-025 and MC-031 have no derivative at all** — they were never in the rescue
batch. Under the old premise that was a gap with no workaround. It is now moot:
both open directly.

## 6. Recommendation, and which way the evidence points

**Build off the official binaries. Do not use the derivatives for this family,
for measurement or for filling.**

The evidence points that way without ambiguity. The official bytes bind by
SHA-256, they open with an empty password, their geometry is uniform and
untransformed, and the form-filling permission is granted by the documents
themselves. There is no fidelity argument left for preferring a derivative when
the original is readable — and using one would leave this family's coordinates
resting on a 2026-06-17 transform when they could rest on the pinned bytes.

That the derivatives turn out to be faithful is worth recording, but it changes
nothing about which surface to measure: a faithful copy of a readable original
is simply unnecessary. **No geometry in this family will be measured off a
derivative.**

One toolchain consequence follows, and it is real:

- `scripts/lib/pdf-stroked-boxes.mjs` takes a **content stream**, not a
  `PDFDocument`. It is therefore usable directly on official bytes, since the
  content streams can be extracted from the encrypted original. The named
  measuring instrument is not blocked.
- **Writing** a filled artifact is blocked, because pdf-lib is the only writer
  here and it cannot open an encrypted input. Filling official CA forms requires
  either a decryption stage ahead of pdf-lib, or a writer that implements the
  standard handler. That is a factory-level decision affecting every encrypted
  source in the corpus, not just this family, so it is recorded here for the
  Captain rather than decided here.

## 7. Open items for the Captain

1. **Toolchain**: adopt a supported decryption stage for encrypted official
   sources (qpdf/pikepdf is not currently a repository dependency — it was
   pip-installed in this container and is not in `package.json`, and
   `scripts/verify-packet-build-environment.mjs` does not check for it). Until
   then, no encrypted-source family can render a filled artifact.
2. **Corpus index**: `structuralClassObserved: "unreadable"` is wrong for these
   five entries and should be replaced with a value that distinguishes
   "encrypted, permissions-only, readable" from "damaged". Shared manifest — not
   edited here.
3. **Cross-family**: the same misclassification very likely affects the other
   eight rescued sources (DE, ME ×2, NV, PA, WV, CA CR-409/CR-410) and any other
   encrypted entry. Worth a sweep.

## What this finding does not establish

- It does not establish that the derivatives are unfaithful — they are faithful,
  on every dimension measured.
- It does not approve anything for participant delivery, open a commercial
  route, or create a fulfilment record.
- It says nothing about `ca-1203-41-set`, a sibling worker's family.
