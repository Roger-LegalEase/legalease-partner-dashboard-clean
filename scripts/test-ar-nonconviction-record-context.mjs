import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'));
const H=await import('../src/lib/expungement-ai/ar-nonconviction-record-context.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const profile=getProfileByJurisdiction('AR');
const base='data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/';
const source={memo:read('data/record-clearing/legal-design-intake/AR.memo.json'),fieldMap:read(base+'production-field-map.json'),sourceReceipt:read(base+'source-receipt.json')};
const options=['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure'];
const question={id:'record_type',stage:'packet_information',type:'single_choice',required:true,prompt:'What type of record is this?',options,translations:{es:{prompt:'¿Qué tipo de registro es este?'}}};
let checks=0;const check=(name,fn)=>{try{fn();checks++;}catch(e){e.message=name+': '+e.message;throw e;}};
for(const route of [H.AR_NONCONVICTION_CONTEXT_ROUTE]){
 const spec=packetSpecificationFor('AR:'+route);
 check('exact situation-a source guard '+route,()=>{assert.equal(spec,undefined);assert(H.arNonconvictionRecordIsContext(profile,route,spec,source));});
 for(const key of ['memo','fieldMap','sourceReceipt'])for(const value of [null,{},[]])check('source drift '+key,()=>assert(!H.arNonconvictionRecordIsContext(profile,route,spec,{...source,[key]:value})));
 for(const key of ['memo','fieldMap','sourceReceipt'])check('individual source drift '+key,()=>{const changed=structuredClone(source);changed[key].unreviewedChange=true;assert(!H.arNonconvictionRecordIsContext(profile,route,spec,changed));});
 // The reviewed predecessor is exactly the current receipt with its one
 // manifest identity refresh undone; any other refresh content is refused.
 const legacy=structuredClone(source.sourceReceipt),pin=legacy.committedRecords[0];
 check('receipt successor is one exact manifest identity refresh',()=>{assert.equal(pin.recordId,'packet-set-manifest:ar-nonconviction-seal-set');assert.equal(pin.identityRefresh.anchorsIdentical,pin.identityRefresh.anchorsCompared);assert(pin.identityRefresh.anchorDetail.includes('packetSet:ar-nonconviction-seal-set: identical'));});
 pin.sha256=pin.identityRefresh.was.sha256;pin.byteLength=pin.identityRefresh.was.byteLength;pin.identityRefresh=pin.identityRefresh.previousIdentityRefresh;
 check('reviewed predecessor receipt remains accepted',()=>assert(H.arNonconvictionRecordIsContext(profile,route,spec,{...source,sourceReceipt:legacy})));
 for(const mutate of [r=>{r.committedRecords[0].identityRefresh.anchorsIdentical=4;},r=>{r.committedRecords[0].identityRefresh.was.sha256='changed';},r=>{r.committedRecords[0].sha256='changed';},r=>{delete r.committedRecords[0].identityRefresh;},r=>{r.committedRecords[0].identityRefresh.anchorDetail.push('packetSet:other: moved');}])check('refresh successor drift refused',()=>{const changed=structuredClone(source);mutate(changed.sourceReceipt);assert(!H.arNonconvictionRecordIsContext(profile,route,spec,changed));});
 for(const mutate of [p=>p.jurisdiction.code='AK',p=>p.profileVersion='changed',p=>p.source.sourceCorpusSha256='changed',p=>p.pathways.find(x=>x.id===route).triggerFields.push('record_type')])check('profile drift',()=>{const p=structuredClone(profile);mutate(p);assert(!H.arNonconvictionRecordIsContext(p,route,spec));});
 check('new registered specification refuses inherited exception',()=>assert(!H.arNonconvictionRecordIsContext(profile,route,{routeKey:'AR:'+route})));
 check('optional EN ES descriptor preserves canonical options and input',()=>{const before=structuredClone(question),q=H.arNonconvictionRecordContextQuestion(question,profile,route,spec);assert.notEqual(q,question);assert.deepEqual(question,before);assert.equal(q.required,false);assert.deepEqual(q.options,options);assert.equal(q.type,'single_choice');assert.equal(q.stage,'packet_information');assert(q.prompt.includes('optional history'));assert(q.translations.es.prompt.includes('historial opcional'));assert(q.helperText.includes('does not establish'));assert(q.translations.es.helperText.includes('No establece'));});
 for(const mutate of [q=>q.id='case_outcome',q=>q.stage='screening',q=>q.type='multi_choice',q=>q.prompt='New meaning',q=>q.options.reverse()])check('descriptor drift stays identical',()=>{const q=structuredClone(question);mutate(q);assert.strictEqual(H.arNonconvictionRecordContextQuestion(q,profile,route,spec),q);});
}
for(const route of [null,'',...profile.pathways.map(p=>p.id).filter(id=>![H.AR_NONCONVICTION_CONTEXT_ROUTE].includes(id))])check('sibling and absent route unchanged',()=>{assert(!H.arNonconvictionRecordIsContext(profile,route,undefined));assert.strictEqual(H.arNonconvictionRecordContextQuestion(question,profile,route,undefined),question);});
check('retained exact canonical map and builder do not consume taxonomy',()=>{assert(!JSON.stringify(source.fieldMap).includes('record_type'));assert(!fs.readFileSync('scripts/build-census-v1-ar-nonconviction-seal-set.mjs','utf8').includes('record_type'));});
const track=source.memo.tracks.find(t=>t.trackId==='ar-nonconviction-seal');
check('exact adopted decision preserves specific questions and limitations',()=>{assert.equal(track.legalDesignDecision.status,'legal_design_approved_with_limitations');assert.deepEqual(track.participantInputs.map(q=>q.key),['disposition','arrestDate','filingStatus','county','refiled']);assert(track.legalDesignDecision.limitations.some(x=>x.statement.includes('Resolve venue')));assert(!track.participantInputs.some(q=>q.key==='record_type'));});
check('named other AR approval cannot be borrowed',()=>{const wiring=read(base+'product-wiring.json');assert.equal(wiring.binding.paymentEligible,false);assert.equal(wiring.authorityCreated,'none');assert.equal(wiring.binding.lastIndependentVerification.lane,'vf31');assert.equal(wiring.binding.acceptanceReceipt.verdict,'RASTER_PASS');assert(wiring.binding.sourceVersion.some(s=>s.sha256==='09f323174881934239734e3a418eb4fec0b4bd0f7e199e8698c3af95a659fa61'));});
console.log(JSON.stringify({status:'PASS_EXACT_AR_SOURCE_HISTORY_HELPER',checks,noDatabase:true,noRender:true,qualifiedSpanishReview:'pending',newFamilyApproval:false}));
