# RCAP PDF correction queue

26 correction-required families, 7 deciding causes, 3 disjoint shards.

20 of the 26 families are blocked by a shared-module cause. Their family-owned files are not wrong; the code that writes them is. Correcting them locally would be 20 workarounds for 4 bugs, and the next re-render would erase all 20.

## Deciding cause

| cause | owner | families |
| --- | --- | ---: |
| RC-M-SERVICE-BLOCK-BY-NAME | shared_module | 3 |
| RC-P-SIDECAR-NONCONFORMANT | shared_module | 5 |
| RC-M-NO-SSN-RULE | shared_module | 3 |
| RC-C-GEOMETRY-NOT-AN-INPUT | shared_module | 4 |
| RC-M-NO-REFUSE-WHEN | shared_module | 5 |
| RC-G-CAPTION-VARIANTS | shared_module | 5 |
| RC-V-VALUE-NOT-VISIBLE | shared_module | 1 |

## Shards

### Shard 1 — KY, AK (9)

| family | deciding cause | owner | executable here | next action |
| --- | --- | --- | :-: | --- |
| AK:tf-800-form-en | RC-M-SERVICE-BLOCK-BY-NAME | shared_module | no | escalated: fire service_block from the printed heading, not the field name |
| AK:tf-805-form-en | RC-M-SERVICE-BLOCK-BY-NAME | shared_module | no | escalated: fire service_block from the printed heading, not the field name |
| AK:tf-810-form-en | RC-P-SIDECAR-NONCONFORMANT | shared_module | no | escalated: emit all 20 contract fields, and point the contract verifier at a committed sidecar |
| KY:aoc-334-form-en | RC-M-NO-SSN-RULE | shared_module | no | escalated: add an SSN protect rule |
| KY:aoc-496-2-form-en | RC-M-NO-SSN-RULE | shared_module | no | escalated: add an SSN protect rule |
| KY:aoc-496-3-form-en | RC-C-GEOMETRY-NOT-AN-INPUT | shared_module | no | escalated: pass the widget rect and printed caption into decideBinding, then re-derive and re-render |
| KY:aoc-496-4-form-en | RC-P-SIDECAR-NONCONFORMANT | shared_module | no | escalated: emit all 20 contract fields, and point the contract verifier at a committed sidecar |
| KY:aoc-496-form-en | RC-M-NO-SSN-RULE | shared_module | no | escalated: add an SSN protect rule |
| KY:aoc-497-form-en | RC-M-NO-REFUSE-WHEN | shared_module | no | escalated: add refuseWhen guards to street_address and full_legal_name |

### Shard 2 — NC, VA, WI (9)

| family | deciding cause | owner | executable here | next action |
| --- | --- | --- | :-: | --- |
| NC:aoc-cr-287-form-en | RC-M-NO-REFUSE-WHEN | shared_module | no | escalated: add refuseWhen guards to street_address and full_legal_name |
| NC:aoc-cr-288-form-en | RC-C-GEOMETRY-NOT-AN-INPUT | shared_module | no | escalated: pass the widget rect and printed caption into decideBinding, then re-derive and re-render |
| NC:aoc-cr-296-form-en | RC-C-GEOMETRY-NOT-AN-INPUT | shared_module | no | escalated: pass the widget rect and printed caption into decideBinding, then re-derive and re-render |
| NC:aoc-cr-297-form-en | RC-M-NO-REFUSE-WHEN | shared_module | no | escalated: add refuseWhen guards to street_address and full_legal_name |
| NC:aoc-cr-298-form-en | RC-M-SERVICE-BLOCK-BY-NAME | shared_module | no | escalated: fire service_block from the printed heading, not the field name |
| NC:aoc-cv-226-support-en | RC-M-NO-REFUSE-WHEN | shared_module | no | escalated: add refuseWhen guards to street_address and full_legal_name |
| VA:cc-1201-form-en | RC-M-NO-REFUSE-WHEN | shared_module | no | escalated: add refuseWhen guards to street_address and full_legal_name |
| VA:cc-1473-form-en | RC-C-GEOMETRY-NOT-AN-INPUT | shared_module | no | escalated: pass the widget rect and printed caption into decideBinding, then re-derive and re-render |
| WI:cr-266-form-en | RC-P-SIDECAR-NONCONFORMANT | shared_module | no | escalated: emit all 20 contract fields, and point the contract verifier at a committed sidecar |

### Shard 3 — NE, VT (8)

