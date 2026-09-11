import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {acceptedRasterFor, candidateRowsByFamily} from './acceptance-identity.mjs';
import {assessDeReviewedGuidance, additiveOtherFamilyRegistry, CURRENT_REVIEW} from './de-reviewed-guidance.mjs';
import {DE_DECISION, DE_DIRECTORY, DE_FAMILY, DE_ROUTE} from './de-guidance-binding.mjs';

const root = process.cwd();
const read = relative => fs.readFileSync(relative);
const json = relative => JSON.parse(read(relative));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const originalPdfHashes = Object.fromEntries(['canonical', 'boundary'].map(fixture => {
  const relative = `${DE_DIRECTORY}/fixtures/${fixture}.pdf`;
  return [relative, hash(read(relative))];
}));
const report = json(`${DE_DIRECTORY}/reports/rendered-artifacts.json`);
const receipt = json(`${DE_DIRECTORY}/source-receipt.json`);
const base = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
const obligations = ['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS',
  'REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS',
  'PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP'];
const counters = {knownRequiredFieldsMissing:0,requiredFactsNotCollected:0,unclassifiedBlanks:0,
  incompleteRows:0,requiredOptionsMissing:0,requiredComponentsMissing:0,invisibleWrites:0,protectedWrites:0,visualDefects:0};
const reviewRow = {
  familyId: DE_FAMILY, itemId: DE_FAMILY, verdict: 'PASS_COMPLETE_INDEPENDENT', verifiedAtBase: base,
  reviewer: '/root/de-independent-current', sessionIdentity: '/root/de-independent-current',
  familyDirectory: DE_DIRECTORY, routeKeys: [DE_ROUTE], allRequiredObligationsScored: 15,
  obligationSummary: {PASS:15,FAIL:0,NOT_MEASURABLE_HERE:0,BLOCKED_LEGAL_INPUT:0},
  proofObligations: Object.fromEntries(obligations.map(name => [name,{result:'PASS',measured:true}])),
  failedObligations: [], unmeasuredObligations: [],
  nineCounters: {...counters,allZero:true,measuredHere:true},
  rasterAcceptance: {status:'RASTER_PASS',runId:'current-de-test-run',pdfs:2,pages:8},
  sourceBindings: receipt.compositionSources.map(source => ({path:source.path,sha256:source.sha256})),
  builtThisFamily:false,selfVerified:false,packetsSelfVerified:0
};
const review = {schemaVersion:'rcap-verifier-rows/v2',lane:'VF62',laneKind:'independent-verification',
  isIndependentVerification:true,status:'COMPLETED',reviewer:reviewRow.reviewer,sessionIdentity:reviewRow.sessionIdentity,
  verifiedAtBase:base,actualHeadAtReview:base,builtAnything:false,repairsMade:0,packetsSelfVerified:0,rows:[reviewRow]};
const returned = {familyId:DE_FAMILY,verdict:'PASS_COMPLETE_INDEPENDENT',lane:'vf62',isIndependentVerification:true,
  verifiedAtBase:base,evidencePath:CURRENT_REVIEW,failedObligations:[],unmeasuredObligations:[]};
const queueRow = structuredClone(candidateRowsByFamily(json('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')).get(DE_FAMILY)[0]);
queueRow.currentRasterState='RASTER_PASS';
queueRow.rasterReceipt={verdict:'RASTER_PASS',workflowRunId:'current-de-test-run',coversTheWholeFamily:true,
  documentsCovered:['canonical.pdf','boundary.pdf'],documentsNotCovered:[],documentsMeasured:2,pagesMeasured:8,
  boundToCanonicalSha256:report.pdfs.find(item=>item.fixture==='canonical').sha256,
  boundToBoundarySha256:report.pdfs.find(item=>item.fixture==='boundary').sha256};
const rasterEvaluation=acceptedRasterFor(root,[queueRow],{requireReceiptDeclaredCoverage:true});
assert.equal(rasterEvaluation.proven,true);
const currentFamily={familyId:DE_FAMILY,directory:DE_DIRECTORY,routeKeys:[DE_ROUTE]};
const fixture = (doc=review) => ({
  currentFamily,
  rasterEvaluation:structuredClone(rasterEvaluation),
  readBytes:relative=>relative===CURRENT_REVIEW?Buffer.from(JSON.stringify(doc)):read(relative),
  readHistorical:(_commit,relative)=>read(relative)
});

