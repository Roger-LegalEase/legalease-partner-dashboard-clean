# CA CR-409 — Petition to Seal Arrest and Related Records (Tier 1)

- **Family:** `california/cr-409-petition-to-seal-arrest-records`
- **Ledger job:** `T-E-CA-production-packet`
- **Track served:** ca-851-91 (Cal. Penal Code § 851.91)
- **Official source:** `CA__FORM__CR-409__…__REV-2024-01-01__EN.pdf`
  sha256 `59fa8a041633feb8351715938d7b66fda0d879e502f1fb5dd3764939efcc1088`
  (encrypted, XFA, Designer 6.5, 2pp letter)
- **Derived source:** `data/rcap-all50/overlays/rescued-encrypted-pdfs/california-cr409-rescued.pdf`
  sha256 `d2674e035ea4bcf0…` — produced this session
- **Census:** 39 terminal fields — 10 bound, 11 protected, 18 unbound-available

## Derivative provenance

No CR-409 derivative existed: the June rescue pass covered only the eight
encrypted forms then known, and CR-409's bytes arrived with the canonical
bundle. qpdf is not installed in this environment, so the derivative was made
with pypdf 6.15.0 (`decrypt('')`, then `clone_from` re-save). Source and
derivative both report `/XFA` present, 2 pages at 612x792 and the same field
tree; only the encryption dictionary is dropped. The conversion is
source-faithful and no content was edited.

## Naming caution recorded for F

CR-409's XFA field names prefix the petitioner's contact block with
`Protected…` (`ProtectedStreet`, `ProtectedPhone`, and so on). That is
California's *confidential contact information* convention — those are
participant-supplied values and are correctly populated. They are **not**
court-use fields. The genuinely protected set here is the hearing block
(`HearingInfo` T159–T162, which the clerk assigns), signatures and footer
controls; the profile binds none of them.

## Link-action stripping

CR-409 prints `courts.ca.gov` help URLs wrapped in Link annotations, which
survive flattening and are network actions. The renderer removes the
annotation and keeps the printed text, so the official layout is intact and the
packet carries no clickable action. The renderer refused to emit until this was
handled — the first render attempt failed closed on `residual active content
after flatten`.

## What F must visually approve

1. The petitioner contact block reads correctly and stays inside its rectangles
   at boundary lengths.
2. The hearing block, signature lines and court-use areas are visibly blank on
   all three fixtures.
3. The printed help URLs are still legible after link-annotation removal.

## Blocked and exact unblock

Runtime wiring for ca-851-91 is `src/` work owned by Terminal A (the track is
`missing_from_compiled_runtime`). Checkout stays prohibited pending that wiring
and F's visual approval.
