"""Independent saved-byte glyph and vector-path measurement. No builder imports/raster."""
from pathlib import Path
from collections import Counter,defaultdict
import json,hashlib,pymupdf as pdf
BASE=Path(__file__).resolve().parent.relative_to(Path.cwd());PREP=json.loads((BASE.parent/'raster-manifest.json').read_text());PREP['packetCommitSha']='26a8d2c319ce9e1e32eaa4ec79f798587ade018d'
def bind(p):
 p=Path(p);b=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'byteLength':len(b)}
def conv(o):
 if isinstance(o,(pdf.Point,pdf.Rect)):return [round(x,1) for x in o]
 if isinstance(o,float):return round(o,1)
 if isinstance(o,(tuple,list)):return [conv(x) for x in o]
 return o

def glyphs(p):
 return [{'char':chr(c[0]),'glyphId':c[1],'origin':list(c[2]),'rect':list(c[3]),'font':t['font'],'size':t['size'],'color':t['color'],'opacity':t['opacity'],'type':t['type'],'seqno':t['seqno']} for t in p.get_texttrace() for c in t['chars'] if not chr(c[0]).isspace()]
def gkey(g):return (g['char'],g['font'],tuple(round(x,1) for x in g['origin']))
def vkey(d):return json.dumps({k:conv(d.get(k)) for k in ['items','type','color','fill','width','stroke_opacity','fill_opacity','dashes','closePath']},sort_keys=True)
def contained(inner,outer,pad=.6):
 a=pdf.Rect(inner);b=pdf.Rect(outer)+(-pad,-pad,pad,pad);return b.contains(a)
def area_intersect(a,b):
 r=pdf.Rect(a)&pdf.Rect(b);return max(0,r.width)*max(0,r.height)
