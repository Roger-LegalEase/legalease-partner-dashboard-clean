#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runMdConviction} from './rcap-packet-recovery/chat5/md-conviction.mjs';
export {runMdConviction as runFamily};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2);for(let i=0;i<a.length;i+=2)if(!['--out','--input'].includes(a[i])||!a[i+1])throw Error('Usage: wrapper [--out DIR] [--input FACTS.json]; --check is not regeneration');
 if(new Set(a.filter((_,i)=>i%2===0)).size!==a.length/2)throw Error('DUPLICATE_OPTION');
 const option=k=>a.includes(k)?a[a.indexOf(k)+1]:undefined;
 const rows=await runMdConviction({outDir:option('--out'),inputFile:option('--input')});console.log(JSON.stringify({familyId:'md_10110_conviction-set',rendererExecuted:true,pdfs:rows.length,pages:rows.reduce((n,x)=>n+x.pageCount,0)}));
}
