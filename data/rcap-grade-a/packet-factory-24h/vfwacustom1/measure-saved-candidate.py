import json,hashlib,subprocess,re,xml.etree.ElementTree as E
from pathlib import Path
B=Path('data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill');O=Path('data/rcap-grade-a/packet-factory-24h/vfwacustom1');read=lambda p:json.loads(Path(p).read_text());norm=lambda s:' '.join(s.split())
def pin(p):
 b=Path(p).read_bytes();return dict(path=str(p),sha256=hashlib.sha256(b).hexdigest(),byteLength=len(b))
h=read('data/rcap-grade-a/packet-factory-24h/fix13/rows-fix13-wa-homicide-custom-20260913.json');bindings=[]
for b in h['savedByteBindings']:
 p=pin(b['path']);assert p==b,(p,b);bindings.append(p)
s=read(B/'source-receipt.json');sources=[]
for b in s['compositionSources']:
 p=pin(b['path']);assert p==b,(p,b);sources.append(p)
decision=next(x for x in read(sources[0]['path'])['decisions'] if x['decisionId']=='WA-HOMICIDE-VICTIM-FAMILY-MEMBER-96060-7');assert decision==s['adoptedDecision'];assert decision['disposition']=='LEGAL_CLEAR'
facts=read(B/'fixtures/inputs.json')['fixtures'];actual={x['fixture']:x for x in read(B/'reports/actual-writes.json')['documents']};maps=read(B/'production-field-map.json')['maps'];results=[]
for a in read(B/'reports/rendered-artifacts.json')['artifacts']:
 p=pin(a['file']);assert p['sha256']==a['sha256'] and p['byteLength']==a['byteLength'];raw=subprocess.check_output(['pdftotext','-layout',a['file'],'-']).decode();pages=[x for x in raw.split('\f') if x.strip()];assert len(pages)==a['pageCount'];manifest=a['pageManifest'];assert len(manifest)==len(pages);components={m['component']:norm(' '.join(pages[p['packetPage']-1] for p in manifest if p['component']==m['component'])) for m in manifest};readbacks=[]
 for w in actual[a['fixture']]['actualWrites']:
  assert w['expected']==facts[a['fixture']][w['factId']];assert norm(w['expected']) in components[w['document']],w;readbacks.append(dict(field=w['field'],factId=w['factId'],value=w['expected'],componentPages=[p['packetPage'] for p in manifest if p['component']==w['document']],readBack=True))
 blanklabels=[]
 for m in maps:
  for b in m['canonicalRefusals']:
   assert norm(b['printedLabel']) in components[m['documentId']],b
   blanklabels.append(dict(field=b['field'],label=b['printedLabel'],disposition=b.get('disposition',b.get('completenessDisposition',b.get('completenessClass',b.get('category')))),present=True))
 for m in maps:
  if m['documentRole']=='proposed_order':assert all(w['factId'] in ['participant.full_legal_name','victim.name','court.name','court.cause','court.plaintiff','conviction.1','conviction.2','conviction.3'] for w in m['canonicalWrites'])
 bbox=E.fromstring(subprocess.check_output(['pdftotext','-bbox',a['file'],'-']));outside=[];pageboxes=[]
 for i,pg in enumerate(bbox.iter('{http://www.w3.org/1999/xhtml}page'),1):
  width=float(pg.attrib['width']);height=float(pg.attrib['height']);words=list(pg.iter('{http://www.w3.org/1999/xhtml}word'));bad=[dict(text=w.text,**w.attrib) for w in words if float(w.attrib['xMin'])<0 or float(w.attrib['yMin'])<0 or float(w.attrib['xMax'])>width or float(w.attrib['yMax'])>height];assert not bad,bad;pageboxes.append(dict(page=i,width=width,height=height,words=len(words),outsideWords=0))
 assert 'CrRLJ 09.0100' not in raw;assert '[X]' not in raw and '[x]' not in raw
 results.append(dict(**p,fixture=a['fixture'],pages=len(pages),savedWrites=len(readbacks),readbacks=readbacks,blankLabels=blanklabels,pageGeometry=pageboxes,pageManifest=manifest))
out=dict(familyId='wa_vac_homicide_victim_prostitution-set',reviewer='/root/mt_form_b_independent_review',candidateCommit='095812f37c',authorBindings=bindings,compositionSources=sources,decision=decision,artifacts=results,totalPages=sum(x['pages'] for x in results),totalWrites=sum(x['savedWrites'] for x in results),rebuilt=False,visualMeasured=False,sourceStrategy='Custom pleading under exact adopted authority; legacy CrRLJ assets remain history only.');(O/'saved-byte-measurements.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(dict(pages=out['totalPages'],writes=out['totalWrites'],bindings=len(bindings),sources=len(sources))))
