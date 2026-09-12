"""Independent read-only review of pinned AL source/packet bytes; no builder import."""
from pathlib import Path
import json, hashlib, subprocess, re, collections
import pymupdf

BASE=Path(__file__).resolve().parent.relative_to(Path.cwd())
PIN='e38cb2ecae5ada6668fa6c7b9739eac208da6378'
def read(p): return json.loads(Path(p).read_text())
def sha(b): return hashlib.sha256(b).hexdigest()
def binding(p):
    p=Path(p);b=p.read_bytes();return {'path':str(p),'sha256':sha(b),'byteLength':len(b)}
def atpin(p): return subprocess.check_output(['git','show',PIN+':'+str(p)])
def rect(w):
    r=pymupdf.Rect(w['rect']);r.normalize();return r
def chars(page,r,font=None):
    out=[]
    for span in page.get_texttrace():
        if font and font not in span['font']:continue
        for c in span['chars']:
            b=pymupdf.Rect(c[3]);center=pymupdf.Point((b.x0+b.x1)/2,(b.y0+b.y1)/2)
            if center in r and chr(c[0]).strip():out.append((chr(c[0]),tuple(round(v,2) for v in b),span['font']))
    return out
def compact(s):return re.sub(r'\s+','',s)

sources={doc:read(BASE/(doc+'-independent-source-widgets.json')) for doc in ['CR-65','C-10-CRIMINAL']}
sourcepdf={doc:pymupdf.open(x['source']['path']) for doc,x in sources.items()}
widgets={(doc,w['field'],w['page']):w for doc,x in sources.items() for w in x['widgets']}
assert len(widgets)==216
for x in sources.values():assert binding(x['source']['path'])==x['source']

# Parse only literal fixture object declarations from the pinned builder text.
fixture_sets={}
for builder in ['al-diversion-set','al-felony-dwop-set','al-felony-nonconviction-90-set']:
    path='scripts/build-census-v1-'+builder+'.mjs';bs=atpin(path);text=bs.decode();chunk=text.split('const FIXTURES = ',1)[1].split('\n};',1)[0]
    parsed={}
    for kind in ['canonical','boundary']:
        block=re.search(r'\b'+kind+r':\s*\{(.*?)\}',chunk,re.S).group(1)
        parsed[kind]={k:v for k,q,v in re.findall(r'([A-Za-z_]+):\s*([\'\"])(.*?)\2',block)}
    fixture_sets[builder]={'declaration':{'path':path,'commit':PIN,'sha256':sha(bs)},'values':parsed}
