"""Read current packet bytes and original Actions evidence; never render or repair."""
import collections, hashlib, json, pathlib, re, subprocess, xml.etree.ElementTree as ET, zipfile

B = pathlib.Path('data/rcap-grade-a/packet-factory-24h')
OUT = B / 'closure-nine-20260911'
RUN = B / 'raster-runs/34651035676'
OLD = '7f04efd687f94b2bdd19a98f78f356480da5ee8f'
def read(p): return json.loads(pathlib.Path(p).read_text())
def sha(b): return hashlib.sha256(b).hexdigest()
def bind(p):
    p = pathlib.Path(p); b = p.read_bytes()
    return dict(path=str(p), sha256=sha(b), byteLength=len(b))
def oldbytes(p): return subprocess.check_output(['git', 'show', f'{OLD}:{p}'])
def normalize(s): return re.sub(r'\s+', ' ', s).strip()
def pages(b): return subprocess.check_output(['pdftotext', '-layout', '-', '-'], input=b).decode().split('\f')[:-1]
scope = read(B / 'vf08/tx-eight-current-20260911/scope.json')
streams = read(OUT / 'stream-measurements.json')
custody = read(RUN / 'ORIGINAL_EVIDENCE_VERIFIED.json')
results = []
for family in scope['families']:
    d = pathlib.Path(scope['directories'][family])
    sf = next(r for r in streams['families'] if r['familyId'] == family)
    proof = next(r for r in custody['families'] if r['familyId'] == family)
    rv = read(proof['verdictPath'])
    assert rv['verdict'] == 'RASTER_PASS' and str(rv['workflowRunId']) == '34651035676'
    assert rv['packetCommitSha'] == 'e2e6fb4a44cc3eadc0fd350dcbc677eeefb58b87'
    archive = pathlib.Path(proof['archivePath']).read_bytes()
    assert sha(archive) == proof['archiveSha256'] == proof['artifact']['digest'].removeprefix('sha256:')
    log = (RUN / (family + '.job.log')).read_bytes()
    assert sha(log) == proof['jobLogSha256']
    logged = [json.loads(l.split('RCAP_RECEIPT_VERDICT ', 1)[1]) for l in log.decode().splitlines() if 'RCAP_RECEIPT_VERDICT {' in l]
    assert logged == [rv]
    with zipfile.ZipFile(proof['archivePath']) as z:
        assert json.loads(z.read(family + '.verdict.json')) == rv
        for m in rv['measurements']:
            image = z.read(m['png'])
            assert sha(image) == m['pngSha256'] and len(image) == m['bytes']
    rendered = read(d / 'reports/rendered-artifacts.json')
    actual = read(d / 'reports/actual-writes.json')
    blanks = read(d / 'reports/blanks-left-for-the-participant.json')
    instructions = (d / 'participant-instructions.md').read_text()
    wire = read(d / 'product-wiring.json')
    route_bindings = []
    for filename in ['source-receipt.json', 'production-field-map.json', 'product-wiring.json']:
        current = read(d / filename); prior = json.loads(oldbytes(d / filename))
        route_bindings.append(dict(path=str(d / filename), routeKeysUnchanged=current.get('routeKeys') == prior.get('routeKeys'), routeSelectionUnchanged=current.get('routeSelectionId') == prior.get('routeSelectionId')))
    fixtures = []
    for kind in ['canonical', 'boundary']:
        path = d / 'fixtures' / (kind + '.pdf'); body = path.read_bytes()
        pp = pages(body); before = pages(oldbytes(path))
        assert len(pp) == len(before)
        artifact = next(a for a in rendered['pdfs'] if a['fixture'] == kind)
        assert sha(body) == artifact['sha256'] == rv['hashesBound'][kind]['pinned']
        assert len(pp) == artifact['pageCount'] and len(body) == artifact['byteLength']
        changes = [dict(page=i+1, before=before[i], after=t) for i,t in enumerate(pp) if t != before[i]]
        (OUT / f'{family}.{kind}.changes.json').write_text(json.dumps(changes, indent=2)+'\n')
        xml = ET.fromstring(subprocess.check_output(['pdftotext', '-bbox', str(path), '-']))
        ns = {'x':'http://www.w3.org/1999/xhtml'}
        xp = xml.findall('.//x:page', ns)
        wp = [[dict(text=''.join(n.itertext()), **{k:float(v) for k,v in n.attrib.items()}) for n in p.findall('x:word', ns)] for p in xp]
        measured = []
        for w in next(x for x in actual['documents'] if x['fixture'] == kind)['actualWrites']:
            if not w.get('rect'): continue
            r = w['rect']; p = w['page']; h = float(xp[p-1].attrib['height'])
            box = [r['x'], h-r['y']-r['height'], r['x']+r['width'], h-r['y']]
            words = [n for n in wp[p-1] if n['xMin'] >= box[0]-1.5 and n['xMax'] <= box[2]+1.5 and n['yMin'] >= box[1]-1.5 and n['yMax'] <= box[3]+1.5]
            expected = normalize(w.get('drawnText','')); found = normalize(' '.join(n['text'] for n in words))
            measured.append(dict(field=w['field'], page=p, expected=expected, found=found, presentInsideBox=bool(expected) and expected in found))
        statement = next(p for p in next(a for a in rendered['artifacts'] if a['fixture'] == kind)['pageManifest'] if p.get('sourceSha256') == 'bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d' and p.get('sourcePage') == 2)
        # Page-manifest entries vary between builders; find the mapped index.
        manifest = next(a for a in rendered['artifacts'] if a['fixture'] == kind)['pageManifest']
        statement_page = manifest.index(statement)+1
        expected_dob = '04/17/1994' if kind == 'canonical' else '12/31/1972'
        fixtures.append(dict(fixture=kind, **bind(path), pages=len(pp), changedTextPages=[c['page'] for c in changes],
            routeLeakPages=[i+1 for i,t in enumerate(pp) if re.search(r'obligation:', t)],
            statementDob=dict(page=statement_page, expected=expected_dob, present=expected_dob in pp[statement_page-1], isoPresent=bool(re.search(r'1994-04-17|1972-12-31',pp[statement_page-1]))),
            writeMeasurements=measured, staleSwornDatePages=[i+1 for i,t in enumerate(pp) if '12/15/2022' in t],
            outOfPaperWords=[dict(page=i+1,**w) for i,words in enumerate(wp) for w in words if w['xMin'] < -1 or w['yMin'] < -1 or w['xMax'] > float(xp[i].attrib['width'])+1 or w['yMax'] > float(xp[i].attrib['height'])+1]))
    missing = [w for w in blanks['requiredBeforeFiling'] if w.get('disclosureLabel',w.get('field','')) not in instructions]
    fm = read(d / 'production-field-map.json')
    refusals = [w for m in fm['maps'] for w in m.get('canonicalRefusals',[])]
    dob_tasks = [w for w in refusals if w.get('fieldName') in ['Month / Mes','Day / Día','Year / Año']]
    signing = [w for w in refusals if w.get('fieldName') in ['Today','Year']]
    result = dict(familyId=family, verifiedAtBase=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(), priorBase=OLD,
        priorFailedObligations=next(r for r in read(B/'vf08/rows-vf08-20260911-tx-eight-current.json')['rows'] if r['itemId']==family)['failedObligationNames'],
        fixtures=fixtures, routeBindings=route_bindings, markdownRouteLeaks=[l for l in instructions.splitlines() if 'obligation:' in l],
        requiredCount=len(blanks['requiredBeforeFiling']), missingRequiredLabels=missing, dobTasks=dob_tasks, protectedSigningDates=signing,
        originalRaster=dict(run='34651035676', pagesVerified=rv['pagesMeasured'], artifactAndLogAgree=True, allPngHashesVerified=True, proof=bind(RUN/'ORIGINAL_EVIDENCE_VERIFIED.json'), verdict=bind(proof['verdictPath'])),
        sources=sf['sources'], streamChangedPages={f['fixture']:f['changedPages'] for f in sf['fixtures']},
        bindings=[bind(d/p) for p in ['source-receipt.json','production-field-map.json','product-wiring.json','participant-instructions.md','reports/actual-writes.json','reports/blanks-left-for-the-participant.json']])
    assert all(x['routeKeysUnchanged'] and x['routeSelectionUnchanged'] for x in route_bindings)
    assert not missing and not result['markdownRouteLeaks']
    assert len(dob_tasks) == 3 and all(w['requiredBeforeFiling'] and w['completenessDisposition']=='REQUIRED_BEFORE_FILING' for w in dob_tasks)
    assert len(signing) == 2 and all(not w['requiredBeforeFiling'] for w in signing)
    for f in fixtures:
        assert not f['routeLeakPages'] and not f['staleSwornDatePages'] and not f['outOfPaperWords']
        assert f['statementDob']['present'] and not f['statementDob']['isoPresent']
        assert all(w['presentInsideBox'] for w in f['writeMeasurements'])
    results.append(result)
    print(family, 'PASS measurement assertions', sum(len(f['writeMeasurements']) for f in fixtures), 'widget writes', flush=True)
(OUT/'tx-current-measurements.json').write_text(json.dumps(results,indent=2)+'\n')
