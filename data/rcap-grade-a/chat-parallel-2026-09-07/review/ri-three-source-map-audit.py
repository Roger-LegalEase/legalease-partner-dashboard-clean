#!/usr/bin/env python3
"""Read-only census, field-region, byte and renderer-probe audit.
The renderer probes contain deliberately unbound diagnostic row data. They are
not successful participant-row or overflow API tests. No source/output mutated.
"""
import argparse,hashlib,json,re
from pathlib import Path
from collections import defaultdict,Counter
import fitz
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--sources',type=Path,required=True);p.add_argument('--probes',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
blob=lambda b:hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
FAMILIES=['ri_first_offender_felony-set','ri_first_offender_misdemeanor-set','ri_deferred_sentence-set']
SOURCES={'DC-33':('RI__FORM__DC-33__district-court-motion-affidavit-and-instructions-to-expunge-or-seal-record__REV-2025-02__EN.pdf','342337451d61e363e03febb384431dba2f9bb08b44ee46380b94fc91901e9908'), 'Superior-55':('RI__FORM__SUPERIOR-55__superior-court-motion-affidavit-and-instructions-to-expunge-or-seal-record-felony__REV-2025-02__EN.pdf','e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca')}
EXPECTED_TREES={'ri_first_offender_felony-set':'a846616533e71eb28a07b26cd35152b5744f6d09','ri_first_offender_misdemeanor-set':'164ff6b2c74d7503644b666ed65f827a8e551c38','ri_deferred_sentence-set':'e1f680bfc4030c09415204f29c578932b724bf8a'}
def tree(d):
 records=[]
 for f in sorted(d.iterdir(),key=lambda f:f.name+('/' if f.is_dir() else '')):
  mode='40000' if f.is_dir() else '100644';h=tree(f) if f.is_dir() else blob(f.read_bytes());records.append(f'{mode} {f.name}\0'.encode()+bytes.fromhex(h))
 raw=b''.join(records);return hashlib.sha1(f'tree {len(raw)}\0'.encode()+raw).hexdigest()
def rect(r,h):return fitz.Rect(r['x'],h-r['y']-r['height'],r['x']+r['width'],h-r['y'])
def close(x,y,t=.025):return max(abs(x[i]-y[i]) for i in range(4))<t
def added_words(pg,src):
 original=src.get_text('words');return [w for w in pg.get_text('words') if not any(w[4]==v[4] and close(w,v,.25) for v in original)]
def norm(x):return re.sub(r'\s+',' ',x).strip()
def partition_check(rows,names):
 c=Counter(x['fieldName'] for x in rows);return set(c)==set(names) and all(n==1 for n in c.values())
source_rows=[];catalog={};sd={};watch=[]
for id,(fn,pin) in SOURCES.items():
 f=a.sources/fn;raw=f.read_bytes();assert sha(raw)==pin;d=fitz.open(stream=raw,filetype='pdf');sd[id]=d;cat=defaultdict(list)
 for i,pg in enumerate(d):
  for w in pg.widgets():cat[w.field_name].append({'page':i+1,'rect':list(w.rect),'type':w.field_type_string})
 catalog[id]=cat;source_rows.append({'sourceId':id,'sha256Measured':sha(raw),'gitBlobMeasured':blob(raw),'bytes':len(raw),'pages':len(d),'uniqueFields':len(cat),'widgetInstances':sum(map(len,cat.values())),'allWidgets':dict(cat)});watch.append(f)
