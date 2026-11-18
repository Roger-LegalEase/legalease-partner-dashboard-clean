RCAP now uses one canonical Create → Configure → Save → bilingual Preview → exact-version Confirm → protected Start → Dashboard workflow. Partner setup remains five steps. Clinic integration retains parent scope, assigned permissions, actual participant consent, and secure shared-device reset.

**Frozen candidate:** `fe1e345fd09f37bc7da7c07b925d4b5913d85748`. **Accepted Production baseline retained:** `ba81792225d6d82ef57c104061e9d5eb9d7db395`. **Verdict: NOT RELEASE READY.** This PR remains a draft; no Production SQL or domain changes.

**Scope review and preservation**

All 233 changed paths are accounted for in one path inventory: 110 application files, eight necessary migrations, 104 verification scripts, nine preserved sanitized checkpoint files, and two packaging/typecheck exclusions. The 231-path checkpoint remains in history. Raw evidence, private fixtures, credentials, and unrelated untracked files were not staged.

- Canonical RCAP/Partner controls, source-bound preview, jurisdiction choices, truthful readiness, conflict recovery, invitations, and operational navigation are necessary RCAP integration.
- Clinic changes repair inherited-scope, permission, queue-truth, consent/revocation, retry, and pre-consent reset defects. Existing event, consent, assistance and participant records are reused. Exact entry row locking prevents reset/start races; redemption facts remain immutable.
- Shared DTC changes are limited to demonstrated broken paid-preparation/retry visibility, same-origin private download, dead packet Back/Wilma actions, false unpersisted support-report success, auth continuation, and retained-control accessibility. Preview-local language does not change staff locale. Packet review retains participant facts and hides internal manifest values.
- Consumer funding distinguishes RCAP screening attribution from actual sponsored entitlement. Existing $50 Checkout, webhook writer, legal screening/verification engines, renderer and private artifact authority remain the existing systems. No parallel purchase or packet workflow.
- **Scope reduction found in this review:** the proposed funding SQL had widened the old `clinic_packet_dtc_authorized` RPC. On the existing unpaid isolated RCAP matter it returned true, while the deployed application's webhook rejects that channel. The migration now leaves the original RPC byte-for-byte unchanged and exposes the additional policy only to corrected callers. Its unnecessary copied RPC and legacy replacement were removed. New consumer classification, owner checks and sponsored-payment denial remain intact.
- The scope checker's 1 MiB subprocess limit was a proven verifier defect. It now retains the full inventory and fails closed on Git errors; historical exact-path permissions were not rewritten to force PASS.

**Migration review**

Read-only Production inspection matched all 34 referenced function definitions to the isolated baseline. Actual table grants, RLS, columns and immutable triggers were inspected; Production service-role grants are broader than the stricter local reset test baseline. All eight revised migrations apply successfully to a fresh isolated schema. No proposed migration is applied to Production.

| Migration | Necessary behavior / compatibility |
|---|---|
| `20261010190234_rcap_integrated_jurisdiction_scope.sql` | Preserve authorized partner jurisdiction limit through narrowing; canonical and retained section saves enforce it. Existing save signature retained. |
| `20261010191500_rcap_integrated_program_creation.sql` | Canonical transactional creation, explicit operator and approved defaults; LegalEase-managed creation does not require a fictitious first partner. Old provisioning signature retained. |
| `20261010194800_rcap_integrated_clinic_controls.sql` | Parent-scope options, event/code retry identity, schedule checks, protected queue truth and consented follow-up; no entitlement from queue labels. |
| `20261010200800_rcap_integrated_publication_edits.sql` | Correct contact alias, atomic hold for changed published materials, accurate setup readiness. Five-argument rollback Save remains supported; new caller requires explicit acknowledgment. |
| `20261010210100_rcap_integrated_screening_retries.sql` | Reuse exact admission on retry, count actual screening allowance, prevent duplicate consent sessions; old claim signatures retained. |
| `20261010214500_rcap_integrated_consumer_funding.sql` | Owner/source-bound independent consumer classification and matching payment writer. Deployed Clinic-cap function is unchanged. No funded entitlement or payment is created. |
| `20261010224000_rcap_integrated_supporting_documents.sql` | Allow required evidence upload while an unpublished program waits on that evidence; no signature or service authority granted. |
| `20261010232754_rcap_clinic_preconsent_reset.sql` | Exact entry binding and serialized close/start; terminal lifecycle monotonic, historical entries remain unclassified, no fabricated assisted session. |

