# De-dup Indeterminate Read-path Findings

## Executive summary

This investigation resolves the fail-closed `INDETERMINATE -- MANUAL REVIEW` findings from `scripts/audit-all51-rule-grounded-screening-friction.mjs` for the Track 1 de-dup cleanup candidates. The two fields under review are:

- `county_or_filing_location`
- `case_identifier`

The verifier flagged three dynamic answer-map sites:

- `src/lib/rcap-engine/answer-normalization.ts:30`
- `src/lib/rcap-engine/answer-normalization.ts:43`
- `src/lib/rcap-engine/evaluator.ts:148`

Final recommendation: **HOLD for PR 1 until a narrow verifier-hardening PR encodes the proven generic patterns and the same `--check county_or_filing_location,case_identifier` gate passes.** The investigation found no field-specific evaluator, payment, result-code, packet-plan, or packet-generation read for the 15 Track 1 targets. The current verifier still fail-closes because it cannot yet distinguish the quoted generic profile-question iteration from unresolved dynamic reads.

## Per-site findings

| file | line | function | quoted code summary | classification | reasoning | impact on PR 1 |
| --- | ---: | --- | --- | --- | --- | --- |
| `src/lib/rcap-engine/answer-normalization.ts` | 30 | `requiredMissingQuestionIds` | `profile.questions.filter(...).filter((question) => { const value = answers[question.id]; ... }).map((question) => question.id)` | GENERIC ITERATION | The computed key is `question.id` while iterating every required, non-context-only engine-profile question. The function does not special-case `county_or_filing_location` or `case_identifier`; it applies the same undefined/null/empty-array/blank-string test to whatever questions are present in the profile. This function is not called by the current public evaluator path, which uses `requiredMissingPublicQuestionIds`. | Generic missing-field handling. Removing a collected question means there is one fewer profile question/key to process, but PR 1 should not proceed until the verifier encodes this specific generic iteration pattern and the gate passes. |
| `src/lib/rcap-engine/answer-normalization.ts` | 43 | `requiredMissingPublicQuestionIds` | `publicProfile.questions.filter((question) => publicIds.has(question.id)).filter((question) => question.required && question.contextOnly !== true).filter((question) => !hasAnswer(answers[question.id])).map((question) => question.id)` | GENERIC ITERATION | The computed key is `question.id` while iterating required, non-context-only public-profile questions. It only computes `missingQuestionIds`; it does not branch by field name or transform either de-dup value. For `case_identifier`, the target rows are `required: false`, so this site does not require it. For `county_or_filing_location`, the target rows are currently `required: true`, so this generic check can list it as missing while it remains a question, but it is not a field-specific evaluator, payment, pathway, or packet dependency. | Generic missing-field handling. It is safe only if PR 1 removes/hides the duplicate question from the public profile consistently; until then the check may require the visible required duplicate. Gate still needs narrow verifier hardening before PR 1. |
| `src/lib/rcap-engine/evaluator.ts` | 148 | `ambiguityReason` | `const legalFields = profile.questions.filter((question) => question.contextOnly !== true && question.stage !== "case_details" && question.stage !== "record_readiness"); const ambiguous = legalFields.find((question) => isUnknownAnswer(answers[question.id]));` | GENERIC ITERATION | The computed key is `question.id`, but the function first excludes `case_details` and `record_readiness`. All 15 intended Track 1 rows for `county_or_filing_location` and `case_identifier` are `stage: "case_details"`, so this dynamic access cannot resolve to those two IDs for the target states. It affects `needs_review` only for legal fields outside `case_details`/`record_readiness`. | Non-blocking for the 15 Track 1 rows. The verifier can safely learn this exact `legalFields` filter pattern, but PR 1 should wait for that gate update. |

### Quoted code context

`requiredMissingQuestionIds`:

```ts
export function requiredMissingQuestionIds(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>) {
  return profile.questions
    .filter((question) => question.required && question.contextOnly !== true)
    .filter((question) => {
      const value = answers[question.id];
      if (value === undefined || value === null) return true;
      if (Array.isArray(value)) return value.length === 0;
      return String(value).trim() === "";
    })
    .map((question) => question.id);
}
```

`requiredMissingPublicQuestionIds`:

```ts
export function requiredMissingPublicQuestionIds(publicProfile: PublicJurisdictionProfile, answers: Record<string, ScreeningAnswerValue>) {
  const publicIds = publicQuestionIdSet(publicProfile);
  return publicProfile.questions
    .filter((question) => publicIds.has(question.id))
    .filter((question) => question.required && question.contextOnly !== true)
    .filter((question) => !hasAnswer(answers[question.id]))
    .map((question) => question.id);
}
```

