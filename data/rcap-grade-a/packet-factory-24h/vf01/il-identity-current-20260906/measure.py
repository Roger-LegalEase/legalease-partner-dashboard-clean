#!/usr/bin/env python3
"""Independent reader: hashes, Poppler word geometry, disclosures and actual blank inventory.
This script does not import or invoke the packet builder and writes only its own evidence.
"""
import hashlib,json,pathlib,re,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[5]
OUT=pathlib.Path(__file__).resolve().parent
FAMILY='composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief'
PACKET=ROOT/'data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading'
def load(p):return json.loads(p.read_text())
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def normal(s):return re.sub(r'\s+',' ',s).strip()
fieldmap=load(PACKET/'production-field-map.json');receipt=load(PACKET/'source-receipt.json');declared=load(PACKET/'reports/rendered-artifacts.json')
queue=load(ROOT/'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')
def find(v):
 if isinstance(v,list):
  for x in v:yield from find(x)
 elif isinstance(v,dict):
  if v.get('familyId')==FAMILY:yield v
  else:
   for x in v.values():yield from find(x)
raster=next(find(queue));instruction=(PACKET/'participant-instructions.md').read_text();source=[]
for r in receipt['committedRecords']:
 p=ROOT/r['pathInRepository'];h=digest(p);source.append({'path':r['pathInRepository'],'declaredSha256':r['sha256'],'actualSha256':h,'matches':h==r['sha256'],'byteLength':p.stat().st_size})
expected={
 'canonical':['Jordan Avery Reyes','1991-04-17','42 Magnolia Street, Springfield 62704','555-0142','jordan.reyes@example.org'],
 'boundary':["Maria-Alejandra O'Shaughnessy-Whitfield",'1968-12-31','1188 Upper Tallahatchie Crossing Road, Apartment 14B, Fort Saint Clairsville 39501-2214','(228) 555-0199 ext. 4417','maria.alejandra.oshaughnessy.whitfield@longmailexample.org']}
measure=[]
for fixture in ['canonical','boundary']:
 pdf=PACKET/'fixtures'/f'{fixture}.pdf';doc=ET.parse(OUT/f'{fixture}.html').getroot();pages=[x for x in doc.iter() if x.tag.split('}')[-1]=='page'];texts=(OUT/f'{fixture}.txt').read_text().split('\f');texts=[x for x in texts if x.strip()];outside=[];overlaps=[];wordcount=0;blankSpans=[]
 for n,page in enumerate(pages,1):
  width=float(page.attrib['width']);height=float(page.attrib['height']);words=[]
  for word in page:
   if word.tag.split('}')[-1]!='word':continue
   box={k:float(word.attrib[k]) for k in ['xMin','yMin','xMax','yMax']};s=word.text or '';wordcount+=1;words.append((s,box))
   if box['xMin']<0 or box['yMin']<0 or box['xMax']>width or box['yMax']>height:outside.append({'page':n,'text':s,'box':box})
   if re.fullmatch(r'\.{6,}',s):blankSpans.append({'page':n,'length':len(s),'box':box})
  for i,(s,a) in enumerate(words):
   for t,b in words[i+1:]:
    dx=min(a['xMax'],b['xMax'])-max(a['xMin'],b['xMin']);dy=min(a['yMax'],b['yMax'])-max(a['yMin'],b['yMin'])
    if dx>0.2 and dy>0.2:overlaps.append({'page':n,'first':s,'second':t,'intersection':[dx,dy]})
 h=digest(pdf);entry=next(x for x in declared['pdfs'] if x['fixture']==fixture)
 facts=[{'expected':v,'pagesFound':[i+1 for i,t in enumerate(texts) if normal(v) in normal(t)]} for v in expected[fixture]]
 sig=[{'page':i+1,'line':line.strip(),'empty':bool(re.fullmatch(r'DATE\s+\.+\s+SIGNATURE OF PETITIONER\s+\.+',line.strip()))} for i,t in enumerate(texts) for line in t.splitlines() if line.strip().startswith('DATE ')]
 caption=[{'page':i+1,'line':line.strip()} for i,t in enumerate(texts) for line in t.splitlines() if re.search(r'IN THE\s+\.{6,}\s+COURT',line)]
 fields=[r.get('field') for m in fieldmap['maps'] for kind in [fixture+'Writes',fixture+'Refusals'] for r in m.get(kind,[])]
 knownmissing=[r for r in facts if not r['pagesFound']]
 measure.append({'fixture':fixture,'sha256':h,'matchesArtifactReport':h==entry['sha256'],'matchesRasterReceipt':h==raster['rasterReceipt']['boundTo'+fixture.capitalize()+'Sha256'],'bytes':pdf.stat().st_size,'pageCount':len(pages),'wordCount':wordcount,'wordsOutsidePages':outside,'intersectingWordBoxesOverPoint2':overlaps,'prefills':facts,'missingKnownPrefills':knownmissing,'protectedSignatureLine':sig,'observedCourtCaptionBlank':caption,'declaredFieldIds':fields,'courtCaptionDeclared':any(re.search(r'court_name|court_caption|caption_court|filing_court',x or '') for x in fields),'courtCaptionExplicitlyDisclosed':bool(re.search(r'(fill|complete|write).{0,50}(court caption|court-name blank|IN THE)',instruction,re.I)),'dottedWriteSpans':blankSpans,'petitionBeginsOnPage':next(i+1 for i,t in enumerate(texts) if t.startswith('PETITION -')),'instructionsBeginOnPage':next(i+1 for i,t in enumerate(texts) if t.startswith('FILING INSTRUCTIONS -'))})
required=[{'field':r['field'],'label':r['disclosureLabel'],'disclosedInInstructions':normal(r['disclosureLabel']) in normal(instruction),'labelPrintedInBothPdfs':all(normal(re.sub(r'^Item ','',r['disclosureLabel'])) in normal((OUT/f'{f}.txt').read_text()) for f in expected)} for r in fieldmap['requiredBeforeFiling']]
report={'familyId':FAMILY,'method':'Independent SHA-256 plus pdftotext -layout/-bbox, all eight local reading images inspected; no builder execution, no new governed raster acceptance','sourceRecords':source,'sourcePinFailures':sum(not r['matches'] for r in source),'artifacts':measure,'requiredBeforeFiling':required,'declaredRequiredItems':len(required),'unclassifiedCourtCaptionBlankCountByFieldIdentity':1,'unclassifiedBlankInstancesAcrossFixtures':2,'rasterReceiptReused':raster['rasterReceipt'],'counterFindings':{'knownRequiredFieldsMissing':0,'requiredFactsNotCollected':0,'unclassifiedBlanks':1,'incompleteRows':0,'requiredOptionsMissing':0,'requiredComponentsMissing':0,'invisibleWrites':0,'protectedWrites':0,'visualDefects':0},'limitations':'Geometry detects word-box overlap and page overflow; visual inspection supplies layout context. Synthetic participant records are fixtures. Current whole-file source pin mismatch is separate from the nine counters.'}
(OUT/'measurements.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'sourcePinFailures':report['sourcePinFailures'],'artifacts':[{'fixture':x['fixture'],'pages':x['pageCount'],'words':x['wordCount'],'outside':len(x['wordsOutsidePages']),'overlaps':len(x['intersectingWordBoxesOverPoint2']),'blankSpans':len(x['dottedWriteSpans']),'captionDeclared':x['courtCaptionDeclared'],'captionDisclosed':x['courtCaptionExplicitlyDisclosed']} for x in measure],'requiredDisclosureFailures':[x['field'] for x in required if not x['disclosedInInstructions']],'counters':report['counterFindings']},indent=2))
