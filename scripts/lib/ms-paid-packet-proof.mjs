import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { assertQuestionContractOutputInputs, QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH, MS_QUESTION_CONTRACT_PREDECESSOR_PATH } from '../../src/lib/rcap/fulfillment/question-contract-source-successor.mjs';
/** Current source/output proof. Both older proof generations are immutable:
 * 20260920 retains its approved output bytes, while 20260914 remains retired
 * through that predecessor's original guide-supersession record. */
export const MS_PAID_PACKET_PROOF='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20261013.json';
export const MS_PAID_PACKET_PROOF_PREDECESSOR='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20261011.json';
export const MS_PAID_PACKET_PROOF_20260920='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20260920.json';
export const MS_PAID_PACKET_PROOF_RETIRED='data/rcap-grade-a/participant-data-rights/ms-paid-packet-proof-20260914.json';
/** The approved artifacts, by the ids the owner decision names them under. */
export const MS_APPROVED_ARTIFACT_IDS=['full-en','full-es','court-only'];
// Actual verifier and loader execution dependencies, in addition to observed
// output inputs and the immutable predecessor's complete inventory.
export const MS_PROOF_EXECUTION_INPUTS=['scripts/lib/rcap-ephemeral-pg.mjs','scripts/lib/ts-esm-loader.mjs',
  'scripts/lib/server-only-shim.mjs','scripts/lib/next-server-esm-bridge.mjs','package.json','package-lock.json',
  // Exact literal DC guard/artifact custody reads; these are not module observations.
  'data/rcap-grade-a/legal-decisions/OWNER_ARTIFACT_REREVIEW_DC_MISATTRIBUTED_2026-10-16.json',
  'data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_DC_MISATTRIBUTED_2026-10-16.json',
  'data/rcap-grade-a/mission-lock/task54-dc-render/render-evidence.json',
  'data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/canonical.pdf',
  'data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/boundary.pdf',
  'data/rcap-grade-a/legal-decisions/DC_ACTUAL_INNOCENCE_ARTIFACT_MOVE_2026-10-16.json',
  'data/rcap-grade-a/legal-decisions/CURRENT_COMMERCIAL_ARTIFACT_VISUAL_REVIEW_DC_ACTUAL_INNOCENCE_2026-10-16.json',
  'data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_DC_ACTUAL_INNOCENCE_2026-10-16.json',
  'data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/full-en.pdf',
  'data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/full-es.pdf',
  'data/rcap-ledger/grade-a/artifacts/current-commercial-review/dc-actual-innocence-2026-10-16/court-only.pdf',
  // Mandatory literal source-only succession read, distinct from observed modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ms-ga-va-mn-20261017-v1.json',
  // Separate current CA display-only source hop; retain the old named record.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-two-result-copies-20261017-v1.json',
  // Mandatory current NY terminology source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ny16055-three-terminology-20261017-v1.json',
  // Mandatory current GA pardon spec-pin source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-pardon-spec-pin-20261017-v1.json',
  // Mandatory current GA pardon contact-successor source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-pardon-contact-successor-20261017-v1.json',
  // Mandatory current GA/VA spec successor gates source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-va-spec-successor-gates-20261017-v1.json',
  // Mandatory current CA no-phone contact source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-no-phone-contact-20261017-v1.json',
  // Mandatory current GA SB288 / CT petition source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-sb288-ct-petition-20261018-v1.json',
  // Mandatory current GA guide Spanish source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga-guide-spanish-20261018-v1.json',
  // Mandatory current CT prepay record-facts source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ct-prepay-record-facts-20261018-v1.json',
  // Mandatory current IL/SD/WY record-facts source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-il-sd-wy-record-facts-20261018-v1.json',
  // Mandatory current OH juvenile copy source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-oh-juvenile-copy-20261018-v1.json',
  // Mandatory current CA Safe at Home source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-safe-at-home-20261018-v1.json',
  // Mandatory current lead Spanish source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-lead-spanish-20261019-v1.json',
  // Mandatory current lead Spanish layer-2 source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-lead-spanish-layer2-20261019-v1.json',
  // Mandatory current MN guard memo source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-mn-guard-memo-20261019-v1.json',
  // Mandatory current VA guard memo source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-va-guard-memo-20261019-v1.json',
  // Mandatory current MD police-record reconciliation source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-md-police-reconciliation-20261019-v1.json',
  // Mandatory current VA record origin source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-va-record-origin-20261020-v1.json',
  // Mandatory current GA-21 reviewed Spanish labels source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ga21-spanish-labels-20261020-v1.json',
  // Mandatory current ND custom-pleading receipt pin source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-nd-custom-receipt-20261020-v1.json',
  // Mandatory current MS shared Spanish guide pages source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ms-guide-es-20261020-v1.json',
  // Mandatory current CA Proposition 64 stack source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-ca-prop64-stack-20261020-v1.json',
  // Mandatory current ND census-prose receipt re-pin source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-nd-census-prose-20261020-v1.json',
  // Mandatory current batch28 GA16 NV location history and GA20 helpers source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b28-nv-ga20-20261020-v1.json',
  // Mandatory current batch30 CO JDF417 routing and section 8b source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b30-co-20261020-v1.json',
  // Mandatory current batch31 CA pardon not-sure source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31-ca-pardon-20261020-v1.json',
  // Mandatory current batch31 CA pardon copy-entry position source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31-ca-order-20261020-v1.json',
  // Mandatory current batch31b GA-16 location contexts source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31b-ga16-location-20261020-v1.json',
  // Mandatory current batch31c N1 and CA-L01 and CA-L02 source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31c-ca-l01-l02-20261021-v1.json',
  // Mandatory current batch31c GA21 and CA-L03 source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31c-ga21-ca-l03-20261021-v1.json',
  // Mandatory current batch31d CA-L06 source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31d-ca-l06-20261021-v1.json',
  // Mandatory current batch31d GA-20 CO and AL source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31d-ga20-co-al-20261021-v1.json',
  // Mandatory current batch31d GA-20 R3 AK, GA, NY and MD source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31d-ga20-r3-20261021-v1.json',
  // Mandatory current batch31d GA-20 R3 MD O17 F1 source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31d-md-f1-20261021-v1.json',
  // Mandatory current batch31e staging stack source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31e-stack-20261021-v1.json',
  // Mandatory current batch31e payment-safety unit source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31e-payment-20261021-v1.json',
  // Mandatory current batch31e final combined correction source-only record, distinct from modules.
  'data/rcap-grade-a/participant-data-rights/question-contract-source-succession-b31e-final-20261022-v1.json'];
