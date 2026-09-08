#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runKy} from './rcap-packet-recovery/chat5/ky-nonconviction.mjs';
export {runKy as runFamily};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2);if(a.includes('--check'))throw Error('--check is not regeneration; run the tests instead');
 for(let i=0;i<a.length;i+=2)if(!['--out','--input'].includes(a[i])||!a[i+1])throw Error('Usage: wrapper [--out DIR] [--input FACTS.json]');
 const option=k=>a.includes(k)?a[a.indexOf(k)+1]:undefined;
 const r=await runKy({outDir:option('--out'),inputFile:option('--input')});console.log(JSON.stringify({familyId:'ky_nonconviction_expungement-set',rendererExecuted:true,pdfs:r.length,pages:r.reduce((n,x)=>n+x.pageCount,0)}));
}
