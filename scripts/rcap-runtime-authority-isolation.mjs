// Filesystem boundary for source-module / packaged-DATA parity. This is not
// an OS sandbox and never purports to execute compiled handlers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncBuiltinESMExports} from 'node:module';
export function guardPackagedRoot(root, onAccess=()=>{}) {
  const original = {};
  for(const key of ['realpathSync','existsSync','readFileSync','openSync','readSync','readvSync','readdirSync','statSync','lstatSync','accessSync','closeSync']) original[key]=fs[key];
  const rootReal=original.realpathSync(root), failures=[], descriptors=new Map();
  assert.equal(rootReal,path.resolve(root),"PACKAGED_ROOT_ESCAPE: supplied root or ancestor is a symlink");
  let evaluating=false;
  const inside=p=>p===rootReal||p.startsWith(rootReal+path.sep);
  const targetPath=t=>typeof t==='number'?(descriptors.get(t)||null):path.resolve(t instanceof URL?fileURLToPath(t):Buffer.isBuffer(t)?t.toString():String(t));
  function reject(message) {failures.push(message);throw Error(`PACKAGED_ROOT_ESCAPE: ${message}`);}
  function boundary(t) {
    const p=targetPath(t);
    if(!p)reject('untracked file descriptor');
    // During module loading code may come from source; dynamic DATA reads may
    // not. Static JSON imports are explicitly outside this parity claim.
    if(!evaluating&&!p.split(path.sep).includes('data')&&!p.includes('/src/lib/rcap-engine/compiled'))return p;
    let existing=p;
    while(!original.existsSync(existing)) {
      // A dangling symlink is still a boundary decision, not an innocent miss.
      try {if(original.lstatSync(existing).isSymbolicLink())reject(`dangling symlink: ${p}`);}catch(e){if(e.message.startsWith('PACKAGED_ROOT_ESCAPE'))throw e;}
      const parent=path.dirname(existing);if(parent===existing)reject(`unresolvable ancestor: ${p}`);existing=parent;
    }
    const real=original.realpathSync(existing);
    if(!inside(real))reject(`${p} resolves through ${real}, outside ${rootReal}`);
    return p;
  }
  const restores=[];
  const replace=(obj,key,value)=>{const old=obj[key];obj[key]=value;restores.push(()=>{obj[key]=old;});};
  for(const name of ['readFileSync','openSync','readSync','readvSync','readdirSync','statSync','lstatSync','accessSync','existsSync']) {
    replace(fs,name,function(target,...args) {
      const p=boundary(target);
      let value;
      try {value=original[name].call(this,target,...args);}catch(error){onAccess(name+':absent',p,{initializing:!evaluating});throw error;}
      boundary(target); // Check successful paths again through realpath.
      if(name==='openSync')descriptors.set(value,p);
      onAccess(name==='existsSync'&&!value?'existsSync:absent':name,p,{initializing:!evaluating});
      return value;
    });
  }
  replace(fs,'closeSync',function(fd){descriptors.delete(fd);return original.closeSync(fd);});
  // The authority currently uses synchronous fs only. A new unsupported API
  // must fail the proof rather than silently bypass instrumentation.
  for(const name of ['readFile','open','read','readv','readdir','stat','lstat','access','exists','opendir','opendirSync','createReadStream','readlink','readlinkSync','glob','globSync','openAsBlob']) {
    if(typeof fs[name]==='function')replace(fs,name,()=>reject(`unsupported fs API ${name}`));
  }
  for(const name of ['readFile','open','readdir','stat','lstat','access','opendir','readlink','realpath']) {
    if(typeof fs.promises[name]==='function')replace(fs.promises,name,()=>reject(`unsupported fs.promises API ${name}`));
  }
  syncBuiltinESMExports();
  return {beginEvaluation(){evaluating=true;},assertClean(){assert.equal(failures.length,0,`PACKAGED_ROOT_ESCAPE: ${failures.join('; ')}`);},failures,
    restore(){for(const f of restores.reverse())f();syncBuiltinESMExports();}};
}
