import pathlib,json,hashlib,collections,pymupdf
V=pathlib.Path('data/rcap-grade-a/packet-factory-24h/warp-20260912/built-three-semantic-review/va_exp_nonconviction-set')
D=V/'snapshot/data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill'
S=pathlib.Path('private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/VA/02_PACKET_FORMS/VA__FORM__CC-1473__petition-for-expungement__REV-2026-07__EN.pdf')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
s=pymupdf.open(S);m=json.loads((D/'production-field-map.json').read_text());rows=[];checks=[]
def chars(p):
 out=[]
 for b in p.get_text('rawdict')['blocks']:
  for l in b.get('lines',[]):
   for z in l['spans']:
    for c in z['chars']:out.append((c['c'],round(c['origin'][0],2),round(c['origin'][1],2)))
 return collections.Counter(out)
def pgproof(p):
 return {'textGeometry':sorted(chars(p).items()),'drawings':str(p.get_drawings()),'rect':list(p.rect)}
def add(id,ok,**kwargs):checks.append({'id':id,'result':'PASS' if ok else 'FAIL',**kwargs})
facts={'canonical':dict(zip(['name','dob','address','phone','email'],['Jordan Avery Reyes','1991-04-17','42 Maple Street, Richmond, VA 23219','804-555-0142','jordan.reyes@example.org'])),'boundary':dict(zip(['name','dob','address','phone','email'],["Maria-Alejandra O'Shaughnessy-Whitfield",'1968-12-31','1188 Upper Notch Crossing Road, Apartment 14B, Virginia Beach, Virginia 23456-2214','(757) 555-0199 ext. 4417','maria.alejandra.oshaughnessy.whitfield@longmailexample.org']))}
known={'User.Title':'name','User.DOB':'dob','User.PrintName':'name','User.AddressOf':'address','User.PetetionerPhoneNumber':'phone','User.PetetionerEmail':'email'}
selected={'User.CheckPetitioner','User.CheckPetitionerContact','User.CheckPetitionerPhone','User.CheckPetitionerEmail'}
protected={'User.CaseNumber':'clerk assigns new petition number','User.HearDateTime':'clerk hearing notice','User.EndDate':'clerk certification date','User.CBCertify':'clerk certified-copy assertion','User.PetetionerVSB':'attorney-only number; pro-se fixture'}
for fixture,f in facts.items():
 p=pymupdf.open(D/f'fixtures/{fixture}.pdf');a=pymupdf.open(D/f'fixtures/{fixture}--CC-1473-primary-filing.pdf'); rd={'fixture':fixture,'sha256':sha(D/f'fixtures/{fixture}.pdf'),'pages':len(p),'sourcePageComparisons':[],'widgetActors':[],'metadataLeakPages':[],'participantKnownTextOccurrences':{},'standaloneSha256':sha(D/f'fixtures/{fixture}--CC-1473-primary-filing.pdf')}
 for i in range(2):
  src=chars(s[i]);out=chars(p[i]);missing=list((src-out).elements());extras=list((out-src).elements()); rd['sourcePageComparisons'].append({'page':i+1,'missingGlyphs':missing,'extraGlyphCount':len(extras)})
  add(f'{fixture}:standalone-page-{i+1}-equals-assembled',pgproof(p[i])==pgproof(a[i]))
  filing_missing=[x for x in missing if not (i==0 and 5.19<=x[1]<=115.58 and 5.35<=x[2]<=31.94)]
  add(f'{fixture}:source-static-glyphs-page-{i+1}',not filing_missing,missingGlyphs=missing,permittedOmission='Only Clear All Data viewer ResetButton caption; no filing content omitted' if missing and not filing_missing else None)
  # Static source paths are compared exactly, independently of builder maps.
  sg=collections.Counter(str(x) for x in s[i].get_drawings());og=collections.Counter(str(x) for x in p[i].get_drawings())
  extra_paths=list((og-sg).elements()); rd['sourcePageComparisons'][-1]['extraPathCount']=len(extra_paths)
  extra_draw=[x for x in p[i].get_drawings() if str(x) not in sg]
  for w in s[i].widgets() or []:
   if w.field_name=='ResetButton':continue
   r=w.rect; cs=[x for x in extras if r.contains(pymupdf.Point(x[1],x[2]))]; text=''.join(x[0] for x in cs)
   paths=[x for x in extra_draw if r.contains(x['rect'])]
   actor='participant unknown record/conditional fact'
   if w.field_name in known:
    actor='participant known neutral fact'; expected=f[known[w.field_name]]
    add(f'{fixture}:{w.field_name}:known-full-text',text==expected,actual=text,expected=expected)
   elif w.field_name in selected:
    actor='route-determined pro-se participant capacity';add(f'{fixture}:{w.field_name}:selected',len(paths)>0,paths=len(paths))
   else:
    if w.field_name in protected:actor=protected[w.field_name]
    elif w.field_name.startswith('User.CheckAttorney'):actor='attorney representation; pro-se fixture not applicable'
    elif w.field_name=='User.Date':actor='participant execution date; handback'
    elif w.field_type_string=='CheckBox':actor='participant factual election/action checkbox; unknown and handback'
    add(f'{fixture}:{w.field_name}:not-answered',not text and not paths,addedText=text,addedPaths=len(paths))
   rd['widgetActors'].append({'page':i+1,'name':w.field_name,'rect':list(r),'printedSourceActor':actor,'addedText':text,'addedPathCount':len(paths)})
 for i,pg in enumerate(p):
  t=pg.get_text()
  if 'Route: obligation:track-only:VA:va_exp_nonconviction' in t:rd['metadataLeakPages'].append(i+1)
  for key,val in f.items():
   n=t.count(val)
   if n:rd['participantKnownTextOccurrences'].setdefault(key,[]).append({'page':i+1,'count':n})
 rd['components']={'CC-1473':[1,2],'Commonwealth-copy-request':[3],'CCRE-request':[4],'records-checklist':[5,6],'filing-instructions':[7,8,9]}
 rows.append(rd)
# Full plain text read persisted only as hash; original PDFs remain in frozen custody.
for fixture in facts:
 doc=pymupdf.open(D/f'fixtures/{fixture}.pdf'); txt='\n'.join(p.get_text() for p in doc); rows[list(facts).index(fixture)]['allPagesTextSha256']=hashlib.sha256(txt.encode()).hexdigest()
out={'schemaVersion':'rcap-independent-pdf-semantic-measurements/v1','source':{'path':str(S),'sha256':sha(S),'byteLength':S.stat().st_size},'mode':'No raster/render performed; source text/drawing geometry and actor-specific content inspected. Current central visual review remains required.','fixtures':rows,'checks':checks,'totals':dict(collections.Counter(x['result'] for x in checks))}
(V/'pdf-semantic-measurements.json').write_text(json.dumps(out,indent=2)+'\n');print(out['totals']);print(json.dumps([x for x in checks if x['result']=='FAIL'],indent=2))
