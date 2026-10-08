// Read only the exact Preview's shipped sign-in code. Never consult mutable
// project environment variables or infer CAPTCHA policy from successful auth.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import {previewRequestHeaders} from './rcap-clinic-resume-network-policy.mjs';
const message='Please complete the security check and try again.';
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const unwrap=n=>ts.isParenthesizedExpression(n)?unwrap(n.expression):n;
function walk(n,visit){visit(n);ts.forEachChild(n,c=>walk(c,visit));}
function importedExport(n){
 n=unwrap(n);if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.CommaToken)n=unwrap(n.right);
 return ts.isPropertyAccessExpression(n)&&ts.isIdentifier(n.expression)?{alias:n.expression.text,key:n.name.text}:null;
}
function importId(factory,alias){
 const ids=[],parameter=factory.node.parameters[factory.format==='turbopack'?0:2]?.name;
 if(!parameter||!ts.isIdentifier(parameter))return null;
 walk(factory.node,n=>{if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.name.text===alias&&n.initializer){
  const i=unwrap(n.initializer);if(!ts.isCallExpression(i)||i.arguments.length!==1||!ts.isNumericLiteral(i.arguments[0]))return;
  const callee=unwrap(i.expression),exact=factory.format==='turbopack'
   ?ts.isPropertyAccessExpression(callee)&&ts.isIdentifier(callee.expression)&&callee.expression.text===parameter.text&&callee.name.text==='i'
   :ts.isIdentifier(callee)&&callee.text===parameter.text;
  if(exact)ids.push(i.arguments[0].text);
 }});
 return ids.length===1?ids[0]:null;
}
const isFactory=n=>ts.isArrowFunction(n)||ts.isFunctionExpression(n);
const turboProperty=n=>ts.isPropertyAccessExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='globalThis'&&n.name.text==='TURBOPACK';
function turboRegistration(n){
 n=unwrap(n);if(turboProperty(n))return true;
 if(!ts.isBinaryExpression(n))return false;
 if(n.operatorToken.kind===ts.SyntaxKind.EqualsToken)return turboProperty(n.left)&&turboRegistration(n.right);
 if(n.operatorToken.kind===ts.SyntaxKind.BarBarToken)return turboProperty(n.left);
 return false;
}
// A small closed-expression validator, not a bundler runtime. Only the three
// selected helper exports and their necessary local definitions are evaluated.
// Unrelated JSX/React/widget imports in a merged factory are never executed.
function closedValue(factory,expression,getter,invoke){
 const declarations=new Map(),needed=new Map(),visiting=new Set();
 const declare=(name,node,text)=>{declarations.set(name,declarations.has(name)?null:{node,text});};
 for(const statement of factory.node.body.statements??[]){
  if(ts.isFunctionDeclaration(statement)&&statement.name)declare(statement.name.text,statement,statement.getText());
  if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations)if(ts.isIdentifier(d.name)&&d.initializer)declare(d.name.text,d.initializer,`const ${d.name.text}=${d.initializer.getText()};`);
 }
 const resolve=name=>{
  if(needed.has(name))return;assert.ok(!visiting.has(name),'cyclic helper dependency');assert.ok(needed.size+visiting.size<20,'helper dependency limit');
  const d=declarations.get(name);assert.ok(d,'unresolved helper dependency');
  // A factory-level binding must not be reassigned anywhere in the factory.
  const checkWrites=n=>{
   if(n!==factory.node&&(isFactory(n)||ts.isFunctionDeclaration(n))){
    const binds=node=>{let match=false;walk(node,x=>{if(ts.isIdentifier(x)&&x.text===name)match=true;});return match;};
    const shadows=n.parameters.some(p=>binds(p.name))||(n.body?.statements??[]).some(st=>ts.isVariableStatement(st)&&st.declarationList.declarations.some(x=>binds(x.name)));
    if(shadows)return; // unrelated nested locals are not the selected binding
   }
   if(ts.isBinaryExpression(n)&&n.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&n.operatorToken.kind<=ts.SyntaxKind.LastAssignment){let writes=false;walk(n.left,x=>{if(ts.isIdentifier(x)&&x.text===name)writes=true;});assert.ok(!writes,'mutable helper dependency');}
   if((ts.isPrefixUnaryExpression(n)||ts.isPostfixUnaryExpression(n))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(n.operator))assert.ok(!(ts.isIdentifier(n.operand)&&n.operand.text===name),'mutable helper dependency');
   ts.forEachChild(n,checkWrites);
  };checkWrites(factory.node);
  visiting.add(name);check(d.node,new Set());visiting.delete(name);needed.set(name,d.text);
 };
 const check=(node,locals)=>{
  node=unwrap(node);
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isNumericLiteral(node)||[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword].includes(node.kind))return;
  if(ts.isIdentifier(node)){if(!locals.has(node.text))resolve(node.text);return;}
  if(ts.isFunctionExpression(node)||ts.isArrowFunction(node)||ts.isFunctionDeclaration(node)){
   assert.equal(node.parameters.length,0,'unsupported helper parameters');const local=new Set(locals);if(node.name)local.add(node.name.text);
   if(ts.isBlock(node.body)){for(const statement of node.body.statements)check(statement,local);}else check(node.body,local);return;
  }
  if(ts.isReturnStatement(node)){assert.ok(node.expression,'missing helper return');check(node.expression,locals);return;}
  if(ts.isBlock(node)){const inner=new Set(locals);for(const statement of node.statements)check(statement,inner);return;}
  if(ts.isVariableStatement(node)){for(const d of node.declarationList.declarations){assert.ok(ts.isIdentifier(d.name)&&d.initializer,'unsupported helper local');check(d.initializer,locals);assert.ok(!locals.has(d.name.text),'ambiguous helper local');locals.add(d.name.text);}return;}
  if(ts.isIfStatement(node)){check(node.expression,locals);check(node.thenStatement,new Set(locals));if(node.elseStatement)check(node.elseStatement,new Set(locals));return;}
  if(ts.isConditionalExpression(node)){check(node.condition,locals);check(node.whenTrue,locals);check(node.whenFalse,locals);return;}
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken,ts.SyntaxKind.GreaterThanToken,ts.SyntaxKind.LessThanToken,ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)){check(node.left,locals);check(node.right,locals);return;}
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken){check(node.operand,locals);return;}
  if(ts.isPropertyAccessExpression(node)&&node.name.text==='length'){check(node.expression,locals);return;}
  if(ts.isCallExpression(node)&&node.arguments.length===0){const callee=unwrap(node.expression);
   if(ts.isIdentifier(callee)){check(callee,locals);return;}
   if(ts.isPropertyAccessExpression(callee)&&['trim','toLowerCase'].includes(callee.name.text)){check(callee.expression,locals);return;}
  }
  throw new Error('unresolved or unsupported helper expression');
 };
 check(expression,new Set());assert.ok(needed.size<=20,'helper dependency limit');
 const value=`(${expression.getText()})${getter?'()':''}${invoke?'()':''}`;
 const code=`"use strict";${[...needed.values()].join('\n')}\n${value}`;
 assert.ok(code.length<=100000,'helper expression size limit');
 try{return vm.runInNewContext(code,{}, {timeout:1000,contextCodeGeneration:{strings:false,wasm:false}});}catch{throw new Error('closed helper expression could not be evaluated');}
}
function helperExports(factory,id){
 assert.equal(factory.format,'turbopack','unsupported helper export format');
 const context=factory.node.parameters[0]?.name;assert.ok(context&&ts.isIdentifier(context),'unsupported helper context');
 const lists=[];
 // Only top-level export calls (including comma-separated expressions) belong
 // to this factory registration; nested widget/function bodies are not exports.
 const expression=node=>{node=unwrap(node);if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.CommaToken){expression(node.left);expression(node.right);return;}
  if(!ts.isCallExpression(node)||!ts.isPropertyAccessExpression(node.expression)||node.expression.name.text!=='s'||!ts.isIdentifier(node.expression.expression)||node.expression.expression.text!==context.text)return;
  assert.ok(node.arguments.length===1||node.arguments.length===2,'malformed helper export call');
  let target;if(node.arguments.length===2){assert.ok(ts.isNumericLiteral(node.arguments[1]),'unsupported helper export target');target=node.arguments[1].text;assert.ok(factory.ids.includes(target),'unregistered helper export target');}else{assert.equal(factory.ids.length,1,'ambiguous implicit helper export target');target=factory.ids[0];}
  if(target===id)lists.push(node.arguments[0]);
 };
 for(const statement of factory.node.body.statements??[])if(ts.isExpressionStatement(statement))expression(statement.expression);
 assert.equal(lists.length,1,'missing or conflicting helper export list');const list=unwrap(lists[0]);assert.ok(ts.isArrayLiteralExpression(list),'unsupported helper export list');
 const exports=new Map();for(let i=0;i<list.elements.length;){const name=list.elements[i++],tag=list.elements[i++];assert.ok(name&&ts.isStringLiteral(name)&&!exports.has(name.text),'malformed or conflicting helper export');
  let value,getter=false;if(tag&&ts.isNumericLiteral(tag)&&tag.text==='0'){assert.ok(i<list.elements.length,'missing value export');value=list.elements[i++];}
  else if(tag&&isFactory(tag)){assert.equal(tag.parameters.length,0,'unsupported getter parameters');assert.ok(!list.elements[i]||!isFactory(list.elements[i]),'unsupported setter export');value=tag;getter=true;}
  else throw new Error('unsupported helper export tag');exports.set(name.text,{value,getter});
 }
 return exports;
}
// Static extraction only. Next 16.2.6 registers [script, id(s), factory, ...].
// Multiple IDs can share one factory. The two-element runtime-chunk metadata
// registration is not a module. No downloaded chunk/runtime is executed.
export function inspectShippedCaptcha(chunks){
 const modules=new Map();
 for(const {body}of chunks){
  const source=ts.createSourceFile('shipped.js',body,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(source.parseDiagnostics.length,0,'unreadable shipped JavaScript');
  const add=(id,node,format,ids=[id])=>{const text=node.getText(source);if(modules.has(id))assert.ok(modules.get(id).text===text&&modules.get(id).format===format&&JSON.stringify([...modules.get(id).ids].sort())===JSON.stringify([...ids].sort()),'conflicting shipped module');else modules.set(id,{node,text,format,ids});};
  walk(source,n=>{
   if(ts.isPropertyAssignment(n)&&ts.isNumericLiteral(n.name)&&isFactory(n.initializer))add(n.name.text,n.initializer,'webpack');
   if(!ts.isCallExpression(n)||!ts.isPropertyAccessExpression(n.expression)||n.expression.name.text!=='push'||!turboRegistration(n.expression.expression))return;
   assert.equal(n.arguments.length,1,'malformed Turbopack registration');const array=unwrap(n.arguments[0]);assert.ok(ts.isArrayLiteralExpression(array),'malformed Turbopack registration');
   const elements=array.elements;if(elements.length===2&&ts.isObjectLiteralExpression(elements[1]))return;
   let i=1;while(i<elements.length){const ids=[];while(i<elements.length&&ts.isNumericLiteral(elements[i]))ids.push(elements[i++].text);
    assert.ok(ids.length&&i<elements.length&&isFactory(elements[i]),'malformed Turbopack module registration');const node=elements[i++];for(const id of ids)add(id,node,'turbopack',ids);
   }
  });
 }
 const guards=[];
 for(const factory of modules.values())walk(factory.node,n=>{
  if(!ts.isIfStatement(n)&&!ts.isConditionalExpression(n))return;const condition=unwrap(ts.isIfStatement(n)?n.expression:n.condition);
  if(!ts.isBinaryExpression(condition)||condition.operatorToken.kind!==ts.SyntaxKind.AmpersandAmpersandToken)return;
  const left=unwrap(condition.left),right=unwrap(condition.right);
  if(!ts.isCallExpression(left)||left.arguments.length||!ts.isPrefixUnaryExpression(right)||right.operator!==ts.SyntaxKind.ExclamationToken)return;
  const trim=unwrap(right.operand);if(!ts.isCallExpression(trim)||!ts.isPropertyAccessExpression(trim.expression)||trim.expression.name.text!=='trim')return;
  const call=importedExport(left.expression);if(!call)return;
  const id=importId(factory,call.alias),bundleModule=modules.get(id);if(!bundleModule?.text.includes(message))return;
  const errorKeys=[];walk(ts.isIfStatement(n)?n.thenStatement:n.whenTrue,x=>{if(ts.isPropertyAccessExpression(x)&&ts.isIdentifier(x.expression)&&x.expression.text===call.alias)errorKeys.push(x.name.text);});
  guards.push({id,key:call.key,errorKeys});
 });
 assert.ok(guards.length>0,'shipped sign-in CAPTCHA guard not identified');
 assert.equal(new Set(guards.map(g=>`${g.id}:${g.key}`)).size,1,'ambiguous shipped CAPTCHA guard');
 const results=[];
 for(const guard of guards){
  const bundleModule=modules.get(guard.id),exports=helperExports(bundleModule,guard.id);
  const evaluate=(key,invoke=false)=>{const definition=exports.get(key);assert.ok(definition,'missing helper export');return closedValue(bundleModule,definition.value,definition.getter,invoke);};
  assert.ok(guard.errorKeys.some(key=>exports.has(key)&&evaluate(key)===message),'helper error binding mismatch');
  const required=evaluate(guard.key,true),siteKey=evaluate('getTurnstileSiteKey',true);
  const proof={required,siteKeyConfigured:typeof siteKey==='string'&&siteKey.trim().length>0};
  assert.equal(typeof proof.required,'boolean','shipped CAPTCHA requirement must be boolean');
  assert.equal(proof.required,false,'shipped client requires CAPTCHA');
  assert.equal(proof.siteKeyConfigured,true,'shipped widget site key must be configured');
  results.push({moduleId:guard.id,guardExport:guard.key,moduleFormat:bundleModule.format,moduleSha256:digest(bundleModule.text)});
 }
 return {clientCaptchaRequired:false,widgetSiteKeyConfigured:true,source:'exact deployment shipped sign-in bundle',guards:results,chunkSha256:chunks.map(x=>digest(x.body))};
}
export async function readShippedCaptcha({origin,bypass,deployment,applicationSha,fetchImpl=fetch}){
 assert.equal(deployment.id??deployment.uid,'dpl_Gf6uwETvQNbKXAMCcxLE6ECxLhNR','exact CAPTCHA deployment');
 assert.equal(deployment.gitSource?.sha,applicationSha);assert.equal(applicationSha,'af638b61cc4b74afad972fa79c4c1ca3f6709540');
 assert.equal(origin,'https://legalease-rcap-clinic-af638b61cc4b-roger947s-projects.vercel.app');
 // Caller proves the alias resolves to this exact deployment before this read.
 const read=async url=>{assert.equal(new URL(url).origin,origin);let response;try{response=await fetchImpl(url,{method:'GET',headers:previewRequestHeaders(bypass),redirect:'error'});}catch{throw new Error('shipped CAPTCHA read unavailable');}assert.equal(response.status,200,`shipped CAPTCHA read HTTP ${response.status}`);const body=await response.text();assert.ok(body.length<10_000_000,'oversized shipped CAPTCHA response');return body;};
 const html=await read(`${origin}/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase`);
 const urls=[...new Set([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')).filter(x=>x.startsWith('/_next/static/')&&new URL(x,origin).pathname.endsWith('.js')))];
 assert.ok(urls.length>0&&urls.length<=100,'shipped sign-in chunks unavailable (SSO is not application configuration)');
 const chunks=[];for(const url of urls){const resolved=new URL(url,origin);assert.ok(resolved.pathname.startsWith('/_next/static/'),'unexpected shipped chunk path');chunks.push({body:await read(resolved.href)});}
 return {...inspectShippedCaptcha(chunks),deploymentId:deployment.id??deployment.uid,applicationSha};
}