const accepted=assessDeReviewedGuidance(root,returned,fixture());
assert.equal(accepted.eligible,true,accepted.reason);
assert.equal(accepted.terminalTreatment,'GUIDANCE_READY');
assert.equal(accepted.outputs.reduce((sum,item)=>sum+item.pageCount,0),8);
assert.equal(accepted.sourceChecks.length,9);
for(const key of ['reviewAuthoredByIntegrator','packetBytesChanged','runtimeInstalled','filingPermitted','paymentEligible','sponsorshipEligible'])assert.equal(accepted[key],false);
let rejected=0;
const denyReview=(name,mutate)=>{const doc=structuredClone(review);mutate(doc,doc.rows[0]);const result=assessDeReviewedGuidance(root,returned,fixture(doc));assert.equal(result.eligible,false,name);rejected++;};
for(const [name,mutate] of [
  ['partial review',(_d,row)=>row.proofObligations.SERVICE.measured=false],
  ['self review',(d,row)=>{d.builtAnything=true;row.builtThisFamily=true;}],
  ['wrong route',(_d,row)=>row.routeKeys=['other']],
  ['wrong review base',(d,row)=>{d.verifiedAtBase='0'.repeat(40);d.actualHeadAtReview=d.verifiedAtBase;row.verifiedAtBase=d.verifiedAtBase;}],
  ['missing source binding',(_d,row)=>row.sourceBindings.pop()],
  ['changed source binding',(_d,row)=>row.sourceBindings[0].sha256='0'.repeat(64)],
  ['incomplete counters',(_d,row)=>row.nineCounters.visualDefects=1],
  ['unsupported page total',(_d,row)=>row.rasterAcceptance.pages=6]
]) denyReview(name,mutate);
const denyOverride=(name,modify)=>{const options=fixture();modify(options);const result=assessDeReviewedGuidance(root,returned,options);assert.equal(result.eligible,false,name);rejected++;};
denyOverride('changed PDF',options=>{const original=options.readBytes;options.readBytes=relative=>relative.endsWith('/canonical.pdf')?Buffer.concat([read(relative),Buffer.from('changed')]):original(relative);});
denyOverride('changed source',options=>{const target=receipt.compositionSources[0].path,original=options.readBytes;options.readBytes=relative=>relative===target?Buffer.concat([read(relative),Buffer.from('changed')]):original(relative);});
denyOverride('changed decision',options=>{const original=options.readBytes;options.readBytes=relative=>relative===DE_DECISION?Buffer.concat([read(relative),Buffer.from('changed')]):original(relative);});
denyOverride('missing raster',options=>{options.rasterEvaluation={proven:false,row:null,documents:[]};});
denyOverride('partial raster',options=>{options.rasterEvaluation.row.rasterReceipt.coversTheWholeFamily=false;});
denyOverride('raster omits boundary',options=>{options.rasterEvaluation.documents.pop();});
denyOverride('raster page mismatch',options=>{options.rasterEvaluation.row.rasterReceipt.pagesMeasured=6;});
denyOverride('false filing component',options=>{const original=options.readBytes;options.readBytes=relative=>{if(relative!==`${DE_DIRECTORY}/product-wiring.json`)return original(relative);const value=json(relative);value.proposedRepresentation.components[0].role='primary_filing';return Buffer.from(JSON.stringify(value));};});
denyOverride('manifest drops a page',options=>{const original=options.readBytes;options.readBytes=relative=>{if(relative!==`${DE_DIRECTORY}/reports/rendered-artifacts.json`)return original(relative);const value=json(relative);value.artifacts[0].pageManifest.pop();return Buffer.from(JSON.stringify(value));};});

const actualReturn=json('data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json').rows.find(row=>row.familyId===DE_FAMILY&&!row.superseded);
assert.equal(assessDeReviewedGuidance(root,actualReturn),null,'current historical legal hold is not a current guidance pass');
const absentCurrent=assessDeReviewedGuidance(root,returned);
assert.equal(absentCurrent.eligible,false);
assert.match(absentCurrent.reason,/ENOENT/);

const registryPath='data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json';
const old=execFileSync('git',['show',`97d5b4ba933537f8baf0371c7ba99c0dae5e6d00:${registryPath}`]);
const refresh=additiveOtherFamilyRegistry(old,read(registryPath),DE_FAMILY);
assert.deepEqual(refresh.changedFamilyIds,['census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement','de_pardon_expungement-set']);
assert.equal(refresh.unchangedPriorFamilyEntries,72);
const changedMandatory=JSON.parse(read(registryPath));changedMandatory.reconciliation42.families.find(row=>row.familyId===DE_FAMILY).disposition='changed';
assert.throws(()=>additiveOtherFamilyRegistry(old,Buffer.from(JSON.stringify(changedMandatory)),DE_FAMILY));rejected++;
for(const [relative,digest] of Object.entries(originalPdfHashes))assert.equal(hash(read(relative)),digest,'test changed packet PDF');

const currentRaster=acceptedRasterFor(root,candidateRowsByFamily(json('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')).get(DE_FAMILY),{requireReceiptDeclaredCoverage:true});
assert.equal(currentRaster.proven,false);
console.log(JSON.stringify({suite:'de-current-reviewed-guidance',fullyBoundFixtureAccepted:1,rejectionControls:rejected,
  currentIndependentReviewPresent:false,currentRasterProven:false,currentAdmission:'REFUSED_PENDING',currentWholePdfHashes:originalPdfHashes,
  currentPages:8,compositionSourcesChecked:9,registryRefreshMeasured:true,packetRebuilds:0},null,2));
