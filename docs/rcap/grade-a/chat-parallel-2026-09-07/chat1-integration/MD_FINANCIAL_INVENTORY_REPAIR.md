# Maryland financial inventory repair

The installed Maryland cannabis candidate uses the conviction adapter's shared
CC-DC-089 costs helper. Both adapters previously returned
`allKnownFactsPrepared: true` when an income, property, or debt inventory was
deleted while its corresponding `Complete` flag remained true. The source form
then omitted the inventory without a missing-data disclosure.

The shared validator now requires an explicit object for every inventory claimed
complete. It rejects missing inventories before source rendering or destination
writes, rejects malformed financial objects, and accepts only named financial
categories. Explicit empty inventories remain supported, with zero income
required when an empty income inventory is claimed complete. Unconfirmed,
incomplete drafts retain their missing-field disclosures.

The previously installed cannabis code, official source, 18 PDFs, field maps,
instructions and installation evidence are included with this correction. The
original installation and review records retain their historical hashes; they
do not approve the changed helper.

Validation is recorded in
`data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session09/`:

- 402 checks pass across both existing renderer suites, both existing
  completeness-importer suites, and 122 new financial regression checks.
- All six original false-complete outputs reproduce with the exact saved helper
  bytes. The corrected renderers refuse all six inputs.
- Exported builders and CLI entry points preserve existing files and create no
  output directory for these rejected inputs.
- All 43 retained conviction/cannabis PDFs, totaling 303 pages, match fresh
  renders byte for byte. All 238 retained files across the three Maryland
  candidate directories remain unchanged.
- Typechecking and the 51-jurisdiction build verifier pass. Scoped lint has no
  errors and four existing warnings; the new scripts have no warnings.

`md-financial-repair-completion.json` binds the helper revision, measured checks,
and remaining requirements. `md-financial-repair.patch` isolates the repair from
the earlier shared-helper extraction. `md-financial-helper-before.txt` retains
the exact baseline needed to rerun the causal controls.

The build remains pending independent review. Current-byte source, visual, and
executable review, the declared conditional CC-DC-089/MDJ-008 relationship,
fee/record-system integration, central acceptance, and actual protected delivery
proof remain separate requirements. This change creates no runtime or commercial
authority and makes no production route change.

To rerun the focused regression checks:

```sh
node scripts/rcap-packet-recovery/chat5/test-md-financial-inventories.mjs
node scripts/rcap-packet-recovery/chat1/review-session09-md-financial-controls.mjs
```
