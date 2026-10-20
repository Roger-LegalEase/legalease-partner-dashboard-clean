import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
const directory='data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading';
test('instructions identify component titles and continuations without route footers',()=>{
 const text=fs.readFileSync(`${directory}/participant-instructions.md`,'utf8');
 assert.doesNotMatch(text,/Every page states its own route in its footer/);
 assert.match(text,/Each component's first-page title names its route/);
 assert.match(text,/Continuation pages have no route footer; keep each component's pages together, in order\./);
});
test('route metadata describes the same locations',()=>{
 const map=JSON.parse(fs.readFileSync(`${directory}/production-field-map.json`));
 assert.match(map.routeSelectionNote,/first-page title names its route/);
 assert.match(map.routeSelectionNote,/Continuation pages have no route footer; keep each component's pages together, in order\./);
 for(const row of map.routeSelectionsMade){assert.match(row.statedOn,/Continuation pages have no route footer; keep each component's pages together, in order\./);assert.match(row.statedOn,/first-page title/);}
});
test('existing PDFs do not print the promised route footer',()=>{
 const files=fs.readdirSync(`${directory}/fixtures`,{recursive:true}).filter(f=>f.endsWith('.pdf'));
 assert.ok(files.length>0);
 for(const file of files)assert.doesNotMatch(execFileSync('pdftotext',[path.join(directory,'fixtures',file),'-'],{encoding:'utf8'}),/^\s*Route:/m);
});
