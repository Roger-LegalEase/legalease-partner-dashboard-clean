# C1 Pennsylvania mapping diagnostic and Captain handoff

## DEFECT

Synced Captain truth `9f49bb75b9ac9c2e654b25fc6dcedacd0e87fc6d` into `codex/mission-lock-engineering` and read the controlling repository Mission Lock plan. Its root-level owner-supplied copy remains untouched and untracked.

[Hosted run 35543063831](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/35543063831), tools `e85d41b9f06df5767d080a4194fa88ac94914b51`, failed `consumer_caller_profile_and_eligibility_mapping_exact`. [Artifact 10614569882](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/35543063831/artifacts/10614569882), `checkout-gate.json`, records the failure but omits the actual job-spec profile values from its observation.

## ALL SEVEN OPERANDS

Local reproduction uses the real job builder, compiled PA profile, eligibility adapter, caller source, and the actual gate assertion/record function:

| Operand | Actual | Expected | Result |
|---|---|---|---|
| `consumerProfileVersion` | `null` | `null` | PASS |
| `consumerPacketType` | `custom_pleading` | `custom_pleading` | PASS |
| `isConsumerPaymentAllowed(consumerResultCode, true)` | `true` | `true` | PASS |
| `compiledProfile.jurisdiction.code` | `PA` | `PA` | PASS |
| `compiledPathway.label` | Path A — Non-conviction expungement | Path A — Non-conviction expungement | PASS |
| `built.spec.profileVersion` | `undefined` | `2026-06-19-source-conversion-1` | FAIL |
| `built.spec.profileId` | `undefined` | `PA` | FAIL |

## ACTUAL FAILED OPERAND

**Both** previously hidden operands fail. `built.spec` is `null`, not a specification carrying incorrect identity values. The new observation and structured `details` preserve undefined explicitly (value marker plus `actualType`), preventing JSON serialization from dropping it. They also report spec presence, resolved route kind, and route reason.

## ROOT CAUSE

`resolvePacketRoute` returns `legacy_retired` for this exact PA legacy pathway. `buildRenderJobSpec` explicitly returns `{spec: null, route}` for that kind before profile derivation. Its behavior matches the owner decision in `data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json` and `docs/architecture/adr/ADR-0004-legacy-generator-retirement-and-grade-a-fulfillment.md`: retired legacy generators cannot authorize new render jobs or Checkout.

The gate nevertheless demands a specification for that retired route. The next assertion also combines `legacy_retired` with populated spec fields. Changing only either profile equality would not repair that conflicting acceptance scenario.

The job builder, resolver, registry, compiled profiles, caller, eligibility adapter, and TS loader are byte-identical to application `884ad51d0ad50c520ec0ba2834eac03194ce88ac`. Comparing `src`, `scripts/lib`, `data`, and package manifests against that application shows only Captain's new Oregon decision record, unrelated to this PA reproduction. This is local reproduction of unchanged candidate behavior, not new hosted acceptance evidence.

## FILES CHANGED

- `scripts/rcap-hosted-checkout-gate.mjs`: observations/details only; the original seven-operand assertion is byte-identical to the Captain baseline.
- `scripts/rcap-hosted-checkout-mapping-evidence.test.mjs`: execute the gate's real assertion and evidence-emission code with controlled values and the real PA builder.
- This handoff.

## PROOF / NEGATIVE REGRESSION

`node --test scripts/rcap-hosted-checkout-mapping-evidence.test.mjs`: 5/5 PASS. Positive seven-operand emission; isolated wrong-version and wrong-ID failures; null-spec absence preservation; real candidate reproduction remains FAIL with exactly the last two operands false. Tests check both serialized evidence and log output.

`node scripts/verify-rcap-hosted-checkout-gate.mjs`: 95/95 PASS (static gate control, not hosted acceptance).

Canonical worker-input planner at Captain SHA: `reuse-accepted-digest`, `changedPaths=[]`, `missingCanonicalInputs=[]`; the edited gate is outside canonical worker inputs. `git diff --check` passes.

## CAPTAIN HANDOFF

- **Jurisdiction/pathway:** PA / `Path A — Non-conviction expungement`; compiled ID `path-a-non-conviction-expungement`.
- **Exact defect:** Hosted Checkout acceptance requires a new render specification from a commercially retired legacy route.
- **Evidence:** Hosted case above, seven-operand local reproduction, explicit retirement branch and owner decision.
- **Affected files:** `scripts/rcap-hosted-checkout-gate.mjs`; authority references `src/lib/rcap/render/job-contract.ts`, `src/lib/rcap/documents/packet-route-resolver.ts`, ADR-0004 and its decision JSON.
- **Why substantive:** Choosing a successor route or restoring this route's Checkout/render authority changes commercial/route scope. No legal identity is inferred or rewritten here.
- **Smallest decision:** Confirm the intended PA acceptance contract under retirement: a refusal case, or an explicitly identified and approved Grade-A successor for the positive Checkout journey. Engineering can implement that decision without silently substituting a route or weakening this assertion.

## COMMIT / NEXT

The final batch report supplies the exact diagnostic commit. Claude reviews/integrates it and resolves the PA acceptance-contract handoff before the next hosted attempt. No workflow was dispatched; C2 remains read-only.

Pins preserved: application `884ad51d0ad50c520ec0ba2834eac03194ce88ac`; worker source `117b469c453a403fbd217f1c441a08c7c68f6b3a`; digest `sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f`; Preview `dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe`. No rebuild, publication, Preview creation, Stripe retarget, or production action occurred.
