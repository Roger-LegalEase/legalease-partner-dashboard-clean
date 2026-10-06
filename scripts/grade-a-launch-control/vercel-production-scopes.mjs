import assert from 'node:assert/strict';
export const productionDomainsPath=id=>`/v9/projects/${encodeURIComponent(id)}/domains?limit=100&production=true&redirects=true`;
const order=(a,b)=>a.name.localeCompare(b.name);
export function productionProjectDomains(body){
 assert(Array.isArray(body?.domains)&&body.domains.length>0&&!body.pagination?.next,'complete Production project-domain inventory');
 const domains=body.domains.map(d=>{
  assert(typeof d.name==='string'&&d.name.length>0);assert.equal(d.gitBranch??null,null,'Production branch disposition');assert.equal(d.customEnvironmentId??null,null,'Production environment disposition');
  const redirect=d.redirect??null;assert(redirect===null||typeof redirect==='string'&&redirect.length>0);const redirectStatusCode=redirect===null?null:d.redirectStatusCode;assert(redirect===null||Number.isInteger(redirectStatusCode)&&redirectStatusCode>=300&&redirectStatusCode<400,'exact redirect status');
  return {name:d.name,redirect,redirectStatusCode,gitBranch:null,customEnvironmentId:null};
 }).sort(order);
 assert.equal(new Set(domains.map(d=>d.name)).size,domains.length,'unique project domains');
 for(const d of domains.filter(d=>d.redirect))assert(domains.some(target=>target.name===d.redirect&&target.redirect===null),'redirect target is an authorized direct Production domain');
 return domains;
}
export function productionDeploymentAliases(body){
 assert(Array.isArray(body?.aliases)&&body.aliases.length>0&&!body.pagination?.next,'complete deployment-alias inventory');const aliases=body.aliases.map(a=>({alias:a.alias,redirect:a.redirect??null})).sort((a,b)=>a.alias.localeCompare(b.alias));assert(aliases.every(a=>typeof a.alias==='string'&&a.alias.length>0));assert.equal(new Set(aliases.map(a=>a.alias)).size,aliases.length);return aliases;
}
export function assertVercelProductionScopes(actualAliases,actualDomains,authorization){
 assert(Array.isArray(authorization.productionDeploymentAliases)&&Array.isArray(authorization.productionProjectDomains),'separately authorized Vercel scopes');assert(!Object.hasOwn(authorization,'productionAliases'),'collapsed scope is not authority');
 assert.deepEqual(actualAliases,authorization.productionDeploymentAliases,'exact deployment-alias scope');assert.deepEqual(actualDomains,authorization.productionProjectDomains,'exact Production project-domain routing scope');
 assert.deepEqual(productionProjectDomains({domains:actualDomains}),actualDomains,'canonical Production routing scope');
}
