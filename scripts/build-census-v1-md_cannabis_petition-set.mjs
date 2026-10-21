#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runMdCannabis} from './rcap-packet-recovery/chat5/md-cannabis.mjs';
export {runMdCannabis as runFamily};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2);for(let i=0;i<a.length;i+=2)if(!['--out','--input'].includes(a[i])||!a[i+1])throw Error('Usage: wrapper [--out DIR] [--input FACTS.json]; --check is not regeneration');
 if(new Set(a.filter((_,i)=>i%2===0)).size!==a.length/2)throw Error('DUPLICATE_OPTION');
 const opt=k=>a.includes(k)?a[a.indexOf(k)+1]:undefined;
 const rows=await runMdCannabis({outDir:opt('--out'),inputFile:opt('--input')});console.log(JSON.stringify({familyId:'md_cannabis_petition-set',rendererExecuted:true,pdfs:rows.length,pages:rows.reduce((n,x)=>n+x.pageCount,0)}));
}
