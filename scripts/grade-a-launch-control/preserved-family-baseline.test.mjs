import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifyPreservedFamilyBaseline} from './preserved-family-baseline.mjs';
const before={minimumCaptainSha:'old',families:[{familyId:'A',state:'COMPLETE_PACKET_PROVEN',sourceHashes:['old'],selectedIndependentVerdict:{verdict:'PASS'}}]};
const bytes=Buffer.from(JSON.stringify(before));const hash=crypto.createHash('sha256').update(bytes).digest('hex');
test('regenerated header keeps exact original family baseline',()=>assert.equal(verifyPreservedFamilyBaseline(bytes,hash,{...before,minimumCaptainSha:'new'}),true));
for(const [name,change]of [
 ['identity',q=>q.families[0].familyId='B'],['state',q=>q.families[0].state='SOURCE_READY'],
 ['source',q=>q.families[0].sourceHashes=['new']],['review',q=>q.families[0].selectedIndependentVerdict.verdict='FAIL'],
 ['missing family',q=>q.families=[]],['added family',q=>q.families.push({familyId:'B'})]
])test(`rejects changed ${name}`,()=>{const q=structuredClone(before);change(q);assert.throws(()=>verifyPreservedFamilyBaseline(bytes,hash,q));});
test('rejects wrong historical anchor digest',()=>assert.throws(()=>verifyPreservedFamilyBaseline(bytes,'0'.repeat(64),before)));
