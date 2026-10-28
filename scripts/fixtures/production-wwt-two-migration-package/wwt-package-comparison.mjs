import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const scopes=['core','fulfillment','ordinaryRegistry'];
const sig=f=>f.signature.replaceAll(' ','');
const hashFields=['definition','definition_md5','body_md5','definition_sha256'];
const omit=(object,keys)=>Object.fromEntries(Object.entries(object).filter(([k])=>!keys.includes(k)));
export function flatten(snapshot){
 assert.deepEqual(Object.keys(snapshot).sort(),[...scopes].sort());
 return Object.fromEntries(scopes.map(k=>{const v=snapshot[k];if(Array.isArray(v)){assert.equal(v.length,1);assert.equal(Object.keys(v[0]).length,1);return[k,Object.values(v[0])[0]];}assert(v&&typeof v==='object');return[k,v];}));
}
function canonical(value,key=''){
 if(Array.isArray(value)){
  let result=value.map(v=>canonical(v));
  if(['acl','schema_acl'].includes(key)&&result.every(v=>typeof v==='string'))result.sort();
  if(key==='functions')result.sort((a,b)=>a.signature<b.signature?-1:a.signature>b.signature?1:0);
  if(key==='relations')result.sort((a,b)=>(a.schema+'\0'+a.name)<(b.schema+'\0'+b.name)?-1:(a.schema+'\0'+a.name)>(b.schema+'\0'+b.name)?1:0);
  if(['constraints','indexes','policies','triggers'].includes(key))result.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  return result;
 }
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k],k)]));
 return value;
}
export function normalize(snapshot){return canonical(Object.fromEntries(Object.entries(flatten(snapshot)).map(([k,v])=>[k,omit(v,['observed_at','lock_snapshot','other_active_client_count','transaction_read_only'])])));}
export function stateSha256(snapshot){return sha256(JSON.stringify(normalize(snapshot)));}
export function requireReadOnlyCapture(snapshot){
 for(const v of Object.values(flatten(snapshot))){assert.equal(v.transaction_read_only,'on');assert.equal(v.database,'postgres');assert.equal(v.current_user,'postgres');assert.equal(v.session_user,'postgres');}
 return snapshot;
}
const equal=(a,b)=>assert.deepEqual(canonical(a),canonical(b));
// Effects are source-derived expectations; only actual readback produces a poststate hash.
export function compareTransition({index,before,after,effects}){
 assert([0,1].includes(index));requireReadOnlyCapture(before);requireReadOnlyCapture(after);
 const b=flatten(before),a=flatten(after),masked=structuredClone(a),e=index===0?effects.ordinary:effects.capacity;
 for(const scope of scopes){
  const oldFunctions=new Map(b[scope].functions.map(f=>[sig(f),f]));
  if(index===0&&scope==='fulfillment')assert.equal(a[scope].functions.filter(f=>f.name==='sponsored_packet_route_for_source').length,1);
  masked[scope].functions=a[scope].functions.flatMap(f=>{
   const old=oldFunctions.get(sig(f));
   if(old&&e.functions[sig(f)]){const wanted=e.functions[sig(f)].definitionSha256;assert.equal(f.definition?sha256(f.definition):f.definition_sha256,wanted);equal(omit(f,hashFields),omit(old,hashFields));return[old];}
   if(!old&&index===0&&scope==='fulfillment'&&f.name==='sponsored_packet_route_for_source'){equal(f,e.helper);return[];}
   return[f];
  });
  const oldRelations=new Map(b[scope].relations.map(t=>[t.schema+'.'+t.name,t]));
  if(index===0&&['core','ordinaryRegistry'].includes(scope))assert.equal(a[scope].relations.filter(t=>t.name==='ordinary_sponsored_packet_routes').length,1);
  if(index===1&&scope==='ordinaryRegistry')assert.equal(a[scope].relations.filter(t=>t.name==='rcap_launch_capacity_events').length,1);
  masked[scope].relations=a[scope].relations.flatMap(t=>{
   const old=oldRelations.get(t.schema+'.'+t.name);
   if(index===0&&['core','ordinaryRegistry'].includes(scope)&&t.name==='ordinary_sponsored_packet_routes'){assert.equal(old,undefined);equal(t,e.registry);return[];}
   if(index===1&&scope==='ordinaryRegistry'&&t.name==='rcap_launch_capacity_events'){assert.equal(old,undefined);const coreProjection=a.core.relations.find(x=>x.schema==='public'&&x.name==='rcap_launch_capacity_events');assert(coreProjection);equal(t,coreProjection);return[];}
   if((index===0&&scope==='fulfillment'&&t.name==='clinic_packet_funding')||(index===1&&scope==='core'&&t.name==='rcap_launch_capacity_events')){
    assert(old);const expected=structuredClone(old);
    for(const col of expected.columns)if(index===0?col.name==='event_id':['document_id','document_hash'].includes(col.name))col.not_null=false;
    if(index===0){expected.columns.push({...e.fundingColumn,position:Math.max(...old.columns.map(c=>c.position))+1});expected.constraints.push(e.fundingConstraint);}else expected.constraints.push(e.capacityConstraint);
    equal(t,expected);return[old];
   }
   return[t];
  });
  for(const key of ['requested_relation_presence','requested_function_presence','planned_existing_update_hashes'])if(a[scope][key])masked[scope][key]=a[scope][key].map(rec=>{
   if(index===0&&key==='requested_relation_presence'&&rec.name==='ordinary_sponsored_packet_routes'){assert.equal(rec.kind,'r');assert.equal(rec.present,true);const old=b[scope][key].find(x=>x.name===rec.name);equal(omit(rec,['kind','present']),omit(old,['kind','present']));return old;}
   if(index===0&&key==='requested_function_presence'&&sig(rec)==='public.sponsored_packet_route_for_source(text,uuid,uuid,uuid)'){assert.equal(rec.present,true);const old=b[scope][key].find(x=>x.signature===rec.signature);equal(omit(rec,['present']),omit(old,['present']));return old;}
   if(index===1&&key==='planned_existing_update_hashes'&&e.functions[sig(rec)]){assert.equal(rec.definition_sha256,e.functions[sig(rec)].definitionSha256);assert.equal(rec.body_md5,e.functions[sig(rec)].bodyMd5);const old=b[scope][key].find(x=>x.signature===rec.signature);equal(omit(rec,['definition_sha256','body_md5']),omit(old,['definition_sha256','body_md5']));return old;}
   return rec;
  });
 }
 assert.deepEqual(normalize(masked),normalize(b),'Undeclared catalog/body/descriptor/grant/policy difference');
 return{status:index===0?'SOURCE_EFFECTS_INTERMEDIATE_READBACK_VERIFIED':'SOURCE_EFFECTS_FINAL_READBACK_VERIFIED',index,beforeStateSha256:stateSha256(before),afterStateSha256:stateSha256(after),nativePoststate:true};
}
export function bindWire({index,before,transaction,template,canonicalSql}){
 assert.equal(transaction.index,index);requireReadOnlyCapture(before);assert.equal(sha256(template),transaction.wireTemplateSha256);assert.equal(sha256(canonicalSql),transaction.canonicalSha256);
 if(index===0)assert.equal(stateSha256(before),transaction.beforeStateSha256);
 const pre=/\n-- BEGIN B WWT PRE-GUARD INSERTION\n[\s\S]*?-- END B WWT PRE-GUARD INSERTION\n/;
 const post=/\n-- BEGIN B WWT POST-GUARD INSERTION\n[\s\S]*?-- END B WWT POST-GUARD INSERTION\n/;
 const p=template.match(pre),q=template.match(post);assert(p&&q);assert.equal(sha256(p[0]),transaction.preGuardInsertion.sha256);assert.equal(sha256(q[0]),transaction.postGuardInsertion.sha256);assert.equal(template.replace(p[0],'').replace(q[0],''),canonicalSql);
 assert.equal(template.split(transaction.bindingMarker).length,2);
 const literal="'"+JSON.stringify(flatten(before)).replaceAll("'","''")+"'";
 const wireSql=template.replace(transaction.bindingMarker,()=>literal);
 return{wireSql,wireSha256:sha256(wireSql),canonicalSha256:transaction.canonicalSha256,beforeStateSha256:stateSha256(before)};
}