| family | deciding cause | owner | executable here | next action |
| --- | --- | --- | :-: | --- |
| NE:cc-6-11-2-form-en | RC-G-CAPTION-VARIANTS | shared_module | no | escalated: bind one field per caption slot; suppress unfilled dropdown prompts at flatten |
| NE:cc-6-11-form-en | RC-G-CAPTION-VARIANTS | shared_module | no | escalated: bind one field per caption slot; suppress unfilled dropdown prompts at flatten |
| NE:cc-6-12-form-en | RC-G-CAPTION-VARIANTS | shared_module | no | escalated: bind one field per caption slot; suppress unfilled dropdown prompts at flatten |
| NE:cc-6-15-1-form-en | RC-G-CAPTION-VARIANTS | shared_module | no | escalated: bind one field per caption slot; suppress unfilled dropdown prompts at flatten |
| NE:dc-1-15-form-en | RC-G-CAPTION-VARIANTS | shared_module | no | escalated: bind one field per caption slot; suppress unfilled dropdown prompts at flatten |
| VT:200-00132-form-en | RC-P-SIDECAR-NONCONFORMANT | shared_module | no | escalated: emit all 20 contract fields, and point the contract verifier at a committed sidecar |
| VT:200-00132a-form-en | RC-P-SIDECAR-NONCONFORMANT | shared_module | no | escalated: emit all 20 contract fields, and point the contract verifier at a committed sidecar |
| VT:600-00228-support-en | RC-V-VALUE-NOT-VISIBLE | shared_module | no | escalated: capture the printed label into effectiveLabel |

## Shared-module escalations

### ESC-GEOMETRY-NOT-AN-INPUT

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs, scripts/implement-rcap-official-forms-d1.mjs

**Now** — decideBinding() receives { name, pdfType, effectiveLabel } and effectiveLabel is undefined for every field of every family, so `subject = effectiveLabel ?? name` resolves to the internal AcroForm field name. Widget rects are captured into field-census.json and never passed. Geometry is not an input to protection.

**Required** — The widget rect and the printed caption above it are inputs to decideBinding, and a binding whose rect falls inside a court-owned page region is refused whatever the field is called.

**Mutation that should fail** — Rename a protected field to an innocuous name and re-derive: the binder must still refuse it on geometry.

**Why no family-owned correction solves it** — The field maps are generated. A hand-edited map is overwritten by the next re-derivation, and hand-editing 20 of them would leave the defect live for every family added afterwards.

**Families waiting** — AK:tf-800-form-en, AK:tf-805-form-en, KY:aoc-334-form-en, KY:aoc-496-3-form-en, NC:aoc-cr-287-form-en, NC:aoc-cr-288-form-en, NC:aoc-cr-296-form-en, NC:aoc-cr-298-form-en, NC:aoc-cv-226-support-en, VA:cc-1201-form-en, VA:cc-1473-form-en, NE:dc-1-15-form-en

### ESC-MANUAL-NOT-NEVER-WRITE

**Module** — scripts/implement-rcap-official-forms-d1.mjs:151, scripts/verify-rcap-official-forms-d1.mjs:206

**Now** — NEVER_WRITE is { prohibited, protected, signature, court_or_agency, outside_party }. `manual` is absent from both sets, so a field the classifier declined to classify can still be bound and written, and the verifier carries the identical omission so it cannot catch what the binder allowed.

**Required** — `manual` is in NEVER_WRITE in both the binder and the verifier.

**Mutation that should fail** — Classify a field `manual` and bind it: the binder must refuse, and the verifier must fail if it did not.

**Why no family-owned correction solves it** — The classification is correct — the field really is manual. What is wrong is that `manual` is not treated as unwritable, which is one constant in shared code.

**Families waiting** — KY:aoc-334-form-en, KY:aoc-496-2-form-en, KY:aoc-496-form-en, NC:aoc-cr-288-form-en

### ESC-NO-SSN-RULE

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs

**Now** — PROTECT_RULES carries no SSN pattern, so a Defendant's SSN box is an ordinary writable field and takes the participant's full legal name.

**Required** — \bssn\b|social\s*security is a protect rule.

**Mutation that should fail** — Offer full_legal_name to a field named `Def.VitalStats.SSN`: it must be refused.

**Why no family-owned correction solves it** — Three families hit this today and every future family with an SSN box hits it tomorrow. A local refusal in three field maps leaves the rule missing.

**Families waiting** — KY:aoc-334-form-en, KY:aoc-496-2-form-en, KY:aoc-496-form-en

### ESC-NO-REFUSE-WHEN

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs

**Now** — Descriptor matchers are positive-only. street_address matches a City box and a bank-name box; full_legal_name matches an attorney-name line and a street line. The first pattern that hits wins, so the address prints twice and the petitioner is named as their own attorney.

**Required** — Descriptors carry refuseWhen guards: street_address declines city/state/zip subjects, full_legal_name declines street and bank subjects.

**Mutation that should fail** — Offer street_address to a field named `Def.Address.City`: it must be refused rather than matched.

