import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { conditionalPacketDocuments } from './conditional-raster-documents.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = 'data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill';
const fixtures = path.join(root, dir, 'fixtures');
const original = JSON.parse(fs.readFileSync(path.join(root,dir,'reports/rendered-artifacts.json')));
const call = report => conditionalPacketDocuments({report, fixtures, root});
const selected = call(original);
assert.equal(selected.length, 8);
assert.equal(new Set(selected.map(d => d.name)).size, 8);
assert.equal(selected.filter(d => d.role === 'canonical').length, 4);
let pages = 0;
for (const d of selected) {
  const pdf = await PDFDocument.load(fs.readFileSync(path.join(fixtures,d.name)), {updateMetadata:false});
  assert.equal(pdf.getPageCount(), d.declaredPageCount); pages += pdf.getPageCount();
}
assert.equal(pages, 44);
const first = d => d.pdfs.find(x => x.role === 'conditional_assembled_packet');
const mutations = [
 d => first(d).sha256 = '0'.repeat(64),
 d => first(d).byteLength++,
 d => first(d).baseFixture = 'maybe',
 d => first(d).branch = '../escape',
 d => first(d).file = '/tmp/not-a-repository-file.pdf',
 d => first(d).file = 'reference/north-carolina/AOC-G-106-2024-11.pdf',
 d => first(d).file = dir+'/fixtures/missing.pdf',
 d => first(d).pageCount = 0,
 d => d.pdfs.push(structuredClone(first(d))),
 d => d.pdfs = d.pdfs.filter(x => x.fixture !== 'canonical-no_fee'),
 d => d.pdfs = d.pdfs.filter(x => x.role !== 'conditional_assembled_packet'),
 d => first(d).role = 'not-recognized',
];
let caught=0;
for(const mutate of mutations) { const d=structuredClone(original);mutate(d);assert.throws(()=>call(d));caught++; }
assert.deepEqual(call(original), selected, 'Mutation tests must not change the original inventory');
if(process.argv.includes('--generated')) {
 const q=JSON.parse(fs.readFileSync(path.join(root,'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')));
 const row=q.rows.find(r=>r.familyId==='nc_146_dismissal_petition-set');
 assert.ok(row, 'NC must remain eligible');
 assert.equal(row.documents.length, 10);
 assert.equal(row.documents.reduce((n,d)=>n+d.pageCount,0),60);
 assert.equal(row.documents.filter(d=>d.conditionalPacketBranch).length,8);
 assert.equal(row.coverage.documents.length,5);
 assert.equal(row.coverage.complete,true);
 for(const d of selected) assert.ok(row.documents.some(r=>r.name===d.name && r.role===d.role));
 assert.notEqual(row.documentsDigest,'2de39253b00245f2c36970c3ef3bdb90ba427d6cc54e122bd5c588c584ff7820','The old partial receipt must not match the widened set');
}
console.log(JSON.stringify({selectablePackets:8,selectablePages:44,diagnosticPages:16,allPages:60,admissionNegativeControlsCaught:caught,generatedCoverageChecked:process.argv.includes('--generated'),grantsApproval:false}));
