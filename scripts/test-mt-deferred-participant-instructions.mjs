// New Spanish companion draft only: source-aligned text, no render/owner repeat.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {montanaDeferredParticipantInstructions:instructions,MT_DEFERRED_INSTRUCTION_SOURCE:source}=await import('../src/lib/expungement-ai/mt-deferred-participant-instructions.ts');
const {MT_DEFERRED_CURRENT_DOCUMENT_CONTRACT:contract}=await import('../src/lib/expungement-ai/mt-deferred-document-inputs.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {protectedPacketDraftSeedFromAuthoritative:seedFor}=await import('../src/lib/expungement-ai/packet-information.ts');
const {FIXTURES}=await import('./build-census-v1-mt_deferred_dismissal-set.mjs');
const hash=b=>createHash('sha256').update(b).digest('hex'),normal=s=>s.replace(/\s+/g,' ').trim();
const group=JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json')).additionalSubgroups.find(g=>g.id==='MT-deferred-order-financial-witness-20261014');
const profile=getProfileByJurisdiction('MT'),facts={...group.freshBaselineReproduction.base,financial_obligations:'No',mt_deferred_order_type:'deferred',mt_deferred_offense_grade:'felony',mt_deferred_term_status:'expired',mt_deferred_conditions_status:'yes',mt_deferred_financial_order_status:'paid',mt_deferred_revocation_petition:'no',mt_deferred_dismissal_order:'no'};
const seed=seedFor({authoritative:evaluate({jurisdiction:'MT',profileVersion:profile.profileVersion,matterId:'synthetic-instructions',answers:facts}),screeningAnswers:facts,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'});assert(seed);
const base={...seed.snapshot,packetAnswers:{...FIXTURES[0],revocationConfirmedByClerk:true}},current={profile,profileAuthorityFingerprint:seed.snapshot.profileAuthorityFingerprint,contract};
// Reuse the immutable retained source; this import never calls its build runner.
const builder=fs.readFileSync(source.retainedBuilder,'utf8'),start=builder.indexOf(' const instructionParagraphs=[')+' const instructionParagraphs='.length,end=builder.indexOf('\n const stamp=pdf=>');
const retained=Function('stops','return '+builder.slice(start,end).trim().replace(/;$/,''))(contract.track.selfHelpStopConditions);
let checks=0;const summaries=[],reviewDrafts=[];
const variants=[['court-expired-canonical',{}],['court-terminated-felony',{mt_deferred_term_status:'terminated_by_order'}],['doj-after-order-canonical',{mt_deferred_dismissal_order:'yes'}]];
for(const[name,patch]of variants){const snapshot=structuredClone(base);Object.assign(snapshot.screeningAnswers,patch);if(patch.mt_deferred_term_status)snapshot.packetAnswers.terminationOrderDate={value:'2024-05-06',unknown:false};const before=structuredClone(snapshot),result=instructions(snapshot,current);assert(result);assert.deepEqual(snapshot,before);assert.equal(result.languageStatus.es,'draft_pending_qualified_language_review');assert.equal(result.languageStatus.courtDocumentLanguage,'en');assert.equal(result.languageStatus.officialFormLanguage,'en');assert.equal(result.qualifiedSpanishApproval,false);assert.equal(result.admissionGranted,false);assert.equal(result.generationAllowed,false);
 const ids=result.paragraphs.map(p=>p.sourceId);assert.equal(new Set(ids).size,ids.length);
 for(const paragraph of result.paragraphs){assert(paragraph.en&&paragraph.es);assert.notEqual(paragraph.en,paragraph.es);assert(!/SYNTHETIC|REVIEW ARTIFACT LIMIT|BEFORE GENERATION:/.test(paragraph.en));if(paragraph.sourceId.startsWith('retained-mt-instructions:')){const index=Number(paragraph.sourceId.split(':').at(-1));assert.equal(paragraph.en,index===0?retained[index].replace('BEFORE GENERATION:','BEFORE USING THESE DOCUMENTS:'):retained[index]);}}
 const en=result.paragraphs.map(p=>p.en).join('\n\n'),es=result.paragraphs.map(p=>p.es).join('\n\n');
 for(const literal of ['MCA 46-18-204','MCA 44-5-103','2225 11th Ave.','PO Box 201403','Helena, MT 59620','406-444-3625','30'])assert.equal(es.includes(literal),en.includes(literal),literal);
 assert(es.includes('no destruye ni borra'));assert(es.includes('no establece autorización para negar'));assert(es.includes('carta de confirmación'));assert(es.includes('por separado')||es.includes('POR SEPARADO'));
 if(result.stage==='court_motion'){assert(es.includes('PRIMERO PRESENTE LOS DOCUMENTOS Y DESPUÉS NOTIFÍQUELOS'));assert(es.includes('MISMO caso penal'));assert(es.includes('no firme un certificado falso'));assert(es.includes('No complete las determinaciones'));assert(es.includes('CUÁNDO DETENER LA AUTOAYUDA'));assert.equal(result.paragraphs.find(p=>p.sourceId==='retained-mt-instructions:11').en,'SELF-HELP STOPS: '+contract.track.selfHelpStopConditions.join(' '));}
 else{assert(!ids.includes('retained-mt-instructions:6'));assert(!ids.includes('retained-mt-instructions:3'));assert(es.includes('No presente una moción judicial duplicada'));assert(es.includes('últimos cuatro dígitos opcionales'));assert(es.includes('orden de desestimación ya existente'));}
 if(patch.mt_deferred_term_status){const p=result.paragraphs.find(p=>p.sourceId==='staged-mt-instructions:existing-termination-order');assert(p.en.includes('05/06/2024'));assert(p.es.includes('05/06/2024 (mes/día/año)'));assert(p.es.includes('no una nueva orden'));assert(!ids.includes('retained-mt-instructions:4'));}
 if(process.env.MT_EXISTING_STAGED_ARTIFACTS){const file=process.env.MT_EXISTING_STAGED_ARTIFACTS+'/'+name+'.pdf',pdf=fs.readFileSync(file),text=execFileSync('pdftotext',['-layout','-','-'],{input:pdf,encoding:'utf8'});for(const p of result.paragraphs)assert(normal(text).includes(normal(p.en)),name+': '+p.sourceId);summaries.push({name,existingArtifactSha256:hash(pdf),englishTextSha256:result.englishTextSha256,spanishDraftSha256:result.spanishDraftSha256});}
 reviewDrafts.push({scenario:name,...result});checks++;
}
for(const[id,value]of [['citizenshipConfirmed',false],['denialQuestion',true],['earlyTermination',true],['localFormOverride',true],['disputedCompletion',true],['revocationConfirmedByClerk',false]]){const s=structuredClone(base);s.packetAnswers[id]=value;assert.equal(instructions(s,current),null);checks++;}
for(const[id,value]of [['pathwayId','other'],['profileSourceFingerprint','changed'],['profileAuthorityFingerprint','changed'],['paymentAllowed',true],['selectedTrackId','mt_deferred_dismissal']]){assert.equal(instructions({...base,[id]:value},current),null);checks++;}
const changed=structuredClone(current);changed.contract.track.selfHelpStopConditions.pop();assert.equal(instructions(base,changed),null);checks++;
const term=structuredClone(base);term.screeningAnswers.mt_deferred_term_status='terminated_by_order';assert.equal(instructions(term,current),null);checks++;
// This is the exact original source provenance, not a claim that the current
// renderer file may never gain an authorized locale hook. Actual default-byte
// preservation is checked against retained owner artifacts by the staged harness.
assert.equal(source.stagedEnglishCommit,'77bf601538ee93990231175d98efc53adb1665d7');
assert.equal(source.stagedEnglishSha256,'dd99b2877ea89a621719818252db240381f58af2dc4e8f036cd3dbff6730133e');
if(process.env.MT_RETAINED_EN_RENDERER_SOURCE)assert.equal(hash(fs.readFileSync(process.env.MT_RETAINED_EN_RENDERER_SOURCE)),source.stagedEnglishSha256);
if(process.env.MT_INSTRUCTION_REVIEW_OUTPUT)fs.writeFileSync(process.env.MT_INSTRUCTION_REVIEW_OUTPUT,JSON.stringify({classification:'SOURCE_BOUND_SPANISH_COMPANION_DRAFT_NOT_QUALIFIED_APPROVAL',source,stages:reviewDrafts},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS_SOURCE_BOUND_SPANISH_COMPANION_DRAFT',checks,source,existingEnglishArtifacts:summaries,qualifiedLanguageReview:'pending',renderedNewArtifacts:false,authenticatedJourneyRepeated:false,authorityGranted:false},null,2));
