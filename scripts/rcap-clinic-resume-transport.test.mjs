import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import vm from 'node:vm';
import {once} from 'node:events';
import {RESUME,resumeSql,requireResumeAuthorization,exactSessionClosureSql} from './rcap-clinic-resume-contract.mjs';

const source=fs.readFileSync(new URL('./rcap-hosted-clinic-resume.mjs',import.meta.url),'utf8');
// Execute the shipped helper with real fetch/HTTP response parsing. Only the
// destination is redirected to a loopback server; no remote query is executed.
const helper=source.slice(source.indexOf('async function query('),source.indexOf('\nconst snapshot='));
async function transport(run,code=helper){
 const requests=[];let status=200,body='[]';
 const server=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;requests.push(JSON.parse(raw));res.writeHead(status,{'content-type':'application/json'});res.end(body);});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const query=vm.runInNewContext(`(${code})`,{assert,project:RESUME.project,token:'synthetic',fetch:(url,options)=>{assert.equal(url,`https://api.supabase.com/v1/projects/${RESUME.project}/database/query`);assert.equal(options.method,'POST');return fetch(`http://127.0.0.1:${server.address().port}`,options);}});
 try{await run({query,requests,respond:(s,b)=>{status=s;body=b;}});}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
for(const status of [200,201])test(`HTTP ${status} valid array succeeds; snapshot request remains read_only`,()=>transport(async({query,requests,respond})=>{
 respond(status,'[{"evidence":{}}]');const sql=await resumeSql(RESUME.project);const rows=await query(sql);assert.equal(rows.length,1);assert.deepEqual(requests,[{query:sql,read_only:true}]);
}));
for(const [status,body,label]of [[204,'','empty JSON'],[400,'[]','bad request'],[401,'[]','unauthorized'],[500,'[]','server error'],[201,'{broken','malformed JSON'],[201,'{}','non-array object'],[200,'null','non-array null']])test(`HTTP ${status} ${label} refuses`,()=>transport(async({query,respond})=>{
 respond(status,body);await assert.rejects(query('select 1'));
}));
test('only the separately authorized exact closure sends read_only=false; SQL guards remain intact',()=>transport(async({query,requests,respond})=>{
 assert.match(source,/const closureSql=execute\?exactSessionClosureSql/);
 assert.ok(source.indexOf('const closureSql=')<source.indexOf("const token=env("));
 assert.match(source,/assertResumeState\(current\);await query\(closureSql,false\)/);
 assert.equal((source.match(/query\([^\n]*?,false\)/g)||[]).length,1);
 for(const authorization of [undefined,'wrong'])assert.throws(()=>exactSessionClosureSql(RESUME.project,authorization));
 assert.throws(()=>requireResumeAuthorization({project:RESUME.project,execute:true,authorization:'wrong'}));
 assert.equal(requests.length,0);
 requireResumeAuthorization({project:RESUME.project,execute:true,authorization:'Roger:clinic-resume:36211668984:explicit-download-and-device-reset'});
 const sql=exactSessionClosureSql(RESUME.project,'Roger:clinic-resume:36211668984:close-exact-lost-cookie-session');
 for(const marker of [RESUME.assisted,RESUME.owner,RESUME.event,RESUME.session,RESUME.clinicCase,'resume session identity drift','resume case drift','resume session lifecycle drift','clinic_end_assisted_session'])assert.ok(sql.includes(marker));
 respond(201,'[]');await query(sql,false);assert.deepEqual(requests,[{query:sql,read_only:false}]);
 respond(401,'[]');await assert.rejects(query(sql,false),/HTTP 401/);
}));
test('mutation control: restoring exact HTTP 200 rejects the same real HTTP 201 response',async()=>{
 const mutant=helper.replace('assert.ok(response.ok,','assert.equal(response.status,200,');assert.notEqual(mutant,helper);
 await transport(async({query,respond})=>{respond(201,'[]');await assert.rejects(query('select 1'),/database query HTTP 201/);},mutant);
});
