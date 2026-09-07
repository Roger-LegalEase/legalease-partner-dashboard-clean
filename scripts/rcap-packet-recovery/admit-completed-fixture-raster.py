#!/usr/bin/env python3
"""Admit one completed, pinned two-fixture raster; never semantic approval.
CONFIG ZIP RUN_JSON JOBS_JSON. Refuses conditional/extra declared packet PDFs.
"""
from pathlib import Path
import copy,hashlib,json,math,re,struct,subprocess,sys,zipfile
Q=Path('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(Path(p).read_text())

def require(ok,message):
    if not ok:raise ValueError(message)

def validate(c,row,v,images,run,jobs):
    family=c['familyId'];expected=c['expectedPdfs']
    require(set(expected)=={'canonical','boundary'},'exact two fixtures required')
    require(run.get('id')==c['runId'] and run.get('status')=='completed' and run.get('conclusion')=='success','central run failed')
    require(run.get('path')=='.github/workflows/rcap-packet-raster-acceptance-batch.yml','wrong workflow')
    for name in ['Synthetic canary and live negative controls','Plan the family matrix',family]:
        found=[j for j in jobs if j.get('name')==name]
        require(len(found)==1 and found[0].get('run_id')==c['runId'] and found[0].get('status')=='completed' and found[0].get('conclusion')=='success','central job failed/missing')
    require(row['familyId']==family and v.get('familyId')==family and v.get('schemaVersion')=='rcap-raster-family-verdict/v1','wrong family/schema')
    require(v.get('verdict')=='RASTER_PASS' and str(v.get('workflowRunId'))==str(c['runId']) and v.get('packetCommitSha')==c['packetCommit'],'wrong verdict/commit/run')
    require(v.get('documentsDigest')==c['documentsDigest']==row['documentsDigest'],'document set changed')
    require(v.get('problems')==[] and v.get('environmentProblems')==[] and v.get('packetPdfsModified')==0 and v.get('coversTheWholeFamily') is True,'unclean/incomplete raster')
    docs=row['documents'];require(len(docs)==2,'extra/omitted document')
    derived=[dict(role=r,document=r+'.pdf',path=expected[r]['path'],pinned=expected[r]['sha256']) for r in ['canonical','boundary']]
    require(v.get('documentsRendered')==derived,'wrong rendered inputs')
    require(v.get('hashesBound')=={r:dict(path=e['path'],pinned=e['sha256']) for r,e in expected.items()},'wrong PDF pins')
    pages=set()
    for role,e in expected.items():
        d=[d for d in docs if d['role']==role]
        require(len(d)==1 and d[0]['path']==e['path'] and d[0]['sha256']==e['sha256'] and d[0]['pageCount']==e['pages'],'current inventory changed')
        pages.update((role,i) for i in range(1,e['pages']+1))
    observed=set();receipts=[];names=set();measurements=v.get('measurements',[])
    require(v.get('pagesMeasured')==len(pages)==len(measurements),'incomplete page measurement')
    for p in measurements:
        key=(p.get('kind'),p.get('page'));require(type(p.get('page')) is int and key in pages and key not in observed,'duplicate/wrong page')
        observed.add(key);role,number=key;e=expected[role]
        name=f'{family}/{role}/page-{number:03d}.png';names.add(name)
        require(p.get('png')==name and p.get('document')==role+'.pdf','wrong page image binding')
        require(p.get('nonblank') is True and p.get('croppedToThePage') is True,'blank/uncropped page')
        residual=p.get('calibrationResidualPx');require(type(residual) in (int,float) and math.isfinite(residual) and 0<=residual<=2,'invalid calibration')
        require([p.get('pageWidthPt'),p.get('pageHeightPt')]==e['pageSizePt'],'wrong page geometry')
        body=images.get(name,b'');require(len(body)>=24 and len(body)==p.get('bytes') and body[:8]==b'\x89PNG\r\n\x1a\n' and body[12:16]==b'IHDR','missing/corrupt PNG')
        require(list(struct.unpack('>II',body[16:24]))==e['pngSizePx'],'wrong PNG dimensions')
        receipts.append(dict(path=name,sha256=sha(body),byteLength=len(body)))
    require(observed==pages and set(images)==names,'extra/missing images')
    return receipts

def main():
    require(len(sys.argv)==5,'expected CONFIG ZIP RUN_JSON JOBS_JSON')
    c=read(sys.argv[1]);archive=Path(sys.argv[2]);run=read(sys.argv[3]);jobs=read(sys.argv[4])['jobs']
    require(re.fullmatch(r'[a-f0-9]{40}',c['packetCommit']) is not None,'immutable commit required')
    require(sha(archive.read_bytes())==c['zipSha256'],'archive digest mismatch')
    queue=read(Q);rows=[r for r in queue['rows'] if r['familyId']==c['familyId']];require(len(rows)==1,'family not uniquely queued');row=rows[0]
    with zipfile.ZipFile(archive) as z:
        require(len(z.namelist())==len(set(z.namelist())),'duplicate ZIP member')
        require(sum(i.file_size for i in z.infolist())<250_000_000,'oversized expansion')
        v=json.loads(z.read(c['familyId']+'.verdict.json'))
        pattern=re.escape(c['familyId'])+r'/(canonical|boundary)/page-\d+\.png'
        images={n:z.read(n) for n in z.namelist() if re.fullmatch(pattern,n)}
    measured=validate(c,row,v,images,run,jobs)
    subprocess.run(['git','merge-base','--is-ancestor',c['packetCommit'],'HEAD'],check=True)
    for role,e in c['expectedPdfs'].items():
        path=Path(e['path']);require(not path.is_absolute() and '..' not in path.parts,'unsafe input path')
        body=path.read_bytes();old=subprocess.check_output(['git','show',c['packetCommit']+':'+str(path)])
        require(body.startswith(b'%PDF-') and sha(body)==sha(old)==e['sha256'],'current/immutable PDF mismatch')
        info=subprocess.check_output(['pdfinfo',str(path)],text=True)
        require(int(re.search(r'^Pages:\s+(\d+)',info,re.M).group(1))==e['pages'],'actual page count mismatch')
    home=Path(c['expectedPdfs']['canonical']['path']).parent.parent
    report=read(home/'reports/rendered-artifacts.json')
    require(len(report['pdfs'])==2 and {d['file'] for d in report['pdfs']}=={e['path'] for e in c['expectedPdfs'].values()},'additional declared outputs require a full-set importer')
    require(not list((home/'fixtures/branches').glob('*.pdf')),'conditional output requires complete-set coverage')
    mutations=[lambda x:x.update(verdict='RASTER_FAIL'),lambda x:x.update(packetCommitSha='0'*40),lambda x:x.update(workflowRunId='0'),lambda x:x.update(documentsDigest='0'*64),lambda x:x['documentsRendered'].pop(),lambda x:x['hashesBound']['canonical'].update(pinned='0'*64),lambda x:x['measurements'].pop(),lambda x:x['measurements'][1].update(page=1),lambda x:x['measurements'][0].update(nonblank=False),lambda x:x['measurements'][0].update(calibrationResidualPx=3),lambda x:x.update(problems=['clipped']),lambda x:x.update(environmentProblems=['missing renderer']),lambda x:x.update(packetPdfsModified=1),lambda x:x.update(coversTheWholeFamily=False)]
    tests=[]
    for mutate in mutations:
        x=copy.deepcopy(v);mutate(x);tests.append(lambda x=x:validate(c,row,x,images,run,jobs))
    missing=dict(images);missing.pop(next(iter(missing)))
    corrupt=dict(images);corrupt[next(iter(corrupt))]=b'broken'
    tests.extend([lambda:validate(c,row,v,missing,run,jobs),lambda:validate(c,row,v,corrupt,run,jobs),lambda:validate(c,row,v,images,dict(run,conclusion='failure'),jobs),lambda:validate(c,row,v,images,run,[j for j in jobs if j['name']!=c['familyId']])])
    caught=0
    for test in tests:
        try:test()
        except ValueError:caught+=1
        else:raise ValueError('corrupt receipt accepted')
    out=Path(c['evidenceDirectory']);out.mkdir(parents=True,exist_ok=True)
    verdict_path=out/(c['familyId']+'.verdict.json')
    verdict_path.write_text(json.dumps(v,indent=2)+'\n')
    receipt={'schemaVersion':'rcap-completed-fixture-raster-admission/v1','familyId':c['familyId'],'runId':c['runId'],'artifactId':c['artifactId'],'packetCommit':c['packetCommit'],'zipSha256':c['zipSha256'],'wholeCurrentAndImmutablePdfsVerified':True,'measuredPageImages':measured,'pagesMeasured':len(measured),'admissionControlsRejected':caught,'independentSemanticApproval':False,'newTerminalPromotions':0}
    (out/'admission-proof.json').write_text(json.dumps(receipt,indent=2)+'\n')
    prior=row.get('rasterReceipt')
    if prior and str(prior.get('workflowRunId'))!=str(c['runId']):row.setdefault('supersededReceipts',[]).append(dict(prior,supersededBecause='New complete current-byte central receipt admitted.'))
    job=next(j for j in jobs if j['name']==c['familyId'])
    names=[d['document'] for d in v['documentsRendered']]
    row['currentRasterState']='RASTER_PASS';row['nextOwner']='CHATB20260907'
    row['rasterReceipt']={'verdict':'RASTER_PASS','workflowRunId':str(c['runId']),'workflow':run['path'],'renderedCommitSha':c['packetCommit'],'jobId':str(job['id']),'jobConclusion':'success','boundToCanonicalSha256':c['expectedPdfs']['canonical']['sha256'],'boundToBoundarySha256':c['expectedPdfs']['boundary']['sha256'],'documentsDigest':v['documentsDigest'],'documentsCovered':names,'documentsNotCovered':[],'coversTheWholeFamily':True,'documentsMeasured':2,'pagesMeasured':len(measured),'problemsFound':0,'receiptArtifact':{'id':str(c['artifactId']),'name':f"rcap-raster-{c['familyId']}-{c['runId']}",'zipSha256':'sha256:'+c['zipSha256']},'verdictPath':str(verdict_path),'receiptArtifactInspection':str(out/'admission-proof.json'),'admittedBy':'Chat A: current-byte raster evidence only, no independent semantic approval.'}
    row['coverage']={'documents':names,'rastered':names,'notRastered':[],'complete':True,'basis':'Both whole declared PDFs and every page matched the completed central receipt.','notRenderedByThisGate':[]}
    Q.write_text(json.dumps(queue,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
