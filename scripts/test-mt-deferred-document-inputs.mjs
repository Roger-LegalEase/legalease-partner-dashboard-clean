// Original MT composed-document contract: pure protected fact mapping only.
// No DB, renderer rebuild, signing, generation authority or owner-delivery claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { protectedPacketDraftSeedFromAuthoritative } = await import('../src/lib/expungement-ai/packet-information.ts');
const { montanaDeferredDocumentInputs: map, MT_DEFERRED_DOCUMENT_COMPONENTS: components, MT_DEFERRED_DOJ_SOURCE_SHA256: sourceSha } = await import('../src/lib/expungement-ai/mt-deferred-document-inputs.ts');
const { FIXTURES, validateFixture, REQUIRED_INPUTS, SOURCE_SHA, OUTPUT, COMPONENTS } = await import('./build-census-v1-mt_deferred_dismissal-set.mjs');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const profile = getProfileByJurisdiction('MT');
const track = read('data/record-clearing/legal-design-intake/MT.memo.json').tracks.find(t => t.trackId === 'mt_deferred_dismissal');
const packetSet = read('data/record-clearing/legal-design-packet-set-manifests.json').packetSets.find(p => p.packetSetId === 'mt_deferred_dismissal-set');
assert.deepEqual(components, COMPONENTS); assert.equal(sourceSha, SOURCE_SHA);
assert.deepEqual(track.participantInputs.map(q => q.key), REQUIRED_INPUTS);
assert.equal(track.selfHelpStopConditions.length, 7);
assert.equal(track.units.length, 2);
assert.equal(track.units[0].outputStrategy, 'custom_pleading');
assert.equal(track.units[1].outputStrategy, 'official_pdf_fill');
assert(track.legalDesignDecision.limitations.some(x => x.statement.includes('DS-100') && x.statement.includes('never generated')));
const group = read('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json').additionalSubgroups.find(g => g.id === 'MT-deferred-order-financial-witness-20261014');
const sourceFacts = { mt_deferred_order_type: 'deferred', mt_deferred_offense_grade: 'felony', mt_deferred_term_status: 'expired', mt_deferred_conditions_status: 'yes', mt_deferred_financial_order_status: 'paid', mt_deferred_revocation_petition: 'no', mt_deferred_dismissal_order: 'no' };
const screening = { ...group.freshBaselineReproduction.base, ...sourceFacts, financial_obligations: 'No' };
const authoritative = evaluateAuthoritativeScreeningResult({ jurisdiction: 'MT', profileVersion: profile.profileVersion, matterId: 'synthetic-mt-document-contract', answers: screening });
const seed = protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: screening, dependencies: {}, capturedAt: '2026-10-14T00:00:00Z' });
assert(seed); assert.equal(seed.snapshot.paymentAllowed, false);
const current = { profile, profileAuthorityFingerprint: seed.snapshot.profileAuthorityFingerprint, contract: { track, packetSet, dojSourceSha256: sourceSha } };
const identityFields = ['fullName', 'dateOfBirth', 'mailingAddress', 'phone', 'email', 'chargeName', 'arrestDate', 'sentencingCourtLevel', 'courtName', 'sentencingCounty', 'caseNumber', 'pleaOrVerdict', 'sentencingDate', 'prosecutingOffice', 'prosecutorAddress', 'prosecutorEmail'];
const flags = { citizenshipConfirmed: true, denialQuestion: false, clerkContacted: true, revocationConfirmedByClerk: true, recordConfirmed: true, earlyTermination: false, localFormOverride: false, disputedCompletion: false };
// Existing explicitly synthetic fixture facts are copied only into protected
// answer maps. No expected boolean or required input is spread into the result.
const snapshotFor = (fixture = FIXTURES[0]) => ({ ...structuredClone(seed.snapshot), screeningAnswers: { ...screening, mt_deferred_offense_grade: fixture.chargeClass }, prefilledAnswers: {}, packetAnswers: { ...Object.fromEntries(identityFields.map(id => [id, fixture[id]])), ...flags } });
const base = snapshotFor();
let checks = 0;
const check = (name, fn) => { fn(); checks++; };
const closed = mapped => { assert.equal(mapped.paymentAllowed, false); assert.equal(mapped.generationAllowed, false); assert.equal(mapped.verificationAuthority, false); };
for (const fixture of FIXTURES) check(`existing renderer contract ${fixture.fixture}`, () => {
 const snapshot = snapshotFor(fixture), original = structuredClone(snapshot), result = map(snapshot, current);
 assert.equal(result.status, 'mapped_for_review'); assert.equal(result.stage, 'court_motion');
 assert.deepEqual(result.componentIds, [components[0], components[1], components[2], components[4]]);
 assert.deepEqual(validateFixture({ ...fixture, ...result.inputs, syntheticFixture: true }), validateFixture(fixture));
 for (const key of [...REQUIRED_INPUTS, ...identityFields, ...Object.keys(flags).filter(k => k !== 'revocationConfirmedByClerk'), 'chargeClass', 'alreadyDismissed', 'recordConfirmed']) if (!["dateOfBirth", "arrestDate"].includes(key)) assert.deepEqual(result.inputs[key], fixture[key], key);
 assert.deepEqual(snapshot, original); closed(result);
});
for (const financial of ['paid', 'waived_by_order', 'none_ordered']) for (const historical of ['Yes', 'No', 'I am not sure', undefined]) check(`explicit financial order ${financial}/${historical}`, () => {
 const s = snapshotFor(); s.screeningAnswers.mt_deferred_financial_order_status = financial;
 if (historical === undefined) delete s.screeningAnswers.financial_obligations; else s.screeningAnswers.financial_obligations = historical;
 const r = map(s, current); assert.equal(r.status, 'mapped_for_review'); assert.equal(r.inputs.conditionsCompleted, true);
 assert.deepEqual(r.inputSources.conditionsCompleted, ['mt_deferred_conditions_status', 'mt_deferred_financial_order_status']); closed(r);
});
for (const [id, value, reason] of [
 ['mt_deferred_revocation_petition', 'yes', 'filed_revocation_requires_document_review'],
 ['mt_deferred_order_type', 'suspended', 'not_a_deferred_imposition'],
 ['earlyTermination', true, 'seeking_early_termination'],
 ['disputedCompletion', true, 'disputed_completion'],
 ['localFormOverride', true, 'court_specific_procedure_or_form'],
 ['citizenshipConfirmed', false, 'noncitizen_requires_qualified_advice'],
 ['denialQuestion', true, 'denial_of_charge_question_requires_qualified_advice'],
 ['mt_deferred_financial_order_status', 'balance_remaining', 'current_conditions_or_financial_orders_unresolved'],
 ['mt_deferred_term_status', 'still_running', 'deferral_period_not_terminated'],
]) check(`source stop ${id}`, () => { const s = snapshotFor(); (id.startsWith('mt_') ? s.screeningAnswers : s.packetAnswers)[id] = value; const r = map(s, current); assert.equal(r.status, 'source_review'); assert(r.reviewReasons.includes(reason)); closed(r); });
check('actual prior termination order is distinct from expiration or a new request', () => {
 const s=snapshotFor();s.screeningAnswers.mt_deferred_term_status='terminated_by_order';assert.equal(map(s,current).status,'needs_facts');assert(map(s,current).missingFactIds.includes('terminationOrderDate'));
 for(const invalid of [undefined,'',{value:'',unknown:true},'2025-02-30']){s.packetAnswers.terminationOrderDate=invalid;assert.equal(map(s,current).status,'needs_facts');}
 for(const date of ['2020-01-01','2030-01-01']){s.packetAnswers.terminationOrderDate=date;assert.equal(map(s,current).status,'source_review');}
 s.packetAnswers.terminationOrderDate={value:'2024-05-06',unknown:false};const original=structuredClone(s),r=map(s,current);assert.equal(r.status,'mapped_for_review');assert.equal(r.inputs.deferralPeriodExpired,false);assert.equal(r.inputs.deferralTerminatedByOrder,true);assert.equal(r.inputs.terminationOrderDate,'05/06/2024');assert.deepEqual(s,original);closed(r);
 for(const capturedAt of ['', 'not-a-date','2026-02-30T00:00:00Z']){const invalid={...s,capturedAt};assert.equal(map(invalid,current).status,'not_applicable');}
 s.packetAnswers.earlyTermination=true;assert(map(s,current).reviewReasons.includes('seeking_early_termination'));
});
check('misdemeanor status guidance is not clerk-confirmed document allegation', () => {
 const s = snapshotFor(FIXTURES[1]); s.screeningAnswers.mt_deferred_revocation_petition = 'yes';
 assert.equal(map(s, current).status, 'source_review'); s.screeningAnswers.mt_deferred_revocation_petition = 'no'; delete s.packetAnswers.revocationConfirmedByClerk;
 const r = map(s, current); assert.equal(r.status, 'needs_facts'); assert(!Object.hasOwn(r.inputs, 'revocationPetitionFiled'));
});
for (const id of [...identityFields.filter(id => !["dateOfBirth", "arrestDate"].includes(id)), ...Object.keys(flags), ...Object.keys(sourceFacts)]) check(`no default ${id}`, () => {
 for (const missing of [undefined, '', 'unknown', [], {}, { value: 'invented', unknown: true }]) {
  const s = snapshotFor(), store = id.startsWith('mt_') ? s.screeningAnswers : s.packetAnswers;
  if (missing === undefined) delete store[id]; else store[id] = missing;
  assert.notEqual(map(s, current).status, 'mapped_for_review', id);
 }
});
check('known wrappers and calendar dates', () => {
 const s = snapshotFor(); s.screeningAnswers.mt_deferred_dismissal_order='yes'; s.packetAnswers.dateOfBirth = { value: '1991-04-17', unknown: false };
 assert.equal(map(s, current).inputs.dateOfBirth, '04/17/1991');
 for (const value of ['1991-02-29', '02/30/2000', '2020-13-01', '04/17/91', 'tomorrow']) { s.packetAnswers.dateOfBirth = value; assert.equal(map(s, current).status, 'needs_facts'); }
 s.packetAnswers.dateOfBirth = { value: '1991-04-17', unknown: false, confirmed: true }; assert.equal(map(s, current).status, 'needs_facts');
});
check('chronology applies only to actually consumed stage dates', () => {
 const s=snapshotFor(); s.packetAnswers.dateOfBirth='2030-01-01';s.packetAnswers.arrestDate='2022-01-01';
 assert.equal(map(s,current).status,'mapped_for_review');assert(!Object.hasOwn(map(s,current).inputs,'dateOfBirth'));assert(!Object.hasOwn(map(s,current).inputs,'arrestDate'));
 s.screeningAnswers.mt_deferred_dismissal_order='yes';const original=structuredClone(s);assert.equal(map(s,current).status,'source_review');assert.deepEqual(s,original);
});
check('court never gates on DOJ-only dates; DOJ collects both later', () => {
 const s=snapshotFor();delete s.packetAnswers.dateOfBirth;delete s.packetAnswers.arrestDate;assert.equal(map(s,current).status,'mapped_for_review');
 s.screeningAnswers.mt_deferred_dismissal_order='yes';const m=map(s,current);assert.equal(m.status,'needs_facts');assert(m.missingFactIds.includes('dateOfBirth'));assert(m.missingFactIds.includes('arrestDate'));
});
check('conflicting maps retain raw source history and refuse inference', () => {
 const s = snapshotFor(); s.prefilledAnswers.fullName = 'Different Name'; const old = structuredClone(s);
 assert(map(s, current).reviewReasons.includes('conflicting_protected_fact:fullName')); assert.deepEqual(s, old);
});
check('original charge grade never overrides explicit deferred order', () => {
 const s = snapshotFor(); s.screeningAnswers.offense_level = 'Misdemeanor'; assert.equal(map(s, current).inputs.chargeClass, 'felony');
});
check('DOJ after actual order excludes every court component and allegation', () => {
 const s = snapshotFor(); s.screeningAnswers.mt_deferred_dismissal_order = 'yes';
 // An existing order is a new stage, not an invitation to re-adjudicate the old motion.
 for (const id of Object.keys(sourceFacts).filter(id => !['mt_deferred_order_type', 'mt_deferred_dismissal_order'].includes(id))) delete s.screeningAnswers[id];
 for (const id of identityFields.filter(id => !['fullName', 'dateOfBirth', 'mailingAddress', 'phone', 'email', 'chargeName', 'arrestDate'].includes(id))) delete s.packetAnswers[id];
 for (const id of Object.keys(flags).filter(id => !['citizenshipConfirmed', 'denialQuestion'].includes(id))) delete s.packetAnswers[id];
 const r = map(s, current); assert.equal(r.status, 'mapped_for_review'); assert.equal(r.stage, 'doj_after_order'); assert.deepEqual(r.componentIds, [components[3], components[4]]); assert.equal(r.inputs.deferredImposition, true);
 for (const key of ['deferralPeriodExpired', 'conditionsCompleted', 'revocationPetitionFiled', 'chargeClass', 'caseNumber', 'pleaOrVerdict']) assert(!Object.hasOwn(r.inputs, key), key);
 assert.throws(() => validateFixture({ ...r.inputs, syntheticFixture: true })); closed(r);
});
check('future signatures/service/judicial findings/other DOJ requests never alias', () => {
 const s = snapshotFor(); Object.assign(s.packetAnswers, { signature: 'forged', signedDate: '10/14/2026', judgeName: 'Judge', judgeSignature: 'forged', serviceDate: '10/14/2026', optionalSsn: 'TEST-NOT-SSN', expungement: true, innocence: true, ds100: true, ds200: true });
 for (const dismissed of ['no', 'yes']) { s.screeningAnswers.mt_deferred_dismissal_order = dismissed; const r = map(s, current); for (const key of ['signature','signedDate','judgeName','judgeSignature','serviceDate','optionalSsn','expungement','innocence','ds100','ds200']) assert(!Object.hasOwn(r.inputs, key)); closed(r); }
});
for (const [name, mutate] of [
 ['state', (s,c) => s.jurisdiction = 'MO'], ['route', (s,c) => s.pathwayId = 'misdemeanor-expungement-route'], ['schema', s => s.schemaVersion = 'other'], ['snapshot version', s => s.profileVersion = 'other'], ['snapshot source', s => s.profileSourceFingerprint = 'other'], ['snapshot authority', s => s.profileAuthorityFingerprint = 'other'], ['paid', s => s.paymentAllowed = true], ['track selection', s => s.selectedTrackId = 'mt_deferred_dismissal'],
 ['current authority', (s,c) => c.profileAuthorityFingerprint = 'other'], ['current profile', (s,c) => c.profile.profileVersion = 'other'], ['current source', (s,c) => c.profile.source.sourceCorpusSha256 = 'other'], ['DOJ source', (s,c) => c.contract.dojSourceSha256 = 'other'], ['adopted track', (s,c) => c.contract.track.selfHelpStopConditions.pop()], ['component role', (s,c) => c.contract.packetSet.components[3].role = 'instructions'], ['added component', (s,c) => c.contract.packetSet.components.push({ componentId:'DS100' })], ['component order', (s,c) => c.contract.packetSet.components.reverse()]
]) check(`full contract guard ${name}`, () => { const s = snapshotFor(), c = structuredClone(current); mutate(s,c); const r = map(s,c); assert.equal(r.status, 'not_applicable'); assert.deepEqual(r.inputs, {}); assert.deepEqual(r.componentIds, []); closed(r); });
check('source-bound participant aliases preserve exact values and actor ownership', () => {
 const s=snapshotFor(), aliases={fullName:'participant_full_legal_name',dateOfBirth:'date_of_birth',mailingAddress:'mailing_address',phone:'phone_number',email:'email_address'};
 for(const[id,alias]of Object.entries(aliases)){s.prefilledAnswers[alias]=s.packetAnswers[id];delete s.packetAnswers[id];}
 const original=structuredClone(s),r=map(s,current);assert.equal(r.status,'mapped_for_review');
 for(const[id,alias]of Object.entries(aliases)){if(id==='dateOfBirth'){assert(!Object.hasOwn(r.inputs,id));continue;}assert.equal(r.inputs[id],FIXTURES[0][id]);assert.deepEqual(r.inputSources[id],[alias]);}
 assert.deepEqual(s,original);s.packetAnswers.prosecutorEmail='Different.Prosecutor@example.test';assert.equal(map(s,current).inputs.email,FIXTURES[0].email);
 for(const[id,alias]of Object.entries(aliases)){const c=structuredClone(s);c.packetAnswers[id]=id==='dateOfBirth'?'1992-04-17':'Conflicting supplied fact';if(id==='dateOfBirth')c.screeningAnswers.mt_deferred_dismissal_order='yes';assert(map(c,current).reviewReasons.includes('conflicting_protected_fact:'+id));}
});
const artifacts = { 'fixtures/canonical.pdf':'7352688df07d1181b2f584bb00909f1b785c570e330e855856088946daa098ac', 'fixtures/boundary.pdf':'b2b116487cb07d3ceb3fe44d223faa56732ccd43c0b98c70d309bbfc69ac852f', 'fixtures/verdict-justice.pdf':'158ba02a7934cdf9c9cf74748f108d1d86461ab77e3c59e69472d9c93c0a871b', 'source-derived/doj-unfilled.pdf':'8aa6d7dc6382ba163a8d7bf2d1afc754059c4bd6e3bc951d0a51e2a00920fddc' };
for (const [file, sha] of Object.entries(artifacts)) check(`retained accepted bytes ${file}`, () => assert.equal(hash(fs.readFileSync(`${OUTPUT}/${file}`)), sha));
console.log(JSON.stringify({status:'PASS', scope:'MT protected document fact mapping and existing renderer input contract; no new rendered or authenticated output acceptance', checks, existingArtifactsPreserved:artifacts, sourceSha, stages:['court_motion','doj_after_order'], generationAllowed:false},null,2));
