# Four owner-supplied court sources — October 13, 2026

This additive receipt records exact private intake and draft mappings for the
owner's `LegalEase_Court_Source_Handoff_2026-10-13.zip`. Original PDFs, filenames,
manifest, README, checksums and widget CSV are preserved unchanged under the
ignored `private/source-imports/court-source-handoff-20261013/` directory.
Only source identities and mapping metadata are committed here.

## What is verified

All four PDF lengths/SHA-256 hashes match both supplied checksum records. The
31 source pages, page dimensions, 151 widgets and 120 distinct widget names
(40 VA petition, 23 VA access, 57 NY fillable) were measured from the originals.
The supplied widget CSV matches all measured names, types, ordinals and
coordinates. Original PDF coordinates remain in top-left PDF points; the
retained CC-1473 map uses bottom-left coordinates, compared after conversion.

- **NY paper, August 2026:** 14 pages, zero widgets. Its separate map records
  45 measured printed anchors. These are text locations, not writable rectangles.
  Paper overlay placement, overflow and completed-output review remain owed.
- **NY fillable, August 2026:** 14 pages, 84 widgets/57 names. Its distinct draft
  maps all widgets to preparation concepts or actor/stage obligations. Repeated
  applicant affirmation date names on pages 12/14 cannot establish one shared
  execution event. The three non-widget signature lines remain actual acts.
- **VA CC-1473, July 2026:** two pages, 42 widgets/40 names. It matches the
  existing nonconviction source pin and all 42 existing mapped widget geometries.
  The existing map is linked and retained without changing its dispositions.
- **VA CC-1474A, July 2026:** one page, 25 widgets/23 names. Its separate access
  draft accounts for those widgets plus the non-widget signature and judicial
  order block. It does not establish an initial or absolute-pardon petition.

Fresh downloads of both Virginia PDFs from their exact recorded court URLs
matched length and SHA-256 on October 13. Both New York raw downloads returned
403; their hosted-byte equivalence remains NOT_VERIFIED. The original handoff's
qualification is preserved; new observations are separate in `hostedComparison`.
The official Virginia court index also distinguishes the two mechanisms:
https://www.vacourts.gov/forms/circuit/civil

## Preserved boundaries and remaining requirements

The four historical New York documents, their receipt, census and production
map remain byte-identical. Their original binaries remain separately required.
These current candidates are never installed at historical source paths. The
existing protected preparation diagnostic references both current candidates;
its selected-source proof, widget-write bindings and approval stay unresolved.

NY-SOURCE-CURRENT-01 is satisfied **only for owner-supplied current paper/fillable
intake and measured inventory**. Hosted NY provenance and historical original
custody remain outstanding. NY-SOURCE-CURRENT-02 still needs qualified decisions
on revision applicability, affirmations/continuations, current NY-only wording
versus out-of-state history, and separate prosecutor service/copy requirements.
Printed form text does not decide the underlying legal count or waiting clock.

GA-04 gains verified CC-1473 source/map identity and distinct CC-1474A purpose.
Neither resolves the absolute-pardon procedure or closes any of the seven
original missing-fact assertions. Qualified VA procedure/applicability decisions,
exact route-to-document binding, owned field population and output acceptance
remain required. No new access route is activated by recording its source.

Known-fact mapping, case/group/continuation allocation, court and actual-signer
blanks, source-bound rendering, independent legal/language/visual acceptance,
protected delivery and commercial authority remain separate gates. All mapping
records here are drafts with writes and generation disabled. No fixture/rendered
PDF or statement of owner supply is substituted for qualified approval.

This archive is unrelated to the September 11 adoption bundle. Its 22 adoption
records, archive pin and Source Conveyor verification remain unchanged.

## Repeat the bounded checks

With the private originals present and PyMuPDF installed:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/rcap-corpus/verify-court-source-handoff.py --archive /private/path/LegalEase_Court_Source_Handoff_2026-10-13.zip
PYTHONDONTWRITEBYTECODE=1 python3 scripts/rcap-corpus/test-court-source-handoff.py
node scripts/test-ny-16059-packet-preparation.mjs
node scripts/test-ny-16059-typed-completion.mjs
node scripts/test-ny-16059-owned-completion.mjs
```

The verifier reads only. It refuses changed bytes, inventories, map identities,
widget coordinates, preserved historical inputs and inappropriate approval flags.
Missing private originals are a failed prerequisite, never a passing/skipped test.
