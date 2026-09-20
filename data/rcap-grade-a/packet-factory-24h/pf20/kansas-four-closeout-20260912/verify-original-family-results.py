"""Verify each Kansas job independently; preserve the failed sibling as FAIL.
Uses the existing per-family receipt contract, without changing any raster gate.
"""
import hashlib, io, json, pathlib, re, struct, subprocess, zipfile
REPO='repos/Roger-LegalEase/legalease-partner-dashboard-clean'
BASE=pathlib.Path('data/rcap-grade-a/packet-factory-24h')
LANE=BASE/'pf20/kansas-four-closeout-20260912'
RUN='34666647205'
OUT=BASE/'raster-runs'/RUN
OUT.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def api(endpoint):return subprocess.check_output(['gh','api',REPO+endpoint])
def save(path, data):
    body=data if isinstance(data,bytes) else (json.dumps(data,indent=2)+'\n').encode()
    if path.exists():assert path.read_bytes()==body, 'Existing evidence differs: '+str(path)
    else:path.write_bytes(body)
request=json.loads((LANE/'raster-dispatch-request.json').read_text())['inputs']
run=json.loads(api('/actions/runs/'+RUN));jobs=json.loads(api('/actions/runs/'+RUN+'/jobs?per_page=100'));artifacts=json.loads(api('/actions/runs/'+RUN+'/artifacts?per_page=100'))
assert run['status']=='completed' and run['conclusion']=='failure'
assert run['path']=='.github/workflows/rcap-packet-raster-acceptance-batch.yml'
save(OUT/'run.json',run);save(OUT/'jobs.json',jobs);save(OUT/'artifacts.json',artifacts)
manifest=json.loads(subprocess.check_output(['git','show',request['commit_sha']+':'+request['raster_manifest_path']]))
assert manifest==json.loads(pathlib.Path(request['raster_manifest_path']).read_text())
scope={r['familyId'] for r in manifest['rows']}
assert len(scope)==4 and scope==set(request['family_batch'].split(','))
controls={'Synthetic canary and live negative controls','Plan the family matrix'}
assert {j['name'] for j in jobs['jobs']}==scope|controls
assert all(j['status']=='completed' and j['conclusion']=='success' for j in jobs['jobs'] if j['name'] in controls)
passed=[];failed=[];total=0
for row in manifest['rows']:
    fid=row['familyId'];job=next(j for j in jobs['jobs'] if j['name']==fid)
    intended_fail=fid=='ks-21-6614-specialty-court-set'
    assert job['conclusion']==('failure' if intended_fail else 'success')
    artifact=next(a for a in artifacts['artifacts'] if a['name']==f'rcap-raster-{fid}-{RUN}')
    archive=OUT/(fid+'.zip')
    if not archive.exists():save(archive,api('/actions/artifacts/'+str(artifact['id'])+'/zip'))
    raw=archive.read_bytes();assert 'sha256:'+sha(raw)==artifact['digest']
    logpath=OUT/(fid+'.job.log')
    if not logpath.exists():save(logpath,subprocess.check_output(['gh','run','view',RUN,'--job',str(job['id']),'--log']))
    logged=[json.loads(l.split('RCAP_RECEIPT_VERDICT ',1)[1]) for l in logpath.read_text().splitlines() if 'RCAP_RECEIPT_VERDICT {' in l]
    assert len(logged)==1
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        assert len(z.namelist())==len(set(z.namelist()))
        v=json.loads(z.read(fid+'.verdict.json'));assert v==logged[0]
        assert v['verdict']==('RASTER_FAIL' if intended_fail else 'RASTER_PASS')
        assert v['familyId']==fid and str(v['workflowRunId'])==RUN and v['packetCommitSha']==request['commit_sha']
        assert v['documentsDigest']==row['documentsDigest'] and v['packetPdfsModified']==0
        assert v['environmentProblems']==[] and v['requestedScale']==2.5
        # The submitted manifest omitted advisory coverage metadata. Preserve
        # the raw null; verify the exact full document set against native queue
        # discovery, then let existing native coverage reconciliation act.
        assert v['coversTheWholeFamily'] is None
        native=next(r for r in json.loads((BASE/'RASTER_QUEUE.json').read_text())['rows'] if r['familyId']==fid)
        assert native['documentsDigest']==row['documentsDigest']
        assert native['coverage']['complete'] and native['coverage']['notRastered']==[] and native['coverage']['notRenderedByThisGate']==[]
        assert [(d['role'],d['path'],d['sha256']) for d in native['documents']]==[(d['role'],d['path'],d['sha256']) for d in row['documents']]
        assert bool(v['problems'])==intended_fail
        expected=set()
        for d,rendered in zip(row['documents'],v['documentsRendered']):
            body=pathlib.Path(d['path']).read_bytes();committed=subprocess.check_output(['git','show',request['commit_sha']+':'+d['path']])
            assert sha(body)==sha(committed)==d['sha256'] and len(body)==d['byteLength']
            assert rendered['path']==d['path'] and rendered['pinned']==d['sha256'] and rendered['document']==d['name']
            expected.update((d['name'],p) for p in range(1,d['pageCount']+1))
        assert len(v['documentsRendered'])==len(row['documents'])==2
        assert len(v['measurements'])==v['pagesMeasured']==len(expected)
        assert {(m['document'],m['page']) for m in v['measurements']}==expected
        blank=[];images=[]
        for m in v['measurements']:
            body=z.read(m['png']);assert sha(body)==m['pngSha256'] and len(body)==m['bytes']
            assert body[:8]==b'\x89PNG\r\n\x1a\n' and body[12:16]==b'IHDR'
            assert m['croppedToThePage'] and 0<=m['calibrationResidualPx']<=1.5
            if not m['nonblank']:blank.append((m['document'],m['page']))
            if not intended_fail:assert m['nonblank'] and .0005<m['inkFractionInsidePaper']<=1
            images.append({'member':m['png'],'sha256':sha(body),'bytes':len(body),'pngDimensions':list(struct.unpack('>II',body[16:24]))})
        if intended_fail:assert set(blank)=={('canonical.pdf',20),('boundary.pdf',20)} and len(v['problems'])==2
        else:assert blank==[] and any(s['name']=='Refuse a modified packet byte' and s['conclusion']=='success' for s in job['steps'])
    vp=OUT/(fid+'.verdict.json');save(vp,v);save(OUT/(fid+'.PAGE_IMAGES_SHA256.json'),images)
    item={'familyId':fid,'jobId':job['id'],'jobConclusion':job['conclusion'],'verdict':v['verdict'],'artifact':artifact,'archivePath':str(archive),'archiveSha256':sha(raw),'verdictPath':str(vp),'originalPages':len(images),'documentsDigest':row['documentsDigest']}
    (failed if intended_fail else passed).append(item);total+=len(images)
assert len(passed)==3 and len(failed)==1 and total==162
save(OUT/'ORIGINAL_FAMILY_RESULTS_VERIFIED.json',{'runId':RUN,'conclusion':'failure','wholeRunPassed':False,'rawCoverageFlag':None,'coverageMetadataOmission':'Original manifest omitted coverage; raw verdict stays unchanged. Exact complete native document set and every original page independently verified; existing generate-raster-queue receipt coverage reconciliation required.','inputs':request,'successfulFamilies':passed,'failedFamilies':failed,'originalPagesVerified':total,'successfulOriginalPages':120,'failedOriginalPages':42,'admissionScope':'Only three complete RASTER_PASS jobs qualify for the existing per-family receipt ingester. Specialty FAIL is retained and not promoted.'})
print('PASS custody: all162 original pages; 3 successful families/120 pages retained; specialty FAIL/42 pages preserved.')
