# Human-input custody record — 2026-08-08

Session A, integration captain. Files supplied by the project owner as a drop in
the repository root of `legalease-partner-dashboard-clean`. Nothing here was
downloaded, and a supplied file is not an acquisition.

Every file was hashed before it was moved, copied to external custody, rehashed
at the destination, and only then removed from the repository root. Custody is
`0444` files under `0555` directories at:

    [external-custody-root]/human-input/2026-08-08/

No PDF, DOCX or ZIP from this drop enters version control. This record and the
source-acquisition decisions it points at are the tracked artifacts.

## Master Library Edition 1.1 — parent chain NOT restored

Two files claimed to be the Edition 1.1 archive. They are trivially
distinguishable, so the two-candidate stop condition does not apply:

| File | Bytes | Verdict |
| --- | --- | --- |
| `Expungement_AI_RCAP_Master_Library_Edition_1_1.zip` | 9 | Not an archive. Contains the ASCII text `Not Found` — a captured HTTP error page. Retained as `…NOT_FOUND_STUB.zip` so the failed retrieval is on the record. |
| `Expungement_AI_RCAP_Master_Library_Edition_1_1 2.zip` | 144,683,531 | A real, intact ZIP whose contents are authentically Edition 1.1. |

The contents verify:

- `unzip -t` reports no errors.
- All **538** entries in the archive's own `00_GOVERNANCE/CHECKSUMS.sha256`
  verify, with zero failures.
- Its `EDITION_SUMMARY.json` declares `edition 1.1`, `retained_assets 394`, and
  `parent_sha256 c0937fa7fa0ff6e97c9e6f736dc17390496987d4d404e71b6960147bffbc53f8`
  for Edition 1.0 — a digest this repository recorded independently, before this
  file arrived. That corroboration comes from outside the archive, so it is not
  the archive vouching for itself.
- 426 of its 539 files are byte-identical to the corresponding paths in the
  retained Edition 1.2 archive, consistent with 1.2 inheriting 1.1's canonical
  assets unchanged. The 113 that differ are governance and manifest files that
  are *expected* to differ between editions.

**But the archive bytes are not the archive the parent chain pins.**

    supplied  4571a8febeeef404abbcb3c7fbe987e7fc266a6b5880d177ded2d7f47804563e  144,683,531 bytes
    pinned    c66ea58a96618e7c8b07406e4e6e6eb14185785e7e00cea48ab038e120d28a99  144,123,507 bytes

The reason is visible in the archive: it carries `__MACOSX/` resource-fork
entries throughout. This is a macOS re-compression of the Edition 1.1 *tree*,
not the Edition 1.1 *archive*. Same content, different container, different
digest.

The original archive bytes do not exist anywhere in this environment; a search
for any file of exactly 144,123,507 bytes returns nothing.

The pin is corroborated from outside this repository. Edition 1.2's own archive
— retained, and hashing to the `7edd0a0e…` the authority record pins — carries
`00_GOVERNANCE/EDITION_SUMMARY.json` declaring `parent_sha256
c66ea58a…` and `bytes 144123507` for Edition 1.1. That is an immutable published
artifact, written before this drop arrived, agreeing with `authority.json`. So
the pinned digest is not a stale repository transcription that could be corrected
against a better copy: two independent records agree, and the supplied file
matches neither.

The loss is a Codespace-restart casualty rather than a data problem.
`/workspaces/legalease-attorney-review-packages/` held both edition archives and
did not survive the restart. Edition 1.2 was recoverable because a second copy
sits under external custody. Edition 1.1 had no second copy.

**Consequence.** `authority.json` and `edition-1-2/edition.json` pin
`c66ea58a…` as the parent digest, and the authority verifier treats a mismatch
as mutation of a published edition. That verifier is right and stays as it is.
Three things were available and none were taken:

- rewriting the pinned digest to match the supplied file — that is falsifying an
  immutability record;
- relaxing the verifier to accept a content match — that is weakening the gate
  the owner's own publication instruction depends on;
- reconstructing 1.1 from 1.2 — expressly forbidden, and it would manufacture
  the very bytes in question.

So **Edition 1.3 publication is held**. It is the one instruction in this pass
that was not carried out, and it is held for the reason the instructions
themselves name: publication would require weakening an unresolved gate.

What unblocks it is narrow and entirely external: the **original** Edition 1.1
`.zip`, exactly as first published, digesting to `c66ea58a…`. The re-zip is
retained as evidence and is enough to establish that the *content* survives, so
nothing is lost while that file is located.

