# Legal-design intake — all 50 states plus D.C.

One memo per jurisdiction. Drop a file named `<CODE>.memo.json` in this
directory, where `<CODE>` is the two-letter jurisdiction code (`AL` … `WY`,
plus `DC`). Nothing else in this directory is read as a memo.

Validate and import with:

```bash
npm run rcap:legal-design-intake
```

## What a memo must contain

Fifteen things per proposed relief track. All of them. A memo missing any one
is **rejected**, not partially imported: a missing waiting period or absent
stop condition is a question for counsel, and inventing one would put a
fabricated legal rule into the runtime wearing counsel's approval.

1. stable track ID · 2. legal and public name · 3. controlling authority ·
4. effective dates · 5. eligible record and disposition types · 6. exclusions
and waiting periods · 7. output strategy · 8. geography and venue · 9. filing
or process destination · 10. packet or process components · 11. official
sources · 12. filing, fee, notice and service rules · 13. self-help stop
conditions · 14. unresolved questions · 15. legal-design decision.

Where nothing applies, say so explicitly — `[]` for an empty list, `"none"`
for a rule. Absence and "there is none" are different answers and the
validator will not guess which was meant.

`TEMPLATE.memo.json` is a filled example. It is **not** a real memo, is not
named for any jurisdiction, and is never imported.

## No attorney metadata

This is not a reviewer database and must never become one. Do not include
reviewer names, contact details, bar numbers, firm names, signatures or
approver identities. The validator walks the whole memo at every depth and
**rejects** any of those keys rather than merely ignoring them.

## Legal-design approval is not output approval

`legal_design_approved` means the mechanism, venue and components are right.
It says nothing about the document the renderer actually produced.

An imported track therefore lands at `legal_review_pending`, never
`legal_approved`. It stays `runtime_disabled`, because `packet_ready` also
requires source approval, technical proof, visual review, a current source and
runtime enablement. Importing a memo enables nothing.

## Statuses

| Status | Meaning |
|---|---|
| `legal_design_approved` | Design settled. Implementation may begin. |
| `legal_design_approved_with_limitations` | Design settled within stated limits, which must be named. |
| `legal_research_required` | Not implementable yet. Deferred on import. |
| `output_review_pending` | Produced document is with counsel. |
| `legal_approved` | Counsel approved the completed output. |
| `legal_rejected` | Do not offer this track. |

## Where the human memo lives

Only completed, validated JSON belongs in this directory. The attorney's own
memo — and any partial draft, markup or clarification — is preserved separately
under `docs/record-clearing/legal-design-memos-received/`.