`ambiguityReason`:

```ts
function ambiguityReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  const legalFields = profile.questions.filter((question) => question.contextOnly !== true && question.stage !== "case_details" && question.stage !== "record_readiness");
  const ambiguous = legalFields.find((question) => isUnknownAnswer(answers[question.id]));
  if (ambiguous) return reason(jurisdiction, "source_fact_unknown", `${ambiguous.id} is uncertain and requires source review.`);
  return undefined;
}
```

## Per-field and per-state verdict

| state | field | kept twin | profile-level status | answer-normalization status | evaluator status | packet-generation/template status | final verdict | PR 1 action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CA | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| FL | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| GA | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| IA | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| ID | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| IN | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| IN | `case_identifier` | `case_number` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; not required, so not a missing-field blocker | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| KS | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| KY | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| LA | `case_identifier` | `case_number` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; not required, so not a missing-field blocker | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| MD | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| NE | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| OR | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| WV | `county_or_filing_location` | `county` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; currently required while present | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |
| WV | `case_identifier` | `case_number` | `DEDUP_DUPLICATE`, profile-clean | GENERIC ITERATION; not required, so not a missing-field blocker | Excluded from `ambiguityReason` because stage is `case_details` | No packet read-path found | SAFE TO REMOVE | hold |

## Packet read-path

No current `expungement-ai` packet read-path was found for either `county_or_filing_location` or `case_identifier`.

The current consumer packet flow is:

- `src/lib/expungement-ai/packet-generation.ts`
- `src/lib/rcap-engine/packet-planner.ts`
- compiled profile `packetGenerator` metadata

`packet-generation.ts` builds a text artifact from `ConsumerBriefcaseItem` summary/next steps/result metadata and `packetPlanForPathway`. It does not read raw screening answers or field IDs. `packet-planner.ts` reads packet-plan metadata (`requiredInputIds`, `sourceRuleRefs`, `sourceFormIds`) and does not fill documents from `answers`.

Search notes:

- `src/lib/rcap-engine/compiled/*.json` and `src/lib/rcap-engine/compiled/profiles/*.json` contain profile question definitions and are not TypeScript packet read-paths.
- `src/lib/rcap/state-packs/*/all50-build-metadata.ts` contains `county_or_filing_location` as generated state-pack metadata. These files are not reached by the current `expungement-ai` packet-generation path and are not field maps or renderer reads.
- No packet template, field map, PDF renderer, acroform renderer, overlay renderer, or document artifact builder reachable from `packet-generation.ts` or `packet-planner.ts` consumes either reviewed field.

No twin remap is required for current packet generation. If a future packet/template path starts consuming the duplicate IDs, the intended remaps would be:

- `county_or_filing_location` -> `county`
- `case_identifier` -> `case_number`

Do not implement those remaps in PR 1 unless a real packet-fill dependency is introduced or discovered.

## PR 1 recommendation

Recommendation: **HOLD until narrow verifier hardening lands and the gate passes.**

The code review resolves the three dynamic sites as generic/non-blocking for the 15 Track 1 targets, and the per-field investigation supports eventual removal of all 15 targets. However, the current verifier still fail-closes. Per the sequencing rule, PR 1 should not proceed until the verifier encodes the documented safe patterns and `npm run expungement:audit-all51-rule-grounded-friction -- --check county_or_filing_location,case_identifier` passes for the documented reason.

Required follow-up:

1. Add a narrow verifier-hardening change tied to the quoted code patterns above.
2. Re-run the same `--check county_or_filing_location,case_identifier` gate.
3. Start PR 1 only after the gate passes.

## Verifier implications

The verifier should keep failing closed for unknown dynamic answer-map reads.

The following dynamic patterns can be safely classified as generic non-blocking only when the verifier can prove the same structure:

- `requiredMissingQuestionIds`: `answers[question.id]` inside a filter over `profile.questions` that only checks required/non-context missingness.
- `requiredMissingPublicQuestionIds`: `answers[question.id]` inside a filter over `publicProfile.questions` that only checks required/non-context missingness.
- `ambiguityReason`: `answers[question.id]` inside `legalFields.find(...)` where `legalFields` explicitly excludes `question.stage === "case_details"` and `question.stage === "record_readiness"`.

A future verifier update should encode those narrow, quoted patterns. It must not whitelist `county_or_filing_location` or `case_identifier`, and it must not broadly ignore dynamic reads or assume computed keys are safe.

## Safety confirmation

- No runtime files changed.
- No profile files changed.
- No test expectations changed.
- No payment, Stripe, checkout, webhook, or Wilma files changed.
- No screening question was removed, hidden, moved, or rewritten.
- No migrations were run.
- No deploy happened.
