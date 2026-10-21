import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { PDFDocument, PDFName } from 'pdf-lib';
import { makeCorpusEntryResolver } from './lib/corpus-index-paths.mjs';
import { flattenedWidgets, drawnAt } from './rcap-official-forms/pdf-flattened-widgets.mjs';
import { extractTextItems } from './rcap-official-forms/rcap-pdf-anchor-capture.mjs';
import { describeKansasAppearance, measureKansasDocument } from './rcap-official-forms/kansas-byte-measurement.mjs';
import { KANSAS_SUBMITTED_BY_DOCUMENTS } from './rcap-official-forms/kansas-shared-policy.mjs';
import { statedSubjectExemptions } from './rcap-official-forms/rcap-field-semantics.mjs';

const families = ['conviction','diversion','prostitution-coercion','specialty-court'];
const index = JSON.parse(fs.readFileSync('data/rcap-all50/local-source-corpus-index.json'));
const resolver = makeCorpusEntryResolver(index, { repoRoot:process.cwd(), masterLibraryRoot:process.env.MASTER_LIBRARY_SOURCE_DIR });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p));
const modules = await Promise.all(families.map(f => import(`./build-census-v1-ks-21-6614-${f}-set.mjs`)));

const submittedByHeldFacts = {
  NamePrint: 'participant.full_legal_name',
  'Address 1': 'participant.street_address',
  'City State Zip': 'participant.city_state_zip',
  Telephone: 'participant.phone',
  'Email Address': 'participant.email'
};

test('all four families preserve the source actor boundary in both proposed orders', () => {
  let heldWrites = 0;
  for (const { SPEC } of modules) {
    for (const documentId of KANSAS_SUBMITTED_BY_DOCUMENTS) {
      for (const [field, factId] of Object.entries(submittedByHeldFacts)) {
        const policy = SPEC.policy[`${documentId}:${field}`];
        assert.equal(policy.kind, 'narrative');
        assert.equal(policy.factId, factId);
        assert.match(policy.why, /source prints this neutral value in the Submitted by block/);
        assert.equal(policy.standardFontFallback ?? null, field === 'Address 1' ? 'Times-Roman' : null);
        heldWrites += 2;
      }
      assert.equal(SPEC.policy[`${documentId}:Supreme Court Number`].kind, 'notApplicable');
      assert.equal(SPEC.policy[`${documentId}:Address 2`].kind, 'notApplicable');
      assert.equal(SPEC.policy[`${documentId}:Fax Number`].kind, 'optional');
      for (const field of ['NamePrint_2','Supreme Court Number_2','Address 1_2','Address 2_2','City State Zip_2','Telephone_2','Fax Number_2','Email Address_2']) {
        assert.equal(SPEC.policy[`${documentId}:${field}`].kind, 'protected', `${SPEC.familyId}/${documentId}/${field}: prosecutor Approved by field`);
      }
    }
    assert.ok(SPEC.deliberatelyBlank.some((line) => line.includes('Signature of Defendant/Defendant’s Attorney')
      && line.includes('Follow the court’s instructions on whether and when')),
      `${SPEC.familyId}: Submitted by signature must be handed back`);
  }
  // The pre-repair maps classified all 80 fixture occurrences as protected.
  // This assertion fails that old classification without weakening any gate.
  assert.equal(heldWrites, 80);
});

test('Kansas opening request exception does not exempt court findings', () => {
  assert.ok(statedSubjectExemptions('Item at the head of the petition — expungement of my CONVICTION and related arrest records (selection)').has('disposition_or_hearing'));
  assert.equal(statedSubjectExemptions('The court finds the conviction is expunged (selection)').size,0);
  assert.equal(statedSubjectExemptions('expungement of my criminal history is in the interests of justice').size,0);
});

test('ink reader distinguishes path construction, string operands and actual painting', async () => {
  const pdf = await PDFDocument.create();
  const describe = text => describeKansasAppearance(pdf.context.flateStream(text));
  assert.equal(describe('0 0 10 10 re W n <> Tj').paintingOperators,0);
  assert.equal(describe('(S f B) Tj').paintingOperators,0);
  assert.equal(describe('(S f B) Tj').drawnText,'S f B');
  assert.equal(describe('0 0 10 10 re S').paintingOperators,1);
});

