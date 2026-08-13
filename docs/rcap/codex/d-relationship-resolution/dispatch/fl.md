# DREL-FL-SOURCE-AND-RULE-TEXT

Owner: Florida source-edition and authority-text implementation owners

Objective: Replace stale FDLE 40-021 and remodel Rule 3.989 forms as exact authority-text components.

This is an executable relationship-resolution assignment. It does not authorize canonical mutation, promotion, runtime, payment, checkout, or credit.

## Tracks

- `fl-expunction` — no_exact_family_relationship_yet

## Component actions

### fl-expunction

- `fl-expunction-primary-filing-1`: `stale/superseded`.
  Missing evidence: A materialized D source/family for current FDLE 40-021 revision June 2021, Ref-14423, sha256 7a3647f5ae134c3e9ad62a8dd177805314738ed23985309728b57bbcd79b8ee8. The current D family is the superseded October 2019 revision.
  Next action: Materialize the measured Ref-14423 bytes in the next source edition, replace the stale 2019 D source, rerender/review, and bind the expunction track to the new family while preserving the commercial-use gate.
  Terminal alternative: none supported; remain fail-closed.
- `fl-expunction-primary-filing-2`: `source_not_required`.
  Missing evidence: No standalone official PDF exists. Missing evidence is a committed legal-design/component remap to exact promulgated Rule 3.989 subdivisions and a reviewed participant output preserving the rule text; the ORDER identity must be split to expunction subdivision (b), not sealing subdivision (c).
  Next action: Reclassify the petition, sworn statement, and expunction order from phantom official-PDF acquisitions to Rule 3.989(d), (a), and (b) authority-text components; implement exact participant-visible text and send only that substantive output for counsel review.
  Terminal alternative: none supported; remain fail-closed.
- `fl-expunction-affidavit-3`: `source_not_required`.
  Missing evidence: No standalone official PDF exists. Missing evidence is a committed legal-design/component remap to exact promulgated Rule 3.989 subdivisions and a reviewed participant output preserving the rule text; the ORDER identity must be split to expunction subdivision (b), not sealing subdivision (c).
  Next action: Reclassify the petition, sworn statement, and expunction order from phantom official-PDF acquisitions to Rule 3.989(d), (a), and (b) authority-text components; implement exact participant-visible text and send only that substantive output for counsel review.
  Terminal alternative: none supported; remain fail-closed.
- `fl-expunction-proposed-order-4`: `source_not_required`.
  Missing evidence: No standalone official PDF exists. Missing evidence is a committed legal-design/component remap to exact promulgated Rule 3.989 subdivisions and a reviewed participant output preserving the rule text; the ORDER identity must be split to expunction subdivision (b), not sealing subdivision (c).
  Next action: Reclassify the petition, sworn statement, and expunction order from phantom official-PDF acquisitions to Rule 3.989(d), (a), and (b) authority-text components; implement exact participant-visible text and send only that substantive output for counsel review.
  Terminal alternative: none supported; remain fail-closed.

## Exit evidence

- Every listed component has either an exact familyId plus source/revision/SHA evidence or an owning legal-design remap that retires the bad identity.
- No state/name-only relationship is imported.
- Source/currentness, technical, adoption, runtime, payment and credit gates remain independently enforced.

Counsel routing: Do not send metadata or missing-byte work to counsel. Escalate only a later proven substantive legal-text, predicate, route, protected-field, licensing, or authority conflict.

Human boundary: Counsel sees only the later substantive participant output, not this metadata/source gap.
