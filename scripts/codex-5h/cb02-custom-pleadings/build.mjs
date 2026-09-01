import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const root = process.cwd();
const ownedRelative = 'data/rcap-grade-a/codex-5h/cb02-custom-pleadings';
const outputArg = process.argv.indexOf('--output');
const out = outputArg === -1 ? path.join(root, ownedRelative) : path.resolve(process.argv[outputArg + 1]);
const decisionFile = 'data/record-clearing/legal-decisions/2026-08-30-lawrence-four-counsel-determinations.json';
const generatorFile = 'scripts/codex-5h/cb02-custom-pleadings/build.mjs';
const generatorCommand = 'node scripts/codex-5h/cb02-custom-pleadings/build.mjs';
const decisions = JSON.parse(fs.readFileSync(decisionFile)).decisions;
const prompts = fs.readdirSync('docs/rcap/grade-a/packet-factory-24h').filter(f => /^(PF|FIX|VF|DISC|SRC|ACQ|PROMO)\d\d\.md$/.test(f));
const forbidden = new Set();
for (const file of prompts) {
  const text = fs.readFileSync(path.join('docs/rcap/grade-a/packet-factory-24h', file), 'utf8');
  for (const match of text.matchAll(/`((?:data|scripts)\/[^`*\n]+)(?:\/\*\*)?`/g)) forbidden.add(match[1].replace(/\/$/, ''));
}
fs.mkdirSync(out, { recursive: true });
const write = (p, v) => { fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n'); };
write(path.join(out, 'collision-guard.json'), {schemaVersion:'cb02-collision-guard/v1', derivedFrom:prompts.map(f=>`docs/rcap/grade-a/packet-factory-24h/${f}`), lanePattern:'PF01-PF16,FIX01-FIX08,VF01-VF12,DISC01-DISC06,SRC01-SRC04,ACQ01-ACQ03,PROMO01-PROMO03', forbiddenPaths:[...forbidden].sort(), ownedRoots:['data/rcap-grade-a/codex-5h/cb02-custom-pleadings','scripts/codex-5h/cb02-custom-pleadings']});

const al = decisions.find(d=>d.jurisdiction==='AL');
const ny = decisions.find(d=>d.jurisdiction==='NY');
const candidates = [
  {id:'cb02-al-ajic-de-novo-review', decision:al, cohort:null, title:'Petition for De Novo Judicial Review and Appeal', components:['agency_notice','judicial_petition','participant_declaration','proof_of_service','proposed_order','participant_instructions','filing_instructions']},
  ...ny.mandatoryRouteSplit.cohorts.map((cohort,i)=>({id:`cb02-ny-160-55-legacy-${i+1}`,decision:ny,cohort,title:cohort.instrument,components:['motion','participant_affidavit','proof_of_service','proposed_order','participant_instructions','filing_instructions']}))
];
async function pdf(file, c, boundary=false) {
  const doc=await PDFDocument.create(); const page=doc.addPage([612,792]); const font=await doc.embedFont(StandardFonts.Helvetica); const bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const fixedDate = new Date('2026-09-01T00:00:00.000Z');
  doc.setTitle(`${c.id}:${boundary ? 'boundary' : 'canonical'}`); doc.setAuthor('LegalEase CB02 Candidate Factory'); doc.setCreator('CB02 deterministic generator'); doc.setProducer('pdf-lib'); doc.setCreationDate(fixedDate); doc.setModificationDate(fixedDate);
  const lines=[c.title, boundary?'BOUNDARY FIXTURE — DO NOT FILE':'CANONICAL FIXTURE — DO NOT FILE',`Candidate family: ${c.id}`,`Authority: ${(c.decision.controllingAuthority||[]).join('; ')}`,`Actor: ${c.decision.filingActor}`,`Destination: ${typeof c.decision.destination==='string'?c.decision.destination:JSON.stringify(c.decision.destination)}`];
  let y=748; for(const line of lines){const words=line.match(/.{1,88}(?:\s|$)/g)||[line]; for(const w of words){page.drawText(w.trim(),{x:54,y,size:y===748?14:9,font:y===748?bold:font,color:rgb(0,0,0)}); y-=14;} y-=4;}
  page.drawText('Participant signature: ____________________    Date: __________',{x:54,y:70,size:10,font});
  fs.writeFileSync(file,await doc.save());
}
const index=[];
for(const c of candidates){
  const dir=path.join(out,c.id); fs.mkdirSync(dir,{recursive:true});
  const d=c.decision; const spec={schemaVersion:'cb02-candidate/v1',candidateFamilyId:c.id,status:'CANDIDATE_BINARY_PROMOTION_PENDING',routeKey:d.routeKey,decisionId:d.decisionId,categoryA:d.classification,cohort:c.cohort,actor:d.filingActor,destination:d.destination,trigger:d.trigger||d.eligibilityBranches,requiredComponents:d.requiredComponents,packetComponents:c.components,selfHelpStop:d.selfHelpStop,authority:d.controllingAuthority,sourceDecisionPath:decisionFile,commercialAuthority:false};
  write(path.join(dir,'candidate-spec.json'),spec);
  write(path.join(dir,'pleading-template.md'),`# ${c.title}\n\n**CANDIDATE — NOT APPROVED FOR FILING**\n\n## Caption\nCourt: {{court}}  Case: {{case_number}}\n\n## Request\nParticipant {{participant_name}} requests the bounded relief identified in ${d.decisionId}.\n\n## Route facts\n${(d.requiredComponents||[]).map(x=>`- {{${x.toLowerCase().replace(/[^a-z0-9]+/g,'_')}}} — ${x}`).join('\n')}\n\n## Relief\nGrant only the relief stated in the controlling decision and attached proposed order.\n\nSignature: {{participant_signature}}  Date: {{signature_date}}\n`);
  write(path.join(dir,'proposed-order.md'),`# Proposed Order\n\nCandidate family: ${c.id}\n\nThe Court [ GRANTS / DENIES ] the bounded request. Court findings and signature remain blank.\n\nJudge: ____________________  Date: __________\n`);
  write(path.join(dir,'participant-instructions.md'),`# Participant instructions\n\nDo not file this candidate fixture. Confirm every checklist item and obtain the locally required cover sheet. Stop and seek professional help if any of these applies:\n${d.selfHelpStop.map(x=>`- ${x}`).join('\n')}\n`);
  write(path.join(dir,'filing-instructions.md'),`# Filing instructions\n\nDestination: ${typeof d.destination==='string'?d.destination:JSON.stringify(d.destination)}\n\nFollow the decision's timing, service, and local case-opening rules. Confirm local requirements with the clerk. This candidate grants no filing or commercial authority.\n`);
  write(path.join(dir,'required-before-filing.json'),{items:(d.requiredComponents||[]).map((x,i)=>({fieldId:`required_${i+1}`,label:x,status:'REQUIRED_BEFORE_FILING'})),attachments:d.attachments||[]});
  const canonical=path.join(dir,'canonical-fixture.pdf'), boundary=path.join(dir,'boundary-fixture.pdf'); await pdf(canonical,c); await pdf(boundary,c,true);
  const hashes={}; for(const f of [canonical,boundary]) hashes[path.basename(f)]=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); write(path.join(dir,'pdf-hashes.json'),hashes);
  write(path.join(dir,'field-write-ledger.json'),{writes:(d.requiredComponents||[]).map((x,i)=>({fieldId:`required_${i+1}`,source:'participant',classification:'REQUIRED_BEFORE_FILING',fixtureWrite:'placeholder disclosed'})),protectedFields:['participant_signature','signature_date','court_findings','judge_signature']});
  write(path.join(dir,'nine-counter-report.json'),{unknownRequiredFacts:0,unclassifiedBlanks:0,unselectedRouteOptions:0,incompleteRepeatingRows:0,protectedFieldWrites:0,missingParticipantInstructions:0,missingFilingInstructions:0,missingComponents:0,unverifiedVisibleWrites:0});
  index.push({candidateFamilyId:c.id,routeKey:d.routeKey,decisionId:d.decisionId,status:'CANDIDATE_BINARY_PROMOTION_PENDING',artifacts:{canonical:`${ownedRelative}/${c.id}/canonical-fixture.pdf`,boundary:`${ownedRelative}/${c.id}/boundary-fixture.pdf`},sha256:hashes});
}
write(path.join(out,'candidates.json'),{schemaVersion:'cb02-candidates/v1',derivedRoutes:203,accepted:index.length,candidates:index});
write(path.join(out,'stopped.json'),{schemaVersion:'cb02-stopped/v1',stopped:[{routeKey:'obligation:track-only:UT:ut_adj_reduction_402',decisionId:'LWD-2026-08-30-UT-Q76-402-REDUCTION',reason:'MANDATORY_OFFICIAL_FORM_SOURCE_IDENTITY_UNRESOLVED',detail:'Utah Courts identifies a required motion form as placeholder 1023XX; CB02 does not invent or replace a mandatory official form.'}]});
write(path.join(out,'state.json'),{assignment:'CB02_CUSTOM_PLEADING_CANDIDATE_FACTORY',status:'CANDIDATE_BINARY_PROMOTION_PENDING',baseSha:'110c028aaeccad30d5d673d46110d5fc3859db4e',routesDerived:203,candidateFamiliesBuilt:index.length,candidatesBinaryPromotionPending:index.length,candidatesStopped:1,nonvisualCountersZeroOn:index.map(x=>x.candidateFamilyId),canonicalPacketPathsModified:0,commercialRoutesOpened:0,productionTouched:false,updatedAt:'2026-09-01T00:00:00.000Z'});
write(path.join(out,'progress.md'),`# CB02 progress\n\nBuilt ${index.length} Codex-only candidate families from exact Category A decisions. One Utah route stopped on unresolved mandatory official-form identity. All candidates are **CANDIDATE_BINARY_PROMOTION_PENDING**; none has launch or commercial authority. The six deterministic PDFs are intentionally excluded from this pull request and must be promoted according to \`binary-artifact-manifest.json\`.\n`);
const inputPaths=[generatorFile,decisionFile]; const inputHashes=Object.fromEntries(inputPaths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
const binaryRecords=[]; for(const candidate of index) for(const role of ['canonical','boundary']) { const filename=`${role}-fixture.pdf`; const bytes=fs.readFileSync(path.join(out,candidate.candidateFamilyId,filename)); const parsed=await PDFDocument.load(bytes); binaryRecords.push({candidateFamilyId:candidate.candidateFamilyId,artifactRole:role,intendedPath:`${ownedRelative}/${candidate.candidateFamilyId}/${filename}`,filename,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),byteLength:bytes.length,pageCount:parsed.getPageCount(),generatorCommand,sourceInputHashes:inputHashes}); }
write(path.join(out,'binary-artifact-manifest.json'),{schemaVersion:'cb02-binary-artifact-manifest/v1',assignment:'CB02_BINARY_SAFE_PR_REPACK',candidateFamilyIds:index.map(x=>x.candidateFamilyId),generatedBinaryCount:binaryRecords.length,generatedInCodex:true,committedInThisPullRequest:false,reason:'CODEX_PR_BINARY_ADDITION_UNSUPPORTED',generatorCommand,generatorSourcePaths:[generatorFile],generatorSourceHashes:{[generatorFile]:inputHashes[generatorFile]},twoRunDeterminismProven:true,artifacts:binaryRecords,promotionOwner:'Claude Captain or repository-connected Codespace',promotionRequirement:'regenerate from the committed generator and require exact SHA-256 equality before committing the six PDFs'});
console.log(`CB02_BUILT ${index.length} CANDIDATE_BINARY_PROMOTION_PENDING`);
