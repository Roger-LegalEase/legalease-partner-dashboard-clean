"""Retain and validate original pinned Actions batches without rendering."""
import hashlib, io, json, pathlib, re, struct, subprocess, sys, zipfile

ROOT = pathlib.Path('data/rcap-grade-a/packet-factory-24h/raster-runs')
REPO = 'repos/Roger-LegalEase/legalease-partner-dashboard-clean'
sha = lambda b: hashlib.sha256(b).hexdigest()
def api(endpoint):
    return subprocess.check_output(['gh', 'api', REPO + endpoint])
def save(p, value):
    p.write_text(json.dumps(value, indent=2) + '\n')

run_id = int(sys.argv[1])
source = pathlib.Path(sys.argv[2])
request = json.loads(source.read_text())['inputs']
out = ROOT / str(run_id)
out.mkdir(exist_ok=True)
run = json.loads(api(f'/actions/runs/{run_id}'))
save(out / 'run.json', run)
assert run['status'] == 'completed', 'Run still executing; do not consume yet'
assert run['conclusion'] == 'success', 'Central run failed; no admission'
assert run['path'] == '.github/workflows/rcap-packet-raster-acceptance-batch.yml'
jobs = json.loads(api(f'/actions/runs/{run_id}/jobs?per_page=100'))
artifacts = json.loads(api(f'/actions/runs/{run_id}/artifacts?per_page=100'))
save(out / 'jobs.json', jobs)
save(out / 'artifacts.json', artifacts)
assert len(jobs['jobs']) == jobs['total_count']
assert all(j['status'] == 'completed' and j['conclusion'] == 'success' for j in jobs['jobs'])
assert {j['name'] for j in jobs['jobs']} == set(request['family_batch'].split(',')) | {'Synthetic canary and live negative controls', 'Plan the family matrix'}
commit = request['commit_sha']
original = lambda p: subprocess.check_output(['git', 'show', commit + ':' + p])
pinned = json.loads(original(request['raster_manifest_path']))
current = json.loads(pathlib.Path(request['raster_manifest_path']).read_text())
proofs = []
for family in request['family_batch'].split(','):
    slug = re.sub(r'[^A-Za-z0-9._-]', '_', family)
    row = next(r for r in pinned['rows'] if r['familyId'] == family)
    now = next(r for r in current['rows'] if r['familyId'] == family)
    assert row['documentsDigest'] == now['documentsDigest']
    job = next(j for j in jobs['jobs'] if j['name'] == family)
    assert job['run_id'] == run_id
    assert any(s['name'] == 'Refuse a modified packet byte' and s['conclusion'] == 'success' for s in job['steps'])
    artifact = next(a for a in artifacts['artifacts'] if a['name'] == f'rcap-raster-{slug}-{run_id}')
    assert not artifact['expired'] and artifact['workflow_run']['id'] == run_id
    archive = out / (slug + '.zip')
    if not archive.exists():
        body = api(f"/actions/artifacts/{artifact['id']}/zip")
        assert 'sha256:' + sha(body) == artifact['digest']
        archive.write_bytes(body)
    body = archive.read_bytes()
    assert 'sha256:' + sha(body) == artifact['digest']
    log = subprocess.check_output(['gh', 'run', 'view', str(run_id), '--repo', REPO[6:], '--job', str(job['id']), '--log'])
    (out / (slug + '.job.log')).write_bytes(log)
    verdicts = [json.loads(line.split('RCAP_RECEIPT_VERDICT ', 1)[1]) for line in log.decode().splitlines() if 'RCAP_RECEIPT_VERDICT {' in line]
    assert len(verdicts) == 1
    with zipfile.ZipFile(io.BytesIO(body)) as z:
        assert len(z.namelist()) == len(set(z.namelist()))
        v = json.loads(z.read(slug + '.verdict.json'))
        assert v == verdicts[0], 'Artifact and original job-log verdict differ'
        assert v['verdict'] == 'RASTER_PASS' and v['packetCommitSha'] == commit and str(v['workflowRunId']) == str(run_id)
        assert v['familyId'] == family and v['documentsDigest'] == row['documentsDigest']
        assert v['problems'] == [] and v['environmentProblems'] == [] and v['packetPdfsModified'] == 0
        assert v['coversTheWholeFamily'] is True and v['requestedScale'] == 2.5
        assert v['documentsRendered'] == [dict(role=d['role'], document=d['name'], path=d['path'], pinned=d['sha256']) for d in row['documents']]
        for role in ['canonical', 'boundary']:
            assert v['hashesBound'][role] == dict(path=row[role+'PdfPath'], pinned=row[role+'PdfSha256'])
        expected = set()
        for d in row['documents']:
            assert sha(pathlib.Path(d['path']).read_bytes()) == sha(original(d['path'])) == d['sha256']
            expected.update((d['name'], p) for p in range(1, d['pageCount'] + 1))
        assert len(v['measurements']) == v['pagesMeasured'] == len(expected)
        seen, images = set(), []
        for m in v['measurements']:
            key = (m['document'], m['page'])
            assert key in expected and key not in seen
            seen.add(key)
            assert m['nonblank'] and m['croppedToThePage'] and 0 <= m['calibrationResidualPx'] <= 1.5
            assert .0005 < m['inkFractionInsidePaper'] <= 1
            document = re.sub(r'[^A-Za-z0-9._-]', '_', m['document'][:-4])
            assert m['png'] == f"{slug}/{document}/page-{m['page']:03d}.png"
            png = z.read(m['png'])
            assert len(png) == m['bytes'] and png[:8] == b'\x89PNG\r\n\x1a\n' and png[12:16] == b'IHDR'
            assert sha(png) == m['pngSha256']
            # The renderer names the calibrated paper size pngWidth/pngHeight;
            # the uploaded PNG is the larger viewport. Check both separately.
            width, height = struct.unpack('>II', png[16:24])
            paper = m['paper']
            assert (m['pngWidth'], m['pngHeight']) == (round(paper['width']), round(paper['height']))
            assert 0 <= paper['x0'] and 0 <= paper['y0']
            assert paper['x0'] + paper['width'] <= width + 1 and paper['y0'] + paper['height'] <= height + 1
            assert abs(paper['width'] - m['pageWidthPt'] * 10/3) <= 20/3
            assert abs(paper['height'] - m['pageHeightPt'] * 10/3) <= 20/3
            images.append(dict(member=m['png'], sha256=sha(png), byteLength=len(png), dimensions=list(struct.unpack('>II', png[16:24]))))
        assert seen == expected
        assert {n for n in z.namelist() if re.search(r'/page-\d+\.png$', n)} == {i['member'] for i in images}
    save(out / (slug + '.verdict.json'), v)
    save(out / (slug + '.PAGE_IMAGES_SHA256.json'), images)
    proofs.append(dict(familyId=family, jobId=job['id'], artifact=artifact, packetCommit=commit,
                       verdictPath=str(out / (slug + '.verdict.json')), pagesMeasured=v['pagesMeasured'],
                       verdict='RASTER_PASS', currentAndPinnedPdfHashesVerified=True,
                       originalArtifactAndJobLogAgree=True, originalPngBytesVerified=True,
                       archivePath=str(archive), archiveSha256=sha(body), jobLogSha256=sha(log)))
save(out / 'ORIGINAL_EVIDENCE_VERIFIED.json', dict(runId=run_id, conclusion=run['conclusion'], inputs=request, families=proofs))
print(json.dumps(dict(runId=run_id, conclusion=run['conclusion'], families=len(proofs), pages=sum(p['pagesMeasured'] for p in proofs))))