## Maryland — CC-DC-CR-148

`CC-DC-CR-148__…__rev-2026-07.pdf` and `ccdccr148 (1).pdf` are **byte-identical**
(238,823 bytes, `abcafbc298d56937ad41ba44675147942b1ab540325898917efafed3f5b43e3f`).
One canonical source; the second is recorded as custody provenance only. No
second identity was created.

Recomputed from the supplied bytes, and matching the expected historical
measurement exactly: 238,823 bytes, that digest, 1 page, 56 AcroForm fields,
`clean_acroform`. Nothing was forced to the expected values — they simply agree.

The portable lifecycle is **already in place**. The materialized copy at
`[materialization-root]/official-pdf/MD/MD__FORM__CC-DC-CR-148__…__REV-2026-07__EN.pdf`
hashes to the same `abcafbc2…`. The supplied original is therefore independent
corroboration of a sealed receipt: two copies from different provenance,
identical bytes. The file was **not** copied into the obsolete private path.

The companion is a live gap. `CC-DC-CR-148` requires **MDJ-008 — Notice
Regarding Restricted Information Pursuant to Rule 20-201.1**. MDJ-008 *is*
materialized portably (248,175 bytes, `42510792803b979974b3967dfd0f871271e7518cf64e226d5a80e22b67a6e369`),
so the contract is present and current. What is stale is the
`source-artifact-registry.json` `sourcePath` for both forms, which still points
at `private/Nationwide Record Clearing/LegalEase Maryland/forms/…`. That
directory does not exist. The registry's pointer is legacy; the bytes are not.

The migration is now recorded, not merely diagnosed.
`rcap-md-legacy-official-pdf-evidence-migration` — a captain-scope job that had
been hard-coded `blocked` while the dependency it named had already completed —
now derives its status from the two conditions it claims to wait on, and its
decision record carries both sources' exact identity, revision, bytes, digest,
structural class, portable materialization destination, read-only treatment,
receipt, consumer relationship and resolution rule. Neither PDF was copied into
the legacy private path.

One discrepancy is recorded rather than reconciled away. The registry counts 55
AcroForm fields for CC-DC-CR-148 and 56 for MDJ-008; direct inspection of the
same bytes counts 56 and 57. Both forms carry a single `Reset Form` push-button:
the registry counts fillable data fields, the inspector counts every field. Each
number is right under its own definition, the hashes match on both sides, and the
counting basis now travels with the number so a field map validated against the
other figure does not read as a missing field.

Maryland's historical completion record is preserved. Maryland is **not** marked
technically or legally reviewed — its source being portable says nothing about
whether anyone has read its output.

## Minnesota — five current EXP forms

Resolved in `rcap-mn-attended-retrieval-currentness-comparison`. All five
measured exactly. All five carry a printed revision and none was invented:
EXP101 `Rev 7/24`, EXP102 `Rev 7/24`, EXP104 `Rev 1/25`, EXP105 `Rev 7/24`,
EXP106 `Rev 1/24`.

EXP105 and EXP106 are kept as **separate** identities for their separate
statutory routes. They share one printed caption — *Order Concerning
Sealing/Expunging of Records* — and are told apart by the statute printed
directly beneath it: EXP105 cites Minn. Stat. § 609A.02, subd. 3, and EXP106
cites subd. 1 or 2. The measurement corroborates two documents rather than two
copies of one: different page counts, byte counts, digests and printed
revisions. One document cannot carry two revisions.

Two traps are recorded. Because the captions are identical, a resolver selecting
by title finds both; selection must carry the statutory subdivision. And
EXP106's embedded PDF `Title` names subd. 3 — EXP105's route — so document
properties are an actively wrong discriminator here. The printed face governs.

Four of the five are flat PDFs with no AcroForm; the fifth carries an AcroForm
dictionary with zero fields. None is fillable. Minnesota reuse permission is
unresolved, so generation stays fail-closed and no receipt was created.

### Corrections to the first pass

The first pass recorded EXP104 as printing no revision, left its caption as a
placeholder, and inferred from the `MN 5510 / 5515 / 5516` strings on its face
that it might belong to the MN 55xx family rather than the EXP family. All three
are wrong. Its printed caption reads *Proof of Service (EXP104)*, it carries
`Rev 1/25` in the footer of both pages, and the MN 55xx strings are the addressee
codes of the agencies being served — which is what a proof of service lists.
EXP102, EXP105 and EXP106 also carried descriptive paraphrases in place of their
printed captions; a paraphrase cannot be matched against an official face, so
each now carries its exact caption and its statute. The `mn-exp104-identity`
blocker is closed by measurement and the corrections are recorded on the job
record rather than applied silently.

