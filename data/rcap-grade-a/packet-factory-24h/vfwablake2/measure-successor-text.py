import json,pathlib,subprocess,xml.etree.ElementTree as E,hashlib,collections
b=pathlib.Path('data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill');o=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vfwablake2');m=json.loads((b/'production-field-map.json').read_text());cache={};rows=[];fails=[]
for w in m['writes']:
 if w['isSelectionControl']:continue
 fixture,form=w['documentId'].split('/');key=(fixture,form)
 if key not in cache:
  s=subprocess.check_output(['pdftotext','-bbox',str(b/f'{fixture}.{form}.pdf'),'-']);cache[key]=E.fromstring(s).findall('.//{*}page')
 page=cache[key][w['page']-1];h=float(page.attrib['height']);x,y,ww,hh=w['rect'];words=[]
 for e in page.findall('{*}word'):
  a={k:float(v) for k,v in e.attrib.items()};cx=(a['xMin']+a['xMax'])/2;cy=(a['yMin']+a['yMax'])/2
  if x-.2<=cx<=x+ww+.2 and h-y-hh-.2<=cy<=h-y+.2:words.append((e.text,a))
 text=' '.join(t for t,a in words);passed=w['value'] in text
 assert all(a['xMin']>=x-.2 and a['xMax']<=x+ww+.2 and a['yMin']>=h-y-hh-1 and a['yMax']<=h-y+1 for t,a in words if t in w['value'].split()),(w['fieldId'],words)
 if not passed:fails.append({'fieldId':w['fieldId'],'expected':w['value'],'actual':text})
 rows.append({'fieldId':w['fieldId'],'rect':w['rect'],'words':words,'passed':passed})
assert not fails,fails
# Independent delta against the original reviewed candidate, rather than author delta receipts.
old=json.loads((o/'rows-vfwablake2-original-raster-repair-20260914.json').read_text())['rows'][0];deltas=[]
for p in sorted(b.glob('*.pdf')):
 prior=subprocess.check_output(['git','show','65517ae461:'+str(p)])
 same=hashlib.sha256(prior).hexdigest()==hashlib.sha256(p.read_bytes()).hexdigest();deltas.append({'path':str(p),'unchanged':same})
assert [pathlib.Path(x['path']).name for x in deltas if not x['unchanged']]==['municipal-partial.BLAKE-006.pdf','superior-full.BLAKE-001.pdf']
result={'reviewer':'/root/ne_build','candidateCodeCommit':'560f691e31','method':'Fresh pdftotext bbox on saved components; each expected text found inside declared rectangle; exact git byte comparison to prior reviewed candidate.','textWritesMeasured':len(rows),'failures':fails,'fields':rows,'componentByteDelta':deltas,'unchangedComponents':sum(x['unchanged'] for x in deltas),'visualDefects':None}
(o/'wa-successor-text-measurement.json').write_text(json.dumps(result,indent=2)+'\n');print(len(rows),'text writes pass;',sum(x['unchanged'] for x in deltas),'unchanged components')
