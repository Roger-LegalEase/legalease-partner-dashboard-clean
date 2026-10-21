#!/usr/bin/env python3
"""Verify CT's retained central receipt; extract only four numbered pages."""
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import subprocess
import tempfile
import zipfile

OUT=Path(__file__).resolve().parent
CENTRAL=OUT.parents[1]/'resume-central-34232991361'
read=lambda p:json.loads(p.read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
run=read(CENTRAL/'final-run.json');jobs=read(CENTRAL/'final-jobs.json')['jobs']
artifact=read(CENTRAL/'ct-absolute-pardon-artifact.json')
verdict=read(CENTRAL/'ct-absolute-pardon.verdict.json')
family=verdict['familyId'];slug=re.sub(r'[^A-Za-z0-9._-]','_',family)
commit='774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90';run_id=34232991361
assert run['id']==run_id and run['status']=='completed' and run['conclusion']=='success'
assert run['path']=='.github/workflows/rcap-packet-raster-acceptance-batch.yml'
gates=[]
for name in ['Synthetic canary and live negative controls','Plan the family matrix',family]:
    found=[j for j in jobs if j['name']==name]
    assert len(found)==1
    j=found[0]
    assert j['run_id']==run_id and j['status']=='completed' and j['conclusion']=='success'
    if name==family:assert any(s['name']=='Refuse a modified packet byte' and s['conclusion']=='success' for s in j['steps'])
    gates.append({k:j[k] for k in ['id','run_id','name','status','conclusion']})
assert artifact['workflow_run']['id']==run_id and not artifact['expired']
assert artifact['name']==f'rcap-raster-{slug}-{run_id}'
archive=CENTRAL/'ct-absolute-pardon.zip'
assert 'sha256:'+sha(archive.read_bytes())==artifact['digest']
queue_path='data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json'
current=read(Path(queue_path));old=json.loads(subprocess.check_output(['git','show',commit+':'+queue_path]))
rows=[[r for r in q['rows'] if r['familyId']==family] for q in [current,old]]
assert all(len(r)==1 for r in rows)
row=rows[0][0]
for k in ['documents','documentsDigest','canonicalPdfPath','canonicalPdfSha256','boundaryPdfPath','boundaryPdfSha256']:
    assert row[k]==rows[1][0][k]
assert verdict['schemaVersion']=='rcap-raster-family-verdict/v1' and verdict['verdict']=='RASTER_PASS'
assert verdict['packetCommitSha']==commit and str(verdict['workflowRunId'])==str(run_id)
assert verdict['documentsDigest']==row['documentsDigest'] and verdict['coversTheWholeFamily'] is True
assert verdict['problems']==verdict['environmentProblems']==[] and verdict['packetPdfsModified']==0
assert verdict['requestedScale']==2.5 and verdict['pagesMeasured']==4 and len(verdict['measurements'])==4
assert verdict['hashesBound']=={role:{'path':row[role+'PdfPath'],'pinned':row[role+'PdfSha256']}for role in ['canonical','boundary']}
assert verdict['documentsRendered']==[dict(role=d['role'],document=d['name'],path=d['path'],pinned=d['sha256'])for d in row['documents']]
pdfs=[]
for d in row['documents']:
    body=Path(d['path']).read_bytes();old_body=subprocess.check_output(['git','show',commit+':'+d['path']])
    assert body==old_body and sha(body)==d['sha256'] and d['pageCount']==2
    pdfs.append(dict(path=d['path'],sha256=sha(body),byteLength=len(body),pages=2))
assert len(pdfs)==2
scratch=Path(tempfile.mkdtemp(prefix='session10-ct-independent-pages-',dir='/tmp'))
pages=[]
with zipfile.ZipFile(archive) as z:
    assert len(z.namelist())==len(set(z.namelist()))
    assert sum(i.file_size for i in z.infolist())<500_000_000
    assert z.read(slug+'.verdict.json')==(CENTRAL/'ct-absolute-pardon.verdict.json').read_bytes()
    numbered={n for n in z.namelist() if re.search(r'/page-\d+\.png$',n)}
    expected={f'{slug}/{r}/page-{p:03}.png'for r in ['canonical','boundary']for p in [1,2]}
    assert numbered==expected
    seen=set()
    for m in verdict['measurements']:
        assert type(m['page'])is int and m['kind'] in ['canonical','boundary'] and m['document']==m['kind']+'.pdf'
        name=f"{slug}/{m['kind']}/page-{m['page']:03}.png"
        assert m['png']==name and name in expected and name not in seen
        seen.add(name);body=z.read(name)
        assert len(body)==m['bytes'] and body[:8]==b'\x89PNG\r\n\x1a\n' and body[12:16]==b'IHDR'
        width,height=struct.unpack('>II',body[16:24]);paper=m['paper']
        assert m['nonblank'] is True and m['croppedToThePage'] is True
        assert math.isfinite(m['calibrationResidualPx']) and 0<=m['calibrationResidualPx']<=1.5
        assert math.isfinite(m['inkFractionInsidePaper']) and .0005<m['inkFractionInsidePaper']<=1
        assert [m['pageWidthPt'],m['pageHeightPt']]==[612,792]
        assert all(math.isfinite(paper[k]) for k in ['x0','y0','width','height'])
        assert abs(paper['width']-2040)<=20/3 and abs(paper['height']-2640)<=20/3
        assert paper['x0']>=0 and paper['y0']>=0 and paper['x0']+paper['width']<=width+1 and paper['y0']+paper['height']<=height+1
        local=scratch/f"{m['kind']}-page-{m['page']:03}.png"
        local.write_bytes(body)
        pages.append(dict(archiveMember=name,sha256=sha(body),byteLength=len(body),width=width,height=height,scratchPath=str(local)))
    assert seen==expected
record=dict(reviewer='/root/session10_admission_review',familyId=family,packetCommit=commit,workflowRunId=run_id,
    artifactId=artifact['id'],artifactDigest=artifact['digest'],archivePath=str(archive),actualSharedAndOwnJobs=gates,
    exactCurrentAndCommittedPdfInputs=pdfs,documents=2,pages=4,numberedPageImages=pages,
    calibrationImagesPreservedInArchive=True,artifactSlugBasis='.github/workflows/rcap-packet-raster-acceptance-batch.yml: Artifact-safe label for this family',
    receiptValidation='PASS',visualInspectionPerformedByThisScript=False,admissionPerformed=False,sharedFilesEdited=False)
(OUT/'actual-receipt-verification.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(dict(receiptValidation='PASS',documents=2,pages=4,scratchDirectory=str(scratch))))
