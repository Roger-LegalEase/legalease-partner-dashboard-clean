# NV:nv_repository_removal — repository removal after a favourable disposition (NRS 179A.160)

Job `T-C-NV-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **blocked_pleading** — no pleading drafted, no packet rendered.

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- NRS 179A.160
- NRS 179.245
- NRS 179.255
- NRS 179.275

## Mechanism

NRS 179A.160(1) provides that where a person has been arrested or issued a
citation, or has been the subject of a warrant, and is acquitted or the
disposition of the charge is favourable to the person, that person **may apply in
writing to the Central Repository and the agency which maintains the record** to
have it removed from the files which are available and generally searched.
Subsection 2 makes removal mandatory — the Central Repository and the agency
*shall* remove the record unless one of five stated conditions applies.

The application goes to **two recipients**: the Central Repository for Nevada
Records of Criminal History, administered by Nevada State Police Records,
Communications and Compliance Division, and the agency which maintains the
record, ordinarily the arresting agency. There is no waiting period and no
hearing.

Subsection 3 preserves a court's separate authority to order deletion or
modification of a record.

## Route decision

**Drafting is barred, and the bar is categorical rather than evidentiary.**

This track is not a filing route. The registry venue field states it outright:
"Not a filing route. The court or agency that handled the matter holds the
record." It is a written application to two agencies. It is not a court filing,
no order issues on it, and it does not reach the court's own record.

The controlled custom-pleading renderer produces a court caption, jurisdiction
and venue allegations, a prayer for relief addressed to a court, a verification,
and a proposed order carrying a judge's signature block. **None of those exist on
this route.** Rendering them would fabricate a court proceeding that NRS 179A.160
does not create — a more serious invention than any single fabricated fact,
because it would misrepresent the entire nature of the remedy.

The ledger classifies this track's `outputStrategy` as `custom_pleading`. On the
committed evidence that classification is wrong for this track, and the
contradiction is recorded here rather than resolved by drafting. This is the one
substantive legal contradiction encountered in the Nevada partition.

### What is missing

The required contents, format and any prescribed wording of the NRS 179A.160(1)
written application. The committed Nevada evidence names the document role
(`nv_favorable_disposition_repository_request`) but commits no application text,
no form, and no prescribed contents.

Routed to lane D/E for source retrieval, then counsel review. Two things need
deciding: whether this track should be reclassified off `custom_pleading`, and
what the written application must contain.

## Open counsel flags

- **Reclassification question (blocking).** Should this track be `custom_pleading`
  at all? On the committed evidence it is an agency application, not a pleading.
- **Waiting period — none.** The only temporal condition is that the favourable
  disposition be final. Recorded, not invented.
- **Fee — source silent.** No fee is established for the application. No amount
  is stated anywhere.
- **Verification — not applicable and unestablished.** No verification statute
  applies to a non-court application, and the application's own required contents
  are unknown.
- **Deferred dispositions defeat this route.** NRS 179A.160(2)(c) excludes a
  deferred prosecution, plea bargain or other similar disposition. This is the
  exclusion that most often defeats the route in practice; a participant whose
  case was resolved by a deferral of judgment belongs on the NRS 176.211 track.
- **The prior-conviction exclusion is nationwide.** NRS 179A.160(2)(d) reaches a
  prior felony or gross misdemeanour conviction in any United States
  jurisdiction, not merely Nevada.
- **Route separation.** This is a repository remedy, not a court sealing order. It
  sits alongside the NRS 179.255 petition rather than replacing it. A participant
  may need both, and screening must not treat one as a substitute for the other.
