# Fable Packet Factory — reusable lessons

One line per lesson, only what prevents a repeated mistake. Everything here was
paid for once already.

## Claims and ledger
- A family holds ONE claim per operation, ever. A finished family cannot be
  re-granted; use `claim.mjs --transfer <FROM> <TO> <id> --reason` to move a
  RELEASED grant to a new lane. `--assert` is read-only; `--release` is one-shot.
- Repair claims: `operation` is `rapid-repair`, `laneKind` is `repair`. Never
  derive one from the other.
- Lane names resolve by prefix (PF/FIX/VF/DISC/SRC/ACQ/PROMO). Any other prefix
  is refused before the ledger is consulted.
- Never hand-edit claim-ledger.json: it carries a digest over the claim rows.
- generate.mjs refuses a regeneration that loses claim identities, released
  flags, releases, reissues or transfers. If it refuses, fix the generator.

## Building
- Corpus IS mounted in this container: export
  `MASTER_LIBRARY_SOURCE_DIR=$REPO/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`
  or build hosts refuse outright.
- Every PDF created via PDFDocument.create() must go through
  `stampDeterministic()` from scripts/rcap-official-forms/rcap-deterministic-pdf-date.mjs,
  or two identical builds differ (257/583 bytes on an empty doc) and the raster
  receipt dies on rebuild.
- Never add files to scripts/lib/ — the render-worker Dockerfile copies it
  wholesale and the image fingerprint breaks (how PR #169 broke main).
- The raster module lives at scripts/raster/pdf-page-raster.mjs. Local rasters
  are RASTER_LOCAL_PENDING_CENTRAL, never a gate result.
- ca-1203-4-set + wv_nc_diversion_deferred-set (SCA-C903) sources are AES-256
  encrypted; pdf-lib cannot open them. STOP those, don't fight them.
- Wisconsin flat forms: values sit on ruled cell borders; lift the baseline or
  descenders cross into the cell below (PF-C fixed this twice).
- A failed build run may clear the family output directory before erroring —
  restore from HEAD after any aborted build (east-host hazard).

## Verifying
- PASS_COMPLETE_INDEPENDENT requires ALL 15 obligations scored; L9 refuses a
  subset. The nine counters are not the fifteen obligations.
- Verdicts live in lane rows.json; the ledger only records ownership. A released
  claim does NOT mean the family passed.
- Camel-case obligation maps carry outcome under `result`; older rows use
  `failedProofObligations`. Read both.
- `unchanged-official.pdf` components are correctly absent from the tree —
  verify their recorded hashes against the corpus index, not the filesystem.
- Filing-guidance house standard: delegation to a named checkable authority
  passes; a catch-all naming "fees" does not.

## Rastering
- The central workflow needs a full 40-hex commit_sha and dispatches from main;
  the queue's carry-forward keeps receipts only while pinned hashes AND the
  document set are unchanged; superseded receipts are preserved on the row.
- 12 families in 3 groups pin byte-identical PDFs (UT×4, WA×6, WA×2). One render
  is not N verdicts; PF-B holds the route-election classification.

## Answered advisories
- VF-SRC-A's VF18-VF25 hazard: reading 1 was correct (intentional
  cross-verification; ledger.transfers holds the reasons). The re-opened flags
  were deliberate. Fable verifier subagents are new identities, so the
  self-verification hazard does not arise.

## Integration
- A release travels only between claims on the SAME LANE. The ledger union
  resolver keyed on subject+operation and re-released six transferred grants
  (VF26 mid-read, FIX11 mid-repair) from a worker branch that predated the
  transfers. Cross-lane releases are refused; the old lane's completion lives
  in the transfer record.
- NJ east-host families (nj_arrest_no_conviction, nj_indictable_conviction, and
  6 of ny_160_59's rows): the failing KNOWN_PREFILLS rows are allowlist-bound to
  HELD facts — not disclosure gaps. Only a rebuild with new ink repairs them,
  and that waits on the east-host appearance-stream fix. Do not reclassify held
  facts as required-before-filing; FIX-A refused exactly that and was right.
