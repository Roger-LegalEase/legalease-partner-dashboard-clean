// Ordinary metadata only; actual Start, target and worker custody are separate gates.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createSponsoredWorkerRuntimeContext} from './sponsored-worker-runtime-context.mjs';
const ordinaryContexts=new WeakSet();
export function createOrdinaryWorkerRuntimeContext(decisionBytes=execFileSync('git',['show','ed8d0902a99c5326f75987a942eb507b6cfb16cf:data/record-clearing/legal-decisions/2026-10-24-ms-nonconv-ordinary-internal-qa.json'],{cwd:fileURLToPath(new URL('../../',import.meta.url)),stdio:['ignore','pipe','ignore']})){
 const grant=JSON.parse(decisionBytes);
 assert.equal(createHash('sha256').update(JSON.stringify(grant)).digest('hex'),'316a211790dbdaca3bd260beac0a854076ebed618390b339b1d68b6a40381ebb','Only the existing Ordinary approved decision provides Ordinary worker context');
 const context=createSponsoredWorkerRuntimeContext(decisionBytes);ordinaryContexts.add(context);return context;
}
export function assertOrdinaryWorkerRuntimeContext(context){assert(ordinaryContexts.has(context),'Ordinary worker requires its own source-approved context');return context;}
