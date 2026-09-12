import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { PDFDocument, PDFName } from 'pdf-lib';
import { makeCorpusEntryResolver } from './lib/corpus-index-paths.mjs';
import { flattenedWidgets, drawnAt } from './rcap-official-forms/pdf-flattened-widgets.mjs';
import { describeKansasAppearance, measureKansasDocument } from './rcap-official-forms/kansas-byte-measurement.mjs';
import { statedSubjectExemptions } from './rcap-official-forms/rcap-field-semantics.mjs';

const families = ['conviction','diversion','prostitution-coercion','specialty-court'];
const index = JSON.parse(fs.readFileSync('data/rcap-all50/local-source-corpus-index.json'));
const resolver = makeCorpusEntryResolver(index, { repoRoot:process.cwd(), masterLibraryRoot:process.env.MASTER_LIBRARY_SOURCE_DIR });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p));
const modules = await Promise.all(families.map(f => import(`./build-census-v1-ks-21-6614-${f}-set.mjs`)));

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
