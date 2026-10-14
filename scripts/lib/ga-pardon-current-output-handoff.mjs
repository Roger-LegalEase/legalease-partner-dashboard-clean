// Exact Georgia technical handoff. This is not an approval/admission reader.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
export const GA_CURRENT_OUTPUT_ROUTE='GA:restriction-and-sealing-of-a-pardoned-felony';
export const GA_CURRENT_OUTPUT_CANDIDATE_SHA256='81aefc047db52af8a2ad5e0bd0bc7a49eb09d0ebbe8fc19e7be21cfd75a75328';
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
export async function prepareGaCurrentOutputHandoff({candidatePath,candidateSha256,readBytes,sourceSha}){
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
 const binding={routeId:GA_CURRENT_OUTPUT_ROUTE,trackId:'ga-pardon-j7',packetFamilyId:'ga-pardon-j7-set',specificationPath:source.specificationFile,specificationFileSha256:source.specificationFileSha256,specificationContentSha256:source.semanticSpecificationSha256,provider:{id:source.provider,version:source.providerVersion,publishedExecutionEstablished:false},sourceInputs:source.explicitBoundInputs.map(({path,sha256})=>({path,sha256})),outputs};
 return {
  status:'PREPARED_CURRENT_OUTPUT_HANDOFF_HELD',kind:'technical_productization_handoff',sourceSha,
  sourceReceipt:{path:candidatePath,sha256:candidateSha256,renderCandidateSource:candidate.renderCandidateSource},route:candidate.route,
  artifacts:{packetBytesChanged:true,outputs},sourceSpecificationProvider:binding,
  independentTechnicalReview:{scope:review.status,evidence:candidate.existingEvidence,limits:review.limits},
  originalAdoptedArtifacts:candidate.originalAdoptedArtifacts,
  outputLegalApproval:{state:'not_recorded',requiredAction:candidate.approvalDependency.preciseReviewRequest,originalRecordId:candidate.approvalDependency.originalRecordId,originalPinsApplyToCurrentOutputs:false},
  finalVerification:{state:'unbound',preparedTechnicalInputsSha256:hash(JSON.stringify(binding)),reason:'Technical fixture evidence is not a final protected verification, current output adoption, worker execution or delivered-output acceptance.'},
  canonicalRecord:null,workerAdmission:null,createsApproval:false,createsRegistryRecord:false,opensRoute:false,paymentAllowed:false,productionAuthorized:false,
  remaining:['Recognized adoption of the exact changed output set and any uncovered language/legal conditions','Complete applicable independent filing-grade and final-verification evidence','Canonical and worker admission only after original evidence obligations pass','Genuine protected generation and authorized owner delivery acceptance; publication remains separately prohibited']
 };
}
