# CA CR-180 — Petition for Dismissal (Tier 1 hybrid XFA shadow fill)

- **Family:** `california/cr-180-petition-for-dismissal`
- **Ledger job:** `T-E-CA-production-packet`
- **Tracks served:** ca-1203-41, ca-1203-42, ca-1203-43, ca-1203-4a, ca-17b-reduction
- **Official source:** `CA__FORM__CR-180__petition-for-dismissal__REV-2024-01-01__EN.pdf`
  sha256 `06c1b64315ebd5c7f8260d7169abc2392d6373a202dc39f4788cb8a8c98bbdbe`
  (operator-supplied Master Library Edition 1; encrypted; XFA; Designer 6.5; 3pp letter)
- **Derived source rendered:** `data/rcap-all50/overlays/rescued-encrypted-pdfs/california-cr180-rescued.pdf`
  sha256 `a2399fc3ccbe520d20547dff43014b597c09c7cce422a9b21a68229f7e800fb5`
- **Census:** 81 fields — 24 bound, 10 protected, 47 unbound-available
- **Status:** renders and passes output acceptance; runtime wiring is Terminal A's

## Why Tier 1, established first-hand

The canonical source is a LiveCycle Designer XFA document **and** carries a
complete AcroForm widget shadow. Both facts were proven this session against
the canonical bytes, not inferred from filenames or prior narrative:

- `/XFA` is present in the source's AcroForm dictionary (pypdf, after empty-owner
  decryption). Raw byte grep finds nothing because qpdf packs the key into a
  compressed object stream — the grep-based detector in
  `src/lib/record-clearing/renderers/xfa-detector.ts` is blind to exactly this
  case, which is why the earlier manifest classified these forms
  `dirty_acroform`.
- The shadow is **complete**: the derivative's terminal field set is identical
  to the official source's, name for name — 81/81 for CR-180 and 58/58 for
  CR-181. This is the gate for Tier 1; without it the shadow could not carry
  every legally material value and the family would have dropped to Tier 2.

So the packet fills the widget shadow and deletes the XFA package. No viewer
can select an XFA view, and Adobe Reader is never required.

## What the renderer guarantees

Proven per fixture by `scripts/verify-rcap-hard-form-outputs.mjs` on the output
bytes, not on the renderer's own report:

- XFA present in input → removed in output (observed **before** `getForm()`,
  because pdf-lib strips XFA as a side effect and would otherwise make the
  proof read vacuously true);
- output is flattened — zero interactive fields;
- no `/XFA`, `/JavaScript`, `/Launch`, `/SubmitForm`, `/ImportData` in the raw
  bytes, and no `/OpenAction`, document `/AA` or annotation actions in the
  object model. The official source **does** ship document-level JavaScript;
  deleting the catalog reference is not enough, because the JS objects survive
  in the object table, so the packet is rebuilt by copying only the flattened
  pages into a fresh document;
- 3 pages at 612x792, matching the official geometry;
- official text anchors `PETITION FOR DISMISSAL` and `CR-180` still present in
  the decompressed content streams;
- protected fields are never bound — the renderer throws if a profile tries.

## What F must visually approve

1. Every bound value lands inside its widget rectangle at all three fixture
   sizes, especially the boundary fixture's 49-character name and the
   truncate-with-addendum offense description.
2. The caption block reads correctly as a pro-per filing: the participant's
   name and address sit in the attorney-or-party block, and `AttyFor` reads
   "Petitioner in Pro Per".
3. Court-use, signature and footer control fields are visibly blank on all
   three fixtures.
4. The flattened appearance matches the official form's typography — no shifted
   baselines or clipped glyphs introduced by flattening.

## Blocked and exact unblock

- **Runtime wiring (not this lane).** These five tracks are
  `missing_from_compiled_runtime`; a compiled pathway, a renderer kind and a
  route-resolver decision live under `src/`, a frozen worker-image input owned
  by Terminal A. Unblock: A lands the wiring after worker publication at the
  freeze SHA, or under an explicit captain re-fingerprint.
- **Checkout stays prohibited** until that wiring and F's visual approval both
  land. Nothing here promotes a route.
