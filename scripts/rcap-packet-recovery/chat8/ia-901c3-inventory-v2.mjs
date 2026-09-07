/** Source-bound external-report ledger for the existing Form 2 generator.
 * No record upload, authentication, invented report, or automatic item-9 mark.
 * Inventory entries are read from actual generator component files, not answers.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument} from 'pdf-lib';
import {ROOT,OUTPUT,SOURCE,SOURCE_SHA256,sha256,pretty,validateFacts} from './ia-901c3.mjs';
import {assessForm2Report} from './ia-901c3-report-guard-v2.mjs';
export const REPORT_RULE=Object.freeze({status:'source_bound',maxAgeDays:30,inclusive:true,sourceSha256:SOURCE_SHA256,sourceLocator:'https://www.iowacourts.gov/collections/867/files/1965/embedDocument/ : August 2024 Form 2 item 9; current issuer three pages inspected 2026-09-07'});
export async function writeForm2Inventory(outDir=path.join(ROOT,OUTPUT)) {
 const source=await fs.readFile(path.join(ROOT,SOURCE));if(sha256(source)!==SOURCE_SHA256)throw Error('Form 2 source drift');
 const manifest=JSON.parse(await fs.readFile(path.join(outDir,'reports/rendered-artifacts.json'),'utf8'));
 const rows=[];
 for(const packet of manifest.packets) {
  const facts=JSON.parse(await fs.readFile(path.join(outDir,'fixtures',packet.fixture+'.json'),'utf8'));
  const checked=validateFacts(facts);const report=JSON.parse(await fs.readFile(path.join(outDir,'reports',packet.fixture+'.json'),'utf8'));
  if(report.actualWrites.some(x=>x.fieldId==='2.86-2.09'))throw Error('Item 9 may not declare an external attachment this generator does not supply');
  const combined=await fs.readFile(path.join(outDir,packet.relativePath));if(sha256(combined)!==packet.sha256)throw Error('Combined PDF drift');
  const inventory=[];
  for(const c of packet.documents) {
   // Do not infer a report from an arbitrary filename, role flag or participant answer.
   if(!['form-2','additional-alternate-names','participant-instructions'].includes(c.id))throw Error('Unrecognized generator component; no external-report substitution');
   const relative=`components/${packet.fixture}/${c.id}.pdf`,bytes=await fs.readFile(path.join(outDir,relative));
   const d=await PDFDocument.load(bytes,{updateMetadata:false});
   if(sha256(bytes)!==c.sha256||d.getPageCount()!==c.pages)throw Error('Component bytes differ from the assembled input manifest');
   inventory.push({id:c.id,path:relative,sha256:sha256(bytes),byteCount:bytes.length,pages:d.getPageCount(),role:'other',inventorySource:'assembler_input_bytes'});
  }
  const h=facts.historyReport;
  const receipt={status:h.availability==='available'?'received':h.availability,issuedOn:h.issuedOn,answerSource:'participant'};
  const assessment=assessForm2Report({receipt,filingAssessmentDate:facts.filingDate,freshnessRule:REPORT_RULE,attachmentInventory:inventory.map(({role,sha256,byteCount,inventorySource})=>({role,sha256,byteCount,inventorySource}))});
  if(assessment.reportInAssembly||assessment.mayPopulateAttachmentPresenceDeclaration)throw Error('No external report may be invented');
  rows.push({fixture:packet.fixture,combinedPdfSha256:packet.sha256,participantReportedReceipt:receipt,participantReportedSignedRelease:h.releaseSigned,issueDateIsNotVerified:true,actualAssemblerInputInventory:inventory,returnedReportAssessment:assessment,sourcePrintedAttachmentCheckbox:'LEFT_BLANK',signedReleaseReadyByParticipantReport:h.releaseSigned===true,timingReadyByParticipantReport:checked.historyReadyByParticipantReport,externalRecordAuthenticated:false,recordUploadOrInspectionPerformed:false,filingReady:false,stoppingReasons:[...(assessment.status==='DRAFT_NEEDS_REPORT_ATTACHMENT'?['ATTACH_ACTUAL_RETURNED_REPORT']: [assessment.status]),...(h.releaseSigned!==true?['SIGNED_RELEASE_NOT_CONFIRMED']:[]),...(checked.exactAnniversary?['MORE_THAN_EIGHT_YEARS_NOT_MET']:[])]});
 }
 const ledger={familyId:'ia-901c3-set',version:2,sourceRule:REPORT_RULE,missingExternalComponent:'returned-dci-history',externalRecordInvented:false,statementsAreNotAuthenticityProof:true,fixtures:rows};
 await fs.writeFile(path.join(outDir,'reports/assembler-input-inventory.json'),pretty(ledger));
 return ledger;
}
