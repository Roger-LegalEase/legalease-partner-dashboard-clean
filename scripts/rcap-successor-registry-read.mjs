import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
export async function registryImage(host,repo,digest,basic,fetchImpl=fetch){
 let authorization='Basic '+Buffer.from(basic).toString('base64');
 async function get(url,accept){
  let r=await fetchImpl(url,{method:'GET',headers:{Authorization:authorization,...(accept?{Accept:accept}:{})},redirect:'follow',signal:AbortSignal.timeout(30000)});
  if(r.status===401){const challenge=r.headers.get('www-authenticate')??'';const param=k=>new RegExp(k+'="([^"]+)"').exec(challenge)?.[1];const realm=param('realm');assert(realm,'registry challenge');const u=new URL(realm);assert(['ghcr.io','registry.fly.io','api.fly.io'].includes(u.hostname)&&u.protocol==='https:');u.searchParams.set('service',param('service')??host);u.searchParams.set('scope',param('scope')??`repository:${repo}:pull`);const token=await fetchImpl(u,{method:'GET',headers:{Authorization:authorization},redirect:'follow'});assert(token.ok,'registry read token');const t=await token.json();authorization='Bearer '+(t.token??t.access_token);r=await fetchImpl(url,{method:'GET',headers:{Authorization:authorization,...(accept?{Accept:accept}:{})},redirect:'follow',signal:AbortSignal.timeout(30000)});}
  assert(r.ok,`registry ${host} GET HTTP ${r.status}`);return Buffer.from(await r.arrayBuffer());
 }
 const bytes=await get(`https://${host}/v2/${repo}/manifests/${digest}`,'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json');assert.equal(hash(bytes),digest,'immutable manifest digest');let manifest=JSON.parse(bytes);
 if(manifest.manifests){const platform=manifest.manifests.find(m=>m.platform?.os==='linux'&&m.platform?.architecture==='amd64');assert(platform);manifest=JSON.parse(await get(`https://${host}/v2/${repo}/manifests/${platform.digest}`,'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'));}
 const config=await get(`https://${host}/v2/${repo}/blobs/${manifest.config.digest}`);assert.equal(hash(config),manifest.config.digest);const parsed=JSON.parse(config);
 return {reference:`${host}/${repo}@${digest}`,manifestDigest:digest,configDigest:manifest.config.digest,layers:manifest.layers.map(l=>l.digest),rootfs:parsed.rootfs.diff_ids,ociRevision:parsed.config?.Labels?.['org.opencontainers.image.revision']??null};
}