for entry in PREP['rows']:
 family=entry['familyId'];folder=Path(entry['documents'][0]['path']).parent.parent;snap=BASE/'snapshots'/family;snap.mkdir(parents=True,exist_ok=True)
 for rel in ['production-field-map.json','participant-instructions.md','source-receipt.json','fixtures/participant-facts.json','reports/rendered-artifacts.json']:
  p=snap/rel;p.parent.mkdir(parents=True,exist_ok=True);b=(folder/rel).read_bytes()
  if p.exists():assert p.read_bytes()==b
  else:p.write_bytes(b)
 mapping=json.loads((folder/'production-field-map.json').read_text());receipt=json.loads((folder/'source-receipt.json').read_text());facts=json.loads((folder/'fixtures/participant-facts.json').read_text())['fixtures']
 source={};widgets=[];offset=0
 for d in receipt['documents']:
  p=Path(d['custodyRoot'])/d['pathInCustody'];assert bind(p)['sha256']==d['sha256'] and bind(p)['byteLength']==d['byteLength'];s=pdf.open(p)
  source[d['documentId']]={'document':s,'offset':offset,'binding':bind(p)}
  for pn,page in enumerate(s):
   for w in page.widgets() or []:widgets.append({'documentId':d['documentId'],'fieldName':w.field_name,'sourcePage':pn+1,'packetPage':offset+pn+1,'rect':list(w.rect),'fieldType':w.field_type_string,'sourceValue':w.field_value})
  offset+=len(s)
 assert offset==17 and len(widgets)==230
 decisions={(d['documentId'],d['fieldName']):d for d in mapping['writes']+mapping['refusals']}
 assert all((w['documentId'],w['fieldName']) in decisions for w in widgets)
 out={'familyId':family,'packetCommit':PREP['packetCommitSha'],'sourceBindings':[s['binding'] for s in source.values()],'sourceWidgets':widgets,'sourceWidgetCount':len(widgets),'unclassifiedWidgets':[], 'sourceFieldDecisionCount':len(decisions),'fixtureFacts':bind(folder/'fixtures/participant-facts.json'),'fieldMap':bind(folder/'production-field-map.json'),'artifacts':entry['documents'],'fixtures':{}}
 for fixture in ['canonical','boundary']:
  doc=pdf.open(folder/'fixtures'/f'{fixture}.pdf');assert len(doc)==20
  pages={};sourceGlyphMissing=[];sourceVectorMissing=[]
  for sid,s in source.items():
   for pn,sp in enumerate(s['document']):
    op=doc[s['offset']+pn];sg=glyphs(sp);og=glyphs(op);sv=sp.get_drawings();ov=op.get_drawings();gc=Counter(map(gkey,sg));vc=Counter(map(vkey,sv));extras=[];ev=[]
    for g in og:
     k=gkey(g)
     if gc[k]:gc[k]-=1
     else:extras.append(g)
    for d in ov:
     k=vkey(d)
     if vc[k]:vc[k]-=1
     else:ev.append({k:conv(d.get(k)) for k in ['items','rect','type','color','fill','width','stroke_opacity','fill_opacity','seqno']})
    sourceGlyphMissing.extend([{'packetPage':s['offset']+pn+1,'key':str(k),'count':v} for k,v in gc.items() if v])
    sourceVectorMissing.extend([{'packetPage':s['offset']+pn+1,'key':k,'count':v} for k,v in vc.items() if v])
    pages[s['offset']+pn+1]={'extraGlyphs':extras,'extraVectors':ev,'sourceGlyphCount':len(sg),'sourceVectorCount':len(sv)}
  written=[];refused=[];unknown=[];usedG=set();usedV=set()
  for w in widgets:
   decision=decisions[(w['documentId'],w['fieldName'])];p=pages[w['packetPage']];g=[(i,x) for i,x in enumerate(p['extraGlyphs']) if contained(x['rect'],w['rect'],1)]
   v=[(i,x) for i,x in enumerate(p['extraVectors']) if contained(x['rect'],w['rect'],.8)]
   ink=[(i,x) for i,x in v if x['color'] is not None and min(x['color'])<.9 and x.get('width',0)>0 or x['fill'] is not None and min(x['fill'])<.9]
   if decision['decision'] in ['write','select']:
    if decision.get('factId'):
     expect=str(facts[fixture][decision['factId']]);actual=''.join(x['char'] for _,x in g);match=actual==''.join(expect.split())
     written.append({**w,'kind':'text','factId':decision['factId'],'expected':expect,'actualNonWhitespace':actual,'matchesExpected':match,'glyphCount':len(g),'glyphs':[x for _,x in g],'allGlyphsVisible':all(x['opacity']>0 and x['type']!=3 for _,x in g),'allGlyphBoundsWithinSourceField':all(contained(x['rect'],w['rect'],.6) for _,x in g)})
    else:
     diagonals=[]
     for i,x in ink:
      diagonals += [{'from':it[1],'to':it[2],'width':x['width']} for it in x['items'] if it[0]=='l' and abs(it[1][0]-it[2][0])>1 and abs(it[1][1]-it[2][1])>1]
     written.append({**w,'kind':'selection','diagonalStrokes':diagonals,'intendedMarkActuallyPresent':len(diagonals)>=2,'blackInkPaths':[x for _,x in ink]})
    usedG.update((w['packetPage'],i) for i,_ in g);usedV.update((w['packetPage'],i) for i,_ in v)
   else:
    refused.append({**w,'disposition':decision.get('completenessDisposition'),'refusalClass':decision.get('refusalClass'),'requiredBeforeFiling':decision.get('requiredBeforeFiling',False),'addedGlyphs':[x for _,x in g],'addedInkPaths':[x for _,x in ink]})
    usedV.update((w['packetPage'],i) for i,_ in v if not x['color'] and (x['fill'] is None or min(x['fill'])>=.9))
  for pn,p in pages.items():
   for i,g in enumerate(p['extraGlyphs']):
    if (pn,i) not in usedG:unknown.append({'packetPage':pn,'kind':'glyph','data':g})
   for i,v in enumerate(p['extraVectors']):
    if (pn,i) not in usedV:unknown.append({'packetPage':pn,'kind':'vector','data':v})
  # The two proposed-order birth-year blanks are required neutral facts, not judicial findings.
  birth=[]
  for w in refused:
   if (w['documentId'].startswith('KSJC-ORDER-FOR-') and w['fieldName']=='Year of Birth') or (w['documentId'].startswith('KSJC-ORDER-DENYING') and w['fieldName']=='Sex born in'):
    birth.append({**w,'expectedKnownFact':facts[fixture]['participant.birth_year'],'knownFactAvailable':True,'incorrectlyHandedBackAsUnknown':w['requiredBeforeFiling'],'knownFactMissingFromPdf':not w['addedGlyphs']})
  assert len(birth)==0
  for row in written:
   if row.get('glyphs'):
    row['fontsAndSizes']=sorted({(g['font'],round(g['size'],4)) for g in row['glyphs']})
    row['addedTextBounds']=[min(g['rect'][0] for g in row['glyphs']),min(g['rect'][1] for g in row['glyphs']),max(g['rect'][2] for g in row['glyphs']),max(g['rect'][3] for g in row['glyphs'])]
    del row['glyphs']
  out['fixtures'][fixture]={'writtenFields':written,'refusedFields':refused,'knownBirthYearMissing':birth,'sourceGlyphMissing':sourceGlyphMissing,'sourceVectorMissing':sourceVectorMissing,'unexplainedAddedInk':unknown,'pageAdditionCounts':{pn:{'glyphs':len(p['extraGlyphs']),'paths':len(p['extraVectors'])} for pn,p in pages.items()},'totals':{'sourcePages':17,'sourceWidgets':len(widgets),'textWrites':sum(w['kind']=='text' for w in written),'matchedTextWrites':sum(w.get('matchesExpected',False) for w in written),'selectionMarks':sum(w.get('intendedMarkActuallyPresent',False) for w in written),'declaredSelectionWrites':sum(w['kind']=='selection' for w in written),'refusedWidgetOccurrences':len(refused),'refusedWithAddedInk':sum(bool(w['addedGlyphs'] or w['addedInkPaths']) for w in refused),'missingSourceGlyphs':len(sourceGlyphMissing),'missingSourcePaths':len(sourceVectorMissing),'unexplainedAddedInk':len(unknown),'knownRequiredBirthYearFieldsMissing':sum(w['knownFactMissingFromPdf'] for w in birth),'glyphBoundsOutside':sum(not w['allGlyphBoundsWithinSourceField'] for w in written if w['kind']=='text')}}
 (BASE/(family+'-pdf-measurements.json')).write_text(json.dumps(out,indent=2)+'\n');print(family,{k:v['totals'] for k,v in out['fixtures'].items()})
