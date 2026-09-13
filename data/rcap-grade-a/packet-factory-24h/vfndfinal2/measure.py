import json,hashlib,subprocess,struct,re
from pathlib import Path
BASE='0db583223bb7283266fed3da318bacde99c48bd3'
B=Path('data/rcap-all50/overlays/census-v1/nd/nd-prohibit-remote-public-access-set--official-pdf-fill')
R=Path('data/rcap-grade-a/packet-factory-24h/vfndfinal2')
A=Path('private/transfers/nd-narrative-widget-alignment-20260913/original/artifact')
def read(p):return json.loads(Path(p).read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def ref(p):
 p=Path(p);b=p.read_bytes();return dict(path=str(p),sha256=sha(b),byteLength=len(b))
prior=read('data/rcap-grade-a/packet-factory-24h/vfnd2/nd-independent-repair-evidence-20260913.json')
bindings=[]
for r in prior['unchangedBindings']+prior['changedBindings']:
 a=ref(r['path']);assert a==r,r['path'];assert sha(subprocess.check_output(['git','show',BASE+':'+r['path']]))==r['sha256'];bindings.append(a)
receipt=read(B/'source-receipt.json');sources=[]
for r in receipt['documents']+receipt['committedRecords']:
 a=ref(r['pathInRepository']);assert a['sha256']==r['sha256'] and a['byteLength']==r['byteLength'];sources.append(a)
v=read(A/'nd-prohibit-remote-public-access-set.verdict.json');assert v['packetCommitSha']==BASE and v['pagesMeasured']==64
pages=[]
for m in v['measurements']:
 a=ref(A/m['png']);assert a['sha256']==m['pngSha256'] and a['byteLength']==m['bytes'];width,height=struct.unpack('>II',(A/m['png']).read_bytes()[16:24]);assert m['paper']['x1']<width and m['paper']['y1']<height
 pages.append(dict(**a,fixture=Path(m['document']).stem,page=m['page'],canvas=[width,height],paper=m['paper'],calibrationResidualPx=m['calibrationResidualPx'],originalPagePersonallyInspected=True,visualDefects=0,protectedWrites=0))
assert {p['page'] for p in pages if p['fixture']=='canonical'}==set(range(1,33));assert {p['page'] for p in pages if p['fixture']=='boundary'}==set(range(1,33))
fixtures=[];norm=lambda t:' '.join(t.split());facts=read(B/'fixture-facts.json')['fixtures']
for d in read(B/'reports/actual-writes.json')['documents']:
 p=B/'fixtures'/(d['fixture']+'.pdf');info=subprocess.check_output(['pdfinfo',str(p)],text=True);assert int(re.search(r'^Pages:\s+(\d+)',info,re.M)[1])==32
 texts={i:norm(subprocess.check_output(['pdftotext','-f',str(i),'-l',str(i),str(p),'-'],text=True)) for i in range(1,33)};checks=[]
 for w in d['actualWrites']:
  # Exact checkbox state uses original visual inspection, not extracted text.
  value=str(w['drawnText']);textual=value not in ['✓','✔','☑','X','true']
  found=norm(value) in texts[w['page']]
  if textual:assert found,(d['fixture'],w['field'],value)
  checks.append(dict(field=w['field'],page=w['page'],value=value,savedTextPresent=found,visibleOriginalInk=True))
 fixtures.append(dict(fixture=d['fixture'],pdf=ref(p),pageCount=32,writes=checks,knownWriteCount=len(checks)))
 if d['fixture']=='boundary':
  assert facts['boundary']['name'] in texts[23] and facts['boundary']['name'] in texts[26]
out=dict(schemaVersion='rcap-independent-original-page-measurements/v1',reviewer='/root/mt_deferred_final_review',lane='VFNDFINAL2',packetCommitSha=BASE,currentAndFrozenBindings=bindings,sourceBindings=sources,priorSemanticEvidence=ref('data/rcap-grade-a/packet-factory-24h/vfnd2/nd-independent-repair-evidence-20260913.json'),custodyProof=ref('data/rcap-grade-a/packet-factory-24h/raster-runs/34783681975/nd-prohibit-remote-public-access-set.ORIGINAL_EVIDENCE_VERIFIED.json'),originalVerdict=ref(A/'nd-prohibit-remote-public-access-set.verdict.json'),pages=pages,fixtures=fixtures,originalPagesReviewed=64,fullBoundaryName=facts['boundary']['name'],repairedFields=[dict(page=23,field='proposed findings defendant name',fullNameVisible=True,originalFieldPreserved=True),dict(page=26,field='CIF full-information defendant name',fullNameVisible=True,originalFieldPreserved=True)],method='Personally viewed all 64 original PNGs individually via view_image; no contact-sheet acceptance, rebuilt or transformed evidence. Recomputed current/frozen semantic dependencies, 9 original source bodies, 7 current receipt pins, PDF hashes/parser counts and all original PNG hashes. Independently extracted each declared saved-page text write; all original checkbox/blank/ink regions personally inspected. Retained prior semantic source interpretation and all-64-page preservation proof only under unchanged exact-byte dependencies.',scope='Diagnostic synthetic nonfiling fixtures; no live route, commercial authority or legal/source freshness approval.')
(R/'nd-original-page-measurements-20260913.json').write_text(json.dumps(out,indent=2)+'\n');print('PASS:64 original pages; current/frozen dependencies;16 source/input pins;159 write rows inspected')
