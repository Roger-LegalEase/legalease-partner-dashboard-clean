import json,subprocess,xml.etree.ElementTree as E,hashlib
from pathlib import Path
b=Path('data/rcap-all50/overlays/census-v1/or/or-contempt-setaside-set--official-pdf-fill');out=Path('data/rcap-grade-a/packet-factory-24h/vfor1');report=json.loads((b/'reports/rendered-artifacts.json').read_text());expected=json.loads((b/'reports/expected-writes.json').read_text());results=[];failures=[]
for fx in expected['fixtures']:
 packet=next(p for p in report['packets'] if p['fixture']==fx['fixture']);cache={}
 for doc in packet['documents']:
  p=Path(doc['file']);assert hashlib.sha256(p.read_bytes()).hexdigest()==doc['sha256'];root=E.fromstring(subprocess.check_output(['pdftotext','-bbox',str(p),'-']));pages=[p for p in root.iter() if p.tag.endswith('page')];cache[doc['documentId']]=pages
 for i,w in enumerate(fx['writes']):
  doc=w.get('documentId') or (w['label'] if w['label'] in cache else 'official-motion-and-instructions');page=cache[doc][w['page']-1];box=w['box'];x=box.get('x',box.get('x0'));y=box.get('y',box.get('y0'));width=box.get('width');height=box.get('height');top=float(page.get('height'))-y-height;bottom=float(page.get('height'))-y
  if w['kind']=='text':bottom+=w.get('fontSize',12)*.3 # box.y is authored baseline; include actual font descender allowance
  words=[z for z in page.iter() if z.tag.endswith('word') and float(z.get('xMin'))>=x-.5 and float(z.get('xMax'))<=x+width+(2 if w['kind']=='text' else .5) and float(z.get('yMin'))>=top-.5 and float(z.get('yMax'))<=bottom+.5];text=' '.join(z.text or '' for z in words)
  if w['kind'] in ['text','widget']:
   value=w.get('rendered',w.get('value'));normalize=lambda s:''.join(s.split());passed=normalize(value) in normalize(text)
  elif w['kind']=='protected':value='';passed=not text
  else:continue
  item={'fixture':fx['fixture'],'index':i,'document':doc,'label':w['label'],'page':w['page'],'kind':w['kind'],'rect':box,'expected':value,'textReadInBox':text,'rightEdgeOverrunPoints':round(max([0]+[float(z.get('xMax'))-(x+width) for z in words]),3),'passed':passed};results.append(item)
  if not passed:failures.append(item)
result={'reviewer':'/root/prerequisite','method':'Independent pdftotext-bbox from saved components; expected text at specified authored baseline; allow font descenders0.3em and report actual right-edge overrun up to2pt separately; protected text areas empty. Selection strokes/source appearance checked separately.','results':results,'failures':failures};(out/'or-independent-text-and-protected-boxes.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'measured':len(results),'failureCount':len(failures),'failureLabels':[(x['fixture'],x['label']) for x in failures]},indent=2))
