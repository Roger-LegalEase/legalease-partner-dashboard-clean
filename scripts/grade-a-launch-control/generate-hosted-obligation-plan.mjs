import fs from 'node:fs';
import crypto from 'node:crypto';
import {PARTICIPANT_GATE_CATALOG} from './participant-acceptance-receipts.mjs';
const local = {
 anonymous_boundary:['verify-shared-claim-boundary-app.mjs','security/test-clinic-anonymous-and-tenant-denials.mjs'],
 claim_continuity:['verify-shared-claim-boundary-db.mjs'],exact_redirect:['verify-shared-claim-boundary-app.mjs'],
 idempotency:['verify-shared-claim-boundary-db.mjs'],ownership:['security/test-clinic-participant-ownership-denials.mjs'],
 cross_user_security:['security/test-clinic-participant-ownership-denials.mjs'],cross_tenant_security:['security/test-clinic-anonymous-and-tenant-denials.mjs'],
 staff_consent:['security/test-clinic-participant-ownership-denials.mjs'],participant_authority:['security/test-clinic-participant-ownership-denials.mjs'],
 stale_verification:['verify-participant-screening-verification-ux.mjs'],payment_integrity:['verify-expungement-consumer-payment-http.mjs'],
 sponsorship_integrity:['verify-atomic-sponsored-packet-finalization.mjs'],private_delivery:['verify-participant-data-rights.mjs'],
 clinic_reset:['security/test-clinic-shared-device-reset.mjs'],telemetry:['security/test-clinic-telemetry-redaction.mjs'],
 recovery:['verify-participant-data-rights.mjs'],accessibility:['security/test-clinic-mobile-accessibility.mjs'],
 mobile:['security/test-clinic-mobile-accessibility.mjs'],processing_integrity:['verify-atomic-sponsored-packet-finalization.mjs'],
 auditability:['verify-participant-data-rights.mjs']
};
const scenarios = {
 anonymous_boundary:'Anonymous screening produces no participant matter; authentication and atomic claim are required.',
 claim_continuity:'Screen anonymously, sign in, claim once, and retain the same result and participant ownership.',
 exact_redirect:'Claim redirects to the exact newly owned matter; foreign and external return destinations are denied.',
 idempotency:'Retry claim, checkout and render requests; prove a single owned matter, consumption and packet.',
 ownership:'Inspect owner-scoped matter, uploads and artifacts after an assisted journey.',
 cross_user_security:'User B tries every user A matter/export/download/delete endpoint and gains no access.',
 cross_tenant_security:'Tenant B staff tries tenant A assistance, sessions and reporting with no row or object leakage.',
 staff_consent:'Staff assistance without explicit current consent is denied; permitted assistance grants no ownership.',
 participant_authority:'Staff attribution and sponsorship cannot replace participant claim, attestation or deletion authority.',
 stale_verification:'Changed screening inputs invalidate previous verification and block downstream fulfillment.',
 payment_integrity:'Use Stripe Sandbox; correlate one server-confirmed payment to one exact participant matter.',
 sponsorship_integrity:'Exercise scoped sponsorship and insufficient/exhausted credits without double consumption.',
 private_delivery:'Owner-only packet downloads succeed; anonymous, foreign and deleted-object URLs fail.',
 clinic_reset:'Reset shared device and prove the next participant sees no previous credentials or data.',
 telemetry:'Inspect emitted synthetic journey logs and telemetry for raw sensitive fields and cross-tenant attribution.',
 recovery:'Interrupt claim/render/deletion, retry, and prove durable recovery without duplicate work.',
 accessibility:'Exercise keyboard, focus, labels, errors and automated accessibility on the actual hosted candidate.',
 mobile:'Exercise screening, claim, Briefcase and privacy actions at supported phone viewports.',
 processing_integrity:'Observe immutable worker identity, job ownership, accounting and atomic finalization together.',
 auditability:'Correlate safe event IDs to the exact candidate, worker, synthetic subjects and resulting artifacts.'
};
const workflow='.github/workflows/rcap-hosted-acceptance-staging.yml';
const source=fs.readFileSync(workflow,'utf8');
const gates=PARTICIPANT_GATE_CATALOG.map(g=>{
 const privacy=g.section==='12A';const tests=(privacy?['verify-participant-data-rights.mjs']:local[g.id]).map(p=>'scripts/'+p);
 for(const p of tests)if(!fs.existsSync(p))throw Error('Missing local coverage source '+p);
 return {...g,hostedStatus:'NOT_EXECUTED',localCoverageSources:tests,localCoverageMeaning:'Related local checks; not proof that the entire hosted obligation passed.',
   hostedScenario:privacy?`Run synthetic matter/account deletion and independently verify: ${g.label}.`:scenarios[g.id],
   workflowCoverage:privacy?'CORE_PRIVACY_RUNNER_IMPLEMENTED_ADDITIONAL_GATE_PROOFS_REQUIRED':'PARTIAL_OR_SEPARATE_PHASE_REQUIRES_GATE_LEVEL_EVIDENCE',
   nextAction:privacy?'Execute the pinned synthetic privacy runner after separate write approval; extend its core journey evidence with all 15 storage, processor, session, retention and recovery postconditions, then bind original evidence with independent review.':'Execute the relevant pinned hosted journey and bind original gate evidence with independent review; workflow success alone is insufficient.'};
});
if(gates.length!==35||new Set(gates.map(g=>g.id)).size!==35)throw Error('Incomplete hosted catalog');
const out={schemaVersion:'rcap-hosted-obligation-execution-plan/v1',generatedBy:'scripts/grade-a-launch-control/generate-hosted-obligation-plan.mjs',
 catalogCount:35,hostedAcceptanceGranted:false,productionAuthorityGranted:false,
 workflow:{path:workflow,sha256:crypto.createHash('sha256').update(source).digest('hex'),hostedFullIncludesPrivacyJourneys:false,
   separatePhases:['browser','clinic_preview'],note:'hosted_full does not run these separate phases or a hosted privacy runner; no inference of full contract coverage.'},
 privacyRunner:{path:'scripts/rcap-hosted-participant-privacy.mjs',localIntegrationCommand:'node scripts/verify-participant-data-rights.mjs --privacy-journeys',hostedExecuted:false,complete15GateCoverage:false},
 requiredJourneys:['participant_export','single_matter_deletion','account_deletion'],
 exportRequirements:['authenticated owner only','cross-user and cross-tenant denial','complete participant-owned export without credentials or foreign records','idempotent request and private delivery'],
 prerequisites:['New exact candidate worker publication and image verification','Reviewed candidate/digest/Preview binding','Explicit authorization for hosted writes','Current data-rights migration and privacy configuration readback','Trusted independent reviewer and original receipt custody'],gates};
fs.writeFileSync('data/rcap-grade-a/participant-data-rights/hosted-obligation-execution-plan.json',JSON.stringify(out,null,2)+'\n');
console.log('35 hosted obligations accounted for; no hosted gate accepted.');