**Acceptance reconciliation**

- 103 scenarios: **99 PASS, 0 FAIL, 3 BLOCKED, 1 NOT APPLICABLE**.
- 417 controls: **345 verified, 53 explicitly dispositioned, 19 blocked**. The previous 170 additional observed identities remain preserved as supplementary evidence.
- 21 gaps: **17 resolved in isolation, one isolated-verified/Production-owner pending, one conditional exclusion, two blocked**.
- All 352 original evidence hashes verified. All recorded control source bindings are unchanged. The prior `08547536b2bb9db417bdedf2076c51bee40077a6` full campaign is preserved; no second full campaign ran.
- Genuine OpenAI exact-source Spanish preparation and continuous Admin/Partner/Clinic/Participant journeys reuse unchanged valid evidence. No new provider request or regenerated current material was used to manufacture acceptance.
- The affected funding boundary passed owner/unknown/sponsored/independent-partner denials, unchanged legacy classification, and existing Checkout guard regressions. Ten existing isolated matters produced identical capacity decisions before/after the helper change.
- **Exact new build:** `Z9UH-UPps-rz1IEqHTKXv`; application tree SHA-256 `84d80845bfa517daa3f8ab3cfa707621dd2f9fa0a464d0c783a74053f0a2d803`. Build, focused lint and participant verifier pass. Real authenticated owner PDF delivery and other-account/anonymous denial were reverified through actual controls on this build (U-T12/U-T21). The paid provider receipt and artifact hash are genuine; no new charge or generation.
- The previously reported eight participant-verifier failures were stale logs. The authority-aware verifier already committed in the prior checkpoint passes. Broader scope/all-51 guards remain non-passing on historical authorization metadata and are explicitly dispositioned, not waived.

Both RCAP onboarding and worker-image GitHub checks passed on the frozen candidate. The additional Source Conveyor job has the environment blocker below.

**Outstanding gates**

- **U-T17:** all five isolated sponsorship authority rows and both allocations are explicitly synthetic; no authentic funded positive proof.
- **U-T18/U-T19:** existing Stripe TEST session `cs_test_b1D2LT59NqCVuPmP86B8aLrX232B0pn3fYIXT1FMU02951QEDZVQCMToO9` remains open/unpaid and requires human verification. One exact human completion request was sent. No replacement session or challenge bypass.
- **A09-26:** all seven available signed-agreement receipts explicitly identify fictional/test documents or no real contractual authority. These do not satisfy genuine positive agreement recording.
- **C-T23:** not applicable to the standard tested program; no specialized legal-aid PASS claimed.
- The required independent first-time reviewer has not performed the blind walkthrough.
- **CI environment:** Source Conveyor fails before application checks because `SOURCE_CORPUS_READ_TOKEN` is unavailable. The connected identity receives 403 for repository-secret access. [Actual failed job](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/38098922019/job/114350579984). No workflow or valid requirement was weakened.
- Target-specific Production SQL/cutover authorization remains for the point when readiness gates are actually satisfied.

One final reconciled record and complete path inventory are preserved at `artifacts/rcap-grade-a-final/fe1e345fd09f37bc7da7c07b925d4b5913d85748/`: `final-acceptance.json`, `acceptance-ledger.jsonl`, `control-ledger.jsonl`, `ux-gap-ledger.json`, `engineering/scope-review.json`, and `engineering/verifier-dispositions.json`. Original raw evidence remains at the prior candidate locator. No private evidence was published in Git.

**Production preserved:** `legaleasepartner.com` and `www.legaleasepartner.com` still map to READY `dpl_Hbb5dbyk3HLB1oXyLG6ZsQwEi1Es`, source `ba81792225d6d82ef57c104061e9d5eb9d7db395`. READY rollback `dpl_GA7XeC5wrpVDfAaV4aFbLyUgTdqa` retained. `legalease.com`, `expungement.ai`, and `www.expungement.ai` remain on `dpl_EF6AQYazF1KRRbV8xvCAJp4zkS3X`. No merge, Production deployment, SQL, participant activation or alias mutation; no owner usability acceptance claimed.


Full original evidence tables: [preserved acceptance](../08547536b2bb9db417bdedf2076c51bee40077a6/ACCEPTANCE.md). Focused successor receipts are linked from the reconciled ledgers.