familydirs=[a.root/'data/rcap-all50/overlays/census-v1/ri'/(f.replace('_','-')+'--official-pdf-fill') for f in FAMILIES]
watch += [p for d in familydirs for p in d.rglob('*') if p.is_file()]
before={str(p):sha(p.read_bytes()) for p in watch}
rows=[];allaliases=defaultdict(list);counts=Counter();geometry=[];writes=[];blank_ink=[];probe_results=[]
for fam,d in zip(FAMILIES,familydirs):
 assert tree(d)==EXPECTED_TREES[fam]
 m=json.loads((d/'production-field-map.json').read_text());c=json.loads((d/'field-census.census-v1.json').read_text());w=json.loads((d/'reports/actual-writes.json').read_text());ar=json.loads((d/'reports/rendered-artifacts.json').read_text());pw=json.loads((d/'product-wiring.json').read_text())
 primary=m['maps'][0];sid=primary['officialFormNumber'];src=sd[sid];cat=catalog[sid];cr=c['documents'][0]['rows'];assert {r['field'] for r in cr}==set(cat);counts['censusFields']+=len(cr)
 for r in cr:
  rr=rect(r['rect'],src[r['page']-1].rect.height);ok=any(z['page']==r['page'] and close(rr,z['rect']) for z in cat[r['field']]);geometry.append({'family':fam,'scope':'census','field':r['field'],'page':r['page'],'matchesActualWidget':ok})
  assert ok
 frow={'familyId':fam,'familyDirectory':str(d.relative_to(a.root)),'treeMeasuredAndReadAtRecovery':tree(d),'routeKeys':m['routeKeys'],'routeSelectionId':m['routeSelectionId'],'affidavitPart':m['affidavitPartOnThisRoute'],'sourceId':sid,'files':{},'outputs':[],'rowRequirements':[],'currentProduct':{'status':pw['status'],'generationAllowed':pw['currentState']['generationAllowed'],'paymentEligible':pw['binding']['paymentEligible'],'sponsorshipEligible':pw['binding']['sponsorshipEligible'],'acceptanceReceipt':pw['binding']['acceptanceReceipt']}}
 for pth in d.rglob('*'):
  if pth.is_file():raw=pth.read_bytes();frow['files'][str(pth.relative_to(d))]={'sha256':sha(raw),'gitBlob':blob(raw),'bytes':len(raw)}
 frow['rowRequirements']=[r for r in m['requiredBeforeFiling'] if re.search(r'(?:\.[123] (?:Counts|Charges|Dispositions) [1-4]$|\.order_charge_line_[1-4]$)',r['field'])]
 assert len(frow['rowRequirements'])==16
 for fx in ('canonical','boundary'):
  disposition=primary[fx+'Writes']+primary[fx+'Refusals'];assert partition_check(disposition,cat);counts['mapFieldPartitions']+=len(disposition)
  for r in disposition:
   rr=rect(r['rect'],src[r['page']-1].rect.height);ok=any(z['page']==r['page'] and close(rr,z['rect']) for z in cat[r['fieldName']]);geometry.append({'family':fam,'fixture':fx,'scope':'map','field':r['fieldName'],'matchesActualWidget':ok});assert ok
  raw=(d/f'fixtures/{fx}.pdf').read_bytes();pdf=fitz.open(stream=raw,filetype='pdf');rec=next(x for x in ar['pdfs'] if x['fixture']==fx);assert sha(raw)==rec['sha256'] and len(pdf)==rec['pageCount'];counts['wholePdfs']+=1;counts['wholePages']+=len(pdf)
  rep=next(x for x in w['documents'] if x['fixture']==fx);extra={i+1:added_words(pdf[i],src[i]) for i in range(4)}
  for wr in rep['actualWrites']:
   if wr.get('page'):
    pg=wr['page'];box=rect(wr['rect'],pdf[pg-1].rect.height)+(-1,-1,1,1);actual=' '.join(x[4] for x in extra[pg] if fitz.Rect(x[:4]).intersects(box));ok=norm(actual)==norm(wr['drawnText']);where=[pg]
   else:
    component=next(x for x in ar['artifacts'] if x.get('fixture')==fx and x.get('documentId')==wr['document']) if any(x.get('fixture')==fx and x.get('documentId')==wr['document'] for x in ar['artifacts']) else None
    # Published packet components identify exact composed page spans.
    packet=next(x for x in ar['artifacts'] if x['fixture']==fx);where=[x['packetPage'] for x in packet['pageManifest'] if x['documentId']==wr['document']];assert where;actual=' '.join(pdf[i-1].get_text() for i in where);ok=wr['drawnText'] in actual
   writes.append({'family':fam,'fixture':fx,'field':wr['field'],'pages':where,'expected':wr['drawnText'],'matches':ok});assert ok
  for r in primary[fx+'Refusals']:
   for z in cat[r['fieldName']]:
    added=[x[4] for x in extra[z['page']] if fitz.Rect(x[:4]).intersects(fitz.Rect(z['rect']))];
    if added:blank_ink.append({'family':fam,'fixture':fx,'field':r['fieldName'],'addedWords':added})
    counts['refusalWidgetTextRegions']+=1
  for i,pg in enumerate(pdf):
   pp=a.out/'pages'/fam/fx/f'page-{i+1:03}.png';pp.parent.mkdir(parents=True,exist_ok=True);pg.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).save(pp);allaliases[sha(pp.read_bytes())].append(str(pp.relative_to(a.out)))
  (a.out/f'{fam}-{fx}-text.txt').write_text('\n\n'.join(f'PAGE {i+1}\n{pg.get_text()}' for i,pg in enumerate(pdf)))
  frow['outputs'].append({'fixture':fx,'sha256Measured':sha(raw),'gitBlobMeasured':blob(raw),'bytes':len(raw),'pages':len(pdf),'sourcePageDimensionsMatch':all(pdf[i].rect==src[i].rect for i in range(4))});pdf.close()
 rows.append(frow)
