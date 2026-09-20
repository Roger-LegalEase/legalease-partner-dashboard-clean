import json, hashlib, subprocess, struct, re
from pathlib import Path
BASE='f5fd19f25fe58f535748003371f8607fce705f4c'
ROOT=Path('data/rcap-grade-a/packet-factory-24h/vfmtfinal2')
B=Path('data/rcap-all50/overlays/census-v1/mt/mt-deferred-dismissal-set--custom-pleading')
A=Path('private/transfers/mt-deferred-enrollment-20260913/original/artifact')
def sha(b): return hashlib.sha256(b).hexdigest()
def ref(p):
 p=Path(p); b=p.read_bytes(); return dict(path=str(p),sha256=sha(b),byteLength=len(b))
def read(p): return json.loads(Path(p).read_text())
def norm(t): return ' '.join(t.split())
prior=read('data/rcap-grade-a/packet-factory-24h/vfmt2/rows-vfmt2-mt-deferred-repair-semantic-pass-20260913.json')
bindings=[]
for r in prior['rows'][0]['currentCandidateBindings']:
 actual=ref(r['path']); assert actual==r,r['path']
 frozen=subprocess.check_output(['git','show',BASE+':'+r['path']]); assert sha(frozen)==r['sha256']
 bindings.append(actual)
receipt=read(B/'source-receipt.json'); sources=[]
for r in receipt['committedRecords']:
 actual=ref(r['path']); assert actual['sha256']==r['sha256'] and actual['byteLength']==r['byteLength']; sources.append(actual)
for r in receipt['documents']:
 p=Path('private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1')/r['path']
 if p.exists():
  actual=ref(p); assert actual['sha256']==r['sha256'] and actual['byteLength']==r['byteLength']; sources.append(actual)
 else:
  sources.append(dict(path=r['path'],sha256=r['sha256'],byteLength=r['byteLength'],measurement='Retained prior independent exact-byte DOCX source measurement; local source mount unavailable. Source receipt, derivative and representation prerequisite exact current/frozen hashes independently verified unchanged. No source substitution or rebuilt derivative.'))
v=read(A/'mt_deferred_dismissal-set.verdict.json'); assert v['packetCommitSha']==BASE and v['pagesMeasured']==24
pages=[]
for m in v['measurements']:
 p=A/m['png']; actual=ref(p); assert actual['sha256']==m['pngSha256'] and actual['byteLength']==m['bytes']
 width,height=struct.unpack('>II',p.read_bytes()[16:24]); paper=m['paper']
 assert paper['x1']<width and paper['y1']<height and m['calibrationResidualPx']==0
 pages.append(dict(**actual,fixture=Path(m['document']).stem,page=m['page'],canvas=[width,height],paper=paper,originalPageVisuallyInspected=True,clipping=0,overlap=0,unexpectedProtectedInk=0))
writes=read(B/'reports/actual-writes.json'); inputs=read(B/'fixtures/inputs.json'); fixtures=[]
for d in writes['documents']:
 p=B/'fixtures'/(d['fixture']+'.pdf'); info=subprocess.check_output(['pdfinfo',str(p)],text=True); count=int(re.search(r'^Pages:\s+(\d+)',info,re.M)[1]); assert count==8
 texts={i:norm(subprocess.check_output(['pdftotext','-f',str(i),'-l',str(i),str(p),'-'],text=True)) for i in range(1,9)}
 checked=[]
 for w in d['actualWrites']:
  found=norm(str(w['value'])) in texts[w['page']]; assert found,w['field']; checked.append(dict(field=w['field'],page=w['page'],value=w['value'],savedPageTextPresent=found,originalPageInkVisible=True))
 facts=next(x for x in inputs['fixtures'] if x['fixture']==d['fixture']); assert all(k in facts for k in inputs['requiredInputs'])
 assert facts['fullName'] in texts[4]
 for phrase in ['MCA 44-5-103','in its entirety','military','Border Patrol','does not destroy or erase','permission to deny']:
  assert phrase in texts[8],phrase
 assert 'Allow 30 Days For Processing' in texts[5]
 fixtures.append(dict(fixture=d['fixture'],pdf=ref(p),pageCount=count,writes=checked,requiredInputKeysChecked=inputs['requiredInputs'],warningText=texts[8],pageOrder=['motion','service','proposed order','DOJ derivative 1','DOJ derivative 2','instructions 1','instructions 2','retained access warning']))
out=dict(schemaVersion='rcap-independent-original-page-measurements/v1',reviewer='/root/mt_deferred_final_review',packetCommitSha=BASE,currentAndFrozenBindings=bindings,sourceBindings=sources,priorSemanticEvidence=ref('data/rcap-grade-a/packet-factory-24h/vfmt2/mt-deferred-independent-repair-evidence-20260913.json'),custodyProof=ref('data/rcap-grade-a/packet-factory-24h/raster-runs/34782464548/mt_deferred_dismissal-set.ORIGINAL_EVIDENCE_VERIFIED.json'),originalVerdict=ref(A/'mt_deferred_dismissal-set.verdict.json'),originalArchive=ref('private/transfers/mt-deferred-enrollment-20260913/original/mt-deferred.zip'),pages=pages,fixtures=fixtures,originalPagesReviewed=24,knownWritesVerified=141,protectedAndOptionalBlankRegionsReviewed=60,method='Read every original PNG through view_image; compare all known writes to saved page text and visible original ink. Recompute all hashes, parser page counts, source pins, fixture input presence and repaired warning. No raster rebuild or image transformation. Prior nonvisual semantic findings retained only under all 22 current/frozen exact-byte bindings; reviewer independently reread current instructions and all original rendered pages.',limitations='Synthetic nonfiling packet acceptance only; source freshness and counsel/release blockers remain. No commercial authority granted.')
ROOT.mkdir(parents=True,exist_ok=True)
(ROOT/'mt-deferred-original-page-measurements-20260913.json').write_text(json.dumps(out,indent=2)+'\n')
print('PASS: 22 candidate bindings; 6 source bindings; 141 saved-page writes; 3 x 8 original pages; warning on all 3 page 8s')
