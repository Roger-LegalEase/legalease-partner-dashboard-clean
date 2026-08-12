# D3B — state-pack fidelity against Edition 1

Where a compiled legal-design profile's legacy `packetGenerator.formInventory`
disagrees with the Edition 1 `STATE_MANIFEST.csv`, the pack manifest wins and
the discrepancy is recorded here. **No profile under
`src/lib/rcap-engine/compiled/profiles/` was edited by this lane**; they are
read-only to it.

Identity was resolved by sha256 throughout, never by filename. That matters for
Massachusetts, whose legacy inventory carries URL-encoded names.

## Summary

| state | legacy PDFs in profile | matching an Edition 1 binary by sha256 | Edition 1 binaries |
|---|---|---|---|
| Iowa | 1 | 0 | 2 |
| Massachusetts | 4 | 0 | 2 |
| Oregon | 1 | 0 | 4 |
| Utah | 12 | 11 | 21 |

Utah's coded state pack is the most faithful of the four. Iowa's, Oregon's and
Massachusetts's share no binary at all with the edition they are supposed to
describe.

## Iowa

The profile carries `2_86_4_123_PAULA_Expungement_18A04436D4107.pdf` at
`8b2c33815548615733f01f964340fc39efcd8c252ad8c3ee50b97b0639753ffc`
(807,560 bytes). No Edition 1 binary has that hash.

Edition 1's Rule 2.86 Form 4 is
`279eefe8c5f6b51ec73eb943c9a479757ff3d2c439177bfbf3044e7e71f66c45`
(288,751 bytes, revision August 2024), and the manifest records that it
supersedes the January 2021 revision already present in the historical corpus.
So the divergence is a stale profile rather than a conflict.

The profile holds no binary at all for Rule 2.86 Form 5, which Edition 1 does
carry.

## Massachusetts

Four legacy PDFs, none of which appears in Edition 1 by hash:

| legacy file | legacy sha256 (prefix) | bytes |
|---|---|---|
| `OCP004%20-%2010days%20NOTICE%20PACKAGE%20Opt-Out%20of%20Sealing%20Form%20version%202-8-2024.pdf` | `303159c0a290` | 276,631 |
| `fillable-jud-mps-Petition-to-Seal.pdf` | `416f9a1d1a7a` | 216,883 |
| `jud-Petition-for-Expungement.pdf` | `19842819786d` | 1,387,408 |
| `jud-tc-Petition-to-Seal-Criminal-Records-for-Nolle-Prosequi-or-Dismissal.pdf` | `f83d441b6dda` | 1,374,671 |

Edition 1 carries two Massachusetts binaries: the Probation Service petition
under §§ 100F/100G/100H (`5ccb13e55c07`, 13,137 bytes) and TC0021
(`a9d80fab5166`, 1,393,680 bytes, revision 11/22).

`jud-Petition-for-Expungement.pdf` and TC0021 are close in size and are
plausibly the same form at different revisions, but they are not the same
binary and nothing here treats them as one.

**OCP004 is not in Edition 1.** Because identity was resolved by hash, its
absence is not an artifact of its URL-encoded filename. Nothing is bound to it
and this lane records no opinion on whether it is participant-completed,
having never had the binary.

## Oregon

The profile carries `CriminalSetAside_AdultCases2.pdf` at
`6d1f70c6079d56dc49fff49ac356d53e1b3c3749515f1c5029d3e39e1899b69a`
(253,599 bytes). Edition 1's packet is
`b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071`
(256,978 bytes, revision January 2026). Different binaries.

The profile holds nothing for the marijuana set-aside motion, the OJD
record-check request or the OSP criminal-history request, all three of which
Edition 1 carries.

## Utah

Eleven of the profile's twelve legacy PDFs match an Edition 1 binary exactly:

`1149XX`, `1169XX`, `1170XX`, `1173XX`, `1164XX`, `1146XX`, `1148XX`,
`1002EX`, `1003EX`, `1022EX`, `1044XX`.

The twelfth is `1023EX_Order_Cannabis_Conviction.pdf`, sha256 prefix
`24868a504130`, 110,830 bytes. Edition 1 does **not** carry it, and the
`STATE_README` lists it among three `link_only_binary_missing` /
`build_blocker` open items alongside 1001EX and 1021EX.

This one is worth flagging for whoever closes those blockers: the binary exists
in the legacy corpus even though the edition lacks it. That does not make the
blocker false — the build is against Edition 1, and 1023EX is not in Edition 1,
so it is not built — but the file may not need re-acquiring from scratch. It
would need its own identity and currentness check before use.

## Near-duplicate binaries

Oregon's `OR-OJD-CLA-SET-ASIDE-CHECK` and `OR-OSP-SET-ASIDE-CCH` share all 22
AcroForm field names and all 22 widget rectangles, and differ by 23 bytes
(229,170 against 229,147). Their sha256 values differ and the manifest assigns
them different document ids and different roles — one the OJD request, one the
Oregon State Police request with instructions — so both are carried as separate
families on that authority. A reviewer comparing the two packages should expect
their field censuses to be identical.

## Structural-class observations

Three Utah supporting-process binaries — `UT-BCI-EXP-APPLICATION`,
`UT-BCI-EXP-VERIFICATION`, `UT-BCI-THIRD-PARTY-RELEASE` — are declared
`flat_pdf` in the manifest and do carry an AcroForm dictionary, but it holds
zero fields. Declared and observed agree on what matters: there is nothing to
fill interactively. Recorded in each family's `source-fidelity.json` as
`acroform_dict_without_fields`.

Massachusetts TC0021 is declared `acroform_pdf` with 29 fields and separately
noted as XFA. Both are true: an XFA form ships an AcroForm fallback layer, and
the fallback is what pdf-lib sees. Its field names carry no semantics.

## Text-layer quality

Utah's `1002EX`, `1003EX` and `1305GE` have text layers that interleave glyphs.
The county line reads back as `C_________ounty` and `ounty`; elsewhere `oYu`,
`usJtice` and `arB #`. The underscore runs on those lines cannot be bounded
reliably, so their court blocks and petitioner captions are left blank and
recorded. `1000EX` carries the identical line and renders it cleanly, so this
is a property of those binaries rather than of the form's design.

Utah's five BCI assets use Type0 font subsets with no `/Widths` array. The
anchor-capture module reports such runs as metrically inexact and its stated
doctrine is to exclude them from anchor placement; this lane enforces that, so
a blank whose geometry rests on estimated metrics cannot be written.
