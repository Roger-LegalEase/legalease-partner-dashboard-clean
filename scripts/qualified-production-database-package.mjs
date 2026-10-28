import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readQualifiedDatabaseTransactions,hash} from './qualified-production-database.mjs';
export const QUALIFIED_DATABASE_PACKAGE_DIRECTORY='scripts/fixtures/production-wwt-two-migration-package';
export const QUALIFIED_DATABASE_PACKAGE_PATH=QUALIFIED_DATABASE_PACKAGE_DIRECTORY+'/PACKAGE.PROPOSED.NOT-EXECUTED.json';
// Original absolute paths remain custody annotations; runtime reads only identical pinned basenames in this frozen package.
export function readQualifiedDatabasePackage(root,manifestSha256){
 assert.match(manifestSha256??'',/^[a-f0-9]{64}$/);
 const directory=path.join(root,QUALIFIED_DATABASE_PACKAGE_DIRECTORY),manifestBytes=fs.readFileSync(path.join(root,QUALIFIED_DATABASE_PACKAGE_PATH));assert.equal(hash(manifestBytes),manifestSha256);
 const manifest=JSON.parse(manifestBytes);assert.equal(manifest.schemaVersion,'wwt-two-source-migration-guarded-package/v1');assert.equal(manifest.projectRef,'wwtwtsmywnckfkdaqqeg');assert.equal(manifest.applicationSha,'4c189b682d0a9225a21b9fdf8a2ebc50500029d6');assert.equal(manifest.noAutomaticInverse,true);assert.equal(manifest.sqlExecuted,false);assert.equal(manifest.sourceEffectExpectationsAreNativeWwtPostimages,false);
 const read=ref=>{assert.match(ref.sha256??'',/^[a-f0-9]{64}$/);const file=path.join(directory,path.basename(ref.path));assert.equal(fs.realpathSync(file),file,'No package path indirection');const bytes=fs.readFileSync(file);assert.equal(hash(bytes),ref.sha256,'Exact package component '+path.basename(ref.path));return bytes;};
 assert.deepEqual(manifest.readers.map(r=>r.key),['core','fulfillment','ordinaryRegistry']);
 assert.deepEqual(manifest.readers.map(r=>r.sha256),['220f84d5405d4b6794d35de96740a8ec4cf168ee6f3faff316c7c2e40409b327','eb0ec7793417ed9ad807e8b7d9b783898917be9be75ab1aee11346e93b3196f0','186e29b999fd730f4979788adc40c0b69b72df80515077480c1ef56393c993b9']);
 const readers=manifest.readers.map(ref=>{const sql=read(ref).toString('utf8');assert.match(sql,/^(?:--[^\n]*\n)*BEGIN READ ONLY;/);assert.match(sql,/COMMIT;\s*$/);return {...ref,sql};});
 read(manifest.comparisonModule);read(manifest.guardHelpers);const effects=JSON.parse(read(manifest.sourceEffects));
 const canonical=readQualifiedDatabaseTransactions(root);assert.equal(manifest.transactions.length,2);assert.match(manifest.beforeStateSha256,/^[a-f0-9]{64}$/);
 const transactions=manifest.transactions.map((descriptor,index)=>{
  assert.equal(descriptor.index,index);assert.equal(descriptor.canonicalSha256,canonical[index].sha256);assert.equal(descriptor.canonicalBytes,Buffer.byteLength(canonical[index].sql));
  assert.equal(descriptor.afterStateSha256,null,'Native poststate may not be predicted');assert.equal(descriptor.beforeStateSha256,index===0?manifest.beforeStateSha256:null);
  const template=read({path:descriptor.wireTemplatePath,sha256:descriptor.wireTemplateSha256}).toString('utf8');
  read({path:descriptor.recoveryTemplatePath,sha256:descriptor.recoveryTemplateSha256});
  return {...canonical[index],wireTemplateSha256:descriptor.wireTemplateSha256,descriptor,template};
 });
 return {manifest,manifestSha256,readers,transactions,effects,comparisonPath:path.join(directory,path.basename(manifest.comparisonModule.path))};
}

export async function loadQualifiedDatabasePackage(root,manifestSha256){
 const source=readQualifiedDatabasePackage(root,manifestSha256),comparison=await import(pathToFileURL(source.comparisonPath));
 for(const name of ['flatten','normalize','stateSha256','requireReadOnlyCapture','compareTransition','bindWire'])assert.equal(typeof comparison[name],'function');
 return {...source,comparison};
}
