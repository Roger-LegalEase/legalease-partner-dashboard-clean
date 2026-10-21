import hashlib
import json
import os
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
FAMILY = 'composed-treatment:nd-nonconviction-auto-close-verify'
OUT = ROOT / ('data/rcap-all50/overlays/census-v1/nd/' + FAMILY + '--custom-pleading')
RASTER = ROOT / 'data/rcap-grade-a/packet-factory-24h/raster-runs/34628970364'
ORIGINAL = Path('/tmp/rcap-original-34628970364/nd-10276130128')
ENV = {**os.environ, 'RCAP_NO_LOCAL_RASTER': '1'}
def sha(data): return hashlib.sha256(data).hexdigest()
def load(p): return json.loads(Path(p).read_text())
def write(name, data): (HERE/name).write_text(json.dumps(data, indent=2)+'\n')
def snapshot():
    return {str(p.relative_to(OUT)): {'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size,
             'mtimeNs':p.stat().st_mtime_ns,'ctimeNs':p.stat().st_ctime_ns}
             for p in sorted(OUT.rglob('*')) if p.is_file()}
commands=[]
def command(name,args):
    p=subprocess.run(args,cwd=ROOT,env=ENV,capture_output=True,text=True)
    # Preserve command content; trim trailing whitespace for repository diff checks.
    (HERE/(name+'.stdout.log')).write_text(''.join(line.rstrip()+'\n' for line in p.stdout.splitlines()))
    (HERE/(name+'.stderr.log')).write_text(''.join(line.rstrip()+'\n' for line in p.stderr.splitlines()))
    commands.append({'name':name,'argv':args,'exit':p.returncode,'stdout':name+'.stdout.log','stderr':name+'.stderr.log','logNormalization':'trailing whitespace only'})
    return p
before=snapshot()
command('grant-can-assert',['node','scripts/grade-a-packet-factory-24h/claim.mjs','--can-assert','VF01',FAMILY])
command('grant-assert',['node','scripts/grade-a-packet-factory-24h/claim.mjs','--assert','VF01',FAMILY])
cli=command('production-check',['node','scripts/build-census-v1-'+FAMILY+'.mjs','--check'])
after_cli=snapshot()
command('existing-focused-tests',['node','--test','scripts/rcap-packet-recovery/test-nd-nonconviction-timing.mjs'])
after_tests=snapshot()
command('completeness',['node','scripts/rcap-packet-completeness/verify-packet-completeness.mjs','--family',FAMILY])
after_all=snapshot()
write('checks.json',commands)
write('read-only-proof.json',{'before':before,'afterCli':after_cli,'afterFocusedTests':after_tests,'afterCompleteness':after_all,
    'cliReadOnly':before==after_cli,'focusedTestsReadOnly':before==after_tests,'completenessReadOnly':before==after_all,
    'cliResult':json.loads(cli.stdout) if cli.returncode==0 else None})

source=load(OUT/'source-receipt.json'); manifest=load(OUT/'reports/rendered-artifacts.json')
fieldmap=load(OUT/'production-field-map.json'); wiring=load(OUT/'product-wiring.json')
proofs=load(OUT/'reports/actual-writes.json')
queue=load(ROOT/'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')
def exact(x):
    if isinstance(x,dict):
        if x.get('familyId')==FAMILY and 'rasterReceipt' in x:return x
        for v in x.values():
            found=exact(v)
            if found:return found
    if isinstance(x,list):
        for v in x:
            found=exact(v)
            if found:return found
q=exact(queue)
verdict_name='composed-treatment_nd-nonconviction-auto-close-verify.verdict.json'
verdict=load(RASTER/verdict_name)
source_bindings=[]
for record in source['committedRecords']:
    p=ROOT/record['pathInRepository']; raw=p.read_bytes()
    source_bindings.append({'path':record['pathInRepository'],'recordId':record['recordId'],'sha256':sha(raw),'bytes':len(raw),
      'matchesReceipt':sha(raw)==record['sha256'] and len(raw)==record['byteLength'],'anchors':record['anchorStatementsVerified']})