## Delaware — three of five

Resolved in `rcap-de-attended-retrieval-five-current-forms`. The assignment
asked for five documents and the drop supplied three. It stays open.

Supplied and measured: `CIV_EXP_02_A` (Superior Court petition, 1 page),
`CIV_EXP_04_A` (order granting, printed revision `05/29/2024`), `CIV_EXP_08_A`
(order after pardon, printed revision `05/30/2024`). Both order revisions agree
with what the assignment recorded — corroboration from the artifact rather than
from an index. `CIV_EXP_02_A` was supplied twice, byte-identical; one canonical.

**Absent: `CIV_EXP_02_B` and `FORM-281`.** Both blockers are preserved unchanged.

### FORM-281 versus 281E, and a second trap

`FORM-281` — the current Family Court primary petition, revised 11/26/2025 — is
not in the drop. What *is* in the drop is `281e - adult expungement charge
extension sheet 09212018.docx`, 26,118 bytes,
`aaca121e3bb4ce51ab9ab4ff6d933138bf7a36b6d97269c02cbf3c0290e87b33` — **byte-identical
to the row the adopted edition already retains.** It supplies nothing new, and
it is certainly not a petition. The Family Court primary-filing slot stays empty.

The drop also exposed a second substitution route that had not been recorded.
`CIV_EXP_02_A` is titled **"Petition for Expungement of Adult Record"** — the
*same* title `FORM-281` carries. The two are distinguished only by court:
`CIV_EXP_02_A` captions itself *The Superior Court of the State of Delaware*,
while `FORM-281` is a Family Court document. A resolver searching by title alone
would now find a *correctly-roled, correctly-titled, current* petition and bind
it to the wrong court's slot. The 281E guard would not catch it, because this
one is a genuine petition. Both exclusions are recorded.

### Delaware licensing — restriction, not permission

All three supplied Delaware PDFs are **AES-256 encrypted** with issuer-set
permissions of `copy:no` and `change:no`.

That is affirmative evidence *against* unrestricted reuse. Delaware reuse
permission was unresolved before this drop and remains unresolved after it; what
changed is that there is now something on the record pointing the other way.
`generationAllowed` stays false and `implementationAssignable` stays false.

The technical finding is now measured rather than predicted. The factory's own
inspector, `scripts/rcap-factory-inspect-pdf.mjs`, fails on all three: each
aborts on an invalid object reference before it can report a structure class or
enumerate a field. `pdfinfo` reads the encryption dictionary and says an AcroForm
is present, but the fields behind it are not reachable. A field map cannot be
drafted from a file whose fields cannot be listed, so the technical blocker
stands on its own and would survive a favourable answer on the licence.
Stripping the issuer's encryption to get at them would defeat a restriction the
issuer set deliberately and would leave a repacked file that is no longer the
issued document. Not done.

Possession is not permission, and retrieval is not a licence.

## Colorado — successor permission

Recorded in `rcap-co-written-permission-authorization`, superseding — not
rewriting — `rcap-co-jdf-family-commercial-license`.

The superseded decision asked for exactly this: reopening condition (a), "a
written grant from the Colorado Judicial Department permitting reproduction,
prefilled distribution and inclusion in a paid self-help packet." It is
satisfied **in substance** and not **in form**: that condition required the
grant be *in writing and retained in the repository*, and no permission
document was supplied.

So the provenance is recorded as what it is — project-owner attestation, dated
2026-08-08, with the supplied wording quoted verbatim, `evidenceDocumentPresent:
false` and no hash asserted. No letter, email or policy was fabricated. The gap
is carried as a residual blocker rather than smoothed over, because the
authorization should not read as better evidenced than it is.

Scope is exactly reproduce and prefill. Altering legal text or revision marks,
populating judicial findings or judge, clerk, prosecutor and agency fields,
sublicensing, resale of blank forms, unrelated redistribution and any claim of
Colorado endorsement are all outside it and recorded as such.

All **12** Colorado receipts are preserved value-identically. Nothing was
recopied and nothing was rehashed: authorization is a permission fact and
materialization is an evidence fact, and changing one must not disturb the other.
