import json,pathlib,hashlib,fitz,subprocess,shutil
out=pathlib.Path('data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill')
r=json.load(open(out/'reports/rendered-artifacts.json'));facts=json.load(open(out/'fixtures/inputs.json'))['fixtures'];maps=json.load(open(out/'production-field-map.json'))['maps'];checks=[];clean=lambda t:' '.join(t.split())
for a in r['artifacts']:
 b=pathlib.Path(a['file']).read_bytes();assert hashlib.sha256(b).hexdigest()==a['sha256'];d=fitz.open(stream=b,filetype='pdf');assert len(d)==a['pageCount'];texts=[clean(p.get_text()) for p in d];assert all(texts);fields=[]
 for m in maps:
  pages=[p['packetPage'] for p in a['pageManifest'] if p['component']==m['documentId']];t=clean(' '.join(texts[n-1] for n in pages))
  for w in m['canonicalWrites']:
   value=facts[a['fixture']][w['factId']];assert clean(value) in t,(a['fixture'],w['field'],value);fields.append({'field':w['field'],'factId':w['factId'],'value':value,'componentPages':pages,'foundInSavedComponent':True})
  for f in m['canonicalRefusals']:
   assert clean(f['printedLabel']) in t,(a['fixture'],f['field']);assert '.'*30 in t
 geometry=[]
 for n,p in enumerate(d,1):
  words=p.get_text('words');bad=[w for w in words if w[0]<54 or w[1]<45 or w[2]>558 or w[3]>750];assert not bad,(a['fixture'],n,bad)
  assert len(list(p.widgets() or []))==0
  geometry.append({'page':n,'wordCount':len(words),'inkBounds':[min(w[0] for w in words),min(w[1] for w in words),max(w[2] for w in words),max(w[3] for w in words)],'withinPrintableBounds':True,'blankPage':False})
 alltext=' '.join(texts)
 for txt in ['Family member applicant:',facts[a['fixture']]['victim.name'],'RCW 9.96.060(7)','RCW 9A.88.030','No hearing has been scheduled','No transmission is certified']:
  assert txt in alltext,txt
 assert not any(x in alltext for x in ['[x]','[X]','I was convicted','I am the deceased'])
 checks.append({'fixture':a['fixture'],'pdfSha256':a['sha256'],'pages':len(d),'all44WritesReadBack':fields,'geometry':geometry,'protectedControlsUnselected':True,'acroFormFields':0,'pageOrder':[p['component'] for p in a['pageManifest']]})
report={'schemaVersion':'rcap-saved-byte-checks/v1','familyId':'wa_vac_homicide_victim_prostitution-set','result':'PASS_SAVED_BYTES','method':'PyMuPDF independent readback of final saved bytes, all44 writes per fixture within own components, declared labels present, all saved pages word bounds within printable region, no active fields or selected court controls. No raster or independent acceptance claimed.','fixtures':checks,'totalPages':sum(x['pages'] for x in checks),'originalPageVisualAcceptance':False}
(out/'reports/saved-byte-checks.json').write_text(json.dumps(report,indent=2)+'\n')
shutil.copy('/tmp/rcap-packet-completeness/wa_vac_homicide_victim_prostitution-set.json',out/'reports/native-completeness-audit.json')
print(json.dumps({'result':report['result'],'pages':report['totalPages'],'fixtures':len(checks)}))
