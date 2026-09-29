/** Application inputs are executable source/build inputs plus their repository
 * file references, including generated authority. Worker custody is separate.
 * Discovery is conservative: all src modules, directory readers, and transitive
 * data references participate; no release-evidence exclusion is permitted. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const git = (root, args, options={}) => execFileSync('git',args,{cwd:root,maxBuffer:256*1024*1024,...options});
const manifestCache=new Map();
export function applicationInputManifest(root, revision) {
  const tree=git(root,['rev-parse',`${revision}^{tree}`],{encoding:'utf8'}).trim();
  const cacheKey=root+':'+tree;
  if(manifestCache.has(cacheKey))return {...manifestCache.get(cacheKey),revision};
  const entries=git(root,['ls-tree','-rz','--full-tree',tree],{encoding:'utf8'}).split('\0').filter(Boolean).map(line=>{
    const [header,file]=line.split('\t');const [mode,type,oid]=header.split(' ');return {file,mode,type,oid};
  });
  const blobs=new Map(entries.filter(e=>e.type==='blob').map(e=>[e.file,e]));
  const directories=new Map();
  for(const file of blobs.keys())for(let d=path.posix.dirname(file);d!=='.';d=path.posix.dirname(d)) {
    if(!directories.has(d))directories.set(d,[]);directories.get(d).push(file);
  }
  const selected=new Map(),queue=[],executable=new Set(),processed=new Set();
  function include(file,from,execute=false) {
    const targets=blobs.has(file)?[file]:directories.get(file)??[];
    for(const target of targets){
      if(!selected.has(target)){selected.set(target,new Set());queue.push(target);}
      selected.get(target).add(from);
      if(execute&&!executable.has(target)){executable.add(target);queue.push(target);}
    }
  }
  // Framework roots, not a hand-maintained authority/data allowlist.
  for(const file of blobs.keys())if(file.startsWith('src/')||file.startsWith('public/')||
    /^(package(?:-lock)?\.json|tsconfig[^/]*\.json|(?:next|postcss|tailwind)\.config\.[^/]+|vercel\.json)$/.test(file))include(file,'framework',file.startsWith('src/app/')||/^src\/(?:proxy|middleware)\./.test(file)||!file.startsWith('src/'));
  function reference(raw,from,partial=false,allowDirectory=true,execute=false){
    if(typeof raw!=='string'||!raw||(!raw.includes('/')&&!/\.[a-z0-9]+$/i.test(raw))||raw.includes('\n')||/^(https?:|node:|data:)/.test(raw))return;
    let value=raw.replace(/^@\//,'src/');
    if(partial||/[?*]/.test(value))value=value.slice(0,value.search(/[?*]/)>=0?value.search(/[?*]/):value.length).replace(/[^/]*$/,'');
    const candidates=[value];
    if(value.startsWith('.'))candidates.unshift(path.posix.join(path.posix.dirname(from),value));
    for(let file of candidates){
      file=path.posix.normalize(file).replace(/\/$/,'');
      if(file==='.'||file.startsWith('../')||path.posix.isAbsolute(file))continue;
      if(blobs.has(file)||(allowDirectory&&directories.has(file))){include(file,from,execute);return;}
      for(const ext of ['.ts','.tsx','.mjs','.js','.json'])if(blobs.has(file+ext)){include(file+ext,from,execute);return;}
    }
  }
  const content=new Map();
  function readSource(file,cursor){
    if(!content.has(file)){
      const batch=queue.slice(cursor,cursor+100).filter(f=>/\.(?:[cm]?[jt]sx?|json)$/.test(f)&&!content.has(f));
      const result=git(root,['cat-file','--batch'],{input:batch.map(f=>blobs.get(f).oid).join('\n')+'\n'});
      let offset=0;
      for(const f of batch){const end=result.indexOf(10,offset);const size=Number(result.subarray(offset,end).toString().split(' ')[2]);
        content.set(f,result.subarray(end+1,end+1+size).toString());offset=end+size+2;}
    }
    return content.get(file);
  }
  for(let cursor=0;cursor<queue.length;cursor++){
    const file=queue[cursor];
    if(!/\.(?:[cm]?[jt]sx?|json)$/.test(file))continue;
    if(!file.endsWith('.json')&&!executable.has(file))continue;
    if(processed.has(file))continue;processed.add(file);
    const source=readSource(file,cursor);
    if(file.endsWith('.json')){
      let doc;try{doc=JSON.parse(source);}catch{throw Error(`Invalid application JSON: ${file}; referenced by ${[...selected.get(file)].join(",")}`);}
      // Runtime readers dereference path/file fields, not provenance prose or
      // generator names. Recursively retain file-backed artifacts and inputs.
      const visit=(value,key='')=>{if(typeof value==='string'){
        if(/^(?:path|file|.*(?:Path|File|Paths|Files))$/.test(key))reference(value,file,false,false);
      }else if(Array.isArray(value))value.forEach(v=>visit(v,key));
      else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>visit(v,k));};visit(doc);continue;
    }
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
    function visit(node){
      if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||node.expression.getText(ast)==='require')
        && !ts.isStringLiteralLike(node.arguments[0]))throw Error(`Unresolved runtime import in ${file}`);
      if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&['join','resolve'].includes(node.expression.name.text)){
        // Retain the static directory prefix of dynamic directory readers.
        const parts=[];
        for(const arg of node.arguments){
          if(ts.isStringLiteralLike(arg))parts.push(arg.text);
          else if(ts.isTemplateExpression(arg)){parts.push(arg.head.text);break;}
          else if(parts.length)break;
        }
        if(parts.length)reference(parts.join('/'),file,ts.isTemplateExpression(node.arguments.find(a=>ts.isTemplateExpression(a))??ast));
        // Individual path segments are not independent repository roots.
        for(const arg of node.arguments)if(!ts.isStringLiteralLike(arg))ts.forEachChild(arg,visit);
        return;
      }
      if(ts.isStringLiteralLike(node)){
        const imported=(ts.isImportDeclaration(node.parent)||ts.isExportDeclaration(node.parent))&&node.parent.moduleSpecifier===node
          || ts.isCallExpression(node.parent)&&(node.parent.expression.kind===ts.SyntaxKind.ImportKeyword||node.parent.expression.getText(ast)==='require');
        reference(node.text,file,false,true,Boolean(imported));
      }
      if(ts.isTemplateExpression(node))reference(node.head.text,file,true);
      ts.forEachChild(node,visit);
    }
    visit(ast);
  }
  const files=[...selected.keys()].sort().map(file=>({path:file,mode:blobs.get(file).mode,blob:blobs.get(file).oid,consumers:[...selected.get(file)].sort()}));
  const manifest={schemaVersion:'rcap-application-inputs/v1',revision,tree,files,
    fingerprint:'sha256:'+createHash('sha256').update(JSON.stringify(files.map(({path,mode,blob})=>({path,mode,blob})))).digest('hex')};
  manifestCache.set(cacheKey,manifest);return manifest;
}
export function applicationInputEquivalence(root,base,head){
  const before=applicationInputManifest(root,base),after=applicationInputManifest(root,head);
  const a=new Map(before.files.map(f=>[f.path,`${f.mode}:${f.blob}`])),b=new Map(after.files.map(f=>[f.path,`${f.mode}:${f.blob}`]));
  const changedPaths=[...new Set([...a.keys(),...b.keys()])].filter(f=>a.get(f)!==b.get(f)).sort();
  return {equivalent:changedPaths.length===0,changedPaths,applicationFingerprint:before.fingerprint,comparedInputs:new Set([...a.keys(),...b.keys()]).size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const arg=k=>process.argv[process.argv.indexOf(k)+1];const root=process.cwd();
  if(process.argv.includes('--manifest'))console.log(JSON.stringify(applicationInputManifest(root,arg('--manifest')),null,2));
  else {const result=applicationInputEquivalence(root,arg('--base'),arg('--head'));console.log(JSON.stringify(result,null,2));if(!result.equivalent)process.exitCode=1;}
}
