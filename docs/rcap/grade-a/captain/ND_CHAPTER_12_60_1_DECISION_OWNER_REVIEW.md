# Decision-owner review item — North Dakota Chapter 12-60.1 conviction sealing

Route: `ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1`
Status: **OPEN — awaiting decision owner**
Raised by: Captain A, at Lane D wave-2 integration.

## Why this exists

The packet is implemented and its product path passes in isolation. That is not
approval. No committed legal-authority route contract exists for Chapter 12-60.1
conviction sealing, so the Grade-A authority reports
`legal_authority: status is pending, not approved_by_decision_owner` and denies
the route. Implementing a packet does not create the authority to file it.

## Scope

Narrow and focused. This is an approval and contract task against one route. It
does **not** reopen broad North Dakota legal research, and it does not extend to
any other North Dakota route.

## What the decision owner must confirm

Each item is a yes/no determination that becomes part of the route contract.

1. **Participant-filed treatment.** That relief under Chapter 12-60.1 is obtained
   by a petition the participant files, rather than arriving automatically.
2. **Exact statutory ground branches.** Which grounds the packet may offer, and
   which it may not.
3. **Exclusions and clean-period treatment.** The offences excluded, and how the
   clean period is computed and evidenced.
4. **Court and prosecution record scope.** Confirmation that the sealing order
   reaches court and prosecution records, and the treatment of BCI criminal
   history record information and Criminal Justice Data Information Sharing
   System data.
5. **Required service.** Who must be served, by what method, and when.
6. **Mandatory proposed order.** Whether a proposed order must accompany the
   petition, and its required operative content.
7. **Proof-of-service treatment.** Whether proof of service is filed with the
   petition, later, or not at all.
8. **Filing destination.** The court and division the petition is filed in.
9. **Fee and waiver wording.** The filing fee, if any, and the exact waiver
   language the packet may present.
10. **Hearing and objection stop conditions.** What triggers a hearing, the
    objection window, and the point at which self-help must stop.
11. **Exact requested relief.** The precise relief clauses the petition may ask
    for. The shared renderer's default clause directs *all criminal justice
    agencies* to act; if that overstates Chapter 12-60.1 relief, the route's own
    `reliefClauses` and `proposedOrderClauses` must carry the correct narrower
    text.
12. **Self-help stopping point.** Where the packet must hand off to counsel.

## What approval here does and does not do

Confirming these items closes the `legal_authority` dimension only. It does not
close output-level legal approval, which is a separate decision about the
completed output against its exact artifact digest, and it does not bind a final
verification. The route remains `COMMERCIAL_HOLD` until every dimension is
closed against the same candidate.

## Bound identities for this review

| | |
|---|---|
| Specification digest | `65c5443226a8f162096ede0278640562ee6f79982dd0cc584a3973863363010e` |
| Reviewed artifact digest | `913e34a6f714383878397371c8d536bc094afce3a6067cfeb4caefee04e2e270` |
| Corpus release | `source-corpus-2026-08-28`, archive `a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89` |

An approval recorded against different digests does not apply to this candidate.
