import json,hashlib,subprocess,re,zipfile,xml.etree.ElementTree as E,collections
from pathlib import Path
B=Path('data/rcap-all50/overlays/census-v1/mt/mt-mmrta-serving-set--official-pdf-fill'); O=Path('data/rcap-grade-a/packet-factory-24h/vfmtasem1')
read=lambda p:json.loads(Path(p).read_text()); sha=lambda b:hashlib.sha256(b).hexdigest(); norm=lambda s:' '.join(s.split()); tok=lambda s:''.join(c.lower() for c in s if c.isalnum())
def pin(p):
 b=Path(p).read_bytes();return dict(path=str(p),sha256=sha(b),byteLength=len(b))
def text(p):return subprocess.check_output(['pdftotext','-layout',str(p),'-']).decode()
def words(p):
 root=E.fromstring(subprocess.check_output(['pdftotext','-bbox',str(p),'-']));out=[]
 for page in root.iter('{http://www.w3.org/1999/xhtml}page'):
  out.append(collections.Counter((x.text,*[round(float(x.attrib[a]),2) for a in ['xMin','yMin','xMax','yMax']]) for x in page.iter('{http://www.w3.org/1999/xhtml}word')))
 return out
handoff=read('data/rcap-grade-a/packet-factory-24h/pf15/mt-mmrta-serving-20260913/rows-pf15-mt-mmrta-serving-complete.json');binding=[]
for p in handoff['candidateBindings']:
 actual=pin(p['path']);binding.append(dict(**actual,matchesAuthor=actual==p));assert actual==p,actual
track=read(B/'reports/adopted-track-input-snapshot.json')['track']
def find(x):
 if isinstance(x,dict):
  if x.get('trackId')=='mt_mmrta_serving':return x
  for v in x.values():
   f=find(v)
   if f:return f
 if isinstance(x,list):
  for v in x:
   f=find(v)
   if f:return f
assert find(read('data/record-clearing/legal-design-track-registry.json'))==track
source=[];sourcewords={}
for d in read(B/'source-receipt.json')['documents']:
 orig=Path('private/transfers/mt-mmrta-completed-ready-20260913/sources')/d['path']
 if not orig.exists():orig=Path('private/transfers/mt-mmrta-serving-ready-20260913/sources')/d['path'] if d['sourceId']=='official-form:MT-FORM-A' else Path('private/transfers/mt-readiness-20260913/exact-existing-doj-source.docx')
 if not orig.exists():
  der=d['derivedPrint']['path'];assert pin(der)['sha256']==d['derivedPrint']['sha256'];sourcewords[d['documentId']]=words(der);source.append(dict(sourceId=d['sourceId'],originalUnavailable=True,derived=pin(der)));continue
 p=pin(orig);assert p['sha256']==d['sha256'] and p['byteLength']==d['byteLength'];der=d['derivedPrint']['path'];assert pin(der)['sha256']==d['derivedPrint']['sha256']
 root=E.fromstring(zipfile.ZipFile(orig).read('word/document.xml'));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'};paras=[''.join(x.itertext()) for x in []]
 paras=[''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in root.findall('.//w:p',ns) if not p.findall('.//w:p',ns)]
 content=tok(text(der)); extractedWords=collections.Counter(re.findall(r'[a-z0-9]+',text(der).lower())); missing=[p for p in paras if tok(p) and tok(p) not in content and collections.Counter(re.findall(r'[a-z0-9]+',p.lower()))-extractedWords];assert not missing,missing
 sourcewords[d['documentId']]=words(der)
 source.append(dict(original=p,derived=pin(der),bodyParagraphsChecked=sum(bool(tok(x)) for x in paras),missingParagraphs=missing,derivedPages=len(sourcewords[d['documentId']])))
fx={x['fixture']:x for x in read(B/'fixtures/inputs.json')['fixtures']};writes={x['fixture']:x['actualWrites'] for x in read(B/'reports/actual-writes.json')['documents']};art=[]
for a in read(B/'reports/rendered-artifacts.json')['artifacts']:
 p=pin(a['file']);assert p['sha256']==a['sha256'] and p['byteLength']==a['byteLength'];raw=text(a['file']);pages=raw.split('\f');assert len([x for x in pages if x.strip()])==a['pageCount'];f=fx[a['fixture']]
 for w in writes[a['fixture']]:assert norm(w['value']) in norm(pages[w['page']-1]),w
 for g in track['generationRequirements']:
  if g['requirement']=='required':assert g['key'] in f
 for w in writes[a['fixture']]:
  if w['field'] in f and w['value']!='X' and w['rectBasis']=='actual_saved_overlay_coordinates':assert w['value']==f[w['field']],w
 for stop in track['selfHelpStopConditions']:
  s=stop if isinstance(stop,str) else stop.get('description',stop.get('statement',''));assert not s or tok(s) in tok(raw),s
 sw=words(a['file']);preserved=0
 for m in a['pageManifest']:
  if m['component'] in sourcewords:
   expected=sourcewords[m['component']][m['sourcePage']-1];missing=expected-sw[m['packetPage']-1];assert not missing,(a['fixture'],m,missing);preserved+=sum(expected.values())
 assert a['conditionalDOJ']['included']==(f['postOrderOutcome']=='expungement' and f['postOrderDocumentReceived']);assert a['conditionalDOJ']['included']==(a['pageCount']==11)
 assert all(w['field'] in ['fullName','street','cityStateZip','phone','email','petitionerName','courtLevelDistrict','courtLevelJustice','courtLevelCity','captionFullName','sentencingCity','judicialDistrict','sentencingCounty','city'] for w in writes[a['fixture']] if w['document']=='mt_mmrta_serving-proposed-order-3'), [w['field'] for w in writes[a['fixture']] if w['document']=='mt_mmrta_serving-proposed-order-3']
 art.append(dict(**p,fixture=a['fixture'],pageCount=a['pageCount'],savedWritesReadBack=len(writes[a['fixture']]),sourceWordsAtOriginalCoordinates=preserved,conditionalDOJ=a['conditionalDOJ'],pageManifest=a['pageManifest']))
out=dict(familyId='mt_mmrta_serving-set',reviewer='/root/mt_form_b_independent_review',candidateCommit='e5eead270915ae52b1554fca1b8ac2110e6a9600',nativeEnrollmentCommit=None,candidateBindings=binding,adoptedTrackProjectionUnchanged=True,originalSourceChecks=source,artifacts=art,totalPages=sum(x['pageCount'] for x in art),totalWrites=sum(x['savedWritesReadBack'] for x in art),noRebuild=True,visualMeasured=False)
(O/'saved-byte-measurements.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(dict(pages=out['totalPages'],writes=out['totalWrites'],bindings=len(binding),sources=len(source))))
