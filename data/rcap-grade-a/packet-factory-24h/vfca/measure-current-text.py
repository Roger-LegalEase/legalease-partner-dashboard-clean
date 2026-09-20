import json,subprocess,xml.etree.ElementTree as E,hashlib
from pathlib import Path
b=Path('data/rcap-all50/overlays/census-v1/ca/ca-diversion-seal-set--official-pdf-fill');out=Path('data/rcap-grade-a/packet-factory-24h/vfca');report=json.loads((b/'reports/rendered-artifacts.json').read_text());expected=json.loads((b/'reports/expected-writes.json').read_text());results=[];failures=[]
def pages(p):
 r=E.fromstring(subprocess.check_output(['pdftotext','-bbox',str(p),'-']));return [[dict(w.attrib,text=w.text or '')for w in page.iter()if w.tag.endswith('word')]for page in r.iter()if page.tag.endswith('page')]
source=pages(b/'source-normalization/crm307-print-normalized.pdf')
def same(a,z):return a['text']==z['text'] and all(abs(float(a[k])-float(z[k]))<.01 for k in ['xMin','xMax','yMin','yMax'])
for fx in expected['fixtures']:
 packet=next(p for p in report['packets']if p['fixture']==fx['fixture']);cache={}
 for doc in packet['documents']:
  p=Path(doc['file']);assert hashlib.sha256(p.read_bytes()).hexdigest()==doc['sha256'];cache[doc['documentId']]=pages(p)
 for i,w in enumerate(fx['writes']):
  doc=w.get('documentId','crm307');page=cache[doc][w['page']-1];box=w['box'];x,y,width,height=map(box.get,['x','y','width','height']);top=792-y-height;bottom=792-y
  added=[z for z in page if doc!='crm307' or not any(same(z,a)for a in source[w['page']-1])]
  if w['kind']=='text':bottom+=w.get('fontSize',10)*.3
  words=[z for z in added if float(z['xMin'])>=x-.5 and float(z['xMax'])<=x+width+.5 and float(z['yMin'])>=top-.5 and float(z['yMax'])<=bottom+.5];text=' '.join(z['text']for z in words)
  if w['kind']=='text':value=w.get('rendered',w.get('value'));normalize=lambda s:''.join(s.split());passed=normalize(value)in normalize(text)
  elif w['kind']=='protected':
   value='';words=[z for z in added if float(z['xMax'])>x and float(z['xMin'])<x+width and float(z['yMax'])>top and float(z['yMin'])<bottom];text=' '.join(z['text']for z in words);passed=not words
  else:continue
  item={'fixture':fx['fixture'],'index':i,'document':doc,'label':w['label'],'page':w['page'],'kind':w['kind'],'rect':box,'expected':value,'addedTextReadInBox':text,'passed':passed};results.append(item)
  if not passed:failures.append(item)
 # Check every native refused box, subtracting preserved source labels/lines.
 for blank in json.loads((b/'production-field-map.json').read_text())['refusals']:
  if blank['fixture']!=fx['fixture']:continue
  doc=blank['documentId'].split('/',1)[1];page=cache[doc][blank['page']-1];x,y,width,height=blank['rect'];top=792-y-height;bottom=792-y
  added=[z for z in page if not any(same(z,a)for a in source[blank['page']-1])]
  overlapping=[z for z in added if float(z['xMax'])>x and float(z['xMin'])<x+width and float(z['yMax'])>top and float(z['yMin'])<bottom]
  item={'fixture':fx['fixture'],'document':doc,'label':blank['label'],'page':blank['page'],'kind':'native_refused_box','rect':blank['rect'],'addedTextReadInBox':' '.join(z['text']for z in overlapping),'passed':not overlapping};results.append(item)
  if overlapping:failures.append(item)
# All original printed text is retained by normalized printing, excluding only screen controls.
p='reference/source-recovery/2026-09-11-wave1/crm307.pdf';original=subprocess.check_output(['pdftotext','-layout',p,'-']).decode();normalized=subprocess.check_output(['pdftotext','-layout',str(b/'source-normalization/crm307-print-normalized.pdf'),'-']).decode();compact=lambda s:''.join(s.split());orig=compact(original)
for t in ['For your protection and privacy, press the Clear This Form button on the last page after printing.','Clear This Form']:orig=orig.replace(compact(t),'')
assert compact(normalized)==orig
result={'reviewer':'/root/prerequisite','method':'Independent pdftotext-bbox from saved components; source words excluded by exact text/coordinates; text located in actual authored boxes with0.5pt coordinate tolerance and0.3em descender allowance; protected boxes checked for any added overlapping words. Stream proof separately checks source preservation, selection ink and assembly.','packets':[{'fixture':p['fixture'],'sha256':p['sha256']}for p in report['packets']],'printableSourceTextExact':True,'results':results,'failures':failures};(out/'ca-independent-text-and-protected-boxes.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'measured':len(results),'failureCount':len(failures),'failureLabels':[(x['fixture'],x['label'])for x in failures]},indent=2))
