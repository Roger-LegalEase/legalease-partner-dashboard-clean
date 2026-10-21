/** Enroll only the eight current, complete Ohio continuation packets.
 * No generation, copying, rasterization, or admission occurs here.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
export const OH_RASTER_FAMILY='rcap-oh-custom-pleading-clean-tracks';
export const OH_RASTER_DIRECTORY='data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading';
export const OH_RASTER_TRACKS=Object.freeze(['oh_2953_32_expungement','oh_2953_32_sealing','oh_2953_33_nonconviction','oh_2953_35_firearm']);
const ROLES=['boundary','canonical'];
const expectedFixtures=OH_RASTER_TRACKS.flatMap(track=>ROLES.map(role=>`${track}-${role}`)).sort();
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sameNames=(actual,expected,message)=>assert.deepEqual([...actual].sort(),[...expected].sort(),message);
function confined(root,file,type){
 const relative=path.relative(root,file);
 assert.ok(relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative),'OH path escapes repository');
 let cursor=root;
 for(const part of relative.split(path.sep)){
  cursor=path.join(cursor,part);const stat=fs.lstatSync(cursor);assert.ok(!stat.isSymbolicLink(),`OH symlink refused: ${cursor}`);
 }
 const stat=fs.statSync(file);
 assert.ok(type==='directory'?stat.isDirectory():stat.isFile(),`OH ${type} required: ${file}`);
 assert.equal(fs.realpathSync(file),file,'OH resolved path differs from confined path');
}
function pageCount(file){
 const result=spawnSync('pdfinfo',[file],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 assert.equal(result.status,0,`OH PDF cannot be parsed: ${file}`);
 const hit=result.stdout.match(/^Pages:\s+(\d+)\s*$/m);assert.ok(hit,'OH PDF has no page count');
 return Number(hit[1]);
}
export function ohRasterDocuments({report,fixtures,root}){
 if(report?.familyId!==OH_RASTER_FAMILY)return null;
 assert.ok(typeof root==='string'&&typeof fixtures==='string','OH raster roots required');
 const home=fs.realpathSync(root),base=path.join(home,OH_RASTER_DIRECTORY);
 assert.equal(path.resolve(fixtures),base,'OH fixture root must be exact continuation family directory');
 confined(home,base,'directory');
 assert.ok(Array.isArray(report.packets)&&Array.isArray(report.artifacts),'OH complete packet and artifact declarations required');
 sameNames(report.packets.map(p=>p.fixture),expectedFixtures,'OH packet fixture inventory drift');
 sameNames(report.artifacts.map(p=>p.fixture),expectedFixtures,'OH artifact fixture inventory drift');
 const continuation=path.join(base,'continuation');confined(home,continuation,'directory');
 sameNames(fs.readdirSync(continuation),OH_RASTER_TRACKS,'OH on-disk track inventory drift');
 const documents=[];
 for(const track of OH_RASTER_TRACKS){
  const trackDir=path.join(continuation,track);confined(home,trackDir,'directory');
  sameNames(fs.readdirSync(trackDir),ROLES,'OH on-disk stage fixture inventory drift');
  for(const role of ROLES){
   const fixture=`${track}-${role}`,stage=path.join(trackDir,role);confined(home,stage,'directory');
   const allowed=new Set(['packet.pdf','fixture.json','coverage.json','certificate-of-service.pdf','local-instructions.pdf','records-instructions.pdf','hearing-instructions.pdf','bci-transmission.pdf',...(track==='oh_2953_32_sealing'?['96C1.pdf','application-continuation.pdf']:['application.pdf'])]);
   for(const entry of fs.readdirSync(stage)){assert.ok(allowed.has(entry),`OH unknown stage entry: ${fixture}/${entry}`);confined(home,path.join(stage,entry),'file');}
   const input=JSON.parse(fs.readFileSync(path.join(stage,'fixture.json'),'utf8'));
   assert.equal(input.trackId,track,'OH fixture track identity drift');assert.equal(input.fixture,role,'OH fixture stage identity drift');
   const packet=report.packets.find(p=>p.fixture===fixture),artifact=report.artifacts.find(p=>p.fixture===fixture);
   const file=`continuation/${track}/${role}/packet.pdf`;
   for(const declaration of [packet,artifact]){
    assert.equal(declaration.file,file,'OH complete packet path drift');assert.equal(declaration.fixtureRole,role,'OH packet role drift');
    assert.match(declaration.sha256??'',/^[a-f0-9]{64}$/,'OH packet SHA-256 required');assert.ok(Number.isSafeInteger(declaration.pageCount)&&declaration.pageCount>0,'OH positive page count required');
   }
   assert.equal(artifact.sha256,packet.sha256,'OH packet/artifact digest disagreement');assert.equal(artifact.pageCount,packet.pageCount,'OH packet/artifact page count disagreement');
   const absolute=path.join(base,file);confined(home,absolute,'file');const bytes=fs.readFileSync(absolute);
   assert.equal(bytes.subarray(0,5).toString(),'%PDF-','OH complete packet is not PDF');
   assert.equal(hash(bytes),packet.sha256,'OH complete packet digest drift');
   for(const declaration of [packet,artifact])for(const lengthKey of ['bytes','byteLength'])if(declaration[lengthKey]!==undefined)assert.equal(declaration[lengthKey],bytes.length,'OH packet byte length drift');
   assert.equal(pageCount(absolute),packet.pageCount,'OH complete packet page count drift');
   documents.push({role,name:file,declaredPageCount:packet.pageCount,byteLength:bytes.length,sha256:packet.sha256,branch:fixture,selectionKind:'native_complete_fixture',filingReady:false});
  }
 }
 assert.equal(documents.length,8,'OH must enroll all eight whole packets');
 return documents.sort((a,b)=>a.name.localeCompare(b.name,'en'));
}
