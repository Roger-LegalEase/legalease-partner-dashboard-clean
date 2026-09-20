// Retained executable next command; this recovery inspection did not execute it.
// Run from the repository root. Uses installed inputs; no packet rendering or shared writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=process.cwd();
const {auditMdConditionalCandidate}=await import(pathToFileURL(path.join(root,'scripts/rcap-packet-completeness/md-conditional-native-candidates.mjs')));
const {auditPreparedInputs}=await import(pathToFileURL(path.join(root,'scripts/rcap-packet-completeness/verify-packet-completeness.mjs')));
const familyId='md_10110_conviction-set';
const directory='data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill';
const started=performance.now();
const result=auditMdConditionalCandidate({root,directory,familyId},inputs=>auditPreparedInputs(directory,familyId,inputs));
const output=path.join(path.dirname(fileURLToPath(import.meta.url)),'next-audit-actual-result.json');
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({familyId,result:result.result,counters:result.counters,preparedFixtures:result.preparedFixtures,expectedDiagnosticFixtures:result.expectedDiagnosticFixtures,diagnostics:result.diagnosticResults?.map(d=>({fixture:d.fixture,result:d.result,selectionPermitted:d.selectionPermitted})),reviewedInputFilesMatched:result.reviewedInputFilesMatched,elapsedSeconds:(performance.now()-started)/1000,output,packetRebuilds:0,sharedWrites:0}));
if(result.result!=='PASS_COMPLETE')process.exitCode=1;
