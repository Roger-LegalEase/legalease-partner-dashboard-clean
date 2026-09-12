"""Retain and validate original pinned Actions batches without rendering."""
import hashlib, io, json, pathlib, re, struct, subprocess, sys, zipfile

ROOT = pathlib.Path('data/rcap-grade-a/packet-factory-24h/raster-runs')
REPO = 'repos/Roger-LegalEase/legalease-partner-dashboard-clean'
sha = lambda b: hashlib.sha256(b).hexdigest()
def api(endpoint):
    return subprocess.check_output(['gh', 'api', REPO + endpoint])
def save(p, value):
    p.write_text(json.dumps(value, indent=2) + '\n')

def validate_selection(run, jobs, requested, selected, partial):
    controls = {'Synthetic canary and live negative controls', 'Plan the family matrix'}
    assert selected and len(selected) == len(set(selected)) and set(selected) <= set(requested)
    assert len(requested) == len(set(requested))
    assert run['path'] == '.github/workflows/rcap-packet-raster-acceptance-batch.yml'
    assert len(jobs['jobs']) == jobs['total_count']
    names = [j['name'] for j in jobs['jobs']]
    assert len(names) == len(set(names)) and set(names) == set(requested) | controls
    if partial:
        assert ((run['status'] == 'in_progress' and not run['conclusion']) or
                (run['status'] == 'completed' and run['conclusion'] in ('success', 'failure')))
    else:
        assert run['status'] == 'completed' and run['conclusion'] == 'success'
        assert set(selected) == set(requested)
        assert all(j['status'] == 'completed' and j['conclusion'] == 'success' for j in jobs['jobs'])
    required = set(selected) | controls
    assert all(j['status'] == 'completed' and j['conclusion'] == 'success'
               for j in jobs['jobs'] if j['name'] in required), 'Selected family/shared control has not passed'
    return [j for j in jobs['jobs'] if j['status'] == 'completed' and j['conclusion'] != 'success']

run_id = int(sys.argv[1])
source = pathlib.Path(sys.argv[2])
request = json.loads(source.read_text())['inputs']
out = ROOT / str(run_id)
out.mkdir(exist_ok=True)
scratch = pathlib.Path('/tmp/rcap-raster-artifacts') / str(run_id)
scratch.mkdir(parents=True, exist_ok=True)
run = json.loads(api(f'/actions/runs/{run_id}'))
save(out / 'run.json', run)
selected = sys.argv[3].split(',') if len(sys.argv) == 4 else request['family_batch'].split(',')
partial = len(sys.argv) == 4
jobs = json.loads(api(f'/actions/runs/{run_id}/jobs?per_page=100'))
artifacts = json.loads(api(f'/actions/runs/{run_id}/artifacts?per_page=100'))
save(out / 'jobs.json', jobs)
save(out / 'artifacts.json', artifacts)
failed_jobs = validate_selection(run, jobs, request['family_batch'].split(','), selected, partial)
commit = request['commit_sha']
original = lambda p: subprocess.check_output(['git', 'show', commit + ':' + p])
pinned = json.loads(original(request['raster_manifest_path']))
current = json.loads(pathlib.Path(request['raster_manifest_path']).read_text())
proofs = []
for family in selected:
    slug = re.sub(r'[^A-Za-z0-9._-]', '_', family)
    row = next(r for r in pinned['rows'] if r['familyId'] == family)
    now = next(r for r in current['rows'] if r['familyId'] == family)
    assert row['documentsDigest'] == now['documentsDigest']
    job = next(j for j in jobs['jobs'] if j['name'] == family)
    assert job['run_id'] == run_id
    assert any(s['name'] == 'Refuse a modified packet byte' and s['conclusion'] == 'success' for s in job['steps'])
    artifact = next(a for a in artifacts['artifacts'] if a['name'] == f'rcap-raster-{slug}-{run_id}')
    assert not artifact['expired'] and artifact['workflow_run']['id'] == run_id
    legacy_archive = out / (slug + '.zip')
    archive = legacy_archive if legacy_archive.exists() else scratch / (slug + '.zip')
    if not archive.exists():
        body = api(f"/actions/artifacts/{artifact['id']}/zip")
        assert 'sha256:' + sha(body) == artifact['digest']
        archive.write_bytes(body)
    body = archive.read_bytes()
    assert 'sha256:' + sha(body) == artifact['digest']
    log = subprocess.check_output(['gh', 'run', 'view', str(run_id), '--repo', REPO[6:], '--job', str(job['id']), '--log'])
    log_path = out / (slug + '.job.log')
    if not log_path.exists():
        log_path = scratch / (slug + '.job.log')
        log_path.write_bytes(log)
    else:
        assert log_path.read_bytes() == log, 'Existing job log changed; preserve for reconciliation'
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
        assert len(v['documentsRendered']) == len(row['documents'])
        for actual, d in zip(v['documentsRendered'], row['documents']):
            assert {k: actual[k] for k in ['role', 'document', 'path', 'pinned']} == dict(role=d['role'], document=d['name'], path=d['path'], pinned=d['sha256'])
            reuse = d.get('reuseOriginalPageEvidence')
            if reuse:
                assert actual.get('renderedInThisRun') is False
                origin = actual.get('originalOrigin') or {}
                assert str(origin.get('workflowRunId')) == reuse['originalRunId']
                assert origin.get('packetCommitSha') == reuse['originalPacketCommitSha']
                assert actual['pinned'] == reuse['documentSha256']
            else:
                assert actual.get('renderedInThisRun', True) is True
                assert actual.get('originalOrigin') is None
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
metadata = dict(runId=run_id, conclusion=run['conclusion'], runStatusAtVerification=run['status'], inputs=request,
                selectedFamiliesConclusion='success', partialRunAdmission=partial,
                excludedJobFailures=[dict(name=j['name'], id=j['id'], conclusion=j['conclusion'],
                    failedSteps=[s['name'] for s in j['steps'] if s['conclusion']=='failure']) for j in failed_jobs])
if partial:
    # Family-scoped immutable custody: completing a sibling must not rewrite a reviewed proof.
    for proof in proofs:
        family = proof['familyId']
        target = out / (re.sub(r'[^A-Za-z0-9._-]', '_', family) + '.ORIGINAL_EVIDENCE_VERIFIED.json')
        record = dict(metadata, selectedFamilies=[family], families=[proof],
                      unselectedJobs=[dict(name=j['name'], id=j['id'], status=j['status'], conclusion=j['conclusion'])
                                      for j in jobs['jobs'] if j['name'] not in {family, 'Synthetic canary and live negative controls', 'Plan the family matrix'}])
        if target.exists():
            prior = json.loads(target.read_text())
            assert prior['runId'] == run_id and prior['inputs'] == request and prior['families'] == [proof], 'Existing custody differs; preserve it for reconciliation'
        else:
            save(target, record)
else:
    save(out / 'ORIGINAL_EVIDENCE_VERIFIED.json', dict(metadata, selectedFamilies=selected, families=proofs))
print(json.dumps(dict(runId=run_id, conclusion=run['conclusion'], families=len(proofs), pages=sum(p['pagesMeasured'] for p in proofs))))
