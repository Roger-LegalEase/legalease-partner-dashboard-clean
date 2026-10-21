import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {onlyReviewBoundReportChanged} from './review-bound-report-currentness.mjs';
const directory='data/rcap-all50/overlays/census-v1/ca/ca-diversion-seal-set--official-pdf-fill';
const review=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/vfca/rows-final-original-34845934158.json')).rows[0];
const input=()=>({directory,review:structuredClone(review),changedPaths:[`${directory}/reports/actual-writes.json`],readBytes:p=>fs.readFileSync(p)});
test('existing selected CA review binds the exact later report',()=>assert.equal(onlyReviewBoundReportChanged(input()),true));
for(const [name,mutate] of [
 ['packet movement',x=>x.changedPaths.push(`${directory}/fixtures/canonical.pdf`)],
 ['unbound report',x=>delete x.review.measuredActualWritesBinding],
 ['changed report bytes',x=>x.readBytes=()=>Buffer.from('changed')],
 ['failed review',x=>x.review.verdict='FAIL'],
 ['different report path',x=>x.review.measuredActualWritesBinding.path='unrelated'],
 ['missing bytes',x=>x.readBytes=()=>{throw Error('absent');}]
])test(`preserves lapse for ${name}`,()=>{const x=input();mutate(x);assert.equal(onlyReviewBoundReportChanged(x),false);});
test('factory must not hash its downstream national worklist',()=>{
 const source=fs.readFileSync('scripts/grade-a-packet-factory-24h/generate.mjs','utf8');
 assert.doesNotMatch(source,/worklist: `\$\{LC\}\/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST/);
});
