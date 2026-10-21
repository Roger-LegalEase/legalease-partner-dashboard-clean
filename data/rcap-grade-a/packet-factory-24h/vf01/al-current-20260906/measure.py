"""Independent original-to-filled PDF word/rectangle census; reads, never builds.
First run read-source-fields.mjs and pdftotext -bbox for canonical, boundary,
source-CR-65 and source-C-10 into this evidence directory. The HTML files are
preserved under the durable readingEvidenceRoot in measurements.json.
"""
import collections, hashlib, json, pathlib, xml.etree.ElementTree as ET
P=pathlib.Path(__file__).resolve().parent
B=pathlib.Path('data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill')
D=pathlib.Path('/home/codespace/.local/share/legalease/evidence/vf01-al-current-20260906')
D.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def js(p):return json.loads(p.read_text())
def words(name):
 p=P/name if (P/name).exists() else D/name
 root=ET.parse(p);ns={'x':'http://www.w3.org/1999/xhtml'}
 return [[(w.text or '',*[round(float(w.attrib[k]),2) for k in ['xMin','yMin','xMax','yMax']]) for w in pg.findall('x:word',ns)] for pg in root.findall('.//x:page',ns)]
def normalized(r):
 return {'x':min(r['x'],r['x']+r['width']),'y':min(r['y'],r['y']+r['height']),'width':abs(r['width']),'height':abs(r['height'])}
def inside(w,r,h):
 r=normalized(r)
 _,x0,y0,x1,y1=w
 return x0>=r['x']-.025 and x1<=r['x']+r['width']+.025 and y0>=h-r['y']-r['height']-.025 and y1<=h-r['y']+.025
sources=js(P/'source-fields.json')['sources'];maps=js(B/'production-field-map.json')['maps'];facts=js(B/'fixtures/participant-facts.json')
source_words=words('source-CR-65.html')+words('source-C-10.html')
instructions=(B/'participant-instructions.md').read_text()
results={'method':'Fresh exact source AcroForm enumeration plus source-word/geometry multiset subtraction from actual filled PDF text. Source fields serve only as geometry; builder writes are declarations checked against observed added words and held facts. All 22 accepted page images independently viewed. No builder/finalizer invoked.','readingEvidenceRoot':str(D),'geometryConvention':'Normalize negative width/height before comparison. Original CR-65 Check Box10.2 has y=623.137,height=-14.358; the declaration uses equivalent y=608.779,height=14.358. Poppler underscore words have font-height bounding boxes around writing lines; raw intersections are preserved and underscore-only writing-line intersections classified separately from text collisions.','sources':[],'fixtures':{},'requiredBeforeFiling':[]}
for src,m in zip(sources,maps):
 pin=next(x['sourceSha256'] for x in js(B/'field-census.census-v1.json')['documents'] if x['documentId']==src['documentId'])
 results['sources'].append({'documentId':src['documentId'],'path':src['path'],'sha256':sha(pathlib.Path(src['path'])),'declaredSha256':pin,'hashMatches':sha(pathlib.Path(src['path']))==pin,'pageCount':src['pageCount'],'fieldCount':len(src['fields']),'widgetCount':sum(len(f['widgets']) for f in src['fields'])})
 for f in m['canonicalRefusals']:
  if f.get('blankTreatment')=='REQUIRED_BEFORE_FILING':results['requiredBeforeFiling'].append({'document':src['documentId'],'page':f['page'],'field':f['field'],'label':f['effectiveLabel'],'labelInInstructions':f['effectiveLabel'] in instructions})
