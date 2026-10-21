import json,subprocess,xml.etree.ElementTree as ET,hashlib,re,collections
from pathlib import Path
root=Path('data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill'); out=Path('data/rcap-grade-a/packet-factory-24h/vfutnext1')
def read(p):return json.loads(Path(p).read_text())
def pages(p):
 raw=subprocess.check_output(['pdftotext','-bbox',str(p),'-']);doc=ET.fromstring(raw);return [[dict(text=''.join(w.itertext()),**{k:float(v) for k,v in w.attrib.items()}) for w in page if w.tag.endswith('word')] for page in doc.iter() if page.tag.endswith('page')]
def key(w):return (w['text'],*[round(w[x],2) for x in ['xMin','yMin','xMax','yMax']])
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
sources=read(root/'source-receipt.json')['sources']; src={x['formNumber']:pages(x['path']) for x in sources}
census={d['formNumber']:{f['blankId']:f for f in d['fields']} for d in read(root/'field-census.census-v1.json')['documents']}
arts=read(root/'reports/rendered-artifacts.json')['artifacts'];writes=read(root/'reports/actual-writes.json')['writes'];problems=[];results=[];writechecks=[]
for a in arts:
 f=root/'fixtures'/f"{a['fixture']}.json";facts=read(f);assert digest(a['file'])==a['sha256'];assert Path(a['file']).stat().st_size==a['byteLength']; ps=pages(a['file']);assert len(ps)==a['pageCount']; per=[]
 for m in a['pageManifest']:
  n=m['packetPage'];ws=ps[n-1]
  if m['classification']!='INSTRUCTIONS' and m.get('formNumber') in src:
   original=collections.Counter(key(w) for w in src[m['formNumber']][m['sourcePage']-1]);saved=collections.Counter(key(w) for w in ws);missing=list((original-saved).elements());extra=list((saved-original).elements());
   expectedAdded=collections.Counter(token for w in writes if w['fixture']==a['fixture'] and w['packetPage']==n for token in w['text'].split())
   observedAdded=collections.Counter(k[0] for k in extra)
   if expectedAdded!=observedAdded:problems.append({'fixture':a['fixture'],'page':n,'unreportedOrMissingAddedWords':{'unexpected':list((observedAdded-expectedAdded).elements()),'missing':list((expectedAdded-observedAdded).elements())}})
   if missing:problems.append({'fixture':a['fixture'],'page':n,'missingOriginalWords':missing})
   per.append({'page':n,'source':m['formNumber'],'sourcePage':m['sourcePage'],'originalWordCount':sum(original.values()),'missingOriginalWords':len(missing),'addedWords':len(extra)})
 for w in [w for w in writes if w['fixture']==a['fixture']]:
  field=census[w['formNumber']][w['blankId']]
  assert field['disposition']==('AUTO_SELECT' if w['isSelection'] else 'AUTO_FILL'),w
  assert field['page']==w['sourcePage'],w
  if w['isSelection']:assert facts[field['key']]==field['value'],w
  ws=ps[w['packetPage']-1];baseline=792-w['y'];near=[z for z in ws if abs(z['yMax']-baseline)<4 and z['xMin']>=w['x']-.4 and z['xMax']<=w['x']+w['boxWidth']+.4];text=' '.join(z['text'] for z in sorted(near,key=lambda z:z['xMin']));ok=w['text']==text
  # Word extraction can merge adjacent whitespace-separated original labels; exact text in declared span still required.
  if not ok:problems.append({'fixture':a['fixture'],'blank':w['blankId'],'page':w['packetPage'],'expected':w['text'],'actual':text,'baseline':baseline})
  if w.get('participantFact') and not w['isSelection'] and w['text']!=str(facts[w['participantFact']]):problems.append({'fixture':a['fixture'],'blank':w['blankId'],'factMismatch':True})
  writechecks.append({'fixture':a['fixture'],'blank':w['blankId'],'page':w['packetPage'],'text':w['text'],'foundExactAtDeclaredPosition':ok,'right':max([z['xMax'] for z in near],default=None),'fieldRight':w['x']+w['boxWidth']})
 text=' '.join(w['text'] for pp in ps for w in pp)
 for phrase in ['agency records are unchanged','searchable by case number','does not expunge','before paying','30 days','domestic violence','fee-waiver','prosecuting attorney']:
  if phrase not in text:problems.append({'fixture':a['fixture'],'warningMissing':phrase})
 results.append({'fixture':a['fixture'],'sha256':a['sha256'],'pageCount':len(ps),'pages':per})
report={'artifacts':results,'writeChecks':writechecks,'problems':problems,'pagesMeasured':sum(a['pageCount'] for a in arts),'writesMeasured':len(writechecks)}
(out/'saved-page-measurements.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'pages':report['pagesMeasured'],'writes':len(writechecks),'problems':problems},indent=2))
