#!/usr/bin/env node
// Read-only gate. Applying the forward migration and canonical reconciliation
// is a separately authorized operation; reusing a Preview never installs it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPacketContract, normalizeCatalog, packetCatalogQuery, queueHealthQuery, comparePacketCatalog } from './rcap-packet-database-contract.mjs';

export function packetDatabaseReadback(contract,catalog,health) {
  const failures=comparePacketCatalog(contract.current,normalizeCatalog(catalog??{}));
  for(const name of ['duplicateRetryGroups','retryGroupsWithLiveSibling','expiredOverLimit','queuedOverLimit']) {
    if(health?.[name]!==0) failures.push({name:`queue.${name}`,actual:health?.[name]??null,expected:0});
  }
  for(const name of ['oldClaim','oldCredit'])if(health?.[name]!==null)failures.push({name,actual:health?.[name]??'missing',expected:null});
  return {passed:failures.length===0,postconditionCount:Object.keys(contract.current).length,failures};
}

async function main() {
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const contract=loadPacketContract(root);
  const project=process.env.ACCEPTANCE_SUPABASE_PROJECT_REF;
  const token=process.env.SUPABASE_ACCESS_TOKEN;
  if(project!=='hyflxnlhpmiqxvvcoiia'||!token)throw new Error('Only the pinned acceptance project can be read by this gate');
  async function query(sql) {
    const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})
    });
    const body=await response.json();
    if(!response.ok||!Array.isArray(body)||body.length!==1)throw new Error(`packet_database_readback_response: HTTP ${response.status}, expected one successful result row`);
    return {status:response.status,row:body[0]};
  }
  const [catalog,health]=await Promise.all([query(packetCatalogQuery()),query(queueHealthQuery)]);
  const result=packetDatabaseReadback(contract,catalog.row.catalog,health.row.health);
  const evidence={schemaVersion:'rcap-packet-database-readback/v1',at:new Date().toISOString(),project,
    ...result,httpStatus:{catalog:catalog.status,health:health.status},
    queue:Object.fromEntries(Object.entries(health.row.health??{}).filter(([key])=>key!=='rows')),
    sourceAuthorities:contract.sources,readOnly:true};
  const destination=process.env.HOSTED_EVIDENCE_DIR??'hosted-acceptance-evidence';
  fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'packet-database-readback.json'),JSON.stringify(evidence,null,2)+'\n');
  for(const failure of result.failures)console.error(`${failure.name}: actual=${JSON.stringify(failure.actual)} expected=${JSON.stringify(failure.expected)}`);
  if(!result.passed)throw new Error('packet_database_readback_failed; no payment may begin');
  console.log(`PACKET DATABASE READBACK PASS — ${result.postconditionCount} exact catalog postconditions; queue collision/exhaustion and obsolete RPC counts are zero`);
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
