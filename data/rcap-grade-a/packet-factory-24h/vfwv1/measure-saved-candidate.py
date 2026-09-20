from pathlib import Path
import json, hashlib, subprocess, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/'data/rcap-all50/overlays/census-v1/wv/wv-nc-diversion-deferred-set--official-pdf-fill'
OUT=Path(__file__).parent
sha=lambda b:hashlib.sha256(b).hexdigest()
norm=lambda t:' '.join(t.split())
load=lambda p:json.loads(p.read_text())
report=load(BASE/'reports/rendered-artifacts.json');mapping=load(BASE/'production-field-map.json');source=load(BASE/'source-receipt.json')
words={}; texts={};bindings=[];components=[]
for p in report['packets']:
 fixture=p['fixture'];packet=BASE/p['file'];b=packet.read_bytes();assert sha(b)==p['sha256']
 doc=ET.fromstring(subprocess.check_output(['pdftotext','-bbox-layout',str(packet),'-']));pg=[x for x in doc.iter() if x.tag.endswith('}page')];assert len(pg)==p['pageCount'];bindings.append({'fixture':fixture,'path':str(packet.relative_to(ROOT)),'sha256':sha(b),'byteLength':len(b),'pageCount':len(pg)})
 coverage=load(BASE/f'{fixture}.coverage.json');nextpage=1
 for c in coverage:
  assert c['firstPage']==nextpage;nextpage+=c['pageCount'];file=BASE/f"{fixture}.{c['documentId']}.pdf";cb=file.read_bytes();assert sha(cb)==c['sha256']
  xml=ET.fromstring(subprocess.check_output(['pdftotext','-bbox-layout',str(file),'-']));pages=[x for x in xml.iter() if x.tag.endswith('}page')];assert len(pages)==c['pageCount']
  for i,page in enumerate(pages,1):words[(fixture,c['documentId'],i)]=[{'text':x.text or '',**{k:float(v) for k,v in x.attrib.items()}} for x in page.iter() if x.tag.endswith('}word')]
  text=subprocess.check_output(['pdftotext','-layout',str(file),'-'],text=True);texts[(fixture,c['documentId'])]=norm(text)
  assembled=subprocess.check_output(['pdftotext','-layout','-f',str(c['firstPage']),'-l',str(nextpage-1),str(packet),'-'],text=True);assert norm(text)==norm(assembled)
  components.append({'fixture':fixture,'documentId':c['documentId'],'sha256':sha(cb),'firstPage':c['firstPage'],'pageCount':c['pageCount'],'assembledTextExact':True})
 assert nextpage==len(pg)+1
placements=[];missing=[]
for w in mapping['writes']:
 fixture=w['fixture'];document=w.get('document') or w['documentId'].split('/',1)[1];rect=w['rect'];segments=w.get('segments') or [{'page':w['page'],'bottom':rect[1]}];selected=[]
 for segment in segments:
  bottom=segment['bottom'];top=bottom+rect[3]
  selected.extend(x for x in words[(fixture,document,segment['page'])] if x['xMin']>=rect[0]-.6 and x['xMax']<=rect[0]+rect[2]+.6 and x['yMin']>=792-top-.6 and x['yMax']<=792-bottom+.6)
 actual=norm(' '.join(x['text'] for x in selected));ok=norm(w['value']) in actual
 item={'fieldId':w['fieldId'],'document':document,'fixture':fixture,'expected':w['value'],'observedInDeclaredSegments':ok}
 placements.append(item)
 if not ok:missing.append({**item,'observed':actual})
protected=[]
for r in mapping['refusals']:
 if r.get('completenessDisposition')!='PROTECTED_FIELD':continue
 x,y,width,height=r['rect'];hits=[w for w in words[(r['fixture'],r['document'],r['page'])] if w['xMin']<x+width-.5 and w['xMax']>x+.5 and w['yMin']<792-y-.5 and w['yMax']>792-y-height+.5]
 protected.append({'fieldId':r['fieldId'],'inkWords':hits})
sources=[]
for s in source['compositionSources']:
 b=(ROOT/s['path']).read_bytes();assert sha(b)==s['sha256'];assert len(b)==s['byteLength'];sources.append({'path':s['path'],'sha256':sha(b),'byteLength':len(b)})
s=source['boundHistoricalReference'];f=ROOT/'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1'/s['path'];b=f.read_bytes();assert sha(b)==s['sha256'];sources.append({'path':str(f.relative_to(ROOT)),'sha256':sha(b),'historicalOnlyNotRendered':True})
result={'familyId':report['familyId'],'reviewer':'/root/nc_build','packetBindings':bindings,'componentBindings':components,'sourceBindings':sources,'writeCount':len(placements),'placements':placements,'missingPlacements':missing,'protectedRegions':protected,'protectedRegionsWithInk':[p for p in protected if p['inkWords']],'measurementsFrom':'Independent pdftotext saved-byte bbox extraction, actual component/assembly hashes and page text correspondence. No author proof counters reused.','visualAcceptance':'PENDING_CENTRAL_RASTER'}
(OUT/'saved-byte-measurements.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'packets':len(bindings),'pages':sum(p['pageCount'] for p in bindings),'components':len(components),'writes':len(placements),'missingPlacements':missing,'protectedInk':result['protectedRegionsWithInk'],'sources':len(sources)}))