probes=json.loads((a.probes/'renderer-probes.json').read_text())
for fam,d in zip(FAMILIES,familydirs):
 cases=[x for x in probes['cases'] if x['family']==fam];base=cases[0];official=fitz.open(d/'fixtures/canonical.pdf');basepdf=fitz.open(a.probes/base['output']);pixel_matches=[]
 for i in range(4):pixel_matches.append(sha(official[i].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).samples)==sha(basepdf[i].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).samples))
 for c in cases:
  pp=fitz.open(a.probes/c['output']);text=' '.join(p.get_text() for p in pp);probe_results.append({'family':fam,'diagnosticRows':c['suppliedDiagnosticRows'],'sha256':c['sha256'],'pages':len(pp),'byteIdenticalToZeroRowProbe':c['sha256']==base['sha256'],'rowTokenFound':any(x['charge'] in text for x in c['rows']),'baselineOfficialPagePixelMatchesPublished':pixel_matches});pp.close()
 official.close();basepdf.close()
controls=[]
for label,rs,names,expected in [('complete_partition',[{'fieldName':'a'},{'fieldName':'b'}],['a','b'],True),('missing_field',[{'fieldName':'a'}],['a','b'],False),('duplicate_field',[{'fieldName':'a'},{'fieldName':'b'},{'fieldName':'b'}],['a','b'],False),('wrong_field',[{'fieldName':'a'},{'fieldName':'c'}],['a','b'],False)]:
 actual=partition_check(rs,names);assert actual==expected;controls.append({'case':label,'expected':expected,'actual':actual})
assert before=={str(p):sha(p.read_bytes()) for p in watch}
result={'schemaVersion':'chatb-ri-three-source-map-measurements/v1','recoverySnapshot':'21a269f31a7dff8084d6c74ecdb553be5979ba03','pymupdfVersion':fitz.VersionBind,'sources':source_rows,'families':rows,'geometryChecks':geometry,'textWriteChecks':writes,'refusalRegionsWithAddedWords':blank_ink,'probeOutputChecks':probe_results,'pngAliases':dict(allaliases),'controls':controls,'summary':{**counts,'geometryChecks':len(geometry),'declaredTextWritesChecked':len(writes),'textWriteMismatches':sum(not x['matches'] for x in writes),'refusalRegionsWithAddedWords':len(blank_ink),'rendererProbeInvocations':len(probe_results),'sourceAndFamilyInputFilesUnchanged':len(watch),'uniqueFullPagePngs':len(allaliases)}}
(a.out/'measurements.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['summary'],indent=2))
