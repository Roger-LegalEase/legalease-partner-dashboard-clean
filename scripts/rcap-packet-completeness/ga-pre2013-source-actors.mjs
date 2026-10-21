/** Four reviewed GCIC fields, not a general exemption for agency-labelled blanks.
 * Source: GCIC instructions and form, effective 07/01/2013, pages 3 and 4.
 * Independent disposition: Chat4 PR239 / CHAT4-GA-02. Its separate guide FAIL
 * remains authoritative; successful field classification is not packet approval.
 * The complete official pages are measured again from current output bytes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const FAMILY = 'ga-nonconv-pre2013-set';
const DOCUMENT = 'GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013';
const SOURCE = '5fe841de263070f192ddfb0e322e41b2c2a97e8d07e7e643e98fdf780aefa1ab';
const SOURCE_PATH = 'reference/chat-parallel-2026-09-07/chat5/GCIC-pre2013-restriction.pdf';
const ROUTE = 'obligation:track-pathway:GA:ga-nonconv-pre2013:non-conviction-record-restriction-through-the-agency-prosecutor-process';
const AGENCY = 'SECTION TWO - ARREST INFORMATION (Completed by Arresting Agency)';
const PROSECUTOR = 'SECTION THREE - PROSECUTING ATTORNEY (Completed by Prosecuting Attorney)';
const FIELDS = Object.freeze({
  'agency.3': {page:3, label:'Arresting Agency Name', owner:'arresting agency official', heading:AGENCY},
  'agency.4': {page:3, label:'Arresting Agency ORI Number', owner:'arresting agency official', heading:AGENCY},
  'prosecutor.2': {page:4, label:'Prosecuting Agency ORI Number', owner:'prosecutor', heading:PROSECUTOR},
  'prosecutor.9': {page:4, label:"No Information Available at Prosecutor's Office; Returned to Arresting Agency for Further Research", owner:'prosecutor', heading:PROSECUTOR}
});
const sha = b => createHash('sha256').update(b).digest('hex');
function readInside(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw Error('unsafe source/output path');
  const base = fs.realpathSync(root), file = path.resolve(base, relative);
  if (fs.lstatSync(file).isSymbolicLink() || !fs.realpathSync(file).startsWith(base + path.sep)) throw Error('source/output escapes checkout');
  return {file, bytes:fs.readFileSync(file)};
}
function pagePixels(file, page) {
  return execFileSync('pdftoppm', ['-f',String(page),'-l',String(page),'-singlefile','-r','72','-gray',file], {timeout:30000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
}
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

/** Per-audit verifier. Memoization lasts only for this audit: changed files are
 * rehashed on every subsequent call to auditFamily, including mutation tests. */
