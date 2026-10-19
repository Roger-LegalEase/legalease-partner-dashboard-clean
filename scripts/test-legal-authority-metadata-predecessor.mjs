import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {legalAuthorityMetadataPredecessor as predecessor} from './lib/legal-authority-metadata-predecessor.mjs';
let checks=0;
for(const name of ['OK-oklahoma','SC-south-carolina']){
 const file='src/lib/rcap-engine/compiled/profiles/'+name+'.json';
 const bytes=fs.readFileSync(file), historical=execFileSync('git',['show','c2246711d82982cc41304c07be54a7d4b5583ce6:'+file]);
 assert(predecessor(file,bytes).equals(historical),'entire historical file, not a new expected hash');checks++;
 assert.throws(()=>predecessor(file,Buffer.from(bytes.toString().replace('This rule took effect on','This rule could take effect on'))),/exact authorized successor/);checks++;
 const changed=JSON.parse(bytes);changed.profileVersion+=' changed';
 assert(!predecessor(file,Buffer.from(JSON.stringify(changed,null,2)+'\n')).equals(historical),'unrelated metadata still fails the historical hash');checks++;
 assert.throws(()=>predecessor(file,Buffer.from(bytes.toString()+' ')),/canonical generated/);checks++;
 assert.equal(predecessor('unrelated.json',bytes),bytes);checks++;
}
console.log(JSON.stringify({status:'PASS',checks,scope:'Two exact authorized sentence reversals; original whole-file expectations unchanged'}));
