# Utah — 1305GE: Motion to Waive Fees for Expungement

**Lane** D3B · **Factory** d0-remediated-v1 · **Revision** REV-2019-06-24 · **Edition** 1.0

Source `STATES/UT/04_SUPPORTING_PROCESS/UT__SUPPORT__1305GE__motion-to-waive-fees-for-expungement__REV-2019-06-24__EN.pdf`
SHA-256 `c184a242f8c7c1d06f55998de4b611bcf8bd5ec959896b3b37e6b5d48319b597` — matches the pack manifest.

## What this document is

A petitioner's own motion and the financial declaration that supports it. Page 1 is the ordinary caption and contact block. Pages 2 to 10 are a sworn statement of income, employment, property, vehicles, debts and household members, and they name employers, lien holders, title holders and other third parties throughout.

Ownership: `participant_completed`. Render strategy: `flat_overlay`. Observed structure: flat, 10 page(s), 0 AcroForm field(s).

## Census and binding

- Census entries: **489**
- Bound by D0's binder: **23**
- Refused: **466** (attorney 1, no_allowlisted_fact_matches 395, mapping_conflict 13, court 2, money 52, signature 2, outside_party 1)
- Written into the canonical artifact: **7**

### Binding corrections

Each entry names the field's true fact. Because that fact differs from the one the field's own name resolves to, D0's binder refuses the field rather than writing an approximately-right value. A correction can only ever remove a binding.

- `p1.r432.4.x173.rule` → `court.street_address` — 'Court Address' resolves to participant.street_address on a bare address match. It is the court's address.
- `p2.r682.9.x355.rule` → `third_party.nonprofit_provider_name` — 'a nonprofit provider: (name of provider)' resolves to participant.full_legal_name on a bare name match. It names an organisation representing the petitioner, not the petitioner.
- `p5.r511.4.x284.rule` → `money.state_income_tax_withheld` — 'State income tax' resolves to participant.state on a bare \bstate\b match, and the blank is a dollar amount on a withholding line. Writing a two-letter state code into a money field would be a plain misstatement of the declarant's finances.
- `p7.r675.7.x221.rule` → `third_party.employer_business_name` — 'Business name' on the employment page resolves to participant.full_legal_name. It names an employer.
- `p7.r552.5.x221.rule` → `third_party.employer_business_name` — second employer entry, same resolution and same refusal.
- `p7.r651.7.x221.rule` → `third_party.employer_address_and_phone` — 'Address & phone' beneath an employer's name resolves to participant.street_address. It is the employer's address.
- `p7.r528.5.x221.rule` → `third_party.employer_address_and_phone` — second employer entry, same resolution and same refusal.
- `p9.r666.6.x217.rule` → `third_party.names_on_title` — 'Name(s) on title' for real property resolves to participant.full_legal_name and may name co-owners this lane knows nothing about.
- `p9.r504.6.x217.rule` → `third_party.names_on_title` — second property entry, same resolution and same refusal.
- `p9.r626.1.x108.rule` → `third_party.first_lien_holder` — 'First mortgage or lien holder (name & address)' resolves to participant.street_address. It names a creditor.
- `p9.r464.1.x108.rule` → `third_party.first_lien_holder` — second property entry, same resolution and same refusal.
- `p9.r594.8.x108.rule` → `third_party.second_lien_holder` — 'Second mortgage or lien holder (name & address)', same resolution and same refusal.
- `p9.r432.8.x108.rule` → `third_party.second_lien_holder` — second property entry, same resolution and same refusal.

## Holds carried forward

- `state_manifest_generation_allowed_no`
- `edition_1_runtime_disabled`
- `legal_review_mapping_requires_track_level_import_mapping`
- `state_readme_open_items_present`
- `f_independent_visual_review_required`

## State-pack fidelity findings

- The county blank on the court line is not written. Its text layer interleaves glyphs the same way 1002EX's does — the word reads back as 'ounty', with the leading C absorbed into the underscore run — so the label-override check refused it and the blank is left to the participant. 1000EX carries the identical line and does render it cleanly.
- This is a money document, and D0's money rule does most of the work on it unaided. What the rule does not catch is a financial blank whose caption happens to name something else — 'State income tax' being the clearest — and those are refused here by counter-mapping.

## Status

`implemented_pending_independent_review`. This lane does not approve its own output: visual review, counsel review and source-freshness review remain open, and every hold above is still in force.
