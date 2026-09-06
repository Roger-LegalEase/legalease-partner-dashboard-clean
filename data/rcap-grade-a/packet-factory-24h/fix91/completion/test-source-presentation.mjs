// Isolated mutations of real current packet evidence; never edit the family.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { auditFamily } from '../../../../../scripts/rcap-packet-completeness/verify-packet-completeness.mjs';
import { classifyBlank } from '../../../../../scripts/rcap-packet-completeness/completeness-contract.mjs';
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const family = 'data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill';
const current = auditFamily(family, 'ne-setaside-custodial-set');
assert.equal(current.result, 'PASS_COMPLETE');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fix91-source-presentation-'));
const testFamily = path.relative(root, scratch);
const jsonFiles = ['production-field-map.json', 'field-census.census-v1.json', 'source-receipt.json', 'approval-request.json', 'reports/actual-writes.json', 'reports/rendered-artifacts.json'];
const originals = Object.fromEntries(jsonFiles.map(name => [name, JSON.parse(fs.readFileSync(path.join(root, family, name)))]));
fs.mkdirSync(path.join(scratch, 'reports')); fs.symlinkSync(path.join(root, family, 'fixtures'), path.join(scratch, 'fixtures'));
fs.copyFileSync(path.join(root, family, 'participant-instructions.md'), path.join(scratch, 'participant-instructions.md'));
const rows = [];
function check(name, mutate, counter) {
  const docs = structuredClone(originals); mutate(docs);
  for (const [file, value] of Object.entries(docs)) fs.writeFileSync(path.join(scratch, file), JSON.stringify(value));
  const actual = auditFamily(testFamily, 'isolated-mutation');
  if (counter) assert.ok(actual.counters[counter] > current.counters[counter], `${name}: defect was not detected`);
  else assert.equal(actual.result, 'PASS_COMPLETE', `${name}: valid case refused`);
  rows.push({ name, result: 'PASS', auditResult: actual.result, counter: counter ?? null });
}
const map = docs => docs['production-field-map.json'].maps.find(m => m.formNumber === 'CC-6-11');
const missing = 'knownRequiredFieldsMissing', unknown = 'unclassifiedBlanks';
try {
  check('current evidence copied unchanged', () => {});
  check('missing canonical companion write', d => { map(d).canonicalWrites = map(d).canonicalWrites.filter(w => w.field !== 'TYPEOFCOURTRESULTS'); }, missing);
  check('missing boundary companion write', d => { map(d).boundaryWrites = map(d).boundaryWrites.filter(w => w.field !== 'TYPEOFCOURTRESULTS'); }, missing);
  check('wrong companion fact', d => { map(d).canonicalWrites.find(w => w.field === 'TYPEOFCOURTRESULTS').factId = 'participant.email'; }, missing);
  check('write in another document does not complete this caption', d => { d['reports/actual-writes.json'].documents[0].formNumber='unrelated-form'; }, missing);
  check('nonprinting companion cannot count as delivered', d => { d['field-census.census-v1.json'].documents[0].documentPolicy.sourceFieldEvidence.TYPEOFCOURTRESULTS.annotationFlags=[0]; }, missing);
  check('unmeasured write report cannot count as evidence', d => { d['reports/actual-writes.json'].derivedFromArtifactBytes=false; }, missing);
  check('write report without actual visible ink', d => { d['reports/actual-writes.json'].documents[0].actualWrites.find(w => w.field === 'TYPEOFCOURTRESULTS').visibleInArtifactBytes = false; }, missing);
  check('wrong source option text', d => { const w=d['reports/actual-writes.json'].documents[0].actualWrites.find(w => w.field === 'TYPEOFCOURTRESULTS'); w.expected=w.drawnText='IN THE COUNTY COURT OF'; }, missing);
  check('stale rendered bytes', d => { d['reports/rendered-artifacts.json'].artifacts[0].sha256='0'.repeat(64); }, missing);
  check('source hash mismatch', d => { map(d).canonicalRefusals.find(w => w.field === 'TYPEOFCOURTDROPDOWN').sourcePresentation.sourceSha256='0'.repeat(64); }, missing);
  check('self-declared verified flag cannot bypass evidence', d => { const p=map(d).canonicalRefusals.find(w => w.field === 'TYPEOFCOURTDROPDOWN').sourcePresentation; p.verified=true; p.representedByField='unknown'; }, missing);
  check('contradictory participant-blank declaration fails closed', d => { map(d).canonicalRefusals.find(w=>w.field==='TYPEOFCOURTDROPDOWN').requiredBeforeFiling=true; }, unknown);
  check('ordinary participant text field cannot be a viewer button', d => { map(d).canonicalRefusals.push({field:'Text2',requiredBeforeFiling:false,sourcePresentation:{kind:'viewer_button',sourceField:'Text2',sourceSha256:d['source-receipt.json'].documents[0].sha256}}); }, unknown);
  check('ordinary unknown blank still fails', d => { map(d).canonicalRefusals.push({field:'unmapped-real-blank',effectiveLabel:'Unidentified participant entry',requiredBeforeFiling:false,completenessClass:null}); }, unknown);
  check('missing held name still fails', d => { map(d).canonicalRefusals.push({field:'missing-name',effectiveLabel:'Full name',factId:'participant.full_legal_name',requiredBeforeFiling:true,completenessClass:null}); }, missing);
  check('same actual field name remains available even beside footer', d => { map(d).canonicalRefusals.push({field:'defendant',effectiveLabel:'Document footer',sectionHeading:'Document footer',requiredBeforeFiling:true,completenessClass:null}); }, missing);
  check('specific duplicate printed label still denotes held fact', d => { map(d).canonicalWrites[0].effectiveLabel='Unique case identifier'; map(d).canonicalRefusals.push({field:'other-case-box',effectiveLabel:'Unique case identifier',requiredBeforeFiling:true,completenessClass:null}); }, missing);
  check('manual county companion cannot disappear', d => { map(d).canonicalRefusals.find(w=>w.field==='DROPDOWNCOUNTY2').requiredBeforeFiling=false; }, unknown);
  check('unbound instruction reference still fails', d => { d['field-census.census-v1.json'].documents.find(x=>x.formNumber==='CC-6-11A').documentPolicy.referenceOnly=false; }, unknown);
  check('source presentation cannot excuse an unmade route election', d => { d['production-field-map.json'].maps.find(m=>m.formNumber==='DC-1-15').canonicalRefusals.find(r=>r.field==='Button63.0').routeDetermined=true; }, 'requiredOptionsMissing');
  for (const field of ['Signature','Date of signature','Judge']) assert.equal(classifyBlank({label:field},'',null,{sourcePresentation:{kind:'viewer_button',verified:true}}).disposition,'PROTECTED_FIELD');
  assert.equal(classifyBlank({label:'Unidentified participant entry'},'',null,{requiredBeforeFiling:false}).disposition,'UNCLASSIFIED_BLANK');
  rows.push({name:'protected fields and undeclared defaults preserved',result:'PASS'});
  // Compare two real unaffected families using the exact pre-change evaluator,
  // with its CLI tail excluded so this does not launch a national audit.
  const oldDir=path.join(scratch,'baseline');fs.mkdirSync(oldDir);
  const base='a49d7aac7';
  for (const file of ['completeness-contract.mjs','verify-packet-completeness.mjs']) {
    let code=execFileSync('git',['show',`${base}:scripts/rcap-packet-completeness/${file}`],{cwd:root,encoding:'utf8'});
    if(file.startsWith('verify-')) code=code.split('// ---- enumerate')[0].replace('const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");',`const ROOT = ${JSON.stringify(root)};`)+'\nexport {auditFamily};\n';
    fs.writeFileSync(path.join(oldDir,file),code);
  }
  const old=await import(pathToFileURL(path.join(oldDir,'verify-packet-completeness.mjs')));
  for (const [state,name] of [['nj','nj-arrest-no-conviction-set'],['nc','nc-146-dismissal-petition-set']]) {
    const dir=`data/rcap-all50/overlays/census-v1/${state}/${name}--official-pdf-fill`;
    assert.ok(fs.existsSync(path.join(root,dir,'production-field-map.json')), 'unaffected family is missing');
    assert.deepEqual(auditFamily(dir,name),old.auditFamily(dir,name));
    rows.push({name:`unchanged real family ${name}`,result:'PASS'});
  }
  assert.equal(rows.filter(r=>r.name.startsWith('unchanged real family')).length,2,'both unaffected-family comparisons must execute');
  console.log(JSON.stringify({status:'PASS',localOnly:true,testDoubles:[],mutationFilesIsolated:true,currentResult:current.result,checks:rows},null,2));
} finally { fs.rmSync(scratch,{recursive:true,force:true}); }
