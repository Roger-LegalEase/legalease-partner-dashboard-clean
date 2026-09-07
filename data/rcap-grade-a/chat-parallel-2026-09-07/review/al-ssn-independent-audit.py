#!/usr/bin/env python3
"""Read-only exact-candidate source/map/output evidence, never a packet builder.

All input bytes remain untouched. Text-position comparison is not graphic or
legal approval; source-native word occurrences must remain at their positions.
The C-10 held-value omission is reported, not hidden by a successful exit code.
"""
import argparse, hashlib, json, re
from collections import defaultdict, Counter
from pathlib import Path
import fitz

FAMILIES = ('al-felony-dwop-set','al-felony-nonconviction-90-set')
SOURCES = {
 'CR-65': ('CODEX-CS1-SRC2__CR-65__c2e0c7bd7abc.pdf',8,'c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39'),
 'C-10-CRIMINAL': ('AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf',3,'527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8')}
ZIP_SHA='6cd5ce96d08398436bf0de895b39b57927cb76fd8573a8c991e216535581fcd7'
SSN_FIELD='C-10-CRIMINAL:Last 4 Digits of Social Security Number'

def sha(b): return hashlib.sha256(b).hexdigest()
def blob(b): return hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
def normal(s): return re.sub(r'\s+',' ',s).strip()
def require_pin(b,h):
 if sha(b)!=h: raise ValueError('input digest mismatch')
def source_match(source_words, target_words):
 used=set(); missing=[]
 for w in source_words:
  found=next((i for i,v in enumerate(target_words) if i not in used and v[4]==w[4] and max(abs(v[k]-w[k]) for k in range(4))<=.25),None)
  if found is None: missing.append({'word':w[4], 'rect':list(w[:4])})
  else: used.add(found)
 return missing

def added_text(page, source_page, rect):
 source_words=source_page.get_text('words'); target_words=page.get_text('words'); used=set()
 for w in source_words:
  found=next((i for i,v in enumerate(target_words) if i not in used and v[4]==w[4] and max(abs(v[k]-w[k]) for k in range(4))<=.25),None)
  if found is not None: used.add(found)
 return normal(' '.join(w[4] for i,w in enumerate(target_words) if i not in used and not re.fullmatch(r'[_ ,.$]+',w[4]) and rect.contains(fitz.Point((w[0]+w[2])/2,(w[1]+w[3])/2))))

def glyphs(page):
 result=[]
 for b in page.get_text('rawdict')['blocks']:
  for line in b.get('lines',[]):
   for span in line['spans']:
    for c in span['chars']:
     if not c['c'].isspace(): result.append((*c['bbox'],c['c']))
 return result

def glyph_compare(src,target):
 buckets=defaultdict(list);used=set();missing=[]
 for i,c in enumerate(target): buckets[(c[4],int(c[0]*4),int(c[1]*4))].append(i)
 for c in src:
  x,y=int(c[0]*4),int(c[1]*4);found=None
  for dx in (-1,0,1):
   for dy in (-1,0,1):
    for i in buckets.get((c[4],x+dx,y+dy),[]):
     if i not in used and max(abs(c[k]-target[i][k]) for k in range(4))<=.25: found=i;break
    if found is not None:break
   if found is not None:break
  if found is None:missing.append({'character':c[4],'rect':list(c[:4])})
  else:used.add(found)
 return missing

def partition(rows, catalog):
 c=Counter(x['fieldId'] for x in rows)
 if len(c)!=len(catalog) or set(c)!=set(catalog) or any(v!=1 for v in c.values()):
  raise ValueError('missing/duplicate/foreign source field disposition')
 for x in rows:
  if x['page']!=catalog[x['fieldId']]['page']: raise ValueError('wrong source page')

