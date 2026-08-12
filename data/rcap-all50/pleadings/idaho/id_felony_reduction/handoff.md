# ID:id_felony_reduction — amend judgment to a misdemeanor (I.C. § 19-2604(2))

Job `T-C-ID-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **blocked_pleading** — no pleading drafted.

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- I.C. § 19-2604(2)

## Mechanism

The court may amend a judgment of conviction from a term in the custody of the
Board of Correction to confinement in a penal facility for days served before
sentencing, and the amended judgment **may be deemed a misdemeanor conviction**.

Venue is the sentencing court.

An offense requiring sex offender registration under I.C. § 18-8304 is not
subject to dismissal or reduction under this section. "Conviction" here includes
a plea or finding of guilt notwithstanding the form of the judgment or a withheld
judgment.

## Route decision

**Drafting is barred**, on the same output-strategy blocker that gates
`id_set_aside_dismissal`. The registry records it as a *true output-strategy
blocker, not a record-review requirement*, and its open questions name this track
directly ("This gates tracks 3 and 4").

Unresolved, and unanswered by any committed evidence:

1. Whether any **statewide form or approved template** exists for a § 19-2604
   application, and how county practice varies.
2. The current **statutory elements, caption, venue, required attachments,
   service, proposed-order practice**, and any county variation for a § 19-2604
   custom pleading.

Drafting would invent the structure of the instrument. The Idaho state pack
commits only `index.ts` and `all50-build-metadata.ts`, so no coded research
supplements the registry here.

### A distinct hazard on this track

This route is **not a record-clearing remedy at all**. Section 19-2604(2) amends
the judgment so that it may be deemed a misdemeanor conviction — the conviction
remains a conviction and the record remains visible. Grouping it with sealing and
expungement tracks invites a participant to expect relief it does not give.
Whatever instrument is eventually built, the participant-facing description must
lead with what this does not do.

### What is missing

An Idaho statewide-form survey for § 19-2604 applications, and the pleading
requirements (elements, caption, venue, attachments, service, proposed-order
practice) with county variation.

Routed to lane D/E source retrieval, then counsel review.

## Open counsel flags

- **Filing vehicle unresolved (blocking).** Statewide form, approved template, or
  county-specific practice is undetermined.
- **Pleading requirements unresolved (blocking).** Elements, caption, venue,
  attachments, service and proposed-order practice are all open questions.
- **Reduction is not clearing.** The amended judgment is still a conviction. Do
  not describe this route as clearing, sealing or expunging a record.
- **Sex-offender registration exclusion.** An offense requiring registration under
  § 18-8304 is outside the section entirely.
- **"Conviction" is broad here.** It includes a plea or finding of guilt
  notwithstanding the form of the judgment, including a withheld judgment.
- **Waiting period — none recorded.** No period is asserted.
- **Verification — source silent.** No verification or notarization statute is
  identified, and the application's own elements are unresolved.
- **Fee — source silent.** No filing fee is established by any committed Idaho
  evidence. No amount is stated.
- **Registry release blocker (open):** whether the 2024, 2025 or 2026 sessions
  amended I.C. § 67-3004 or I.C. § 19-2604 is unconfirmed.
