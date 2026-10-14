// Exact Georgia technical handoff. This is not an approval/admission reader.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
export const GA_CURRENT_OUTPUT_ROUTE='GA:restriction-and-sealing-of-a-pardoned-felony';
export const GA_CURRENT_OUTPUT_CANDIDATE_SHA256='81aefc047db52af8a2ad5e0bd0bc7a49eb09d0ebbe8fc19e7be21cfd75a75328';
export const GA_PARTICIPANT_ASSEMBLY_REVIEW_SHA256='38604f06f2bc7996507d49269796322c5688539f935916e8ab95b4a897c4580e';
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
export async function prepareGaCurrentOutputHandoff({candidatePath,candidateSha256,readBytes,sourceSha,assemblyReviewPath,assemblyReviewSha256}){
 assert.equal(Boolean(assemblyReviewPath),Boolean(assemblyReviewSha256),'assembly review path and pin must be supplied together');
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
 const participantAssemblies=assemblyReviewPath?await participantAssemblyHandoff({assemblyReviewPath,assemblyReviewSha256,readBytes,candidate}):null;
 const binding={routeId:GA_CURRENT_OUTPUT_ROUTE,trackId:'ga-pardon-j7',packetFamilyId:'ga-pardon-j7-set',specificationPath:source.specificationFile,specificationFileSha256:source.specificationFileSha256,specificationContentSha256:source.semanticSpecificationSha256,provider:{id:source.provider,version:source.providerVersion,publishedExecutionEstablished:false},sourceInputs:source.explicitBoundInputs.map(({path,sha256})=>({path,sha256})),outputs,...(participantAssemblies?{participantAssemblies}: {})};
 return {
  status:'PREPARED_CURRENT_OUTPUT_HANDOFF_HELD',kind:'technical_productization_handoff',sourceSha,
  sourceReceipt:{path:candidatePath,sha256:candidateSha256,renderCandidateSource:candidate.renderCandidateSource},route:candidate.route,
  artifacts:{packetBytesChanged:true,outputs},sourceSpecificationProvider:binding,
  ...(participantAssemblies?{participantAssemblies}: {}),
  independentTechnicalReview:{scope:review.status,evidence:candidate.existingEvidence,limits:review.limits},
  originalAdoptedArtifacts:candidate.originalAdoptedArtifacts,
  outputLegalApproval:{state:'not_recorded',requiredAction:participantAssemblies
   ? 'Review the two exact known-OTN participant-assembly candidates, participant-full-en and participant-full-es, separately from the six preserved court/compositor boundary outputs. Record the recognized adoption decision for the accepted exact hashes and the qualified Spanish-language outcome or retained condition. The six boundary outputs alone do not cover these two participant bundles. This technical handoff grants no output approval, canonical admission, protected verification, payment or delivery authority.'
   : candidate.approvalDependency.preciseReviewRequest,originalRecordId:candidate.approvalDependency.originalRecordId,originalPinsApplyToCurrentOutputs:false},
  finalVerification:{state:'unbound',preparedTechnicalInputsSha256:hash(JSON.stringify(binding)),reason:'Technical fixture evidence is not a final protected verification, current output adoption, worker execution or delivered-output acceptance.'},
  canonicalRecord:null,workerAdmission:null,createsApproval:false,createsRegistryRecord:false,opensRoute:false,paymentAllowed:false,productionAuthorized:false,
  remaining:['Recognized adoption of the exact changed output set and any uncovered language/legal conditions','Complete applicable independent filing-grade and final-verification evidence','Canonical and worker admission only after original evidence obligations pass','Genuine protected generation and authorized owner delivery acceptance; publication remains separately prohibited']
 };
}
