import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {register} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';
const mode=process.argv[2];
if(mode==='current'||mode==='predecessor'){
 register('./lib/ts-esm-loader.mjs',import.meta.url);
 const sources={};
 // Throwing boundary tripwires prove which real dispatcher branch executes.
 // They provide no successful database/storage/permission response.
 for(const [file,name,message]of [
  ['src/lib/supabase/server.ts','getSupabaseAdminClient','offline-personalized-storage-tripwire'],
  ['src/lib/rcap/documents/source-repository.ts','getRcapDocumentPacket','offline-legacy-source-tripwire']
 ]){
  let source=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(node?.body,name);
  source=source.slice(0,node.body.getStart(ast))+`{throw new Error(${JSON.stringify(message)});}`+source.slice(node.body.end);
  sources[pathToFileURL(path.resolve(file)).href]=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 }
 if(mode==='predecessor'){
  const file='src/lib/rcap/render/personalized-packet.ts',source=fs.readFileSync(file,'utf8');
  const prior=source.replace('  MS_PAID_SUCCESSOR_ROUTE,\n  GA_PERSONALIZED_DELIVERY_ROUTE\n]);','  MS_PAID_SUCCESSOR_ROUTE\n]);');assert.notEqual(prior,source);
  sources[pathToFileURL(path.resolve(file)).href]=ts.transpileModule(prior,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 }
 register(`data:text/javascript,${encodeURIComponent('let files;export function initialize(data){files=data}export async function load(url,ctx,next){return Object.hasOwn(files,url)?{format:"module",source:files[url],shortCircuit:true}:next(url,ctx)}')}`,{data:sources});
 const {renderClaimPacket}=await import('./rcap-render-worker.mjs');
 const observations=[];
 for(const route of ['GA:restriction-and-sealing-of-a-pardoned-felony','GA:other','IL:felony-prostitution-relief']){
  let failure;try{await renderClaimPacket({routeId:route,packetId:'synthetic-never-read'});}catch(error){failure=error.message;}
  observations.push({route,failure});
 }
 console.log(JSON.stringify({mode,observations}));
}else{
 const run=mode=>{const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url),mode],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout.trim());};
 const current=run('current'),previous=run('predecessor');
 const requireProtected=r=>assert.equal(r.observations[0].failure,'offline-personalized-storage-tripwire','GA must not fall through to the legacy renderer');
 requireProtected(current);assert.equal(previous.observations[0].failure,'offline-legacy-source-tripwire');
 assert.throws(()=>requireProtected(previous),/GA must not fall through/);
 for(const r of [current,previous]){assert.equal(r.observations[1].failure,'offline-legacy-source-tripwire');assert.equal(r.observations[2].failure,'offline-personalized-storage-tripwire');}
 console.log(JSON.stringify({status:'PASS',checks:7,current,previous,scope:'Actual worker dispatcher with throwing I/O tripwires, no successful mock authority and no DB access. Not a real worker-claim/delivery acceptance.'},null,2));
}