for (const mod of modules) {
  const { SPEC, FIXTURES, runFamily } = mod;
  test(`${SPEC.familyId}: exact sources and field census bind`, async () => {
    assert.equal((await runFamily(['--check'])).status,'CHECK_ONLY');
  });
  test(`${SPEC.familyId}: rejects pending felony without writing`, async () => {
    const old = FIXTURES.canonical['answers.pending_felony_proceeding'];
    try {
      FIXTURES.canonical['answers.pending_felony_proceeding'] = true;
      await assert.rejects(runFamily(['--check']));
    } finally { FIXTURES.canonical['answers.pending_felony_proceeding'] = old; }
  });
  test(`${SPEC.familyId}: rejects contradictory programme route`, async () => {
    const old = FIXTURES.canonical['answers.specialty_court_completion'];
    try {
      FIXTURES.canonical['answers.specialty_court_completion'] = !old;
      await assert.rejects(runFamily(['--check']));
    } finally { FIXTURES.canonical['answers.specialty_court_completion'] = old; }
  });
  for (const fixture of ['canonical','boundary']) test(`${SPEC.familyId}/${fixture}: reread assembled current bytes`, async () => {
    const reports = read(`${SPEC.outDir}/reports/rendered-artifacts.json`);
    const map = read(`${SPEC.outDir}/production-field-map.json`);
    const bytes = fs.readFileSync(`${SPEC.outDir}/fixtures/${fixture}.pdf`);
    assert.equal(sha(bytes),reports.pdfs.find(p=>p.fixture===fixture).sha256);
    const packet = await PDFDocument.load(bytes,{ignoreEncryption:true,updateMetadata:false});
    assert.equal(packet.getPageCount(),reports.pdfs.find(p=>p.fixture===fixture).pageCount);
    assert.equal(packet.getForm().getFields().length,0);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'pf20-assembled-measurement-'));
    try {
      for (const m of map.maps) {
        const sourceEntry = index.entries.find(e=>e.sha256===m.boundSource.sha256);
        const sourceBytes = fs.readFileSync(resolver.resolve(sourceEntry));
        assert.equal(sha(sourceBytes),m.boundSource.sha256);
        const pages = reports.pageManifests[fixture].filter(p=>p.documentId===m.documentId);
        assert.equal(pages.length,m.boundSource.pages);
        const component = await PDFDocument.create();
        for (const page of await component.copyPages(packet,pages.map(p=>p.packetPage-1))) component.addPage(page);
        const output = Buffer.from(await component.save({useObjectStreams:false,updateMetadata:false}));
        const file = path.join(tmp,'component.pdf');fs.writeFileSync(file,output);
        const appearances = await flattenedWidgets(file);
        const rows = [...m[`${fixture}Writes`],...m[`${fixture}Refusals`]];
        const measured = await measureKansasDocument(output,sourceBytes,rows,appearances);
        assert.deepEqual(measured.violations,[]);
        assert.equal(measured.placement.appearancesNotPlacedAtTheirOwnSourceWidget,0);
        for (const row of m[`${fixture}Writes`].filter(r=>r.decision==='write')) {
          for (const widget of row.widgets) assert.equal(drawnAt(appearances,widget).map(a=>a.text).join('').trim(),String(FIXTURES[fixture][row.factId]));
        }
        const submitted = m[`${fixture}Writes`].filter(r=>r.effectiveLabel.includes('Submitted by block'));
        if (KANSAS_SUBMITTED_BY_DOCUMENTS.includes(m.documentId)) {
          assert.equal(submitted.length,5,`${SPEC.familyId}/${fixture}/${m.documentId}: exactly five held Submitted by values`);
          for (const row of submitted) {
            assert.equal(drawnAt(appearances,row.widgets[0]).map(a=>a.text).join('').trim(),String(FIXTURES[fixture][row.factId]));
          }
          if (fixture === 'boundary') {
            const streetRow = submitted.find((row) => row.field === 'Address 1');
            const componentDoc = await PDFDocument.load(output,{ignoreEncryption:true,updateMetadata:false});
            const exactStreetRuns = extractTextItems(componentDoc.getPage(streetRow.widgets[0].page-1))
              .filter((item) => item.text === FIXTURES.boundary['participant.street_address']);
            assert.equal(exactStreetRuns.length,1,`${SPEC.familyId}/${m.documentId}: exact boundary street is one visible run`);
            assert.equal(exactStreetRuns[0].baseFont,'Times-Roman');
            assert.equal(exactStreetRuns[0].size,6);
            assert.equal(exactStreetRuns[0].metricsExact,true);
          }
          const submittedBlanks = m[`${fixture}Refusals`].filter(r=>r.effectiveLabel.includes('Submitted by block'));
          assert.deepEqual(submittedBlanks.map(r=>r.field).sort(),['Address 2','Fax Number','Supreme Court Number']);
          const approved = m[`${fixture}Refusals`].filter(r=>r.effectiveLabel.includes('Approved by block'));
          assert.equal(approved.length,8);
          assert.ok(approved.every(r=>r.category==='court_prosecutor_clerk_or_agency_owned'));
        }
        // Positive control: an actual selected route mark must be caught if
        // the same rectangle is protected. No invented zero can pass this.
        const selected = rows.find(r=>r.decision==='select');
        if (selected) {
          const mutated = rows.map(r=>r===selected?{...r,decision:'refuse'}:r);
          const negative = await measureKansasDocument(output,sourceBytes,mutated,appearances);
          assert.ok(negative.violations.some(v=>v.field===selected.field));
          // Remove its actual painted appearance and prove an empty selected
          // control is refused by the byte reader.
          const selectedAt = drawnAt(appearances,selected.widgets[0])[0];
          const changed = await PDFDocument.load(output,{ignoreEncryption:true,updateMetadata:false});
          const objects = changed.getPages()[selectedAt.page-1].node.Resources().lookup(PDFName.of('XObject'));
          const ref = objects.get(PDFName.of(selectedAt.appearance));
          const stream = changed.context.lookup(ref);
          const blank = changed.context.flateStream('q Q',Object.fromEntries(stream.dict.entries().filter(([k])=>!['/Length','/Filter'].includes(k.toString())).map(([k,v])=>[k.toString().slice(1),v])));
          changed.context.assign(ref,blank);
          const absent = await measureKansasDocument(Buffer.from(await changed.save()),sourceBytes,rows,appearances);
          assert.ok(absent.violations.some(v=>v.field===selected.field && v.defect.includes('no added ink')));
        }
      }
    } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
  });
}

test('specialty route does not collect or require the two-year felony lookback', () => {
  const { FIXTURES, SPEC } = modules[3];
  assert.ok(!Object.hasOwn(FIXTURES.canonical,'answers.felony_in_past_two_years'));
  assert.ok(SPEC.documents.some(d=>d.role==='fee_waiver'));
  assert.equal(SPEC.policy['KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022:Check Box8'].kind,'select');
  for (const name of ['Check Box3','Check Box4','Check Box5','Check Box6','Check Box7']) assert.equal(SPEC.policy[`KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022:${name}`].kind,'notApplicable');
});
