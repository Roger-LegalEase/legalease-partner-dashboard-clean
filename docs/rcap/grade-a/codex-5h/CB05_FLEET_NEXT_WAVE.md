# CB05 Fleet Proof and Next-Wave Index

## Result

CB05 recomputed **346 live families** from the packet-factory master queue. Every family appears exactly once: **319** carry an unreleased Claude fleet claim and **27** do not. The index reads only dispatch and status metadata for Claude-owned rows. It does not inspect their claimed packet or source artifacts.

## Deterministic outputs

- `families.json` is the complete denominator with one current state, one selected current owner, exact metadata-supported final blocker, and candidate flags per family.
- `next-100.json` ranks 100 unique families by final-blocker class, ownership availability, and lexical family ID. It does not create a claim.
- `future-assignment-buckets.json` partitions all families by final blocker while retaining Claude and external owners as held rows.
- `state-contradictions.json` compares the recomputed family-state histogram and denominator with checkpoint evidence.
- `collision-guard.json` derives the Claude lane and path wall from the 52 committed prompt assignments before any output was written.

## Candidate cuts

- Custom pleading candidates: **103**.
- Held-byte relationship-release candidates: **90**.
- Rows without bound family identity: **49**.
- State/evidence contradictions: **0**.

## Safety posture

This is a proof-gap index, not fulfillment authority. No Claude family is reassigned, no active assignment or claim ledger is edited, no legal or source conclusion is invented, no commercial route is opened, and Production is untouched.
