# Virginia: bounded correction to the deferred-disposition screen

Date: September 6, 2026. Family: `va_exp_nonconviction-set`.
Status: legal research and proposed product rule; not counsel adoption.

## Controlling evidence

Read VA1–VA3 in Source_Index.json. The current statute and the 07/26 official CC-1473 both recognize the specified §19.2-298.02(D) situation. The repository's blanket deferred-disposition exclusion must not suppress that possibility.

## Proposed decision table

| Record | Product handling proposed for adoption |
|---|---|
| Acquittal or an otherwise qualifying ordinary dismissal/nolle prosequi | Apply the existing exact route and all remaining requirements. |
| Dismissal identified under §19.2-298.02, with recorded all-party agreement satisfying subsection D | Evaluate the statutory exception instead of automatically excluding it because a plea/stipulation/deferral occurred. This is not automatic grant of expungement. |
| Same statutory dismissal but agreement absent, ambiguous, or disputed | Human legal review; do not infer consent or present a completed eligibility finding. |
| A different first-offender/deferred statute | Do not import subsection D. Apply that route's own authority and existing review boundary. |
| Only future December 1, 2026 wording would support the proposed treatment | Do not enable that future rule in a September filing. |

## Required distinction

Agreement to a deferred case disposition, agreement that a dismissal qualifies for expungement treatment under subsection D, and a later prosecutor response to an expungement petition are different facts. Do not collapse them into a single checkbox.

The record may identify the agreement in the final disposition order. The statute does not make an entry in that order the exclusive legally possible form of evidence. For a bounded product, capture the document/reference actually establishing the agreement and send ambiguous evidence to review.

## Minimal implementation

Coordinate the existing route record, election gate and participant text. Do not change just the prose while the runtime still rejects the branch, or open the branch merely because the source form contains it. Preserve the approved stop on opposition and all other applicable requirements. Do not generate an attorney's consent or signature.

Useful focused cases: qualifying current subsection-D dismissal; same dismissal with no established agreement; different first-offender statute; ordinary acquittal; future-only basis. These can extend existing tests; no new verification framework is called for.
