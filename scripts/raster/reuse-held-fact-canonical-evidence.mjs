/** Preserve exact original canonical PNGs while repairing only boundary PDFs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const POLICY = 'data/rcap-grade-a/packet-factory-24h/warp-20260912/known-fact-fit/canonical-reuse.json';
const FAMILIES = new Set(['nm_conviction-set','nm_identity_theft-set','nm_release_without_conviction-set','co_motion_seal_conviction-set']);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function file(root, relative) {
  assert.equal(typeof relative,'string');
  const base=fs.realpathSync(root), result=fs.realpathSync(path.resolve(root,relative));
  assert.ok(result.startsWith(base+path.sep),'evidence path escapes repository');
  return result;
}
function pinned(root, ref) {
  const p=file(root,ref.path), b=fs.readFileSync(p);
  assert.equal(sha(b),ref.sha256,`pinned evidence changed: ${ref.path}`);
  if(ref.byteLength!==undefined) assert.equal(b.length,ref.byteLength);
  return p;
}
export async function reuseHeldFactCanonicalEvidence({root,out,familyId,familyPath,target,descriptor,scale,currentPageCount}) {
  assert.ok(FAMILIES.has(familyId),'family outside held-fact repair scope');
  const policy=JSON.parse(fs.readFileSync(file(root,POLICY)));
  assert.equal(policy.schemaVersion,'rcap-exact-canonical-reuse/v1');
  const rows=policy.rows.filter(r=>r.familyId===familyId);assert.equal(rows.length,1);
  const p=rows[0];assert.deepEqual(descriptor,p.descriptor,'reuse descriptor differs from governed exact-byte policy');
  assert.equal(descriptor.policyId,'HELD-FACT-FIT-20260912');
  assert.equal(target.kind,'canonical');assert.equal(target.name,p.document.name);
  assert.equal(target.rel,p.document.path);assert.equal(target.expected,p.document.sha256);
  assert.equal(target.expectedPages,p.document.pageCount);assert.equal(currentPageCount,p.document.pageCount);
  assert.equal(sha(fs.readFileSync(file(root,target.rel))),p.document.sha256,'current canonical PDF changed');
  const v=JSON.parse(fs.readFileSync(pinned(root,p.verdict)));
  const proof=JSON.parse(fs.readFileSync(pinned(root,p.custody)));
  const inventory=JSON.parse(fs.readFileSync(pinned(root,p.inventory)));
  const jobs=JSON.parse(fs.readFileSync(pinned(root,p.jobs))).jobs;
  const custody=proof.families.filter(r=>r.familyId===familyId);assert.equal(custody.length,1);
  const c=custody[0];const job=jobs.filter(j=>j.id===c.jobId);assert.equal(job.length,1);
  assert.equal(job[0].name,familyId);assert.equal(job[0].conclusion,'success');
  assert.equal(job[0].status,'completed');
  for(const name of ['Synthetic canary and live negative controls','Plan the family matrix']){
    const shared=jobs.filter(j=>j.name===name);assert.equal(shared.length,1);assert.equal(shared[0].conclusion,'success');
  }
  assert.ok(proof.conclusion==='success'||(proof.partialRunAdmission===true&&proof.selectedFamiliesConclusion==='success'&&proof.selectedFamilies.includes(familyId)));
  const archive=pinned(root,p.archive);assert.equal(sha(fs.readFileSync(archive)),c.archiveSha256);
  assert.equal(c.artifact.digest,'sha256:'+c.archiveSha256);
  assert.equal(String(c.artifact.workflow_run.id),descriptor.originalRunId);
  const log=fs.readFileSync(pinned(root,p.jobLog),'utf8');
  const logged=log.split('\n').filter(s=>s.includes('RCAP_RECEIPT_VERDICT {')).map(s=>JSON.parse(s.split('RCAP_RECEIPT_VERDICT ')[1]));
  assert.deepEqual(logged,[v],'original artifact and job-log verdict disagree');
  assert.equal(v.familyId,familyId);assert.equal(v.verdict,'RASTER_PASS');
  assert.equal(String(v.workflowRunId),descriptor.originalRunId);assert.equal(v.packetCommitSha,descriptor.originalPacketCommitSha);
  assert.equal(v.requestedScale,scale);assert.equal(v.coversTheWholeFamily,true);
  assert.deepEqual(v.problems,[]);assert.deepEqual(v.environmentProblems,[]);
  const docs=v.documentsRendered.filter(d=>d.document===target.name);assert.equal(docs.length,1);
  for(const [key,value] of Object.entries({role:'canonical',path:target.rel,pinned:target.expected}))assert.equal(docs[0][key],value);
  const ms=v.measurements.filter(m=>m.document===target.name).sort((a,b)=>a.page-b.page);
  assert.deepEqual(ms.map(m=>m.page),Array.from({length:currentPageCount},(_,i)=>i+1),'original page coverage gap');
  const measurements=[];
  for(const m of ms){
    assert.equal(m.kind,'canonical');assert.equal(m.nonblank,true);assert.equal(m.croppedToThePage,true);
    assert.ok(m.calibrationResidualPx<=1.5);assert.ok(Math.abs(m.expectedPxPerPt-scale*96/72)<1e-12);
    const items=inventory.filter(i=>i.member===m.png);assert.equal(items.length,1);
    assert.equal(items[0].sha256,m.pngSha256);assert.equal(items[0].byteLength,m.bytes);
    const image=file(root,p.imageRoot+'/'+m.png), bytes=fs.readFileSync(image);
    assert.equal(sha(bytes),m.pngSha256);assert.equal(bytes.length,m.bytes);
    const meta=await sharp(bytes).metadata();assert.deepEqual([meta.width,meta.height],items[0].dimensions);
    const paper=m.paper;assert.ok(paper.x0>=0&&paper.y0>=0&&paper.x0+paper.width<=meta.width&&paper.y0+paper.height<=meta.height);
    assert.equal(paper.x1,paper.x0+paper.width-1);assert.equal(paper.y1,paper.y0+paper.height-1);
    const {data,info}=await sharp(bytes).greyscale().extract({left:Math.round(paper.x0),top:Math.round(paper.y0),width:Math.round(paper.width),height:Math.round(paper.height)}).raw().toBuffer({resolveWithObject:true});
    let dark=0;for(const pixel of data)if(pixel<200)dark++;
    assert.ok(Math.abs(dark/(info.width*info.height)-m.inkFractionInsidePaper)<1e-15,'original ink measurement changed');
    const output=path.resolve(out,familyPath,'canonical',`page-${String(m.page).padStart(3,'0')}.png`);
    assert.ok(output.startsWith(path.resolve(out)+path.sep));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);
    const originalOrigin={workflowRunId:descriptor.originalRunId,packetCommitSha:descriptor.originalPacketCommitSha,verdictPath:p.verdict.path,verdictSha256:p.verdict.sha256,artifactId:c.artifact.id,artifactZipSha256:c.archiveSha256,pngMember:m.png,pngSha256:m.pngSha256};
    measurements.push({...m,png:path.relative(out,output).split(path.sep).join('/'),renderedInThisRun:false,evidenceOrigin:'REUSED_ORIGINAL_PAGE_EVIDENCE',originalOrigin});
  }
  return {measurements,document:{role:'canonical',document:target.name,path:target.rel,pinned:target.expected,renderedInThisRun:false,originalOrigin:{workflowRunId:descriptor.originalRunId,packetCommitSha:descriptor.originalPacketCommitSha,verdictPath:p.verdict.path,verdictSha256:p.verdict.sha256,artifactId:c.artifact.id,artifactZipSha256:c.archiveSha256,pages:measurements.length}}};
}
