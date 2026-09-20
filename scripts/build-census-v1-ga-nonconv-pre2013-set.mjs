#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runGa} from './rcap-packet-recovery/chat5/ga-pre2013.mjs';
export {runGa as runFamily};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2);if(a.includes('--check'))throw Error('--check is not regeneration');
 for(let i=0;i<a.length;i+=2)if(!['--out','--input'].includes(a[i])||!a[i+1])throw Error('Usage: wrapper [--out DIR] [--input FACTS.json]');
 if(new Set(a.filter((_,i)=>i%2===0)).size!==a.length/2)throw Error('DUPLICATE_OPTION');
 const option=k=>a.includes(k)?a[a.indexOf(k)+1]:undefined;
 const rows=await runGa({outDir:option('--out'),inputFile:option('--input')});
 console.log(JSON.stringify({familyId:'ga-nonconv-pre2013-set',rendererExecuted:true,pdfs:rows.length,pages:rows.reduce((n,x)=>n+x.pageCount,0)}));
}