def controls():
 word=(1.,2.,3.,4.,'TOKEN'); result=[]
 for label,target,ok in [('same',[word],True),('missing',[],False),('replacement',[(1.,2.,3.,4.,'OTHER')],False),('moved',[(1.,4.,3.,6.,'TOKEN')],False)]:
  actual=not source_match([word],target); assert actual==ok
  result.append({'case':label,'accepted':actual,'expected':ok})
 for label,target,ok in [('glyph_same',[word],True),('glyph_missing',[],False),('glyph_moved',[(1.,4.,3.,6.,'TOKEN')],False),('glyph_duplicate',[word],False)]:
  src=[word,word] if label=='glyph_duplicate' else [word]
  actual=not glyph_compare(src,target); assert actual==ok
  result.append({'case':label,'accepted':actual,'expected':ok})
 assert len(source_match([word,word],[word]))==1
 result.append({'case':'duplicate_occurrence_cannot_be_reused','accepted':False,'expected':False})
 cat={'a':{'page':1},'b':{'page':2}}
 for label,rows,ok in [('field_partition',[{'fieldId':'a','page':1},{'fieldId':'b','page':2}],True),('missing_field',[{'fieldId':'a','page':1}],False),('duplicate_field',[{'fieldId':'a','page':1},{'fieldId':'a','page':1}],False),('wrong_field_page',[{'fieldId':'a','page':2},{'fieldId':'b','page':2}],False)]:
  try: partition(rows,cat); actual=True
  except ValueError: actual=False
  assert actual==ok; result.append({'case':label,'accepted':actual,'expected':ok})
 try: require_pin(b'controL',sha(b'control')); actual=True
 except ValueError: actual=False
 assert not actual;result.append({'case':'one_byte_digest_mutation','accepted':False,'expected':False})
 return result

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--candidate',type=Path,required=True);p.add_argument('--sources',type=Path,required=True)
 p.add_argument('--archive',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
 a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
 watched=list(a.candidate.rglob('*'));watched=[x for x in watched if x.is_file()]
 watched += [a.sources/v[0] for v in SOURCES.values()]+[a.archive]
 before={str(x):sha(x.read_bytes()) for x in watched}
 require_pin(a.archive.read_bytes(),ZIP_SHA)
 result={'schemaVersion':'chatb-al-ssn-readonly-measurements/v1','pymupdfVersion':fitz.VersionBind,
  'archive':{'bytesMeasured':a.archive.stat().st_size,'sha256Measured':ZIP_SHA},
  'sourceTextTolerancePoints':.25,'sources':[],'packets':[],'fileHashes':{},'controls':controls(),
  'packetBuildersExecuted':0,'visualApprovalMadeByScript':False}
 source_docs={};catalog={}
 for doc,(fn,count,pin) in SOURCES.items():
  raw=(a.sources/fn).read_bytes();require_pin(raw,pin);pdf=fitz.open(stream=raw,filetype='pdf');source_docs[doc]=pdf
  assert len(pdf)==count
  ws=[]
  for n,page in enumerate(pdf,1):
   for w in page.widgets():
    if str(w.field_value or '').strip() not in ('','Off'): raise ValueError('source prefilled')
    row={'fieldId':doc+':'+w.field_name,'page':n,'rect':list(w.rect),'type':w.field_type_string}
    assert row['fieldId'] not in catalog
    catalog[row['fieldId']]=row;ws.append(row)
  result['sources'].append({'documentId':doc,'bytesMeasured':len(raw),'pagesMeasured':count,'sha256Measured':pin,'gitBlobMeasured':blob(raw),'uniqueWidgetsMeasured':len(ws)})
 aliases=defaultdict(list);textchecks=[];sourcechecks=[];glyphchecks=[]
 for family in FAMILIES:
  root=a.candidate/'data/rcap-all50/overlays/census-v1/al'/f'{family}--official-pdf-fill'
  for f in root.rglob('*'):
   if f.is_file():
    b=f.read_bytes();result['fileHashes'][str(f.relative_to(a.candidate))]={'sha256':sha(b),'gitBlob':blob(b),'bytes':len(b)}
  maps=json.loads((root/'production-field-map.json').read_text())
  actual=json.loads((root/'reports/actual-writes.json').read_text())
  manifest=json.loads((root/'reports/rendered-artifacts.json').read_text())['packets']
  assert len(manifest)==4
  for entry in manifest:
   fx=entry['fixture'];raw=(root/'fixtures'/f'{fx}.pdf').read_bytes();require_pin(raw,entry['sha256'])
   expected_case='CC-2021-004217' if fx.startswith('canonical') else 'CC-2024-000001.99'
   expected_ssn='' if fx.endswith('-ssn-missing') else ('0428' if fx.startswith('canonical') else '0073')
   m=maps['fixtureMaps'][fx];partition(m['writes']+m['refusals'],catalog)
   ar=next(x for x in actual['artifacts'] if x['fixture']==fx)
   partition(ar['actualWrites']+ar['refusals'],catalog)
   assert {x['fieldId'] for x in m['writes']}=={x['fieldId'] for x in ar['actualWrites']}
   with fitz.open(stream=raw,filetype='pdf') as pdf:
    assert len(pdf)==11==entry['pageCount']
    assert [(x['documentId'],x['sourcePage']) for x in entry['pageManifest']]== [('CR-65',i) for i in range(1,9)]+[('C-10-CRIMINAL',i) for i in range(1,4)]
    cr_rect=fitz.Rect(catalog['CR-65:Text2']['rect']);c10_rect=fitz.Rect(catalog[SSN_FIELD]['rect']);case_rect=fitz.Rect(catalog['CR-65:Text3']['rect'])
    crtext=added_text(pdf[0],source_docs['CR-65'][0],cr_rect);c10text=added_text(pdf[8],source_docs['C-10-CRIMINAL'][0],c10_rect);casetext=added_text(pdf[0],source_docs['CR-65'][0],case_rect)
    assert crtext==expected_ssn and casetext==expected_case
    # This assertion verifies the observed omission; it is explicitly a defect when facts are held.
    assert c10text==''
    ref=next(x for x in m['refusals'] if x['fieldId']==SSN_FIELD)
    pr={'familyId':family,'fixture':fx,'pages':len(pdf),'bytes':len(raw),'sha256Measured':sha(raw),'gitBlobMeasured':blob(raw),
        'mapDispositionCount':len(m['writes'])+len(m['refusals']),'writes':len(m['writes']),'refusals':len(m['refusals']),
        'caseNumberExpectedAndObserved':casetext,'ssnLastFourSeparatelySupplied':expected_ssn or None,
        'cr65LastFourObserved':crtext,'c10LastFourObserved':c10text,'c10IncorrectHeldFactRefusal':bool(expected_ssn),
        'c10Refusal':ref,'cr65RectTopLeft':list(cr_rect),'c10RectTopLeft':list(c10_rect)}
    result['packets'].append(pr)
    for wr in ar['actualWrites']:
     c=catalog[wr['fieldId']];idx=c['page']-1+(8 if wr['documentId']=='C-10-CRIMINAL' else 0)
     if c['type'] not in ('Text','ComboBox'): continue
     observed=added_text(pdf[idx],source_docs[wr['documentId']][c['page']-1],fitz.Rect(c['rect'])+(-1,-1,1,1))
     textchecks.append({'familyId':family,'fixture':fx,'fieldId':wr['fieldId'],'packetPage':idx+1,'expected':wr.get('drawnText'), 'observed':observed,'matches':normal(wr['drawnText'])==observed})
    for idx,page in enumerate(pdf):
     srcdoc='CR-65' if idx<8 else 'C-10-CRIMINAL';sn=idx if idx<8 else idx-8
     src=source_docs[srcdoc][sn];missing=source_match(src.get_text('words'),page.get_text('words'))
     gc=glyphs(src);gm=glyph_compare(gc,glyphs(page));glyphchecks.append({'familyId':family,'fixture':fx,'packetPage':idx+1,'sourceGlyphs':len(gc),'missingOrMoved':gm})
     sourcechecks.append({'familyId':family,'fixture':fx,'packetPage':idx+1,'sourceDoc':srcdoc,'sourcePage':sn+1,'sourceWords':len(src.get_text('words')),'missingOrMoved':missing,'sameDimensions':list(src.rect)==list(page.rect)})
     im=a.out/'pages'/family/fx/f'page-{idx+1:03}.png';im.parent.mkdir(parents=True,exist_ok=True)
     page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).save(im)
     aliases[sha(im.read_bytes())].append(str(im.relative_to(a.out)))
 for rel in ['scripts/rcap-packet-recovery/chat3/al-ssn-last-four.mjs','scripts/rcap-packet-recovery/chat3/al-completion-contract.mjs',*[f'scripts/build-census-v1-{f}.mjs' for f in FAMILIES]]:
  b=(a.candidate/rel).read_bytes();result['fileHashes'][rel]={'sha256':sha(b),'gitBlob':blob(b),'bytes':len(b)}
 result['nativeGlyphChecks']=glyphchecks;result['textWriteChecks']=textchecks;result['sourceWordChecks']=sourcechecks;result['pngAliases']=dict(sorted(aliases.items()))
 assert before=={str(x):sha(x.read_bytes()) for x in watched}
 result['summary']={'completePdfs':8,'sourcePageComparisons':len(sourcechecks),'sourceWordInstances':sum(x['sourceWords'] for x in sourcechecks),
  'nativeSourceGlyphs':sum(x['sourceGlyphs'] for x in glyphchecks),'missingOrMovedSourceGlyphs':sum(len(x['missingOrMoved']) for x in glyphchecks),
  'missingOrMovedSourceWords':sum(len(x['missingOrMoved']) for x in sourcechecks),'sourceDimensionMismatches':sum(not x['sameDimensions'] for x in sourcechecks),
  'sourceFieldDispositions':sum(x['mapDispositionCount'] for x in result['packets']),'textWriteChecks':len(textchecks),'textWriteMismatchCount':sum(not x['matches'] for x in textchecks),
  'cr65SeparateSsnChecksPassed':8,'c10HeldLastFourOmissions':sum(x['c10IncorrectHeldFactRefusal'] for x in result['packets']),
  'uniqueFullPngs':len(aliases),'additionalPngAliases':88-len(aliases),'readInputsUnchanged':len(watched),
  'controls':len(result['controls']),'positiveControls':sum(x['accepted'] for x in result['controls']),'rejectionControls':sum(not x['accepted'] for x in result['controls'])}
 (a.out/'measurements.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result['summary'],indent=2))
 print('READ-ONLY AUDIT COMPLETE, NOT A FAMILY PASS')
 for pdf in source_docs.values():pdf.close()
if __name__=='__main__':main()
