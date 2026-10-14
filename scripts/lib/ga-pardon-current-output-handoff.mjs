// Exact Georgia technical handoff. This is not an approval/admission reader.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
export const GA_CURRENT_OUTPUT_ROUTE='GA:restriction-and-sealing-of-a-pardoned-felony';
export const GA_CURRENT_OUTPUT_CANDIDATE_SHA256='81aefc047db52af8a2ad5e0bd0bc7a49eb09d0ebbe8fc19e7be21cfd75a75328';
export const GA_PARTICIPANT_ASSEMBLY_REVIEW_SHA256='38604f06f2bc7996507d49269796322c5688539f935916e8ab95b4a897c4580e';
export const GA_PARTICIPANT_BOUNDARY_REVIEW_SHA256='284f34c6d8124132e2e0526dd7f8b0aeda90e77265b2659b8a69e50104e7c82d';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const variants=['full','court_only','unknown-otn-full','unknown-otn-court_only','boundary-es-full','boundary-es-court_only'];
const overlay='data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/';
const sourcePaths=[
 'data/record-clearing/legal-design-intake/GA.memo.json',
 'data/record-clearing/packet-specifications/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json',
 'data/record-clearing/legal-design-packet-set-manifests.json','scripts/build-census-v1-ga-host.mjs','scripts/test-ga-personalized-handoff.mjs',
 'src/lib/rcap/render/ga-pardon-facts.ts','src/lib/rcap/render/personalized-packet.ts','src/lib/rcap/grade-a/participant-packet.ts',
 'src/lib/rcap/grade-a/composer.ts','src/lib/rcap/grade-a/packet-specification.ts','src/lib/rcap/grade-a/renderer.ts',
 'src/lib/expungement-ai/ga-pardon-caption.ts','src/lib/expungement-ai/record-fact-clarification.ts','package-lock.json',
 ...['source-receipt.json','production-field-map.json','participant-instructions.md','reports/rendered-artifacts.json','reports/blanks-left-for-the-participant.json'].map(file=>overlay+file)
];
const assemblySourcePaths=[
 'src/lib/rcap/render/participant-packet-assembly.ts','scripts/test-ga-personalized-handoff.mjs',sourcePaths[1],
 'scripts/test-ga-participant-assembly.mjs','src/lib/rcap/render/ga-pardon-facts.ts','src/lib/rcap-engine/georgia-pardon-facts.ts',
 'src/lib/expungement-ai/ga-pardon-caption.ts','src/lib/expungement-ai/record-fact-clarification.ts',
 'src/lib/rcap/grade-a/composer.ts','src/lib/rcap/grade-a/participant-packet.ts','src/lib/rcap/grade-a/renderer.ts',
 'src/lib/rcap/supplemental/guide-renderer.ts','src/lib/rcap/supplemental/guide-registry.ts','src/lib/rcap/render/personalized-packet.ts',
 'data/record-clearing/supplemental-guides/GA-restriction-and-sealing-of-a-pardoned-felony.v1.json'
];
/** Exact independently reviewed synthetic assembly scope, never an approval. */
export function assertGaParticipantAssemblyReviewScope(review,actual){
 assert.equal(review.status,'PASS_BOUNDED_INDEPENDENT_GA_PRODUCTION_ASSEMBLY_MAPPING_AND_PAGINATION');
 assert.equal(review.candidate,'b9ca0c16fde3cdd25216158c6590800b8edf7595');
 assert.equal(review.actualRenderEvidence.productionEntry,'renderParticipantPacketPdf');
 assert.equal(review.reviewerDatabaseOrPdfGeneration,false);
 assert.equal(actual.status,'PASS');
 assert.deepEqual(Object.keys(actual.sourceBindings).sort(),[...assemblySourcePaths].sort(),'exact assembly source inputs required');
 assert.deepEqual(review.sourceHashes,actual.sourceBindings,'assembly review and executed source disagree');
 assert.deepEqual(review.outputs,actual.artifacts,'assembly review and executed outputs disagree');
 assert.deepEqual(actual.artifacts.map(output=>output.locale).sort(),['en','es'],'exact two participant assembly locales required');
 assert.equal(new Set(actual.artifacts.map(output=>output.file)).size,2);
 for(const output of actual.artifacts){
  assert.equal(output.pages,16);assert.equal(output.guidePages,6);assert.equal(output.courtPagesPreserved,9);
  assert.equal(output.matter.jurisdiction,'GA');assert.equal(output.matter.courtOrAgency,'Municipal Court');
  assert.equal(output.matter.caseOrMatter,'2020-CR-0042');
 }
 assert.equal(actual.translationProvenance.status,'SOURCE_PARALLEL_DRAFT_INDEPENDENT_LANGUAGE_REVIEW_PENDING');
}
async function participantAssemblyHandoff({assemblyReviewPath,assemblyReviewSha256,readBytes,candidate}){
 assert.equal(assemblyReviewSha256,GA_PARTICIPANT_ASSEMBLY_REVIEW_SHA256,'unreviewed participant assembly evidence');
 const reviewBytes=readBytes(assemblyReviewPath);assert.equal(hash(reviewBytes),assemblyReviewSha256,'assembly independent review bytes changed');
 const review=JSON.parse(reviewBytes),actualBytes=readBytes(review.actualRenderEvidence.path);
 assert.equal(hash(actualBytes),review.actualRenderEvidence.sha256,'assembly execution evidence changed');
 const actual=JSON.parse(actualBytes);assertGaParticipantAssemblyReviewScope(review,actual);
 for(const [file,sha256] of Object.entries(actual.sourceBindings))assert.equal(hash(readBytes(file)),sha256,'changed assembly input: '+file);
 const guidePath=assemblySourcePaths.at(-1),guide=JSON.parse(readBytes(guidePath));
 assert.equal(guide.routeKey,GA_CURRENT_OUTPUT_ROUTE);assert.deepEqual(guide.translationProvenance,actual.translationProvenance);
 const original=candidate.currentOutputCandidates.map(({variant,file,sha256,byteLength})=>({variant,file,sha256,byteLength}));
 assert.deepEqual(review.preservedOriginalArtifacts,original,'assembly review lost original court/compositor boundary evidence');
 assert.deepEqual(actual.preservedCourtArtifacts,original);
 const pixelBytes=readBytes(review.pixelEvidence.path);assert.equal(hash(pixelBytes),review.pixelEvidence.sha256,'court pixel evidence changed');
 const pixel=JSON.parse(pixelBytes);assert.equal(pixel.status,'PASS');
 assert.equal(pixel.checks.length,18);
 assert.deepEqual(pixel.checks.map(check=>`${check.locale}:${check.originalCourtPage}`).sort(),['en','es'].flatMap(locale=>Array.from({length:9},(_,i)=>`${locale}:${i+1}`)).sort());
 for(const check of pixel.checks){assert.equal(check.pixelEqual,true);assert.equal(check.participantPage,check.originalCourtPage+6);}
 const outputs=[];
 for(const artifact of actual.artifacts){
  assert(!candidate.currentOutputCandidates.some(old=>old.sha256===artifact.sha256),'bare court/compositor artifact is not a participant assembly');
  const bytes=readBytes(artifact.file);assert.equal(hash(bytes),artifact.sha256,'changed participant PDF: '+artifact.file);
  assert.equal(bytes.length,artifact.byteLength);assert.equal((await PDFDocument.load(bytes)).getPageCount(),artifact.pages);
  outputs.push({id:`participant-full-${artifact.locale}`,locale:artifact.locale,variant:'full',path:artifact.file,sha256:artifact.sha256,byteLength:artifact.byteLength,pageCount:artifact.pages,guidePages:6,courtPagesPreserved:9});
 }
 return {scope:'Two actual known-OTN synthetic participant assemblies; six court/compositor variants remain separate boundary evidence',
  independentReview:{path:assemblyReviewPath,sha256:assemblyReviewSha256,candidate:review.candidate},executionEvidence:review.actualRenderEvidence,
  courtPixelEvidence:review.pixelEvidence,sourceInputs:Object.entries(actual.sourceBindings).map(([path,sha256])=>({path,sha256})),
  guide:{path:guidePath,sha256:actual.sourceBindings[guidePath],translationProvenance:actual.translationProvenance},outputs,
  qualifiedLanguageAcceptance:false,protectedGenerationEstablished:false,authorizedDeliveryEstablished:false,limits:review.limits};
}
/** Additional measured delivery assemblies, never interchangeable with bare PDFs. */
export function assertGaParticipantBoundaryReviewScope(review,actual){
 assert.equal(review.status,'PASS_BOUNDED_ASSEMBLY_ARTIFACT_REVIEW');
 assert.equal(review.sourceCommit,'46f687a0edfc5e08f246b03c0d294f2965e6f97b');
 assert.equal(review.actualRenderEvidence.entryPoint,'renderParticipantPacketPdf');
 assert.equal(review.actualRenderEvidence.newCases,3);
 assert.equal(review.actualRenderEvidence.rendererReexecutionByReviewer,false);
 assert.equal(actual.status,'PASS');
 assert.deepEqual(Object.keys(actual.sourceBindings).sort(),[...assemblySourcePaths,'scripts/test-ga-participant-assembly-boundaries.mjs'].sort());
 assert.deepEqual(review.sourceHashes,actual.sourceBindings);
 assert.deepEqual(review.outputs,actual.artifacts);
 assert.deepEqual(review.pixelComparisons,actual.pixelComparisons);
 assert.deepEqual(review.preservedArtifacts,actual.preservedArtifacts);
 assert.deepEqual(review.preservedKnownAssemblyReceipt,actual.preservedKnownAssemblyReceipt);
 assert.deepEqual(actual.artifacts.map(a=>a.case).sort(),['boundary-es','unknown-otn-en','unknown-otn-es']);
 assert.equal(new Set(actual.artifacts.map(a=>a.file)).size,3);
 for(const a of actual.artifacts){
  const boundary=a.case==='boundary-es',locale=a.case==='unknown-otn-en'?'en':'es';
  assert.equal(a.locale,locale);assert.equal(a.guidePages,6);
  assert.equal(a.pages,boundary?17:16);assert.equal(a.courtPagesPreserved,boundary?10:9);
  assert.equal(a.reference.variant,boundary?'boundary-es-court_only':'unknown-otn-court_only');
  assert.equal(a.matter.jurisdiction,'GA');assert.equal(a.matter.caseOrMatter,'2020-CR-0042');
  assert.equal(a.matter.courtOrAgency,boundary?'Municipal Court of the City of a Synthetic Municipality with a Long Record Caption':'Municipal Court');
  assert.equal(a.matter.remedy,locale==='en'?'Restriction and sealing of a pardoned conviction':'Restricción y sellado de una condena indultada');
  assert.equal(a.stopPage,6);
 }
 const expected=actual.artifacts.flatMap(a=>Array.from({length:a.courtPagesPreserved},(_,i)=>`${a.case}:${i+1}`)).sort();
 assert.deepEqual(actual.pixelComparisons.map(p=>`${p.case}:${p.courtPage}`).sort(),expected);
 for(const p of actual.pixelComparisons){assert.equal(p.assemblyPage,p.courtPage+6);assert.match(p.originalSha256,/^[0-9a-f]{64}$/);assert.equal(p.originalSha256,p.assembledSha256);}
 assert.equal(actual.translationProvenance.status,'SOURCE_PARALLEL_DRAFT_INDEPENDENT_LANGUAGE_REVIEW_PENDING');
 assert.deepEqual(review.translationProvenance,actual.translationProvenance);
}
async function participantBoundaryHandoff({boundaryReviewPath,boundaryReviewSha256,readBytes,candidate,known}){
 assert.equal(boundaryReviewSha256,GA_PARTICIPANT_BOUNDARY_REVIEW_SHA256,'unreviewed participant boundary evidence');
 const reviewBytes=readBytes(boundaryReviewPath);assert.equal(hash(reviewBytes),boundaryReviewSha256,'boundary independent review bytes changed');
 const review=JSON.parse(reviewBytes),actualBytes=readBytes(review.actualRenderEvidence.file);
 assert.equal(hash(actualBytes),review.actualRenderEvidence.sha256,'boundary execution evidence changed');
 const actual=JSON.parse(actualBytes);assertGaParticipantBoundaryReviewScope(review,actual);
 for(const [file,sha256]of Object.entries(actual.sourceBindings))assert.equal(hash(readBytes(file)),sha256,'changed boundary assembly input: '+file);
 assert.deepEqual(actual.preservedKnownAssemblyReceipt,{file:known.executionEvidence.path,sha256:known.executionEvidence.sha256});
 const knownBytes=readBytes(actual.preservedKnownAssemblyReceipt.file);assert.equal(hash(knownBytes),actual.preservedKnownAssemblyReceipt.sha256);
 const knownExecution=JSON.parse(knownBytes);
 const originals=candidate.currentOutputCandidates.map(({variant,file,sha256,byteLength})=>({variant,file,sha256,byteLength}));
 assert.deepEqual(actual.preservedArtifacts,[...originals,...knownExecution.artifacts]);
 assert.deepEqual(actual.translationProvenance,known.guide.translationProvenance);
 const directory=path.dirname(review.actualRenderEvidence.file),outputs=[];
 for(const p of actual.pixelComparisons){
  assert.equal(hash(readBytes(path.join(directory,`${p.case}-old-court-${p.courtPage}.png`))),p.originalSha256,'preserved court raster changed');
  assert.equal(hash(readBytes(path.join(directory,`${p.case}-assembled-court-${p.courtPage}.png`))),p.assembledSha256,'assembled court raster changed');
 }
 for(const a of actual.artifacts){
  assert.deepEqual(a.reference,originals.find(old=>old.variant===a.reference.variant));
  assert(![...originals,...knownExecution.artifacts].some(old=>old.sha256===a.sha256),'old artifact cannot substitute for new participant boundary assembly');
  const bytes=readBytes(a.file);assert.equal(hash(bytes),a.sha256,'changed boundary participant PDF');assert.equal(bytes.length,a.byteLength);
  assert.equal((await PDFDocument.load(bytes)).getPageCount(),a.pages);
  assert.equal(hash(readBytes(path.join(directory,a.case+'-cover.png'))),a.coverSha256,'boundary cover raster changed');
  assert.equal(hash(readBytes(path.join(directory,a.case+'-help.png'))),a.stopPageSha256,'boundary help raster changed');
  outputs.push({id:'participant-full-'+a.case,locale:a.locale,variant:'full',path:a.file,sha256:a.sha256,byteLength:a.byteLength,pageCount:a.pages,guidePages:a.guidePages,courtPagesPreserved:a.courtPagesPreserved});
 }
 return {...known,scope:'Five actual synthetic participant assemblies: known-OTN EN/ES, unknown-OTN EN/ES and long-boundary ES; six bare court/compositor outputs remain separate evidence',
  knownAssemblyLimits:known.limits,
  limits:['Five actual synthetic participant assemblies are bound separately from six preserved bare court/compositor outputs; no protected generation or authorized delivery is established.',
   'The Spanish guide remains a source-parallel draft pending qualified language review. Court instruments remain English. Known-OTN and unknown-OTN narratives retain their original English; the long-boundary narrative retains its exact original Spanish without translation or filing-language approval.',
   'No output adoption, canonical admission, final protected verification, worker publication/execution, payment or commercial authority is created.'],
  outputs:[...known.outputs,...outputs],boundaryEvidence:{independentReview:{path:boundaryReviewPath,sha256:boundaryReviewSha256,candidate:review.sourceCommit},executionEvidence:review.actualRenderEvidence,
   sourceInputs:Object.entries(actual.sourceBindings).map(([path,sha256])=>({path,sha256})),pixelComparisons:actual.pixelComparisons,preservedKnownAssemblyReceipt:actual.preservedKnownAssemblyReceipt,limits:review.limits}};
}
/** Semantic checks are separate from the immutable receipt pin for mutation tests. */
export function assertGaCurrentOutputCandidateScope(candidate){
 assert.equal(candidate.status,'PREPARED_EXACT_OUTPUT_CANDIDATE_NOT_ADMITTED');
 assert.deepEqual(candidate.route,{jurisdiction:'GA',runtimeRouteId:GA_CURRENT_OUTPUT_ROUTE,
  obligationRouteKey:'obligation:track-pathway:GA:ga-pardon-j7:restriction-and-sealing-of-a-pardoned-felony',trackId:'ga-pardon-j7',packetFamilyId:'ga-pardon-j7-set',gaSealMSiblingAdmitted:false,tracklessAggregateAdmitted:false});
 const source=candidate.sourceSpecificationProvider;
 assert.equal(source.provider,'rcap_grade_a_document_v1');assert.equal(source.providerVersion,'2.0.0');
 assert.equal(source.specificationFile,sourcePaths[1]);
 assert.deepEqual(source.explicitBoundInputs.map(entry=>entry.path).sort(),[...sourcePaths].sort(),'exact nineteen source inputs required');
 assert.deepEqual(candidate.currentOutputCandidates.map(entry=>entry.variant).sort(),[...variants].sort(),'exact six output cases required');
 assert.equal(new Set(candidate.currentOutputCandidates.map(entry=>entry.file)).size,6);
 assert.equal(candidate.approvalDependency.currentApprovalState,'NOT_RECORDED','this handoff cannot interpret or grant an output adoption');
 assert.equal(candidate.approvalDependency.postApprovalAuditVerdict,'NO_POST_APPROVAL_CHANGE_AUDIT_ROW_YET');
 assert.deepEqual(candidate.originalAdoptedArtifacts.map(entry=>entry.fixture).sort(),['boundary','canonical']);
 assert.equal(candidate.existingEvidence.length,6,'all existing scoped independent evidence required');
}
export async function prepareGaCurrentOutputHandoff({candidatePath,candidateSha256,readBytes,sourceSha,assemblyReviewPath,assemblyReviewSha256,boundaryReviewPath,boundaryReviewSha256}){
 assert.equal(Boolean(assemblyReviewPath),Boolean(assemblyReviewSha256),'assembly review path and pin must be supplied together');
 assert.equal(Boolean(boundaryReviewPath),Boolean(boundaryReviewSha256),'boundary review path and pin must be supplied together');
 assert(!boundaryReviewPath||assemblyReviewPath,'boundary assemblies require the preserved known-assembly review');
 assert.equal(candidateSha256,GA_CURRENT_OUTPUT_CANDIDATE_SHA256,'unreviewed candidate receipt');
 const bytes=readBytes(candidatePath);assert.equal(hash(bytes),candidateSha256,'candidate receipt bytes changed');
 const candidate=JSON.parse(bytes);assertGaCurrentOutputCandidateScope(candidate);assert.match(sourceSha,/^[0-9a-f]{40}$/);
 const source=candidate.sourceSpecificationProvider;
 for(const input of source.explicitBoundInputs){assert.equal(input.sha256,input.acceptedRenderCandidateSha256);assert.equal(hash(readBytes(input.path)),input.sha256,'changed source input: '+input.path);}
 const spec=JSON.parse(readBytes(source.specificationFile));
 assert.equal(hash(readBytes(source.specificationFile)),source.specificationFileSha256);
 assert.equal(spec.specificationSha256,source.semanticSpecificationSha256);assert.equal(spec.specificationVersion,source.specificationVersion);
 assert.equal(spec.trackId,'ga-pardon-j7');assert.equal(spec.packetFamily,'ga-pardon-j7-set');assert.equal(spec.routeKey,GA_CURRENT_OUTPUT_ROUTE);
 assert.equal(spec.legalSectionsBoundBy.postApprovalAuditVerdict,'NO_POST_APPROVAL_CHANGE_AUDIT_ROW_YET');
 const evidence=candidate.existingEvidence.map(entry=>{const b=readBytes(entry.path);assert.equal(hash(b),entry.sha256,'changed independent evidence: '+entry.path);assert.equal(b.length,entry.byteLength);return{...entry,document:JSON.parse(b)};});
 const review=evidence.find(entry=>entry.path.endsWith('/INDEPENDENT-GA-UNLETTERED-8aef9f28c-v1.json'))?.document;
 assert.equal(review?.status,'PASS_BOUNDED_SOURCE_LABEL_AND_OUTPUT_CORRECTION');assert.equal(review.candidate,candidate.renderCandidateSource);
 const dependency=evidence.find(entry=>entry.path.endsWith('/INDEPENDENT-GA-CANONICAL-AUTHORITY-DEPENDENCY-v1.json'))?.document;
 assert.equal(dependency?.status,'BOUNDED_SOURCE_DEPENDENCY_DISTINCTION_VERIFIED');
 // A subsequently recorded adoption requires a fresh exact handoff; do not
 // misreport the old absence or interpret a new decision through this scope.
 for(const file of ['OWNER_BATCH_ADOPTION_2026-09-02.json','POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json']){
  const location='data/rcap-grade-a/legal-decisions/'+file;
  assert.equal(hash(readBytes(location)),dependency.sourceHashes[location],'output-adoption evidence changed; this held handoff cannot interpret it');
 }
 assert.deepEqual(review.actualOutputs.map(({variant,file,sha256,byteLength})=>({variant,file,sha256,byteLength})),candidate.currentOutputCandidates.map(({variant,file,sha256,byteLength})=>({variant,file,sha256,byteLength})));
 const outputs=[];
 for(const artifact of [...candidate.currentOutputCandidates,...candidate.originalAdoptedArtifacts]){
  const b=readBytes(artifact.file);assert.equal(hash(b),artifact.sha256,'changed PDF: '+artifact.file);assert.equal(b.length,artifact.byteLength);
  assert.equal((await PDFDocument.load(b)).getPageCount(),artifact.pageCount,'page count differs: '+artifact.file);
  if(artifact.variant)outputs.push({id:artifact.variant,path:artifact.file,sha256:artifact.sha256,byteLength:b.length,pageCount:artifact.pageCount});
 }
 assert(outputs.every(output=>!candidate.originalAdoptedArtifacts.some(old=>old.sha256===output.sha256)),'changed outputs cannot borrow original fixture approval');
 let participantAssemblies=assemblyReviewPath?await participantAssemblyHandoff({assemblyReviewPath,assemblyReviewSha256,readBytes,candidate}):null;
 if(boundaryReviewPath)participantAssemblies=await participantBoundaryHandoff({boundaryReviewPath,boundaryReviewSha256,readBytes,candidate,known:participantAssemblies});
 const binding={routeId:GA_CURRENT_OUTPUT_ROUTE,trackId:'ga-pardon-j7',packetFamilyId:'ga-pardon-j7-set',specificationPath:source.specificationFile,specificationFileSha256:source.specificationFileSha256,specificationContentSha256:source.semanticSpecificationSha256,provider:{id:source.provider,version:source.providerVersion,publishedExecutionEstablished:false},sourceInputs:source.explicitBoundInputs.map(({path,sha256})=>({path,sha256})),outputs,...(participantAssemblies?{participantAssemblies}: {})};
 return {
  status:'PREPARED_CURRENT_OUTPUT_HANDOFF_HELD',kind:'technical_productization_handoff',sourceSha,
  sourceReceipt:{path:candidatePath,sha256:candidateSha256,renderCandidateSource:candidate.renderCandidateSource},route:candidate.route,
  artifacts:{packetBytesChanged:true,outputs},sourceSpecificationProvider:binding,
  ...(participantAssemblies?{participantAssemblies}: {}),
  independentTechnicalReview:{scope:review.status,evidence:candidate.existingEvidence,limits:review.limits},
  originalAdoptedArtifacts:candidate.originalAdoptedArtifacts,
  outputLegalApproval:{state:'not_recorded',requiredAction:boundaryReviewPath
   ? 'Review the five exact participant-assembly candidates: known-OTN EN/ES, unknown-OTN EN/ES and long-boundary ES, separately from the six preserved bare court/compositor outputs. Record the recognized decision for each accepted exact hash, the qualified Spanish-guide outcome or retained condition, and any separate condition on the Spanish-authored court narrative. Neither the six bare artifacts nor the two known-OTN bundles alone cover these three additional assemblies. This technical handoff grants no output approval, canonical admission, protected verification, payment or delivery authority.'
   : participantAssemblies
   ? 'Review the two exact known-OTN participant-assembly candidates, participant-full-en and participant-full-es, separately from the six preserved court/compositor boundary outputs. Record the recognized adoption decision for the accepted exact hashes and the qualified Spanish-language outcome or retained condition. The six boundary outputs alone do not cover these two participant bundles. This technical handoff grants no output approval, canonical admission, protected verification, payment or delivery authority.'
   : candidate.approvalDependency.preciseReviewRequest,originalRecordId:candidate.approvalDependency.originalRecordId,originalPinsApplyToCurrentOutputs:false},
  finalVerification:{state:'unbound',preparedTechnicalInputsSha256:hash(JSON.stringify(binding)),reason:'Technical fixture evidence is not a final protected verification, current output adoption, worker execution or delivered-output acceptance.'},
  canonicalRecord:null,workerAdmission:null,createsApproval:false,createsRegistryRecord:false,opensRoute:false,paymentAllowed:false,productionAuthorized:false,
  remaining:['Recognized adoption of the exact changed output set and any uncovered language/legal conditions','Complete applicable independent filing-grade and final-verification evidence','Canonical and worker admission only after original evidence obligations pass','Genuine protected generation and authorized owner delivery acceptance; publication remains separately prohibited']
 };
}