pdfs=[]; page_evidence=[]; writes=[]
for art in manifest['artifacts']:
    p=ROOT/art['file']; raw=p.read_bytes()
    text=subprocess.check_output(['pdftotext','-layout',str(p),'-'],cwd=ROOT,text=True)
    (HERE/(art['fixture']+'.extracted.txt')).write_text(text)
    pages=text.split('\f'); pages=pages[:-1] if pages[-1].strip()=='' else pages
    pdfinfo=subprocess.check_output(['pdfinfo',str(p)],text=True)
    count=int(next(line.split(':',1)[1] for line in pdfinfo.splitlines() if line.startswith('Pages:')))
    oldraw=subprocess.check_output(['git','show',verdict['packetCommitSha']+':'+art['file']],cwd=ROOT)
    queued=next(d for d in q['documents'] if d['role']==art['fixture'])
    pdfs.append({'fixture':art['fixture'],'path':art['file'],'sha256':sha(raw),'bytes':len(raw),'pageCount':count,
      'manifestMatches':sha(raw)==art['sha256'] and len(raw)==art['byteLength'] and count==art['pageCount'],
      'queueMatches':sha(raw)==queued['sha256'] and count==queued['pageCount'],
      'originalVerdictMatches':sha(raw)==verdict['hashesBound'][art['fixture']]['pinned'],
      'sameBytesAtPinnedRasterCommit':raw==oldraw})
    by_component={}
    for page in art['pageManifest']:
        by_component.setdefault(page['component'],[]).append(pages[page['packetPage']-1])
    def norm(s):return ' '.join(s.split())
    declared=next(d for d in proofs['documents'] if d['fixture']==art['fixture'])
    for item in declared['actualWrites']:
        component_text=norm(' '.join(by_component[item['document']]))
        writes.append({'fixture':art['fixture'],'field':item['field'],'component':item['document'],
          'factId':item['factId'],'expected':item['expected'],'foundInOwnComponent':norm(item['expected']) in component_text})
    bbox=subprocess.check_output(['pdftotext','-bbox',str(p),'-'],text=True)
    dom=ET.fromstring(bbox)
    for page_num,node in enumerate(dom.findall('.//{*}page'),1):
        words=[]; clipped=[]; overlaps=[]
        for w in node.findall('.//{*}word'):
            b={k:float(w.attrib[k]) for k in ['xMin','xMax','yMin','yMax']};b['text']=w.text or '';words.append(b)
            if b['xMin']<0 or b['yMin']<0 or b['xMax']>float(node.attrib['width']) or b['yMax']>float(node.attrib['height']):clipped.append(b)
        for i,a in enumerate(words):
            for b in words[i+1:]:
                if abs(a['yMin']-b['yMin'])<1 and min(a['xMax'],b['xMax'])-max(a['xMin'],b['xMin'])>1: overlaps.append([a,b])
        page_evidence.append({'fixture':art['fixture'],'page':page_num,'component':art['pageManifest'][page_num-1]['component'],
          'wordCount':len(words),'clippedWordCount':len(clipped),'sameBaselineWordOverlapCount':len(overlaps),
          'clipped':clipped,'overlaps':overlaps})

png_records=load(RASTER/(FAMILY+'.PAGE_IMAGES_SHA256.json'))
original_archive=Path(str(ORIGINAL)+'.zip')
with zipfile.ZipFile(original_archive) as archive:
    pngs=[]
    for record in png_records:
        raw=(ORIGINAL/record['member']).read_bytes(); archived=archive.read(record['member'])
        pngs.append({**record,'matchesDurablePin':len(raw)==record['bytes'] and sha(raw)==record['sha256'],
           'sameAsOriginalZipMember':raw==archived})
    verdict_raw=archive.read(verdict_name)
bindings={'schemaVersion':'rcap-independent-current-byte-measurement/v1','familyId':FAMILY,
  'verifiedAtBase':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
  'sourceBindings':source_bindings,'pdfs':pdfs,
  'routeAgreement':sorted(source['routeKeys'])==sorted(fieldmap['routeKeys'])==sorted(wiring['routeKeys'])==sorted(wiring['binding']['routeKeys']),
  'components':fieldmap['componentSet'],'manifestComponents':manifest['componentSet'],
  'wiringBindingComponents':wiring['binding']['packetComponents'],'wiringInstrumentKinds':wiring['binding']['instrumentKinds'],
  'wiringIndependentVerification':wiring['binding']['lastIndependentVerification'],
  'wiringCanonicalMatches':wiring['proposedRepresentation']['components'][0]['sha256']==pdfs[0]['sha256'],
  'raster':{'workflowRunId':verdict['workflowRunId'],'pinnedCommit':verdict['packetCommitSha'],'verdict':verdict['verdict'],
    'pagesMeasured':verdict['pagesMeasured'],'documentDigestMatchesQueue':verdict['documentsDigest']==q['documentsDigest']==q['rasterReceipt']['documentsDigest'],
    'verdictSameAsOriginalArchive':verdict_raw==(RASTER/verdict_name).read_bytes(),
    'originalArchiveSha256':sha(original_archive.read_bytes()),'archiveMatchesAcceptedDigest':'sha256:'+sha(original_archive.read_bytes())==q['rasterReceipt']['receiptArtifact']['digest'],
    'pngs':pngs,'problems':verdict['problems'],'environmentProblems':verdict['environmentProblems']},
  'actualWrites':{'count':len(writes),'allFoundInOwnComponents':all(w['foundInOwnComponent'] for w in writes),'writes':writes},
  'pages':page_evidence,'readOnly':before==after_all}
write('current-byte-measurements.json',bindings)
print(json.dumps({'commands':[{k:c[k] for k in ['name','exit']} for c in commands],
  'readOnly':before==after_all,'pdfs':pdfs,'sourceBindings':source_bindings,
  'writesReadBack':sum(w['foundInOwnComponent'] for w in writes),'writesDeclared':len(writes),'pngs':len(pngs),
  'allPngsMatch':all(p['matchesDurablePin'] and p['sameAsOriginalZipMember'] for p in pngs),
  'clippedWords':sum(p['clippedWordCount'] for p in page_evidence),'wordOverlaps':sum(p['sameBaselineWordOverlapCount'] for p in page_evidence)},indent=2))