// Exact import paths observed by the actual verifier imports-only probe;
// the full execution must reproduce this set before emitting a current proof.
export const MS_PROOF_OBSERVED_INPUTS=[
  "src/lib/rcap-engine/illinois-plan-forms.ts",
  "src/lib/rcap-engine/illinois-program-facts.ts",
  "src/lib/rcap-engine/north-dakota-plan-forms.ts",
  "src/lib/rcap-engine/payment-route-scope.ts",
  "data/rcap-all50/guidance-packets/ca.json",
  "data/rcap-all50/guidance-packets/mo.json",
  "data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/product-wiring.json",
  "data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/product-wiring.json",
  "data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/product-wiring.json",
  "data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/product-wiring.json",
  "data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/production-field-map.json",
  "data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/product-wiring.json",
  "data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/production-field-map.json",
  "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json",
  "data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json",
  "data/rcap-ledger/completed-output-counsel-manifest.json",
  "data/rcap-ledger/packet-correction-required.json",
  "data/rcap-ledger/packet-fulfillment-records.json",
  "data/rcap-ledger/route-kind-adjudications.json",
  "data/rcap-ledger/route-presentation-conflicts.json",
  "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
  "data/record-clearing/legal-decisions/2026-09-25-ms-nonconv-sponsored-preview.json",
  "data/record-clearing/legal-decisions/route-ratification-registry.json",
  "data/record-clearing/legal-design-intake/AK.memo.json",
  "data/record-clearing/legal-design-intake/AL.memo.json",
  "data/record-clearing/legal-design-intake/AR.memo.json",
  "data/record-clearing/legal-design-intake/CA.memo.json",
  "data/record-clearing/legal-design-intake/MD.memo.json",
  "data/record-clearing/legal-design-intake/MN.memo.json",
  "data/record-clearing/legal-design-intake/MO.memo.json",
  "data/record-clearing/legal-design-intake/MT.memo.json",
  "data/record-clearing/legal-design-intake/NY.memo.json",
  "data/record-clearing/legal-design-intake/OH.memo.json",
  "data/record-clearing/legal-design-intake/VA.memo.json",
  "data/record-clearing/legal-design-packet-set-manifests.json",
  "data/record-clearing/packet-specifications/CT-petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202.v1.json",
  "data/record-clearing/packet-specifications/DC-actual-innocence-expungement.v1.json",
  "data/record-clearing/packet-specifications/DC-correct-misattributed-arrest.v1.json",
  "data/record-clearing/packet-specifications/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json",
  "data/record-clearing/packet-specifications/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json",
  "data/record-clearing/packet-specifications/IL-criminal-identity-theft-mistaken-identity-relief.v1.json",
  "data/record-clearing/packet-specifications/IL-felony-prostitution-relief.v1.json",
  "data/record-clearing/packet-specifications/KS-municipal-arrest-record-expungement-under-12-4516a.v1.json",
  "data/record-clearing/packet-specifications/KS-municipal-conviction-or-diversion-expungement-under-12-4516.v1.json",
  "data/record-clearing/packet-specifications/MS-additional-misdemeanor-relief.v1.json",
  "data/record-clearing/packet-specifications/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json",
  "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json",
  "data/record-clearing/packet-specifications/ND-first-offense-possession-sealing.v1.json",
  "data/record-clearing/packet-specifications/NV-probation-specialty-court-dismissal-set-aside-sealing.v1.json",
  "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json",
  "data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json",
  "data/record-clearing/packet-specifications/SD-suspended-imposition-of-sentence-sealing.v1.json",
  "data/record-clearing/packet-specifications/VA-absolute-pardon-expungement.v1.json",
  "data/record-clearing/packet-specifications/WY-felony-conviction-expungement.v1.json",
  "data/record-clearing/packet-specifications/drafts/CA-prop64-juvenile-review.v1.json",
  "data/record-clearing/production-factory/packet-proofs/rcap-ak-guidance-implementation.json",
  "data/record-clearing/production-factory/packet-proofs/rcap-ca-guidance-implementation.json",
  "data/record-clearing/production-factory/packet-proofs/rcap-md-guidance-implementation.json",
  "data/record-clearing/production-factory/packet-proofs/rcap-mn-custom-pleading.json",
  "data/record-clearing/production-factory/packet-proofs/rcap-mn-guidance-implementation.json",
  "data/record-clearing/production-factory/packet-proofs/rcap-mo-guidance-implementation.json",
  "data/record-clearing/production-factory/packet-proofs/rcap-ny-guidance-implementation.json",
  "data/record-clearing/production-factory/packet-proofs/rcap-oh-guidance-implementation.json",
  "data/record-clearing/supplemental-guides/DC-actual-innocence-expungement.v1.json",
  "data/record-clearing/supplemental-guides/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json",
  "data/record-clearing/supplemental-guides/GA-sb-288-misdemeanor-conviction-restriction-and-sealing.v1.json",
  "data/record-clearing/supplemental-guides/IL-criminal-identity-theft-mistaken-identity-relief.v1.json",
  "data/record-clearing/supplemental-guides/IL-felony-prostitution-relief.v1.json",
  "data/record-clearing/supplemental-guides/MS-additional-misdemeanor-relief.v1.json",
  "data/record-clearing/supplemental-guides/MS-first-offender-nontraffic-misdemeanor-conviction-expungement-99-19-71-1.v1.json",
  "data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json",
  "data/record-clearing/supplemental-guides/WY-felony-conviction-expungement.v1.json",
  "scripts/lib/il-prostitution-j-vacate-composition.mjs",
  "scripts/lib/ms-paid-packet-proof.mjs",
  "scripts/lib/ms-successor-review-matter.mjs",
  "scripts/lib/nd-first-offense-possession-composition.mjs",
  "scripts/lib/rcap-ephemeral-pg.mjs",
  "scripts/lib/server-only-shim.mjs",
  "scripts/rcap-custom-pleading/court-facing-rows.mjs",
  "src/components/expungement-ai/screening/answers.ts",
  "src/lib/expungement-ai/ak-courtview-contact.ts",
  "src/lib/expungement-ai/ak-courtview-record-context.ts",
  "src/lib/expungement-ai/ak-pardon-record-context.ts",
  "src/lib/expungement-ai/al-record-context.ts",
  "src/lib/expungement-ai/al-redeemer-classification.ts",
  "src/lib/expungement-ai/ar-felony-record-context.ts",
  "src/lib/expungement-ai/ar-nonconviction-record-context.ts",
  "src/lib/expungement-ai/authoritative-screening-result.ts",
  "src/lib/expungement-ai/ca-1203-4-record-context.ts",
  "src/lib/expungement-ai/ca-1203-4a-record-context.ts",
  "src/lib/expungement-ai/ca-automatic-record-context.ts",
  "src/lib/expungement-ai/ca-prop64-caption-answer.ts",
  "src/lib/expungement-ai/ca-prop64-caption-facts.ts",
  "src/lib/expungement-ai/ca-prop64-caption-successor.ts",
  "src/lib/expungement-ai/ca-prop64-choices.ts",
  "src/lib/expungement-ai/ca-prop64-contact-answer.ts",
  "src/lib/expungement-ai/ca-prop64-contact-questions.ts",
  "src/lib/expungement-ai/ca-prop64-contact-successor.ts",
  "src/lib/expungement-ai/ca-prop64-juvenile-document-preparation.ts",
  "src/lib/expungement-ai/ca-prop64-juvenile-document-questions.ts",
  "src/lib/expungement-ai/ca-prop64-quantity.ts",
  "src/lib/expungement-ai/ca-prop64-record-answer.ts",
  "src/lib/expungement-ai/ca-prop64-record-facts.ts",
  "src/lib/expungement-ai/contact-representation.ts",
  "src/lib/expungement-ai/conviction-fallback-prior-contracts.json",
  "src/lib/expungement-ai/court-completion-fact-meaning.ts",
  "src/lib/expungement-ai/court-completion-reuse.ts",
  "src/lib/expungement-ai/ct-clean-slate-contact.ts",
  "src/lib/expungement-ai/delaware-protected-corrections.ts",
  "src/lib/expungement-ai/frontend/ca-prop64-reviewed-choices.json",
  "src/lib/expungement-ai/frontend/profiles/all51.json",
  "src/lib/expungement-ai/frontend/reviewed-assisted-contact-copy.json",
  "src/lib/expungement-ai/frontend/reviewed-participant-copy.json",
  "src/lib/expungement-ai/frontend/reviewed-question-spanish.json",
  "src/lib/expungement-ai/frontend/reviewed-result-display-copy.json",
  "src/lib/expungement-ai/frontend/reviewed-source-question-copy.json",
  "src/lib/expungement-ai/ga-pardon-caption.ts",
  "src/lib/expungement-ai/ga-pardon-category-context.ts",
  "src/lib/expungement-ai/ga-pardon-petition-readiness.ts",
  "src/lib/expungement-ai/ga-pardon-preparation.ts",
  "src/lib/expungement-ai/ga-sb288-location-context.ts",
  "src/lib/expungement-ai/il-identity-location-context.ts",
  "src/lib/expungement-ai/ks-municipal-contact.ts",
  "src/lib/expungement-ai/localization.ts",
  "src/lib/expungement-ai/mn-299c11-location-context.ts",
  "src/lib/expungement-ai/mn-609a015-location-context.ts",
  "src/lib/expungement-ai/mn-609a017-location-context.ts",
  "src/lib/expungement-ai/mn-cannabis-location-context.ts",
  "src/lib/expungement-ai/mn-two-county-source-facts.ts",
  "src/lib/expungement-ai/mo-610105-court-context.ts",
  "src/lib/expungement-ai/mo-610122-court-context.ts",
  "src/lib/expungement-ai/mo-xiv-court-context.ts",
  "src/lib/expungement-ai/ms-additional-location-context.ts",
  "src/lib/expungement-ai/ms-first-location-context.ts",
  "src/lib/expungement-ai/mt-deferred-document-inputs.ts",
  "src/lib/expungement-ai/mt-deferred-document-questions.ts",
  "src/lib/expungement-ai/nd-first-offense-family-inputs.ts",
  "src/lib/expungement-ai/nd-first-offense-record-context.ts",
  "src/lib/expungement-ai/nv-program-location-context.ts",
  "src/lib/expungement-ai/ny-16059-case-classification.ts",
  "src/lib/expungement-ai/ny-16059-case-questions.ts",
  "src/lib/expungement-ai/ny-16059-case-records.ts",
  "src/lib/expungement-ai/ny-16059-clock-confirmation.ts",
  "src/lib/expungement-ai/ny-16059-current-components.ts",
  "src/lib/expungement-ai/ny-16059-current-document-questions.ts",
  "src/lib/expungement-ai/ny-16059-document-preparation.ts",
  "src/lib/expungement-ai/ny-16059-filing-venue.ts",
  "src/lib/expungement-ai/ny-16059-future-applications.ts",
  "src/lib/expungement-ai/ny-16059-packet-facts.ts",
  "src/lib/expungement-ai/ny-16059-packet-successor.ts",
  "src/lib/expungement-ai/ny-16059-prior-clock.ts",
  "src/lib/expungement-ai/ny-16059-sealing-history.ts",
  "src/lib/expungement-ai/ny-16059-statutory-class.ts",
  "src/lib/expungement-ai/ny-16059-transaction-associations.ts",
  "src/lib/expungement-ai/ny-16059-transaction-facts.ts",
  "src/lib/expungement-ai/ny-custody-correction.ts",
  "src/lib/expungement-ai/oh-juvenile-stage-questions.ts",
  "src/lib/expungement-ai/oh-trafficking-court-context.ts",
  "src/lib/expungement-ai/oregon-disposition-contact-answer.ts",
  "src/lib/expungement-ai/oregon-disposition-contact.ts",
  "src/lib/expungement-ai/packet-collection-overrides.ts",
  "src/lib/expungement-ai/packet-collection.ts",
  "src/lib/expungement-ai/packet-contract-successors.ts",
  "src/lib/expungement-ai/packet-fulfillment-authority.ts",
  "src/lib/expungement-ai/packet-information.ts",
  "src/lib/expungement-ai/packet-route-safety.ts",
  "src/lib/expungement-ai/protected-legacy-answers.ts",
  "src/lib/expungement-ai/question-answer-state.ts",
  "src/lib/expungement-ai/record-fact-clarification.ts",
  "src/lib/expungement-ai/registered-specification-record-history.ts",
  "src/lib/expungement-ai/reviewed-contact-contracts.json",
  "src/lib/expungement-ai/reviewed-court-completion-contracts.json",
  "src/lib/expungement-ai/reviewed-packet-contract-successors.json",
  "src/lib/expungement-ai/reviewed-question-copy.ts",
  "src/lib/expungement-ai/reviewed-result-copy.ts",
  "src/lib/expungement-ai/sd-sis-location-context.ts",
  "src/lib/expungement-ai/sensitive-packet-facts.ts",
  "src/lib/expungement-ai/verification-cas.ts", "src/lib/expungement-ai/virginia-record-context.ts",
  "src/lib/legal-authority/authority.json",
  "src/lib/legal-authority/conditions.ts",
  "src/lib/legal-authority/index.ts",
  "src/lib/legal-authority/resolve-route.ts",
  "src/lib/legal-authority/routes/mississippi.json",
  "src/lib/legal-authority/routes/national-report-2026-08-28.json",
  "src/lib/legal-authority/routes/national-report-batch-b.json",
  "src/lib/legal-authority/routes/national-report-batch-c.json",
  "src/lib/legal-authority/routes/p0.json",
  "src/lib/legal-authority/routes/route-splits.json",
  "src/lib/legal-authority/routes/single-routes.json",
  "src/lib/legal-authority/types.ts",
  "src/lib/partners/onboarding/rcap-spanish-copy.ts",
  "src/lib/rcap-engine/answer-normalization.ts",
  "src/lib/rcap-engine/arkansas-record-origin.ts",
  "src/lib/rcap-engine/california-1203-4-facts.ts",
  "src/lib/rcap-engine/california-prop64-facts.ts",
  "src/lib/rcap-engine/component-deferral-clamp.ts",
  "src/lib/rcap-engine/composed-route-selector.ts",
  "src/lib/rcap-engine/conviction-relief-request.ts",
  "src/lib/rcap-engine/dc-innocence-location-context.ts",
  "src/lib/rcap-engine/delaware-conviction-questions.ts",
  "src/lib/rcap-engine/delaware-conviction-rules.ts",
  "src/lib/rcap-engine/evaluator.ts",
  "src/lib/rcap-engine/expungement-ai-adapter.ts",
  "src/lib/rcap-engine/factual-pathway-exclusions.ts",
  "src/lib/rcap-engine/georgia-agency-county-context.ts",
  "src/lib/rcap-engine/georgia-first-offender.ts",
  "src/lib/rcap-engine/georgia-pardon-facts.ts",
  // GA SB288 and CT clean-slate petition record facts: imported by evaluator.ts for the GA-12 registered members; inert for every other route.
  "src/lib/rcap-engine/georgia-sb288-facts.ts",
  "src/lib/rcap-engine/connecticut-clean-slate-petition-facts.ts",
  // IL prostitution, SD SIS and WY 7-13-1502 record facts: imported by evaluator.ts for the GA-12 registered members; inert for every other route.
  "src/lib/rcap-engine/illinois-prostitution-facts.ts",
  "src/lib/rcap-engine/south-dakota-sis-facts.ts",
  "src/lib/rcap-engine/wyoming-1502-facts.ts",
  "src/lib/rcap-engine/illinois-cannabis-facts.ts",
  "src/lib/rcap-engine/kansas-district-facts.ts",
  "src/lib/rcap-engine/kansas-record-scope.ts",
  "src/lib/rcap-engine/louisiana-automation-status.ts",
  "src/lib/rcap-engine/maine-nonconviction-facts.ts",
  "src/lib/rcap-engine/maryland-police-record-facts.ts",
  "src/lib/rcap-engine/mississippi-conditional-discharge.ts",
  "src/lib/rcap-engine/mississippi-exact-timing.ts",
  "src/lib/rcap-engine/mississippi-program-completion.ts",
  "src/lib/rcap-engine/missouri-automatic-drug-guidance.ts",
  "src/lib/rcap-engine/missouri-closed-record-facts.ts",
  "src/lib/rcap-engine/missouri-marijuana-status-facts.ts",
  "src/lib/rcap-engine/montana-deferred-facts.ts",
  "src/lib/rcap-engine/montana-record-correction-financial.ts",
  "src/lib/rcap-engine/nebraska-nonconviction-facts.ts",
  "src/lib/rcap-engine/nevada-176a-branch.ts",
  "src/lib/rcap-engine/new-jersey-marijuana-status-financial.ts",
  "src/lib/rcap-engine/new-mexico-guidance-financial.ts",
  "src/lib/rcap-engine/new-york-16059-clock-display.ts",
  "src/lib/rcap-engine/new-york-16059-facts.ts",
  "src/lib/rcap-engine/new-york-16059-questions.ts",
  "src/lib/rcap-engine/north-dakota-first-offense-facts.ts",
  "src/lib/rcap-engine/ny-16055-guidance.ts",
  "src/lib/rcap-engine/ny-16057-guidance.ts",
  "src/lib/rcap-engine/ny-mrta-stage-facts.ts",
  "src/lib/rcap-engine/ohio-juvenile-source-stage.ts",
  "src/lib/rcap-engine/oklahoma-clean-slate-financial.ts",
  "src/lib/rcap-engine/oregon-disposition-identity.ts",
  "src/lib/rcap-engine/packet-planner.ts",
  "src/lib/rcap-engine/pathway-context.ts",
  "src/lib/rcap-engine/profile-registry.ts",
  "src/lib/rcap-engine/public-profile-projection.ts",
  "src/lib/rcap-engine/route-fact-relevance.ts",
  "src/lib/rcap-engine/screening-question-selection.ts",
  "src/lib/rcap-engine/south-carolina-guidance-financial.ts",
  "src/lib/rcap-engine/south-dakota-23a-27-17-escalation.ts",
  "src/lib/rcap-engine/south-dakota-guidance-financial.ts",
  "src/lib/rcap-engine/texas-nondisclosure-facts.ts",
  "src/lib/rcap-engine/unavailable-packet-routes.ts", "src/lib/rcap-engine/virginia-record-origin.ts",
  "src/lib/rcap-engine/virginia-victim-question.ts",
  "src/lib/rcap-engine/west-virginia-guidance-financial.ts",
  "src/lib/rcap-engine/wyoming-1401-facts.ts",
  "src/lib/rcap-engine/wyoming-1501-facts.ts",
  "src/lib/rcap/documents/guidance-packet-registry.ts",
  "src/lib/rcap/fulfillment/consumer-specification-binding.ts",
  "src/lib/rcap/fulfillment/final-verification-contract.ts",
  "src/lib/rcap/fulfillment/grade-a-admission.ts",
  "src/lib/rcap/fulfillment/grade-a-authority.ts",
  "src/lib/rcap/fulfillment/grade-a-packet-proof.ts",
  "src/lib/rcap/fulfillment/grade-a-registry.ts",
  "src/lib/rcap/fulfillment/grade-a-request-context.ts",
  "src/lib/rcap/fulfillment/paid-consumer-successor.ts",
  "src/lib/rcap/fulfillment/question-contract-source-successor.mjs",
  "src/lib/rcap/fulfillment/sponsored-channel-authority.ts",
  "src/lib/rcap/grade-a/composer.ts",
  "src/lib/rcap/grade-a/document-contract.ts",
  "src/lib/rcap/grade-a/families/il-prostitution-j-vacate-set.ts",
  "src/lib/rcap/grade-a/families/nd-first-offense-possession-set.ts",
  "src/lib/rcap/grade-a/packet-specification.ts",
  "src/lib/rcap/grade-a/participant-packet.ts",
  "src/lib/rcap/grade-a/renderer.ts",
  "src/lib/rcap/render/ga-pardon-facts.ts",
  "src/lib/rcap/render/participant-packet-assembly.ts",
  "src/lib/rcap/supplemental/guide-registry.ts",
  "src/lib/rcap/supplemental/guide-renderer.ts",
  "src/lib/server-runtime-environment.ts",
  "src/lib/supabase/server.ts",
  "data/record-clearing/legal-design-intake/MS.memo.json",
  "src/lib/expungement-ai/ms-first-offender-source-questions.ts",
  "src/lib/legal-authority/routes/ct-cannabis-e4-r2-successor.json",
  "src/lib/rcap-engine/mississippi-first-offender-source-facts.ts",
  "data/rcap-ledger/crosswalk-resolution/E4-R2.json",
  "data/record-clearing/legal-design-intake/CT.memo.json",
  "src/lib/rcap-engine/connecticut-cannabis-automatic-guidance.ts",
  "data/rcap-all50/guidance-packets/ct.json",
  "data/rcap-ledger/track-pathway-crosswalk.json",
  "data/record-clearing/legal-design-intake/KS.memo.json",
  "src/lib/expungement-ai/ks-municipal-category-context.ts",
  "src/lib/expungement-ai/md-juvenile-county-source-purpose.ts", "src/lib/expungement-ai/md-juvenile-document-questions.ts",
  "src/lib/rcap-engine/connecticut-automatic-source-guidance.ts",
  "src/lib/rcap/state-packs/maryland/filing-instructions.ts",
  "src/lib/rcap/state-packs/maryland/required-fields.ts",
  "data/record-clearing/legal-design-intake/DC.memo.json",
  "src/lib/rcap-engine/district-of-columbia-general-guidance.ts",
  "data/record-clearing/legal-design-intake/FL.memo.json",
  "src/lib/rcap-engine/florida-conditional-source-information.ts",
  "src/lib/expungement-ai/va-pardon-location-context.ts",
  "src/lib/expungement-ai/va-pardon-type-source.ts",
];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export function assertMsObservedExecution(proof) {
  assert.equal(proof.observedExecution?.kind,'actual_local_module_loads','missing observed execution inventory');
  assert.ok(Array.isArray(proof.observedExecution.modules),'missing observed modules');
  assert.deepEqual(proof.observedExecution.modules.map(entry=>entry.file).sort(),[...MS_PROOF_OBSERVED_INPUTS].sort(),'missing or unexecuted observed module');
  for(const entry of proof.observedExecution.modules){
    assert.deepEqual(Object.keys(entry).sort(),['file','sha256'],'unlisted observed module attributes');
    assert.match(entry.sha256,/^[a-f0-9]{64}$/,'invalid observed module hash');
    assert.equal(proof.inputs[entry.file],entry.sha256,'observed module hash mismatch');
  }
}
export function loadMsPaidPacketProof({readBytes=file=>fs.readFileSync(file), stableStringify, approval}) {
  const bytes=readBytes(MS_PAID_PACKET_PROOF); const proof=JSON.parse(bytes);
  assert.equal(proof.schemaVersion,'rcap-ms-paid-packet-proof/v4');
  assert.deepEqual(proof.outputContinuity,assertQuestionContractOutputInputs(readBytes));
  assert.deepEqual(proof.questionContractSourceSuccessor, approval.questionContractSourceSuccessor);
  assert.equal(proof.currentProtectedJourneyEstablished, false);
  assert.equal(proof.productionAuthorized, false);
  assert.equal(proof.generatedBy,'scripts/verify-ms-paid-packet-proof.mjs');
  assert.equal(proof.routeId,approval.routeId); assert.equal(proof.trackId,approval.trackId); assert.equal(proof.packetFamilyId,approval.packetFamilyId);
  assert.equal(proof.ownerDecision.decisionSha256,approval.decisionSha256);
  assert.equal(proof.ownerDecision.packetContentsChanged,true,'the live proof must measure the changed packet set');
  // The assembly that produced the bytes is part of what the proof binds. A
  // proof that named another guide, or another assembler, would be measuring a
  // different packet than the one the owner approved.
  const assembly=proof.assemblyIdentity;
  assert.equal(assembly.assemblyKind,approval.assemblyKind); assert.equal(assembly.assemblyVersion,approval.assemblyVersion);
  assert.equal(assembly.supplementalGuideSha256,approval.supplementalGuideSha256);
  assert.equal(assembly.supplementalGuideContentSha256,approval.supplementalGuideContentSha256);
  assert.equal(assembly.assembledThrough,'src/lib/rcap/render/participant-packet-assembly.ts');
  // The executed current reproduction advances technical input freshness only.
  // All three immutable historical generations, output and approval semantics stay.
  const predecessorBytes=readBytes(MS_PAID_PACKET_PROOF_PREDECESSOR);
  assert.equal(hash(predecessorBytes),'887235f1a16fd593646421a1cf35a040effe3bd976fab2d4d90491a86dbfe5d6','October 11 historical proof changed');
  const predecessor=JSON.parse(predecessorBytes);
  assert.equal(predecessor.schemaVersion,'rcap-ms-paid-packet-proof/v3');
  assert.deepEqual(proof.supersededProof,{path:MS_PAID_PACKET_PROOF_PREDECESSOR,sha256:hash(predecessorBytes),artifactBytesStillReproduce:true,resolvedBy:'exact_current_output_continuity'});
  assert.equal(predecessor.supersededProof.path,MS_PAID_PACKET_PROOF_20260920);
  assert.equal(predecessor.supersededProof.artifactBytesStillReproduce,true);
  assert.equal(predecessor.supersededProof.resolvedBy,'exact_question_contract_source_successor');
  const septemberBytes=readBytes(MS_PAID_PACKET_PROOF_20260920);
  assert.equal(hash(septemberBytes),'fb27167b98f3d024b76daa4a9fea88a776177a26c949bb6728c3efc2667adef9','September 20 historical proof changed');
  assert.equal(predecessor.supersededProof.sha256,hash(septemberBytes));
  const september=JSON.parse(septemberBytes);
  assert.equal(september.schemaVersion,'rcap-ms-paid-packet-proof/v2');
  assert.equal(september.supersededProof.path,MS_PAID_PACKET_PROOF_RETIRED);
  // The September proof names v2. v4 supersedes v3, so the v2 digest is read from the
  // hash-pinned October 11 proof that measured v3, and v4 is bound to that v3 explicitly.
  assert.equal(september.supersededProof.decisionSha256,predecessor.ownerDecision.supersededDecisionSha256);
  assert.equal(approval.supersededDecisionSha256,predecessor.ownerDecision.decisionSha256,'the current decision must supersede the decision the October 11 proof measured');
  assert.equal(september.supersededProof.artifactBytesStillReproduce,false);
  assert.equal(hash(readBytes(MS_PAID_PACKET_PROOF_RETIRED)),'1a3454cb515003281c33f196b16c788fd3b9c5e18692829169794a5b686f183c','September 14 historical proof changed');
  assert.deepEqual(Object.keys(proof).sort(),[...Object.keys(predecessor),'outputContinuity','observedExecution'].sort(),'unlisted proof fields');
  for(const key of Object.keys(predecessor).filter(key=>!['schemaVersion','sourceSha','inputs','supersededProof','ownerDecision','results','sourceAuthority','unapprovedDeterminismControls'].includes(key)))
    assert.deepEqual(proof[key],predecessor[key],`historical packet meaning changed: ${key}`);
  // A successor decision may move only artifact identity; every other result fact keeps its proven value.
  assert.deepEqual(proof.ownerDecision,approval,'the proof must measure the current decision');
  // Only the decision and its relocated review evidence may move in the source authority.
  const movedAuthority=new Map([[predecessor.ownerDecision.decisionPath,{path:approval.decisionPath,sha256:approval.decisionSha256}],
    [predecessor.ownerDecision.reviewEvidencePath,{path:approval.reviewEvidencePath,sha256:approval.reviewEvidenceSha256}]]);
  const expectedSource=structuredClone(predecessor.sourceAuthority);
  expectedSource.boundInputs.authorityInputs=expectedSource.boundInputs.authorityInputs.map(row=>movedAuthority.has(row.path)?{...row,...movedAuthority.get(row.path)}:row);
  expectedSource.boundInputsSha256=hash(stableStringify(expectedSource.boundInputs));
  assert.deepEqual(proof.sourceAuthority,expectedSource,'historical packet meaning changed: sourceAuthority');
  // Every result binds the codified-authority hash, which the decision move changes; a moved artifact also
  // changes its own identity. Nothing else may move, and each hash is recomputed as the contract does below.
  const authorityKey='codified-authority:'+approval.packetFamilyId;
  const expectedResults=structuredClone(predecessor.results); const movedIds=new Set();
  for(const row of expectedResults){
    assert.equal(row.verificationBoundInputs.officialSourceSha256ById[authorityKey],predecessor.sourceAuthority.boundInputsSha256,`${row.id}: authority link`);
    row.verificationBoundInputs.officialSourceSha256ById[authorityKey]=expectedSource.boundInputsSha256;
    const entry=approval.approvedArtifacts.find(a=>a.id===row.id);
    if(entry&&entry.sha256!==row.artifactSha256){
      movedIds.add(row.id);
      row.artifactPath=entry.path; row.artifactSha256=entry.sha256; row.verificationBoundInputs.artifactInputSha256=entry.sha256;
    }
    row.verificationBoundInputsSha256=hash(`rcap-final-verification-bound-inputs/v1\n${stableStringify(row.verificationBoundInputs)}`);
  }
  assert.deepEqual(proof.results,expectedResults,'historical packet meaning changed: results');
  // The unapproved boundary render of a moved artifact moves with it (same renderer change); the generator checks its determinism.
  const expectedUnapproved=structuredClone(predecessor.unapprovedDeterminismControls);
  for(const row of expectedUnapproved)if(movedIds.has(row.id))row.unapprovedRenderSha256=proof.unapprovedDeterminismControls.find(r=>r.id===row.id)?.unapprovedRenderSha256;
  assert.deepEqual(proof.unapprovedDeterminismControls,expectedUnapproved,'historical packet meaning changed: unapprovedDeterminismControls');
  assert.equal(proof.chargedConductSafetyControls.length,4);
  assert.deepEqual(proof.chargedConductSafetyControls.map(c=>c.scenario).sort(),['absent','legacy_only','unknown','yes']);
  assert.ok(proof.chargedConductSafetyControls.every(c=>c.refused===true
    && c.layer==='mississippiNonConvictionPacketSafety'
    && c.reason==='route_changing_answer:ms_charged_trafficking_distribution_manufacture'));
  assert.deepEqual(proof.routeSafetySyntheticAdditions,{prior_relief:'No',sentence_completion_date:'Yes',financial_obligations:'Yes'});
  assert.equal(proof.syntheticScenario.factId,'ms_charged_trafficking_distribution_manufacture');
  assert.equal(proof.syntheticScenario.value,'No');
  assert.equal(proof.syntheticScenario.inferredFromLegacyAnswer,false);
  for(const required of [proof.outputContinuity.path,proof.outputContinuity.continuity.path,proof.outputContinuity.previousContinuity.path,proof.outputContinuity.previousOutput.path,proof.outputContinuity.earlierContinuity.path,proof.outputContinuity.earlierOutput.path,proof.outputContinuity.sameDatePredecessorContinuity.path,proof.outputContinuity.sameDatePredecessorOutput.path,proof.outputContinuity.latestPredecessorContinuity.path,proof.outputContinuity.latestPredecessorOutput.path,proof.outputContinuity.immediatePredecessorContinuity.path,proof.outputContinuity.immediatePredecessorOutput.path,proof.outputContinuity.priorRevisionContinuity.path,proof.outputContinuity.priorRevisionOutput.path,proof.outputContinuity.acceptedRevisionContinuity.path,proof.outputContinuity.acceptedRevisionOutput.path,proof.outputContinuity.executedRevisionContinuity.path,proof.outputContinuity.executedRevisionOutput.path,proof.outputContinuity.renderedRevisionContinuity.path,proof.outputContinuity.renderedRevisionOutput.path,proof.outputContinuity.observedRevisionContinuity.path,proof.outputContinuity.observedRevisionOutput.path,proof.outputContinuity.measuredRevisionContinuity.path,proof.outputContinuity.measuredRevisionOutput.path,proof.outputContinuity.boundRevisionContinuity.path,proof.outputContinuity.boundRevisionOutput.path,proof.outputContinuity.validatedRevisionContinuity.path,proof.outputContinuity.validatedRevisionOutput.path,proof.outputContinuity.recordedRevisionContinuity.path,proof.outputContinuity.recordedRevisionOutput.path,proof.outputContinuity.capturedRevisionContinuity.path,proof.outputContinuity.capturedRevisionOutput.path,proof.outputContinuity.retainedRevisionContinuity.path,proof.outputContinuity.retainedRevisionOutput.path,proof.outputContinuity.continuedRevisionContinuity.path,proof.outputContinuity.continuedRevisionOutput.path,proof.outputContinuity.reviewedRevisionContinuity.path,proof.outputContinuity.reviewedRevisionOutput.path,proof.outputContinuity.integratedRevisionContinuity.path,proof.outputContinuity.integratedRevisionOutput.path,proof.outputContinuity.revalidatedRevisionContinuity.path,proof.outputContinuity.revalidatedRevisionOutput.path,proof.outputContinuity.sourcePredecessorContinuity.path,proof.outputContinuity.sourcePredecessorOutput.path,proof.outputContinuity.artifactPredecessorContinuity.path,proof.outputContinuity.artifactPredecessorOutput.path,MS_PAID_PACKET_PROOF_20260920,MS_PAID_PACKET_PROOF_RETIRED,QUESTION_CONTRACT_SUCCESSOR_PATH, QUESTION_CONTRACT_OUTPUT_PATH, MS_QUESTION_CONTRACT_PREDECESSOR_PATH, MS_PAID_PACKET_PROOF_PREDECESSOR, proof.generatedBy,approval.decisionPath,approval.supersededDecisionPath,approval.specificationPath,approval.supplementalGuidePath,approval.reviewEvidencePath,approval.historicalApprovalPath,'src/lib/rcap/render/participant-packet-assembly.ts','src/lib/rcap/fulfillment/final-verification-contract.ts'])assert.ok(proof.inputs[required],`missing proof input ${required}`);
  const outputBytes=readBytes(proof.outputContinuity.path);
  assert.equal(hash(outputBytes),proof.outputContinuity.sha256,'current output inventory proof changed');
  const currentOutput=JSON.parse(outputBytes);
  assertMsObservedExecution(proof);
  // A moved artifact retires its prior review evidence and raster pages from the inventory and adds the
  // current decision, evidence, artifact and pages; the new pages must be exactly the reviewed page digests.
  const priorEvidence=JSON.parse(readBytes(predecessor.ownerDecision.reviewEvidencePath));
  const currentEvidence=JSON.parse(readBytes(approval.reviewEvidencePath));
  const retiredInputs=new Set(); const addedInputs=new Set([approval.decisionPath,approval.reviewEvidencePath]);
  if(predecessor.ownerDecision.reviewEvidencePath!==approval.reviewEvidencePath)retiredInputs.add(predecessor.ownerDecision.reviewEvidencePath);
  for(const id of movedIds){
    const before=priorEvidence.rasterReview.artifacts.find(a=>a.id===id), after=currentEvidence.rasterReview.artifacts.find(a=>a.id===id);
    assert.notEqual(before.rasterDirectory,after.rasterDirectory,`${id}: a moved artifact needs its own reviewed rasters`);
    for(const file of Object.keys(predecessor.inputs))if(file.startsWith(before.rasterDirectory+'/'))retiredInputs.add(file);
    const pages=Object.keys(proof.inputs).filter(file=>file.startsWith(after.rasterDirectory+'/'));
    assert.deepEqual(pages.map(file=>proof.inputs[file]).sort(),[...after.pageSha256].sort(),`incomplete or undeclared MS proof input inventory: ${id} reviewed raster pages`);
    for(const file of pages)addedInputs.add(file);
    addedInputs.add(approval.approvedArtifacts.find(a=>a.id===id).path);
  }
  const requiredInventory=[...new Set([...Object.keys(predecessor.inputs).filter(file=>!retiredInputs.has(file)),...addedInputs,...currentOutput.sources.map(input=>input.file),
    proof.outputContinuity.path,proof.outputContinuity.continuity.path,proof.outputContinuity.previousContinuity.path,proof.outputContinuity.previousOutput.path,proof.outputContinuity.earlierContinuity.path,proof.outputContinuity.earlierOutput.path,proof.outputContinuity.sameDatePredecessorContinuity.path,proof.outputContinuity.sameDatePredecessorOutput.path,proof.outputContinuity.latestPredecessorContinuity.path,proof.outputContinuity.latestPredecessorOutput.path,proof.outputContinuity.immediatePredecessorContinuity.path,proof.outputContinuity.immediatePredecessorOutput.path,proof.outputContinuity.priorRevisionContinuity.path,proof.outputContinuity.priorRevisionOutput.path,proof.outputContinuity.acceptedRevisionContinuity.path,proof.outputContinuity.acceptedRevisionOutput.path,proof.outputContinuity.executedRevisionContinuity.path,proof.outputContinuity.executedRevisionOutput.path,proof.outputContinuity.renderedRevisionContinuity.path,proof.outputContinuity.renderedRevisionOutput.path,proof.outputContinuity.observedRevisionContinuity.path,proof.outputContinuity.observedRevisionOutput.path,proof.outputContinuity.measuredRevisionContinuity.path,proof.outputContinuity.measuredRevisionOutput.path,proof.outputContinuity.boundRevisionContinuity.path,proof.outputContinuity.boundRevisionOutput.path,proof.outputContinuity.validatedRevisionContinuity.path,proof.outputContinuity.validatedRevisionOutput.path,proof.outputContinuity.recordedRevisionContinuity.path,proof.outputContinuity.recordedRevisionOutput.path,proof.outputContinuity.capturedRevisionContinuity.path,proof.outputContinuity.capturedRevisionOutput.path,proof.outputContinuity.retainedRevisionContinuity.path,proof.outputContinuity.retainedRevisionOutput.path,proof.outputContinuity.continuedRevisionContinuity.path,proof.outputContinuity.continuedRevisionOutput.path,proof.outputContinuity.reviewedRevisionContinuity.path,proof.outputContinuity.reviewedRevisionOutput.path,proof.outputContinuity.integratedRevisionContinuity.path,proof.outputContinuity.integratedRevisionOutput.path,proof.outputContinuity.revalidatedRevisionContinuity.path,proof.outputContinuity.revalidatedRevisionOutput.path,proof.outputContinuity.sourcePredecessorContinuity.path,proof.outputContinuity.sourcePredecessorOutput.path,proof.outputContinuity.artifactPredecessorContinuity.path,proof.outputContinuity.artifactPredecessorOutput.path,MS_PAID_PACKET_PROOF_PREDECESSOR,...MS_PROOF_EXECUTION_INPUTS,...MS_PROOF_OBSERVED_INPUTS])].sort();
  assert.deepEqual(Object.keys(proof.inputs).sort(),requiredInventory,'incomplete or undeclared MS proof input inventory');
  for(const [file,expected] of Object.entries(proof.inputs))assert.equal(hash(readBytes(file)),expected,`stale MS packet proof: ${file}`);
  const source=proof.sourceAuthority;
  assert.deepEqual(source.boundInputs.questionContractSourceSuccessor, approval.questionContractSourceSuccessor);
  assert.equal(source.boundInputs.routeId,approval.routeId); assert.equal(source.boundInputs.familyId,approval.packetFamilyId);
  assert.equal(source.boundInputs.supplementalGuideSupersession.guideContentSha256,approval.supplementalGuideContentSha256);
  assert.equal(hash(stableStringify(source.boundInputs)),source.boundInputsSha256);
  assert.equal(proof.results.length,MS_APPROVED_ARTIFACT_IDS.length);
  assert.deepEqual(proof.results.map(r=>r.id),MS_APPROVED_ARTIFACT_IDS);
  for(const result of proof.results){
    const entry=approval.approvedArtifacts.find(a=>a.id===result.id);
    assert.ok(entry,`the approval names no ${result.id} artifact`);
    for(const key of ['approved','participantDelivery','currentAssemblyByteIdentical','postgresJsonbByteIdentical','postgresVerificationHashIdentical','rasterPagesMatchReview'])assert.equal(result[key],true,`${result.id}: ${key}`);
    assert.equal(result.negativeBindingControls,9);
    assert.equal(result.artifactPath,entry.path); assert.equal(result.artifactSha256,entry.sha256);
    assert.equal(result.pageCount,entry.pageCount); assert.equal(result.variant,entry.variant);
    assert.equal(result.locale,entry.locale); assert.equal(result.guideAssembled,entry.guideAssembled);
    assert.equal(hash(readBytes(result.artifactPath)),result.artifactSha256);
    const inputs=result.verificationBoundInputs;
    assert.equal(inputs.routeId,approval.routeId); assert.equal(inputs.packetFamilyId,approval.packetFamilyId);
    assert.equal(inputs.artifactInputSha256,result.artifactSha256); assert.equal(inputs.specificationSha256,approval.specificationSha256);
    assert.equal(hash(`rcap-final-verification-bound-inputs/v1\n${stableStringify(inputs)}`),result.verificationBoundInputsSha256);
  }
  // Both delivery languages, and a court-facing subset that carries no guide.
  assert.equal(new Set(proof.results.map(r=>r.locale)).size,2);
  assert.equal(proof.results.filter(r=>r.variant==='court_only'&&r.guideAssembled===false).length,1);
  // A determinism control is not an approval and may never present itself as one.
  assert.ok(Array.isArray(proof.unapprovedDeterminismControls));
  assert.deepEqual(proof.unapprovedDeterminismControls.map(c=>c.id),MS_APPROVED_ARTIFACT_IDS);
  for(const control of proof.unapprovedDeterminismControls){
    const output=proof.results.find(result=>result.id===control.id);
    assert.equal(control.variant,output.variant);assert.equal(control.locale,output.locale);
    assert.equal(control.fixturePath,'data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-b.fixture.json');
    assert.ok(proof.inputs[control.fixturePath],'boundary fixture must be source-bound');
    assert.equal(control.postgresJsonbByteIdentical,true);
    assert.match(control.unapprovedRenderSha256,/^[0-9a-f]{64}$/);
    for(const key of ['approved','reviewed','participantDeliverable'])assert.equal(control[key],false,`an unapproved control claims ${key}`);
    assert.equal(control.deterministic,true);
  }
  return {proof,sha256:hash(bytes)};
}