**Why no family-owned correction solves it** — The guard belongs to the descriptor, which is shared. Eight families would each need the same local exception.

**Families waiting** — KY:aoc-496-2-form-en, KY:aoc-497-form-en, NC:aoc-cr-287-form-en, NC:aoc-cr-288-form-en, NC:aoc-cr-296-form-en, NC:aoc-cr-297-form-en, NC:aoc-cv-226-support-en, VA:cc-1201-form-en, VA:cc-1473-form-en

### ESC-SERVICE-BLOCK-BY-NAME

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs

**Now** — The service_block protect rule matches /certificate\s*of\s*service/ against the field NAME, while deterministic.filing_date matches /cert\s*date/. A field called certDate under a printed 'Certificate of Service' heading is therefore filled by the platform, producing a half-completed sworn certification of service dated by a system that does not know when service occurred.

**Required** — service_block fires from the block's printed heading, or cert-date is removed from the filing_date matcher.

**Mutation that should fail** — Offer filing_date to `certDate` under a service heading: it must be refused.

**Why no family-owned correction solves it** — This is a sworn statement. A per-family suppression that a re-render can undo is not an acceptable control for it.

**Families waiting** — AK:tf-800-form-en, AK:tf-805-form-en, NC:aoc-cr-298-form-en

### ESC-CAPTION-VARIANTS

**Module** — scripts/implement-rcap-official-forms-d1.mjs and the shared content-stream geometry module

**Now** — Every widget in a multi-purpose caption band is bound. After flattening, variants that JavaScript used to show and hide all render at once, overlapping, covering the court's own printed words, and unfilled dropdowns keep their prompt text ('Choose the court') as ink on a filed pleading.

**Required** — Exactly one field per caption slot is bound and the rest refused; an unfilled dropdown's prompt is suppressed at flatten.

**Mutation that should fail** — Flatten a form with an unselected dropdown: the prompt string must not appear in the page content stream.

**Why no family-owned correction solves it** — Five Nebraska families share one caption block. The selection rule is in the binder, not in any of their maps.

**Families waiting** — NE:cc-6-11-2-form-en, NE:cc-6-11-form-en, NE:cc-6-12-form-en, NE:cc-6-15-1-form-en, NE:dc-1-15-form-en

### ESC-VALUE-NOT-VISIBLE

**Module** — scripts/rcap-official-forms/rcap-field-semantics.mjs

**Now** — VT 600-00228 names its fields as bare digits. With only the name channel available every descriptor refuses no_allowlisted_fact_matches, and the finished fee-waiver application carries none of the applicant's information.

**Required** — The printed label is captured into effectiveLabel and matched.

**Mutation that should fail** — Offer full_legal_name to a field named `2` sitting under a printed 'Name' caption: it must bind, not refuse.

**Why no family-owned correction solves it** — explicitFieldMappings for 15 numbered fields is exactly the local workaround the freeze forbids, and it is the same missing channel as ESC-GEOMETRY-NOT-AN-INPUT seen from the other side.

**Families waiting** — VT:600-00228-support-en

### ESC-SIDECAR-NONCONFORMANT

**Module** — scripts/rcap-official-forms/rcap-artifact-provenance.mjs, scripts/verify-rcap-shared-pdf-contract.mjs

**Now** — 0 of 27 committed sidecars carry the 20 fields the shared contract requires; 12 fields are null in a typical one. The contract's verifier proves its P-block against a sidecar it synthesises from a canary and never opens a committed one, so nothing had compared them.

**Required** — The provenance module emits all 20 fields, and the contract verifier reads a committed sidecar.

**Mutation that should fail** — Null one field in a committed sidecar: the contract verifier must go red.

**Why no family-owned correction solves it** — Hand-populating 27 sidecars would satisfy the count and leave the emitter and its verifier both wrong, so the 28th would be non-conformant again.

**Families waiting** — AK:tf-800-form-en, AK:tf-805-form-en, AK:tf-810-form-en, KY:aoc-334-form-en, KY:aoc-496-2-form-en, KY:aoc-496-3-form-en, KY:aoc-496-4-form-en, KY:aoc-496-form-en, KY:aoc-497-form-en, NC:aoc-cr-287-form-en, NC:aoc-cr-288-form-en, NC:aoc-cr-296-form-en, NC:aoc-cr-297-form-en, NC:aoc-cr-298-form-en, NC:aoc-cv-226-support-en, VA:cc-1201-form-en, VA:cc-1473-form-en, WI:cr-266-form-en, NE:cc-6-11-2-form-en, NE:cc-6-11-form-en, NE:cc-6-12-form-en, NE:cc-6-15-1-form-en, NE:dc-1-15-form-en, VT:200-00132-form-en, VT:200-00132a-form-en, VT:600-00228-support-en
