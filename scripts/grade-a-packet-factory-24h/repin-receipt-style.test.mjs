import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {composeRefreshedReceipt, planReceipt, readsAsUnmoved} from './repin-lapsed-source-identities.mjs';
// The planner writes a receipt back in the style it already has: two-space JSON, or two-space JSON with
// non-ASCII escaped as \uXXXX. Fixture: WA clean-tracks' receipt before its census re-pin (blob c9494817,
// read from git so the live re-pinned receipt cannot move it), with a "§" added to a field no pin touches.
const familyId='rcap-wa-custom-pleading-clean-tracks';
const directory='data/rcap-all50/overlays/census-v1/wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading';
const receipt=JSON.parse(execFileSync('git',['cat-file','blob','c949481755db7228b52e597a3b1d333e8ad73bef'],{encoding:'utf8'}));
receipt.legalName=`${receipt.legalName} §`;
const plain=value=>`${JSON.stringify(value,null,2)}\n`;
const escaped=value=>plain(value).replace(/[\u007f-￿]/g,c=>`\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
const census='data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json';
const compose=beforeText=>{
  const plan=planReceipt({familyId,directory,receiptPath:`${directory}/source-receipt.json`,beforeText,on:new Date('2026-10-20T12:00:00Z')});
  assert.equal(plan.outcome,'REFRESHABLE',plan.why);
  return composeRefreshedReceipt(plan).text;
};
// Every byte outside the refreshed census pin is the receipt's own: put the old pin back and the text is the input.
const restoredPin=(text,style)=>{const after=JSON.parse(text);const i=after.committedRecords.findIndex(p=>p.pathInRepository===census);after.committedRecords[i]=receipt.committedRecords[i];return style(after);};
test('an escaped receipt is written back escaped, byte for byte outside the refreshed pin',()=>{
  const before=escaped(receipt),text=compose(before);
  assert.ok(text.includes('\\u00a7'));assert.ok(!text.includes('§'));
  assert.equal(text,escaped(JSON.parse(text)));
  assert.equal(restoredPin(text,escaped),before);
  assert.ok(readsAsUnmoved(before,text).ok);
});
test('a plain receipt stays plain, and both styles carry the same refreshed receipt',()=>{
  const before=plain(receipt),text=compose(before);
  assert.ok(text.includes('§'));assert.ok(!text.includes('\\u00a7'));
  assert.equal(text,plain(JSON.parse(text)));
  assert.equal(restoredPin(text,plain),before);
  assert.deepEqual(JSON.parse(text),JSON.parse(compose(escaped(receipt))));
});
test('any other formatting is refused, not reformatted',()=>{
  for(const beforeText of [`${JSON.stringify(receipt,null,4)}\n`,plain(receipt).trimEnd(),`${JSON.stringify(receipt)}\n`]){
    const plan=planReceipt({familyId,directory,receiptPath:`${directory}/source-receipt.json`,beforeText});
    assert.equal(plan.outcome,'REFUSED');assert.match(plan.why,/not two-space-indented JSON/);
  }
});