for fixture in ('canonical','boundary'):
 output_words=words(fixture+'.html');pages=[];alladded=[]
 for i,(src,output) in enumerate(zip(source_words,output_words),1):
  added=list((collections.Counter(output)-collections.Counter(src)).elements());removed=list((collections.Counter(src)-collections.Counter(output)).elements());pages.append({'page':i,'sourceWordCount':len(src),'outputWordCount':len(output),'addedWordCount':len(added),'removedSourceWords':removed});alladded.append(added)
 declared=[];writes=[];refusals=[];coverage=[];offset=0
 for src,m in zip(sources,maps):
  ws=m[fixture+'Writes'];rs=m[fixture+'Refusals'];sf={f['name']:f for f in src['fields']};mf={f['field']:f for f in ws+rs}
  geometry=[]
  for name in sorted(sf.keys()&mf.keys()):
   if len(sf[name]['widgets'])!=len(mf[name]['widgets']):geometry.append({'field':name,'reason':'widget count differs'})
   for a,b in zip(sf[name]['widgets'],mf[name]['widgets']):
    if a['page']!=b['page'] or any(abs(normalized(a['rect'])[k]-normalized(b['rect'])[k])>.002 for k in a['rect']):geometry.append({'field':name,'reason':'source and declared rectangle/page differ'})
  coverage.append({'document':src['documentId'],'freshSourceFieldCount':len(sf),'declaredFieldCount':len(mf),'unmappedSourceFields':sorted(sf.keys()-mf.keys()),'nonSourceDeclaredFields':sorted(mf.keys()-sf.keys()),'duplicateDeclarations':len(ws)+len(rs)-len(mf),'geometryMismatches':geometry,'blankTreatments':dict(collections.Counter(f.get('blankTreatment') for f in rs))})
  for iswrite,fields in ((True,ws),(False,rs)):
   for f in fields:
    matching=[];widget_text=[]
    for wid in sf[f['field']]['widgets']:
     pg=wid['page']+offset;h=src['pages'][wid['page']-1]['height'];observed=[w for w in alladded[pg-1] if inside(w,wid['rect'],h)];matching+=observed
     widget_text.append(' '.join(w[0] for w in sorted(observed,key=lambda w:(w[2],w[1]))))
     if iswrite:declared.append((pg,wid['rect'],h))
    rec={'document':src['documentId'],'field':f['field'],'page':f['page']+offset,'kind':f.get('kind'),'factId':f.get('factId'),'text':' '.join(widget_text).strip(),'wordCount':len(matching),'blankTreatment':f.get('blankTreatment')}
    if iswrite:writes.append(rec)
    else:refusals.append(rec)
  offset+=src['pageCount']
 outbox=[];overlap=[]
 for pg,added in enumerate(alladded,1):
  for w in added:
   if not any(pg==p and inside(w,r,h) for p,r,h in declared):outbox.append({'page':pg,'word':w})
   for static in source_words[pg-1]:
    if min(w[3],static[3])-max(w[1],static[1])>.2 and min(w[4],static[4])-max(w[2],static[2])>.2:overlap.append({'page':pg,'write':w,'source':static})
  for i,a in enumerate(added):
   for b in added[i+1:]:
    if min(a[3],b[3])-max(a[1],b[1])>.2 and min(a[4],b[4])-max(a[2],b[2])>.2:overlap.append({'page':pg,'write':a,'write2':b})
 factgroups={}
 for w in writes:
  if w['factId']:factgroups.setdefault((w['document'],w['factId']),[]).append(w)
 factchecks=[]
 for (doc,fid),group in factgroups.items():
  expected=facts[fixture][fid]
  norm=lambda s:' '.join(str(s).split())
  # Narrative facts may use multiple declared continuation fields; repeated
  # ordinary facts (name/charge) must each appear complete at every location.
  if all(w['kind']=='text_narrative_line' for w in group):
   got=' '.join(w['text'] for w in sorted(group,key=lambda w:(w['page'],next(i for i,x in enumerate(writes) if x is w))))
   match=norm(got)==norm(expected)
  else:got=[w['text'] for w in group];match=all(norm(g)==norm(expected) for g in got)
  factchecks.append({'document':doc,'factId':fid,'expected':expected,'observed':got,'matches':match})
 results['fixtures'][fixture]={'pageCount':len(output_words),'pages':pages,'fieldCoverage':coverage,'observedWrites':writes,'factChecks':factchecks,'missingDeclaredWrites':[w for w in writes if not w['wordCount']],'refusedFieldsWithAddedText':[w for w in refusals if w['wordCount']],'addedWordsOutsideSourceWriteRectangles':outbox,'rawBoundingBoxIntersections':overlap,'expectedWritingLineIntersections':[o for o in overlap if 'source' in o and set(o['source'][0])<=set('_,')],'addedTextOverlap':[o for o in overlap if 'source' not in o or not set(o['source'][0])<=set('_,')],'refusedFieldsMeasured':len(refusals),'refusalClassifications':refusals}
receipt=pathlib.Path('/home/codespace/.local/share/legalease/evidence/raster-a3ca119bd/al-misd-nonconviction-90-set/al-misd-nonconviction-90-set.verdict.json');r=js(receipt)
results['raster']={'receipt':str(receipt),'receiptSha256':sha(receipt),'verdict':r['verdict'],'packetCommitSha':r['packetCommitSha'],'workflowRunId':r['workflowRunId'],'documentsDigest':r['documentsDigest'],'pagesMeasured':r['pagesMeasured'],'imagesIndependentlyRead':[],'newRasterExecuted':False}
for m in r['measurements']:
 f=receipt.parent/m['png'];results['raster']['imagesIndependentlyRead'].append({'path':str(f),'sha256':sha(f),'bytes':f.stat().st_size,'receiptBytesMatch':f.stat().st_size==m['bytes'],'fixture':m['kind'],'page':m['page'],'visuallyRead':True})
results['artifacts']=[]
for packet in js(B/'reports/rendered-artifacts.json')['packets']:
 f=pathlib.Path(packet['file']);results['artifacts'].append({'fixture':packet['fixture'],'file':str(f),'sha256':sha(f),'declaredSha256':packet['sha256'],'matches':sha(f)==packet['sha256'],'byteLength':f.stat().st_size,'pageCount':len(words(packet['fixture']+'.html')),'rasterBinding':r['hashesBound']})
# Preserve disposable source/output text reads durably, keeping large raw text
# outside the committed return; hashes make the reading record auditable.
results['durableReadEvidence']=[]
for name in ['canonical','boundary','source-CR-65','source-C-10']:
 for ext in ['txt','html']:
  filename=name+'.'+ext;src=P/filename;dst=D/filename
  if src.exists():
   if dst.exists() and sha(dst)!=sha(src):raise RuntimeError('Refusing to replace distinct reading evidence '+str(dst))
   if not dst.exists():dst.write_bytes(src.read_bytes())
   src.unlink()
  results['durableReadEvidence'].append({'path':str(dst),'sha256':sha(dst),'byteLength':dst.stat().st_size})
(P/'measurements.json').write_text(json.dumps(results,indent=1,ensure_ascii=False)+'\n')
print(json.dumps({f:{'writes':len(v['observedWrites']),'knownFactFailures':[q for q in v['factChecks'] if not q['matches']],'missingWrites':len(v['missingDeclaredWrites']),'refusedInk':len(v['refusedFieldsWithAddedText']),'outsideBox':len(v['addedWordsOutsideSourceWriteRectangles']),'overlap':len(v['addedTextOverlap']),'removedSourceWords':sum(len(p['removedSourceWords']) for p in v['pages'])} for f,v in results['fixtures'].items()},indent=1))