export function createGaPre2013ActorVerifier({root, directory, familyId, fieldMap, census, receipt, rendered}) {
  let measured;
  function measure() {
    if (measured) return measured;
    try {
      if (familyId !== FAMILY || fieldMap.familyId !== FAMILY || receipt?.familyId !== FAMILY
          || rendered?.familyId !== FAMILY || !same(fieldMap.routeKeys,[ROUTE])) throw Error('family/route identity differs');
      const sources = receipt.documents?.filter(d => d.formNumber === DOCUMENT) ?? [];
      const docs = census?.documents?.filter(d => d.formNumber === DOCUMENT) ?? [];
      if (sources.length !== 1 || docs.length !== 1 || receipt.allSourcesExact !== true
          || fieldMap.sourceSha256 !== SOURCE || census.sourceSha256 !== SOURCE
          || docs[0].sourceSha256 !== SOURCE || sources[0].sha256 !== SOURCE
          || sources[0].path !== SOURCE_PATH || sources[0].pages !== 4) throw Error('exact source/census/receipt identity differs');
      const original = readInside(root,SOURCE_PATH);
      if (original.bytes.length !== 449903 || sha(original.bytes) !== SOURCE) throw Error('held source bytes differ');
      const originalPixels = Object.fromEntries([3,4].map(p => [p,pagePixels(original.file,p)]));
      for (const p of [3,4]) {
        const region = fieldMap.protectedRegions?.find(r => r.page === p && same(r.rect,[0,0,612,792]));
        if (!region || region.owner !== (p === 3 ? 'Section Two: Completed by Arresting Agency' : 'Section Three: Completed by Prosecuting Attorney')) throw Error('complete official-page protection missing');
      }
      const artifacts = rendered.artifacts;
      if (!Array.isArray(artifacts) || artifacts.length === 0 || new Set(artifacts.map(a=>a.fixture)).size !== artifacts.length
          || !artifacts.some(a=>a.fixture==='canonical') || !artifacts.some(a=>a.fixture==='boundary')
          || !same([...fieldMap.fixtureReports].sort(),artifacts.map(a=>'reports/'+a.fixture+'.json').sort())) throw Error('fixture/report inventory differs');
      const fixtureDirectory = readInside(root,path.posix.join(directory,'reports/rendered-artifacts.json')).file;
      const fixtureRoot = path.resolve(path.dirname(fixtureDirectory),'../fixtures');
      const actualPdfPaths=fs.readdirSync(fixtureRoot,{recursive:true})
        .filter(n=>String(n).endsWith('.pdf')).map(n=>'fixtures/'+String(n).split(path.sep).join('/')).sort();
      if (!same(actualPdfPaths,artifacts.map(a=>a.path).sort())) throw Error('unlisted or duplicated complete fixture PDF');
      const outputs=[];
      for (const a of artifacts) {
        if (!a.documents?.includes(DOCUMENT)) throw Error('official component missing');
        const relative = path.posix.join(directory,a.path);
        // Reject traversal in the unnormalized input, not just its resolved path.
        if (typeof a.path !== 'string' || a.path.split(/[\\/]/).includes('..') || !a.path.startsWith('fixtures/')) throw Error('unsafe fixture path');
        const output = readInside(root,relative);
        if (sha(output.bytes) !== a.sha256 || output.bytes.length !== a.byteLength) throw Error('output bytes differ: '+a.fixture);
        const report = JSON.parse(readInside(root,path.posix.join(directory,'reports/'+a.fixture+'.json')).bytes);
        if (report.fixture !== a.fixture || report.familyId !== FAMILY || report.output?.sha256 !== a.sha256
            || report.output?.pageCount !== a.pageCount || a.pageCount < 4) throw Error('report/output binding differs: '+a.fixture);
        const pages=[];
        for (const p of [3,4]) {
          const pixels=pagePixels(output.file,p);
          if (!pixels.equals(originalPixels[p])) throw Error('official-owned output page changed: '+a.fixture+'/'+p);
          pages.push({page:p,region:[0,0,612,792],sourceAndOutputRasterSha256:sha(pixels)});
        }
        outputs.push({fixture:a.fixture,sha256:a.sha256,pages});
      }
      measured={verified:true,sourceSha256:SOURCE,sourcePath:SOURCE_PATH,sourceDocument:DOCUMENT,
        sourceActorPages:[3,4],completeOutputPagesCompared:outputs.length*2,outputs,
        basis:'Exact reviewed field, actor and whole-page region on the hash-bound GCIC source; current official-owned output pages are pixel-identical. Not a participant agency-field exemption.'};
    } catch (e) { measured={verified:false,failure:e instanceof Error ? e.message : String(e)}; }
    return measured;
  }
  return blank => {
    const spec=FIELDS[blank.id];
    if (familyId !== FAMILY || blank.document !== DOCUMENT || !spec) return null;
    const fail=failure=>({verified:false,failure});
    if (blank.page !== spec.page || blank.label !== spec.label || blank.owner !== spec.owner
        || blank.sourceActorEvidence !== spec.heading || blank.refusalClass !== 'court_prosecutor_clerk_or_agency_owned'
        || blank.declared?.requiredBeforeFiling === true || blank.declared?.routeDetermined === true
        || (blank.declared?.disposition && blank.declared.disposition !== 'PROTECTED_FIELD')) return fail('field/page/actor declaration differs from exact source');
    const doc=census?.documents?.find(d=>d.formNumber===DOCUMENT);
    const rows=doc?.officialFields?.filter(r=>r.fieldId===blank.id) ?? [];
    if (rows.length !== 1) return fail('source census does not identify this field exactly once');
    const row=rows[0];
    if (row.page!==spec.page || row.label!==spec.label || row.owner!==spec.owner || row.sourceActorEvidence!==spec.heading
        || row.documentId!==DOCUMENT || row.disposition!=='PROTECTED_FIELD') return fail('source census actor/field differs');
    return measure();
  };
}

/** Omitting a mapped official field or calling it a write does not evade the
 * source-owned boundary. This is limited to the exact reviewed family/source. */
export function gaPre2013ActorInventoryProblems(familyId, fieldMap) {
  if (familyId !== FAMILY || fieldMap.familyId !== FAMILY || fieldMap.sourceSha256 !== SOURCE) return [];
  const problems=[];
  for (const id of Object.keys(FIELDS)) {
    const entries=[...(fieldMap.writes ?? []),...(fieldMap.refusals ?? [])].filter(r => (r.fieldId ?? r.field) === id);
    if (entries.length !== 1) problems.push({counter:'unclassifiedBlanks',field:id,why:'Exact-source official field must appear once in the write/refusal partition.'});
  }
  for (const row of fieldMap.writes ?? []) {
    if (row.documentId === DOCUMENT && ([3,4].includes(row.page) || FIELDS[row.fieldId ?? row.field]))
      problems.push({counter:'protectedWrites',field:row.fieldId ?? row.field,why:'The source reserves this entire page to the agency or prosecutor, not participant preparation.'});
  }
  return problems;
}
