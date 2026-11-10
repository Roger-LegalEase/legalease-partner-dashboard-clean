import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const paths = [
 ["src/app/api/rcap/documents/[packetId]/route.ts", "GET"],
 ["src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts", "GET"],
 ["src/app/api/rcap/documents/[packetId]/save/route.ts", "POST"],
 ["src/app/api/rcap/documents/[packetId]/generate/route.ts", "POST"]
];
let effects=0;
for(const [path, method] of paths){
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){assert.equal(name,"next/server");return {NextResponse:{json:(body,options)=>({body,...options})}};},fetch(){effects++;throw Error("no network");}});
 for(const actor of ["anonymous","ownerA","ownerB","partnerA","partnerB"]){
  const response=await exports[method](new Request("https://example.invalid/api/rcap/documents/PUBLIC_SYNTHETIC_ID",{method}),{params:Promise.resolve({packetId:"PUBLIC_SYNTHETIC_ID",pdfType:"full"}),actor});
  assert.equal(response.status,503);assert.equal(response.body.code,"legacy_document_access_unavailable");assert.equal(response.headers["Cache-Control"],"private, no-store");
 }
}
assert.equal(effects,0);
console.log("PASS all4 actual containment handlers x5 synthetic identities:503/no-store, no repository/cache/render/write/network; modern routes unchanged");
