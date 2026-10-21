import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {createRequire} from 'node:module';
import {scanBytesForActiveContent} from '../../../../scripts/rcap-official-forms/rcap-active-content.mjs';
const require=createRequire(import.meta.url);const {PDFDocument}=require('pdf-lib');
const base='data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill';
const artifacts=JSON.parse(fs.readFileSync(base+'/reports/rendered-artifacts.json')).artifacts;const results=[];
for(const a of artifacts){const b=fs.readFileSync(a.file);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);const d=await PDFDocument.load(b);assert.equal(d.getPageCount(),a.pageCount);assert.equal(d.getForm().getFields().length,0);const scan=await scanBytesForActiveContent(b);results.push({fixture:a.fixture,file:a.file,sha256:a.sha256,pageCount:d.getPageCount(),formFieldCount:0,activeContentScan:scan});}
fs.writeFileSync('data/rcap-grade-a/packet-factory-24h/vfutnext1/structure-measurements.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