factkeys={'matter.filing_county':'county','participant.last_name':'last','participant.first_name':'first','participant.middle_name':'middle','participant.street_address':'street','participant.email':'email','participant.city_state_zip':'cityStateZip','participant.phone':'phone','participant.date_of_birth':'dob','participant.full_legal_name':'full','matter.case_number':'caseNumber'}
clerks={('CR-65','Text1',1),('CR-65','Text4',2),('CR-65','Text7',3),('CR-65','Text5',4),('CR-65','Court Case Number',5),('CR-65','Court Case Number_2',6),('CR-65','Court Case Number_3',7),('CR-65','Court Case Number_4',8),('C-10-CRIMINAL','Court Case Number',1),('C-10-CRIMINAL','Court Case Number_2',2),('C-10-CRIMINAL','Court Case Number_3',3)}
pardon={('CR-65','Check Box10.6',3)}|{('CR-65','Check Box11.'+str(n),4) for n in range(7)}
results=[]
for original in sorted(BASE.glob('*-34664588051-original-raster-measurements.json')):
    custody=read(original);family=custody['familyId'];snap=BASE/'initial-findings'/family;mp=read(snap/'production-field-map.json');report=read(snap/'reports/rendered-artifacts.json');fix=fixture_sets.get(family,fixture_sets['al-diversion-set'])
    classified=[(r['documentId'],r['fieldName'],r['page']) for r in mp['writes']+mp['refusals']]
    counts=collections.Counter(classified)
    row={'familyId':family,'packetCommit':PIN,'originalRaster':binding(original),'fixtureDeclaration':fix['declaration'],'sourceBindings':[x['source'] for x in sources.values()],'fieldMapSnapshot':binding(snap/'production-field-map.json'),'sourceWidgetCount':len(widgets),'classifiedWidgetCount':len(classified),'unclassifiedWidgets':[list(k) for k in widgets if k not in counts],'duplicateClassifications':[list(k) for k,v in counts.items() if v!=1],'artifacts':[],'knownWrites':[],'selectionWrites':[],'protectedBlanks':[],'clerkCaptions':[],'pardonAttestations':[]}
    for packet in report['packets']:
        kind=packet['fixture'];bs=atpin(packet['file']);assert sha(bs)==packet['sha256'];doc=pymupdf.open(stream=bs,filetype='pdf');assert len(doc)==11;facts=fix['values'][kind]
        row['artifacts'].append({'path':packet['file'],'sha256':sha(bs),'byteLength':len(bs),'fixture':kind,'pageCount':len(doc)})
        for w in mp['writes']:
            key=(w['documentId'],w['fieldName'],w['page']);geometry=rect(widgets[key]);page=doc[w['page']-1+(0 if w['documentId']=='CR-65' else 8)]
            if w.get('isSelectionControl'):
                marks=chars(page,geometry,'ZapfDingbats');row['selectionWrites'].append({'fixture':kind,'field':w['fieldId'],'page':w['page'],'marked':bool(marks),'glyphs':marks,'routeDetermined':w.get('routeDetermined')});continue
            expected='Circuit' if w['factId']=='matter.court_type' else facts[factkeys[w['factId']]]
            trace=chars(page,geometry,'Helvetica');observed=''.join(c[0] for c in trace)
            row['knownWrites'].append({'fixture':kind,'field':w['fieldId'],'page':w['page'],'expected':expected,'visibleText':observed,'matches':compact(expected)==observed,'sourceWidgetRect':list(geometry),'glyphs':trace})
        for w in mp['refusals']:
            key=(w['documentId'],w['fieldName'],w['page']);geometry=rect(widgets[key]);page=doc[w['page']-1+(0 if w['documentId']=='CR-65' else 8)];src=sourcepdf[w['documentId']][w['page']-1]
            before=collections.Counter(chars(src,geometry));after=collections.Counter(chars(page,geometry));added=list((after-before).elements())
            item={'fixture':kind,'field':w['fieldId'],'page':w['page'],'sourceWidgetRect':list(geometry),'addedGlyphs':added,'blankOfAddedInk':not added,'refusalClass':w.get('refusalClass'),'role':w.get('role')}
            if key in clerks:row['clerkCaptions'].append(item)
            if key in pardon:row['pardonAttestations'].append(item)
            if w.get('refusalClass') in ['court_prosecutor_clerk_or_agency_owned','signature_or_date_participant_completion'] or w.get('role') in ['court','clerk','notary','attorney']:row['protectedBlanks'].append(item)
        row.setdefault('underlyingCaseCount',[]).append({'fixture':kind,'count':sum(p.get_text().count(facts['caseNumber']) for p in doc),'expectedCount':1})
    row['totals']={'knownWrites':len(row['knownWrites']),'knownWriteMismatches':sum(not x['matches'] for x in row['knownWrites']),'selectionWrites':len(row['selectionWrites']),'missingSelectionMarks':sum(not x['marked'] for x in row['selectionWrites']),'protectedFieldsChecked':len(row['protectedBlanks']),'protectedAddedGlyphFields':sum(not x['blankOfAddedInk'] for x in row['protectedBlanks']),'clerkCaptionFields':len(row['clerkCaptions']),'clerkCaptionAddedGlyphFields':sum(not x['blankOfAddedInk'] for x in row['clerkCaptions']),'pardonAttestationsChecked':len(row['pardonAttestations']),'pardonAttestationsAddedInk':sum(not x['blankOfAddedInk'] for x in row['pardonAttestations'])}
    (BASE/('initial-measurements-'+family+'.json')).write_text(json.dumps(row,indent=2)+'\n');results.append({'familyId':family,**row['totals']})
print(json.dumps(results,indent=2))
